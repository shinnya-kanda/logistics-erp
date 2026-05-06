-- Phase B7-70C: pallet-create trace_id write support
--
-- 方針:
-- - pallet-create の業務単位 trace_id を pallet_transactions に保存する
-- - 既存7引数相当の呼び出しは p_trace_id text default null で互換維持する
-- - inventory_transactions / warehouse_location_history は変更しない
-- - NOT NULL / index / backfill は追加しない

begin;

alter table public.pallet_transactions
  add column if not exists trace_id text;

drop function if exists public.create_pallet(text, text, text, text, text, text);

drop function if exists public.create_pallet(text, text, text, text, text, text, text);

create or replace function public.create_pallet(
  p_pallet_code text,
  p_warehouse_code text,
  p_created_by text default null,
  p_remarks text default null,
  p_inventory_type text default 'project',
  p_project_no text default null,
  p_current_location_code text default null,
  p_trace_id text default null
)
returns json
language plpgsql
as $$
declare
  v_id uuid;
  v_has_pallet_no boolean;
  v_project_no text;
  v_current_location_code text;
  v_occupied_pallet_code text;
  v_trace_id text := nullif(trim(p_trace_id), '');
begin
  v_project_no := nullif(trim(coalesce(p_project_no, p_warehouse_code, '')), '');
  v_current_location_code := nullif(upper(trim(coalesce(p_current_location_code, ''))), '');

  select id into v_id
  from public.pallet_units
  where pallet_code = p_pallet_code;

  if v_id is not null then
    return json_build_object(
      'ok', true,
      'pallet_id', v_id,
      'pallet_code', p_pallet_code,
      'created', false,
      'trace_id', v_trace_id
    );
  end if;

  if v_current_location_code is not null then
    select pallet_code
    into v_occupied_pallet_code
    from public.pallet_units
    where warehouse_code = p_warehouse_code
      and current_location_code = v_current_location_code
      and coalesce(current_status, 'ACTIVE') = 'ACTIVE'
    limit 1;

    if v_occupied_pallet_code is not null then
      return json_build_object(
        'ok', false,
        'error', 'location_already_occupied',
        'occupied_pallet_code', v_occupied_pallet_code
      );
    end if;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_units'
      and column_name = 'pallet_no'
  ) into v_has_pallet_no;

  if v_has_pallet_no then
    insert into public.pallet_units (
      pallet_no,
      pallet_code,
      warehouse_code,
      project_no,
      inventory_type,
      current_location_code,
      created_by,
      remarks
    )
    values (
      p_pallet_code,
      p_pallet_code,
      p_warehouse_code,
      v_project_no,
      coalesce(p_inventory_type, 'project'),
      v_current_location_code,
      p_created_by,
      p_remarks
    )
    returning id into v_id;
  else
    insert into public.pallet_units (
      pallet_code,
      warehouse_code,
      project_no,
      inventory_type,
      current_location_code,
      created_by,
      remarks
    )
    values (
      p_pallet_code,
      p_warehouse_code,
      v_project_no,
      coalesce(p_inventory_type, 'project'),
      v_current_location_code,
      p_created_by,
      p_remarks
    )
    returning id into v_id;
  end if;

  insert into public.pallet_transactions (
    pallet_unit_id,
    pallet_id,
    pallet_code,
    transaction_type,
    from_location_code,
    to_location_code,
    warehouse_code,
    operator_id,
    remarks,
    occurred_at,
    trace_id
  )
  values (
    v_id,
    v_id,
    p_pallet_code,
    'CREATE',
    null,
    v_current_location_code,
    p_warehouse_code,
    p_created_by,
    p_remarks,
    now(),
    v_trace_id
  );

  return json_build_object(
    'ok', true,
    'pallet_id', v_id,
    'pallet_code', p_pallet_code,
    'created', true,
    'trace_id', v_trace_id
  );

exception
  when unique_violation then
    select id into v_id
    from public.pallet_units
    where pallet_code = p_pallet_code;

    if v_id is not null then
      return json_build_object(
        'ok', true,
        'pallet_id', v_id,
        'pallet_code', p_pallet_code,
        'created', false,
        'trace_id', v_trace_id
      );
    end if;

    return json_build_object('ok', false, 'error', 'pallet_code_already_exists');
  when others then
    return json_build_object(
      'ok', false,
      'error', sqlerrm
    );
end;
$$;

-- 後方互換: 既存の6引数呼び出しは棚番なしで8引数版へ委譲する
create or replace function public.create_pallet(
  p_pallet_code text,
  p_warehouse_code text,
  p_created_by text default null,
  p_remarks text default null,
  p_inventory_type text default 'project',
  p_project_no text default null
)
returns json
language sql
as $$
  select public.create_pallet(
    p_pallet_code,
    p_warehouse_code,
    p_created_by,
    p_remarks,
    p_inventory_type,
    p_project_no,
    null::text,
    null::text
  );
$$;

grant execute on function public.create_pallet(text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

grant execute on function public.create_pallet(text, text, text, text, text, text)
  to anon, authenticated, service_role;

commit;
