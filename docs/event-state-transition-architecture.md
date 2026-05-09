# Event State Transition Architecture（Phase B7-94）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event と state transition の関係、workflow state、projection state、recovery state を整理する。

domain event、workflow / saga、event processing model、projection consistency、event recovery、event identity を前提にすると、event は「何が起きたか」を表し、state は event の結果として導出・更新・表示される状態である。event と state を混同すると、replay / rebuild、projection drift、workflow stuck、compensation、manual recovery の判断を誤る。

本ドキュメントでは以下を整理する。

- state transition の目的
- event と state の違い
- aggregate state transition
- workflow state transition
- projection state transition
- compensation / recovery state
- invalid transition
- transition observability
- transition auditability
- transition replay / rebuild
- eventual consistency と state
- lightweight start 方針
- governance / recovery との関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ state transition の目的

state transition は、event によって業務対象や workflow の状態がどのように変化するかを説明するための考え方である。

目的:

- event と現在状態の関係を明確にする
- aggregate / workflow / projection の状態変化を説明できる
- invalid transition を検出しやすくする
- compensation / recovery による状態変化を監査可能にする
- replay / rebuild 時に状態を再構築しやすくする
- eventual consistency による中間状態を説明する
- observability / monitoring で stuck / drift / failure を扱えるようにする

state transition は、単に DB row の値が変わったことではない。

業務上許される状態変化と、その根拠 event を対応づける設計である。

---

## ■ event と state の違い整理

event は、過去に起きた業務上の事実である。

state は、event の結果としてある時点で見える状態である。

| 項目 | event | state |
| --- | --- | --- |
| 意味 | 何が起きたか | 今どうなっているか |
| 時間 | 過去の事実 | ある時点の状態 |
| 変更 | 原則 immutable | event により変化する |
| 例 | `pallet.move.completed` | pallet の現在棚番 |
| 根拠 | source of truth / history | projection / aggregate state |

方針:

- event は削除・上書きせず、補正は correction / compensation event で表す
- state は event から導出される
- projection state は source of truth ではない
- state の不整合は event / transaction / trace chain を根拠に調査する
- state を直接修正して event の不整合を隠さない

---

## ■ aggregate state transition

aggregate state transition は、業務対象物ごとの状態変化である。

対象候補:

- inventory stock bucket
- pallet
- shipment
- OCR document
- EDI message
- expected / actual reconciliation
- billing document
- warehouse location

例:

```text
pallet.created
  -> pallet.move.completed
  -> pallet.out.completed
```

```text
shipment.created
  -> shipment.pick.started
  -> shipment.pick.confirmed
  -> shipment.outbound.confirmed
```

方針:

- aggregate の境界は owner domain が定義する
- state transition は aggregate_id / trace_id / event_id と接続する
- aggregate state は event store / source of truth から再構築できることを目指す
- aggregate をまたぐ状態変化は workflow / integration event として扱う

---

## ■ inventory state transition

inventory state は、品番・数量・棚番・在庫区分の現在状態を表す。

主な event:

- `inventory.in.created`
- `inventory.out.created`
- `inventory.out.distributed`
- `inventory.move.created`
- `inventory.adjust.created`
- `inventory.replay.created`

state 候補:

- quantity
- location_code
- stock_type
- available / reserved
- adjusted

方針:

- 数量変動の根拠は `inventory_transactions` に置く
- `inventory_current` は現在在庫 projection として扱う
- OUT / MOVE / ADJUST の transition は負在庫や棚番制約を確認する
- ledger 自体が誤っている場合は correction transaction / event で説明する

---

## ■ pallet state transition

pallet state は、パレットの作成・位置・状態・出庫・品番紐付けを表す。

主な event:

- `pallet.created`
- `pallet.item.linked`
- `pallet.move.completed`
- `pallet.out.completed`
- `pallet.project_no.corrected`
- `pallet.replay.created`

state 候補:

- created
- active
- moved
- linked
- out_completed
- corrected
- inactive

方針:

- パレット状態の根拠は `pallet_transactions` を中心に説明する
- `pallet_units` は現在状態 projection / cache として扱う
- OUT 済み pallet の再移動などは invalid transition 候補になる
- 誤移動や誤紐付けは削除ではなく correction / compensation event で説明する

---

## ■ workflow state transition

workflow state transition は、複数 domain にまたがる業務フローの進行状態を表す。

state 候補:

- not_started
- started
- waiting
- processing
- completed
- failed
- stuck
- compensating
- compensated
- recovered
- cancelled

例:

```text
shipment.created
  -> shipment.pick.started
  -> shipment.pick.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> billing.candidate_created
```

方針:

- workflow state は event chain から導出される
- workflow state read model は source of truth ではない
- stuck は期待 event が一定時間内に発生していない状態として扱う
- retry / compensation / recovery は元 step と区別できるようにする
- workflow state は `parent_trace_id` / workflow identity と接続する

---

## ■ projection state transition

projection state transition は、source of truth event により read model / summary / cache が更新される状態変化である。

対象候補:

- `inventory_current`
- `pallet_units`
- trace timeline
- billing summary
- workflow status
- monitoring aggregate

projection state 候補:

- fresh
- stale
- updating
- failed
- drift_detected
- rebuilding
- rebuilt
- recovery_required

方針:

- projection state は source of truth から導出される
- projection transition の失敗は source of truth の破壊ではなく read model 遅延 / drift として扱う
- projection state は freshness / lag / last_projected_event_id と接続することを検討する
- projection を直接修正しても event chain の不整合は解決しない

---

## ■ compensation / recovery state

compensation state は、commit 済みの業務処理を削除・巻き戻しではなく、補正 event により整合させる状態である。

recovery state は、失敗・欠落・遅延・不整合から業務状態を回復する過程を表す。

state 候補:

- correction_requested
- correction_completed
- compensation_requested
- compensating
- compensated
- recovery_required
- recovery_in_progress
- recovered
- recovery_failed
- manual_review_required

方針:

- compensation は元 event を消すためのものではない
- recovery は失敗をなかったことにする仕組みではない
- compensation / recovery の state は audit trail と接続する
- recovery により correction event が必要になる場合がある
- manual recovery は正式な state として扱うことを検討する

---

## ■ invalid transition の考え方

invalid transition は、業務ルール上許されない、または説明できない状態変化である。

例:

- OUT 済み pallet が MOVE される
- shipment cancelled 後に billing candidate が作成される
- inventory out が在庫不足なのに作成される
- workflow completed 後に必須 step が missing している
- projection は completed だが source event が存在しない
- replay 禁止 event に対して replay が実行される

分類候補:

| 分類 | 意味 |
| --- | --- |
| business rule violation | 業務ルール違反 |
| missing predecessor | 前提 event 欠落 |
| duplicate transition | 重複状態変化 |
| stale projection | 古い projection による誤表示 |
| forbidden recovery | 禁止された回復操作 |
| ordering ambiguity | 順序不明 |

方針:

- invalid transition を検出しても source of truth を削除しない
- owner domain が transition rule を定義する
- invalid transition は observability / recovery / manual review の対象にする
- 自動補正できる範囲と承認が必要な範囲を分ける

---

## ■ transition observability

transition observability は、状態変化・失敗・遅延・不整合を観測できる状態である。

観測候補:

- transition count
- invalid transition count
- workflow state count
- stuck workflow count
- projection state / freshness
- recovery state count
- compensation count
- transition latency
- state drift count
- manual review count

必要なID:

- event_id
- event_name
- aggregate_id
- trace_id
- parent_trace_id
- workflow_id
- projection_name
- recovery_id
- warehouse_code

方針:

- transition failure は単なる技術エラーではなく業務リスクとして扱う
- alert は state / severity / owner domain / recovery action と接続する
- workflow state と projection state は監視対象にする
- read model の状態だけで source of truth の正しさを判断しない

---

## ■ transition auditability

transition auditability は、state がなぜ変わったかを event / identity / metadata から説明できる状態である。

必要な情報:

- before state
- after state
- transition event
- event_id
- trace_id / parent_trace_id
- aggregate_id
- operator / approver
- transition time
- reason
- correction / compensation relation
- recovery relation

方針:

- state の変更理由を event として説明する
- correction / compensation / recovery も audit 対象にする
- before / after は projection だけでなく source of truth へ戻れるようにする
- manual transition は operator / approver / reason を残すことを検討する

---

## ■ transition replay / rebuild の考え方

### replay

replay では、過去 event / trace / external input を参照して新しい操作として再実行する。

state transition との関係:

- replay 結果は新しい event として state transition を発生させる
- 元 state transition を上書きしない
- replay 前後の state diff を audit できるようにする
- replay 禁止 transition を owner domain が定義する

### rebuild

rebuild では、source of truth event から state / projection を再構築する。

state transition との関係:

- rebuild は過去 event を上書きしない
- event sequence から current state を再計算する
- rebuild diff は projection drift / invalid transition の発見につながる
- rebuild failure は recovery 対象になる

方針:

- replay と rebuild を混同しない
- state machine の再計算は source of truth を根拠にする
- 読めない event / deprecated event を silent skip しない

---

## ■ eventual consistency と state

eventual consistency では、source of truth の state transition と projection / workflow status の反映に時間差がある。

例:

- `inventory_transactions` は OUT 済みだが `inventory_current` は未反映
- `pallet_transactions` は MOVE 済みだが `pallet_units` は古い棚番を表示している
- workflow step は完了済みだが workflow status read model は processing のまま
- billing candidate event は作成済みだが dashboard summary が未更新

方針:

- eventual consistency は不整合放置ではない
- state の freshness / lag / checkpoint を観測する
- UI / dashboard では read model の鮮度を説明できるようにすることを検討する
- 即時整合が必要な field operation では local transaction / synchronous projection を検討する
- stale state による業務誤判断は recovery / alert 対象にする

---

## ■ governance / recovery との関係整理

### governance

state transition rule は governance 対象である。

確認観点:

- owner domain
- allowed transition
- invalid transition
- required predecessor event
- compensation rule
- replay / rebuild support
- deprecated event handling
- projection state handling

方針:

- transition rule は owner domain が定義する
- event name の意味変更は transition rule へ影響する
- consumer / projection 追加時は state transition への影響を確認する
- event catalog に transition rule の概要を含めることを検討する

### recovery

recovery は、失敗・欠落・遅延・不整合から state を説明可能な状態へ戻す。

接続例:

- projection state drift -> projection recovery
- workflow stuck -> workflow recovery
- invalid transition -> manual review / correction
- replay failure -> replay failure recovery
- rebuild diff -> rebuild failure / projection recovery

方針:

- recovery は source of truth と transition rule を根拠にする
- automatic recovery は allowed transition が明確な範囲に限定する
- recovery state も audit / observability の対象にする

---

## ■ lightweight start 方針

state transition は重要だが、最初から厳密な state machine を全 domain に導入すると複雑になる。

lightweight start の候補:

- 既存 `inventory_transactions` と `inventory_current` の状態関係を整理する
- 既存 `pallet_transactions` と `pallet_units` の状態関係を整理する
- shipment / OCR / EDI / billing は設計候補として transition を文書化する
- workflow stuck / invalid transition の代表パターンを棚卸しする
- recovery / compensation が必要な transition を優先整理する
- trace-search と event catalog を調査入口として使う

方針:

- まず event と state を混同しない
- source of truth と projection state の関係を明確にする
- high risk domain から transition rule を整理する
- 具体的な table / enum / state machine 実装は今回決定しない

---

## ■ 導入段階案

### Step 1: 既存 state の棚卸し

`inventory_current`、`pallet_units`、warehouse location、既存履歴から見える current state を整理する。

### Step 2: event -> state 対応表の整理

domain event と、それにより変化する aggregate / projection / workflow state を整理する。

### Step 3: invalid transition 候補整理

inventory、pallet、shipment、OCR / EDI、billing ごとに invalid transition 候補を整理する。

### Step 4: recovery / compensation state 整理

補正・回復・手動確認が必要な state を整理し、audit / approval の要否を分ける。

### Step 5: observability へ接続

workflow state、projection state、invalid transition、recovery state を monitoring / alert の候補へ接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- state machine を実装するか
- workflow state table を作るか
- projection state / freshness の保存先
- allowed transition / invalid transition の正式定義
- aggregate state をDBへ保存するか projection で持つか
- before / after state を audit log に保存するか
- transition validation を synchronous に行うか asynchronous に行うか
- invalid transition の severity 定義
- compensation / recovery state の正式 enum
- admin-dashboard で state / transition warning を表示するか
- event catalog と transition registry を統合するか
- replay / rebuild 時の state machine 再計算方式

---

## ■ 原則

event は過去に起きた事実であり、state は event の結果として見える状態である。

projection state は source of truth ではない。

state transition は owner domain の業務ルールとして定義する。

invalid transition は削除ではなく、調査・補正・recovery の対象にする。

state transition は audit / observability / replay / rebuild / recovery の共通基盤になる。
