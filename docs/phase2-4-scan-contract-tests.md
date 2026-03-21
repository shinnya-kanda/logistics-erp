# Phase 2.4 — POST /scans 契約テスト

scan 最小 HTTP（`scanHttpHandler`）と `processScanInput` の **壊してはいけない挙動** を Vitest で固定する。

## 何を保証するか

| 範囲 | 内容 |
|------|------|
| HTTP | `GET /health` 200・`OPTIONS /scans` 204 + CORS ヘッダ |
| 検証 | `scanned_code` / `scan_type` 欠如、不正 `idempotency_key` / `selected_shipment_item_id`、不正 JSON → **400** + `{ error: string }` |
| 業務（DB あり） | `matched` / `wrong_part` / `wrong_location` / `match_key` 経路の unique→`wrong_part` / **`shortage` / `excess`**（`quantity_scanned_total`・`progress_status`・issue）/ `none` / `ambiguous` |
| 照合エンジン | `verifyScanAgainstShipmentItem` の **`unknown`**（`quantity_expected` 非数値）— HTTP では通常到達しないがエンジン挙動を固定 |
| 冪等 | 同一 `idempotency_key` の再送で `scan_events` 非増殖・`progress` 非二重更新 |
| ambiguous | 候補 2 件以上・replay で候補再現 |
| Phase 2.3 | `selected_shipment_item_id` で manual 解消・`raw_payload.manual_ambiguous_resolution` |
| 冪等 + shortage | 同一 `idempotency_key` で `shortage` 応答の replay 時、`scan_events` / `progress` / `issues` が増えない |

### `none` と `unknown` の違い（POST /scans）

| | **none** | **unknown**（verify） |
|--|----------|-------------------------|
| マッチ | どの `shipment_item` にもヒットしない | 行は特定できるが数量などで照合不能 |
| `scan_events.shipment_item_id` | `null` | 通常は明細 ID あり（HTTP では稀） |
| `verification` | `null` | `status: "unknown"`（エンジンテストで固定） |

`validateScanInput` では `scanned_code` が必須のため、**品番相当が空で unknown** になるリクエストは正規の JSON では作れない。DB の `quantity_expected` は `numeric NOT NULL` のため **`Number()` が NaN になる値は通常保存できず**、`POST /scans` 経由の `unknown` は実運用ではほぼ起きない。テストでは `verifyScanAgainstShipmentItem` を直接呼び、分岐を固定している。

## 何を保証しないか（今回のスコープ外）

- Playwright 等のブラウザ E2E  
- driver-app UI  
- 負荷・パフォーマンス  
- 本番 DB への直接実行  

## 実行方法

### 1. 検証系のみ（DB 不要）

`SCAN_CONTRACT_TEST_DATABASE_URL` を **未設定**のまま:

```bash
pnpm --filter "@logistics-erp/api" test
```

`GET /health`・`OPTIONS`・`POST` のバリデーション（`processScanInput` が DB 接続前に落ちるケース）が走る。DB 依存ブロックは **skip**。

### 2. フル契約（Postgres 必須）

1. **専用**の Postgres（推奨）に Phase 0/1/2/2.1 の SQL を適用済みにする。  
2. 接続文字列を渡して実行:

```bash
export SCAN_CONTRACT_TEST_DATABASE_URL="postgresql://..."
pnpm --filter "@logistics-erp/api" test
```

`vitest.setup.ts` が `DATABASE_URL` をこの値に差し替える。**普段の開発 DB を共有するとフィクスチャの cleanup で該当 UUID 行が削除される**ため、専用 DB またはバックアップのない検証用 DB を推奨。

## フィクスチャ

| ファイル | 役割 |
|----------|------|
| `services/api/test/fixtures/scanContractFixtures.ts` | 固定 UUID の `source_files` / `shipments` / `shipment_items` / `shipment_item_progress` の seed と cleanup |
| `services/api/test/helpers/testScanServer.ts` | ランダムポートで `handleScanHttp` を起動 |
| `services/api/test/helpers/httpScanClient.ts` | `fetch` ラッパ |

`idempotency_key` は `contract-test*` プレフィックスで掃除対象に含める。

フィクスチャ明細の役割（`scanContractFixtures.ts`）:

- **MATCH-IDEM** — 冪等 replay 専用  
- **MATCH-001** — 正常 matched  
- **EXT-BAR-WP** / **WP-INTERNAL** — `external_barcode` 経由マッチ → wrong_part  
- **LOC-001** — wrong_location  
- **CONTRACT-MK-LOOKUP** / **REAL-MK-PN** — `match_key` 経由マッチ → 照合は part_no 不一致で wrong_part  
- **AMB-SAME** ×2 — ambiguous  
- **NO-SH-005**（予定 5）— 1 件スキャンで **shortage**  
- **NO-EX-006**（予定 1）— `quantity_scanned: 3` で **excess**  
- **NO-SH-IDEM**（予定 5）— **shortage** の冪等 replay 専用  

## 実装メモ

- ハンドラは `services/api/src/scanHttpHandler.ts` に切り出し、`scanHttp.ts` は listen のみ。  
- テストは **本番サーバーではなく** メモリ上の `http.Server` に同じハンドラを載せ替え。  

## 関連ドキュメント

- [phase2-scan-foundation.md](./phase2-scan-foundation.md)  
- [phase2-1-scan-idempotency.md](./phase2-1-scan-idempotency.md)  
- [phase2-2-pwa-scanner-shell.md](./phase2-2-pwa-scanner-shell.md)  
- [phase2-3-ambiguous-resolution-ui.md](./phase2-3-ambiguous-resolution-ui.md)  
