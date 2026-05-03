-- Phase B7-14F: warehouse location master
--
-- 方針:
-- - 実在棚を管理する棚番マスタを導入する
-- - 今回はマスタ作成と既存 pallet_units からの初期投入のみ
-- - FK制約・存在チェック・move_pallet等の関数変更はまだ行わない
-- - inventory_transactions / inventory_current / inventory_* は変更しない

begin;

create table if not exists public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  warehouse_code text not null,
  location_code text not null,
  is_active boolean not null default true,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (warehouse_code, location_code)
);

alter table public.warehouse_locations
  add column if not exists remarks text;

create index if not exists idx_warehouse_locations_warehouse_code
  on public.warehouse_locations (warehouse_code);

create index if not exists idx_warehouse_locations_location_code
  on public.warehouse_locations (location_code);

create index if not exists idx_warehouse_locations_active
  on public.warehouse_locations (warehouse_code, is_active);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_units'
      and column_name = 'location_code'
  ) then
    insert into public.warehouse_locations (
      warehouse_code,
      location_code,
      is_active,
      remarks
    )
    select distinct
      warehouse_code,
      location_code,
      true,
      'B7-14F initial seed from pallet_units'
    from public.pallet_units
    where warehouse_code is not null
      and location_code is not null
    on conflict (warehouse_code, location_code) do nothing;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_units'
      and column_name = 'current_location_code'
  ) then
    insert into public.warehouse_locations (
      warehouse_code,
      location_code,
      is_active,
      remarks
    )
    select distinct
      warehouse_code,
      current_location_code,
      true,
      'B7-14F initial seed from pallet_units'
    from public.pallet_units
    where warehouse_code is not null
      and current_location_code is not null
    on conflict (warehouse_code, location_code) do nothing;
  end if;
end $$;

commit;
