# B7-59 事前メモ：管理画面の在庫表示整理

## 現在の問題

Edge Functions（inventory 系）は正しく動作しているが、管理画面の表示において以下のズレが発生している。

### 現象

- `inventory_current` 上では在庫が存在している
- しかし管理画面では「出庫済み（OUT）」として表示される

### 原因

以下の責務が混在しているため。

- `inventory_current`
  - 品番 × 棚番の真実在庫（source of truth）
- `pallet_units` / `pallet_item_links`
  - パレット単位の状態管理（OUT / ACTIVE）
- 管理画面
  - pallet 状態を在庫として表示してしまっている

## 問題の本質

text inventory_current と pallet 状態が混在している。

## 正しい設計（B7-59で修正）

画面を責務ごとに分離する。

### 1. 在庫台帳（正）

- データ源：`inventory_current`
- 表示単位：品番 × 棚番
- 用途：在庫確認

### 2. パレット在庫明細

- データ源：`pallet_units` + `pallet_item_links`
- 表示単位：パレット
- 用途：現品管理

### 3. 出庫済みパレット一覧

- データ源：`pallet_units`
- 条件：`current_status = 'OUT'`
- 用途：履歴確認

## 重要な原則

text inventory_current は常に真実。pallet は状態ビュー。

## 対応タイミング

text B7-59：管理画面の在庫表示整理。

※ B7-55〜58 では修正しない（ロジックと UI を分離するため）。

## 補足

今回の現象はバグではなく、text 表示設計の未整理によるズレである。
