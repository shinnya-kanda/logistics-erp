-- Phase B7-7: pallet move
--
-- 方針:
-- - パレット単位の移動履歴を pallet_transactions に残す
-- - pallet_units.current_location_code は現在地キャッシュとして更新する
-- - inventory_transactions / inventory_current / inventory_* は変更しない

begin;

alter table public.pallet_units
  add column if not exists current_location_code text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_units'
      and column_name = 'location_code'
  ) then
    update public.pallet_units
    set current_location_code = location_code
    where current_location_code is null
      and location_code is not null;
  end if;
end $$;

create table if not exists public.pallet_transactions (
  id uuid primary key default gen_random_uuid(),
  pallet_unit_id uuid not null references public.pallet_units (id),
  pallet_id uuid references public.pallet_units (id),
  pallet_code text not null,
  transaction_type text not null,
  from_location_code text,
  to_location_code text,
  warehouse_code text not null,
  operator_id text,
  operator_name text,
  remarks text,
  idempotency_key text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_transactions'
      and column_name = 'pallet_unit_id'
  ) then
    update public.pallet_transactions
    set pallet_id = pallet_unit_id
    where pallet_id is null
      and pallet_unit_id is not null;
  end if;
end $$;

update public.pallet_transactions
set pallet_unit_id = pallet_id
where pallet_unit_id is null
  and pallet_id is not null;

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

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_transactions'
      and column_name = 'event_at'
  ) then
    update public.pallet_transactions
    set occurred_at = coalesce(occurred_at, event_at, created_at, now())
    where occurred_at is null;
  else
    update public.pallet_transactions
    set occurred_at = coalesce(occurred_at, created_at, now())
    where occurred_at is null;
  end if;
end $$;

alter table public.pallet_transactions
  alter column occurred_at set default now();

do $$
declare
  missing_count bigint;
begin
  select count(*)
  into missing_count
  from public.pallet_transactions
  where pallet_unit_id is null
     or pallet_code is null
     or warehouse_code is null
     or occurred_at is null;

  if missing_count > 0 then
    raise exception
      'Phase B7-7 stopped: public.pallet_transactions has % row(s) missing pallet_unit_id, pallet_code, warehouse_code, or occurred_at.',
      missing_count;
  end if;

  alter table public.pallet_transactions
    alter column pallet_unit_id set not null;

  alter table public.pallet_transactions
    alter column pallet_code set not null;

  alter table public.pallet_transactions
    alter column warehouse_code set not null;

  alter table public.pallet_transactions
    alter column occurred_at set not null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_transactions_type_check'
      and conrelid = 'public.pallet_transactions'::regclass
  ) then
    alter table public.pallet_transactions
      add constraint pallet_transactions_type_check
      check (transaction_type in ('CREATE', 'MOVE')) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_transactions_pallet_id_fkey'
      and conrelid = 'public.pallet_transactions'::regclass
  ) then
    alter table public.pallet_transactions
      add constraint pallet_transactions_pallet_id_fkey
      foreign key (pallet_id) references public.pallet_units (id);
  end if;
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

create index if not exists idx_pallet_transactions_pallet_id
  on public.pallet_transactions (pallet_id);

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

  select id, current_location_code
  into v_pallet_unit_id, v_from_location_code
  from public.pallet_units
  where pallet_code = v_pallet_code;

  if v_pallet_unit_id is null then
    return json_build_object('ok', false, 'error', 'pallet_not_found');
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

    return json_build_object('ok', false, 'error', sqlerrm);
  when others then
    return json_build_object('ok', false, 'error', sqlerrm);
end;
$$;

grant execute on function public.move_pallet(text, text, text, text, text, text, text)
  to anon, authenticated, service_role;

comment on table public.pallet_transactions is
  'Phase B7-7: パレット作成・移動など、パレット単位の履歴。inventory とは分離する。';

commit;
