# logistics-erp — 全体像（ChatGPT / 外部共有用・詳細版）

この文書は **リポジトリ現状のスナップショット** を、別チャット（ChatGPT 等）に貼り付けて文脈共有するためのものです。  
**秘密情報（API キー・接続文字列・本番 URL）は含めないでください。**

---

## 1. 一言でいうと

- **名前**: `logistics-erp`（物流向け ERP / 将来「物流 OS」）
- **形態**: **pnpm モノレポ**（Node 20+、pnpm 9.14.x）
- **バックエンド DB**: 主に **Supabase（PostgreSQL）**
- **設計の芯**: **Expected（予定・指示）と Actual（現場の実績）を混ぜない**  
  在庫のうち **部品在庫の Ledger 設計**（`inventory_transactions` 真実、`inventory_current` キャッシュ）は Phase B で明確化済み。

---

## 2. リポジトリ構成（パッケージ地図）

| パス | パッケージ名 | 役割 |
|------|----------------|------|
| `apps/admin-dashboard` | — | 管理ダッシュボード（Next.js） |
| `apps/shipper-web` | — | 荷主向け Web（Next.js） |
| `apps/driver-app` | `@logistics-erp/driver-app` | ドライバー向け **Vite PWA**。手入力スキャン UI、`POST /scans`、**Magic Link ログイン（Supabase Auth）**・`profiles` 表示 |
| `apps/api` | `@logistics-erp/api-app` | Supabase クライアント利用の薄い TS（ビルドのみのライブラリ寄り。**scan HTTP の中心ではない**） |
| `services/api` | `@logistics-erp/api` | **scan 最小 HTTP**（`scanHttpHandler`）＋ **メイン `dev` 用 HTTP**（`src/index.ts`）。`GET /health`（JSON・Supabase Auth health 含む）、`POST /scans`、`pnpm --filter @logistics-erp/api dev` |
| `services/importer` | — | CSV → Expected データ取込 |
| `services/pdf-extractor` | — | PDF 抽出（Python） |
| `packages/db` | `@logistics-erp/db` | Supabase クライアント、`processScanInput`、各種 Repository、`loadEnv` |
| `packages/schema` | `@logistics-erp/schema` | 共有型・`buildTraceId`・scan 入力検証 |
| `packages/types` / `packages/ui` | — | 共有型・UI |
| `supabase/migrations` | — | **Supabase 向け SQL migration**（init + Phase B 以降） |
| `packages/db/sql` | — | レガシー／手適用用の Phase SQL（CI や Drizzle 生成と併存） |
| `docs/` | — | 設計メモ。**短い共有用**: `CHATGPT_SHARE.md`、**本書（詳細）** |

ルート: `pnpm dev` / `pnpm build` / `pnpm lint` がワークスペース全体に効く。

---

## 3. アーキテクチャ上の主軸

### 3.1 Expected vs Actual

- **Expected**: 出荷計画・指示（`source_files` → `shipments` / `shipment_items` 等）
- **Actual**: 現場スキャン・イベント（`scan_events`、`shipment_item_progress`、`shipment_item_issues` と `processScanInput`）

詳細は `ARCHITECTURE.md`、`docs/phase1-expected-data.md`、`docs/phase2-scan-foundation.md`。

### 3.2 部品在庫（Ledger 型・Phase B）

- **`inventory_transactions`**: 在庫数量の **唯一の真実（イベントログ）**。種別: `IN` / `OUT` / `MOVE` / `ADJUST`。
- **`inventory_current`**: **集約キャッシュ**（`part_no` + `warehouse_code` + `location_code` + `inventory_type`）。
- **トリガー**: BEFORE で負在庫防止、AFTER で `current` 同期。UPDATE は **OLD undo → NEW apply**。
- **`ADJUST`**: `adjust_direction` が `INCREASE` / `DECREASE`。数量は常に非負。`trace_id` は集計キーに **含めない**。
- **`rebuild_inventory_current()`**: キャッシュ全削除後、ledger から **再集計**（監査・復旧用）。`trace_id` では group by しない。

設計メモ: `docs/db-inventory-design.md`（旧 `inventory` / `stock_movements` 系の説明も参照）。

### 3.3 流れの追跡（trace）

- **`inventory_transactions.trace_id`**: 同一物流フローを束ねる **任意の text**（nullable）。在庫集計キーではない。
- **`trace_events`**: 現場・物流イベントの履歴。**`20260405_init` で既存テーブルあり**。Phase B2-4 で列追加・イベント種別 CHECK 緩和など（`warehouse_code`、`quantity_unit`、`source_type` / `source_id` 等）。数量の真実は引き続き ledger。

### 3.4 認証・業務ユーザー（Phase B3）

- **`auth.users`**: Supabase 管理（独自 `users` テーブルは作らない）
- **`public.profiles`**: `id = auth.users.id` の 1:1 拡張
- **`public.roles` / `public.user_roles`**: ロールマスタと割当（viewer / operator / office / inventory_manager / admin を seed）
- **トリガー**: `auth.users` INSERT 後に `profiles` 自動作成（`handle_new_user`）

フロント（`driver-app`）: **Magic Link**（`signInWithOtp`）、`onAuthStateChange`、`profiles` 読取、ログアウト。RLS 本格適用は未着手。

---

## 4. Supabase migrations（`supabase/migrations/`）

ファイル名は **時系列で適用**（`supabase db reset` ローカル想定）。

| ファイル | 内容（要約） |
|----------|----------------|
| `20260405_init.sql` | 大規模 init: `inventory` / `inventory_transactions` / `inventory_current` / `trace_events` / `shipments` / `scan` 関連等、Phase B1 同期関数・負在庫トリガー |
| `202604181400_phase_b2_1_add_adjust.sql` | `ADJUST` 列・制約、`phase_b1_*` 関数の ADJUST 対応 |
| `202604181500_phase_b2_2_add_rebuild_inventory_current.sql` | `rebuild_inventory_current()` |
| `202604182200_phase_b2_3_add_trace_id_to_inventory_transactions.sql` | `inventory_transactions.trace_id` + インデックス |
| `202604182400_phase_b2_4_create_trace_events.sql` | 既存 `trace_events` の拡張（列追加・CHECK 緩和・インデックス） |
| `202604191200_phase_b3_1_add_profiles_and_roles.sql` | `profiles` / `roles` / `user_roles`、`handle_new_user` |

**注意**: `packages/db/sql/` の Phase 系 SQL と **別系統**で、リモート Supabase では **`supabase/migrations` がデプロイの主**と捉えるとよい。

---

## 5. API サービス（`services/api`）

| スクリプト | エントリ | 内容 |
|------------|----------|------|
| `pnpm --filter @logistics-erp/api dev` | `src/index.ts` | **HTTP 待受**（`PORT` / `SCAN_HTTP_PORT` / 既定 **3040**）。`GET /health`（JSON + Supabase `/auth/v1/health` 結果）、その他 **`handleScanHttp` に委譲**（`POST /scans`、`OPTIONS`、従来の scan 契約） |
| `pnpm --filter @logistics-erp/api dev:scan` | `src/scanHttp.ts` | scan のみ（同ポート既定のため **`dev` と同時起動はポート衝突**） |

- **CORS**: `SCAN_CORS_ORIGIN`、未設定時は `http://localhost:3002`（`driver-app`）。緩める場合は `*` 等。
- **契約テスト**: `services/api/test/scan.contract.test.ts`（Vitest）

---

## 6. driver-app（`apps/driver-app`）

- **スキャン API**: `VITE_SCAN_API_BASE_URL`（既定 `http://localhost:3040`）→ `GET /health`、`POST /scans`
- **Supabase Auth**: `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（**anon のみ**・service role は使わない）
- 実装: `supabaseClient.ts`、`AuthPanel.tsx`、`useAuthSession` / `useProfile` 等

---

## 7. 環境変数（よく使うもの）

| 変数 | 用途 |
|------|------|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | DB クライアント（`services/api`、`packages/db`） |
| `DATABASE_URL` | Phase1 取込の Postgres 直結トランザクション等 |
| `PORT` / `SCAN_HTTP_PORT` | API 待受ポート（3040 系） |
| `SCAN_CORS_ORIGIN` | scan / メイン API の CORS |
| `VITE_SCAN_API_BASE_URL` | driver-app → scan API |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | driver-app → Auth / `profiles` |

ルート `.env` は `loadEnv()` で各サービスから参照されやすい。

---

## 8. CI

- **`.github/workflows/scan-contract-tests.yml`**: ephemeral Postgres、`packages/db/sql` 等を順に適用 → `pnpm --filter @logistics-erp/api test`  
  詳細: `docs/phase2-4-scan-contract-tests.md`

---

## 9. ドキュメント索引（深掘り用）

| 文書 | 内容 |
|------|------|
| `README.md` | セットアップ・Phase 概要 |
| `ARCHITECTURE.md` | レイヤードアーキテクチャ（英語） |
| `docs/CHATGPT_SHARE.md` | **短い** ChatGPT 向け要約 |
| `docs/db-inventory-design.md` | 在庫テーブル設計メモ |
| `docs/trace-events-design.md` | trace_events 設計 |
| `docs/idempotency-and-trace-id.md` | 冪等・trace_id |
| `AI_DEVELOPMENT_GUIDE.md` | AI 開発フロー |

---

## 10. 未着手・薄いところ（共有時の注意）

- **RLS 本番設計**、`profiles` / `inventory` の行レベル保護はこれから積み上げ可能
- **roles による UI / API 強制**は B3-2 以降のフェーズ想定
- **カメラバーコード・本格オフライン**は driver-app 未実装寄り
- **`pnpm build` 全パッケージ**は環境により PWA ビルド等で個別に失敗することがある

---

## 11. ChatGPT に渡すときの推奨プロンプト例

```markdown
リポジトリ logistics-erp を前提にします。
docs/LOGISTICS_ERP_OVERVIEW_FOR_CHATGPT.md（または docs/CHATGPT_SHARE.md）を尊重してください。

Expected と Actual を混ぜないこと。
inventory の真実は inventory_transactions。inventory_current はキャッシュ。
部品在庫の ADJUST / rebuild / trace_id の責務分離を壊さないこと。
scan の POST /scans 契約を変える場合は services/api のテストと CI を意識すること。
```

---

## 12. リビジョン情報

文書作成時点の **migration ファイル一覧** はセクション 4 を参照。コードの真実は **リポジトリ内の該当パス** が優先です。

---

*この文書は説明用であり、認証情報を含めないでください。*
