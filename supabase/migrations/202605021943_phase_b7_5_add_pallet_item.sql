-- Phase B7-5: add item to pallet
--
-- 方針:
-- - 作成済みパレットに品番・数量を紐付ける
-- - inventory_transactions / inventory_current は変更しない
-- - pallet_units は検索のみで、削除・更新しない

begin;

create or replace function public.add_pallet_item(
  p_pallet_code text,
  p_part_no text,
  p_quantity numeric,
  p_warehouse_code text,
  p_quantity_unit text default 'pcs',
  p_created_by text default null,
  p_remarks text default null
)
returns json
language plpgsql
as $$
declare
  v_pallet_id uuid;
begin
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
    created_by,
    remarks
  )
  values (
    v_pallet_id,
    p_part_no,
    p_quantity,
    coalesce(p_quantity_unit, 'pcs'),
    p_warehouse_code,
    p_created_by,
    p_remarks
  )
  on conflict (pallet_id, part_no)
  do update set
    quantity = public.pallet_item_links.quantity + excluded.quantity,
    quantity_unit = excluded.quantity_unit,
    warehouse_code = excluded.warehouse_code,
    created_by = coalesce(excluded.created_by, public.pallet_item_links.created_by),
    remarks = coalesce(excluded.remarks, public.pallet_item_links.remarks);

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

grant execute on function public.add_pallet_item(text, text, numeric, text, text, text, text)
  to anon, authenticated, service_role;

commit;
