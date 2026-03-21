# Phase 1 — Expected Data（出荷予定）

Phase 1 では **Actual（スキャン実績）とは分離した「出荷予定」** を DB で正式に扱えるようにする。

## テーブル役割

| テーブル | 役割 |
|----------|------|
| **source_files** | 取込ファイルの監査ルート。`checksum`（SHA-256）で冪等再実行を識別する。 |
| **shipments** | **Expected ヘッダ**（1 取込ファイルにつき 1 行想定）。`source_file_id` でファイルと 1:1。Phase 0 互換のため、行単位のレガシー列（`issue_no` / `part_no` 等）は残しつつ、新規取込では NULL。 |
| **shipment_items** | **Expected 明細**。品目・数量・`trace_id`（`buildTraceId(issue_no, part_no)`）を保持。将来の `scan_events` / 検品はここに接続する。 |

## マイグレーション

Supabase / Postgres で次を **Phase 0 スクリプトの後** に適用する。

```text
packages/db/sql/phase1_expected_data.sql
```

- `source_files` / `shipment_items` の作成
- `shipments` の拡張（ヘッダ用カラム、レガシー列の NULL 許容）
- `updated_at` 用トリガ（`set_expected_row_updated_at`）
- `stock_movements.shipment_item_id` / `trace_events.shipment_item_id` と、trace の **部分一意インデックス**（レガシー: `shipment_item_id IS NULL`、Phase1: 明細単位）

## Importer の流れ

1. CSV を読み、**正規化モデル**（`NormalizedShipmentLineInput`）に変換する（CSV 列名から分離）。
2. **検証**: `issue_no` / `supplier` がファイル内で一致すること。`part_no` は必須。`quantity`（quantity_expected）は **1 以上の整数**。CSV 必須列の存在チェック（ヘッダ）。UTF-8 BOM 付きヘッダはキー正規化で吸収。
3. ファイルの **SHA-256 checksum** を計算する。既に `source_files.checksum` に存在すれば **INSERT せず** 既存の `shipments` / `shipment_items` を返す（冪等）。
4. 未登録なら **`DATABASE_URL` 経由の単一トランザクション**で `source_files` → `shipments`（ヘッダ）→ `shipment_items` を挿入。失敗時はロールバック。
5. オプション `registerEffects: true` のとき、**明細ごと**に `stock_movements` / `inventory` / `trace_events` を登録。冪等キーは `shipment_item_id` ベース（Phase 0 の行 id ベースと互換）。

## 環境変数

- **Supabase API**（在庫・trace 登録）: `SUPABASE_URL`, `SUPABASE_ANON_KEY`（既存どおり）
- **Expected バンドル insert**（トランザクション）: **`DATABASE_URL`**（Postgres 直接接続。Supabase の *Connection string* / Direct を推奨）

## 今回やらないこと（スコープ外）

- `scan_events` / `shipment_item_progress` / `shipment_item_issues`
- PWA・検証エンジン
- 倉庫ロケーション / WMS マスタ

## 次の Issue 候補

- Issue 014: `scan_events`（Actual）
- Issue 015: `shipment_item_progress`
- Issue 016: `shipment_item_issues`
- Issue 017: progress seed
- WMS 化は別フェーズとしてロードマップに切り出し
