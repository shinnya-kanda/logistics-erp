-- Phase B9-05: minimal trace_id / request_id implementation for inventory_transactions
--
-- 方針:
-- - inventory_transactions は inventory domain の source of truth として維持する
-- - trace_id / request_id は nullable で追加し、既存 write flow を壊さない
-- - NOT NULL / default / automatic backfill は行わない
-- - 既存 RPC シグネチャは残し、request_id 保存対応の nullable optional overload を追加する
-- - parent_trace_id / replay / rebuild / queue / workflow engine は導入しない

begin;

alter table public.inventory_transactions
  add column if not exists trace_id text,
  add column if not exists request_id text;

create index if not exists idx_inventory_transactions_trace_id
  on public.inventory_transactions (trace_id);

create index if not exists idx_inventory_transactions_request_id
  on public.inventory_transactions (request_id);

comment on column public.inventory_transactions.trace_id is
  '業務操作を横断追跡するための trace_id。既存履歴との互換性のため nullable とし、no backfill / no mandatory trace_id で段階導入する。';

comment on column public.inventory_transactions.request_id is
  'API実行単位の観測に使う request_id。既存履歴との互換性のため nullable とし、trace_id や将来の parent_trace_id とは分けて扱う。';

create or replace function public.create_inventory_in(
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text,
  p_to_location_code text,
  p_part_name text default null,
  p_inventory_type text default 'project',
  p_project_no text default null,
  p_mrp_key text default null,
  p_quantity_unit text default null,
  p_idempotency_key text default null,
  p_event_at timestamptz default now(),
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_trace_id text default null,
  p_request_id text default null
)
returns table (
  transaction_id uuid,
  part_no text,
  warehouse_code text,
  to_location_code text,
  quantity numeric,
  quantity_unit text,
  idempotency_key text,
  trace_id text
)
language plpgsql
set search_path to public
as $$
declare
  v_key text := nullif(trim(p_idempotency_key), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
  v_trace_id text := nullif(trim(coalesce(p_trace_id, '')), '');
  v_inserted_id uuid;
begin
  if p_part_no is null or trim(p_part_no) = '' then
    raise exception 'inventory_in: part_no is required'
      using errcode = 'check_violation';
  end if;

  if p_warehouse_code is null or trim(p_warehouse_code) = '' then
    raise exception 'inventory_in: warehouse_code is required'
      using errcode = 'check_violation';
  end if;

  if p_to_location_code is null or trim(p_to_location_code) = '' then
    raise exception 'inventory_in: to_location_code is required'
      using errcode = 'check_violation';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'inventory_in: quantity must be positive (got %)', p_quantity
      using errcode = 'check_violation';
  end if;

  if p_inventory_type is null or trim(p_inventory_type) = '' then
    raise exception 'inventory_in: inventory_type is required'
      using errcode = 'check_violation';
  end if;

  if v_key is not null then
    return query
    select
      it.id,
      it.part_no,
      it.warehouse_code,
      coalesce(it.to_location_code, it.location_code) as to_location_code,
      it.quantity,
      it.quantity_unit,
      it.idempotency_key,
      it.trace_id
    from public.inventory_transactions it
    where it.transaction_type = 'IN'
      and it.idempotency_key = v_key
    order by it.created_at, it.id
    limit 1;

    if found then
      return;
    end if;
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
    to_warehouse_code,
    to_location_code,
    event_at,
    operator_id,
    operator_name,
    idempotency_key,
    remarks,
    trace_id,
    request_id
  )
  values (
    'IN',
    trim(p_part_no),
    p_part_name,
    p_quantity,
    coalesce(nullif(trim(p_quantity_unit), ''), 'pcs'),
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
    v_key,
    p_remarks,
    v_trace_id,
    v_request_id
  )
  returning id into v_inserted_id;

  return query
  select
    it.id,
    it.part_no,
    it.warehouse_code,
    coalesce(it.to_location_code, it.location_code) as to_location_code,
    it.quantity,
    it.quantity_unit,
    it.idempotency_key,
    it.trace_id
  from public.inventory_transactions it
  where it.id = v_inserted_id;
end;
$$;

grant all on function public.create_inventory_in(
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
  text,
  text,
  text
) to anon, authenticated, service_role;

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
  p_remarks text default null,
  p_trace_id text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
set search_path to public
as $$
declare
  v_key text := nullif(trim(p_idempotency_key), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
  v_trace_id text := nullif(trim(coalesce(p_trace_id, '')), '');
  v_out_key text;
  v_in_key text;
  v_available numeric;
  v_part_name text;
  v_quantity_unit text;
  v_out_id uuid;
  v_in_id uuid;
  v_out_tx jsonb;
  v_in_tx jsonb;
  v_result_trace_id text;
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
    v_result_trace_id := coalesce(v_out_tx->>'trace_id', v_in_tx->>'trace_id', v_trace_id);
    return jsonb_build_object(
      'ok', true,
      'trace_id', v_result_trace_id,
      'request_id', coalesce(v_out_tx->>'request_id', v_in_tx->>'request_id', v_request_id),
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
    remarks,
    trace_id,
    request_id
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
    p_remarks,
    v_trace_id,
    v_request_id
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
    remarks,
    trace_id,
    request_id
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
    p_remarks,
    v_trace_id,
    v_request_id
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
    'trace_id', v_trace_id,
    'request_id', v_request_id,
    'move', jsonb_build_object(
      'out_transaction', v_out_tx,
      'in_transaction', v_in_tx
    )
  );
end;
$$;

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
  text,
  text,
  text
) to anon, authenticated, service_role;

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
  p_remarks text default null,
  p_trace_id text default null,
  p_request_id text default null
)
returns table (
  transaction_id uuid,
  part_no text,
  warehouse_code text,
  from_location_code text,
  quantity numeric,
  quantity_unit text,
  idempotency_key text,
  trace_id text
)
language plpgsql
set search_path to public
as $$
declare
  v_remaining numeric;
  v_take numeric;
  v_total_available numeric;
  v_key text := nullif(trim(p_idempotency_key), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
  v_trace_id text := nullif(trim(coalesce(p_trace_id, '')), '');
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
      it.idempotency_key,
      it.trace_id
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
      remarks,
      trace_id,
      request_id
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
      p_remarks,
      v_trace_id,
      v_request_id
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
    trace_id := v_trace_id;
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
  text,
  text,
  text
) to anon, authenticated, service_role;

commit;
