-- Phase B7-70D: pallets-move trace_id write support
--
-- 方針:
-- - pallets-move の業務単位 trace_id を MOVE 履歴の pallet_transactions に保存する
-- - 既存8引数相当の呼び出しは p_trace_id text default null で互換維持する
-- - inventory_transactions / warehouse_location_history は変更しない
-- - NOT NULL / index / backfill は追加しない

begin;

alter table public.pallet_transactions
  add column if not exists trace_id text;

drop function if exists public.move_pallet(text, text, text, text, text, text, text, text);

create or replace function public.move_pallet(
  p_pallet_code text,
  p_to_location_code text,
  p_warehouse_code text default 'KOMATSU',
  p_operator_id text default null,
  p_operator_name text default null,
  p_remarks text default null,
  p_idempotency_key text default null,
  p_project_no text default null,
  p_trace_id text default null
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
        'trace_id', coalesce(v_transaction.trace_id, v_trace_id)
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
    trace_id
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
    v_trace_id
  )
  returning * into v_transaction;

  return json_build_object(
    'ok', true,
    'transaction', row_to_json(v_transaction),
    'trace_id', v_trace_id
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
          'trace_id', coalesce(v_transaction.trace_id, v_trace_id)
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

grant execute on function public.move_pallet(text, text, text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

commit;
