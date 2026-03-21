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
| `packages/ui` | 共通UIコンポーネント |
| `packages/types` | 共通型定義 |
| `docs` | ドキュメント |

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

共有パッケージ（db, types, ui）を先にビルドします。

```bash
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
- 最小 HTTP: `pnpm --filter @logistics-erp/api dev:scan` → `POST http://localhost:3040/scans`（JSON は `validateScanInput` 互換）
- 冪等: リクエストに `idempotency_key`（非空・512 文字以内）を付与。SQL: `phase2_1_scan_events_idempotency.sql`。詳細は [docs/phase2-1-scan-idempotency.md](docs/phase2-1-scan-idempotency.md)。新規 **201** / 再送 replay **200**。

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

# ドライバーアプリ PWA（http://localhost:3002）
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

## ライセンス

Private
