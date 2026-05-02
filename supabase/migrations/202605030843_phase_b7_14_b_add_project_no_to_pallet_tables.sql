-- Phase B7-14B: add project_no to pallet tables
--
-- 方針:
-- - warehouse_code は倉庫・拠点、project_no は製番・管理単位へ段階移行する
-- - 既存データは壊さず、既存 warehouse_code を project_no 初期値としてコピーする
-- - NOT NULL / DEFAULT / FK は追加しない
-- - 既存関数 / API / UI / inventory_* は変更しない

begin;

alter table public.pallet_units
  add column if not exists project_no text;

alter table public.pallet_item_links
  add column if not exists project_no text;

alter table public.pallet_transactions
  add column if not exists project_no text;

update public.pallet_units
set project_no = warehouse_code
where project_no is null
  and warehouse_code is not null;

update public.pallet_item_links
set project_no = warehouse_code
where project_no is null
  and warehouse_code is not null;

create index if not exists idx_pallet_units_project_no
  on public.pallet_units (project_no);

create index if not exists idx_pallet_item_links_project_no
  on public.pallet_item_links (project_no);

create index if not exists idx_pallet_transactions_project_no
  on public.pallet_transactions (project_no);

commit;
