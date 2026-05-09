# Distributed Trace Design（Phase B7-73）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、単一の `trace_id` だけでは表現しきれない複数API・複数transaction・複数業務イベントの親子関係を、将来的に追跡するための設計方針を整理する。

Phase B7-67 から B7-72 では、`trace_id` を「1つの業務操作に属する履歴を束ねるキー」として導入した。本ドキュメントでは、その次の段階として以下を扱う。

- `request_id`
- `parent_trace_id`
- child trace
- trace chain
- replay / rebuild / audit との関係

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ trace_id 単独でできること

`trace_id` は、1つの業務操作に属する複数の履歴を束ねる。

例:

- 1回の在庫入庫で作られた `inventory_transactions`
- 1回のパレット移動で作られた `pallet_transactions`
- 1回の棚番有効 / 無効切替で作られた `warehouse_location_history`

この範囲では、`trace_id` だけで「同じ操作だった」ことを説明できる。

---

## ■ trace_id 単独では不足すること

実運用では、1つの業務が複数のAPIや複数の業務操作に分かれることがある。

例:

- OCR取込 → Expected作成 → Actual照合 → 在庫入庫
- EDI取込 → shipment作成 → ピッキング → 出庫 → 請求
- パレット作成 → 品番紐付け → 棚移動 → 出庫
- 取消操作 → 元履歴参照 → 補正transaction作成

この場合、それぞれの操作は別の `trace_id` を持つ可能性がある。単一の `trace_id` だけでは「全体として同じ業務の流れだった」ことを表しにくい。

---

## ■ request_id の目的

`request_id` は、1回のAPIリクエストを識別するためのIDである。

目的:

- Edge Function / APIログとDB履歴を突き合わせる
- 500エラーやタイムアウトの調査単位にする
- 同じ業務操作内でどのHTTPリクエストが起点だったかを確認する
- external API / webhook / batch の受信単位を残す

`request_id` は `idempotency_key` とは異なる。

| 項目 | request_id | idempotency_key |
| --- | --- | --- |
| 主目的 | リクエストログ追跡 | 二重実行防止 |
| 生成単位 | API呼び出しごと | 同一操作の再試行単位 |
| 再送時 | 原則変わり得る | 原則同じ値を使う |
| 保存先 | APIログ / trace event / transaction補助 | 書き込みAPIの重複判定 |

`request_id` は通信・実行の観測IDであり、業務上の同一性は `trace_id` や `idempotency_key` が担う。

---

## ■ parent_trace_id の目的

`parent_trace_id` は、ある `trace_id` がどの上位業務操作から派生したかを示す親IDである。

目的:

- 複数の child trace を1つの上位業務へまとめる
- 取込 → 照合 → 在庫更新 → 請求のような連鎖を追う
- 取消・補正・rebuild がどの元操作から派生したかを説明する
- distributed trace の親子構造をDB上で表現する

例:

```text
parent_trace_id = OCR取込全体
  ├─ trace_id = Expected作成
  ├─ trace_id = Actual照合
  └─ trace_id = 在庫入庫
```

`parent_trace_id` は、個別transactionの主キーではない。業務操作同士の関係を表すためのキーである。

---

## ■ child trace の考え方

child trace は、上位の業務操作から派生した個別処理を表す。

例:

- 親: EDIファイル1件の取込
- 子: shipment作成
- 子: shipment明細ごとの在庫引当
- 子: 出庫確定
- 子: 請求候補作成

child trace は、それぞれ独立した `trace_id` を持つ。

ただし、全体の流れを説明するために、各 child trace は同じ `parent_trace_id` を持つことを検討する。

---

## ■ trace chain の考え方

trace chain は、`parent_trace_id` と `trace_id` の関係をたどることで、業務の流れを時系列に復元する考え方である。

例:

```text
request_id: req-001
trace_id: trace-ocr-import

trace-ocr-import
  -> trace-expected-create
  -> trace-actual-match
  -> trace-inventory-in
  -> trace-billing-candidate
```

この chain により、個別の transaction だけでなく「なぜそのtransactionが発生したか」を説明できる。

trace chain は以下の用途を想定する。

- 調査時の原因追跡
- audit 時の業務説明
- rebuild 時の再構築範囲特定
- replay 時の再実行対象整理
- billing 接続時の根拠確認

---

## ■ 連携例

### inventory

`inventory_transactions` は数量変動の真実ログである。

将来的に、入庫・出庫・移動・調整がどの上位業務から発生したかを `parent_trace_id` でたどれるようにする。

例:

- OCR取込から発生した入庫
- shipment確定から発生した出庫
- 棚卸補正から発生した調整

### pallet

`pallet_transactions` はパレット操作の真実ログである。

将来的に、パレット作成・棚移動・出庫が在庫transactionやshipmentと同じ trace chain に属することを表せるようにする。

例:

- パレット作成 trace
- 品番紐付け trace
- パレット移動 trace
- パレット出庫 trace

### shipment

shipment は受注・出荷・請求へつながる業務の中心になり得る。

将来的には、shipment単位の親 trace から、引当・ピッキング・出庫・請求候補までを child trace として接続する。

### OCR

OCR は外部入力の起点である。

OCR取込時の `request_id` と取込 trace を起点に、Expected作成、Actual照合、在庫更新を trace chain として追えるようにする。

### EDI

EDI はファイル単位・メッセージ単位・明細単位で階層がある。

将来的には以下のような階層を検討する。

```text
EDI file trace
  -> EDI message trace
    -> shipment trace
      -> inventory / pallet / billing trace
```

---

## ■ replay / rebuild / audit との関係

### replay

replay は、過去の入力や操作を再実行する考え方である。

`request_id` は再実行ごとに変わり得る。一方、`parent_trace_id` や元の `trace_id` は「何を再実行したか」を説明するために参照する。

replay では、元操作と再実行操作を混同しないことが重要である。

### rebuild

rebuild は、履歴から現在状態や派生データを再構築する考え方である。

trace chain があると、再構築対象を以下の単位で絞り込める。

- 特定 shipment に関係する transaction
- 特定 OCR 取込から派生した在庫更新
- 特定 EDI file から作られた請求候補

### audit

audit では「誰が・いつ・何を・なぜ行ったか」を説明する必要がある。

`trace_id` は「何を行ったか」を束ねる。

`parent_trace_id` は「なぜその操作が発生したか」を上位業務へ接続する。

`request_id` は「どのAPI実行で発生したか」をログへ接続する。

---

## ■ distributed trace の将来像

将来的には、以下を横断して1つの trace chain として確認できる状態を目指す。

- Edge Function の request log
- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- shipment / billing 系テーブル
- OCR / EDI / CSV 取込履歴
- admin-dashboard 上の監査表示

ただし、初期段階では汎用的な distributed tracing 製品のような完全な span model は導入しない。

まずは物流ERPの業務説明に必要な最小単位として、`trace_id`、`parent_trace_id`、`request_id` の意味を分離して扱う。

---

## ■ 導入段階案

### Step 1: trace_id の既存対応を安定化

既存の `inventory_transactions`、`pallet_transactions`、`warehouse_location_history` への `trace_id` 保存を安定運用する。

この段階では `parent_trace_id` や `request_id` はまだ必須にしない。

### Step 2: request_id のログ連携を検討

Edge Function 実行ごとに `request_id` を持たせ、console log やエラー調査で利用できる形を検討する。

DB保存するか、ログだけに残すかは別途判断する。

### Step 3: parent_trace_id の保存先を設計

`parent_trace_id` を各 transaction / history に直接持たせるか、別の trace relation table を作るかを検討する。

この段階で migration 方針、nullable 方針、index 方針を整理する。

### Step 4: trace chain 検索APIを検討

単一 `trace_id` 検索だけでなく、親子関係をたどる検索APIを検討する。

例:

- parent_trace_id から child trace 一覧を取得
- trace_id から親 trace へ逆引き
- request_id から発生した trace を検索

### Step 5: admin-dashboard 表示を検討

trace chain を時系列で表示し、業務担当者が「何が起点で、どの履歴が作られたか」を確認できるUIを検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- `request_id` を Edge Function で生成するか、gateway / client から受け取るか
- `request_id` をDBへ保存するか、ログのみに残すか
- `parent_trace_id` を各履歴テーブルへ直接追加するか
- `trace_relations` のような親子関係専用テーブルを作るか
- `trace_events` を新設し、全イベントを集約するか
- parent / child の最大階層や循環防止ルール
- replay 時に元 trace を再利用するか、新 trace を発行して関連付けるか
- rebuild 対象を trace chain でどこまで自動判定するか
- index 設計と検索APIの性能要件
- admin-dashboard での trace chain 表示形式
- OpenTelemetry など外部規格との対応有無

---

## ■ 原則

`trace_id` は1つの業務操作を束ねる。

`parent_trace_id` は業務操作同士の親子関係を表す。

`request_id` は1回のAPI実行を観測する。

この3つを混同しない。

IDは意味を持つ。追跡のためのIDを流用せず、段階的に拡張する。
