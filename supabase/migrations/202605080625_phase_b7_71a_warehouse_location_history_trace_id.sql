-- Phase B7-71A: warehouse_location_history trace_id column
--
-- trace-search の正式対象として warehouse_location_history を扱うため、
-- nullable な trace_id を追加する。
-- NOT NULL / index / backfill は行わない。

begin;

alter table public.warehouse_location_history
  add column if not exists trace_id text;

comment on column public.warehouse_location_history.trace_id is
  '業務操作を横断追跡するための trace_id。既存履歴との互換性のため nullable とし、NOT NULL 化・backfill・index 追加は別フェーズで検討する。';

commit;
