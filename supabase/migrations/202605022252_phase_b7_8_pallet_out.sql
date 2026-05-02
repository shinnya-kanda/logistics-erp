-- Phase B7-8: pallet OUT
--
-- 方針:
-- - パレット1枚全体を出庫扱いにする
-- - pallet_units.current_status は現在状態キャッシュとして更新する
-- - inventory_transactions / inventory_current / inventory_* は変更しない

begin;

alter table public.pallet_units
  add column if not exists current_status text not null default 'ACTIVE';

update public.pallet_units
set current_status = 'ACTIVE'
where current_status is null;

alter table public.pallet_units
  alter column current_status set default 'ACTIVE';

alter table public.pallet_units
  alter column current_status set not null;

alter table public.pallet_units
  add column if not exists current_location_code text;

alter table public.pallet_transactions
  add column if not exists pallet_unit_id uuid;

alter table public.pallet_transactions
  add column if not exists pallet_id uuid;

alter table public.pallet_transactions
  add column if not exists pallet_code text;

alter table public.pallet_transactions
  add column if not exists from_location_code text;

alter table public.pallet_transactions
  add column if not exists to_location_code text;

alter table public.pallet_transactions
  add column if not exists warehouse_code text;

alter table public.pallet_transactions
  add column if not exists operator_id text;

alter table public.pallet_transactions
  add column if not exists operator_name text;

alter table public.pallet_transactions
  add column if not exists remarks text;

alter table public.pallet_transactions
  add column if not exists idempotency_key text;

alter table public.pallet_transactions
  add column if not exists occurred_at timestamptz;

update public.pallet_transactions
set pallet_unit_id = pallet_id
where pallet_unit_id is null
  and pallet_id is not null;

update public.pallet_transactions
set pallet_id = pallet_unit_id
where pallet_id is null
  and pallet_unit_id is not null;

update public.pallet_transactions pt
set pallet_code = pu.pallet_code
from public.pallet_units pu
where pt.pallet_code is null
  and pu.id = pt.pallet_unit_id;

update public.pallet_transactions pt
set warehouse_code = pu.warehouse_code
from public.pallet_units pu
where pt.warehouse_code is null
  and pu.id = pt.pallet_unit_id;

update public.pallet_transactions
set occurred_at = coalesce(occurred_at, created_at, now())
where occurred_at is null;

alter table public.pallet_transactions
  alter column occurred_at set default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'pallet_transactions_type_check'
      and conrelid = 'public.pallet_transactions'::regclass
  ) then
    alter table public.pallet_transactions
      drop constraint pallet_transactions_type_check;
  end if;

  alter table public.pallet_transactions
    add constraint pallet_transactions_type_check
    check (transaction_type in ('CREATE', 'MOVE', 'OUT')) not valid;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'pallet_units_current_status_check'
      and conrelid = 'public.pallet_units'::regclass
  ) then
    alter table public.pallet_units
      drop constraint pallet_units_current_status_check;
  end if;

  alter table public.pallet_units
    add constraint pallet_units_current_status_check
    check (current_status in ('ACTIVE', 'OUT')) not valid;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_transactions_pallet_unit_id_fkey'
      and conrelid = 'public.pallet_transactions'::regclass
  ) then
    alter table public.pallet_transactions
      add constraint pallet_transactions_pallet_unit_id_fkey
      foreign key (pallet_unit_id) references public.pallet_units (id);
  end if;
end $$;

create index if not exists idx_pallet_transactions_pallet_unit_id
  on public.pallet_transactions (pallet_unit_id);

create index if not exists idx_pallet_transactions_pallet_code
  on public.pallet_transactions (pallet_code);

create index if not exists idx_pallet_transactions_type
  on public.pallet_transactions (transaction_type);

create index if not exists idx_pallet_transactions_occurred_at
  on public.pallet_transactions (occurred_at);

create unique index if not exists idx_pallet_transactions_idempotency_key
  on public.pallet_transactions (idempotency_key)
  where idempotency_key is not null;

create or replace function public.out_pallet(
  p_pallet_code text,
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
  v_warehouse_code text;
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
  where pallet_code = v_pallet_code;

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

grant execute on function public.out_pallet(text, text, text, text, text, text)
  to anon, authenticated, service_role;

commit;
