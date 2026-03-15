# 在庫中核テーブル設計 (inventory / stock_movements)

## 役割

- **inventory**: 現在庫の集約テーブル。`supplier` + `part_no` を 1 単位とし、`on_hand_qty`（実在庫）・`allocated_qty`（引当済）・`available_qty`（利用可能）を保持する。
- **stock_movements**: 在庫増減の履歴。入庫(IN)・出庫(OUT)・調整(ADJUST)・引当(RESERVE)・引当解除(RELEASE) を記録し、`shipments` や将来の orders / billing / trace と紐づける。

## shipments との関係

- **shipments**: CSV/PDF 取込による「出荷指示・納品予定」の元データ。取込後に在庫移動（出庫や引当）として `stock_movements` に書き、必要に応じて `inventory` を更新する。
- `stock_movements.shipment_id` で `shipments` を参照し、どの出荷に紐づく移動かを追跡する。

## なぜ在庫移動中心か

物流 ERP では「何が・いつ・どれだけ増減したか」の履歴が請求・トレース・在庫照合の根拠になる。`stock_movements` を単一の履歴軸にすることで、入出庫・調整・引当を同じモデルで扱い、WMS・QR トレース・請求と一貫して接続しやすくする。

## 今後 orders / billing / trace_events へつなぐには

- **orders**: 受注に伴う引当は `stock_movements` に `movement_type = 'RESERVE'`、`source_type = 'order'`、`source_ref = order_id` のように記録する。
- **billing**: 出庫や調整の `stock_movements` を集計し、請求明細や原価計算の元データとする。
- **trace_events**: ロット・シリアル単位のトレースは、`stock_movements` に `source_type` / `source_ref` や拡張カラムで紐づけ、QR スキャン結果とリンクする。
