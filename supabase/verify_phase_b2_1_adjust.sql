-- Phase B2-1 検証: ADJUST / 既存 IN・OUT・MOVE
-- 実行例: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/verify_phase_b2_1_adjust.sql

begin;

-- テスト用キー（既存データと衝突しにくい値）
-- part = VERIFY_B21_001, wh = WH_B21, loc1 = LOC_B21_A, loc2 = LOC_B21_B, inv = NORMAL

delete from public.inventory_transactions
where part_no = 'VERIFY_B21_001';

delete from public.inventory_current
where part_no = 'VERIFY_B21_001';

-- ① 増加: まず IN で 100、ADJUST INCREASE +5 → current 105
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'IN', 'VERIFY_B21_001', 100, 'EA', 'WH_B21', 'LOC_B21_A', 'NORMAL'
);

insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type,
  adjust_direction, adjust_reason
) values (
  'ADJUST', 'VERIFY_B21_001', 5, 'EA', 'WH_B21', 'LOC_B21_A', 'NORMAL',
  'INCREASE', 'verify b2-1'
);

do $$
declare
  q numeric;
begin
  select quantity_on_hand into q
  from public.inventory_current
  where part_no = 'VERIFY_B21_001' and warehouse_code = 'WH_B21' and location_code = 'LOC_B21_A' and inventory_type = 'NORMAL';
  if q is distinct from 105 then
    raise exception 'verify fail: ADJUST INCREASE expected 105 got %', q;
  end if;
end $$;

-- ② 減少（在庫内）: DECREASE 5 → 100
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type,
  adjust_direction
) values (
  'ADJUST', 'VERIFY_B21_001', 5, 'EA', 'WH_B21', 'LOC_B21_A', 'NORMAL',
  'DECREASE'
);

do $$
declare
  q numeric;
begin
  select quantity_on_hand into q
  from public.inventory_current
  where part_no = 'VERIFY_B21_001' and warehouse_code = 'WH_B21' and location_code = 'LOC_B21_A' and inventory_type = 'NORMAL';
  if q is distinct from 100 then
    raise exception 'verify fail: ADJUST DECREASE expected 100 got %', q;
  end if;
end $$;

-- ③ 減少（超過）: 必ずエラー
savepoint s1;
do $$
begin
  insert into public.inventory_transactions (
    transaction_type, part_no, quantity, quantity_unit,
    warehouse_code, location_code, inventory_type,
    adjust_direction
  ) values (
    'ADJUST', 'VERIFY_B21_001', 101, 'EA', 'WH_B21', 'LOC_B21_A', 'NORMAL',
    'DECREASE'
  );
  raise exception 'verify fail: ADJUST DECREASE over stock should error';
exception
  when others then
    if sqlerrm not like '%insufficient stock%' and sqlerrm not like '%phase_b1_negative_inventory%' then
      raise exception 'verify fail: unexpected error: %', sqlerrm;
    end if;
end $$;
rollback to savepoint s1;

-- ④ ADJUST で adjust_direction なし: BEFORE でエラー
savepoint s2;
do $$
begin
  insert into public.inventory_transactions (
    transaction_type, part_no, quantity, quantity_unit,
    warehouse_code, location_code, inventory_type,
    adjust_direction
  ) values (
    'ADJUST', 'VERIFY_B21_001', 1, 'EA', 'WH_B21', 'LOC_B21_A', 'NORMAL',
    null
  );
  raise exception 'verify fail: ADJUST without direction should error';
exception
  when others then
    if sqlerrm not like '%adjust_direction%' then
      raise exception 'verify fail: unexpected: %', sqlerrm;
    end if;
end $$;
rollback to savepoint s2;

-- ⑤ IN / OUT / MOVE
insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'IN', 'VERIFY_B21_001', 50, 'EA', 'WH_B21', 'LOC_B21_B', 'NORMAL'
);

insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type
) values (
  'OUT', 'VERIFY_B21_001', 30, 'EA', 'WH_B21', 'LOC_B21_B', 'NORMAL'
);

insert into public.inventory_transactions (
  transaction_type, part_no, quantity, quantity_unit,
  warehouse_code, location_code, inventory_type,
  to_warehouse_code, to_location_code
) values (
  'MOVE', 'VERIFY_B21_001', 10, 'EA', 'WH_B21', 'LOC_B21_B', 'NORMAL',
  'WH_B21', 'LOC_B21_A'
);

do $$
declare
  q2 numeric;
  q1 numeric;
begin
  select quantity_on_hand into q2
  from public.inventory_current
  where part_no = 'VERIFY_B21_001' and warehouse_code = 'WH_B21' and location_code = 'LOC_B21_B' and inventory_type = 'NORMAL';
  if q2 is distinct from 10 then
    raise exception 'verify fail: LOC2 expected 10 got %', q2;
  end if;
  select quantity_on_hand into q1
  from public.inventory_current
  where part_no = 'VERIFY_B21_001' and warehouse_code = 'WH_B21' and location_code = 'LOC_B21_A' and inventory_type = 'NORMAL';
  if q1 is distinct from 110 then
    raise exception 'verify fail: LOC1 after MOVE expected 110 got %', q1;
  end if;
end $$;

rollback;
