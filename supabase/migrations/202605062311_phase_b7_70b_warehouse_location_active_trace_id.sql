-- Phase B7-70B: warehouse-location-active-update trace_id write support
--
-- 方針:
-- - warehouse_location_history.trace_id に、業務単位の追跡キーを保存する
-- - p_trace_id text default null により、既存5引数相当の呼び出し互換を維持する
-- - NOT NULL / index / backfill / constraint は追加しない

begin;

alter table public.warehouse_location_history
  add column if not exists trace_id text;

drop function if exists public.update_warehouse_location_active_with_history(
  text,
  text,
  boolean,
  uuid,
  text
);

create or replace function public.update_warehouse_location_active_with_history(
  p_warehouse_code text,
  p_location_code text,
  p_is_active boolean,
  p_operator_id uuid default null,
  p_operator_role text default null,
  p_trace_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
  v_warehouse_code text := nullif(trim(p_warehouse_code), '');
  v_location_code text := nullif(trim(p_location_code), '');
  v_operator_role text := nullif(trim(p_operator_role), '');
  v_trace_id text := nullif(trim(p_trace_id), '');
  v_before public.warehouse_locations%rowtype;
  v_after public.warehouse_locations%rowtype;
begin
  if v_warehouse_code is null then
    return jsonb_build_object('ok', false, 'error', 'warehouse_code is required');
  end if;

  if v_location_code is null then
    return jsonb_build_object('ok', false, 'error', 'location_code is required');
  end if;

  if p_is_active is null then
    return jsonb_build_object('ok', false, 'error', 'is_active must be true or false');
  end if;

  select *
  into v_before
  from public.warehouse_locations
  where warehouse_code = v_warehouse_code
    and location_code = v_location_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'location_not_found');
  end if;

  update public.warehouse_locations
  set
    is_active = p_is_active,
    updated_at = now()
  where warehouse_code = v_warehouse_code
    and location_code = v_location_code
  returning * into v_after;

  insert into public.warehouse_location_history (
    warehouse_code,
    location_code,
    action_type,
    before_data,
    after_data,
    operator_id,
    operator_role,
    trace_id
  )
  values (
    v_warehouse_code,
    v_location_code,
    'UPDATE_ACTIVE',
    to_jsonb(v_before),
    to_jsonb(v_after),
    p_operator_id,
    v_operator_role,
    v_trace_id
  );

  return jsonb_build_object(
    'ok', true,
    'trace_id', v_trace_id,
    'location', jsonb_build_object(
      'id', v_after.id,
      'warehouse_code', v_after.warehouse_code,
      'location_code', v_after.location_code,
      'is_active', v_after.is_active,
      'remarks', v_after.remarks,
      'updated_at', v_after.updated_at
    )
  );
end;
$$;

comment on function public.update_warehouse_location_active_with_history(
  text,
  text,
  boolean,
  uuid,
  text,
  text
) is
  'Phase B7-70B: warehouse_locations.is_active 更新と warehouse_location_history 追加をtrace_id付きで1操作で行う。';

grant execute on function public.update_warehouse_location_active_with_history(
  text,
  text,
  boolean,
  uuid,
  text,
  text
) to anon, authenticated, service_role;

commit;
