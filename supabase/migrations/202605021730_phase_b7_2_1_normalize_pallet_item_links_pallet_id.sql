-- Phase B7-2.1: Normalize pallet_item_links pallet reference
--
-- 方針:
-- - 今後のB7 APIでは pallet_item_links.pallet_id に統一する
-- - inventory_transactions / inventory_current / pallet_units の既存データは変更しない
-- - UI / API は変更しない

begin;

alter table public.pallet_item_links
  add column if not exists pallet_id uuid;

-- 旧 pallet_unit_id が存在する環境では、pallet_id へ値を引き継ぐ。
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_item_links'
      and column_name = 'pallet_unit_id'
  ) then
    update public.pallet_item_links
    set pallet_id = pallet_unit_id
    where pallet_id is null
      and pallet_unit_id is not null;
  end if;
end $$;

-- pallet_id が残っていない場合だけ NOT NULL 化する。
do $$
declare
  null_count bigint;
begin
  select count(*)
  into null_count
  from public.pallet_item_links
  where pallet_id is null;

  if null_count > 0 then
    raise exception
      'Phase B7-2.1 stopped: public.pallet_item_links.pallet_id still has % null row(s). Backfill pallet_id before dropping pallet_unit_id.',
      null_count;
  end if;

  alter table public.pallet_item_links
    alter column pallet_id set not null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_item_links_pallet_id_fkey'
      and conrelid = 'public.pallet_item_links'::regclass
  ) then
    alter table public.pallet_item_links
      add constraint pallet_item_links_pallet_id_fkey
      foreign key (pallet_id) references public.pallet_units (id);
  end if;
end $$;

-- unique 制約を追加する前に、重複データがあれば明示的に停止する。
do $$
declare
  duplicate_count bigint;
begin
  select count(*)
  into duplicate_count
  from (
    select pallet_id, part_no
    from public.pallet_item_links
    group by pallet_id, part_no
    having count(*) > 1
  ) duplicates;

  if duplicate_count > 0 then
    raise exception
      'Phase B7-2.1 stopped: public.pallet_item_links has % duplicate pallet_id/part_no pair(s). Resolve duplicates before adding pallet_item_links_unique_pallet_part.',
      duplicate_count;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_item_links_unique_pallet_part'
      and conrelid = 'public.pallet_item_links'::regclass
  ) then
    alter table public.pallet_item_links
      add constraint pallet_item_links_unique_pallet_part
      unique (pallet_id, part_no);
  end if;
end $$;

alter table public.pallet_item_links
  drop column if exists pallet_unit_id;

commit;
