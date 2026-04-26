-- =============================================================================
-- Phase B4-1: 小松金沢 在庫・棚・パレット基盤（請求後回し）
--
-- 原則:
-- - pallet_transactions = パレット位置の真実ログ
-- - inventory_transactions = 品番・数量在庫の真実ログ
-- - pallet_units.current_location_code / pallet_status は派生キャッシュ
-- - inventory_current は派生テーブル
-- - scan_events / shipment_items / billing 系には触れない
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 共通: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_phase_b4_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. warehouse_locations（棚アドレスマスタ）
-- -----------------------------------------------------------------------------
create table if not exists public.warehouse_locations (
  id uuid primary key default gen_random_uuid(),

  warehouse_code text not null,
  location_code text not null,

  location_name text,
  area_code text,
  rack_code text,
  level_code text,
  position_code text,

  location_type text not null default 'storage',
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (warehouse_code, location_code)
);

create index if not exists idx_warehouse_locations_warehouse_code
  on public.warehouse_locations (warehouse_code);

create index if not exists idx_warehouse_locations_location_code
  on public.warehouse_locations (location_code);

drop trigger if exists trigger_warehouse_locations_updated_at
  on public.warehouse_locations;

create trigger trigger_warehouse_locations_updated_at
  before update on public.warehouse_locations
  for each row
  execute function public.set_phase_b4_row_updated_at();

comment on table public.warehouse_locations is
  'Phase B4-1: 小松金沢向け棚アドレスマスタ。';

-- -----------------------------------------------------------------------------
-- 2. pallet_units（パレット本体 + 現在状態キャッシュ）
-- -----------------------------------------------------------------------------
create table if not exists public.pallet_units (
  id uuid primary key default gen_random_uuid(),

  pallet_no text not null unique,
  warehouse_code text not null,

  current_location_code text,
  pallet_status text not null default 'in_stock',

  received_at timestamptz,
  shipped_at timestamptz,

  remarks text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pallet_units
  add column if not exists current_location_code text;

alter table public.pallet_units
  add column if not exists pallet_status text not null default 'in_stock';

alter table public.pallet_units
  add column if not exists received_at timestamptz;

alter table public.pallet_units
  add column if not exists shipped_at timestamptz;

alter table public.pallet_units
  add column if not exists remarks text;

-- 旧 Phase B-1 の location_code/status がある環境では初期キャッシュとして引き継ぐ。
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_units'
      and column_name = 'location_code'
  ) then
    execute $sql$
      update public.pallet_units
      set current_location_code = coalesce(current_location_code, location_code)
      where current_location_code is null
    $sql$;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_units'
      and column_name = 'status'
  ) then
    execute $sql$
      update public.pallet_units
      set pallet_status = case
          when status = 'IN_STOCK' then 'in_stock'
          when status = 'SHIPPED' then 'shipped'
          when status = 'CLOSED' then 'closed'
          else pallet_status
        end
    $sql$;
  end if;
end $$;

create index if not exists idx_pallet_units_warehouse_code
  on public.pallet_units (warehouse_code);

create index if not exists idx_pallet_units_current_location_code
  on public.pallet_units (current_location_code);

create index if not exists idx_pallet_units_status
  on public.pallet_units (pallet_status);

drop trigger if exists trigger_pallet_units_b4_updated_at
  on public.pallet_units;

create trigger trigger_pallet_units_b4_updated_at
  before update on public.pallet_units
  for each row
  execute function public.set_phase_b4_row_updated_at();

comment on table public.pallet_units is
  'Phase B4-1: パレット本体。現在位置・状態は pallet_transactions から再構築可能な派生キャッシュ。';

comment on column public.pallet_units.current_location_code is
  '派生キャッシュ。真実は pallet_transactions。アプリ側で直接更新しない。';

comment on column public.pallet_units.pallet_status is
  '派生キャッシュ。真実は pallet_transactions。アプリ側で直接更新しない。';

-- -----------------------------------------------------------------------------
-- 3. pallet_transactions（パレット位置・入出庫の真実ログ）
-- -----------------------------------------------------------------------------
create table if not exists public.pallet_transactions (
  id uuid primary key default gen_random_uuid(),

  pallet_id uuid not null references public.pallet_units (id),
  -- 旧 Phase B-1 互換。新規実装では pallet_id を使う。
  pallet_unit_id uuid references public.pallet_units (id),

  transaction_type text not null,
  warehouse_code text not null,

  from_location_code text,
  to_location_code text,

  event_at timestamptz not null default now(),
  occurred_at timestamptz,

  operator_id text,
  operator_name text,

  idempotency_key text,
  remarks text,

  created_at timestamptz not null default now()
);

alter table public.pallet_transactions
  add column if not exists pallet_id uuid;

alter table public.pallet_transactions
  add column if not exists warehouse_code text;

alter table public.pallet_transactions
  add column if not exists event_at timestamptz;

alter table public.pallet_transactions
  add column if not exists operator_id text;

alter table public.pallet_transactions
  add column if not exists operator_name text;

alter table public.pallet_transactions
  add column if not exists idempotency_key text;

alter table public.pallet_transactions
  add column if not exists remarks text;

update public.pallet_transactions
set pallet_id = pallet_unit_id
where pallet_id is null
  and pallet_unit_id is not null;

update public.pallet_transactions
set event_at = coalesce(event_at, occurred_at, created_at, now())
where event_at is null;

alter table public.pallet_transactions
  alter column event_at set default now();

alter table public.pallet_transactions
  alter column event_at set not null;

update public.pallet_transactions pt
set warehouse_code = pu.warehouse_code
from public.pallet_units pu
where pt.warehouse_code is null
  and pu.id = pt.pallet_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_transactions_pallet_id_fkey'
      and conrelid = 'public.pallet_transactions'::regclass
  ) then
    alter table public.pallet_transactions
      add constraint pallet_transactions_pallet_id_fkey
      foreign key (pallet_id) references public.pallet_units (id);
  end if;
end $$;

create unique index if not exists idx_pallet_transactions_idempotency_key
  on public.pallet_transactions (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_pallet_transactions_pallet_id
  on public.pallet_transactions (pallet_id);

create index if not exists idx_pallet_transactions_type
  on public.pallet_transactions (transaction_type);

create index if not exists idx_pallet_transactions_event_at
  on public.pallet_transactions (event_at);

comment on table public.pallet_transactions is
  'Phase B4-1: パレット位置・入出庫の真実ログ。物理削除せず、将来の取消・修正イベントで補正する。';

-- -----------------------------------------------------------------------------
-- 4. pallet_item_links（パレット上の品番・現品票リンク）
-- -----------------------------------------------------------------------------
create table if not exists public.pallet_item_links (
  id uuid primary key default gen_random_uuid(),

  pallet_id uuid not null references public.pallet_units (id),
  -- 旧 Phase B-1 互換。新規実装では pallet_id を使う。
  pallet_unit_id uuid references public.pallet_units (id),

  part_no text not null,
  part_name text,

  quantity numeric not null,
  quantity_unit text not null default 'pcs',

  inventory_type text not null default 'project',
  project_no text,
  mrp_key text,

  genpinhyo_no text,
  lot_no text,

  remarks text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pallet_item_links
  add column if not exists pallet_id uuid;

alter table public.pallet_item_links
  add column if not exists inventory_type text not null default 'project';

alter table public.pallet_item_links
  add column if not exists project_no text;

alter table public.pallet_item_links
  add column if not exists mrp_key text;

alter table public.pallet_item_links
  add column if not exists genpinhyo_no text;

alter table public.pallet_item_links
  add column if not exists lot_no text;

alter table public.pallet_item_links
  add column if not exists remarks text;

update public.pallet_item_links
set pallet_id = pallet_unit_id
where pallet_id is null
  and pallet_unit_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_item_links_pallet_id_fkey'
      and conrelid = 'public.pallet_item_links'::regclass
  ) then
    alter table public.pallet_item_links
      add constraint pallet_item_links_pallet_id_fkey
      foreign key (pallet_id) references public.pallet_units (id);
  end if;
end $$;

create index if not exists idx_pallet_item_links_pallet_id
  on public.pallet_item_links (pallet_id);

create index if not exists idx_pallet_item_links_part_no
  on public.pallet_item_links (part_no);

create index if not exists idx_pallet_item_links_inventory_type
  on public.pallet_item_links (inventory_type);

create index if not exists idx_pallet_item_links_project_no
  on public.pallet_item_links (project_no);

create index if not exists idx_pallet_item_links_mrp_key
  on public.pallet_item_links (mrp_key);

create index if not exists idx_pallet_item_links_genpinhyo_no
  on public.pallet_item_links (genpinhyo_no);

drop trigger if exists trigger_pallet_item_links_b4_updated_at
  on public.pallet_item_links;

create trigger trigger_pallet_item_links_b4_updated_at
  before update on public.pallet_item_links
  for each row
  execute function public.set_phase_b4_row_updated_at();

comment on table public.pallet_item_links is
  'Phase B4-1: パレット上の品番・現品票リンク。1パレットに複数品番・複数現品票を紐づけ可能。';

-- -----------------------------------------------------------------------------
-- 5. inventory_transactions（品番・数量在庫の真実ログ）
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),

  transaction_type text not null,

  part_no text not null,
  part_name text,

  quantity numeric not null,
  quantity_unit text not null default 'pcs',

  inventory_type text not null default 'project',
  project_no text,
  mrp_key text,

  warehouse_code text not null,
  location_code text,

  from_warehouse_code text,
  from_location_code text,
  to_warehouse_code text,
  to_location_code text,

  pallet_id uuid references public.pallet_units (id),
  pallet_item_link_id uuid references public.pallet_item_links (id),

  event_at timestamptz not null default now(),
  occurred_at timestamptz,

  operator_id text,
  operator_name text,

  idempotency_key text,
  remarks text,

  created_at timestamptz not null default now()
);

alter table public.inventory_transactions
  add column if not exists quantity_unit text not null default 'pcs';

alter table public.inventory_transactions
  add column if not exists project_no text;

alter table public.inventory_transactions
  add column if not exists mrp_key text;

alter table public.inventory_transactions
  add column if not exists from_warehouse_code text;

alter table public.inventory_transactions
  add column if not exists from_location_code text;

alter table public.inventory_transactions
  add column if not exists to_warehouse_code text;

alter table public.inventory_transactions
  add column if not exists to_location_code text;

alter table public.inventory_transactions
  add column if not exists pallet_id uuid;

alter table public.inventory_transactions
  add column if not exists pallet_item_link_id uuid;

alter table public.inventory_transactions
  add column if not exists event_at timestamptz;

alter table public.inventory_transactions
  add column if not exists operator_id text;

alter table public.inventory_transactions
  add column if not exists operator_name text;

alter table public.inventory_transactions
  add column if not exists idempotency_key text;

alter table public.inventory_transactions
  add column if not exists remarks text;

update public.inventory_transactions
set event_at = coalesce(event_at, occurred_at, created_at, now())
where event_at is null;

alter table public.inventory_transactions
  alter column event_at set default now();

alter table public.inventory_transactions
  alter column event_at set not null;

update public.inventory_transactions
set from_warehouse_code = warehouse_code
where from_warehouse_code is null
  and transaction_type in ('OUT', 'MOVE');

update public.inventory_transactions
set from_location_code = location_code
where from_location_code is null
  and transaction_type in ('OUT', 'MOVE');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_transactions_pallet_id_fkey'
      and conrelid = 'public.inventory_transactions'::regclass
  ) then
    alter table public.inventory_transactions
      add constraint inventory_transactions_pallet_id_fkey
      foreign key (pallet_id) references public.pallet_units (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inventory_transactions_pallet_item_link_id_fkey'
      and conrelid = 'public.inventory_transactions'::regclass
  ) then
    alter table public.inventory_transactions
      add constraint inventory_transactions_pallet_item_link_id_fkey
      foreign key (pallet_item_link_id) references public.pallet_item_links (id);
  end if;
end $$;

create unique index if not exists idx_inventory_transactions_idempotency_key
  on public.inventory_transactions (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_inventory_transactions_part_no
  on public.inventory_transactions (part_no);

create index if not exists idx_inventory_transactions_warehouse_location
  on public.inventory_transactions (warehouse_code, location_code);

create index if not exists idx_inventory_transactions_inventory_type
  on public.inventory_transactions (inventory_type);

create index if not exists idx_inventory_transactions_project_no
  on public.inventory_transactions (project_no);

create index if not exists idx_inventory_transactions_mrp_key
  on public.inventory_transactions (mrp_key);

create index if not exists idx_inventory_transactions_pallet_id
  on public.inventory_transactions (pallet_id);

create index if not exists idx_inventory_transactions_event_at
  on public.inventory_transactions (event_at);

comment on table public.inventory_transactions is
  'Phase B4-1: 品番・数量在庫の真実ログ。inventory_current はこのログから再生成する派生テーブル。';

-- -----------------------------------------------------------------------------
-- 6. inventory_current（現在庫の派生テーブル）
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_current (
  id uuid primary key default gen_random_uuid(),

  part_no text not null,
  part_name text,

  warehouse_code text not null,
  location_code text not null,

  inventory_type text not null default 'project',
  project_no text,
  mrp_key text,

  pallet_id uuid,

  quantity_on_hand numeric not null default 0,
  quantity_unit text not null default 'pcs',

  updated_at timestamptz not null default now()
);

alter table public.inventory_current
  add column if not exists part_name text;

alter table public.inventory_current
  add column if not exists project_no text;

alter table public.inventory_current
  add column if not exists mrp_key text;

alter table public.inventory_current
  add column if not exists pallet_id uuid;

alter table public.inventory_current
  add column if not exists quantity_unit text not null default 'pcs';

-- B4-1 では project_no / mrp_key / pallet_id まで含む自然キーに拡張する。
-- 旧4列制約が残ると project / mrp / pallet 別の現在庫を表現できないため外す。
alter table public.inventory_current
  drop constraint if exists uq_inventory_current_natural_key;

create unique index if not exists idx_inventory_current_unique
  on public.inventory_current (
    part_no,
    warehouse_code,
    location_code,
    inventory_type,
    (coalesce(project_no, '')),
    (coalesce(mrp_key, '')),
    (coalesce(pallet_id::text, ''))
  );

create index if not exists idx_inventory_current_part_no
  on public.inventory_current (part_no);

create index if not exists idx_inventory_current_location
  on public.inventory_current (warehouse_code, location_code);

create index if not exists idx_inventory_current_inventory_type
  on public.inventory_current (inventory_type);

create index if not exists idx_inventory_current_project_no
  on public.inventory_current (project_no);

create index if not exists idx_inventory_current_pallet_id
  on public.inventory_current (pallet_id);

comment on table public.inventory_current is
  'Phase B4-1: 現在庫の派生テーブル。真実は inventory_transactions。アプリ側で直接更新しない。';

-- -----------------------------------------------------------------------------
-- 7. inventory_current 同期補助（旧 trigger が存在する環境でも壊れないよう更新）
-- -----------------------------------------------------------------------------
create or replace function public.phase_b4_apply_inventory_current_delta(
  r public.inventory_transactions,
  p_warehouse_code text,
  p_location_code text,
  p_delta numeric
) returns void
language plpgsql
as $$
begin
  if p_warehouse_code is null or p_location_code is null or p_delta = 0 then
    return;
  end if;

  update public.inventory_current
  set quantity_on_hand = quantity_on_hand + p_delta,
      part_name = coalesce(part_name, r.part_name),
      quantity_unit = coalesce(r.quantity_unit, quantity_unit),
      updated_at = now()
  where part_no = r.part_no
    and warehouse_code = p_warehouse_code
    and location_code = p_location_code
    and inventory_type = r.inventory_type
    and coalesce(project_no, '') = coalesce(r.project_no, '')
    and coalesce(mrp_key, '') = coalesce(r.mrp_key, '')
    and coalesce(pallet_id::text, '') = coalesce(r.pallet_id::text, '');

  if not found then
    insert into public.inventory_current (
      part_no,
      part_name,
      warehouse_code,
      location_code,
      inventory_type,
      project_no,
      mrp_key,
      pallet_id,
      quantity_on_hand,
      quantity_unit,
      updated_at
    )
    values (
      r.part_no,
      r.part_name,
      p_warehouse_code,
      p_location_code,
      r.inventory_type,
      r.project_no,
      r.mrp_key,
      r.pallet_id,
      p_delta,
      coalesce(r.quantity_unit, 'pcs'),
      now()
    );
  end if;
end;
$$;

create or replace function public.phase_b1_sync_apply_row_to_inventory_current(
  r public.inventory_transactions
) returns void
language plpgsql
as $$
begin
  if r.transaction_type = 'IN' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.to_warehouse_code, r.warehouse_code),
      coalesce(r.to_location_code, r.location_code),
      r.quantity
    );
  elsif r.transaction_type = 'OUT' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.from_warehouse_code, r.warehouse_code),
      coalesce(r.from_location_code, r.location_code),
      -r.quantity
    );
  elsif r.transaction_type = 'MOVE' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.from_warehouse_code, r.warehouse_code),
      coalesce(r.from_location_code, r.location_code),
      -r.quantity
    );
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.to_warehouse_code, r.warehouse_code),
      coalesce(r.to_location_code, r.location_code),
      r.quantity
    );
  elsif r.transaction_type = 'ADJUST' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      r.warehouse_code,
      r.location_code,
      r.quantity
    );
  end if;
end;
$$;

create or replace function public.phase_b1_sync_undo_row_from_inventory_current(
  r public.inventory_transactions
) returns void
language plpgsql
as $$
begin
  if r.transaction_type = 'IN' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.to_warehouse_code, r.warehouse_code),
      coalesce(r.to_location_code, r.location_code),
      -r.quantity
    );
  elsif r.transaction_type = 'OUT' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.from_warehouse_code, r.warehouse_code),
      coalesce(r.from_location_code, r.location_code),
      r.quantity
    );
  elsif r.transaction_type = 'MOVE' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.from_warehouse_code, r.warehouse_code),
      coalesce(r.from_location_code, r.location_code),
      r.quantity
    );
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      coalesce(r.to_warehouse_code, r.warehouse_code),
      coalesce(r.to_location_code, r.location_code),
      -r.quantity
    );
  elsif r.transaction_type = 'ADJUST' then
    perform public.phase_b4_apply_inventory_current_delta(
      r,
      r.warehouse_code,
      r.location_code,
      -r.quantity
    );
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. rebuild_inventory_current()
-- -----------------------------------------------------------------------------
create or replace function public.rebuild_inventory_current()
returns void
language plpgsql
set search_path to public
as $$
begin
  delete from public.inventory_current;

  insert into public.inventory_current (
    part_no,
    part_name,
    warehouse_code,
    location_code,
    inventory_type,
    project_no,
    mrp_key,
    pallet_id,
    quantity_on_hand,
    quantity_unit,
    updated_at
  )
  with normalized_movements as (
    select
      it.part_no,
      it.part_name,
      coalesce(it.to_warehouse_code, it.warehouse_code) as warehouse_code,
      coalesce(it.to_location_code, it.location_code) as location_code,
      it.inventory_type,
      it.project_no,
      it.mrp_key,
      it.pallet_id,
      it.quantity::numeric as qty_delta,
      coalesce(it.quantity_unit, 'pcs') as quantity_unit
    from public.inventory_transactions it
    where it.transaction_type = 'IN'

    union all

    select
      it.part_no,
      it.part_name,
      coalesce(it.from_warehouse_code, it.warehouse_code) as warehouse_code,
      coalesce(it.from_location_code, it.location_code) as location_code,
      it.inventory_type,
      it.project_no,
      it.mrp_key,
      it.pallet_id,
      -it.quantity::numeric as qty_delta,
      coalesce(it.quantity_unit, 'pcs') as quantity_unit
    from public.inventory_transactions it
    where it.transaction_type = 'OUT'

    union all

    select
      it.part_no,
      it.part_name,
      leg.warehouse_code,
      leg.location_code,
      it.inventory_type,
      it.project_no,
      it.mrp_key,
      it.pallet_id,
      leg.qty_delta,
      coalesce(it.quantity_unit, 'pcs') as quantity_unit
    from public.inventory_transactions it
    cross join lateral (
      values
        (
          coalesce(it.from_warehouse_code, it.warehouse_code),
          coalesce(it.from_location_code, it.location_code),
          (-it.quantity)::numeric
        ),
        (
          coalesce(it.to_warehouse_code, it.warehouse_code),
          coalesce(it.to_location_code, it.location_code),
          it.quantity::numeric
        )
    ) as leg(warehouse_code, location_code, qty_delta)
    where it.transaction_type = 'MOVE'
      and leg.warehouse_code is not null
      and leg.location_code is not null

    union all

    select
      it.part_no,
      it.part_name,
      it.warehouse_code,
      it.location_code,
      it.inventory_type,
      it.project_no,
      it.mrp_key,
      it.pallet_id,
      it.quantity::numeric as qty_delta,
      coalesce(it.quantity_unit, 'pcs') as quantity_unit
    from public.inventory_transactions it
    where it.transaction_type = 'ADJUST'
  ),
  aggregated as (
    select
      part_no,
      max(part_name) as part_name,
      warehouse_code,
      location_code,
      inventory_type,
      project_no,
      mrp_key,
      pallet_id,
      sum(qty_delta) as quantity_on_hand,
      max(quantity_unit) as quantity_unit
    from normalized_movements
    where warehouse_code is not null
      and location_code is not null
    group by
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      project_no,
      mrp_key,
      pallet_id
  )
  select
    part_no,
    part_name,
    warehouse_code,
    location_code,
    inventory_type,
    project_no,
    mrp_key,
    pallet_id,
    quantity_on_hand,
    coalesce(quantity_unit, 'pcs'),
    now()
  from aggregated
  where quantity_on_hand <> 0;
end;
$$;

comment on function public.rebuild_inventory_current() is
  'Phase B4-1: inventory_transactions を真実として inventory_current を全削除・再集計する。scan_events / shipment_items は使わない。';

-- -----------------------------------------------------------------------------
-- 9. rebuild_pallet_current_locations()
-- -----------------------------------------------------------------------------
create or replace function public.rebuild_pallet_current_locations()
returns void
language plpgsql
set search_path to public
as $$
begin
  update public.pallet_units
  set current_location_code = null,
      pallet_status = 'in_stock',
      received_at = null,
      shipped_at = null,
      updated_at = now();

  with first_in as (
    select
      pt.pallet_id,
      min(pt.event_at) as received_at
    from public.pallet_transactions pt
    where pt.pallet_id is not null
      and pt.transaction_type = 'IN'
    group by pt.pallet_id
  ),
  latest as (
    select distinct on (pt.pallet_id)
      pt.pallet_id,
      pt.transaction_type,
      pt.to_location_code,
      pt.event_at
    from public.pallet_transactions pt
    where pt.pallet_id is not null
    order by pt.pallet_id, pt.event_at desc, pt.created_at desc, pt.id desc
  )
  update public.pallet_units pu
  set current_location_code = case
        when l.transaction_type = 'OUT' then null
        when l.transaction_type in ('IN', 'MOVE', 'ADJUST') then coalesce(l.to_location_code, pu.current_location_code)
        else pu.current_location_code
      end,
      pallet_status = case
        when l.transaction_type = 'IN' then 'in_stock'
        when l.transaction_type = 'MOVE' then 'moved'
        when l.transaction_type = 'OUT' then 'shipped'
        when l.transaction_type = 'ADJUST' then pu.pallet_status
        else pu.pallet_status
      end,
      received_at = fi.received_at,
      shipped_at = case
        when l.transaction_type = 'OUT' then l.event_at
        else null
      end,
      updated_at = now()
  from latest l
  left join first_in fi on fi.pallet_id = l.pallet_id
  where pu.id = l.pallet_id;
end;
$$;

comment on function public.rebuild_pallet_current_locations() is
  'Phase B4-1: pallet_transactions を真実として pallet_units の現在位置・状態キャッシュを再生成する。';

-- -----------------------------------------------------------------------------
-- grants（既存 public テーブルと同方針）
-- -----------------------------------------------------------------------------
grant all on table public.warehouse_locations to anon;
grant all on table public.warehouse_locations to authenticated;
grant all on table public.warehouse_locations to service_role;

grant all on table public.pallet_units to anon;
grant all on table public.pallet_units to authenticated;
grant all on table public.pallet_units to service_role;

grant all on table public.pallet_transactions to anon;
grant all on table public.pallet_transactions to authenticated;
grant all on table public.pallet_transactions to service_role;

grant all on table public.pallet_item_links to anon;
grant all on table public.pallet_item_links to authenticated;
grant all on table public.pallet_item_links to service_role;

grant all on table public.inventory_transactions to anon;
grant all on table public.inventory_transactions to authenticated;
grant all on table public.inventory_transactions to service_role;

grant all on table public.inventory_current to anon;
grant all on table public.inventory_current to authenticated;
grant all on table public.inventory_current to service_role;

grant all on function public.rebuild_inventory_current() to anon;
grant all on function public.rebuild_inventory_current() to authenticated;
grant all on function public.rebuild_inventory_current() to service_role;

grant all on function public.rebuild_pallet_current_locations() to anon;
grant all on function public.rebuild_pallet_current_locations() to authenticated;
grant all on function public.rebuild_pallet_current_locations() to service_role;

commit;
