# Trace Event Taxonomy（Phase B7-75）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、trace / distributed trace / replay / audit を進める前提として、logistics-erp における業務イベントの分類体系（taxonomy）を整理する。

`trace_id` は業務操作を束ねるキーである。一方で、trace 内に含まれるイベントが何を意味するかは、イベント分類と命名規則がなければ一貫して解釈できない。

本ドキュメントでは以下を整理する。

- event taxonomy の目的
- `transaction_type` との違い
- technical event / business event の違い
- inventory / pallet / shipment / OCR / EDI / expected / actual 系イベント
- audit / replay / recovery との関係
- event naming guideline
- event versioning の将来方針
- distributed trace 上での event chain
- event metadata の考え方

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ event taxonomy の目的

event taxonomy は、業務イベントを一貫した名前・粒度・分類で扱うための設計である。

目的:

- trace 検索結果を人が理解しやすくする
- replay / rebuild の対象判定をしやすくする
- audit 時に「何が起きたか」を説明しやすくする
- OCR / EDI / shipment / inventory / pallet の横断連携を整理する
- 将来の event versioning や metadata 設計の土台にする

event taxonomy は、単なる表示名一覧ではない。

業務上の意味、再実行可否、監査上の重要度、関連する真実ログを整理するための分類体系である。

---

## ■ transaction_type との違い

`transaction_type` は、特定テーブル内の状態変化種別を表す。

例:

- `inventory_transactions.transaction_type = IN`
- `inventory_transactions.transaction_type = OUT`
- `pallet_transactions.transaction_type = MOVE`
- `pallet_transactions.transaction_type = ITEM_OUT`

一方、trace event taxonomy の event name は、より広い業務イベントを表す。

例:

- `inventory.in.created`
- `inventory.out.distributed`
- `pallet.move.completed`
- `ocr.import.accepted`
- `shipment.pick.confirmed`

違い:

| 項目 | transaction_type | trace event |
| --- | --- | --- |
| 主目的 | テーブル内の変動種別 | 業務イベントの意味付け |
| 粒度 | DB行・transaction中心 | 業務操作・外部入力・派生処理中心 |
| 範囲 | 主に個別テーブル | 複数テーブル・複数API横断 |
| 例 | `IN`, `OUT`, `MOVE` | `inventory.in.created`, `shipment.outbound.confirmed` |

`transaction_type` をそのまま event taxonomy として流用してはいけない。

ただし、transaction 由来の event では、metadata として `transaction_type` を保持する。

---

## ■ technical event / business event の違い

### technical event

technical event は、API実行・ジョブ実行・外部通信など、システム処理上の出来事を表す。

例:

- `api.request.received`
- `api.request.failed`
- `edge_function.invoked`
- `job.started`
- `job.completed`
- `webhook.received`

用途:

- 障害調査
- request_id との接続
- timeout / retry の確認
- external system 連携の調査

### business event

business event は、物流ERP上の業務上の出来事を表す。

例:

- `inventory.in.created`
- `pallet.move.completed`
- `shipment.pick.confirmed`
- `ocr.import.accepted`
- `actual.matched`

用途:

- 業務履歴の説明
- audit
- replay / rebuild 対象の判断
- 請求・出荷・在庫の根拠確認

### 原則

technical event と business event は混同しない。

同じ `trace_id` または trace chain に含まれても、意味は別である。

---

## ■ inventory 系 event

inventory 系 event は、品番・数量在庫の変動を表す。

主な候補:

| event name | 意味 | 主な真実ログ |
| --- | --- | --- |
| `inventory.in.created` | 入庫transactionが作成された | `inventory_transactions` |
| `inventory.out.created` | 出庫transactionが作成された | `inventory_transactions` |
| `inventory.out.distributed` | 複数ロケーションから分散出庫された | `inventory_transactions` |
| `inventory.move.created` | 棚間移動が作成された | `inventory_transactions` |
| `inventory.adjust.created` | 在庫調整が作成された | `inventory_transactions` |
| `inventory.rebuild.calculated` | 派生在庫が再計算された | 将来検討 |
| `inventory.replay.created` | replay により新しい在庫イベントが作られた | 将来検討 |

注意:

- `inventory_current` は派生状態であり、event taxonomy の主軸にはしない
- 数量の真実は `inventory_transactions` に置く
- replay では既存transactionを更新せず、新しい補正eventとして扱う

---

## ■ pallet 系 event

pallet 系 event は、パレットの作成・移動・出庫・品番紐付けを表す。

主な候補:

| event name | 意味 | 主な真実ログ |
| --- | --- | --- |
| `pallet.created` | パレットが作成された | `pallet_units`, `pallet_transactions` |
| `pallet.item.linked` | パレットへ品番が紐付けられた | `pallet_item_links`, `pallet_transactions` |
| `pallet.item.out.created` | パレット内の品番が出庫された | `pallet_transactions` |
| `pallet.move.completed` | パレットが棚間移動した | `pallet_transactions` |
| `pallet.out.completed` | パレットが出庫された | `pallet_transactions` |
| `pallet.project_no.corrected` | パレットの `project_no` が補正された | 将来検討 |
| `pallet.replay.created` | replay によりパレット補正イベントが作られた | 将来検討 |

注意:

- `pallet_units` の現在状態は派生キャッシュである
- パレット操作の履歴は `pallet_transactions` を中心に説明する
- 実物流が動いた後の replay は慎重に扱う

---

## ■ shipment 系 event

shipment 系 event は、出荷業務の進行を表す。

現時点では設計候補であり、実装を前提にしない。

主な候補:

| event name | 意味 |
| --- | --- |
| `shipment.created` | 出荷指示が作成された |
| `shipment.updated` | 出荷指示が更新された |
| `shipment.pick.started` | ピッキングが開始された |
| `shipment.pick.confirmed` | ピッキングが確定した |
| `shipment.outbound.confirmed` | 出庫が確定した |
| `shipment.cancel.requested` | 出荷取消が要求された |
| `shipment.cancel.completed` | 出荷取消が完了した |
| `shipment.billing.candidate_created` | 請求候補が作成された |

shipment は inventory / pallet / billing をつなぐ親業務になり得る。

将来的には shipment trace を `parent_trace_id` として、inventory / pallet / billing の child trace を接続することを検討する。

---

## ■ OCR / EDI / expected / actual 系 event

OCR / EDI / expected / actual 系 event は、外部入力と照合処理を表す。

### OCR

| event name | 意味 |
| --- | --- |
| `ocr.import.received` | OCR入力を受け付けた |
| `ocr.import.parsed` | OCR結果を構造化した |
| `ocr.import.rejected` | OCR入力を拒否した |
| `ocr.corrected` | OCR結果が補正された |

### EDI

| event name | 意味 |
| --- | --- |
| `edi.file.received` | EDIファイルを受信した |
| `edi.file.parsed` | EDIファイルを解析した |
| `edi.message.accepted` | EDIメッセージを受理した |
| `edi.message.rejected` | EDIメッセージを拒否した |

### expected / actual

| event name | 意味 |
| --- | --- |
| `expected.created` | Expected データが作成された |
| `expected.updated` | Expected データが更新された |
| `actual.created` | Actual データが作成された |
| `actual.matched` | Expected / Actual が一致した |
| `actual.mismatch_detected` | 差異が検出された |
| `actual.reconciled` | 差異が解消された |

これらはブリヂストン業務の中核になり得る。

`project_no` と `issue_no` の意味を混同せず、業務識別子は metadata として分離して扱う。

---

## ■ audit / replay / recovery との関係

event taxonomy は、audit / replay / recovery の判断材料になる。

### audit

audit では event name により、何が起きたかを業務担当者に説明する。

例:

- `inventory.out.distributed`: 分散出庫が行われた
- `pallet.out.completed`: パレット出庫が完了した
- `actual.mismatch_detected`: Expected / Actual 差異が検出された

### replay

replay では event name により、再実行可能か、手動確認が必要か、禁止かを判定する。

例:

- `ocr.import.parsed`: replay 候補
- `inventory.in.created`: 補正eventとして扱う
- `shipment.billing.candidate_created`: 請求確定前か確認が必要

### recovery

recovery では event name により、欠落した派生データを再作成する範囲を判断する。

event taxonomy がないと、どのイベントを起点に recovery すべきかが曖昧になる。

---

## ■ event naming guideline

event name は以下の形式を基本候補とする。

```text
<domain>.<object_or_action>.<verb_or_state>
```

例:

- `inventory.in.created`
- `inventory.out.distributed`
- `pallet.move.completed`
- `shipment.pick.confirmed`
- `ocr.import.received`
- `actual.mismatch_detected`

命名ルール:

- 小文字を使う
- 単語区切りは `_`、階層区切りは `.`
- domain を先頭に置く
- 過去に起きた事実を表す名前にする
- UI表示名ではなく、機械的に安定した名前にする
- `transaction_type` の値をそのまま event name にしない
- 業務意味が違うものを同じ event name にしない

避ける例:

- `done`
- `update`
- `move`
- `api_success`
- `IN`
- `OUT`

---

## ■ event versioning

event versioning は、event payload や意味が変わった場合に互換性を保つための考え方である。

将来的な候補:

- `event_name`
- `event_version`
- `event_schema_version`
- `metadata`

例:

```json
{
  "event_name": "inventory.out.distributed",
  "event_version": 1,
  "metadata": {
    "allocation_count": 3
  }
}
```

初期段階では versioning を急いで導入しない。

ただし、OCR / EDI / shipment など外部入力と結びつく event は、将来的に payload version を持つ可能性が高い。

---

## ■ distributed trace 上での event chain

distributed trace では、event name を使って chain の意味を説明する。

例:

```text
ocr.import.received
  -> ocr.import.parsed
  -> expected.created
  -> actual.matched
  -> inventory.in.created
  -> shipment.billing.candidate_created
```

別例:

```text
edi.file.received
  -> edi.message.accepted
  -> shipment.created
  -> shipment.pick.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
```

`trace_id` と `parent_trace_id` は chain の構造を表す。

event name は chain の各節点で何が起きたかを表す。

---

## ■ event metadata の考え方

event metadata は、event name だけでは表せない補助情報を持つ。

候補:

- `warehouse_code`
- `project_no`
- `issue_no`
- `business_mode`
- `request_id`
- `idempotency_key`
- `operator_id`
- `operator_role`
- `source_system`
- `external_file_id`
- `shipment_id`
- `pallet_code`
- `part_no`
- `quantity`
- `quantity_unit`
- `reason`
- `replay_of_trace_id`
- `parent_trace_id`

metadata の原則:

- IDの意味を混同しない
- `project_no` と `issue_no` を流用しない
- `warehouse_code` は guard 由来など信頼できる値を使う
- 大きなpayloadを無制限に詰め込まない
- 個人情報や機密情報を安易に入れない
- replay / audit に必要な最小限から始める

---

## ■ 導入段階案

### Step 1: 既存 transaction_type との対応表を作る

`inventory_transactions` / `pallet_transactions` の既存 `transaction_type` と event name の対応を整理する。

### Step 2: trace-search 表示名へ利用する

admin-dashboard の trace検索で、source / event_type に加えて将来的に event name を表示できるように検討する。

### Step 3: OCR / EDI / shipment 系を追加する

外部入力と shipment の設計が固まり次第、event taxonomy を拡張する。

### Step 4: replay / recovery 判定へ利用する

event name ごとに replay 可否、要承認、禁止条件を整理する。

### Step 5: event versioning を検討する

payload 互換性が問題になった段階で、event versioning を導入する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event name をDBへ保存するか
- `transaction_type` から event name を派生表示するだけにするか
- `trace_events` テーブルを新設するか
- event metadata の保存先
- event versioning の具体的なカラム構成
- OCR / EDI / shipment の正式 event name
- replay 可否の判定ルールを event taxonomy に持たせるか
- event taxonomy をコード上の enum として管理するか
- admin-dashboard での表示名・フィルタ条件
- OpenTelemetry の span / event との対応
- 多言語表示名の管理方法

---

## ■ 原則

event name は、業務上「何が起きたか」を説明するための安定した名前である。

`transaction_type`、`trace_id`、`parent_trace_id`、`request_id`、`idempotency_key` と混同しない。

IDは意味を持つ。イベント名も意味を持つ。

業務意味が異なるイベントを、同じ名前にまとめてはいけない。
