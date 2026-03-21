# Phase 2 — Scan / Actual 最小基盤

Expected（`shipment_items`）と Actual（`scan_events`）を **テーブルで分離**したまま、照合の最小ループを提供する。

## テーブル役割

| テーブル | 役割 |
|----------|------|
| **scan_events** | **raw fact**。現場スキャンの事実。`result_status` にその時点の照合ラベルを載せるが、集約ロジックは持たない。 |
| **shipment_item_progress** | **current state**。明細 1 件につき 1 行（`shipment_item_id` UNIQUE）。累積数量・`progress_status`・`completed_at`。 |
| **shipment_item_issues** | **mismatch 履歴**。`matched` 以外の検知を行単位で残す（`shipment_item_id` 未確定のスキャンでは行わない）。 |

## マイグレーション

Phase 1 の SQL の **後** に適用:

```text
packages/db/sql/phase2_scan_foundation.sql
```

`updated_at` は Phase 1 と同じ `set_expected_row_updated_at()` トリガを再利用。

## Expected 取込との関係

- `importShipments` 成功後（新規・checksum 冪等ヒットのいずれも）、`ensureShipmentItemProgressForShipmentId(shipment_id)` で **progress 行を冪等シード**（`ON CONFLICT DO NOTHING`）。
- Phase 0/1 の `idempotency_key`（stock / trace）には **手を入れていない**。

## scan 入力コントラクト

`@logistics-erp/schema` の `ScanInputPayload` / `validateScanInput(raw)`。

- **必須**: `scanned_code`, `scan_type`
- **任意**: `trace_id`, `scanned_part_no`, `quantity_scanned`（指定時は 1 以上の整数）, `unload_location_scanned`, `scope_shipment_id`（**マッチ範囲の限定に推奨**）, `raw_payload`, オペレータ・デバイス情報
- `scanned_at` 省略時はサーバーが現在時刻を使用

## マッチング（最小ルール）

実装: `packages/db/src/scan/matchShipmentItemForScan.ts`

1. `trace_id` がある → `shipment_items.trace_id` で検索（+ `scope_shipment_id` 指定時は `shipment_id` も一致）
2. 0 件ならフォールバック: トークン = `scanned_part_no ?? scanned_code` を `part_no` / `external_barcode` / `match_key` と **大文字・trim 比較**
3. **複数件ヒット → `ambiguous`**（先頭 1 件を選ばない）
4. **0 件 → `none`**（`scan_events` のみ `shipment_item_id = null` で保存）

## 照合エンジン（単一スキャン × 単一明細）

実装: `packages/db/src/scan/verifyScanAgainstShipmentItem.ts`

評価順: **品番** → **荷卸場**（Expected・Actual 両方に値がある場合のみ）→ **数量（累積 + 今回デルタ）**

| 結果 | 条件（概要） |
|------|----------------|
| wrong_part | スキャン側品番と `part_no` が不一致 |
| wrong_location | 両方に荷卸があり不一致 |
| shortage / excess / matched | 品番・荷卸 OK のうえ累積数量と `quantity_expected` を比較 |
| unknown | 品番相当が空など比較不能 |

- **wrong_part / wrong_location**: 累積 `quantity_scanned_total` は **増やさない**
- **matched / shortage / excess**: 今回の `quantity_scanned ?? 1` を累積に加算
- **matched** かつ累積 == 予定 → `completed_at` 設定

## サービス API

- `processScanInput(rawBody)`（`@logistics-erp/db`）: マッチ → 検証 → **単一 Postgres トランザクション**で `scan_events` + `progress` +（必要なら）`shipment_item_issues`
- 失敗時はトランザクション **ロールバック**（`ambiguous` / `none` の raw scan のみの経路もトランザクション内でコミット）

ログプレフィックス: `[logistics-erp/scan]`（`packages/db/src/scanLog.ts`）

## 最小 HTTP

```bash
pnpm --filter @logistics-erp/api dev:scan
# POST http://localhost:3040/scans  JSON body = validateScanInput 互換
```

## 今回やっていないこと

- PWA / カメラスキャン UI、本格 WMS ロケーション、スキャンの冪等キー、大量最適化、マルチテナント

## 次の候補

- PWA scanner shell、手入力 UI、trace timeline API、スキャン冪等キー、テスト整備
