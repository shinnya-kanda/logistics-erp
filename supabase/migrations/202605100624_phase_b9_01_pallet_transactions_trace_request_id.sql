-- Phase B9-01: minimal trace_id implementation for pallet_transactions
--
-- 方針:
-- - pallet_transactions は pallet domain の source of truth として維持する
-- - trace_id / request_id は nullable で追加し、既存 write flow を壊さない
-- - NOT NULL / default / automatic backfill は行わない
-- - RPC / Edge Function / UI の挙動変更は行わない
-- - parent_trace_id は将来 phase で必要性を判断する

begin;

alter table public.pallet_transactions
  add column if not exists trace_id text,
  add column if not exists request_id text;

create index if not exists idx_pallet_transactions_trace_id
  on public.pallet_transactions (trace_id);

create index if not exists idx_pallet_transactions_request_id
  on public.pallet_transactions (request_id);

comment on column public.pallet_transactions.trace_id is
  '業務操作を横断追跡するための trace_id。既存履歴との互換性のため nullable とし、no backfill / no mandatory trace_id で段階導入する。';

comment on column public.pallet_transactions.request_id is
  'API実行単位の観測に使う request_id。既存履歴との互換性のため nullable とし、trace_id や将来の parent_trace_id とは分けて扱う。';

commit;
