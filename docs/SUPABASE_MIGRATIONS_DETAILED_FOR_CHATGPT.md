# supabase/migrations 全ファイル詳細（ChatGPT 共有用）

この文書は **`supabase/migrations/` 配下の SQL migration ファイル** を、適用順・内容・（可能な範囲で）全文レベルで整理したものです。  
**検証用 SQL**（`supabase/verify_phase_*.sql`）は migration ではないため本書の対象外です。

---

## 1. 適用順（ファイル名の辞書順）

Supabase CLI は通常 **`supabase/migrations/` 内のファイル名を辞書順**で適用します。現状の順は次のとおりです。

| # | ファイル名 |
|---|------------|
| 1 | `20260405_init.sql` |
| 2 | `202604181400_phase_b2_1_add_adjust.sql` |
| 3 | `202604181500_phase_b2_2_add_rebuild_inventory_current.sql` |
| 4 | `202604182200_phase_b2_3_add_trace_id_to_inventory_transactions.sql` |
| 5 | `202604182400_phase_b2_4_create_trace_events.sql` |
| 6 | `202604191200_phase_b3_1_add_profiles_and_roles.sql` |
| 7 | `20260419_create_scan_events.sql` |

**注意（命名）:** `20260419_create_scan_events.sql` は `202604191200_...` より **辞書順で後**になります（`20260419` + `_` が `202604191200` の `1` より後ろになるため）。B3-1 の後に実行されます。意図と異なる場合はファイル名を `202604192000_...` のように揃えると安全です。

---

## 2. `20260405_init.sql`（ベーススキーマ・大容量）

**役割:** 空の `public` に対する **初期スキーマ一括作成**（pg_dump 風）。以降の Phase B/B3 migration の前提。

**行数目安:** 約 800 行（完全なソースはリポジトリ内ファイルを参照）。

### 2.1 作成されるテーブル（`CREATE TABLE IF NOT EXISTS`）

| テーブル | 概要 |
|----------|------|
| `inventory_transactions` | 部品在庫 **Ledger**（`IN`/`OUT`/`MOVE`/`ADJUST`）。`quantity`≥0、`to_*` は MOVE 用。 |
| `inventory` | サプライヤ×品番の在庫集約（`on_hand`/`allocated`/`available`）。 |
| `inventory_current` | **集約キャッシュ**（`part_no`,`warehouse_code`,`location_code`,`inventory_type` の自然キー UNIQUE）。 |
| `pallet_units` / `pallet_transactions` / `pallet_item_links` | パレット単位の状態・イベント・紐付け。 |
| `shipments` | 出荷ヘッダ相当（`issue_no`,`supplier`,`part_no` 等レガシー列あり）。 |
| `stock_movements` | 在庫移動履歴。`movement_type` IN/OUT/ADJUST/RESERVE/RELEASE、`idempotency_key`。 |
| `trace_events` | 現場トレースイベント（`event_type` 等に **厳格 CHECK**、後続 B2-4 で一部緩和）。 |

### 2.2 主要関数（`CREATE OR REPLACE FUNCTION`）

| 関数 | 役割 |
|------|------|
| `phase_b1_prevent_negative_inventory_transactions` | **BEFORE** INSERT/UPDATE on `inventory_transactions`。当初は `OUT`/`MOVE` のみ（B2-1 で ADJUST 等に拡張される）。 |
| `phase_b1_sync_apply_row_to_inventory_current` | Ledger 1 行を `inventory_current` に反映（IN/OUT/MOVE）。 |
| `phase_b1_sync_undo_row_from_inventory_current` | UPDATE 時 OLD 行の打ち消し。 |
| `phase_b1_sync_inventory_current_from_transactions` | **AFTER** INSERT/UPDATE：UPDATE 時は undo→apply。 |
| `set_phase_b1_row_updated_at` / `set_updated_at` | `updated_at` 自動更新。 |

### 2.3 トリガー

- `inventory` / `inventory_current` / `inventory_transactions` / `pallet_*`：`updated_at`
- `inventory_transactions`：**BEFORE** 負在庫、`AFTER` `inventory_current` 同期

### 2.4 その他

- **PRIMARY KEY / UNIQUE / INDEX:** 各テーブルに btree、部分 UNIQUE（`idempotency_key`）、`trace_events` に GIN(`payload`) 等。
- **FK:** 例）`stock_movements.shipment_id`→`shipments`、`trace_events`→`shipments`/`stock_movements`、パレット系相互。
- **GRANT:** `anon` / `authenticated` / `service_role` に `public` の USAGE とテーブル・関数への ALL。

**完全な DDL はリポジトリの `supabase/migrations/20260405_init.sql` を参照してください。**

---

## 3. `202604181400_phase_b2_1_add_adjust.sql`

**役割:** 棚卸 **ADJUST**、Ledger 同期・負在庫の拡張、`chk_*` 制約名の整理。

**全文（リポジトリの migration ファイルと同一・431 行）:**

```sql
-- Phase B2-1: ADJUST（棚卸差異）— transaction_type / columns / constraints + sync & negative-stock functions

begin;

-- =========================
-- 1. transaction_type 拡張（旧制約名互換）
-- =========================

alter table public.inventory_transactions
  drop constraint if exists chk_inventory_transactions_type;

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_transaction_type_check;

alter table public.inventory_transactions
  add constraint inventory_transactions_transaction_type_check
  check (
    transaction_type in ('IN', 'OUT', 'MOVE', 'ADJUST')
  );

-- =========================
-- 2. ADJUST 用カラム追加
-- =========================

alter table public.inventory_transactions
  add column if not exists adjust_direction text,
  add column if not exists adjust_reason text,
  add column if not exists adjust_note text,
  add column if not exists counted_quantity numeric,
  add column if not exists book_quantity numeric;

-- =========================
-- 3. adjust_direction 制約
-- =========================

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_adjust_direction_check;

alter table public.inventory_transactions
  add constraint inventory_transactions_adjust_direction_check
  check (
    adjust_direction is null
    or adjust_direction in ('INCREASE', 'DECREASE')
  );

-- =========================
-- 4. ADJUST 整合性制約
-- =========================

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_adjust_requirements_check;

alter table public.inventory_transactions
  add constraint inventory_transactions_adjust_requirements_check
  check (
    (
      transaction_type = 'ADJUST'
      and adjust_direction is not null
    )
    or
    (
      transaction_type <> 'ADJUST'
      and adjust_direction is null
    )
  );

-- =========================
-- 5. 数量制約（棚卸メタ）
-- =========================

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_counted_quantity_check;

alter table public.inventory_transactions
  add constraint inventory_transactions_counted_quantity_check
  check (
    counted_quantity is null or counted_quantity >= 0
  );

alter table public.inventory_transactions
  drop constraint if exists inventory_transactions_book_quantity_check;

alter table public.inventory_transactions
  add constraint inventory_transactions_book_quantity_check
  check (
    book_quantity is null or book_quantity >= 0
  );

-- -----------------------------------------------------------------------------
-- BEFORE 検証用: UPDATE 時に OLD のキー上の影響をデルタで戻す（OUT / MOVE / ADJUST DECREASE / ADJUST INCREASE）
-- -----------------------------------------------------------------------------

create or replace function public.phase_b1_undo_old_effect_on_key(
  p_old public.inventory_transactions,
  p_part text,
  p_wh text,
  p_loc text,
  p_inv text
) returns numeric
language plpgsql
immutable
as $$
begin
  if p_old.transaction_type = 'IN' then
    if p_old.part_no = p_part
       and p_old.warehouse_code = p_wh
       and p_old.location_code = p_loc
       and p_old.inventory_type = p_inv then
      return -p_old.quantity;
    end if;
  elsif p_old.transaction_type = 'OUT' then
    if p_old.part_no = p_part
       and p_old.warehouse_code = p_wh
       and p_old.location_code = p_loc
       and p_old.inventory_type = p_inv then
      return p_old.quantity;
    end if;
  elsif p_old.transaction_type = 'MOVE' then
    if p_old.part_no = p_part
       and p_old.warehouse_code = p_wh
       and p_old.location_code = p_loc
       and p_old.inventory_type = p_inv then
      return p_old.quantity;
    end if;
    if p_old.to_warehouse_code is not null
       and p_old.to_location_code is not null
       and p_old.part_no = p_part
       and p_old.to_warehouse_code = p_wh
       and p_old.to_location_code = p_loc
       and p_old.inventory_type = p_inv then
      return -p_old.quantity;
    end if;
  elsif p_old.transaction_type = 'ADJUST' then
    if p_old.part_no = p_part
       and p_old.warehouse_code = p_wh
       and p_old.location_code = p_loc
       and p_old.inventory_type = p_inv then
      if p_old.adjust_direction = 'INCREASE' then
        return -p_old.quantity;
      elsif p_old.adjust_direction = 'DECREASE' then
        return p_old.quantity;
      end if;
    end if;
  end if;
  return 0::numeric;
end;
$$;

comment on function public.phase_b1_undo_old_effect_on_key(
  public.inventory_transactions, text, text, text, text
) is
  'UPDATE 時の負在庫判定で、OLD 行が当該キーに与えた在庫変化を打ち消すデルタ（available に加算）。Phase B2-1 で ADJUST を追加。';

grant all on function public.phase_b1_undo_old_effect_on_key(
  public.inventory_transactions, text, text, text, text
) to anon;
grant all on function public.phase_b1_undo_old_effect_on_key(
  public.inventory_transactions, text, text, text, text
) to authenticated;
grant all on function public.phase_b1_undo_old_effect_on_key(
  public.inventory_transactions, text, text, text, text
) to service_role;

-- -----------------------------------------------------------------------------
-- AFTER: apply — IN / OUT / MOVE / ADJUST
-- -----------------------------------------------------------------------------

create or replace function public.phase_b1_sync_apply_row_to_inventory_current(
  r public.inventory_transactions
) returns void
language plpgsql
as $$
begin
  if r.transaction_type = 'IN' then
    insert into public.inventory_current (
      part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at
    )
    values (
      r.part_no, r.warehouse_code, r.location_code, r.inventory_type, r.quantity, now()
    )
    on conflict on constraint uq_inventory_current_natural_key do update set
      quantity_on_hand = public.inventory_current.quantity_on_hand + excluded.quantity_on_hand,
      updated_at = now();

  elsif r.transaction_type = 'OUT' then
    update public.inventory_current
    set
      quantity_on_hand = greatest(0, quantity_on_hand - r.quantity),
      updated_at = now()
    where part_no = r.part_no
      and warehouse_code = r.warehouse_code
      and location_code = r.location_code
      and inventory_type = r.inventory_type;

  elsif r.transaction_type = 'MOVE' then
    update public.inventory_current
    set
      quantity_on_hand = greatest(0, quantity_on_hand - r.quantity),
      updated_at = now()
    where part_no = r.part_no
      and warehouse_code = r.warehouse_code
      and location_code = r.location_code
      and inventory_type = r.inventory_type;

    insert into public.inventory_current (
      part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at
    )
    values (
      r.part_no, r.to_warehouse_code, r.to_location_code, r.inventory_type, r.quantity, now()
    )
    on conflict on constraint uq_inventory_current_natural_key do update set
      quantity_on_hand = public.inventory_current.quantity_on_hand + excluded.quantity_on_hand,
      updated_at = now();

  elsif r.transaction_type = 'ADJUST' then
    if r.adjust_direction = 'INCREASE' then
      insert into public.inventory_current (
        part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at
      )
      values (
        r.part_no, r.warehouse_code, r.location_code, r.inventory_type, r.quantity, now()
      )
      on conflict on constraint uq_inventory_current_natural_key do update set
        quantity_on_hand = public.inventory_current.quantity_on_hand + excluded.quantity_on_hand,
        updated_at = now();
    elsif r.adjust_direction = 'DECREASE' then
      update public.inventory_current
      set
        quantity_on_hand = greatest(0, quantity_on_hand - r.quantity),
        updated_at = now()
      where part_no = r.part_no
        and warehouse_code = r.warehouse_code
        and location_code = r.location_code
        and inventory_type = r.inventory_type;
    end if;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- AFTER: undo（UPDATE 時の OLD 打ち消し）
-- -----------------------------------------------------------------------------

create or replace function public.phase_b1_sync_undo_row_from_inventory_current(
  r public.inventory_transactions
) returns void
language plpgsql
as $$
begin
  if r.transaction_type = 'IN' then
    update public.inventory_current
    set
      quantity_on_hand = greatest(0, quantity_on_hand - r.quantity),
      updated_at = now()
    where part_no = r.part_no
      and warehouse_code = r.warehouse_code
      and location_code = r.location_code
      and inventory_type = r.inventory_type;

  elsif r.transaction_type = 'OUT' then
    update public.inventory_current
    set
      quantity_on_hand = quantity_on_hand + r.quantity,
      updated_at = now()
    where part_no = r.part_no
      and warehouse_code = r.warehouse_code
      and location_code = r.location_code
      and inventory_type = r.inventory_type;

  elsif r.transaction_type = 'MOVE' then
    update public.inventory_current
    set
      quantity_on_hand = quantity_on_hand + r.quantity,
      updated_at = now()
    where part_no = r.part_no
      and warehouse_code = r.warehouse_code
      and location_code = r.location_code
      and inventory_type = r.inventory_type;

    update public.inventory_current
    set
      quantity_on_hand = greatest(0, quantity_on_hand - r.quantity),
      updated_at = now()
    where part_no = r.part_no
      and warehouse_code = r.to_warehouse_code
      and location_code = r.to_location_code
      and inventory_type = r.inventory_type;

  elsif r.transaction_type = 'ADJUST' then
    if r.adjust_direction = 'INCREASE' then
      update public.inventory_current
      set
        quantity_on_hand = greatest(0, quantity_on_hand - r.quantity),
        updated_at = now()
      where part_no = r.part_no
        and warehouse_code = r.warehouse_code
        and location_code = r.location_code
        and inventory_type = r.inventory_type;
    elsif r.adjust_direction = 'DECREASE' then
      update public.inventory_current
      set
        quantity_on_hand = quantity_on_hand + r.quantity,
        updated_at = now()
      where part_no = r.part_no
        and warehouse_code = r.warehouse_code
        and location_code = r.location_code
        and inventory_type = r.inventory_type;
    end if;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- BEFORE: 負在庫防止（OUT / MOVE / ADJUST DECREASE）。UPDATE 時は OLD デルタを反映。
-- -----------------------------------------------------------------------------

create or replace function public.phase_b1_prevent_negative_inventory_transactions()
returns trigger
language plpgsql
as $$
declare
  v_available numeric;
  v_delta numeric;
begin
  if new.quantity is null or new.quantity <= 0 then
    raise exception
      'phase_b1_negative_inventory: quantity must be positive (got %, transaction_type=%)',
      new.quantity,
      new.transaction_type
      using errcode = 'check_violation';
  end if;

  if new.transaction_type = 'IN' then
    return new;
  end if;

  if new.transaction_type = 'ADJUST' then
    if new.to_warehouse_code is not null or new.to_location_code is not null then
      raise exception
        'phase_b1_negative_inventory: ADJUST must not set to_warehouse_code or to_location_code (part_no=%)',
        new.part_no
        using errcode = 'check_violation';
    end if;
    if new.adjust_direction is null then
      raise exception
        'phase_b1_negative_inventory: ADJUST requires adjust_direction (part_no=%)',
        new.part_no
        using errcode = 'check_violation';
    end if;
    if new.adjust_direction not in ('INCREASE', 'DECREASE') then
      raise exception
        'phase_b1_negative_inventory: ADJUST adjust_direction must be INCREASE or DECREASE (part_no=%)',
        new.part_no
        using errcode = 'check_violation';
    end if;
    if new.warehouse_code is null or new.location_code is null then
      raise exception
        'phase_b1_negative_inventory: ADJUST requires warehouse_code and location_code (part_no=%)',
        new.part_no
        using errcode = 'check_violation';
    end if;
    if new.adjust_direction = 'INCREASE' then
      return new;
    end if;
  end if;

  if new.transaction_type not in ('OUT', 'MOVE', 'ADJUST') then
    return new;
  end if;

  if new.warehouse_code is null or new.location_code is null then
    raise exception
      'phase_b1_negative_inventory: OUT/MOVE/ADJUST require warehouse_code and location_code (transaction_type=%)',
      new.transaction_type
      using errcode = 'check_violation';
  end if;

  if new.transaction_type = 'MOVE' then
    if new.to_warehouse_code is null or new.to_location_code is null then
      raise exception
        'phase_b1_negative_inventory: MOVE requires to_warehouse_code and to_location_code (part_no=%)',
        new.part_no
        using errcode = 'check_violation';
    end if;
  end if;

  if new.transaction_type = 'ADJUST' and new.adjust_direction <> 'DECREASE' then
    return new;
  end if;

  select coalesce(sum(quantity_on_hand), 0::numeric)
  into v_available
  from public.inventory_current
  where part_no = new.part_no
    and warehouse_code = new.warehouse_code
    and location_code = new.location_code
    and inventory_type = new.inventory_type;

  if tg_op = 'UPDATE' then
    v_delta := public.phase_b1_undo_old_effect_on_key(
      old,
      new.part_no,
      new.warehouse_code,
      new.location_code,
      new.inventory_type
    );
    v_available := v_available + v_delta;
  end if;

  if v_available < new.quantity then
    raise exception
      'phase_b1_negative_inventory: insufficient stock movement_type=% required=% available=% part_no=% warehouse_code=% location_code=% inventory_type=%',
      new.transaction_type,
      new.quantity,
      v_available,
      new.part_no,
      new.warehouse_code,
      new.location_code,
      new.inventory_type
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.phase_b1_prevent_negative_inventory_transactions() is
  'OUT/MOVE/ADJUST(DECREASE) の出庫相当で inventory_current に基づき負在庫を拒否。UPDATE 時は OLD 分を phase_b1_undo_old_effect_on_key で戻してから判定。ADJUST(INCREASE) はチェックなし。';

commit;
```

---

## 4. `202604181500_phase_b2_2_add_rebuild_inventory_current.sql`

**役割:** `rebuild_inventory_current()` — `inventory_current` を全削除し、`inventory_transactions` から再集計。

**ポイント:** MOVE は `LATERAL` で **from 減算 + to 加算** の 2 イベントに分解。`trace_id` は使わない。

**全文:**

```sql
-- Phase B2-2: ledger から inventory_current を全件再集計して復元する

begin;

create or replace function public.rebuild_inventory_current()
returns void
language plpgsql
set search_path to public
as $$
begin
  delete from public.inventory_current;

  insert into public.inventory_current (
    part_no,
    warehouse_code,
    location_code,
    inventory_type,
    quantity_on_hand,
    updated_at
  )
  with normalized_movements as (
    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      quantity::numeric as qty_delta
    from public.inventory_transactions
    where transaction_type = 'IN'

    union all

    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      -quantity::numeric
    from public.inventory_transactions
    where transaction_type = 'OUT'

    union all

    -- MOVE: 1 行を from（減算）/ to（加算）の 2 イベントに分解（キーは DDL どおり warehouse_code・location_code / to_*）
    select
      m.part_no,
      u.warehouse_code,
      u.location_code,
      m.inventory_type,
      u.qty_delta
    from public.inventory_transactions m
    cross join lateral (
      select *
      from (
        values
          (m.warehouse_code, m.location_code, (-m.quantity)::numeric),
          (m.to_warehouse_code, m.to_location_code, m.quantity::numeric)
      ) as leg(warehouse_code, location_code, qty_delta)
      where leg.warehouse_code is not null
        and leg.location_code is not null
    ) u
    where m.transaction_type = 'MOVE'

    union all

    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      quantity::numeric
    from public.inventory_transactions
    where transaction_type = 'ADJUST'
      and adjust_direction = 'INCREASE'

    union all

    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      -quantity::numeric
    from public.inventory_transactions
    where transaction_type = 'ADJUST'
      and adjust_direction = 'DECREASE'
  ),
  aggregated as (
    select
      part_no,
      warehouse_code,
      location_code,
      inventory_type,
      sum(qty_delta) as quantity_on_hand
    from normalized_movements
    group by
      part_no,
      warehouse_code,
      location_code,
      inventory_type
  )
  select
    part_no,
    warehouse_code,
    location_code,
    inventory_type,
    quantity_on_hand,
    now()
  from aggregated
  where quantity_on_hand > 0;
end;
$$;

comment on function public.rebuild_inventory_current() is
  'Phase B2-2: inventory_transactions を唯一の真実として inventory_current を全削除のうえ再集計する。通常同期は AFTER trigger の責務。';

alter function public.rebuild_inventory_current() owner to postgres;

grant all on function public.rebuild_inventory_current() to anon;
grant all on function public.rebuild_inventory_current() to authenticated;
grant all on function public.rebuild_inventory_current() to service_role;

commit;
```

---

## 5. `202604182200_phase_b2_3_add_trace_id_to_inventory_transactions.sql`

**役割:** `inventory_transactions.trace_id`（nullable）とインデックス。

**全文:**

```sql
-- Phase B2-3: inventory_transactions に流れ追跡用 trace_id を追加（数量集計・rebuild のキーには含めない）

begin;

alter table public.inventory_transactions
  add column if not exists trace_id text;

comment on column public.inventory_transactions.trace_id is
  '物流フローを追跡するための識別子。数量集計キーではなく流れの追跡キー。inventory_current / rebuild_inventory_current の集計には使わない。';

create index if not exists idx_inventory_transactions_trace_id
  on public.inventory_transactions (trace_id);

commit;
```

---

## 6. `202604182400_phase_b2_4_create_trace_events.sql`

**役割:** **既存** `trace_events`（init）への列追加・CHECK 緩和・コメント・インデックス。

**全文:**

```sql
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
```

---

## 7. `202604191200_phase_b3_1_add_profiles_and_roles.sql`

**役割:** `profiles` / `roles` / `user_roles`、`auth.users` → `handle_new_user` トリガー。

**全文:**

```sql
-- Phase B3-1: Supabase Auth と業務ユーザー（profiles / roles / user_roles）

begin;

-- -----------------------------------------------------------------------------
-- profiles（auth.users の 1:1 拡張）
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_email
  on public.profiles (email);

comment on table public.profiles is
  'Supabase auth.users の業務用拡張テーブル';

-- -----------------------------------------------------------------------------
-- roles（ロール定義マスタ）
-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  role_code text not null unique,
  role_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.roles is
  '業務ロール定義テーブル';

insert into public.roles (role_code, role_name) values
  ('viewer', 'Viewer'),
  ('operator', 'Operator'),
  ('office', 'Office'),
  ('inventory_manager', 'Inventory Manager'),
  ('admin', 'Admin')
on conflict (role_code) do nothing;

-- -----------------------------------------------------------------------------
-- user_roles（ユーザーとロールの紐付け）
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists idx_user_roles_role_id
  on public.user_roles (role_id);

comment on table public.user_roles is
  'ユーザーとロールの紐付けテーブル';

-- -----------------------------------------------------------------------------
-- auth 新規ユーザー → profiles 自動作成
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

alter function public.handle_new_user() owner to postgres;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- profiles.updated_at（既存の public.set_updated_at を再利用）
-- -----------------------------------------------------------------------------
drop trigger if exists trg_profiles_set_updated_at on public.profiles;

create trigger trg_profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- grants（既存テーブルと同方針）
-- -----------------------------------------------------------------------------
grant all on table public.profiles to anon;
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

grant all on table public.roles to anon;
grant all on table public.roles to authenticated;
grant all on table public.roles to service_role;

grant all on table public.user_roles to anon;
grant all on table public.user_roles to authenticated;
grant all on table public.user_roles to service_role;

grant all on function public.handle_new_user() to anon;
grant all on function public.handle_new_user() to authenticated;
grant all on function public.handle_new_user() to service_role;

commit;
```

---

## 8. `20260419_create_scan_events.sql`

**役割:** 最小の `public.scan_events` テーブル（`idempotency_key` 部分 UNIQUE）。

**注意:** `packages/db` の Phase2 系 SQL で定義される `scan_events` と **列構成が異なる可能性**があります。アプリ（`processScanInput`）と整合するかは別途確認が必要です。

**全文:**

```sql
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
```

---

## 9. 付録: 本ディレクトリに含まれない SQL

| パス | 用途 |
|------|------|
| `supabase/verify_phase_*.sql` | 手動検証用（migration ではない） |

---

*生成・メンテ: リポジトリの `supabase/migrations` と同期させてください。秘匿情報は含みません。*
