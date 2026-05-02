-- Phase B7-13: empty pallet search
--
-- 方針:
-- - ACTIVE かつ現在有効な pallet_item_links がないパレットを照会する
-- - OUT済みパレットは対象外
-- - パレット状態・既存データは変更しない
-- - inventory_transactions / inventory_current / inventory_* は変更しない

begin;

alter table public.pallet_units
  add column if not exists updated_at timestamptz;

create or replace function public.get_empty_pallets(
  p_warehouse_code text default 'KOMATSU'
)
returns table (
  pallet_id uuid,
  pallet_code text,
  warehouse_code text,
  current_location_code text,
  current_status text,
  updated_at timestamptz
)
language sql
as $$
  select
    p.id as pallet_id,
    p.pallet_code,
    p.warehouse_code,
    p.current_location_code,
    p.current_status,
    p.updated_at
  from public.pallet_units p
  left join public.pallet_item_links l
    on l.pallet_id = p.id
    and l.unlinked_at is null
  where p.current_status = 'ACTIVE'
    and p.warehouse_code = trim(coalesce(p_warehouse_code, 'KOMATSU'))
  group by
    p.id,
    p.pallet_code,
    p.warehouse_code,
    p.current_location_code,
    p.current_status,
    p.updated_at
  having count(l.id) = 0
  order by
    p.current_location_code asc nulls last,
    p.pallet_code asc;
$$;

grant execute on function public.get_empty_pallets(text)
  to anon, authenticated, service_role;

commit;
