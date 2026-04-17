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
