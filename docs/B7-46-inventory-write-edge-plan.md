# B7-46 Inventory Write Edge Plan

## 目的

B7-46 では、在庫更新系 API を Supabase Edge Functions へ移行する前に、既存 API・呼び出し元・DB 関数・冪等性・データ境界を棚卸しする。

在庫更新系は `inventory_transactions` や `pallet_transactions` に関わるため、いきなり Edge Function 化しない。次フェーズでは、この整理を前提に、既存レスポンス形式と業務ロジックを壊さず、小さい単位で移行判断する。

---

## 基本方針

- `inventory_transactions` は品番・数量在庫の真実ログである。
- `inventory_current` は派生キャッシュであり、API から直接更新しない。
- パレット位置・出庫・品番出庫の履歴は `pallet_transactions` に残す。
- Edge 化後も、更新処理本体は DB 関数に閉じ込める。
- Edge Function 側は JWT / role / `warehouse_code` 境界 / 入力検証 / DB 関数呼び出しの薄い層にする。
- `warehouse_code` はフロント入力ではなく `adminGuard` / profile 由来を使う方向へ寄せる。
- worker / chief / admin など現場系許可ロールは、admin-dashboard 用 guard とは別に field-write guard を設計する必要がある。

---

## 対象 API 一覧

| API | 呼び出し元 | 現在の処理先 | 主な DB 関数・テーブル | Edge 化優先度 |
| --- | --- | --- | --- | --- |
| `POST /inventory/in` | driver-app 入庫画面 | Node API `scanHttpHandler.ts` | `public.create_inventory_in` → `inventory_transactions` | 中 |
| `POST /inventory/out` | driver-app 出庫画面 | Node API `scanHttpHandler.ts` | `public.create_distributed_inventory_out` → `inventory_transactions` | 低 |
| `POST /inventory/move` | driver-app 部品移動画面 | Node API `scanHttpHandler.ts` | `public.create_inventory_move` → `inventory_transactions` 2行 | 低 |
| `POST /pallets/create` | driver-app パレット作成画面 | Node API `scanHttpHandler.ts` | `public.create_pallet` → `pallet_units` | 中 |
| `POST /pallets/items/add` | driver-app パレット品番追加画面 | Node API `scanHttpHandler.ts` | `public.add_pallet_item` → `pallet_item_links` | 中 |
| `POST /pallets/items/out` | driver-app パレット品番出庫画面 | Node API `scanHttpHandler.ts` | `public.out_pallet_item` → `pallet_item_links`, `pallet_transactions` | 低 |
| `POST /pallets/move` | driver-app パレット移動画面 | Node API `scanHttpHandler.ts` | `public.move_pallet` → `pallet_units`, `pallet_transactions` | 低 |
| `POST /pallets/out` | driver-app パレット出庫画面 | Node API `scanHttpHandler.ts` | `public.out_pallet` → `pallet_units`, `pallet_transactions` | 低 |
| `POST /pallets/project-no/update` | admin-dashboard project_no 補正 | Node API `/api/scan` proxy | `pallet_units`, `pallet_item_links` UPDATE | 低 |
| `POST /warehouse-locations/create` | admin-dashboard 棚番マスタ | Node API `/api/scan` proxy | `warehouse_locations` INSERT/UPSERT | 中 |
| `POST /warehouse-locations/active/update` | admin-dashboard 棚番マスタ | Node API `/api/scan` proxy | `warehouse_locations` UPDATE | 中 |
| `POST /scans` | driver-app スキャン画面 | Node API `processScanInput` | `scan_events`, progress / issues | 別管理 |

---

## API別メモ

### `POST /inventory/in`

現在の呼び出し元：

- driver-app 入庫画面
- `scanApiClient` の入庫 POST（`/inventory/in`）

現在の処理先：

- `services/api/src/scanHttpHandler.ts`
- `public.create_inventory_in(...)`

使用 DB 関数・テーブル：

- `public.create_inventory_in`
- `inventory_transactions` に `IN` を1行 INSERT
- `inventory_current` は直接更新しない。DB 側の既存トリガー / 再構築設計に従う。

`warehouse_code` の扱い：

- 現状はリクエスト body の `warehouse_code` を使用。
- Edge 化時は `guard.warehouseCode` を優先し、フロント入力値を信用しない。

`operator_id` / `operator_name`：

- body の `operator_id` / `operator_name` を DB 関数へ渡している。
- Edge 化時は `operator_id` を `guard.user.id` に寄せるか、現場入力の `operator_name` を残すかを事前決定する。

`idempotency_key`：

- body の `idempotency_key` を DB 関数へ渡す。
- `create_inventory_in` は既存 `IN` トランザクションを `idempotency_key` で replay する。
- Edge 化後もクライアント生成キーを必須に寄せるのが望ましい。

Edge 化時の注意点：

- `quantity > 0`、`part_no`、`to_location_code` の検証を Node API と同等にする。
- 成功レスポンス `{ ok: true, transaction }` を維持する。
- DB 関数の `check_violation` は 400 に変換する。

---

### `POST /inventory/out`

現在の呼び出し元：

- driver-app 出庫画面
- Node API `POST /inventory/out`

現在の処理先：

- `public.create_distributed_inventory_out(...)`

使用 DB 関数・テーブル：

- `inventory_current` を在庫確認に使う
- `inventory_transactions` に `OUT` を1行または複数行 INSERT
- 分散出庫のため複数棚から数量を割り当てる

`warehouse_code` の扱い：

- 現状は body の `warehouse_code`。
- Edge 化時は `guard.warehouseCode` に固定する。

`operator_id` / `operator_name`：

- body の値を DB 関数へ渡す。
- Edge 化時は `operator_id = guard.user.id` を検討する。

`idempotency_key`：

- `create_distributed_inventory_out` は分割行に `key:001`, `key:002` 形式を使う。
- replay 時は元キーまたは prefix に一致する `OUT` を返す。

Edge 化時の注意点：

- 分散出庫は在庫不足・棚指定・複数行作成があるため最初の移行対象にしない。
- 成功レスポンス `{ ok: true, transactions }` を維持する。
- `from_location_codes` 配列の検証を維持する。

---

### `POST /inventory/move`

現在の呼び出し元：

- driver-app 部品移動画面
- `postInventoryMove`

現在の処理先：

- `public.create_inventory_move(...)`

使用 DB 関数・テーブル：

- `inventory_current` を不足チェックに使う
- `inventory_transactions` に `OUT(from)` と `IN(to)` の2行を INSERT
- `inventory_current` は直接更新しない

`warehouse_code` の扱い：

- 現状は body の `warehouse_code`。
- Edge 化時は `guard.warehouseCode` を使用する。

`operator_id` / `operator_name`：

- body の `operator_id` / `operator_name` を DB 関数へ渡す。

`idempotency_key`：

- Node API で無ければ `randomUUID()` を補完している。
- DB 関数は `idempotency_key` 必須で、内部的に `:OUT` / `:IN` の派生キーを使う。

Edge 化時の注意点：

- 2行トランザクションであり、不完全冪等状態の扱いが重要。
- `from_location_code !== to_location_code` の検証を維持する。
- 最初の Edge 化対象にはしない。

---

### `POST /pallets/create`

現在の呼び出し元：

- driver-app パレット作成画面
- `postPalletCreate`

現在の処理先：

- `public.create_pallet(...)`

使用 DB 関数・テーブル：

- `pallet_units`
- location 対応後は `current_location_code` も扱う
- `inventory_transactions` / `inventory_current` は変更しない

`warehouse_code` の扱い：

- 現状は body の `warehouse_code`。
- Edge 化時は `guard.warehouseCode` に固定する。

`operator_id` / `operator_name`：

- `created_by` を渡す。`operator_id` / `operator_name` ではない。

`idempotency_key`：

- 明示的な `idempotency_key` は無い。
- `pallet_code` 重複時は既存扱い、または `pallet_code_already_exists` を返す実装差分がある。

Edge 化時の注意点：

- `location_already_occupied`、`pallet_code_already_exists` のエラー形式を維持する。
- PL NO / PJ NO 発行ロジックを変えない。
- `current_location_code` と棚番制約の扱いを確認してから移行する。

---

### `POST /pallets/items/add`

現在の呼び出し元：

- driver-app パレット品番追加画面
- `postPalletItemAdd`

現在の処理先：

- `public.add_pallet_item(...)`

使用 DB 関数・テーブル：

- `pallet_item_links`
- 既存 `(pallet_id, part_no)` があれば数量加算
- `inventory_transactions` / `inventory_current` は変更しない

`warehouse_code` の扱い：

- 現状は body の `warehouse_code`。
- Edge 化時は `guard.warehouseCode` を使う。

`operator_id` / `operator_name`：

- `created_by` を渡す。

`idempotency_key`：

- 明示的な冪等キーは無い。
- 同一品番の再送は数量加算になるため、Edge 化前に冪等方針を決める必要がある。

Edge 化時の注意点：

- 再送で数量が二重加算されるリスクがある。
- Edge 化前に `idempotency_key` を追加するか、UI/通信リトライ方針を固定する。
- 在庫トランザクションではないが、数量に影響するため慎重に扱う。

---

### `POST /pallets/items/out`

現在の呼び出し元：

- driver-app パレット品番出庫画面
- `postPalletItemOut`

現在の処理先：

- `public.out_pallet_item(...)`

使用 DB 関数・テーブル：

- `pallet_item_links.quantity` を減算
- 0 になった場合は `unlinked_at` を設定
- `pallet_transactions` に `ITEM_OUT` 履歴を INSERT
- `inventory_transactions` / `inventory_current` は変更しない

`warehouse_code` の扱い：

- 現状は body の `warehouse_code`、無い場合 `"KOMATSU"` fallback がある。
- Edge 化時は fallback を廃止し、`guard.warehouseCode` に固定する。

`operator_id` / `operator_name`：

- body の値を DB 関数へ渡す。

`idempotency_key`：

- 無ければ Node API が `randomUUID()` を補完。
- DB 関数側も無ければ `pallet-item-out:<uuid>` を生成する。
- `pallet_transactions.idempotency_key` で replay する。

Edge 化時の注意点：

- 数量不足、出庫済み、リンク不存在などのエラーを既存 UI 表示に合わせる。
- パレット内数量を更新するため、最初の移行対象にはしない。

---

### `POST /pallets/move`

現在の呼び出し元：

- driver-app パレット移動画面
- `postPalletMove`

現在の処理先：

- `public.move_pallet(...)`

使用 DB 関数・テーブル：

- `pallet_units.current_location_code` を更新
- `pallet_transactions` に `MOVE` 履歴を INSERT
- `inventory_transactions` / `inventory_current` は変更しない

`warehouse_code` の扱い：

- 現状は body の `warehouse_code`、無い場合 `"KOMATSU"` fallback。
- Edge 化時は `guard.warehouseCode` に固定する。

`operator_id` / `operator_name`：

- body の値を DB 関数へ渡す。

`idempotency_key`：

- 無ければ Node API が `randomUUID()` を補完。
- DB 関数は `pallet_transactions.idempotency_key` を見る。

Edge 化時の注意点：

- `location_already_occupied` の扱いを維持する。
- 同一棚移動、出庫済み、占有制約のエラーを既存 UI と合わせる。

---

### `POST /pallets/out`

現在の呼び出し元：

- driver-app パレット出庫画面
- `postPalletOut`

現在の処理先：

- `public.out_pallet(...)`

使用 DB 関数・テーブル：

- `pallet_units.current_status` を `OUT` 扱いへ更新
- `pallet_transactions` に `OUT` 履歴を INSERT
- `inventory_transactions` / `inventory_current` は変更しない

`warehouse_code` の扱い：

- 現状は body の `warehouse_code`、無い場合 `"KOMATSU"` fallback。
- Edge 化時は `guard.warehouseCode` に固定する。

`operator_id` / `operator_name`：

- body の値を DB 関数へ渡す。

`idempotency_key`：

- 無ければ Node API / DB 関数で補完される。
- `pallet_transactions.idempotency_key` の unique index で replay する。

Edge 化時の注意点：

- パレット全体の状態変更なので、移行前に二重出庫と replay の契約テストが必要。

---

## admin-dashboard の書き込み系

### `POST /pallets/project-no/update`

- 呼び出し元: admin-dashboard `ProjectNoCorrectionSection`
- 現在の処理先: Node API `/api/scan` proxy → `scanHttpHandler.ts`
- 使用テーブル: `pallet_units`, `pallet_item_links`
- `warehouse_code`: 現在は `pallet_code` から対象を特定。Edge 化時は対象 pallet の `warehouse_code = guard.warehouseCode` を必ず確認する。
- `operator`: 現状なし。
- `idempotency_key`: 現状なし。
- 注意点: project_no 補正は一括 UPDATE であり、誤更新の影響が大きい。admin 専用または office/chief 可否を別途決める。

### `POST /warehouse-locations/create`

- 呼び出し元: admin-dashboard `WarehouseLocationSection`
- 使用テーブル: `warehouse_locations`
- `warehouse_code`: 現状は UI 入力値。Edge 化時は `guard.warehouseCode` を使い、入力 warehouse_code は無視または一致チェックのみ。
- `operator`: 現状なし。
- `idempotency_key`: 現状なし。
- 注意点: マスタ登録であり在庫更新ではないが、データ境界の基礎なので先に Edge 化してもよい。

### `POST /warehouse-locations/active/update`

- 呼び出し元: admin-dashboard `WarehouseLocationSection`
- 使用テーブル: `warehouse_locations`
- `warehouse_code`: 現状は `id` 指定。Edge 化時は対象行取得時に `warehouse_code = guard.warehouseCode` を必ず条件に入れる。
- `operator`: 現状なし。
- `idempotency_key`: 現状なし。
- 注意点: 有効/無効の切替は現場運用に影響するため、監査ログ方針が決まるまでは小さく移行する。

---

## scan API

### `POST /scans`

- 呼び出し元: driver-app スキャン画面
- 現在の処理先: `processScanInput`
- 使用テーブル: `scan_events`, `shipment_item_progress`, `shipment_item_issues`
- `warehouse_code`: 現状の scan 契約は shipment / item 中心で、B7-33 の warehouse 境界とは別整理が必要。
- `operator_name`: scan payload に含まれる。
- `idempotency_key`: `scan_events.idempotency_key` unique index と `processScanInput` の replay ロジックあり。
- 注意点: 在庫更新系とは別フェーズで扱う。曖昧解決や progress 更新を含むため、最初の write Edge 化対象にしない。

---

## Edge 化前に必要な共通設計

### 1. guard 分離

現在の `adminGuard` は `admin / chief / office` 用で、B7-42 以降の一部関数ではさらに `admin` のみに絞っている。

在庫更新系には別 guard が必要。

- field write allowed roles: `admin`, `chief`, `worker`
- office は現場更新 API では拒否
- `warehouseCode` は profile 由来
- `user.id` を `operator_id` として使える形にする
- `display_name` またはメールを `operator_name` の fallback に使うか決める

### 2. warehouse_code 固定

Edge 化後の書き込み API では、原則として body の `warehouse_code` を信頼しない。

候補：

- body の `warehouse_code` は受け取らない
- 後方互換期間だけ受け取り、`guard.warehouseCode` と不一致なら 403
- DB 関数へ渡す値は必ず `guard.warehouseCode`

### 3. idempotency_key 必須化

在庫更新 API は、通信リトライや二重タップで二重更新が起きる。

方針：

- `inventory/in`, `inventory/out`, `inventory/move`, `pallets/items/out`, `pallets/move`, `pallets/out` は `idempotency_key` 必須に寄せる
- Node API の `randomUUID()` 補完は後方互換として残すが、Edge 版ではクライアント生成キーを必須にする案が安全
- `pallets/items/add` は現状冪等ではなく数量加算なので、Edge 化前に必ず方針を決める

### 4. レスポンス形式維持

driver-app は各 API ごとに成功レスポンスの型を検証している。

Edge 化時に変えてはいけない例：

- `inventory/in`: `{ ok: true, transaction }`
- `inventory/out`: `{ ok: true, transactions }`
- `inventory/move`: `{ ok: true, move: { out_transaction, in_transaction } }`
- `pallets/create`: `{ ok: true, pallet_id, pallet_code, created }`
- `pallets/items/add`: `{ ok: true, pallet_code, part_no, quantity_added }`
- `pallets/items/out`: `{ ok: true, transaction, ... }`
- `pallets/move`: `{ ok: true, transaction }`
- `pallets/out`: `{ ok: true, transaction }`

### 5. エラー形式維持

既存 UI は `error` と一部 `message` を表示する。

維持したい代表エラー：

- `location_already_occupied`
- `pallet_code_already_exists`
- `pallet_not_found`
- `pallet_already_out`
- `pallet_item_not_found`
- `insufficient_pallet_item_quantity`
- quantity / location / part_no required 系

---

## 推奨移行順序

1. `warehouse-locations/create` / `active/update`
   - 在庫トランザクションに触らないため比較的安全。
2. `pallets/create`
   - `pallet_units` 作成のみ。PL/PJ/棚番制約と重複時レスポンスを重点確認。
3. `pallets/move`
   - `pallet_transactions` と location 占有制約の契約テストを追加してから。
4. `pallets/out`
   - 二重出庫・冪等 replay を確認してから。
5. `pallets/items/out`
   - 数量減算があるため、数量不足・0化・unlinked_at を重点確認。
6. `inventory/in`
   - `inventory_transactions` に1行追加。品番在庫更新系の最初の候補。
7. `inventory/out`
   - 分散出庫で複数行になるため後回し。
8. `inventory/move`
   - OUT + IN の2行トランザクションで最も注意が必要。最後に近い段階で移行。

---

## 次フェーズのテスト観点

- worker / chief / admin が現場更新 API を使えること
- office は現場更新 API を拒否されること
- profile 未取得 / inactive / role 不明 / warehouse_code なしは拒否されること
- body の `warehouse_code` を改ざんしても profile の warehouse に固定されること
- 同じ `idempotency_key` の再送で二重更新されないこと
- `inventory_current` を API から直接更新していないこと
- DB 関数が `inventory_transactions` / `pallet_transactions` に履歴を残すこと
- 既存 driver-app の成功/失敗表示が変わらないこと

---

## 禁止事項

- Edge Function から `inventory_current` を直接 UPDATE しない
- Edge Function から `inventory_transactions` を手書き INSERT しない（既存 DB 関数を使う）
- 移行と同時に DB スキーマを変えない
- 移行と同時に UI を変えない
- idempotency 方針が曖昧な API を先に移行しない
- `warehouse_code` をフロント入力だけで信用しない
- 在庫トランザクション系を一括移行しない

---

## 結論

B7-46 時点では、在庫更新系 API はまだ Edge Function 化しない。

最初に移行すべき書き込み系は、在庫トランザクションに触らない `warehouse_locations` 系または `pallets/create` が候補である。`inventory/in` は品番在庫更新系の最初の候補になり得るが、`inventory/out` と `inventory/move` は分散出庫・複数トランザクション・冪等性のリスクが高いため後回しにする。
