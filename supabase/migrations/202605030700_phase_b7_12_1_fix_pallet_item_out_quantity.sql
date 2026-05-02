-- Phase B7-12.1: fix out_pallet_item quantity update
--
-- 方針:
-- - 既に適用済みの B7-12 migration 環境へ out_pallet_item の修正を再適用する
-- - 減算後数量を先に計算し、負数を pallet_item_links.quantity に update しない
-- - idempotency replay は維持する
-- - inventory_transactions / inventory_current / inventory_* は変更しない

begin;

create or replace function public.out_pallet_item(
  p_pallet_code text,
  p_part_no text,
  p_quantity numeric,
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
  v_part_no text;
  v_quantity numeric;
  v_warehouse_code text;
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
  where pallet_code = v_pallet_code;

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

grant execute on function public.out_pallet_item(text, text, numeric, text, text, text, text, text)
  to anon, authenticated, service_role;

commit;
