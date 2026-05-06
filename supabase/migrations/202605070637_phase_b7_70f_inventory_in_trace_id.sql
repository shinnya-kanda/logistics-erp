-- Phase B7-70F: inventory-in trace_id write support
--
-- 方針:
-- - inventory-in の業務単位 trace_id を IN 履歴の inventory_transactions に保存する
-- - 既存14引数相当の呼び出しは p_trace_id text default null で互換維持する
-- - pallet_transactions / warehouse_location_history は変更しない
-- - NOT NULL / index / backfill は追加しない

begin;

alter table public.inventory_transactions
  add column if not exists trace_id text;

drop function if exists public.create_inventory_in(
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
);

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
  p_trace_id text default null
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
  v_trace_id text := nullif(trim(p_trace_id), '');
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
    trace_id
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
    v_trace_id
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

comment on function public.create_inventory_in(
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
  text
) is
  'Phase B7-70F: inventory_transactions に trace_id 付きで IN を1行 INSERTする安全な入庫関数。inventory_current は直接更新しない。';

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
  text
) to anon;

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
  text
) to authenticated;

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
  text
) to service_role;

commit;
