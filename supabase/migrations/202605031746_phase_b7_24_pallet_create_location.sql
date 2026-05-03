-- Phase B7-24: inbound pallet create location support
--
-- 方針:
-- - 既存テーブル構造は変更しない
-- - create_pallet を後方互換で拡張し、入庫時の棚番を current_location_code に保存する
-- - PL NO / PJ NO は現場PWAでは自動発行しない

begin;

drop function if exists public.create_pallet(text, text, text, text, text, text);

create or replace function public.create_pallet(
  p_pallet_code text,
  p_warehouse_code text,
  p_created_by text default null,
  p_remarks text default null,
  p_inventory_type text default 'project',
  p_project_no text default null,
  p_current_location_code text default null
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
      'created', false
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

grant execute on function public.create_pallet(text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

commit;
