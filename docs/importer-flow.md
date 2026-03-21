# Importer フロー

## Phase 1 現在のフロー（Expected Data）

1. **CSV 読み込み** → `csv-parse/sync` で行パース → **内部モデル** `NormalizedShipmentLineInput` に正規化（CSV 列名への依存をここに閉じる）
2. **バッチ検証** … 同一ファイル内で `issue_no` / `supplier` が一致すること。`part_no` 必須、`quantity` は **1 以上の整数**。必須列ヘッダチェック。失敗時・冪等ヒット時は `[logistics-erp/importer]` プレフィックスでログ出力。
3. **checksum（SHA-256）** … 既に `source_files` に同一 checksum があれば **DB insert は行わず** 既存の `shipments` ヘッダ + `shipment_items` を読み戻す（冪等）
4. **未登録の場合** … `DATABASE_URL` で **単一トランザクション**として  
   `source_files`（1 件）→ `shipments`（ヘッダ 1 件）→ `shipment_items`（複数行）を挿入。失敗時はロールバック
4b. **Phase 2**: 成功後に `ensureShipmentItemProgressForShipmentId(shipment_id)` で `shipment_item_progress` を **冪等シード**（checksum 冪等ヒット時も同様、`ON CONFLICT DO NOTHING`）。
5. **registerEffects オプション時** … 各 **shipment_item** 行に対して `registerShipmentEffects` を実行:
   - `stock_movements` に IN（`shipment_id` = ヘッダ、`shipment_item_id` = 明細）
   - `inventory` 増加
   - `trace_events` に SHIPPER_CONFIRMED（`shipment_item_id` ベースの冪等キー）

詳細は [phase1-expected-data.md](./phase1-expected-data.md) を参照。

## shipment import と effect registration の違い

| 対象 | 内容 |
|------|------|
| **Expected import** | CSV → `source_files` + `shipments`（ヘッダ）+ `shipment_items` |
| **effect registration** | 各明細について在庫・履歴・trace を登録（Phase 0 と同様の副作用だがキー単位は明細） |

`importShipments(csvPath)` は Expected 取込のみ。  
`importShipments(csvPath, { registerEffects: true })` で在庫・trace まで実行する。

## オプション

- **registerEffects: false または未指定** … Expected 取込のみ（`result.effects` なし）
- **registerEffects: true** … 各 `shipment_item` で `registerShipmentEffects` を実行し、`result.effects` に格納

## 冪等性

- **source_files**: `checksum` が一意（NULL は除外）。同一ファイル再実行は insert スキップ。
- **stock_movements**: Phase 1 では `RECEIPT:{shipment_item_id}:IN`。Phase 0 レガシー行は `RECEIPT:{shipments.id}:IN`。
- **trace_events**: Phase 1 では `IMPORTER_INIT:{shipment_item_id}:SHIPPER_CONFIRMED`。レガシーは `shipment_id` ベース。DB 上は `shipment_item_id` の有無で部分一意インデックスを切り替え。

詳細は [idempotency-and-trace-id.md](./idempotency-and-trace-id.md) を参照。

## 環境変数

- **Supabase**（effects 経由の insert）: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- **Expected バンドル insert**: `DATABASE_URL`（必須）
