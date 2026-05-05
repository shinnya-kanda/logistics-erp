# logistics-erp 現状整理

## フェーズ
- Phase: B7（Edge Functions移行）
- 最終更新: 2026-05-04

対象コード: `/Users/njfgx574/dev/logistics-erp`  
目的: 今後の進捗計画整理用の現状把握。実装変更なし。

## 0. 前提

### 確定
- `apps/driver-app` は React/Vite。ルート定義は `apps/driver-app/src/App.tsx`。
- `apps/admin-dashboard` は Next.js。実ページはほぼ `/` の単一画面で、タブ UI は `apps/admin-dashboard/src/app/AdminDashboardTabs.tsx`。
- Node API は `services/api/src/scanHttpHandler.ts` に集中。
- Edge Functions は `supabase/functions/*/index.ts`。
- `warehouse_code` は Edge 側では guard 由来に寄せている実装が多い。

### 要確認
- 実機・本番データでの動作確認状況。
- RLS ポリシー込みで、driver 側の直接 Supabase lookup が全ロールで期待通り通るか。

---

## 1. `apps/driver-app` 画面一覧

| 画面名 | ルート | 主ファイル | 使用 API/helper | Node / Edge |
|---|---|---|---|---|
| Login | `/login` | `apps/driver-app/src/pages/LoginPage.tsx` | Supabase Auth | Supabase Auth |
| 作業メニュー | `/menu` | `apps/driver-app/src/pages/MenuPage.tsx` | `useAuth()` profile | Supabase Auth/Profile |
| 入庫 | `/inventory/in` | `apps/driver-app/src/pages/InventoryInPage.tsx`, `apps/driver-app/src/PalletCreateApp.tsx` | `postPalletCreate()` | Edge `pallet-create` |
| 部品移動 | `/inventory/move-part` | `apps/driver-app/src/pages/InventoryMovePage.tsx`, `apps/driver-app/src/InventoryMoveApp.tsx` | `postInventoryMove()`, `checkWarehouseLocation()` | Edge `inventory-move`; Node `/warehouse-locations/check` |
| `/inventory/move` | redirect | `apps/driver-app/src/App.tsx` | `/inventory/move-part` へ redirect | - |
| `/inventory/out` | redirect | `apps/driver-app/src/App.tsx` | `/pallet/out` へ redirect | - |
| `/pallet/create` | redirect | `apps/driver-app/src/App.tsx` | `/inventory/in` へ redirect | - |
| パレット積付 | `/pallet/items/add` | `apps/driver-app/src/pages/PalletItemAddPage.tsx`, `apps/driver-app/src/PalletItemAddApp.tsx` | `postPalletItemAdd()` | Edge `pallet-item-add` |
| パレット移動 | `/pallet/move` | `apps/driver-app/src/pages/PalletMovePage.tsx`, `apps/driver-app/src/PalletMoveApp.tsx` | `getPalletMoveLookup()`, `checkWarehouseLocation()`, `postPalletMove()` | Direct Supabase lookup; Node `/warehouse-locations/check`; Edge `pallets-move` |
| パレット出庫 | `/pallet/out` | `apps/driver-app/src/pages/PalletOutPage.tsx`, `apps/driver-app/src/PalletOutApp.tsx` | `getPalletMoveLookup()`, `postPalletOut()` | Direct Supabase lookup; Edge `pallets-out` |
| 品番単位出庫 | `/pallet/items/out` | `apps/driver-app/src/pages/PalletItemOutPage.tsx`, `apps/driver-app/src/PalletItemOutApp.tsx` | `postPalletItemOut()` + candidate lookup | Edge `pallets-items-out`; UI lookup reads Supabase directly |
| スキャン画面 | `/scanner` | `apps/driver-app/src/pages/ScannerPage.tsx` | `PartLocationSearchApp`, `EmptyPalletSearchApp`, `ScannerApp` | 混在 |
| 品番棚検索 | `/scanner` 内 | `apps/driver-app/src/PartLocationSearchApp.tsx` | `searchActivePalletsByPartNo()` | Node `/pallets/search` |
| 空パレット検索 | `/scanner` 内 | `apps/driver-app/src/EmptyPalletSearchApp.tsx` | `getEmptyPallets()` | Node `/pallets/empty` |
| 旧スキャン | `/scanner` 内 | `apps/driver-app/src/ScannerApp.tsx` | `getHealth()`, `postScan()` | Node `/health`, `/scans` |

API helper 集約: `apps/driver-app/src/scanApiClient.ts`

---

## 2. `apps/admin-dashboard` 画面一覧

実ルートは `/`。タブで画面切替。

| タブ/画面 | 主ファイル | 参照 API/helper | 見ている主テーブル |
|---|---|---|---|
| パレット検索 | `apps/admin-dashboard/src/app/PalletSearchSection.tsx` | `searchPallets()`, `getPalletDetail()`, `getUnregisteredWarehouseLocations()` | `pallet_units`, `pallet_item_links`, detail で `pallet_transactions` |
| 空パレット検索 | `apps/admin-dashboard/src/app/EmptyPalletSearchSection.tsx` | `getEmptyPallets()` | `pallet_units` |
| project_no補正 | `apps/admin-dashboard/src/app/ProjectNoCorrectionSection.tsx` | `getPalletDetail()`, `updatePalletProjectNo()` | `pallet_units`, `pallet_item_links`, detail で `pallet_transactions` |
| 棚番マスタ | `apps/admin-dashboard/src/app/WarehouseLocationSection.tsx` | `searchWarehouseLocations()`, `createWarehouseLocation()`, `updateWarehouseLocationActive()`, `getUnregisteredWarehouseLocations()` | `warehouse_locations`, `pallet_units` |
| 請求確認 | `apps/admin-dashboard/src/app/BillingCheckSection.tsx` | `searchPallets()`, `getUnregisteredWarehouseLocations()` | `pallet_units`, `pallet_item_links` |
| 在庫台帳 | `apps/admin-dashboard/src/app/InventoryLedgerSection.tsx` | `searchInventory()`, `getUnregisteredWarehouseLocations()` | 現状は `inventory_current` ではなく `pallet_units` / `pallet_item_links` 系 |
| 客先提出 | `apps/admin-dashboard/src/app/CustomerExportSection.tsx` | `searchPallets()` | `pallet_units`, `pallet_item_links` |
| 入庫ラベル発行 | `apps/admin-dashboard/src/app/InboundLabelPrintSection.tsx` | API なし。ブラウザで Code39 生成 | DB 参照なし |

Admin API helper: `apps/admin-dashboard/src/app/palletSearchApi.ts`  
Node proxy: `apps/admin-dashboard/src/app/api/scan/[...path]/route.ts`

---

## 3. `services/api` に残っている Node API

定義ファイル: `services/api/src/scanHttpHandler.ts`

| Endpoint | 役割 | 使われている画面 | Edge化状況 |
|---|---|---|---|
| `POST /scans` | 旧スキャン登録 | driver `/scanner` `ScannerApp` | 未Edge化 |
| `POST /rebuild` | `inventory_current` 再構築 | 画面利用は未確認 | 未Edge化 |
| `POST /inventory/out` | 品番在庫出庫 | 現 UI 利用は未確認 | Edge `inventory-out` あり |
| `POST /inventory/in` | 品番在庫入庫 | helper は Edge あり、現 UI 利用は要確認 | Edge `inventory-in` あり |
| `POST /inventory/move` | 品番在庫移動 | driver は Edge 利用 | Edge `inventory-move` あり |
| `POST /pallets/create` | パレット作成 | driver/admin は Edge 利用 | Edge `pallet-create` あり |
| `POST /pallets/items/add` | パレットへ品番積付 | driver は Edge 利用 | Edge `pallet-item-add` あり |
| `POST /pallets/items/out` | パレット品番単位出庫 | driver は Edge 利用 | Edge `pallets-items-out` あり |
| `POST /pallets/move` | パレット移動 | driver は Edge 利用 | Edge `pallets-move` あり |
| `POST /pallets/out` | パレット出庫 | driver は Edge 利用 | Edge `pallets-out` あり |
| `GET /pallets/search` | パレット検索 | driver 品番棚検索は Node、admin は Edge | Edge `pallet-search` あり |
| `GET /pallets/empty` | 空パレット検索 | driver `/scanner`, admin 空パレット検索 | 未Edge化 |
| `POST /pallets/project-no/update` | project_no 補正 | admin project_no補正 | 未Edge化 |
| `GET /warehouse-locations/search` | 棚番検索 | admin は Edge 利用 | Edge `location-search` あり |
| `GET /warehouse-locations/unregistered` | 未登録棚番一覧 | admin は Edge 利用 | Edge `warehouse-locations-unregistered` あり |
| `GET /warehouse-locations/check` | 棚番存在確認 | driver 移動系 | 未Edge化 |
| `POST /warehouse-locations/create` | 棚番作成 | admin は Edge 利用 | Edge `warehouse-location-create` あり |
| `POST /warehouse-locations/active/update` | 棚番 active 更新 | admin 棚番マスタ | 未Edge化 |
| `GET /pallets/detail` | パレット詳細 | admin 検索/補正 | 未Edge化 |
| `GET /health` | Node API health | driver `ScannerApp` | Edge `health` ありだが driver は Node 利用 |

---

## 4. Edge Function 一覧

設定: `supabase/config.toml`

| Function | JWT | 役割 | 対応旧Node API |
|---|---:|---|---|
| `health` | false | health check。`adminGuard` 呼び出しあり | `GET /health` |
| `location-search` | false | 棚番マスタ検索 | `GET /warehouse-locations/search` |
| `warehouse-locations-unregistered` | false | 未登録棚番一覧 | `GET /warehouse-locations/unregistered` |
| `inventory-search` | false | admin 在庫台帳向け検索。ただし実体は pallet 系表示 | 新規/検索系 |
| `warehouse-location-create` | true | 棚番作成 | `POST /warehouse-locations/create` |
| `pallet-create` | true | パレット作成。RPC `create_pallet` | `POST /pallets/create` |
| `pallet-item-add` | true | パレット品番積付。RPC `add_pallet_item` | `POST /pallets/items/add` |
| `inventory-in` | true | 在庫入庫。RPC `create_inventory_in` | `POST /inventory/in` |
| `inventory-move` | true | 在庫移動。RPC `create_inventory_move` | `POST /inventory/move` |
| `inventory-out` | true | 在庫出庫。RPC `create_distributed_inventory_out` | `POST /inventory/out` |
| `pallets-move` | true | パレット移動。`pallet_units` lookup + RPC `move_pallet` | `POST /pallets/move` |
| `pallets-out` | true | パレット出庫。`pallet_units` lookup + RPC `out_pallet` | `POST /pallets/out` |
| `pallets-items-out` | true | 品番単位出庫。候補返却 + RPC `out_pallet_item` | `POST /pallets/items/out` |
| `pallet-search` | 設定記載なし | パレット検索。`pallet_units` + `pallet_item_links` | `GET /pallets/search` |

Function files: `supabase/functions/*/index.ts`

---

## 5. 在庫・パレット関連の主要DB/RPC

### テーブル

| Table | 役割 | 定義/根拠 |
|---|---|---|
| `inventory_transactions` | 品番・数量在庫の真実ログ | `supabase/migrations/202604260900_phase_b4_1_komatsu_inventory_pallet.sql` |
| `inventory_current` | `inventory_transactions` から作る現在庫派生テーブル | 同上 |
| `pallet_units` | パレット物理単位、現在棚・状態キャッシュ | `supabase/migrations/202605021657_phase_b7_1_pallet_units.sql` ほか |
| `pallet_transactions` | パレット移動/出庫等の真実ログ | `supabase/migrations/202605022050_phase_b7_7_pallet_move.sql` |
| `pallet_item_links` | パレット上の品番・数量リンク | `supabase/migrations/202605021712_phase_b7_2_pallet_item_links.sql` |

### 使用中 RPC

| RPC | 主な用途 | 呼び出し元 |
|---|---|---|
| `create_inventory_in` | 在庫入庫 | `supabase/functions/inventory-in/index.ts`, Node `/inventory/in` |
| `create_distributed_inventory_out` | 在庫出庫 | `supabase/functions/inventory-out/index.ts`, Node `/inventory/out` |
| `create_inventory_move` | 在庫移動 | `supabase/functions/inventory-move/index.ts`, Node `/inventory/move` |
| `create_pallet` | パレット作成 | `supabase/functions/pallet-create/index.ts`, Node `/pallets/create` |
| `add_pallet_item` | パレット品番積付 | `supabase/functions/pallet-item-add/index.ts`, Node `/pallets/items/add` |
| `out_pallet_item` | パレット品番単位出庫 | `supabase/functions/pallets-items-out/index.ts`, Node `/pallets/items/out` |
| `move_pallet` | パレット移動 | `supabase/functions/pallets-move/index.ts`, Node `/pallets/move` |
| `out_pallet` | パレット出庫 | `supabase/functions/pallets-out/index.ts`, Node `/pallets/out` |
| `get_empty_pallets` | 空パレット検索 | Node `/pallets/empty` |
| `rebuild_inventory_current` | 現在庫再構築 | Node `/rebuild` |
| `rebuild_pallet_current_locations` | パレット現在地再構築 | migration 定義。画面利用は要確認 |

---

## 6. B7 完了済みと思われるもの

### 確定に近い
- 認証/ロール制御の導入: `apps/driver-app/src/auth/*`, `apps/admin-dashboard/src/auth/*`, `supabase/functions/_shared/*`
- Admin dashboard の role 制御: `apps/admin-dashboard/src/app/page.tsx`
- read 系 Edge 化:
  - `health`
  - `location-search`
  - `warehouse-locations-unregistered`
  - `pallet-search`
  - `inventory-search`
- write 系 Edge 化:
  - `warehouse-location-create`
  - `pallet-create`
  - `pallet-item-add`
  - `inventory-in`
  - `inventory-move`
  - `inventory-out`
  - `pallets-move`
  - `pallets-out`
  - `pallets-items-out`
- driver-app の主要 write helper は Edge 呼び出しへ移行済み:
  - `postPalletCreate`
  - `postPalletItemAdd`
  - `postInventoryMove`
  - `postInventoryOut`
  - `postPalletMove`
  - `postPalletOut`
  - `postPalletItemOut`
- 品番単位出庫の複数候補 UI:
  - `apps/driver-app/src/PalletItemOutApp.tsx`
  - 候補選択モーダルあり
  - 選択後 `selected_pallet_item_id` を Edge へ送信

---

## 7. 未完了・要確認

### 未Edge化が残っている Node API
- `POST /scans`
- `POST /rebuild`
- `GET /pallets/empty`
- `POST /pallets/project-no/update`
- `GET /warehouse-locations/check`
- `POST /warehouse-locations/active/update`
- `GET /pallets/detail`

### Edge化済みだが利用が混在
- `GET /health`: Edge はあるが driver `ScannerApp` は Node `getHealth()`。
- `GET /pallets/search`: admin は Edge `pallet-search`、driver `PartLocationSearchApp` は Node。
- `GET /warehouse-locations/search`: admin は Edge、driver の棚番 check は Node `/warehouse-locations/check`。

### データ表示の要確認
- admin の「在庫台帳」は `inventory_current` ではなく `pallet_units` / `pallet_item_links` 系を見ている実装に見える。
- `inventory_current` を正とする在庫画面は、現 admin にはまだ明確には見当たらない。
- 品番単位出庫 UI の候補 lookup は直接 Supabase を読むため、RLS/ロール別挙動の実機確認が必要。

---

## 8. 今後の推奨順

1. `warehouse-locations/check` を Edge 化  
   driver の移動系がまだ Node に依存しているため、影響範囲が小さく優先しやすい。

2. `pallets/empty` を Edge 化  
   driver `/scanner` と admin 空パレット検索の両方で Node 依存が残っている。

3. `pallets/detail` を Edge 化  
   admin のパレット検索・project_no補正が依存。`pallet_units` / `pallet_item_links` / `pallet_transactions` をまとめて返す read API。

4. `warehouse-locations/active/update` を Edge 化  
   admin 棚番マスタの残 Node write。

5. `pallets/project-no/update` を Edge 化  
   DB更新範囲が `pallet_units` と `pallet_item_links` に及ぶため、上記より慎重に。

6. `/health` と `/pallets/search` の利用先整理  
   Edge はあるが Node 利用が残る箇所を helper 単位で揃える。

7. `/scans` と `/rebuild` の扱い決定  
   旧スキャン画面を残すか、B7後のパレット/在庫フローに統合するか要判断。

8. admin 在庫表示の再設計  
   `inventory_current` を正にする画面と、`pallet_units` / `pallet_item_links` のパレット状態画面を分ける。
