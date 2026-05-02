-- Phase B7-3.1: create_pallet inventory_type support
--
-- 方針:
-- - pallet_units の inventory_type NOT NULL 環境に対応する
-- - inventory_transactions / inventory_current / pallet_item_links は変更しない
-- - 既存 migration は編集しない

begin;

drop function if exists public.create_pallet(text, text, text, text);

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
