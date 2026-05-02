-- Phase B7-12-2: allow zero quantity for pallet item links
--
-- 方針:
-- - ITEM_OUT で数量が0になった品番リンクを保持できるようにする
-- - quantity の負数は禁止し、0は許可する
-- - 関数 / API / UI / inventory_* は変更しない

begin;

alter table public.pallet_item_links
  drop constraint if exists chk_pallet_item_links_quantity;

alter table public.pallet_item_links
  add constraint chk_pallet_item_links_quantity
  check (quantity >= 0);

commit;
