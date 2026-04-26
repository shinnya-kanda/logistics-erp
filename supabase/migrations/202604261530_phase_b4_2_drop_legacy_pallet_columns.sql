-- Phase B4-2: Drop legacy columns from pallet_units

begin;

-- 念のため存在チェック付きで削除（冪等性確保）
alter table public.pallet_units
  drop column if exists location_code;

alter table public.pallet_units
  drop column if exists status;

commit;
