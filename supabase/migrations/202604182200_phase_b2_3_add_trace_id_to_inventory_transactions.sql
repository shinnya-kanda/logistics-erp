-- Phase B2-3: inventory_transactions に流れ追跡用 trace_id を追加（数量集計・rebuild のキーには含めない）

begin;

alter table public.inventory_transactions
  add column if not exists trace_id text;

comment on column public.inventory_transactions.trace_id is
  '物流フローを追跡するための識別子。数量集計キーではなく流れの追跡キー。inventory_current / rebuild_inventory_current の集計には使わない。';

create index if not exists idx_inventory_transactions_trace_id
  on public.inventory_transactions (trace_id);

commit;
