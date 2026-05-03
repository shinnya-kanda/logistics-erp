-- Phase B7-14C: project_no API compatibility for pallet flows
--
-- 方針:
-- - project_no を製番・管理単位として横に追加する
-- - project_no 未指定時は warehouse_code を後方互換の project_no として扱う
-- - pallet_units / pallet_item_links へ project_no を保存する
-- - pallet_transactions.project_no は履歴保護のため今回は保存・更新しない
-- - inventory_transactions / inventory_current / inventory_* は変更しない

begin;

alter table public.pallet_units
  add column if not exists project_no text;

alter table public.pallet_item_links
  add column if not exists project_no text;

alter table public.pallet_transactions
  add column if not exists project_no text;

drop function if exists public.create_pallet(text, text, text, text);
drop function if exists public.create_pallet(text, text, text, text, text);

create or replace function public.create_pallet(
  p_pallet_code text,
  p_warehouse_code text,
  p_created_by text default null,
  p_remarks text default null,
  p_inventory_type text default 'project',
  p_project_no text default null
)
returns json
language plpgsql
as $$
declare
  v_id uuid;
  v_has_pallet_no boolean;
  v_project_no text;
begin
  v_project_no := nullif(trim(coalesce(p_project_no, p_warehouse_code, '')), '');

  select id into v_id
  from public.pallet_units
  where pallet_code = p_pallet_code;

  if v_id is not null then
    return json_build_object(
      'ok', true,
      'pallet_id', v_id,
      'pallet_code', p_pallet_code,
      'created', false
    );
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
      created_by,
      remarks
    )
    values (
      p_pallet_code,
      p_pallet_code,
      p_warehouse_code,
      v_project_no,
      coalesce(p_inventory_type, 'project'),
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
      created_by,
      remarks
    )
    values (
      p_pallet_code,
      p_warehouse_code,
      v_project_no,
      coalesce(p_inventory_type, 'project'),
      p_created_by,
      p_remarks
    )
    returning id into v_id;
  end if;

  return json_build_object(
    'ok', true,
    'pallet_id', v_id,
    'pallet_code', p_pallet_code,
    'created', true
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
        'created', false
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

grant execute on function public.create_pallet(text, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.add_pallet_item(text, text, numeric, text, text, text, text);

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
language plpgsql
as $$
declare
  v_pallet_id uuid;
  v_project_no text;
begin
  v_project_no := nullif(trim(coalesce(p_project_no, p_warehouse_code, '')), '');

  if p_quantity is null or p_quantity <= 0 then
    return json_build_object(
      'ok', false,
      'error', 'quantity_must_be_positive'
    );
  end if;

  select id into v_pallet_id
  from public.pallet_units
  where pallet_code = p_pallet_code;

  if v_pallet_id is null then
    return json_build_object(
      'ok', false,
      'error', 'pallet_not_found'
    );
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

  return json_build_object(
    'ok', true,
    'pallet_code', p_pallet_code,
    'part_no', p_part_no,
    'quantity_added', p_quantity
  );

exception
  when others then
    return json_build_object(
      'ok', false,
      'error', sqlerrm
    );
end;
$$;

grant execute on function public.add_pallet_item(text, text, numeric, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.out_pallet_item(text, text, numeric, text, text, text, text, text);

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
language plpgsql
as $$
declare
  v_pallet_code text;
  v_part_no text;
  v_quantity numeric;
  v_warehouse_code text;
  v_project_no text;
  v_idempotency_key text;
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
      'idempotency_hit', true
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
    occurred_at
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
    now()
  )
  returning * into v_transaction;

  return json_build_object(
    'ok', true,
    'transaction', row_to_json(v_transaction),
    'part_no', v_part_no,
    'quantity_out', v_quantity,
    'remaining_quantity', v_remaining_quantity,
    'idempotency_hit', false
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
        'idempotency_hit', true
      );
    end if;

    return json_build_object('ok', false, 'error', sqlerrm);
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.out_pallet_item(text, text, numeric, text, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.move_pallet(text, text, text, text, text, text, text);

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
language plpgsql
as $$
declare
  v_pallet_code text;
  v_to_location_code text;
  v_warehouse_code text;
  v_project_no text;
  v_idempotency_key text;
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
        'transaction', row_to_json(v_transaction)
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
    occurred_at
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
    now()
  )
  returning * into v_transaction;

  return json_build_object(
    'ok', true,
    'transaction', row_to_json(v_transaction)
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
          'transaction', row_to_json(v_transaction)
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

grant execute on function public.move_pallet(text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.out_pallet(text, text, text, text, text, text);

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
language plpgsql
as $$
declare
  v_pallet_code text;
  v_warehouse_code text;
  v_project_no text;
  v_idempotency_key text;
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
      'transaction', row_to_json(v_transaction)
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
        'transaction', row_to_json(v_transaction)
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
    occurred_at
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
    now()
  )
  returning * into v_transaction;

  return json_build_object(
    'ok', true,
    'transaction', row_to_json(v_transaction)
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
        'transaction', row_to_json(v_transaction)
      );
    end if;

    return json_build_object('ok', false, 'error', sqlerrm);
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.out_pallet(text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

drop function if exists public.get_empty_pallets(text);

create or replace function public.get_empty_pallets(
  p_warehouse_code text default 'KOMATSU',
  p_project_no text default null
)
returns table (
  pallet_id uuid,
  pallet_code text,
  warehouse_code text,
  current_location_code text,
  current_status text,
  updated_at timestamptz
)
language sql
as $$
  select
    p.id as pallet_id,
    p.pallet_code,
    p.warehouse_code,
    p.current_location_code,
    p.current_status,
    p.updated_at
  from public.pallet_units p
  left join public.pallet_item_links l
    on l.pallet_id = p.id
    and l.unlinked_at is null
  where p.current_status = 'ACTIVE'
    and (
      (nullif(trim(coalesce(p_project_no, '')), '') is not null
        and coalesce(p.project_no, p.warehouse_code) = trim(p_project_no))
      or
      (nullif(trim(coalesce(p_project_no, '')), '') is null
        and p.warehouse_code = trim(coalesce(p_warehouse_code, 'KOMATSU')))
    )
  group by
    p.id,
    p.pallet_code,
    p.warehouse_code,
    p.current_location_code,
    p.current_status,
    p.updated_at
  having count(l.id) = 0
  order by
    p.current_location_code asc nulls last,
    p.pallet_code asc;
$$;

grant execute on function public.get_empty_pallets(text, text)
  to anon, authenticated, service_role;

commit;
