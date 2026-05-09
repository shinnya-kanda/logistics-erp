# Domain Event Architecture（Phase B7-80）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp を transaction 中心だけでなく、domain event 中心で拡張可能にするため、業務ドメイン単位の event architecture を整理する。

`inventory_transactions` や `pallet_transactions` は真実ログとして重要である。一方で、今後 OCR / EDI / shipment / billing / replay / audit を横断するには、単なる transaction 種別だけでは業務意味を表しきれない。

本ドキュメントでは以下を整理する。

- domain event の目的
- transaction と domain event の違い
- bounded context の考え方
- inventory / pallet / shipment / OCR / EDI / expected / actual / billing domain
- cross-domain trace
- event ownership
- domain event naming guideline
- integration event
- eventual consistency
- orchestration / choreography

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ domain event の目的

domain event は、業務ドメイン上で意味のある出来事を表す。

目的:

- 業務担当者が「何が起きたか」を理解できる
- ドメインごとの責務を明確にする
- trace / distributed trace の event chain を説明できる
- replay / rebuild / audit の対象を判断しやすくする
- 将来の shipment / billing / OCR / EDI 連携を拡張しやすくする

domain event は、単なるDB更新通知ではない。

業務上意味のある状態変化・判断・確定・補正を表す。

---

## ■ transaction と domain event の違い

transaction は、主にDB上の数量・状態・履歴の変化を表す。

domain event は、業務上の出来事を表す。

| 項目 | transaction | domain event |
| --- | --- | --- |
| 主目的 | 真実ログ・数量変動・状態変化の記録 | 業務上の意味の表現 |
| 粒度 | DB行・履歴中心 | 業務操作・判断・確定中心 |
| 例 | `IN`, `OUT`, `MOVE` | `inventory.in.created`, `shipment.pick.confirmed` |
| 所有者 | テーブル・RPC | ドメイン |
| 用途 | rebuild / audit の根拠 | trace chain / orchestration / monitoring |

`transaction_type` を domain event として流用してはいけない。

ただし、domain event の根拠として transaction を参照することはある。

例:

```text
domain event: inventory.out.distributed
root logs:
  - inventory_transactions OUT row 1
  - inventory_transactions OUT row 2
  - inventory_transactions OUT row 3
```

---

## ■ bounded context の考え方

bounded context は、業務用語・ルール・責務が一貫する範囲である。

logistics-erp では、以下の context を候補とする。

- inventory
- pallet
- shipment
- OCR / EDI input
- expected / actual matching
- billing
- warehouse location
- audit / replay

同じ単語でも context が違えば意味が変わる可能性がある。

例:

- `OUT` in inventory: 品番数量の出庫
- `OUT` in pallet: パレット単位の出庫
- `confirmed` in shipment: 出荷確定
- `matched` in actual: Expected / Actual 照合一致

bounded context を明確にすることで、IDや event name の流用を防ぐ。

---

## ■ inventory domain

inventory domain は、品番・数量・棚番・在庫区分の変動を扱う。

主な責務:

- 入庫
- 出庫
- 分散出庫
- 棚間移動
- 在庫調整
- 在庫派生状態の rebuild

主な真実ログ:

- `inventory_transactions`

domain event 候補:

- `inventory.in.created`
- `inventory.out.created`
- `inventory.out.distributed`
- `inventory.move.created`
- `inventory.adjust.created`
- `inventory.rebuild.calculated`
- `inventory.replay.created`

方針:

- 数量の真実は `inventory_transactions` に置く
- `inventory_current` は派生キャッシュとして扱う
- replay / correction は元 transaction の更新ではなく新しい event として扱う

---

## ■ pallet domain

pallet domain は、パレット物理単位・棚番移動・出庫・品番紐付けを扱う。

主な責務:

- パレット作成
- 品番紐付け
- パレット移動
- パレット出庫
- パレット内品番出庫
- project_no 補正

主な真実ログ:

- `pallet_transactions`
- 必要に応じて `pallet_item_links`

domain event 候補:

- `pallet.created`
- `pallet.item.linked`
- `pallet.item.out.created`
- `pallet.move.completed`
- `pallet.out.completed`
- `pallet.project_no.corrected`
- `pallet.replay.created`

方針:

- `pallet_units` の現在状態は派生キャッシュとして扱う
- パレット操作の意味は inventory event と混同しない
- 実物流に関わるため replay / correction は慎重に扱う

---

## ■ shipment domain

shipment domain は、出荷指示・ピッキング・出庫確定・請求候補への接続を扱う。

現時点では設計候補であり、実装を前提にしない。

主な責務:

- 出荷指示作成
- 出荷明細管理
- ピッキング開始・確定
- 出庫確定
- 出荷取消
- 請求候補作成

domain event 候補:

- `shipment.created`
- `shipment.updated`
- `shipment.pick.started`
- `shipment.pick.confirmed`
- `shipment.outbound.confirmed`
- `shipment.cancel.requested`
- `shipment.cancel.completed`
- `shipment.billing.candidate_created`

方針:

- shipment は inventory / pallet / billing をつなぐ親 domain になり得る
- shipment trace を `parent_trace_id` として child trace を接続することを検討する
- 請求確定後の replay / deletion は制約が強い

---

## ■ OCR / EDI / expected / actual domain

OCR / EDI / expected / actual domain は、外部入力と照合を扱う。

### OCR domain

主な責務:

- OCR入力受付
- OCR結果解析
- OCR結果補正
- OCR入力から Expected / Actual への接続

domain event 候補:

- `ocr.import.received`
- `ocr.import.parsed`
- `ocr.import.rejected`
- `ocr.corrected`

### EDI domain

主な責務:

- EDIファイル受信
- EDIメッセージ解析
- 外部IDと内部業務IDの対応
- shipment / expected への接続

domain event 候補:

- `edi.file.received`
- `edi.file.parsed`
- `edi.message.accepted`
- `edi.message.rejected`

### expected / actual domain

主な責務:

- Expected 作成
- Actual 作成
- 照合
- 差異検出
- 差異解消

domain event 候補:

- `expected.created`
- `expected.updated`
- `actual.created`
- `actual.matched`
- `actual.mismatch_detected`
- `actual.reconciled`

方針:

- 外部参照番号を `project_no` に流用しない
- `issue_no` と `project_no` は意味を分離する
- OCR / EDI は replay の起点になり得るため metadata と retention が重要である

---

## ■ billing domain

billing domain は、請求候補・請求確定・請求根拠の管理を扱う。

現時点では設計候補であり、実装を前提にしない。

主な責務:

- 請求候補作成
- 請求対象判定
- 請求確定
- 請求取消・補正
- 出荷・在庫・外部入力との根拠接続

domain event 候補:

- `billing.candidate_created`
- `billing.candidate_updated`
- `billing.confirmed`
- `billing.cancel.requested`
- `billing.cancel.completed`
- `billing.corrected`

方針:

- billing は audit / retention / replay 禁止ケースに強く関係する
- 請求確定済み event は削除・replay に制約を持つ
- shipment / inventory / pallet の trace chain と接続できるようにする

---

## ■ cross-domain trace の考え方

cross-domain trace は、複数 domain にまたがる業務フローを `trace_id` / `parent_trace_id` で追跡する考え方である。

例:

```text
edi.file.received
  -> shipment.created
  -> shipment.pick.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> billing.candidate_created
```

この場合、各 domain は自分の event を所有する。

ただし、全体の流れは `parent_trace_id` や trace chain によって接続する。

方針:

- 1つの domain が他 domain の真実ログを直接壊さない
- cross-domain の関係は trace / metadata / integration event で説明する
- warehouse_code による境界は維持する
- business identifier の意味を混同しない

---

## ■ event ownership

event ownership は、どの domain がどの event の意味・生成条件・補正ルールを所有するかを明確にする考え方である。

例:

| event | owner domain |
| --- | --- |
| `inventory.in.created` | inventory |
| `pallet.move.completed` | pallet |
| `shipment.pick.confirmed` | shipment |
| `ocr.import.parsed` | OCR |
| `actual.matched` | expected / actual |
| `billing.confirmed` | billing |

方針:

- event name の意味は owner domain が定義する
- 他 domain は event を参照できるが、意味を変更しない
- event の correction / replay ルールも owner domain が定義する
- integration event は送信元 domain と受信先 domain の契約として扱う

---

## ■ domain event naming guideline

domain event name は、event taxonomy の方針に従う。

基本形式:

```text
<domain>.<object_or_action>.<verb_or_state>
```

例:

- `inventory.in.created`
- `inventory.out.distributed`
- `pallet.move.completed`
- `shipment.pick.confirmed`
- `ocr.import.received`
- `edi.message.accepted`
- `actual.mismatch_detected`
- `billing.confirmed`

命名ルール:

- domain を先頭に置く
- 過去に起きた事実を表す
- `transaction_type` の値をそのまま使わない
- UI表示名ではなく安定した機械名にする
- 同じ名前に異なる業務意味を持たせない
- `project_no` と `issue_no` のように意味が違うIDを混在させない

---

## ■ integration event の考え方

integration event は、ある domain の出来事を別 domain に伝えるための event である。

例:

- shipment が `shipment.outbound.confirmed` を発行し、inventory が出庫処理へ進む
- OCR が `ocr.import.parsed` を発行し、expected / actual が照合へ進む
- EDI が `edi.message.accepted` を発行し、shipment が作成される
- inventory が `inventory.out.distributed` を発行し、billing が請求候補を作る

方針:

- integration event は domain 間の契約である
- 送信元 domain は event の意味とschemaを安定させる
- 受信先 domain は event を自 domain の処理へ変換する
- integration event の失敗や遅延は observability / monitoring の対象にする
- integration event は transaction の直接共有ではない

---

## ■ eventual consistency の考え方

eventual consistency は、複数 domain の状態が即時に完全一致しなくても、event chain により最終的に整合する考え方である。

例:

- shipment 確定直後、inventory 出庫が非同期で処理される
- OCR 取込後、expected / actual 照合が別処理で実行される
- pallet 出庫後、billing 候補が後続処理で作られる

注意:

- eventual consistency は不整合を放置することではない
- missing event / delayed event / failed event を monitoring する必要がある
- replay / correction / recovery の設計が必要になる
- 業務上即時整合が必要な範囲はRPCなどで1トランザクションにする

方針:

- 在庫数量など即時整合が必要な処理は慎重に扱う
- cross-domain 連携は trace chain で状態を説明できるようにする
- 最終整合までの中間状態を UI / monitoring で説明できるようにする

---

## ■ orchestration / choreography の考え方

### orchestration

orchestration は、中心となる処理が複数 domain の処理順序を制御する方式である。

例:

```text
shipment service
  -> inventory out
  -> pallet out
  -> billing candidate
```

利点:

- 処理順序を制御しやすい
- エラー時の rollback / compensation を設計しやすい
- 業務フローが明示的になる

注意:

- 中心処理に責務が集中しやすい
- domain 間の結合が強くなりやすい

### choreography

choreography は、各 domain が event を受けて自律的に処理する方式である。

例:

```text
shipment.outbound.confirmed
  -> inventory domain handles out
  -> pallet domain handles out
  -> billing domain handles candidate
```

利点:

- domain の独立性を保ちやすい
- 拡張しやすい
- integration event を中心に疎結合にできる

注意:

- 全体の流れが見えにくくなる
- missing event / duplicate event の監視が重要になる
- trace observability が必須になる

方針:

- 初期は影響範囲が明確な orchestration を優先する場面が多い
- domain が増えたら choreography も検討する
- どちらの場合も trace_id / parent_trace_id / request_id で観測可能にする

---

## ■ 導入段階案

### Step 1: 既存 transaction から domain event への対応表を整理

`inventory_transactions` / `pallet_transactions` の既存 `transaction_type` と domain event の対応を整理する。

### Step 2: domain ownership を明確化

inventory / pallet / shipment / OCR / EDI / billing の event owner を文書化する。

### Step 3: trace-search 表示と接続

trace-search で `source` / `event_type` に加え、将来的に domain event name を表示できるように検討する。

### Step 4: integration event 候補を整理

shipment → inventory / pallet / billing、OCR / EDI → expected / actual のような連携点を整理する。

### Step 5: orchestration / choreography 方針を個別判断

業務フローごとに、中心制御か event 駆動かを検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- domain event をDBへ保存するか
- `trace_events` テーブルを新設するか
- 既存 `transaction_type` から domain event name をどう導出するか
- domain event schema / versioning の具体化
- event owner のコード上の責務分離
- integration event の保存先・配送方式
- orchestration を担う service / RPC / Edge Function
- choreography を担う event bus / queue の有無
- eventual consistency の許容範囲
- compensation / correction event の具体設計
- admin-dashboard での domain event 表示
- OpenTelemetry 等の外部規格との対応

---

## ■ 原則

transaction は真実ログである。

domain event は業務上「何が起きたか」を説明する。

bounded context ごとに言葉と責務を分ける。

cross-domain 連携では、IDの意味を混同せず、trace chain で説明可能にする。

domain event を中心に拡張しても、真実ログを安易に更新・削除してはいけない。
