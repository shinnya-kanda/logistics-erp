# 在庫フロー

```
shipments
    ↓
stock_movements
    ↓
inventory
```

在庫 ERP は **「在庫移動ログ中心」** で設計する。

- **shipments**: 取込元データ（CSV/PDF など）
- **stock_movements**: 入庫(IN) / 出庫(OUT) / 調整 / 引当 / 引当解除の履歴
- **inventory**: 現在庫の集約（on_hand_qty, allocated_qty, available_qty）

すべての在庫変動は `stock_movements` に記録し、その結果を `inventory` に反映する。
