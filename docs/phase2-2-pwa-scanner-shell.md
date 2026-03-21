# Phase 2.2 — PWA scanner shell（手入力）

Phase 2 / 2.1 の **scan foundation**（`processScanInput`・`POST /scans`・冪等キー）を、現場向けの **最小ブラウザ UI** から使えるようにする。

## スコープ

| 含む | 含まない |
|------|----------|
| `apps/driver-app` の 1 画面・mobile-first shell | カメラ・バーコードライブラリ |
| `scanned_code` / `scan_type` ほか任意項目の手入力 | 本格オフラインキュー・高度な SW |
| クライアント生成 `idempotency_key`（再送・冪等 replay） | WMS ロケーション UI、issue 解消 UI |

## 起動

1. **DB・マイグレーション**  
   Phase 1 / 2 / 2.1 の SQL が適用済みであること（[phase2-scan-foundation.md](./phase2-scan-foundation.md)、[phase2-1-scan-idempotency.md](./phase2-1-scan-idempotency.md)）。

2. **Scan API**（`DATABASE_URL` 必須）

   ```bash
   pnpm --filter @logistics-erp/api dev:scan
   ```

   既定: `http://localhost:3040` — `POST /scans` / `GET /health`

3. **driver-app**

   ```bash
   pnpm --filter "@logistics-erp/schema" build
   pnpm --filter "@logistics-erp/driver-app" dev
   ```

   ブラウザ: `http://localhost:3002`

## API ベース URL

リポジトリルートまたは `apps/driver-app` に `.env` / `.env.local` を置き、Vite の環境変数で指定する。

```env
VITE_SCAN_API_BASE_URL=http://localhost:3040
```

未設定時のデフォルトは `http://localhost:3040`。

## ブラウザからの CORS

`driver-app` は別オリジンに `fetch` するため、scan HTTP サーバーが CORS を返す必要がある。

- 環境変数 `SCAN_CORS_ORIGIN`（既定: `*`）  
- `OPTIONS` プリフライトに **204** で応答

本番では特定オリジンへの絞り込みを推奨。

## 手入力スキャンの流れ

1. **scanned_code**（必須）にフォーカス。Enter でフォーム送信可。
2. **scan_type**（必須）。初期値例: `unload`。
3. 任意項目は「任意項目」を開いて入力（`scope_shipment_id`・`trace_id`・数量など）。
4. **スキャン送信** で `POST /scans`。結果は大きなバナー + メタ情報 + 折りたたみ JSON。

## idempotency_key（クライアント）

- **1 回の送信試行**ごとに UUID を生成し、リクエストに含める。
- **再送**ボタンは **同じキー**で POST し直す（Phase 2.1 の replay / 200 を利用）。
- **scanned_code または scan_type を変えた**あとの送信は **新しいキー**を採番する（本文が変わったのに古いキーで replay しない）。
- **次のスキャン**でキーとフォームをリセットし、次の成功パス用に新規キーを採番できる。

## 結果の見方（現場向け短語）

UI は `match.kind`・`verification.status`・`idempotency_hit` を組み合わせて表示する。

- **OK / MATCHED** — 照合一致  
- **NG / WRONG PART / WRONG LOCATION** — 不一致  
- **CHECK / SHORTAGE / EXCESS / AMBIGUOUS / UNKNOWN** — 要確認  
- **NOT FOUND** — マッチなし（`none`）  
- **RETRIED / DUPLICATE REPLAY** — 同一冪等キーで既存結果を返却  

`result_status` は `scan_events` のラベル（unique マッチ時は主に verification と一致）。

## 型（shared）

`POST /scans` 成功 JSON は `@logistics-erp/schema` の `ScanHttpPostScansSuccessBody` と揃える（`processScanInput` の戻り値構造）。

## これは scanner shell である

本画面は **Phase 2.2 の最小シェル**であり、本番現場向けの最終 UI ではない。以降の拡張候補:

- バーコード / カメラ  
- ambiguous 解消 UI  
- オフラインキュー  
- 検証フィードバックの強化  

## 関連ファイル（実装）

| 領域 | パス |
|------|------|
| UI | `apps/driver-app/src/ScannerApp.tsx`, `App.tsx`, `index.css` |
| API クライアント | `apps/driver-app/src/scanApiClient.ts` |
| 設定 | `apps/driver-app/src/config.ts`, `.env.example` |
| バナー文言 | `apps/driver-app/src/scanDisplay.ts` |
| レスポンス型 | `packages/schema/src/scanHttpResponse.ts` |
| CORS | `services/api/src/scanHttp.ts` |
