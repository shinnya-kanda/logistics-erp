-- Phase B7-26: ERP 業務用 user_profiles（auth.users 1:1）
--
-- 方針:
-- - public.user_profiles で role / warehouse_code 等を保持
-- - RLS: 認証ユーザーは自分の行のみ SELECT（insert/update/delete は今回なし）
-- - updated_at は既存 public.set_updated_at() を利用

begin;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'worker'
    check (role in ('admin', 'chief', 'office', 'worker')),
  warehouse_code text not null default 'KOMATSU',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is
  'Phase B7-26: Supabase Auth ユーザーに対する ERP 業務プロファイル（role / warehouse 等）';

create index if not exists idx_user_profiles_role
  on public.user_profiles (role);

create index if not exists idx_user_profiles_warehouse_code
  on public.user_profiles (warehouse_code);

create index if not exists idx_user_profiles_is_active
  on public.user_profiles (is_active);

drop trigger if exists trg_user_profiles_set_updated_at on public.user_profiles;

create trigger trg_user_profiles_set_updated_at
  before update on public.user_profiles
  for each row
  execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;

create policy user_profiles_select_own
  on public.user_profiles
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on table public.user_profiles to authenticated;
grant all on table public.user_profiles to service_role;

commit;
