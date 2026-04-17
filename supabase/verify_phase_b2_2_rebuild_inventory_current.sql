-- Phase B2-2 検証: rebuild_inventory_current
-- 前提: トランザクション内で実行し rollback で全体を戻す（rebuild は current 全削除のため）
-- psql: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify_phase_b2_2_rebuild_inventory_current.sql

begin;

-- ユニークなテスト用キー（他データと干渉しないよう削除）
delete from public.inventory_transactions
where part_no in ('TEST-RB-001', 'TEST-RB-002');

-- 他 part の current は触らない: 検証は TEST-RB-* のみ比較

-- =============================================================================
-- データ投入（trigger で current 同期）
-- =============================================================================

-- ケース1: IN のみ（TEST-RB-001 / WH-RB / LOC-A）
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'IN', 'TEST-RB-001', 100, 'EA', 'WH-RB', 'LOC-A', 'NORMAL'
);

-- ケース2: IN → OUT（同一キー）
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'OUT', 'TEST-RB-001', 40, 'EA', 'WH-RB', 'LOC-A', 'NORMAL'
);

-- ケース3: MOVE（TEST-RB-001: LOC-A に残り、LOC-B へ移動）
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type,
  to_warehouse_code, to_location_code
) values (
  'MOVE', 'TEST-RB-001', 25, 'EA', 'WH-RB', 'LOC-A', 'NORMAL',
  'WH-RB', 'LOC-B'
);

-- ケース4・5: TEST-RB-002 で ADJUST
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'IN', 'TEST-RB-002', 50, 'EA', 'WH-RB', 'LOC-X', 'NORMAL'
);

insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type,
  adjust_direction, adjust_reason
) values (
  'ADJUST', 'TEST-RB-002', 3, 'EA', 'WH-RB', 'LOC-X', 'NORMAL',
  'INCREASE', 'verify b2-2'
);

insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type,
  adjust_direction
) values (
  'ADJUST', 'TEST-RB-002', 10, 'EA', 'WH-RB', 'LOC-X', 'NORMAL',
  'DECREASE'
);

-- ケース7: 残高 0 になる行（IN 5 OUT 5 @ LOC-Z）— current に行を作らない想定
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'IN', 'TEST-RB-002', 5, 'EA', 'WH-RB', 'LOC-Z', 'NORMAL'
);

insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'OUT', 'TEST-RB-002', 5, 'EA', 'WH-RB', 'LOC-Z', 'NORMAL'
);

-- trigger による期待スナップショット（part 単位）
create temp table expected_current on commit drop as
select part_no, warehouse_code, location_code, inventory_type, quantity_on_hand
from public.inventory_current
where part_no in ('TEST-RB-001', 'TEST-RB-002')
order by part_no, warehouse_code, location_code, inventory_type;

-- ケース6: current を意図的に壊す（該当 part の行を消す）
delete from public.inventory_current
where part_no in ('TEST-RB-001', 'TEST-RB-002');

-- 全件 rebuild（他 part の current も一度消え、全 ledger から再構築）
select public.rebuild_inventory_current();

-- 再集計後、テスト part だけ期待と一致
do $$
declare
  n int;
begin
  select count(*) into n
  from (
    (
      select * from expected_current
      except
      select part_no, warehouse_code, location_code, inventory_type, quantity_on_hand
      from public.inventory_current
      where part_no in ('TEST-RB-001', 'TEST-RB-002')
    )
    union all
    (
      select part_no, warehouse_code, location_code, inventory_type, quantity_on_hand
      from public.inventory_current
      where part_no in ('TEST-RB-001', 'TEST-RB-002')
      except
      select * from expected_current
    )
  ) d;
  if n > 0 then
    raise exception 'verify fail: rebuild result differs from trigger-built snapshot (rows: %)', n;
  end if;
end $$;

-- ケース7: LOC-Z は残高 0 → current に行がない
do $$
declare
  c int;
begin
  select count(*) into c
  from public.inventory_current
  where part_no = 'TEST-RB-002'
    and warehouse_code = 'WH-RB'
    and location_code = 'LOC-Z'
    and inventory_type = 'NORMAL';
  if c <> 0 then
    raise exception 'verify fail: zero balance row should be absent, got %', c;
  end if;
end $$;

-- 手動確認用（指示書の例）
-- select * from public.inventory_current
-- where part_no in ('TEST-RB-001', 'TEST-RB-002')
-- order by part_no, warehouse_code, location_code, inventory_type;

rollback;
