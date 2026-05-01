-- Phase B5-3 検証: create_inventory_in
--
-- psql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify_phase_b5_3_inventory_in.sql
--
-- この検証は最後に rollback するため、テストデータは残らない。

begin;

insert into public.warehouse_locations (
  warehouse_code,
  location_code,
  location_name
)
values (
  'B5-IN-WH',
  'B5-IN-LOC',
  'B5 inventory in verify location'
)
on conflict (warehouse_code, location_code) do nothing;

create temp table b5_in_result as
select *
from public.create_inventory_in(
  p_part_no => 'B5-IN-PART',
  p_quantity => 5,
  p_warehouse_code => 'B5-IN-WH',
  p_to_location_code => 'B5-IN-LOC',
  p_part_name => 'B5 inventory in part',
  p_inventory_type => 'project',
  p_project_no => 'B5-IN-PROJ',
  p_mrp_key => null,
  p_quantity_unit => 'pcs',
  p_idempotency_key => 'verify-b5-inventory-in',
  p_event_at => now(),
  p_operator_id => 'verify',
  p_operator_name => 'Verifier',
  p_remarks => 'verify B5 inventory in'
);

do $$
declare
  v_rows integer;
  v_qty numeric;
  v_tx_rows integer;
begin
  select count(*), coalesce(sum(quantity), 0)
    into v_rows, v_qty
  from b5_in_result;

  if v_rows <> 1 or v_qty <> 5 then
    raise exception 'B5-3 verify failed: expected one IN result quantity=5, got rows=% qty=%', v_rows, v_qty;
  end if;

  select count(*)
    into v_tx_rows
  from public.inventory_transactions
  where transaction_type = 'IN'
    and idempotency_key = 'verify-b5-inventory-in';

  if v_tx_rows <> 1 then
    raise exception 'B5-3 verify failed: expected one inventory_transactions IN row, got %', v_tx_rows;
  end if;
end $$;

-- 同じ idempotency_key の再実行は既存 IN 行を返し、追加 INSERT しない。
create temp table b5_in_replay_result as
select *
from public.create_inventory_in(
  p_part_no => 'B5-IN-PART',
  p_quantity => 5,
  p_warehouse_code => 'B5-IN-WH',
  p_to_location_code => 'B5-IN-LOC',
  p_part_name => 'B5 inventory in part',
  p_inventory_type => 'project',
  p_project_no => 'B5-IN-PROJ',
  p_mrp_key => null,
  p_quantity_unit => 'pcs',
  p_idempotency_key => 'verify-b5-inventory-in',
  p_event_at => now(),
  p_operator_id => 'verify',
  p_operator_name => 'Verifier',
  p_remarks => 'verify B5 inventory in replay'
);

do $$
declare
  v_replay_rows integer;
  v_tx_rows integer;
begin
  select count(*) into v_replay_rows from b5_in_replay_result;

  if v_replay_rows <> 1 then
    raise exception 'B5-3 verify failed: expected one replay row, got %', v_replay_rows;
  end if;

  select count(*)
    into v_tx_rows
  from public.inventory_transactions
  where transaction_type = 'IN'
    and idempotency_key = 'verify-b5-inventory-in';

  if v_tx_rows <> 1 then
    raise exception 'B5-3 verify failed: idempotency duplicated IN rows, got %', v_tx_rows;
  end if;
end $$;

-- create_inventory_in は inventory_current を直接触らない。
-- rebuild 後に inventory_transactions から current が作れることだけ確認する。
select public.rebuild_inventory_current();

do $$
declare
  v_current numeric;
begin
  select coalesce(sum(quantity_on_hand), 0)
    into v_current
  from public.inventory_current
  where part_no = 'B5-IN-PART'
    and warehouse_code = 'B5-IN-WH'
    and location_code = 'B5-IN-LOC'
    and inventory_type = 'project'
    and project_no = 'B5-IN-PROJ';

  if v_current <> 5 then
    raise exception 'B5-3 verify failed: expected rebuilt current=5, got %', v_current;
  end if;
end $$;

-- 動作確認用表示
select * from b5_in_result;
select * from b5_in_replay_result;

rollback;
