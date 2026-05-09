-- Phase B9-02: minimal trace_id / request_id write propagation for pallet transactions
--
-- 方針:
-- - pallet_transactions は pallet domain の source of truth として維持する
-- - trace_id は業務操作単位、request_id は HTTP request 単位の観測IDとして保存する
-- - 現段階では Edge Function 側で trace_id と request_id が同値でも許容する
-- - nullable / no backfill / no mandatory trace_id を維持する
-- - parent_trace_id / replay / rebuild / queue / workflow engine は導入しない

begin;

alter table public.pallet_transactions
  add column if not exists trace_id text,
  add column if not exists request_id text;

create index if not exists idx_pallet_transactions_trace_id
  on public.pallet_transactions (trace_id);

create index if not exists idx_pallet_transactions_request_id
  on public.pallet_transactions (request_id);

alter table public.pallet_transactions
  drop constraint if exists pallet_transactions_type_check;

alter table public.pallet_transactions
  add constraint pallet_transactions_type_check
  check (transaction_type in ('CREATE', 'MOVE', 'OUT', 'ITEM_ADD', 'ITEM_OUT')) not valid;

drop function if exists public.create_pallet(text, text, text, text, text, text);
drop function if exists public.create_pallet(text, text, text, text, text, text, text);
drop function if exists public.create_pallet(text, text, text, text, text, text, text, text);

create or replace function public.create_pallet(
  p_pallet_code text,
  p_warehouse_code text,
  p_created_by text default null,
  p_remarks text default null,
  p_inventory_type text default 'project',
  p_project_no text default null,
  p_current_location_code text default null,
  p_trace_id text default null,
  p_request_id text default null
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
  v_trace_id text := nullif(trim(coalesce(p_trace_id, '')), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
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
      'trace_id', v_trace_id,
      'request_id', v_request_id
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
    trace_id,
    request_id
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
    v_trace_id,
    v_request_id
  );

  return json_build_object(
    'ok', true,
    'pallet_id', v_id,
    'pallet_code', p_pallet_code,
    'created', true,
    'trace_id', v_trace_id,
    'request_id', v_request_id
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
        'trace_id', v_trace_id,
        'request_id', v_request_id
      );
    end if;

    return json_build_object('ok', false, 'error', 'pallet_code_already_exists');
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.create_pallet(text, text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

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
    null::text,
    null::text
  );
$$;

grant execute on function public.create_pallet(text, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.add_pallet_item(text, text, numeric, text, text, text, text);
drop function if exists public.add_pallet_item(text, text, numeric, text, text, text, text, text);

create or replace function public.add_pallet_item(
  p_pallet_code text,
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text,
  p_quantity_unit text default 'pcs',
  p_created_by text default null,
  p_remarks text default null,
  p_project_no text default null,
  p_trace_id text default null,
  p_request_id text default null
)
returns json
language plpgsql
as $$
declare
  v_pallet_id uuid;
  v_project_no text;
  v_current_location_code text;
  v_trace_id text := nullif(trim(coalesce(p_trace_id, '')), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
begin
  v_project_no := nullif(trim(coalesce(p_project_no, p_warehouse_code, '')), '');

  if p_quantity is null or p_quantity <= 0 then
    return json_build_object('ok', false, 'error', 'quantity_must_be_positive');
  end if;

  select id, current_location_code
  into v_pallet_id, v_current_location_code
  from public.pallet_units
  where pallet_code = p_pallet_code;

  if v_pallet_id is null then
    return json_build_object('ok', false, 'error', 'pallet_not_found');
  end if;

  insert into public.pallet_item_links (
    pallet_id,
    part_no,
    quantity,
    quantity_unit,
    warehouse_code,
    project_no,
    created_by,
    remarks,
    unlinked_at,
    updated_at
  )
  values (
    v_pallet_id,
    p_part_no,
    p_quantity,
    coalesce(p_quantity_unit, 'pcs'),
    p_warehouse_code,
    v_project_no,
    p_created_by,
    p_remarks,
    null,
    now()
  )
  on conflict (pallet_id, part_no)
  do update set
    quantity = public.pallet_item_links.quantity + excluded.quantity,
    quantity_unit = excluded.quantity_unit,
    warehouse_code = excluded.warehouse_code,
    project_no = excluded.project_no,
    created_by = coalesce(excluded.created_by, public.pallet_item_links.created_by),
    remarks = coalesce(excluded.remarks, public.pallet_item_links.remarks),
    unlinked_at = null,
    updated_at = now();

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
    trace_id,
    request_id
  )
  values (
    v_pallet_id,
    v_pallet_id,
    p_pallet_code,
    'ITEM_ADD',
    v_current_location_code,
    v_current_location_code,
    p_warehouse_code,
    p_created_by,
    concat_ws(
      ' / ',
      nullif(trim(coalesce(p_remarks, '')), ''),
      'part_no=' || p_part_no,
      'quantity_added=' || p_quantity::text
    ),
    now(),
    v_trace_id,
    v_request_id
  );

  return json_build_object(
    'ok', true,
    'pallet_code', p_pallet_code,
    'part_no', p_part_no,
    'quantity_added', p_quantity,
    'trace_id', v_trace_id,
    'request_id', v_request_id
  );

exception
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.add_pallet_item(text, text, numeric, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

create or replace function public.add_pallet_item(
  p_pallet_code text,
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text,
  p_quantity_unit text default 'pcs',
  p_created_by text default null,
  p_remarks text default null,
  p_project_no text default null
)
returns json
language sql
as $$
  select public.add_pallet_item(
    p_pallet_code,
    p_part_no,
    p_quantity,
    p_warehouse_code,
    p_quantity_unit,
    p_created_by,
    p_remarks,
    p_project_no,
    null::text,
    null::text
  );
$$;

grant execute on function public.add_pallet_item(text, text, numeric, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.move_pallet(text, text, text, text, text, text, text, text);
drop function if exists public.move_pallet(text, text, text, text, text, text, text, text, text);

create or replace function public.move_pallet(
  p_pallet_code text,
  p_to_location_code text,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null,
  p_project_no text default null,
  p_trace_id text default null,
  p_request_id text default null
)
returns json
language plpgsql
as $$
declare
  v_pallet_code text;
  v_to_location_code text;
  v_warehouse_code text;
  v_project_no text;
  v_idempotency_key text;
  v_trace_id text;
  v_request_id text;
  v_pallet_unit_id uuid;
  v_from_location_code text;
  v_current_status text;
  v_occupied_pallet_code text;
  v_transaction public.pallet_transactions%rowtype;
begin
  v_pallet_code := upper(
    regexp_replace(
      translate(
        trim(coalesce(p_pallet_code, '')),
        '＊ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９　',
        '*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
      ),
      '[*[:space:]]+',
      '',
      'g'
    )
  );
  v_to_location_code := upper(
    regexp_replace(
      translate(
        trim(coalesce(p_to_location_code, '')),
        '＊ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９　',
        '*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
      ),
      '[*[:space:]]+',
      '',
      'g'
    )
  );
  v_warehouse_code := trim(coalesce(p_warehouse_code, 'KOMATSU'));
  v_project_no := nullif(trim(coalesce(p_project_no, v_warehouse_code, '')), '');
  v_idempotency_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_trace_id := nullif(trim(coalesce(p_trace_id, '')), '');
  v_request_id := nullif(trim(coalesce(p_request_id, '')), '');

  if v_pallet_code = '' then
    return json_build_object('ok', false, 'error', 'pallet_code_required');
  end if;

  if v_to_location_code = '' then
    return json_build_object('ok', false, 'error', 'to_location_code_required');
  end if;

  if v_warehouse_code = '' then
    return json_build_object('ok', false, 'error', 'warehouse_code_required');
  end if;

  select id, current_location_code, coalesce(current_status, 'ACTIVE')
  into v_pallet_unit_id, v_from_location_code, v_current_status
  from public.pallet_units
  where pallet_code = v_pallet_code
    and coalesce(project_no, warehouse_code) = v_project_no;

  if v_pallet_unit_id is null then
    return json_build_object('ok', false, 'error', 'pallet_not_found');
  end if;

  if v_current_status = 'OUT' then
    return json_build_object('ok', false, 'error', 'pallet_already_out');
  end if;

  if v_idempotency_key is not null then
    select *
    into v_transaction
    from public.pallet_transactions
    where idempotency_key = v_idempotency_key;

    if found then
      return json_build_object(
        'ok', true,
        'transaction', row_to_json(v_transaction),
        'trace_id', coalesce(v_transaction.trace_id, v_trace_id),
        'request_id', coalesce(v_transaction.request_id, v_request_id)
      );
    end if;
  end if;

  select pallet_code
  into v_occupied_pallet_code
  from public.pallet_units
  where warehouse_code = v_warehouse_code
    and current_location_code = v_to_location_code
    and coalesce(current_status, 'ACTIVE') = 'ACTIVE'
    and id <> v_pallet_unit_id
  limit 1;

  if v_occupied_pallet_code is not null then
    return json_build_object(
      'ok', false,
      'error', 'location_already_occupied',
      'occupied_pallet_code', v_occupied_pallet_code
    );
  end if;

  update public.pallet_units
  set current_location_code = v_to_location_code
  where id = v_pallet_unit_id;

  insert into public.pallet_transactions (
    pallet_unit_id,
    pallet_id,
    pallet_code,
    transaction_type,
    from_location_code,
    to_location_code,
    warehouse_code,
    operator_id,
    operator_name,
    remarks,
    idempotency_key,
    occurred_at,
    trace_id,
    request_id
  )
  values (
    v_pallet_unit_id,
    v_pallet_unit_id,
    v_pallet_code,
    'MOVE',
    v_from_location_code,
    v_to_location_code,
    v_warehouse_code,
    nullif(trim(coalesce(p_operator_id, '')), ''),
    nullif(trim(coalesce(p_operator_name, '')), ''),
    nullif(trim(coalesce(p_remarks, '')), ''),
    v_idempotency_key,
    now(),
    v_trace_id,
    v_request_id
  )
  returning * into v_transaction;

  return json_build_object(
    'ok', true,
    'transaction', row_to_json(v_transaction),
    'trace_id', v_trace_id,
    'request_id', v_request_id
  );

exception
  when unique_violation then
    if v_idempotency_key is not null then
      select *
      into v_transaction
      from public.pallet_transactions
      where idempotency_key = v_idempotency_key;

      if found then
        return json_build_object(
          'ok', true,
          'transaction', row_to_json(v_transaction),
          'trace_id', coalesce(v_transaction.trace_id, v_trace_id),
          'request_id', coalesce(v_transaction.request_id, v_request_id)
        );
      end if;
    end if;

    if sqlerrm like '%ux_active_pallet_location%' then
      return json_build_object('ok', false, 'error', 'location_already_occupied');
    end if;

    return json_build_object('ok', false, 'error', sqlerrm);
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.move_pallet(text, text, text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

create or replace function public.move_pallet(
  p_pallet_code text,
  p_to_location_code text,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null,
  p_project_no text default null
)
returns json
language sql
as $$
  select public.move_pallet(
    p_pallet_code,
    p_to_location_code,
    p_warehouse_code,
    p_operator_id,
    p_operator_name,
    p_remarks,
    p_idempotency_key,
    p_project_no,
    null::text,
    null::text
  );
$$;

grant execute on function public.move_pallet(text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.out_pallet(text, text, text, text, text, text, text);
drop function if exists public.out_pallet(text, text, text, text, text, text, text, text);

create or replace function public.out_pallet(
  p_pallet_code text,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null,
  p_project_no text default null,
  p_trace_id text default null,
  p_request_id text default null
)
returns json
language plpgsql
as $$
declare
  v_pallet_code text;
  v_warehouse_code text;
  v_project_no text;
  v_idempotency_key text;
  v_trace_id text;
  v_request_id text;
  v_pallet_unit_id uuid;
  v_from_location_code text;
  v_current_status text;
  v_transaction public.pallet_transactions%rowtype;
begin
  v_pallet_code := upper(
    regexp_replace(
      translate(
        trim(coalesce(p_pallet_code, '')),
        '＊ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９　',
        '*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
      ),
      '[*[:space:]]+',
      '',
      'g'
    )
  );
  v_warehouse_code := trim(coalesce(p_warehouse_code, 'KOMATSU'));
  v_project_no := nullif(trim(coalesce(p_project_no, v_warehouse_code, '')), '');
  v_idempotency_key := coalesce(
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    'pallet-out:' || gen_random_uuid()::text
  );
  v_trace_id := nullif(trim(coalesce(p_trace_id, '')), '');
  v_request_id := nullif(trim(coalesce(p_request_id, '')), '');

  if v_pallet_code = '' then
    return json_build_object('ok', false, 'error', 'pallet_code_required');
  end if;

  if v_warehouse_code = '' then
    return json_build_object('ok', false, 'error', 'warehouse_code_required');
  end if;

  select *
  into v_transaction
  from public.pallet_transactions
  where idempotency_key = v_idempotency_key
    and transaction_type = 'OUT';

  if found then
    return json_build_object(
      'ok', true,
      'transaction', row_to_json(v_transaction),
      'trace_id', coalesce(v_transaction.trace_id, v_trace_id),
      'request_id', coalesce(v_transaction.request_id, v_request_id)
    );
  end if;

  select id, current_location_code, current_status
  into v_pallet_unit_id, v_from_location_code, v_current_status
  from public.pallet_units
  where pallet_code = v_pallet_code
    and coalesce(project_no, warehouse_code) = v_project_no;

  if v_pallet_unit_id is null then
    return json_build_object('ok', false, 'error', 'pallet_not_found');
  end if;

  if v_current_status = 'OUT' then
    select *
    into v_transaction
    from public.pallet_transactions
    where idempotency_key = v_idempotency_key
      and pallet_unit_id = v_pallet_unit_id
      and transaction_type = 'OUT';

    if found then
      return json_build_object(
        'ok', true,
        'transaction', row_to_json(v_transaction),
        'trace_id', coalesce(v_transaction.trace_id, v_trace_id),
        'request_id', coalesce(v_transaction.request_id, v_request_id)
      );
    end if;

    return json_build_object('ok', false, 'error', 'pallet_already_out');
  end if;

  update public.pallet_units
  set current_status = 'OUT',
      current_location_code = null
  where id = v_pallet_unit_id;

  insert into public.pallet_transactions (
    pallet_unit_id,
    pallet_id,
    pallet_code,
    transaction_type,
    from_location_code,
    to_location_code,
    warehouse_code,
    operator_id,
    operator_name,
    remarks,
    idempotency_key,
    occurred_at,
    trace_id,
    request_id
  )
  values (
    v_pallet_unit_id,
    v_pallet_unit_id,
    v_pallet_code,
    'OUT',
    v_from_location_code,
    null,
    v_warehouse_code,
    nullif(trim(coalesce(p_operator_id, '')), ''),
    nullif(trim(coalesce(p_operator_name, '')), ''),
    nullif(trim(coalesce(p_remarks, '')), ''),
    v_idempotency_key,
    now(),
    v_trace_id,
    v_request_id
  )
  returning * into v_transaction;

  return json_build_object(
    'ok', true,
    'transaction', row_to_json(v_transaction),
    'trace_id', v_trace_id,
    'request_id', v_request_id
  );

exception
  when unique_violation then
    select *
    into v_transaction
    from public.pallet_transactions
    where idempotency_key = v_idempotency_key
      and transaction_type = 'OUT';

    if found then
      return json_build_object(
        'ok', true,
        'transaction', row_to_json(v_transaction),
        'trace_id', coalesce(v_transaction.trace_id, v_trace_id),
        'request_id', coalesce(v_transaction.request_id, v_request_id)
      );
    end if;

    return json_build_object('ok', false, 'error', sqlerrm);
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.out_pallet(text, text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

create or replace function public.out_pallet(
  p_pallet_code text,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null,
  p_project_no text default null
)
returns json
language sql
as $$
  select public.out_pallet(
    p_pallet_code,
    p_warehouse_code,
    p_operator_id,
    p_operator_name,
    p_remarks,
    p_idempotency_key,
    p_project_no,
    null::text,
    null::text
  );
$$;

grant execute on function public.out_pallet(text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.out_pallet_item(text, text, numeric, text, text, text, text, text);
drop function if exists public.out_pallet_item(text, text, numeric, text, text, text, text, text, text);

create or replace function public.out_pallet_item(
  p_pallet_code text,
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null,
  p_project_no text default null,
  p_trace_id text default null,
  p_request_id text default null
)
returns json
language plpgsql
as $$
declare
  v_pallet_code text;
  v_part_no text;
  v_quantity numeric;
  v_warehouse_code text;
  v_project_no text;
  v_idempotency_key text;
  v_trace_id text;
  v_request_id text;
  v_pallet_unit_id uuid;
  v_current_location_code text;
  v_current_status text;
  v_link_id uuid;
  v_link_quantity numeric;
  v_remaining_quantity numeric;
  v_transaction public.pallet_transactions%rowtype;
begin
  v_pallet_code := upper(
    regexp_replace(
      translate(
        trim(coalesce(p_pallet_code, '')),
        '＊ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９　',
        '*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
      ),
      '[*[:space:]]+',
      '',
      'g'
    )
  );
  v_part_no := upper(
    regexp_replace(
      translate(
        trim(coalesce(p_part_no, '')),
        '＊ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９　',
        '*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
      ),
      '[*[:space:].]+',
      '',
      'g'
    )
  );
  v_quantity := p_quantity;
  v_warehouse_code := trim(coalesce(p_warehouse_code, 'KOMATSU'));
  v_project_no := nullif(trim(coalesce(p_project_no, v_warehouse_code, '')), '');
  v_idempotency_key := coalesce(
    nullif(trim(coalesce(p_idempotency_key, '')), ''),
    'pallet-item-out:' || gen_random_uuid()::text
  );
  v_trace_id := nullif(trim(coalesce(p_trace_id, '')), '');
  v_request_id := nullif(trim(coalesce(p_request_id, '')), '');

  if v_pallet_code = '' then
    return json_build_object('ok', false, 'error', 'pallet_code_required');
  end if;

  if v_part_no = '' then
    return json_build_object('ok', false, 'error', 'part_no_required');
  end if;

  if v_quantity is null or v_quantity <= 0 then
    return json_build_object('ok', false, 'error', 'quantity_must_be_positive');
  end if;

  if v_warehouse_code = '' then
    return json_build_object('ok', false, 'error', 'warehouse_code_required');
  end if;

  select *
  into v_transaction
  from public.pallet_transactions
  where idempotency_key = v_idempotency_key
    and transaction_type = 'ITEM_OUT';

  if found then
    return json_build_object(
      'ok', true,
      'transaction', row_to_json(v_transaction),
      'part_no', v_part_no,
      'idempotency_hit', true,
      'trace_id', coalesce(v_transaction.trace_id, v_trace_id),
      'request_id', coalesce(v_transaction.request_id, v_request_id)
    );
  end if;

  select id, current_location_code, coalesce(current_status, 'ACTIVE')
  into v_pallet_unit_id, v_current_location_code, v_current_status
  from public.pallet_units
  where pallet_code = v_pallet_code
    and coalesce(project_no, warehouse_code) = v_project_no;

  if v_pallet_unit_id is null then
    return json_build_object('ok', false, 'error', 'pallet_not_found');
  end if;

  if v_current_status = 'OUT' then
    return json_build_object('ok', false, 'error', 'pallet_already_out');
  end if;

  select id, quantity
  into v_link_id, v_link_quantity
  from public.pallet_item_links
  where pallet_id = v_pallet_unit_id
    and part_no = v_part_no
    and coalesce(project_no, warehouse_code) = v_project_no
    and unlinked_at is null
  for update;

  if v_link_id is null then
    return json_build_object('ok', false, 'error', 'pallet_item_not_found');
  end if;

  v_remaining_quantity := v_link_quantity - v_quantity;

  if v_remaining_quantity < 0 then
    raise exception 'insufficient_pallet_item_quantity';
  elsif v_remaining_quantity = 0 then
    update public.pallet_item_links
    set quantity = 0,
        unlinked_at = now(),
        updated_at = now()
    where id = v_link_id;
  else
    update public.pallet_item_links
    set quantity = v_remaining_quantity,
        updated_at = now()
    where id = v_link_id;
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
    operator_name,
    remarks,
    idempotency_key,
    occurred_at,
    trace_id,
    request_id
  )
  values (
    v_pallet_unit_id,
    v_pallet_unit_id,
    v_pallet_code,
    'ITEM_OUT',
    v_current_location_code,
    null,
    v_warehouse_code,
    nullif(trim(coalesce(p_operator_id, '')), ''),
    nullif(trim(coalesce(p_operator_name, '')), ''),
    concat_ws(
      ' / ',
      nullif(trim(coalesce(p_remarks, '')), ''),
      'part_no=' || v_part_no,
      'quantity_out=' || v_quantity::text,
      'remaining_quantity=' || v_remaining_quantity::text
    ),
    v_idempotency_key,
    now(),
    v_trace_id,
    v_request_id
  )
  returning * into v_transaction;

  return json_build_object(
    'ok', true,
    'transaction', row_to_json(v_transaction),
    'part_no', v_part_no,
    'quantity_out', v_quantity,
    'remaining_quantity', v_remaining_quantity,
    'idempotency_hit', false,
    'trace_id', v_trace_id,
    'request_id', v_request_id
  );

exception
  when unique_violation then
    select *
    into v_transaction
    from public.pallet_transactions
    where idempotency_key = v_idempotency_key
      and transaction_type = 'ITEM_OUT';

    if found then
      return json_build_object(
        'ok', true,
        'transaction', row_to_json(v_transaction),
        'part_no', v_part_no,
        'idempotency_hit', true,
        'trace_id', coalesce(v_transaction.trace_id, v_trace_id),
        'request_id', coalesce(v_transaction.request_id, v_request_id)
      );
    end if;

    return json_build_object('ok', false, 'error', sqlerrm);
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.out_pallet_item(text, text, numeric, text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

create or replace function public.out_pallet_item(
  p_pallet_code text,
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null,
  p_project_no text default null
)
returns json
language sql
as $$
  select public.out_pallet_item(
    p_pallet_code,
    p_part_no,
    p_quantity,
    p_warehouse_code,
    p_operator_id,
    p_operator_name,
    p_remarks,
    p_idempotency_key,
    p_project_no,
    null::text,
    null::text
  );
$$;

grant execute on function public.out_pallet_item(text, text, numeric, text, text, text, text, text, text)
  to anon, authenticated, service_role;

commit;
