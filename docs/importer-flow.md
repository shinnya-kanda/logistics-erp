# Importer フロー

## 現在のフロー

1. **CSV 読み込み** → 行をパースし、`issue_no` / `part_no` 等に正規化
2. **shipments upsert** → `onConflict: "issue_no,part_no"` で upsert。返却行（id 付き）を取得
3. **registerEffects オプション時のみ**  
   各 shipment 行に対して `registerShipmentEffects` を実行:
   - `stock_movements` に IN を 1 件 insert（`shipment_id` 紐づけ）
   - `inventory` を増加（存在しなければ insert）
   - `trace_events` に初期イベント（SHIPPER_CONFIRMED）を 1 件 insert（`shipment_id`, `stock_movement_id` 紐づけ）

## shipment import と effect registration の違い

| 対象 | 内容 |
|------|------|
| **shipment import** | CSV → `shipments` テーブルへの upsert のみ。既存どおり。 |
| **effect registration** | 各 shipment について在庫・履歴・trace を登録（stock_movements / inventory / trace_events）。 |

`importShipments(csvPath)` は従来どおり shipment のみ。  
`importShipments(csvPath, { registerEffects: true })` で、上記の「効果」登録までまとめて実行する。

## オプション

- **registerEffects: false または未指定** … shipment upsert のみ（既存挙動）
- **registerEffects: true** … shipment upsert 後に各行で `registerShipmentEffects` を実行し、`result.effects` に結果を格納

## 冪等性（idempotency_key）

- **stock_movements**: `idempotency_key = RECEIPT:{shipment_id}:IN` を付与。同一キーで再 insert 時は unique 制約により既存行を取得して返す。
- **trace_events**: `idempotency_key = IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED` を付与。同様に再実行時は既存を返す。
- 詳細は [idempotency-and-trace-id.md](./idempotency-and-trace-id.md) を参照。

## 今後の検討（transaction / outbox）

- **transaction**: 複数テーブルへの書き込みを 1 トランザクションにまとめ、途中失敗時にロールバックできるようにする。
- **importer_run_id**: 取込実行単位を識別し、再実行範囲やロールバック範囲を明確にする。
