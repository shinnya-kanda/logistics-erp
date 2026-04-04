# 在庫・パレット SPA / PWA 画面構成（Phase 1 定義）

作成日: 2026-04-05  
前提: [INVENTORY_CONTEXT.md](../INVENTORY_CONTEXT.md)（在庫＝イベント、請求＝後計算、部品とパレット分離）

本ドキュメントは **実装前の画面スコープ合意** 用です。凝った UI 仕様は Phase 2 以降とし、ここでは **何をどのチャネルで見る／入力するか** に限定します。

---

## 役割分担

| チャネル | 利用者 | 主目的 |
|----------|--------|--------|
| **SPA**（ブラウザ・事務所／管理者） | 事務・管理者 | 照会、一覧、集計確認、CSV 出力想定 |
| **PWA**（スマホ・現場） | 倉庫作業者 | 入庫・移動・出庫・紐付けの即時登録 |

---

## SPA（事務所 / 管理者）

### 1. 在庫ダッシュボード

- 在庫種別（`project` / `mrp`）ごとの件数サマリ
- パレット保管数（`pallet_units` の `stored` 等に基づく想定）
- 本日の入庫／出庫件数（`inventory_transactions` / `pallet_transactions` の当日フィルタ）
- 当月請求見込み（`billing_segments` または `billing_monthly` のドラフト参照）

### 2. パレット一覧

表示項目の目安:

- `pallet_no`
- `status`
- `warehouse_code` / `location_code`
- `received_at`
- `storage_area_tsubo`（既定 0.5 坪 × パレット）

### 3. パレット詳細

- 基本情報（`pallet_units`）
- パレット履歴（`pallet_transactions`）
- 紐づく部品一覧（`pallet_item_links`）
- 請求根拠セグメント（`billing_segments` で `reference_type = pallet_unit` 等）

### 4. 部品在庫照会

- `part_no` 検索
- `project` / `mrp` の切替（`inventory_type`）
- ロケーション別の数量イメージ（イベント集約または将来のビュー）
- 関連パレット（`pallet_item_links` 経由）

### 5. 入出庫履歴

- `inventory_transactions` 一覧（部品イベント）
- `pallet_transactions` 一覧（パレットイベント）
- 必要に応じて期間・倉庫・種別で絞込

### 6. 請求セグメント一覧

- `billing_segments` 一覧
- 月（`billing_month`）、顧客イメージ、請求種別（`billing_type`）で絞込

### 7. 月次請求確認

- `billing_monthly` 一覧
- 月次集計の確認（ステータス: 草案〜確定）
- CSV 出力の想定（確定後エクスポート）

---

## PWA（現場）

### 1. ホーム

ショートカット:

- 入庫（パレット）
- 出庫（パレット）
- 移動（パレット）
- パレットと部品の紐付け

### 2. パレット入庫登録

- `pallet_no` 入力またはスキャン（将来）
- `inventory_type`（`project` / `mrp`）
- `warehouse_code` / `location_code`
- 受領時刻（`received_at`）
- 保存 → `pallet_units` 作成および `pallet_transactions`（例: `receive`）

### 3. パレット移動登録

- `pallet_no` / スキャン
- 移動元／移動先ロケーション
- 保存 → `pallet_transactions`（例: `move`）

### 4. パレット出庫登録

- `pallet_no` / スキャン
- 出庫時刻
- 保存 → `pallet_transactions`（例: `ship`）、`pallet_units.status` 更新想定

### 5. 部品紐付け登録

- `pallet_no`（またはパレット選択）
- `part_no`
- `quantity`
- 単位（`quantity_unit`、通常 `part`）
- 保存 → `pallet_item_links`

### 6. 簡易履歴確認

- 直近の登録結果（成功／失敗）
- エラーメッセージ表示（API／オフラインは後続）

---

## 小松金沢向け優先ユースケース

運用上の正本フローは次の順です。画面構成もこの順で辿れることが重要です。

1. **パレット入庫** — 先にパレット単位で現物をシステムに載せる  
2. **保管量発生** — 1 パレットあたり **0.5 坪** を `storage_area_tsubo` 等で保持し、請求セグメントの根拠に接続可能にする  
3. **後で部品紐付け** — タイミングが遅れても `pallet_item_links` で追記可能  
4. **月次請求集計** — `billing_segments` にイベントを貯め、`billing_monthly` に月次で集約（計算エンジンは後段）

---

## 関連 DB オブジェクト（参照）

| 画面の関心 | テーブル |
|------------|----------|
| 部品在庫イベント | `inventory_transactions` |
| パレット実体 | `pallet_units` |
| パレットイベント | `pallet_transactions` |
| パレット⇔部品 | `pallet_item_links` |
| 請求根拠 | `billing_segments` |
| 月次集計 | `billing_monthly` |

既存の `inventory`（現在庫集約）、`stock_movements`、`trace_events` は Phase 1 では置換せず、**並行して**本イベント系テーブルを育てる前提です。
