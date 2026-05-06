# Trace ID Migration Plan（Phase B7-69）

作成日: 2026-05-06

---

## ■ 目的

このドキュメントは、`trace_id` をDB・RPC・Edge Function へ段階的に導入するための migration 計画である。

Phase B7-67 / B7-68 では、`trace_id` の役割とDB設計方針を整理した。本ドキュメントでは、実際に migration を作る前段階として、適用順序・nullable期間・backfill・index・rollback・既存APIへの影響を整理する。

今回は計画のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ 基本方針

`trace_id` は、業務単位を後から説明するための追跡キーである。

導入時は以下を守る。

- 既存仕様を壊さない
- 既存データを破壊しない
- 既存APIのレスポンス形式を急に変えない
- nullable column から始める
- backfill は推測で行わない
- index は検索要件に合わせて段階追加する
- `idempotency_key` と混同しない

---

## ■ migration適用順序

### Step 0: 設計確認

実装前に以下を確認する。

- `trace_id` の型
- 追加対象テーブル
- Edge Function / RPC の生成・受け渡し方針
- 既存 `trace_events` との関係
- admin-dashboard で検索・表示するかどうか

この Step 0 は設計確認であり、migration は作らない。

### Step 1: nullable column 追加

最初の migration では、履歴系テーブルに nullable な `trace_id` を追加する。

候補:

```sql
alter table public.inventory_transactions
  add column if not exists trace_id text;

alter table public.pallet_transactions
  add column if not exists trace_id text;

alter table public.warehouse_location_history
  add column if not exists trace_id text;
```

この段階では、既存API / RPC / Edge Function はまだ `trace_id` を必ず書かなくてもよい。

### Step 2: 新規書き込みAPIから順次対応

業務単位APIごとに、`trace_id` を生成または受け渡す。

優先候補:

- `warehouse-location-active-update`
- `pallet-create`
- `pallet-item-add`
- `pallets-move`
- `pallets-out`
- `pallets-items-out`
- `inventory-in`
- `inventory-move`
- `inventory-out`

既存レスポンス形式は急に変えず、必要なら後続フェーズで `trace_id` を返す。

### Step 3: RPC 内の複数書き込みを trace_id で接続

RPC が複数テーブルへ書き込む場合、同じ `trace_id` を各行へ保存する。

例:

- `warehouse_locations` 更新と `warehouse_location_history` 追加
- `pallet_units` 更新と `pallet_transactions` 追加
- `inventory_transactions` と `pallet_transactions` の同時発生

### Step 4: index 追加

実際の検索要件が見えた段階で index を追加する。

初期候補:

```sql
create index if not exists idx_inventory_transactions_trace_id
  on public.inventory_transactions (trace_id);

create index if not exists idx_pallet_transactions_trace_id
  on public.pallet_transactions (trace_id);

create index if not exists idx_warehouse_location_history_trace_id
  on public.warehouse_location_history (trace_id);
```

複合 index は admin-dashboard の検索条件が固まってから検討する。

### Step 5: backfill 検討

既存データへ `trace_id` を補完するかどうかを検討する。

原則として、説明できない推測 backfill は行わない。

### Step 6: NOT NULL 化検討

主要書き込みAPIが `trace_id` に対応し、運用実績が十分にできた後、必要な範囲だけ NOT NULL 化を検討する。

初期段階では NOT NULL 化しない。

---

## ■ nullable期間

`trace_id` は当面 nullable とする。

理由:

- 既存データに `trace_id` がない
- 既存APIを一括変更しない
- 段階的に Edge Function / RPC を対応する
- 業務モードごとの扱いをまだ決め切らない
- backfill の正確性を保証できない

nullable期間中の扱い:

- 新規対応済みAPIは `trace_id` を保存する
- 未対応APIの行は `trace_id = null` を許容する
- 検索画面では `trace_id` がない行も表示対象から除外しない
- `trace_id` の有無をデータ正当性の判定に使わない

---

## ■ 既存データのbackfill方針

backfill は別フェーズで検討する。

候補:

- 同じ `idempotency_key` を持つ行に同じ `trace_id` を付与
- 同じ `pallet_code` / `pallet_id` で近接時刻に発生した操作をまとめる
- `trace_events` と確実に紐づく行へ付与
- scan API 由来で同じ入力イベントに属する行へ付与

注意:

- 時刻が近いだけで同じ業務操作とは限らない
- 同じ operator でも別操作の可能性がある
- 推測 backfill は監査上の誤解を生む
- 確実に説明できる範囲だけを対象にする

初期方針:

- 既存行は NULL のまま許容する
- 新規処理から `trace_id` を保存する
- backfill は必要性が明確になってから行う

---

## ■ index追加タイミング

index は column 追加と同時に必ず入れるとは限らない。

追加タイミング:

1. `trace_id` を保存するAPIが増える
2. admin-dashboard などで `trace_id` 検索が必要になる
3. 運用上、調査・監査で `trace_id` 検索が頻繁になる

初期候補:

- `inventory_transactions(trace_id)`
- `pallet_transactions(trace_id)`
- `warehouse_location_history(trace_id)`

将来候補:

- `inventory_transactions(warehouse_code, trace_id)`
- `pallet_transactions(warehouse_code, trace_id)`
- `warehouse_location_history(warehouse_code, trace_id)`
- `inventory_transactions(trace_id, event_at)`
- `pallet_transactions(trace_id, occurred_at)`
- `warehouse_location_history(trace_id, created_at)`

方針:

- 最初から複合 index を増やしすぎない
- 検索条件が固まってから追加する
- 大量データ化した後の index 追加は負荷に注意する

---

## ■ rollback方針

`trace_id` 導入は段階的に行うため、rollback も段階ごとに考える。

### column追加 migration の rollback

nullable column の追加のみであれば、既存仕様への影響は小さい。

ただし、一度書き込まれた `trace_id` を削除すると追跡情報が失われるため、安易に drop column しない。

原則:

- まず Edge Function / RPC 側の `trace_id` 利用を停止する
- 次に index を削除する
- 最後に column 削除を検討する

### index追加 migration の rollback

index は比較的戻しやすい。

検索性能への影響を確認した上で、必要なら `drop index if exists` で戻す。

### RPC / Edge Function 対応の rollback

レスポンス形式を変えずに内部だけ `trace_id` 保存している場合、既存UIへの影響は小さい。

rollback する場合は、`trace_id` 引数を使わない旧処理へ戻すのではなく、互換的に `trace_id` を null 許容する実装にする。

---

## ■ 既存API / RPC / Edge Functionsへの影響

初期 migration では nullable column を追加するだけなので、既存APIへの影響は出さない。

影響を抑える方針:

- request body に `trace_id` 必須を追加しない
- 既存レスポンスに必須フィールドとして `trace_id` を追加しない
- RPC引数に追加する場合は default null を検討する
- Edge Function では未対応APIを無理に変更しない
- `warehouse_code` は引き続き guard 由来を維持する

将来的に影響が出る可能性:

- RPC引数の追加
- Edge Function 内での `trace_id` 生成
- 成功レスポンスへの `trace_id` 追加
- admin-dashboard の検索条件追加

これらは別フェーズで個別に扱う。

---

## ■ 段階的導入戦略

### Phase 1: DB受け皿

対象テーブルに nullable な `trace_id` を追加する。

この段階では既存挙動を変えない。

### Phase 2: 小さい更新APIから対応

`warehouse-location-active-update` のように、影響範囲が明確なAPIから `trace_id` を保存する。

### Phase 3: パレット系APIへ展開

パレット作成・移動・出庫など、`pallet_transactions` を作るAPIへ展開する。

### Phase 4: 在庫系APIへ展開

`inventory_transactions` を作るAPIへ展開する。

### Phase 5: 複数業務モードへ展開

ブリヂストンの Expected / Actual 突合など、scan API が中核になる業務へ展開する。

### Phase 6: 検索・監査UI

admin-dashboard で `trace_id` を使った検索・調査・CSV出力を検討する。

---

## ■ idempotency_key との関係

`idempotency_key` は二重実行防止のキーである。

`trace_id` は業務操作の追跡キーである。

運用方針:

- `idempotency_key` を `trace_id` として流用しない
- `trace_id` を二重実行防止に使わない
- 同じAPIリクエストに両方が存在してもよい
- `idempotency_key` で既存結果を返す場合、その結果に紐づく `trace_id` も同じであることが望ましい

この関係の厳密なルールは、RPC対応時に個別に確認する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- `trace_id` の型を `text` にするか `uuid` にするか
- `trace_id` を Edge Function で生成するか RPC で生成するか
- `trace_events` を中心にするか、各 transaction / history に直接持たせるか
- 成功レスポンスへ `trace_id` を返すか
- 既存データの backfill を行うか
- backfill する場合の安全な判定条件
- NOT NULL 化する対象テーブル
- `pallet_units` / `pallet_item_links` に補助 trace column を追加するか
- admin-dashboard での `trace_id` 検索UI
- ブリヂストン業務で1つの `trace_id` とする業務単位

---

## ■ 原則

`trace_id` migration は、既存仕様を壊さず段階的に進める。

最初から完全な追跡を目指さず、新規処理から確実に保存し、既存データは説明できる範囲だけを扱う。

IDの意味を混ぜず、`transaction_id`、`idempotency_key`、`warehouse_code`、`project_no`、`issue_no` と役割を分離する。
