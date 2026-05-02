-- Phase B7-12-3: drop legacy positive-only quantity check
--
-- 方針:
-- - ITEM_OUT 後の quantity = 0 を許可するため、旧 quantity > 0 制約だけを削除する
-- - chk_pallet_item_links_quantity (quantity >= 0) は維持する
-- - 関数 / API / UI / inventory_* は変更しない

begin;

alter table public.pallet_item_links
  drop constraint if exists pallet_item_links_quantity_positive;

commit;
