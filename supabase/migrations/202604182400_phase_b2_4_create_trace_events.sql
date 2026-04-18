-- Phase B2-4: trace_events を物流イベント履歴として利用可能にする
-- 注: public.trace_events は 20260405_init に既に存在するため、本 migration は列追加・インデックス・CHECK 緩和・コメント更新のみ行う。

begin;

-- 指示スキーマに合わせた補助カラム（既存の unit / location_code 等はそのまま利用可能）
alter table public.trace_events
  add column if not exists warehouse_code text,
  add column if not exists quantity_unit text,
  add column if not exists source_type text,
  add column if not exists source_id text;

-- B2-4 方針: event_type / actor を将来拡張できるよう、厳格な CHECK を外す（最小導入）
alter table public.trace_events
  drop constraint if exists trace_events_event_type_check;

alter table public.trace_events
  drop constraint if exists trace_events_actor_type_check;

comment on table public.trace_events is
  'trace_id 単位の物流イベント履歴。数量変動は inventory_transactions、行動履歴は trace_events に分離する。';

comment on column public.trace_events.trace_id is
  '物流フローの追跡キー。inventory_transactions.trace_id と同じ概念。';

comment on column public.trace_events.event_type is
  '物流イベント種別（RECEIVED / MOVED / SHIPPED 等。拡張可能）。';

comment on column public.trace_events.warehouse_code is
  'イベント発生に関連する倉庫コード。';

comment on column public.trace_events.quantity_unit is
  '数量の単位（補助。既存の unit 列と併用可）。';

comment on column public.trace_events.source_type is
  'イベントの由来種別（例: inventory_transaction, shipment）。';

comment on column public.trace_events.source_id is
  '由来レコードの識別子（text。将来 UUID 等に揃える場合も可）。';

create index if not exists idx_trace_events_trace_id
  on public.trace_events (trace_id);

create index if not exists idx_trace_events_event_at
  on public.trace_events (event_at);

create index if not exists idx_trace_events_trace_id_event_at
  on public.trace_events (trace_id, event_at);

create index if not exists idx_trace_events_event_type
  on public.trace_events (event_type);

commit;
