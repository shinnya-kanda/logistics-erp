-- 不正データ（UUID以外）をNULL化
update pallet_item_links
set created_by = null
where created_by is not null
  and created_by !~* '^[0-9a-f-]{36}$';

-- created_by を uuid 型へ変更
alter table pallet_item_links
alter column created_by type uuid
using created_by::uuid;
