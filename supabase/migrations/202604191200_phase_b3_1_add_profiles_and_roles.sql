-- Phase B3-1: Supabase Auth と業務ユーザー（profiles / roles / user_roles）

begin;

-- -----------------------------------------------------------------------------
-- profiles（auth.users の 1:1 拡張）
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email
  on public.profiles (email);

comment on table public.profiles is
  'Supabase auth.users の業務用拡張テーブル';

-- -----------------------------------------------------------------------------
-- roles（ロール定義マスタ）
-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  role_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.roles is
  '業務ロール定義テーブル';

insert into public.roles (role_code, role_name) values
  ('viewer', 'Viewer'),
  ('operator', 'Operator'),
  ('office', 'Office'),
  ('inventory_manager', 'Inventory Manager'),
  ('admin', 'Admin')
on conflict (role_code) do nothing;

-- -----------------------------------------------------------------------------
-- user_roles（ユーザーとロールの紐付け）
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists idx_user_roles_role_id
  on public.user_roles (role_id);

comment on table public.user_roles is
  'ユーザーとロールの紐付けテーブル';

-- -----------------------------------------------------------------------------
-- auth 新規ユーザー → profiles 自動作成
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- profiles.updated_at（既存の public.set_updated_at を再利用）
-- -----------------------------------------------------------------------------
drop trigger if exists trg_profiles_set_updated_at on public.profiles;

create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- grants（既存テーブルと同方針）
-- -----------------------------------------------------------------------------
grant all on table public.profiles to anon;
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

grant all on table public.roles to anon;
grant all on table public.roles to authenticated;
grant all on table public.roles to service_role;

grant all on table public.user_roles to anon;
grant all on table public.user_roles to authenticated;
grant all on table public.user_roles to service_role;

grant all on function public.handle_new_user() to anon;
grant all on function public.handle_new_user() to authenticated;
grant all on function public.handle_new_user() to service_role;

commit;
