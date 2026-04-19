-- Phase B1: Expected Data（source_files, shipments 拡張, shipment_items）
-- 前提: public.shipments が存在すること（20260405_init のレガシー行単位テーブル）
-- 方針: レガシー列・PK・既存 FK（stock_movements / trace_events → shipments）は維持。
--       stock_movements / trace_events への shipment_item_id 追加は本 migration では行わない
--       （uniq_trace_event 等の既存制約と干渉しうるため。必要なら別 migration で）。

begin;

-- -----------------------------------------------------------------------------
-- 1. source_files
-- -----------------------------------------------------------------------------
create table if not exists public.source_files (
  id uuid primary key default gen_random_uuid(),
  file_type text not null,
  file_name text not null,
  file_path text,
  source_system text,
  checksum text,
  imported_at timestamptz not null default now(),
  imported_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_source_files_imported_at
  on public.source_files (imported_at);

create index if not exists idx_source_files_file_type
  on public.source_files (file_type);

create index if not exists idx_source_files_checksum
  on public.source_files (checksum);

create unique index if not exists uq_source_files_checksum_not_null
  on public.source_files (checksum)
  where checksum is not null;

comment on table public.source_files is
  'Phase1: 取込ファイルの監査ルート。全 Expected 取込の起点。';

drop trigger if exists trg_source_files_set_updated_at on public.source_files;

create trigger trg_source_files_set_updated_at
  before update on public.source_files
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. shipments 拡張（Expected ヘッダ + レガシー列）
-- -----------------------------------------------------------------------------
alter table public.shipments add column if not exists source_file_id uuid;
alter table public.shipments add column if not exists shipment_no text;
alter table public.shipments add column if not exists shipper_code text;
alter table public.shipments add column if not exists shipper_name text;
alter table public.shipments add column if not exists receiver_code text;
alter table public.shipments add column if not exists receiver_name text;
alter table public.shipments add column if not exists delivery_date date;
alter table public.shipments add column if not exists scheduled_ship_date date;
alter table public.shipments add column if not exists status text not null default 'imported';
alter table public.shipments add column if not exists remarks text;
alter table public.shipments add column if not exists updated_at timestamptz not null default now();

-- レガシー行に Phase1 ヘッダを挿入しやすいよう NOT NULL を緩和（既に NULL 許容なら no-op）
alter table public.shipments alter column issue_no drop not null;
alter table public.shipments alter column part_no drop not null;
alter table public.shipments alter column quantity drop not null;

alter table public.shipments drop constraint if exists shipments_source_file_id_fkey;

alter table public.shipments
  add constraint shipments_source_file_id_fkey
  foreign key (source_file_id) references public.source_files (id) on delete set null;

create index if not exists idx_shipments_source_file_id
  on public.shipments (source_file_id);

create index if not exists idx_shipments_shipment_no
  on public.shipments (shipment_no);

create index if not exists idx_shipments_delivery_date
  on public.shipments (delivery_date);

create index if not exists idx_shipments_status
  on public.shipments (status);

create unique index if not exists uq_shipments_source_file_id_not_null
  on public.shipments (source_file_id)
  where source_file_id is not null;

drop trigger if exists trg_shipments_set_updated_at on public.shipments;

create trigger trg_shipments_set_updated_at
  before update on public.shipments
  for each row
  execute function public.set_updated_at();

comment on column public.shipments.source_file_id is
  'Phase1: 取込元 source_files。1 ファイル 1 ヘッダ想定。';

comment on column public.shipments.issue_no is
  'Phase0 互換: 行単位 shipments のキー。Phase1 ヘッダでは NULL。';

-- -----------------------------------------------------------------------------
-- 3. shipment_items（Expected 明細 — scan flow が参照する最小列を含む）
-- -----------------------------------------------------------------------------
create table if not exists public.shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  line_no integer,
  trace_id text not null,
  part_no text not null,
  part_name text,
  quantity_expected numeric not null,
  quantity_unit text,
  unload_location text,
  delivery_date date,
  lot_no text,
  external_barcode text,
  match_key text,
  status text not null default 'planned',
  source_row_no integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shipment_items_shipment_id
  on public.shipment_items (shipment_id);

create unique index if not exists uq_shipment_items_trace_id
  on public.shipment_items (trace_id);

create index if not exists idx_shipment_items_part_no
  on public.shipment_items (part_no);

create index if not exists idx_shipment_items_external_barcode
  on public.shipment_items (external_barcode)
  where external_barcode is not null;

create index if not exists idx_shipment_items_unload_location
  on public.shipment_items (unload_location);

create index if not exists idx_shipment_items_delivery_date
  on public.shipment_items (delivery_date);

create index if not exists idx_shipment_items_status
  on public.shipment_items (status);

create index if not exists idx_shipment_items_match_key
  on public.shipment_items (match_key)
  where match_key is not null;

comment on table public.shipment_items is
  'Phase1: 出荷予定明細（Expected）。検品・scan_events は Phase2 以降。';

drop trigger if exists trg_shipment_items_set_updated_at on public.shipment_items;

create trigger trg_shipment_items_set_updated_at
  before update on public.shipment_items
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- grants（既存 shipments と同方針）
-- -----------------------------------------------------------------------------
grant all on table public.source_files to anon;
grant all on table public.source_files to authenticated;
grant all on table public.source_files to service_role;

grant all on table public.shipment_items to anon;
grant all on table public.shipment_items to authenticated;
grant all on table public.shipment_items to service_role;

commit;
