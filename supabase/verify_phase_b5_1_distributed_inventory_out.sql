-- Phase B5-1 検証: 分散在庫 OUT 自動分割
--
-- psql:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify_phase_b5_1_distributed_inventory_out.sql
--
-- この検証は最後に rollback するため、テストデータは残らない。

begin;

insert into public.warehouse_locations (
  warehouse_code,
  location_code,
  location_name
)
values
  ('B5-WH', 'B5-LOC-A', 'B5 verify A'),
  ('B5-WH', 'B5-LOC-B', 'B5 verify B')
on conflict (warehouse_code, location_code) do nothing;

insert into public.inventory_transactions (
  transaction_type,
  part_no,
  part_name,
  quantity,
  quantity_unit,
  inventory_type,
  project_no,
  warehouse_code,
  location_code,
  event_at,
  remarks
)
values
  (
    'IN',
    'B5-PART',
    'B5 verify part',
    5,
    'pcs',
    'project',
    'B5-PROJ',
    'B5-WH',
    'B5-LOC-A',
    now(),
    'verify B5 distributed out seed A'
  ),
  (
    'IN',
    'B5-PART',
    'B5 verify part',
    3,
    'pcs',
    'project',
    'B5-PROJ',
    'B5-WH',
    'B5-LOC-B',
    now(),
    'verify B5 distributed out seed B'
  );

select public.rebuild_inventory_current();

do $$
declare
  v_available numeric;
begin
  select coalesce(sum(quantity_on_hand), 0)
    into v_available
  from public.inventory_current
  where part_no = 'B5-PART'
    and warehouse_code = 'B5-WH'
    and inventory_type = 'project'
    and project_no = 'B5-PROJ';

  if v_available <> 8 then
    raise exception 'B5 verify failed: expected initial available=8, got %', v_available;
  end if;
end $$;

create temp table b5_out_result as
select *
from public.create_distributed_inventory_out(
  p_part_no => 'B5-PART',
  p_quantity => 7,
  p_warehouse_code => 'B5-WH',
  p_from_location_codes => array['B5-LOC-B', 'B5-LOC-A'],
  p_inventory_type => 'project',
  p_project_no => 'B5-PROJ',
  p_mrp_key => null,
  p_quantity_unit => 'pcs',
  p_idempotency_key => 'verify-b5-distributed-out',
  p_event_at => now(),
  p_operator_id => 'verify',
  p_operator_name => 'Verifier',
  p_remarks => 'verify B5 distributed out'
);

do $$
declare
  v_rows integer;
  v_loc_b numeric;
  v_loc_a numeric;
begin
  select count(*) into v_rows from b5_out_result;
  select coalesce(sum(quantity), 0) into v_loc_b from b5_out_result where from_location_code = 'B5-LOC-B';
  select coalesce(sum(quantity), 0) into v_loc_a from b5_out_result where from_location_code = 'B5-LOC-A';

  if v_rows <> 2 then
    raise exception 'B5 verify failed: expected 2 split rows, got %', v_rows;
  end if;

  if v_loc_b <> 3 or v_loc_a <> 4 then
    raise exception 'B5 verify failed: expected B=3 and A=4, got B=% A=%', v_loc_b, v_loc_a;
  end if;
end $$;

-- 同じ idempotency_key の再実行は既存行を返し、追加 INSERT しない。
create temp table b5_replay_result as
select *
from public.create_distributed_inventory_out(
  p_part_no => 'B5-PART',
  p_quantity => 7,
  p_warehouse_code => 'B5-WH',
  p_from_location_codes => array['B5-LOC-B', 'B5-LOC-A'],
  p_inventory_type => 'project',
  p_project_no => 'B5-PROJ',
  p_mrp_key => null,
  p_quantity_unit => 'pcs',
  p_idempotency_key => 'verify-b5-distributed-out',
  p_event_at => now(),
  p_operator_id => 'verify',
  p_operator_name => 'Verifier',
  p_remarks => 'verify B5 distributed out replay'
);

do $$
declare
  v_replay_rows integer;
  v_tx_rows integer;
begin
  select count(*) into v_replay_rows from b5_replay_result;
  select count(*)
    into v_tx_rows
  from public.inventory_transactions
  where transaction_type = 'OUT'
    and left(coalesce(idempotency_key, ''), length('verify-b5-distributed-out:')) = 'verify-b5-distributed-out:';

  if v_replay_rows <> 2 then
    raise exception 'B5 verify failed: expected 2 replay rows, got %', v_replay_rows;
  end if;

  if v_tx_rows <> 2 then
    raise exception 'B5 verify failed: expected idempotent OUT rows to remain 2, got %', v_tx_rows;
  end if;
end $$;

select public.rebuild_inventory_current();

do $$
declare
  v_remaining numeric;
begin
  select coalesce(sum(quantity_on_hand), 0)
    into v_remaining
  from public.inventory_current
  where part_no = 'B5-PART'
    and warehouse_code = 'B5-WH'
    and inventory_type = 'project'
    and project_no = 'B5-PROJ';

  if v_remaining <> 1 then
    raise exception 'B5 verify failed: expected remaining=1 after OUT 7 from 8, got %', v_remaining;
  end if;
end $$;

-- 動作確認用表示
select * from b5_out_result order by idempotency_key;

rollback;
