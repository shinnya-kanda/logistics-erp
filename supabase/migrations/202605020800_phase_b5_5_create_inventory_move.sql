-- =============================================================================
-- Phase B5-5: 棚間移動 DB 関数
--
-- 原則:
-- - inventory_transactions = 品番・数量在庫の真実ログ
-- - MOVE は OUT(from) + IN(to) の2イベントで表現する
-- - inventory_current は在庫チェックにだけ使い、直接更新しない
-- - 既存 IN / OUT / scan / shipment / pallet / billing 系には触れない
-- =============================================================================

begin;

create or replace function public.create_inventory_move(
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text,
  p_from_location_code text,
  p_to_location_code text,
  p_idempotency_key text,
  p_inventory_type text default 'project',
  p_project_no text default null,
  p_mrp_key text default null,
  p_quantity_unit text default null,
  p_event_at timestamptz default now(),
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null
)
returns jsonb
language plpgsql
set search_path to public
as $$
declare
  v_key text := nullif(trim(p_idempotency_key), '');
  v_out_key text;
  v_in_key text;
  v_available numeric;
  v_part_name text;
  v_quantity_unit text;
  v_out_id uuid;
  v_in_id uuid;
  v_out_tx jsonb;
  v_in_tx jsonb;
begin
  if p_part_no is null or trim(p_part_no) = '' then
    raise exception 'inventory_move: part_no is required'
      using errcode = 'check_violation';
  end if;

  if p_warehouse_code is null or trim(p_warehouse_code) = '' then
    raise exception 'inventory_move: warehouse_code is required'
      using errcode = 'check_violation';
  end if;

  if p_from_location_code is null or trim(p_from_location_code) = '' then
    raise exception 'inventory_move: from_location_code is required'
      using errcode = 'check_violation';
  end if;

  if p_to_location_code is null or trim(p_to_location_code) = '' then
    raise exception 'inventory_move: to_location_code is required'
      using errcode = 'check_violation';
  end if;

  if trim(p_from_location_code) = trim(p_to_location_code) then
    raise exception 'inventory_move: from_location_code and to_location_code must differ'
      using errcode = 'check_violation';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'inventory_move: quantity must be positive (got %)', p_quantity
      using errcode = 'check_violation';
  end if;

  if p_inventory_type is null or trim(p_inventory_type) = '' then
    raise exception 'inventory_move: inventory_type is required'
      using errcode = 'check_violation';
  end if;

  if v_key is null then
    raise exception 'inventory_move: idempotency_key is required'
      using errcode = 'check_violation';
  end if;

  v_out_key := v_key || ':OUT';
  v_in_key := v_key || ':IN';

  select to_jsonb(it)
    into v_out_tx
  from public.inventory_transactions it
  where it.transaction_type = 'OUT'
    and it.idempotency_key = v_out_key
  order by it.created_at, it.id
  limit 1;

  select to_jsonb(it)
    into v_in_tx
  from public.inventory_transactions it
  where it.transaction_type = 'IN'
    and it.idempotency_key = v_in_key
  order by it.created_at, it.id
  limit 1;

  if v_out_tx is not null and v_in_tx is not null then
    return jsonb_build_object(
      'ok', true,
      'move', jsonb_build_object(
        'out_transaction', v_out_tx,
        'in_transaction', v_in_tx
      )
    );
  end if;

  if v_out_tx is not null or v_in_tx is not null then
    raise exception 'inventory_move: incomplete idempotency state for key %', v_key
      using errcode = 'check_violation';
  end if;

  -- 在庫チェック中に同一 current 行へ並行配分されないようロックする。
  perform 1
  from public.inventory_current ic
  where ic.part_no = trim(p_part_no)
    and ic.warehouse_code = trim(p_warehouse_code)
    and ic.location_code = trim(p_from_location_code)
    and ic.inventory_type = trim(p_inventory_type)
    and coalesce(ic.project_no, '') = coalesce(nullif(trim(p_project_no), ''), '')
    and coalesce(ic.mrp_key, '') = coalesce(nullif(trim(p_mrp_key), ''), '')
  for update;

  select
    coalesce(sum(ic.quantity_on_hand), 0::numeric),
    max(ic.part_name),
    max(ic.quantity_unit)
    into v_available, v_part_name, v_quantity_unit
  from public.inventory_current ic
  where ic.part_no = trim(p_part_no)
    and ic.warehouse_code = trim(p_warehouse_code)
    and ic.location_code = trim(p_from_location_code)
    and ic.inventory_type = trim(p_inventory_type)
    and coalesce(ic.project_no, '') = coalesce(nullif(trim(p_project_no), ''), '')
    and coalesce(ic.mrp_key, '') = coalesce(nullif(trim(p_mrp_key), ''), '');

  if v_available < p_quantity then
    raise exception
      'inventory_move: insufficient stock part_no=% warehouse_code=% from_location_code=% inventory_type=% required=% available=%',
      trim(p_part_no),
      trim(p_warehouse_code),
      trim(p_from_location_code),
      trim(p_inventory_type),
      p_quantity,
      v_available
      using errcode = 'check_violation';
  end if;

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
    event_at,
    operator_id,
    operator_name,
    idempotency_key,
    remarks
  )
  values (
    'OUT',
    trim(p_part_no),
    v_part_name,
    p_quantity,
    coalesce(nullif(trim(p_quantity_unit), ''), v_quantity_unit, 'pcs'),
    trim(p_inventory_type),
    nullif(trim(p_project_no), ''),
    nullif(trim(p_mrp_key), ''),
    trim(p_warehouse_code),
    trim(p_from_location_code),
    trim(p_warehouse_code),
    trim(p_from_location_code),
    coalesce(p_event_at, now()),
    nullif(trim(p_operator_id), ''),
    nullif(trim(p_operator_name), ''),
    v_out_key,
    p_remarks
  )
  returning id into v_out_id;

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
    to_warehouse_code,
    to_location_code,
    event_at,
    operator_id,
    operator_name,
    idempotency_key,
    remarks
  )
  values (
    'IN',
    trim(p_part_no),
    v_part_name,
    p_quantity,
    coalesce(nullif(trim(p_quantity_unit), ''), v_quantity_unit, 'pcs'),
    trim(p_inventory_type),
    nullif(trim(p_project_no), ''),
    nullif(trim(p_mrp_key), ''),
    trim(p_warehouse_code),
    trim(p_to_location_code),
    trim(p_warehouse_code),
    trim(p_to_location_code),
    coalesce(p_event_at, now()),
    nullif(trim(p_operator_id), ''),
    nullif(trim(p_operator_name), ''),
    v_in_key,
    p_remarks
  )
  returning id into v_in_id;

  select to_jsonb(it)
    into v_out_tx
  from public.inventory_transactions it
  where it.id = v_out_id;

  select to_jsonb(it)
    into v_in_tx
  from public.inventory_transactions it
  where it.id = v_in_id;

  return jsonb_build_object(
    'ok', true,
    'move', jsonb_build_object(
      'out_transaction', v_out_tx,
      'in_transaction', v_in_tx
    )
  );
end;
$$;

comment on function public.create_inventory_move(
  text,
  numeric,
  text,
  text,
  text,
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
  'Phase B5-5: 棚間移動を OUT(from) + IN(to) の inventory_transactions 2イベントとして同一トランザクションで作成する。inventory_current は直接更新しない。';

grant all on function public.create_inventory_move(
  text,
  numeric,
  text,
  text,
  text,
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

grant all on function public.create_inventory_move(
  text,
  numeric,
  text,
  text,
  text,
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

grant all on function public.create_inventory_move(
  text,
  numeric,
  text,
  text,
  text,
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
