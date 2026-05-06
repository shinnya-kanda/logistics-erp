# Trace ID DB Design（Phase B7-68）

作成日: 2026-05-06

---

## ■ 目的

このドキュメントは、`trace_id` をDBへ段階導入するための設計メモである。

Phase B7-67 の `docs/trace-id-design.md` では、`trace_id` を「業務単位の追跡キー」として整理した。本ドキュメントでは、将来 migration を作る前段階として、どのテーブルにどの方針で `trace_id` を付与するかを整理する。

今回は設計のみを行い、migration・実装・Edge Function・RPC・UI は変更しない。

---

## ■ trace_id を付与する対象テーブル

### inventory_transactions

優先度: 高

`inventory_transactions` は在庫数量変動の真実ログである。

`trace_id` を付与することで、1つの業務操作から発生した在庫更新を後から追跡できる。

想定用途:

- 入庫・出庫・移動・調整の発生元追跡
- scan / OCR / PDF / CSV 由来の在庫更新との接続
- 取消・補正時に元操作をたどるためのキー
- 請求確認時に「どの業務操作から発生した在庫か」を説明するための補助

### pallet_transactions

優先度: 高

`pallet_transactions` はパレット単位の操作履歴である。

`trace_id` を付与することで、パレット操作と在庫数量操作を同じ業務単位として接続できる。

想定用途:

- パレット移動と品番在庫移動の関連付け
- パレット出庫と品番単位出庫の関連付け
- パレット作成・棚移動・出庫の流れの追跡

### warehouse_location_history

優先度: 中

`warehouse_location_history` は棚番マスタ変更の監査ログである。

`trace_id` を付与することで、棚番状態変更と関連する管理操作を同じ追跡単位で確認できる。

想定用途:

- 棚番有効 / 無効切替と、その前後のパレット移動との関連確認
- 棚番登録・修正・無効化の一連操作の追跡
- admin-dashboard の操作履歴表示

### pallet_units

優先度: 低

`pallet_units` は現在状態を表すテーブルであり、履歴の真実ではない。

原則として `trace_id` の主保存先にはしない。ただし、作成元操作を簡易的にたどるための `created_trace_id` のような補助カラムは将来検討余地がある。

現時点では追加しない方針とする。

### pallet_item_links

優先度: 低

`pallet_item_links` はパレットと品番の現在または準現在の紐づきであり、履歴の主軸ではない。

原則として `trace_id` の主保存先にはしない。ただし、リンク作成元や補正元を追跡したい場合は、将来的に `created_trace_id` や `last_updated_trace_id` を検討する。

現時点では追加しない方針とする。

---

## ■ NULL許可 / NOT NULL 方針

初期導入では `trace_id` は NULL 許可とする。

理由:

- 既存データに `trace_id` が存在しない
- 既存APIを一度にすべて対応させない
- migration 適用時に既存行へ無理な backfill をしない
- 業務単位APIから段階的に対応できる

将来、主要な書き込みAPIがすべて `trace_id` に対応した後でも、すぐに NOT NULL 化しない。

NOT NULL 化は以下を満たしてから検討する。

- 既存データの backfill 方針が決まっている
- Edge Function / RPC の `trace_id` 生成・受け渡し方針が統一されている
- 業務モードごとの差分が整理されている
- 運用上、`trace_id` なしの履歴が許されない範囲が明確になっている

---

## ■ index設計

初期は検索頻度が高い履歴系テーブルから、必要最小限の index を検討する。

候補:

```sql
create index on public.inventory_transactions (trace_id);
create index on public.pallet_transactions (trace_id);
create index on public.warehouse_location_history (trace_id);
```

複合 index は検索要件が見えてから追加する。

候補:

```sql
create index on public.inventory_transactions (warehouse_code, trace_id);
create index on public.pallet_transactions (warehouse_code, trace_id);
create index on public.warehouse_location_history (warehouse_code, trace_id);
```

初期方針:

- `trace_id` 単体 index は導入候補
- `warehouse_code + trace_id` は admin-dashboard の検索要件が固まってから判断
- `created_at` や `event_at` との複合 index は履歴画面実装時に判断
- index を増やしすぎず、実際の検索パターンに合わせる

---

## ■ 既存データへの影響

初期導入は NULL 許可の追加カラムを想定するため、既存データは壊さない。

既存行の `trace_id` は NULL のまま許容する。

backfill は今回決めない。将来行う場合は、以下の単位で別 migration として検討する。

- 同じ `idempotency_key` を持つ transaction
- 同じ pallet / pallet_code 周辺の連続操作
- 同じ operator / created_at 近傍の操作
- scan / trace_events と紐づけ可能な操作

ただし、推測による backfill は誤った業務関連を作る危険がある。確実に説明できる範囲だけを対象にする。

---

## ■ migration方針（今回は作成しない）

今回 migration は作成しない。

将来 migration を作る場合は、段階的に進める。

### Step 1: nullable column 追加

候補:

```sql
alter table public.inventory_transactions
  add column if not exists trace_id text;

alter table public.pallet_transactions
  add column if not exists trace_id text;

alter table public.warehouse_location_history
  add column if not exists trace_id text;
```

### Step 2: index 追加

検索要件に応じて、`trace_id` 単体または `warehouse_code + trace_id` を追加する。

### Step 3: RPC / Edge Function 対応

業務単位APIから `trace_id` を渡し、RPC内で作成される transaction / history へ同じ値を保存する。

### Step 4: 必要に応じて backfill

既存データの追跡補助が必要な場合のみ、説明可能な範囲で行う。

### Step 5: NOT NULL 検討

十分に運用実績ができた後、必要なテーブル・業務範囲に限定して検討する。

---

## ■ Edge Functions / RPC での受け渡し方針

基本方針:

- Edge Function が業務リクエストの入口になる
- Edge Function または RPC が `trace_id` を用意する
- RPC が複数テーブルへ書き込む場合、同じ `trace_id` を各行へ保存する
- クライアントから `warehouse_code` は受け取らず、既存どおり guard 由来を維持する

候補パターン:

### パターンA: Edge Function で生成

Edge Function が `crypto.randomUUID()` などで `trace_id` を生成し、RPCへ渡す。

利点:

- APIログとDBログを同じ `trace_id` で追いやすい
- Edge Function のレスポンスに `trace_id` を含める拡張がしやすい

注意:

- 全 Edge Function で生成ルールを揃える必要がある

### パターンB: RPC で生成

RPC が内部で `trace_id` を生成する。

利点:

- DB内の1操作として完結しやすい
- 複数テーブル更新時の一貫性をDB側で保ちやすい

注意:

- Edge Function のログと紐づけるには、RPC戻り値で `trace_id` を返す必要がある

### パターンC: クライアントから受け取る

クライアントが `trace_id` を送る。

現時点では原則採用しない。

理由:

- 業務境界をクライアントに委ねすぎる
- 不正・重複・誤用のリスクがある
- `warehouse_code` と同様、重要な境界情報はサーバー側で確定する方針に合う

---

## ■ idempotency_key との関係

`trace_id` と `idempotency_key` は分離する。

`idempotency_key`:

- 同じAPIリクエストの二重実行を防ぐ
- 通信再送、二重クリック、タイムアウト後の再試行に使う
- 原則として「同一リクエストの再実行判定」に使う

`trace_id`:

- 同じ業務操作に属する複数レコードを束ねる
- transaction / history / event を横断して追跡する
- 後から業務の流れを説明するために使う

関係:

- 1つの `idempotency_key` に1つの `trace_id` が対応するケースはある
- ただし同義ではない
- `idempotency_key` を `trace_id` として流用しない
- `trace_id` を二重実行防止の判定キーとして使わない

---

## ■ 業務単位APIでの扱い

業務単位APIでは、1リクエストにつき1つの `trace_id` を持つ方針を検討する。

対象例:

- `inventory-in`
- `inventory-move`
- `inventory-out`
- `pallet-create`
- `pallet-item-add`
- `pallets-move`
- `pallets-out`
- `pallets-items-out`
- `warehouse-location-active-update`
- 将来の Expected / Actual 突合API

方針:

- 1つの業務操作で複数テーブルに書く場合、同じ `trace_id` を保存する
- 1つの業務操作が複数RPCに分かれる場合でも、同じ `trace_id` を引き回す
- `trace_id` はユーザー入力ではなく、サーバー側で確定する
- 成功レスポンスに `trace_id` を含めるかは別途検討する

---

## ■ 今後の検討事項

以下は今回決定しない。

- `trace_id` の型を `text` にするか `uuid` にするか
- Edge Function 生成と RPC 生成のどちらを標準にするか
- 既存 `trace_events.trace_id` との正式な関係
- `trace_id` をレスポンスへ返すかどうか
- admin-dashboard で `trace_id` 検索を提供するか
- 既存データの backfill を行うか
- `pallet_units` / `pallet_item_links` に補助 trace column を持たせるか
- NOT NULL 化する対象テーブルとタイミング
- ブリヂストン業務の Expected / Actual 突合でどの単位を1 `trace_id` とするか

---

## ■ 原則

`trace_id` は、業務単位を説明するための追跡キーである。

既存の主キー、`transaction_id`、`idempotency_key`、`warehouse_code`、`project_no`、`issue_no` の意味を上書きしない。

DB導入は nullable column から段階的に行い、既存データと既存仕様を壊さない。
