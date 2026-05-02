-- Phase B7-2: pallet_item_links foundation
--
-- 方針:
-- - パレットに載る品番・数量を pallet_item_links で管理する
-- - 在庫の真実である inventory_transactions は変更しない
-- - inventory_current / pallet_units / UI / API には触れない

begin;

create table if not exists public.pallet_item_links (
  id uuid primary key default gen_random_uuid(),

  pallet_id uuid not null
    references public.pallet_units (id) on delete cascade,

  part_no text not null,

  quantity numeric not null,

  quantity_unit text default 'pcs',

  warehouse_code text not null,

  created_at timestamptz not null default now(),

  created_by text,

  remarks text
);

alter table public.pallet_item_links
  add column if not exists pallet_id uuid;

alter table public.pallet_item_links
  add column if not exists quantity_unit text default 'pcs';

alter table public.pallet_item_links
  add column if not exists warehouse_code text;

alter table public.pallet_item_links
  add column if not exists created_by text;

alter table public.pallet_item_links
  add column if not exists remarks text;

-- 旧 pallet_unit_id がある環境では pallet_id へ引き継ぐ。
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pallet_item_links'
      and column_name = 'pallet_unit_id'
  ) then
    execute $sql$
      update public.pallet_item_links
      set pallet_id = coalesce(pallet_id, pallet_unit_id)
      where pallet_id is null
    $sql$;
  end if;
end $$;

-- warehouse_code は pallet_units から補完する（pallet_units 自体は更新しない）。
update public.pallet_item_links pil
set warehouse_code = pu.warehouse_code
from public.pallet_units pu
where pil.warehouse_code is null
  and pu.id = pil.pallet_id;

alter table public.pallet_item_links
  alter column quantity_unit set default 'pcs';

alter table public.pallet_item_links
  alter column pallet_id set not null;

alter table public.pallet_item_links
  alter column warehouse_code set not null;

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
      foreign key (pallet_id) references public.pallet_units (id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_item_links_quantity_positive'
      and conrelid = 'public.pallet_item_links'::regclass
  ) then
    alter table public.pallet_item_links
      add constraint pallet_item_links_quantity_positive
      check (quantity > 0) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pallet_item_links_unique'
      and conrelid = 'public.pallet_item_links'::regclass
  ) then
    alter table public.pallet_item_links
      add constraint pallet_item_links_unique
      unique (pallet_id, part_no);
  end if;
end $$;

create index if not exists idx_pallet_item_links_pallet_id
  on public.pallet_item_links (pallet_id);

create index if not exists idx_pallet_item_links_part_no
  on public.pallet_item_links (part_no);

create index if not exists idx_pallet_item_links_warehouse_code
  on public.pallet_item_links (warehouse_code);

comment on table public.pallet_item_links is
  'Phase B7-2: パレットに載る品番・数量のリンク。棚→パレット→品番の構造を表す。';

comment on column public.pallet_item_links.quantity is
  'パレット上に載っている品番数量。inventory_transactions の代替ではない。';

grant all on table public.pallet_item_links to anon;
grant all on table public.pallet_item_links to authenticated;
grant all on table public.pallet_item_links to service_role;

commit;
