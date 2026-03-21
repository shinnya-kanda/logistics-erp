# Phase 2.3 — ambiguous 解消 UI（human-in-the-loop）

トークンや trace が複数の `shipment_items` にヒットしたとき、**システムは 1 件を自動確定しない**（unsafe）。現場ユーザーが候補を確認し、**1 件を明示選択**して照合を続けるための最小フロー。

## ambiguous とは

- `matchShipmentItemForScan` が **複数明細**にマッチしたとき `match.kind === "ambiguous"`。
- `scan_events` には `shipment_item_id = null` のまま **raw fact として保存**される（Phase 2 既存方針）。
- 応答には **`ambiguous_candidates`**（または `match.candidates`）に候補の最小情報が載る。

## なぜ自動 1 件にしないか

誤った明細への紐付けは **在庫・進捗・issue** に直結するため、**人の確認**を挟む。

## フロー（PWA / API 共通）

1. **初回 POST /scans**（`idempotency_key` = K1）  
   - 結果が `ambiguous` → 候補一覧を表示。  
   - 同一 K1 の再送は **冪等 replay**（同じ候補・同じ `scan_event`）。

2. **候補から 1 件を選ぶ**（driver-app の「これで再照合」）  
   - **`selected_shipment_item_id`** を付けて **新しい `idempotency_key`（K2）** で POST する。  
   - K1 と K2 を混同しない（初回 ambiguous と「確定再送」は別リクエスト）。

3. **バックエンド**  
   - `selected_shipment_item_id` がある場合、**自動マッチより優先**してその明細を取得し `verifyScanAgainstShipmentItem` を実行。  
   - `scope_shipment_id` が付いているとき、選択明細がその出荷に属することを検証（不一致は 400）。

4. **成功時**  
   - 通常どおり `scan_events` + `progress` +（必要なら）`issues`。  
   - `raw_payload.manual_ambiguous_resolution: true` でログ・UI から追跡可能。

## 入力コントラクト

`@logistics-erp/schema` の `ScanInputPayload`：

| フィールド | 役割 |
|------------|------|
| `selected_shipment_item_id` | 任意。UUID。空文字は不可。指定時はその明細で照合。 |

## ログ（プレフィックス `[logistics-erp/scan]`）

- `scan ambiguous candidates returned` — 候補件数
- `scan manual ambiguous resolution requested` — 明示選択の受付
- `scan manual ambiguous resolution — verifying selected item` — 検証開始
- `scan manual ambiguous resolution success` — トランザクション成功
- `scan manual ambiguous resolution failed` — 明細なし / スコープ不一致 / トランザクション失敗

## 型（shared）

| 型 | 場所 |
|----|------|
| `AmbiguousScanCandidate` | `packages/schema/src/ambiguousScanCandidate.ts` |
| `ShipmentItemMatchResult`（ambiguous に `candidates`） | `packages/schema/src/verificationResult.ts` |
| `ScanHttpPostScansSuccessBody.ambiguous_candidates` | `packages/schema/src/scanHttpResponse.ts` |

## 実装の所在

| 領域 | パス |
|------|------|
| 候補付きマッチ | `packages/db/src/scan/matchShipmentItemForScan.ts` |
| manual 解決 + 応答 | `packages/db/src/scan/processScanInput.ts` |
| replay 復元 | `packages/db/src/scan/scanIdempotency.ts` |
| UI | `apps/driver-app/src/ScannerApp.tsx`, `scanDisplay.ts` |

## 今回やっていないこと

- 候補の自動ランキング・ML  
- オフラインキュー、カメラ  
- issue ワークフロー全体、WMS ロケーション  

## 関連

- [phase2-scan-foundation.md](./phase2-scan-foundation.md)  
- [phase2-1-scan-idempotency.md](./phase2-1-scan-idempotency.md)  
- [phase2-2-pwa-scanner-shell.md](./phase2-2-pwa-scanner-shell.md)  
