# logistics-erp — ChatGPT 共有用コンテキスト

このファイルを ChatGPT に貼り付けるか、リポジトリとあわせて「次のプロンプトで `@docs/CHATGPT_SHARE.md` を前提に」と指示してください。  
**単体でも**プロジェクトの目的・構成・データモデル・実装の前提が伝わるように書いています。

---

## 0. 現状スナップショット（要約）

| 領域 | 状態 |
|------|------|
| **モノレポ** | pnpm workspaces、Node 20+、ルート `pnpm dev` / `build` / `lint` |
| **Expected（予定）** | Phase 1 SQL + `importShipments`（`source_files` → `shipments` ヘッダ → `shipment_items`）、オプションで在庫・trace |
| **Actual（実績）最小** | Phase 2 SQL（`scan_events` / `shipment_item_progress` / `shipment_item_issues`）+ `processScanInput`（`@logistics-erp/db`） |
| **Scan HTTP** | `services/api` の `scanHttpHandler`（`GET /health`、`OPTIONS /scans`、`POST /scans`）。`pnpm --filter @logistics-erp/api dev:scan`（既定ポート 3040 系） |
| **driver-app** | Phase 2.2 手入力 scanner shell、2.3 ambiguous 解消 UI（`VITE_SCAN_API_BASE_URL`） |
| **契約テスト** | Phase 2.4 / 2.4.1: Vitest `services/api/test/scan.contract.test.ts`。DB フルは `SCAN_CONTRACT_TEST_DATABASE_URL` 設定時 |
| **CI** | `.github/workflows/scan-contract-tests.yml` — push/PR で ephemeral Postgres 15、SQL 順適用後に `pnpm --filter @logistics-erp/api test` |
| **DB の真実** | `packages/db/sql/*.sql`（Drizzle は主に生成用）。**空の Postgres** では先頭に `ci_bootstrap_minimal_shipments.sql` が必要（本番 Supabase では既存 `shipments` 前提） |

リポジトリの先頭コミットを共有するとき:

```bash
git rev-parse --short HEAD && git log -1 --oneline
```

---

## 1. プロジェクトとは何か

- **名前**: `logistics-erp`（物流 ERP / 将来は「物流 OS」）
- **目的**: EDI がない現場でも、**PDF/CSV → 構造化データ → 在庫・トレース**までつなぐ。コア思想は **Expected（予定）と Actual（実績）の分離**。
- **形態**: **pnpm モノレポ**（Node 20+、pnpm 9.14.2）
- **バックエンドデータ**: 主に **Supabase（Postgres）** + 一部 **Postgres 直結**（Phase1 の取込トランザクション用）

根拠ドキュメント（リポジトリ内）:

| ファイル | 内容 |
|----------|------|
| `PROJECT.md` / `MASTER_CONTEXT.md` | ビジョン・問題設定・パイプライン |
| `ARCHITECTURE.md` | アーキテクチャ |
| `db-schema.md` | 目標スキーマ（Expected / Actual） |
| `ROADMAP.md` / `ISSUES.md` | フェーズと Issue バックログ |
| `AI_DEVELOPMENT_GUIDE.md` | AI 支援開発の指針 |

---

## 2. リポジトリ構成（パッケージの地図）

| パス | パッケージ例 | 役割 |
|------|----------------|------|
| `apps/admin-dashboard` | Next.js | 管理 UI |
| `apps/shipper-web` | Next.js | 荷主向け Web |
| `apps/driver-app` | Vite PWA | ドライバー向け |
| `apps/api` | `@logistics-erp/api-app` | Supabase クライアント利用の TS（ライブラリ寄り） |
| `services/api` | `@logistics-erp/api` | API サービス（`tsx watch`、ルート `.env` を `loadEnv` で読込可） |
| `services/importer` | `@logistics-erp/importer` | CSV → DB（Expected + オプションで在庫・trace） |
| `packages/db` | `@logistics-erp/db` | Supabase クライアント、リポジトリ、**SQL マイグレーション置き場**、`postgres` によるトランザクション取込 |
| `packages/schema` | `@logistics-erp/schema` | 共有型・`buildTraceId` 等 |
| `packages/types` / `packages/ui` / `packages/schema`（Drizzle用） | — | 共有資産 |
| `docs/` | — | 設計メモ・フロー説明 |

ルート `pnpm dev` / `pnpm build` / `pnpm lint` がワークスペース全体に効く。

---

## 3. データパイプラインのフェーズ感

### Phase 0（既存・壊さないことを意識）

おおまかな流れ:

```text
CSV →（旧: 行単位 shipments）→ stock_movements → inventory → trace_events
```

- `shipments` は当初 **1 行 = 1 明細** 相当のデータも保持。
- `stock_movements` / `trace_events` に **`idempotency_key`** があり、再実行でも二重登録を抑止。
- `trace_id` は `@logistics-erp/schema` の **`buildTraceId(issue_no, part_no)`**（正規化ルールは `normalizeTraceToken`）。

### Phase 1（Expected Data — 実装済みの方向性）

**Expected** を正式に分離:

```text
CSV → source_files（1）→ shipments（ヘッダ 1）→ shipment_items（複数）
```

- **Actual** の最小実装は Phase 2 SQL + `processScanInput`（`scan_events` / `shipment_item_progress` / `shipment_item_issues`）。**Phase 2.2** で `driver-app` に手入力 scanner shell（`POST /scans`）あり。カメラ・本格オフラインは未実装。
- 新規 CSV 取込では `shipments` の **レガシー列**（`issue_no` / `part_no` 等）は **NULL**、明細は **`shipment_items`** に載せる。
- オプション `registerEffects: true` では **明細ごと** に在庫・trace を登録。冪等キーは **`shipment_item_id`** ベースに寄せた。

詳細: **`docs/phase1-expected-data.md`**、フロー: **`docs/importer-flow.md`**。

---

## 3b. Phase 2（Actual / スキャン最小）

- SQL: `packages/db/sql/phase2_scan_foundation.sql`（Phase 1 の後）
- `scan_events`（raw） / `shipment_item_progress`（current state） / `shipment_item_issues`（履歴）
- `processScanInput`（`@logistics-erp/db`）・詳細は [phase2-scan-foundation.md](./phase2-scan-foundation.md)
- **Phase 2.2**: [phase2-2-pwa-scanner-shell.md](./phase2-2-pwa-scanner-shell.md)（`apps/driver-app`・`ScanHttpPostScansSuccessBody`・`SCAN_CORS_ORIGIN`）
- **Phase 2.3**: [phase2-3-ambiguous-resolution-ui.md](./phase2-3-ambiguous-resolution-ui.md)（`ambiguous_candidates`・`selected_shipment_item_id`・human-in-the-loop）
- **Phase 2.4 / 2.4.1**: [phase2-4-scan-contract-tests.md](./phase2-4-scan-contract-tests.md)（Vitest・`SCAN_CONTRACT_TEST_DATABASE_URL`・CI でフル実行）

---

## 3c. CI（GitHub Actions）

- **ファイル**: `.github/workflows/scan-contract-tests.yml`
- **トリガー**: `push`, `pull_request`
- **Postgres**: `postgres:15` サービス、`logistics_test` DB、`SCAN_CONTRACT_TEST_DATABASE_URL` / `DATABASE_URL` / `NODE_ENV=test`
- **手順**: `psql` で SQL を **固定順**適用 → `@logistics-erp/schema` / `@logistics-erp/db` ビルド → `pnpm --filter @logistics-erp/api test`
- 詳細・適用順一覧は **phase2-4-scan-contract-tests.md** の「CI」節

---

## 4. SQL マイグレーション（適用順の目安）

ファイルは `packages/db/sql/`:

| 順序目安 | ファイル | 内容 |
|----------|----------|------|
| **0（空 DB / CI のみ）** | **`ci_bootstrap_minimal_shipments.sql`** | 既存 SQL が前提とする `public.shipments` の最小スキーマ。**本番 Supabase で既存テーブルがある場合は不要** |
| **前提（本番）** | 既存 `shipments` | `create_inventory_and_stock_movements.sql` が `shipments(id)` を参照 |
| 1 | `create_inventory_and_stock_movements.sql` | `inventory`, `stock_movements` |
| 2 | `create_trace_events.sql` | `trace_events` |
| 3 | `add_idempotency_keys.sql` | `idempotency_key` 列 |
| 4 | `phase0_trace_events_idempotency.sql` | trace の一意制約・冪等完成 |
| 5 | **`phase1_expected_data.sql`** | `source_files`, `shipment_items`, `shipments` 拡張, `shipment_item_id` 列, trace 部分一意インデックス |
| 6 | **`phase2_scan_foundation.sql`** | `scan_events`, `shipment_item_progress`, `shipment_item_issues` |
| 7 | **`phase2_1_scan_events_idempotency.sql`** | `scan_events.idempotency_key` + 部分 UNIQUE（再送対策） |

**Drizzle**（`packages/db/drizzle.config.ts`）は主にマイグレーション生成用で、**本番スキーマの真実は SQL ファイル + Supabase 上の DB** と捉えると安全。

---

## 5. 環境変数（実装が参照するもの）

| 変数 | 用途 |
|------|------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `@logistics-erp/db` の Supabase クライアント（在庫・trace 等） |
| `DATABASE_URL` | **Phase1** の `insertExpectedImportBundle`（`postgres` の **単一トランザクション**で Expected 一括 INSERT） |
| `SCAN_CORS_ORIGIN` | scan 最小 HTTP の CORS（`driver-app` からの `fetch` 用、既定 `*`） |
| `SCAN_CONTRACT_TEST_DATABASE_URL` | Vitest 契約テスト用。**設定時** `vitest.setup.ts` が `DATABASE_URL` をこれに差し替え、DB 依存ケースを実行（未設定なら該当テストは skip） |
| `VITE_SCAN_API_BASE_URL` | `driver-app` 用: scan API のベース URL（Vite、既定はコード側で `http://localhost:3040`） |
| （ルート）`.env` | `packages/db` の `loadEnv()` が親ディレクトリを辿って読み込み可 |

`services/api` 起動時は `@logistics-erp/db/load-env` でルート `.env` を読み、Supabase Auth の health を確認する実装あり。

---

## 6. Importer（`@logistics-erp/importer`）の要点

- **エントリ**: `importShipments(csvPath, options?)`
- **CSV 列**（現状）: `issue_no`, `supplier`, `part_no`, `part_name`, `quantity`, `due_date`
- **内部モデル**: `NormalizedShipmentLineInput`（CSV から分離）
- **制約**: **同一ファイル内で `issue_no` と `supplier` が全行一致**（1 ファイル = 1 出荷ヘッダ）
- **冪等**: ファイル全体の **SHA-256** を `source_files.checksum` とし、既存なら INSERT スキップ
- **`registerEffects: true`**: 各 `shipment_item` に対して `registerShipmentEffects`（IN 入庫・在庫加算・`SHIPPER_CONFIRMED` trace）

主要ファイル:

- `services/importer/src/importShipments.ts`
- `services/importer/src/registerShipmentEffects.ts`
- `services/importer/src/registerInitialTraceEvent.ts`
- `packages/db/src/expectedImportRepository.ts`

---

## 7. trace_id のルール（要約）

- 実装: `packages/schema/src/traceId.ts` の **`buildTraceId(issueNo, partNo)`**
- 形式: `TRC:{正規化issue}:{正規化part}`
- 正規化: trim、大文字化、空白・`/` `:` `\` 等をハイフンに寄せる（詳細は同ファイルコメント）

Phase1 では **`shipment_items.trace_id` に保存**（UNIQUE）。

---

## 8. ChatGPT に依頼するときの推奨プロンプト接頭辞

```markdown
リポジトリ logistics-erp を前提にします。
docs/CHATGPT_SHARE.md, db-schema.md, ARCHITECTURE.md を尊重してください。

Expected と Actual を混ぜないこと。
Phase 0 の idempotency（idempotency_key）を壊さないこと。
DB 変更は packages/db/sql のマイグレーションで行うこと（空 DB では ci_bootstrap → 既存の順序）。
scan / POST /scans の挙動を変える場合は services/api の契約テストと CI（scan-contract-tests.yml）が通ること。
```

---

## 9. まだやっていない / 注意してほしいこと

- **実装済み（Phase 2 系）**: DB 上の `scan_events` / progress / issues、`processScanInput`、照合エンジン（`verifyScanAgainstShipmentItem` 等）、scan 最小 HTTP、Vitest 契約テスト、CI でのフルテスト
- **未実装・薄いところ**: カメラスキャン・本格オフライン、WMS ロケーション本格マスタ、E2E（Playwright 等）、負荷試験
- **API が二系統**: `apps/api`（`@logistics-erp/api-app`）と `services/api`（`@logistics-erp/api`）が両方ある。**scan HTTP・契約テストの中心は `services/api`**。どちらを触るか README・用途で確認すること。
- **フル `pnpm build`**: 環境によって `driver-app` の PWA ビルドが失敗することがある（ワークスペース全体の成否と個別パッケージの `tsc` は切り離して判断）。

---

## 10. 共有時に添えるとよい情報

- **セクション 0** の `git rev-parse --short HEAD` 出力（どのコミット基準か）
- 触っているパス（例: `services/api`, `packages/db/sql`）
- ローカルで `pnpm --filter @logistics-erp/api test` の結果（`SCAN_CONTRACT_TEST_DATABASE_URL` の有無）

---

*この文書はリポジトリの説明用であり、秘匿情報（API キー・接続文字列）は含めないでください。*
