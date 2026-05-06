# Trace ID Design（Phase B7-67）

作成日: 2026-05-06

---

## ■ 目的

`trace_id` は、logistics-erp 内で発生する複数のDB更新・履歴・外部入力を、1つの業務単位として追跡するための識別子である。

`transaction_id` や `idempotency_key` を置き換えるものではなく、以下を横断的につなぐために使う。

- 在庫トランザクション
- パレットトランザクション
- 棚番マスタ変更履歴
- scan / OCR / PDF / CSV などの入力由来
- Edge Function で実行される業務単位API

ERP設計憲法の「IDは追跡のための最重要情報である」という原則に従い、`trace_id` は後から説明できる業務履歴を作るための共通キーとして扱う。

---

## ■ trace_id の位置付け

`trace_id` は「同じ業務操作に属する一連の処理」を束ねる。

例:

- 1回の入庫操作で `inventory_transactions` と `pallet_transactions` が作られる
- 1回の棚番有効 / 無効切替で `warehouse_locations` と `warehouse_location_history` が更新される
- 1件のスキャン結果から Expected / Actual 突合と在庫更新が発生する

このような場合、個々のテーブルの主キーは別々でも、同じ `trace_id` を持つことで「同じ業務操作だった」と追跡できる。

---

## ■ 各テーブルとの関係

### inventory_transactions

`inventory_transactions` は在庫数量変動の真実ログである。

将来的に `trace_id` を持たせることで、以下を追跡しやすくする。

- 入庫 / 出庫 / 移動 / 調整の発生元
- scan / OCR / PDF / CSV から発生した在庫更新
- 取消・補正時の元操作との関連

ただし、`trace_id` は在庫数量の整合性を直接担保するものではない。数量の真実は引き続き `inventory_transactions` の行そのものにある。

### pallet_transactions

`pallet_transactions` はパレット単位の移動・出庫などの履歴である。

将来的に `trace_id` を持たせることで、パレット操作と品番在庫操作を同じ業務単位としてつなげられる。

例:

- パレット移動と棚番確認
- パレット出庫と品番出庫
- パレット作成と初期入庫

### warehouse_location_history

`warehouse_location_history` は棚番マスタ変更の監査ログである。

将来的に `trace_id` を持たせることで、棚番変更とそれに伴う業務操作を同じ追跡単位で確認できる。

例:

- 棚番を無効化した理由と、その直前後の移動操作
- 棚番登録・有効化・無効化の一連の管理操作
- admin-dashboard 上の操作ログとの接続

### Edge Functions

Edge Function は `trace_id` を生成または受け渡す入口になり得る。

業務単位APIでは、1回のリクエスト内で複数のDB更新が発生する場合がある。その場合、Edge Function またはRPCが同じ `trace_id` を各履歴へ渡す設計にする。

ただし、現時点では実装しない。具体的にどこで生成するか、クライアントから受け取るか、DB側で生成するかは今後の検討事項とする。

---

## ■ idempotency_key との違い

`trace_id` と `idempotency_key` は目的が異なる。

| 項目 | trace_id | idempotency_key |
| --- | --- | --- |
| 主目的 | 業務操作の追跡 | 二重実行防止 |
| 対象 | 複数テーブル・複数履歴を横断 | 同じAPIリクエストの重複防止 |
| 意味 | 「同じ業務単位」 | 「同じリクエストを再実行しない」 |
| 保存先 | transaction / history / event 系 | 主に書き込みAPIの結果判定 |
| 再利用 | 同じ業務単位内で共有し得る | 原則、同一操作の重複判定に限定 |

`idempotency_key` は通信再送や二重クリック対策のために使う。

`trace_id` は後から業務の流れを説明するために使う。

この2つを混同してはいけない。

---

## ■ 業務単位APIでの利用方針

業務単位APIとは、1回の操作で複数のテーブルや履歴に影響するAPIを指す。

例:

- パレット入庫
- パレット移動
- パレット出庫
- 品番単位入出庫
- 棚番マスタ更新
- Expected / Actual 突合から在庫更新へ進む処理

将来的には、これらのAPIで以下の方針を検討する。

1. 1リクエストにつき1つの `trace_id` を持つ
2. RPC内で発生する transaction / history に同じ `trace_id` を保存する
3. UI・ログ・CSV出力で `trace_id` を検索キーとして使えるようにする
4. `transaction_id` は個別行の識別子、`trace_id` は業務単位の識別子として分離する

---

## ■ migration 方針（まだ実装しない）

現時点では migration を追加しない。

将来実装する場合は、既存データを壊さず段階的に拡張する。

候補:

- `inventory_transactions.trace_id`
- `pallet_transactions.trace_id`
- `warehouse_location_history.trace_id`
- `trace_events.trace_id` との関係整理

方針:

- 既存テーブルの破壊的変更はしない
- nullable column として段階導入する
- 既存データへの backfill は別 migration として扱う
- index は検索要件が見えてから追加する
- `trace_id` の型は UUID / text のどちらにするかを実装前に決める

---

## ■ 今後の検討事項

以下は今回決定しない。

- `trace_id` の型を UUID にするか text にするか
- `trace_id` を Edge Function で生成するか、RPCで生成するか
- クライアントから `trace_id` を受け取るケースを許可するか
- 既存 `trace_events` を中心にするか、各 transaction / history に直接持たせるか
- `warehouse_location_history` に `trace_id` を追加するタイミング
- `idempotency_key` と `trace_id` の同時利用ルール
- admin-dashboard での検索・表示方法
- ブリヂストン業務の Expected / Actual 突合での `trace_id` 利用方法

---

## ■ 原則

`trace_id` は、業務の流れを後から説明するための追跡キーである。

既存の `transaction_id`、`idempotency_key`、`warehouse_code`、`project_no`、`issue_no` の意味を上書きしてはいけない。

同じDBに複数業務を乗せる場合でも、IDの意味を混ぜず、追跡可能な形で段階的に拡張する。
