-- Phase B7-70A: trace_id nullable columns
--
-- 方針:
-- - trace_id は業務単位の追跡キーとして段階導入する
-- - 今回は nullable column の追加のみ
-- - NOT NULL / default / index / backfill / constraint は追加しない

begin;

alter table public.inventory_transactions
  add column if not exists trace_id text;

alter table public.pallet_transactions
  add column if not exists trace_id text;

alter table public.warehouse_location_history
  add column if not exists trace_id text;

commit;
