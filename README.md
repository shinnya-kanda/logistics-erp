# 物流ERP (Logistics ERP)

pnpm モノレポで構成された物流向けERPシステムです。

## 構成

| パス | 説明 |
|------|------|
| `apps/admin-dashboard` | 管理ダッシュボード（Next.js） |
| `apps/shipper-web` | 荷主向けWeb（Next.js） |
| `apps/driver-app` | ドライバー向けPWA |
| `services/api` | Supabase連携 TypeScript API サービス |
| `services/pdf-extractor` | PDF抽出 Python サービス |
| `packages/db` | DBスキーマ・マイグレーション（Drizzle） |
| `packages/schema` | 共有型（scan 入力・HTTP 応答など） |
| `packages/ui` | 共通UIコンポーネント |
| `packages/types` | 共通型定義 |
| `docs` | ドキュメント（**ChatGPT 等への現状説明**: [短い版](docs/CHATGPT_SHARE.md) / [**全体像・詳細版（ダウンロード共有向け）**](docs/LOGISTICS_ERP_OVERVIEW_FOR_CHATGPT.md)） |

## 設計方針

このプロジェクトは、通常のCRUDアプリではなく  
物流業務におけるトランザクション中心設計を採用しています。

詳細は以下を参照してください：

- [ERP設計憲法.md](./ERP設計憲法.md)
- [開発ルール.md](./開発ルール.md)

## 必要環境

- **Node.js** 20 以上
- **pnpm** 9 以上（`corepack enable && corepack prepare pnpm@latest --activate` で有効化）
- **Python** 3.11 以上（pdf-extractor 利用時）

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd logistics-erp
```

### 2. pnpm の有効化（未導入の場合）

```bash
corepack enable
corepack prepare pnpm@9.14.2 --activate
```

### 3. 依存関係のインストール

```bash
pnpm install
```

### 4. パッケージのビルド

共有パッケージ（schema, db, types, ui）を先にビルドします。

```bash
pnpm --filter "@logistics-erp/schema" build
pnpm --filter "@logistics-erp/types" build
pnpm --filter "@logistics-erp/db" build
pnpm --filter "@logistics-erp/ui" build
```

または一括ビルド:

```bash
pnpm build
```

### 5. 環境変数の設定

各アプリ・サービスで必要な環境変数を設定します。

**services/api（Supabase）**

リポジトリ直下の `.env` に次を書けば、`@logistics-erp/api` 起動時に自動で読み込まれます（`@logistics-erp/db/load-env`）。

別途 `services/api/.env` を置いても構いません。

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**packages/db（マイグレーション実行時）**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/logistics_erp
```

**Phase 1 Expected 取込（`importShipments` のトランザクション insert）**

`source_files` / `shipments` / `shipment_items` への一括登録は Supabase クライアントではなく **Postgres 直結**で行う。`DATABASE_URL` に Supabase の *Direct connection* 等を設定すること。

マイグレーション SQL: `packages/db/sql/phase1_expected_data.sql`（Phase 0 適用後に実行）。概要は [docs/phase1-expected-data.md](docs/phase1-expected-data.md)。

**Phase 2 Actual / スキャン最小基盤**

- SQL: `packages/db/sql/phase2_scan_foundation.sql`（Phase 1 の後に実行）
- 説明: [docs/phase2-scan-foundation.md](docs/phase2-scan-foundation.md)
- 最小 HTTP: `pnpm --filter @logistics-erp/api dev:scan` → `POST http://localhost:3040/scans`（JSON は `validateScanInput` 互換）。ブラウザから `driver-app` を使う場合は CORS 用に `SCAN_CORS_ORIGIN`（既定 `*`）を参照。
- 冪等: リクエストに `idempotency_key`（非空・512 文字以内）を付与。SQL: `phase2_1_scan_events_idempotency.sql`。詳細は [docs/phase2-1-scan-idempotency.md](docs/phase2-1-scan-idempotency.md)。新規 **201** / 再送 replay **200**。
- **Phase 2.2** 手入力 scanner shell（`apps/driver-app`）: [docs/phase2-2-pwa-scanner-shell.md](docs/phase2-2-pwa-scanner-shell.md)。環境変数 `VITE_SCAN_API_BASE_URL`（既定 `http://localhost:3040`）。カメラ・バーコードは未対応。
- **Phase 2.3** ambiguous 解消（候補表示 + `selected_shipment_item_id`）: [docs/phase2-3-ambiguous-resolution-ui.md](docs/phase2-3-ambiguous-resolution-ui.md)。候補確定の再送は **新しい idempotency_key** を使用。
- **Phase 2.4** `POST /scans` / `GET /health` 契約テスト: [docs/phase2-4-scan-contract-tests.md](docs/phase2-4-scan-contract-tests.md)（`pnpm --filter "@logistics-erp/api" test`）。

**Phase 1 在庫・パレット・請求根拠（イベント中心・最小スキーマ）**

- SQL: `packages/db/sql/phase1_inventory_pallet_billing.sql`（上記 Phase 系 SQL 適用後に実行）。`inventory_transactions` / `pallet_units` / `pallet_transactions` / `pallet_item_links` / `billing_segments` / `billing_monthly` を追加するのみ。既存テーブルは変更しない。
- 画面スコープの整理: [docs/inventory-spa-pwa-screen-definition.md](docs/inventory-spa-pwa-screen-definition.md)。前提資料: ルートの `INVENTORY_CONTEXT.md`。

### CI（GitHub Actions）

`push` / `pull_request` のたびに [`.github/workflows/scan-contract-tests.yml`](.github/workflows/scan-contract-tests.yml) が実行され、**ジョブ専用の ephemeral Postgres 15**（`logistics_test`）を立て、`packages/db/sql` を定義順に `psql` で適用したうえで **`pnpm --filter "@logistics-erp/api" test`** を走らせます。接続は `SCAN_CONTRACT_TEST_DATABASE_URL`（および `DATABASE_URL`）で渡します。空の DB では `shipments` が無いため、先頭に `ci_bootstrap_minimal_shipments.sql` を当てます。手順の詳細は [docs/phase2-4-scan-contract-tests.md](docs/phase2-4-scan-contract-tests.md#ci-github-actions) を参照。

### 6. データベースのマイグレーション（任意）

PostgreSQL を用意し、スキーマを適用する場合:

```bash
# マイグレーションSQLの生成
pnpm db:generate

# マイグレーションの実行（DATABASE_URL を設定した上で）
pnpm db:migrate
```

### 7. 開発サーバーの起動

**フロントエンドのみ**

```bash
# 管理ダッシュボード（http://localhost:3000）
pnpm --filter "@logistics-erp/admin-dashboard" dev

# 荷主Web（http://localhost:3001）
pnpm --filter "@logistics-erp/shipper-web" dev

# ドライバーアプリ PWA（http://localhost:3002）— 事前に schema をビルド推奨
pnpm --filter "@logistics-erp/schema" build
pnpm --filter "@logistics-erp/driver-app" dev
```

**API サービス**

```bash
pnpm --filter "@logistics-erp/api" dev
```

**全アプリを並列で起動**

```bash
pnpm dev
```

### 8. pdf-extractor（Python）のセットアップ（任意）

```bash
cd services/pdf-extractor
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
```

## スクリプト一覧

| コマンド | 説明 |
|----------|------|
| `pnpm install` | 全ワークスペースの依存関係をインストール |
| `pnpm build` | 全パッケージ・アプリをビルド |
| `pnpm dev` | 各パッケージの `dev` を並列実行 |
| `pnpm db:generate` | Drizzle マイグレーションSQLを生成 |
| `pnpm db:migrate` | マイグレーションを実行 |
| `pnpm lint` | 全ワークスペースで lint 実行 |
| `pnpm --filter "@logistics-erp/api" test` | Scan 最小 HTTP の契約テスト（Vitest）。DB フルは `SCAN_CONTRACT_TEST_DATABASE_URL` 参照 [docs/phase2-4-scan-contract-tests.md](docs/phase2-4-scan-contract-tests.md)。同コマンドが CI（ephemeral Postgres）でも実行される |

## ライセンス

Private
