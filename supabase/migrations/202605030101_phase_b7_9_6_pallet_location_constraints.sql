-- Phase B7-9-6: pallet code and active location constraints
--
-- 方針:
-- - PLコードは重複させない
-- - ACTIVEパレットは同一 warehouse_code + current_location_code に1つだけ配置できる
-- - OUT済みパレットは棚番占有対象外
-- - inventory_transactions / inventory_current / inventory_* は変更しない
--
-- 既存データにACTIVE棚番重複がある場合、partial unique index 作成は失敗します。
-- その場合は以下で重複を確認し、手動整理してから再実行してください。
--
-- select warehouse_code, current_location_code, count(*)
-- from public.pallet_units
-- where current_status = 'ACTIVE'
--   and current_location_code is not null
-- group by warehouse_code, current_location_code
-- having count(*) > 1;

begin;

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'pallet_units'
      and i.indisunique
      and i.indpred is null
      and array(
        select a.attname
        from unnest(i.indkey) with ordinality as k(attnum, ord)
        join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
        order by k.ord
      ) = array['pallet_code']
  ) then
    create unique index ux_pallet_units_pallet_code
      on public.pallet_units (pallet_code);
  end if;
end $$;

create unique index if not exists ux_active_pallet_location
  on public.pallet_units (warehouse_code, current_location_code)
  where current_status = 'ACTIVE'
    and current_location_code is not null;

create or replace function public.move_pallet(
  p_pallet_code text,
  p_to_location_code text,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null
)
returns json
language plpgsql
as $$
declare
  v_pallet_code text;
  v_to_location_code text;
  v_warehouse_code text;
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
  where pallet_code = v_pallet_code;

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

grant execute on function public.move_pallet(text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

create or replace function public.create_pallet(
  p_pallet_code text,
  p_warehouse_code text,
  p_created_by text default null,
  p_remarks text default null,
  p_inventory_type text default 'project'
)
returns json
language plpgsql
as $$
declare
  v_id uuid;
  v_has_pallet_no boolean;
begin
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
      inventory_type,
      created_by,
      remarks
    )
    values (
      p_pallet_code,
      p_pallet_code,
      p_warehouse_code,
      coalesce(p_inventory_type, 'project'),
      p_created_by,
      p_remarks
    )
    returning id into v_id;
  else
    insert into public.pallet_units (
      pallet_code,
      warehouse_code,
      inventory_type,
      created_by,
      remarks
    )
    values (
      p_pallet_code,
      p_warehouse_code,
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

grant execute on function public.create_pallet(text, text, text, text, text)
  to anon, authenticated, service_role;

commit;
