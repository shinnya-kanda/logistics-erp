# Phase 2.1 — Scan 冪等性（idempotency_key）

## 目的

クライアントの **再送・二重 POST・通信不安定** でも、`scan_events` の raw fact が同一リクエストで増殖せず、`shipment_item_progress` / `shipment_item_issues` が **二重更新**されないようにする。

## 仕組み

1. **リクエスト**に任意で `idempotency_key`（非空文字列、最大 512 文字）を付与する。
2. **`scan_events.idempotency_key`** に保存する。
3. **部分一意インデックス** `uq_scan_events_idempotency_key`（`idempotency_key IS NOT NULL`）が DB の最終防衛線。
4. **`processScanInput`**:
   - キーあり → 先に `SELECT` で既存行があれば **replay**（progress/issue を再実行しない）。
   - なければ通常 INSERT。`23505` 一意違反時は **競合リカバリ**で既存行を再読込し replay（正常系）。
5. **キーなし** → Phase2 当初どおり **非冪等**（毎回新規 `scan_events` 行）。

## マイグレーション

Phase 2 の SQL の **後** に適用:

```text
packages/db/sql/phase2_1_scan_events_idempotency.sql
```

## HTTP 応答（`scanHttp`）

| 状況 | HTTP | 備考 |
|------|------|------|
| 新規 `scan_events` 作成 | **201** | `created_new_scan: true`, `idempotency_hit: false` |
| 既存キーで replay | **200** | `idempotency_hit: true`, `created_new_scan: false` |

検証エラーは **400**（従来どおり）。

## Replay 応答の内容

- `scanEvent`: 既存行（`idempotency_key` 含む）
- `match`: `raw_payload.match_kind` / `shipment_item_id` から復元
- `progress`: `shipment_item_id` があるとき現在の progress を再読込
- `verification` / `issue`: **null**（再検証・再挿入は行わない）

## ambiguous / none

`shipment_item_id = null` のスキャンも **`idempotency_key` が同じなら 1 行に集約**。progress/issue は元々無いのでそのまま。

## ログ（`[logistics-erp/scan]`）

- `scan request without idempotency key (non-idempotent)`
- `scan idempotency hit (duplicate replay returned)`
- `scan unique conflict recovered`
- `scan idempotent insert success` / `scan idempotent insert success (scan-only path)`

## 実装の所在

| 項目 | パス |
|------|------|
| 入力・検証 | `packages/schema/src/scanInput.ts` |
| DB 行型 | `packages/schema/src/scanPhase2.ts`（`idempotency_key`） |
| 返却型 | `packages/db/src/scan/processScanTypes.ts` |
| 検索・replay 組み立て | `packages/db/src/scan/scanIdempotency.ts` |
| オーケストレーション | `packages/db/src/scan/processScanInput.ts` |

## 手動テスト観点（DB 接続あり）

1. 新規 scan + `idempotency_key` → 201、行 1 件
2. 同一キー再送 → 200、`idempotency_hit: true`、行数増えない
3. 並行で同一キー → いずれか 1 件のみ残り、もう一方は replay
4. ambiguous + 同一キー再送 → scan 1 件のみ
5. キー未指定を 2 回 → scan 2 行（非冪等）
6. replay 後 progress の `quantity_scanned_total` が増えていないこと

## 今回やらないこと

- 類推による「ほぼ同じ」リクエストの dedup
- 分散キュー・リージョン跨ぎの一意性
- API 側の自動キー採番（将来検討可）
