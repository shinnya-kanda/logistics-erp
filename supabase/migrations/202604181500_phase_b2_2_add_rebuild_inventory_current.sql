-- Phase B2-2: ledger から inventory_current を全件再集計して復元する

begin;

create or replace function public.rebuild_inventory_current()
returns void
language plpgsql
set search_path to public
as $$
begin
  delete from public.inventory_current;

  insert into public.inventory_current (
    part_no,
    warehouse_code,
    location_code,
    inventory_type,
    quantity_on_hand,
    updated_at
  )
  with normalized_movements as (
    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      quantity::numeric as qty_delta
    from public.inventory_transactions
    where transaction_type = 'IN'

    union all

    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      -quantity::numeric
    from public.inventory_transactions
    where transaction_type = 'OUT'

    union all

    -- MOVE: 1 行を from（減算）/ to（加算）の 2 イベントに分解（キーは DDL どおり warehouse_code・location_code / to_*）
    select
      m.part_no,
      u.warehouse_code,
      u.location_code,
      m.inventory_type,
      u.qty_delta
    from public.inventory_transactions m
    cross join lateral (
      select *
      from (
        values
          (m.warehouse_code, m.location_code, (-m.quantity)::numeric),
          (m.to_warehouse_code, m.to_location_code, m.quantity::numeric)
      ) as leg(warehouse_code, location_code, qty_delta)
      where leg.warehouse_code is not null
        and leg.location_code is not null
    ) u
    where m.transaction_type = 'MOVE'

    union all

    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      quantity::numeric
    from public.inventory_transactions
    where transaction_type = 'ADJUST'
      and adjust_direction = 'INCREASE'

    union all

    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      -quantity::numeric
    from public.inventory_transactions
    where transaction_type = 'ADJUST'
      and adjust_direction = 'DECREASE'
  ),
  aggregated as (
    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      sum(qty_delta) as quantity_on_hand
    from normalized_movements
    group by
      part_no,
      warehouse_code,
      location_code,
      inventory_type
  )
  select
    part_no,
    warehouse_code,
    location_code,
    inventory_type,
    quantity_on_hand,
    now()
  from aggregated
  where quantity_on_hand > 0;
end;
$$;

comment on function public.rebuild_inventory_current() is
  'Phase B2-2: inventory_transactions を唯一の真実として inventory_current を全削除のうえ再集計する。通常同期は AFTER trigger の責務。';

alter function public.rebuild_inventory_current() owner to postgres;

grant all on function public.rebuild_inventory_current() to anon;
grant all on function public.rebuild_inventory_current() to authenticated;
grant all on function public.rebuild_inventory_current() to service_role;

commit;
