-- Phase B7-1: pallet_units pallet_code foundation
--
-- 方針:
-- - 既存 pallet_units を壊さず pallet_code を追加する
-- - inventory_current / inventory_transactions には触れない
-- - 既存 API / UI には触れない
-- - パレットの動きは後続の pallet_transactions で表現する

begin;

-- 新規環境向けの最小定義。既存環境では no-op。
create table if not exists public.pallet_units (
  id uuid primary key default gen_random_uuid(),
  pallet_code text not null unique,
  warehouse_code text not null,
  created_at timestamptz not null default now(),
  created_by text,
  remarks text
);

-- 既存 B4 以前の pallet_units に B7 の識別子を追加する。
alter table public.pallet_units
  add column if not exists pallet_code text;

alter table public.pallet_units
  add column if not exists created_by text;

alter table public.pallet_units
  add column if not exists remarks text;

-- 旧 pallet_no がある環境では pallet_code の初期値として引き継ぐ。
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_units'
      and column_name = 'pallet_no'
  ) then
    execute $sql$
      update public.pallet_units
      set pallet_code = coalesce(pallet_code, pallet_no)
      where pallet_code is null
    $sql$;
  end if;
end $$;

-- pallet_no が無い、または既存行で null の場合の安全な補完。
update public.pallet_units
set pallet_code = 'PL-LEGACY-' || replace(id::text, '-', '')
where pallet_code is null;

alter table public.pallet_units
  alter column pallet_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_units_pallet_code_unique'
      and conrelid = 'public.pallet_units'::regclass
  ) then
    alter table public.pallet_units
      add constraint pallet_units_pallet_code_unique unique (pallet_code);
  end if;
end $$;

-- Code39 で読みやすい「英数字 + ハイフン」を新規・更新行に要求する。
-- 既存データに例外がある可能性を考慮し、既存行の検証は後続運用で行う。
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_units_pallet_code_code39_check'
      and conrelid = 'public.pallet_units'::regclass
  ) then
    alter table public.pallet_units
      add constraint pallet_units_pallet_code_code39_check
      check (pallet_code ~ '^[A-Za-z0-9-]+$') not valid;
  end if;
end $$;

comment on column public.pallet_units.pallet_code is
  'Phase B7-1: Code39 で読めるパレット識別子。英数字とハイフンのみ。例: PL-KM-260502-A7F3';

comment on table public.pallet_units is
  'Phase B7-1: パレット物理単位の基礎テーブル。動きは pallet_transactions で表現し、inventory とは分離する。';

grant all on table public.pallet_units to anon;
grant all on table public.pallet_units to authenticated;
grant all on table public.pallet_units to service_role;

commit;
