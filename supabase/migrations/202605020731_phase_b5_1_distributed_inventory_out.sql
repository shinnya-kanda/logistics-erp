-- =============================================================================
-- Phase B5-1: 分散在庫出庫ロジック
--
-- 原則:
-- - inventory_transactions = 品番・数量在庫の真実ログ
-- - inventory_current は配分判断にだけ使う派生キャッシュ
-- - inventory_current を直接更新しない
-- - scan / shipment / pallet / billing 系には触れない
-- =============================================================================

begin;

create or replace function public.create_distributed_inventory_out(
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text,
  p_from_location_codes text[] default null,
  p_inventory_type text default 'project',
  p_project_no text default null,
  p_mrp_key text default null,
  p_quantity_unit text default null,
  p_idempotency_key text default null,
  p_event_at timestamptz default now(),
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null
)
returns table (
  transaction_id uuid,
  part_no text,
  warehouse_code text,
  from_location_code text,
  quantity numeric,
  quantity_unit text,
  idempotency_key text
)
language plpgsql
set search_path to public
as $$
declare
  v_remaining numeric;
  v_take numeric;
  v_total_available numeric;
  v_key text := nullif(trim(p_idempotency_key), '');
  v_key_prefix text;
  v_seq integer := 0;
  v_inserted_id uuid;
  c record;
begin
  if p_part_no is null or trim(p_part_no) = '' then
    raise exception 'distributed_inventory_out: part_no is required'
      using errcode = 'check_violation';
  end if;

  if p_warehouse_code is null or trim(p_warehouse_code) = '' then
    raise exception 'distributed_inventory_out: warehouse_code is required'
      using errcode = 'check_violation';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'distributed_inventory_out: quantity must be positive (got %)', p_quantity
      using errcode = 'check_violation';
  end if;

  if p_inventory_type is null or trim(p_inventory_type) = '' then
    raise exception 'distributed_inventory_out: inventory_type is required'
      using errcode = 'check_violation';
  end if;

  -- 冪等 replay: この関数は分割行へ key:001, key:002 ... を付ける。
  if v_key is not null then
    v_key_prefix := v_key || ':';

    return query
    select
      it.id,
      it.part_no,
      it.warehouse_code,
      coalesce(it.from_location_code, it.location_code) as from_location_code,
      it.quantity,
      it.quantity_unit,
      it.idempotency_key
    from public.inventory_transactions it
    where it.transaction_type = 'OUT'
      and (
        it.idempotency_key = v_key
        or left(coalesce(it.idempotency_key, ''), length(v_key_prefix)) = v_key_prefix
      )
    order by it.idempotency_key nulls last, it.created_at, it.id;

    if found then
      return;
    end if;
  end if;

  select coalesce(sum(ic.quantity_on_hand), 0::numeric)
    into v_total_available
  from public.inventory_current ic
  where ic.part_no = p_part_no
    and ic.warehouse_code = p_warehouse_code
    and ic.inventory_type = p_inventory_type
    and coalesce(ic.project_no, '') = coalesce(p_project_no, '')
    and coalesce(ic.mrp_key, '') = coalesce(p_mrp_key, '')
    and ic.quantity_on_hand > 0;

  if v_total_available < p_quantity then
    raise exception
      'distributed_inventory_out: insufficient stock part_no=% warehouse_code=% inventory_type=% required=% available=%',
      p_part_no,
      p_warehouse_code,
      p_inventory_type,
      p_quantity,
      v_total_available
      using errcode = 'check_violation';
  end if;

  v_remaining := p_quantity;

  for c in
    select
      ic.part_no,
      ic.part_name,
      ic.warehouse_code,
      ic.location_code,
      ic.inventory_type,
      ic.project_no,
      ic.mrp_key,
      ic.pallet_id,
      ic.quantity_on_hand,
      ic.quantity_unit,
      array_position(p_from_location_codes, ic.location_code) as priority_no
    from public.inventory_current ic
    where ic.part_no = p_part_no
      and ic.warehouse_code = p_warehouse_code
      and ic.inventory_type = p_inventory_type
      and coalesce(ic.project_no, '') = coalesce(p_project_no, '')
      and coalesce(ic.mrp_key, '') = coalesce(p_mrp_key, '')
      and ic.quantity_on_hand > 0
    order by
      case
        when p_from_location_codes is null then 0
        when array_position(p_from_location_codes, ic.location_code) is null then 1
        else 0
      end,
      array_position(p_from_location_codes, ic.location_code) nulls last,
      ic.updated_at asc,
      ic.location_code asc,
      ic.pallet_id nulls last
    for update of ic
  loop
    exit when v_remaining <= 0;

    v_take := least(v_remaining, c.quantity_on_hand);
    if v_take <= 0 then
      continue;
    end if;

    v_seq := v_seq + 1;

    insert into public.inventory_transactions (
      transaction_type,
      part_no,
      part_name,
      quantity,
      quantity_unit,
      inventory_type,
      project_no,
      mrp_key,
      warehouse_code,
      location_code,
      from_warehouse_code,
      from_location_code,
      pallet_id,
      event_at,
      operator_id,
      operator_name,
      idempotency_key,
      remarks
    )
    values (
      'OUT',
      c.part_no,
      c.part_name,
      v_take,
      coalesce(p_quantity_unit, c.quantity_unit, 'pcs'),
      c.inventory_type,
      c.project_no,
      c.mrp_key,
      c.warehouse_code,
      c.location_code,
      c.warehouse_code,
      c.location_code,
      c.pallet_id,
      coalesce(p_event_at, now()),
      p_operator_id,
      p_operator_name,
      case
        when v_key is null then null
        else v_key || ':' || lpad(v_seq::text, 3, '0')
      end,
      p_remarks
    )
    returning id into v_inserted_id;

    transaction_id := v_inserted_id;
    part_no := c.part_no;
    warehouse_code := c.warehouse_code;
    from_location_code := c.location_code;
    quantity := v_take;
    quantity_unit := coalesce(p_quantity_unit, c.quantity_unit, 'pcs');
    idempotency_key := case
      when v_key is null then null
      else v_key || ':' || lpad(v_seq::text, 3, '0')
    end;
    return next;

    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception
      'distributed_inventory_out: allocation failed part_no=% warehouse_code=% remaining=%',
      p_part_no,
      p_warehouse_code,
      v_remaining
      using errcode = 'check_violation';
  end if;

  return;
end;
$$;

comment on function public.create_distributed_inventory_out(
  text,
  numeric,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text
) is
  'Phase B5-1: inventory_current を配分判断に使い、複数ロケーションへ OUT inventory_transactions を自動分割 INSERT する。inventory_current は直接更新しない。';

grant all on function public.create_distributed_inventory_out(
  text,
  numeric,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text
) to anon;

grant all on function public.create_distributed_inventory_out(
  text,
  numeric,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text
) to authenticated;

grant all on function public.create_distributed_inventory_out(
  text,
  numeric,
  text,
  text[],
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text
) to service_role;

commit;
