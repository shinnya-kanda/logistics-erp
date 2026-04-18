-- Phase B2-4 検証: trace_events（前提: 20260405_init の trace_events + B2-3 の inventory_transactions.trace_id）
-- 推奨: トランザクション内で実行し rollback で戻す

begin;

-- 掃除（再実行用）
delete from public.trace_events
where trace_id = 'TRC-TEST-001';

delete from public.inventory_transactions
where trace_id = 'TRC-TEST-001';

-- ケース1: テーブルが存在する
do $$
begin
  if to_regclass('public.trace_events') is null then
    raise exception 'verify fail: trace_events table missing';
  end if;
end $$;

-- ケース2: 同一 trace_id で複数イベント
insert into public.trace_events (
  trace_id,
  event_type,
  event_at,
  part_no,
  warehouse_code,
  location_code,
  quantity,
  quantity_unit,
  actor_type,
  actor_name,
  note
) values (
  'TRC-TEST-001',
  'RECEIVED',
  now(),
  'TRACE-ITEM-001',
  'WH1',
  'LOC1',
  10,
  'pcs',
  'worker',
  'test-user',
  'initial receive'
);

insert into public.trace_events (
  trace_id,
  event_type,
  event_at,
  part_no,
  warehouse_code,
  location_code,
  quantity,
  quantity_unit,
  actor_type,
  actor_name,
  note
) values (
  'TRC-TEST-001',
  'MOVED',
  now() + interval '1 second',
  'TRACE-ITEM-001',
  'WH1',
  'LOC2',
  3,
  'pcs',
  'worker',
  'test-user',
  'move to LOC2'
);

do $$
declare
  n int;
begin
  select count(*) into n from public.trace_events where trace_id = 'TRC-TEST-001';
  if n <> 2 then
    raise exception 'verify fail: expected 2 trace_events, got %', n;
  end if;
end $$;

-- inventory 側（数量 ledger）に同じ trace_id で 1 行（ケース4 用）
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

-- ケース3: 時系列（event_at, id）
-- ケース4: inventory + trace を trace_id で横並び確認（実行結果を目視可）
-- （以下は検証用 SELECT。失敗時は行数や順序で判断）

do $$
declare
  rows int;
begin
  select count(*) into rows
  from (
    select
      'inventory'::text as source,
      trace_id,
      transaction_type::text as event_name,
      created_at as event_time,
      part_no,
      warehouse_code,
      location_code,
      quantity
    from public.inventory_transactions
    where trace_id = 'TRC-TEST-001'

    union all

    select
      'trace'::text as source,
      trace_id,
      event_type as event_name,
      event_at as event_time,
      part_no,
      warehouse_code,
      location_code,
      quantity::numeric
    from public.trace_events
    where trace_id = 'TRC-TEST-001'
  ) u;
  -- inventory 1 + trace_events 2 = 3
  if rows <> 3 then
    raise exception 'verify fail: union timeline expected 3 rows, got %', rows;
  end if;
end $$;

rollback;

-- 手動でタイムラインを見る場合（rollback 前にコメント解除）:
-- select trace_id, event_type, event_at, part_no, warehouse_code, location_code, quantity, actor_name, note
-- from public.trace_events
-- where trace_id = 'TRC-TEST-001'
-- order by event_at, id;
--
-- select
--   'inventory' as source,
--   trace_id,
--   transaction_type as event_name,
--   created_at as event_time,
--   part_no,
--   warehouse_code,
--   location_code,
--   quantity
-- from public.inventory_transactions
-- where trace_id = 'TRC-TEST-001'
-- union all
-- select
--   'trace' as source,
--   trace_id,
--   event_type as event_name,
--   event_at as event_time,
--   part_no,
--   warehouse_code,
--   location_code,
--   quantity
-- from public.trace_events
-- where trace_id = 'TRC-TEST-001'
-- order by event_time;
