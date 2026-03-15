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

## 今後の検討（transaction / idempotency）

- **transaction**: 複数テーブルへの書き込みを 1 トランザクションにまとめ、途中失敗時にロールバックできるようにする。
- **idempotency**: 同じ CSV を 2 回流しても、stock_movements / trace_events が重複しないようにする。  
  例: `source_type` + `source_ref` + `shipment_id` + `event_type` の一意制約、`importer_run_id` の導入、再実行時の idempotency key の利用。

現状は **registerEffects を true にすると 2 回実行で重複登録される** ため、本番で使う前に上記のいずれかの対策が必要。
