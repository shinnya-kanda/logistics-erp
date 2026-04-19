-- Phase B2: scan_events 拡張 + shipment_item_progress / shipment_item_issues（最小）
-- 前提: public.shipment_items（202604191300）
--
-- 辞書順では本ファイルが 20260419_create_scan_events より先に走るため、
-- 下記「0.」で 20260419 と同一の scan_events 最小定義を IF NOT EXISTS で用意してから ALTER する。
-- 後続の 20260419_create_scan_events は no-op となり衝突しない。

begin;

-- -----------------------------------------------------------------------------
-- 0. scan_events ベースライン（20260419_create_scan_events.sql と同内容・冪等）
-- -----------------------------------------------------------------------------
create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  scanned_code text not null,
  scan_type text not null,
  created_at timestamptz default now(),
  idempotency_key text
);

create unique index if not exists scan_events_idempotency_key_idx
  on public.scan_events (idempotency_key)
  where idempotency_key is not null;

-- -----------------------------------------------------------------------------
-- 1. scan_events — Phase 2 列（processScanInput / db-schema.md §5.1）
-- -----------------------------------------------------------------------------
alter table public.scan_events add column if not exists trace_id text;
alter table public.scan_events add column if not exists shipment_item_id uuid;
alter table public.scan_events add column if not exists scanned_part_no text;
alter table public.scan_events add column if not exists quantity_scanned numeric;
alter table public.scan_events add column if not exists quantity_unit text;
alter table public.scan_events add column if not exists unload_location_scanned text;
alter table public.scan_events add column if not exists result_status text not null default 'unknown';
alter table public.scan_events add column if not exists device_id text;
alter table public.scan_events add column if not exists operator_id text;
alter table public.scan_events add column if not exists operator_name text;
alter table public.scan_events add column if not exists scanned_at timestamptz;
alter table public.scan_events add column if not exists raw_payload jsonb;

-- 既存行: scanned_at を created_at で埋め、無ければ now()
update public.scan_events
set scanned_at = coalesce(created_at, now())
where scanned_at is null;

alter table public.scan_events
  alter column scanned_at set default now();

alter table public.scan_events
  alter column scanned_at set not null;

alter table public.scan_events drop constraint if exists scan_events_shipment_item_id_fkey;

alter table public.scan_events
  add constraint scan_events_shipment_item_id_fkey
  foreign key (shipment_item_id) references public.shipment_items (id) on delete set null;

create index if not exists idx_scan_events_shipment_item_id
  on public.scan_events (shipment_item_id);

create index if not exists idx_scan_events_trace_id
  on public.scan_events (trace_id);

create index if not exists idx_scan_events_scanned_code
  on public.scan_events (scanned_code);

create index if not exists idx_scan_events_scanned_at
  on public.scan_events (scanned_at);

create index if not exists idx_scan_events_result_status
  on public.scan_events (result_status);

comment on table public.scan_events is
  'Phase2 Actual: スキャン・現場操作の raw fact。照合結果は result_status。';

-- -----------------------------------------------------------------------------
-- 2. shipment_item_progress（processScanInput が UPDATE / seed で使用）
-- -----------------------------------------------------------------------------
create table if not exists public.shipment_item_progress (
  id uuid primary key default gen_random_uuid(),
  shipment_item_id uuid not null references public.shipment_items (id) on delete cascade,
  trace_id text,
  quantity_expected numeric not null,
  quantity_scanned_total numeric not null default 0,
  constraint chk_shipment_item_progress_qty_non_negative
    check (quantity_scanned_total >= 0),
  progress_status text not null default 'planned',
  first_scanned_at timestamptz,
  last_scanned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_shipment_item_progress_item unique (shipment_item_id)
);

create index if not exists idx_shipment_item_progress_trace_id
  on public.shipment_item_progress (trace_id);

create index if not exists idx_shipment_item_progress_status
  on public.shipment_item_progress (progress_status);

comment on table public.shipment_item_progress is
  'Phase2: shipment_items と 1:1 の現在進捗。raw は scan_events。';

drop trigger if exists trg_shipment_item_progress_set_updated_at on public.shipment_item_progress;

create trigger trg_shipment_item_progress_set_updated_at
  before update on public.shipment_item_progress
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. shipment_item_issues（照合ミスマッチ履歴）
-- -----------------------------------------------------------------------------
create table if not exists public.shipment_item_issues (
  id uuid primary key default gen_random_uuid(),
  shipment_item_id uuid not null references public.shipment_items (id) on delete cascade,
  trace_id text,
  issue_type text not null,
  severity text,
  expected_value text,
  actual_value text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shipment_item_issues_shipment_item_id
  on public.shipment_item_issues (shipment_item_id);

create index if not exists idx_shipment_item_issues_trace_id
  on public.shipment_item_issues (trace_id);

create index if not exists idx_shipment_item_issues_issue_type
  on public.shipment_item_issues (issue_type);

create index if not exists idx_shipment_item_issues_severity
  on public.shipment_item_issues (severity);

create index if not exists idx_shipment_item_issues_detected_at
  on public.shipment_item_issues (detected_at);

comment on table public.shipment_item_issues is
  'Phase2: 照合ミスマッチ等の履歴。';

drop trigger if exists trg_shipment_item_issues_set_updated_at on public.shipment_item_issues;

create trigger trg_shipment_item_issues_set_updated_at
  before update on public.shipment_item_issues
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- grants（既存 public テーブルと同方針）
-- -----------------------------------------------------------------------------
grant all on table public.scan_events to anon;
grant all on table public.scan_events to authenticated;
grant all on table public.scan_events to service_role;

grant all on table public.shipment_item_progress to anon;
grant all on table public.shipment_item_progress to authenticated;
grant all on table public.shipment_item_progress to service_role;

grant all on table public.shipment_item_issues to anon;
grant all on table public.shipment_item_issues to authenticated;
grant all on table public.shipment_item_issues to service_role;

commit;
