-- Phase B2-3 検証: trace_id カラム・インデックス・INSERT・時系列取得・rebuild 非影響
-- 推奨: トランザクション内で実行し rollback でテストデータを捨てる
-- psql: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify_phase_b2_3_trace_id.sql

begin;

-- テスト用（衝突しにくい値）
-- trace_id = TRC-TEST-001, part = TRACE-ITEM-001, WH1 / LOC1 / LOC2 / project

delete from public.inventory_transactions
where part_no = 'TRACE-ITEM-001';

delete from public.inventory_current
where part_no = 'TRACE-ITEM-001';

-- ケース1: trace_id カラムが存在する
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inventory_transactions'
      and column_name = 'trace_id'
  ) then
    raise exception 'verify fail: trace_id column missing';
  end if;
end $$;

-- ケース1b: インデックスが存在する
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'inventory_transactions'
      and indexname = 'idx_inventory_transactions_trace_id'
  ) then
    raise exception 'verify fail: idx_inventory_transactions_trace_id missing';
  end if;
end $$;

-- ケース2: trace_id 付き IN
insert into public.inventory_transactions (
  transaction_type,
  trace_id,
  part_no,
  part_name,
  quantity,
  quantity_unit,
  warehouse_code,
  location_code,
  inventory_type
) values (
  'IN',
  'TRC-TEST-001',
  'TRACE-ITEM-001',
  'TRACE TEST ITEM',
  10,
  'pcs',
  'WH1',
  'LOC1',
  'project'
);

-- ケース3: 同一 trace_id で MOVE / ADJUST / OUT（ADJUST は B2-1 どおり direction 必須）
insert into public.inventory_transactions (
  transaction_type,
  trace_id,
  part_no,
  part_name,
  quantity,
  quantity_unit,
  warehouse_code,
  location_code,
  to_warehouse_code,
  to_location_code,
  inventory_type
) values (
  'MOVE',
  'TRC-TEST-001',
  'TRACE-ITEM-001',
  'TRACE TEST ITEM',
  3,
  'pcs',
  'WH1',
  'LOC1',
  'WH1',
  'LOC2',
  'project'
);

insert into public.inventory_transactions (
  transaction_type,
  trace_id,
  part_no,
  part_name,
  quantity,
  quantity_unit,
  warehouse_code,
  location_code,
  inventory_type,
  adjust_direction,
  adjust_reason
) values (
  'ADJUST',
  'TRC-TEST-001',
  'TRACE-ITEM-001',
  'TRACE TEST ITEM',
  1,
  'pcs',
  'WH1',
  'LOC2',
  'project',
  'INCREASE',
  'verify b2-3'
);

insert into public.inventory_transactions (
  transaction_type,
  trace_id,
  part_no,
  part_name,
  quantity,
  quantity_unit,
  warehouse_code,
  location_code,
  inventory_type
) values (
  'OUT',
  'TRC-TEST-001',
  'TRACE-ITEM-001',
  'TRACE TEST ITEM',
  2,
  'pcs',
  'WH1',
  'LOC2',
  'project'
);

-- ケース4: 同一 trace_id を時系列で取得（created_at, id）
do $$
declare
  n int;
begin
  select count(*) into n
  from public.inventory_transactions
  where trace_id = 'TRC-TEST-001';
  if n <> 4 then
    raise exception 'verify fail: expected 4 rows for trace_id, got %', n;
  end if;
end $$;

-- ケース5: rebuild 前後で current の数量集計が同じ（trace_id は集計に使われない）
create temp table snap_current on commit drop as
select part_no, warehouse_code, location_code, inventory_type, quantity_on_hand
from public.inventory_current
where part_no = 'TRACE-ITEM-001';

select public.rebuild_inventory_current();

do $$
declare
  d int;
begin
  select count(*) into d
  from (
    (
      select * from snap_current
      except
      select part_no, warehouse_code, location_code, inventory_type, quantity_on_hand
      from public.inventory_current
      where part_no = 'TRACE-ITEM-001'
    )
    union all
    (
      select part_no, warehouse_code, location_code, inventory_type, quantity_on_hand
      from public.inventory_current
      where part_no = 'TRACE-ITEM-001'
      except
      select * from snap_current
    )
  ) x;
  if d > 0 then
    raise exception 'verify fail: rebuild changed aggregated current for part TRACE-ITEM-001';
  end if;
end $$;

rollback;

-- 手動確認用（rollback 前にコメントアウトして実行）:
-- select trace_id, transaction_type, part_no, warehouse_code, location_code,
--        to_warehouse_code, to_location_code, quantity, created_at
-- from public.inventory_transactions
-- where trace_id = 'TRC-TEST-001'
-- order by created_at, id;
