# Event Dependency Architecture（Phase B7-97）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event / projection / workflow / replay / rebuild / validation の dependency を整理する。

event contract、event processing model、workflow / saga、projection consistency、event catalog、event validation、event recovery を前提にすると、event は単独で存在するだけではなく、producer、consumer、projection、workflow step、validation rule、external input、replay / rebuild に依存する。依存関係が見えないままだと、schema change、consumer 追加、workflow 変更、projection rebuild、recovery 判断で影響範囲を誤る。

本ドキュメントでは以下を整理する。

- event dependency の目的
- producer / consumer dependency
- projection dependency
- workflow dependency
- replay / rebuild dependency
- validation dependency
- external integration dependency
- ordering dependency
- temporal dependency
- circular dependency 問題
- dependency observability
- dependency recovery
- governance / approval との関係
- lightweight start 方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event dependency の目的

event dependency は、ある event がどの producer、consumer、projection、workflow、validation、external input、replay / rebuild に影響するかを整理する考え方である。

目的:

- event 変更時の影響範囲を把握する
- producer / consumer の依存関係を明確にする
- projection / read model の根拠 event を追えるようにする
- workflow / saga の step 間依存を説明する
- replay / rebuild の前提データを整理する
- validation rule が参照する event / metadata を明確にする
- external integration の障害影響を把握する
- circular dependency を避ける
- dependency failure を observability / recovery へ接続する

dependency は実装上の import 関係だけではない。

業務 event の意味、source of truth、projection、workflow、audit、recovery まで含む業務依存関係である。

---

## ■ producer / consumer dependency

producer / consumer dependency は、どの producer が event を発行し、どの consumer がそれを処理するかの関係である。

管理候補:

- event_name
- producer domain
- producer API / RPC / job
- owner domain
- consumer name
- consumer domain
- consumer type
- processing mode
- retry / duplicate handling
- dead-letter handling

例:

| event | producer | consumer |
| --- | --- | --- |
| `inventory.out.distributed` | inventory command | `inventory_current` projection / monitoring |
| `pallet.move.completed` | pallet command | `pallet_units` projection / trace timeline |
| `edi.message.accepted` | EDI parser | shipment workflow |
| `shipment.outbound.confirmed` | shipment workflow | inventory / pallet / billing |

方針:

- producer は event の意味と schema を安定させる
- consumer は producer の内部実装ではなく event contract に依存する
- consumer 追加は event catalog / governance review の対象にする
- consumer failure は source of truth を壊さず recovery 対象にする

---

## ■ projection dependency

projection dependency は、projection / read model / summary / cache がどの source event / table に依存するかを整理する。

対象候補:

- `inventory_current`
- `pallet_units`
- trace timeline
- billing summary
- workflow status
- monitoring aggregate

例:

| projection | dependency |
| --- | --- |
| `inventory_current` | `inventory_transactions` |
| `pallet_units` | `pallet_transactions` |
| trace timeline | inventory / pallet / warehouse location histories |
| billing summary | shipment / inventory / pallet / billing event |
| workflow status | workflow event chain |

方針:

- projection は source of truth ではない
- projection dependency は rebuild / diff detection の前提になる
- projection dependency が変わる場合は rebuild / validation 影響を確認する
- deprecated event も必要な projection が読めるようにする
- projection drift は dependency failure として調査する

---

## ■ workflow dependency

workflow dependency は、workflow / saga の step がどの前段 event に依存し、どの後続 event を期待するかを整理する。

管理候補:

- workflow name
- workflow owner
- step event
- required predecessor event
- expected next event
- compensation event
- timeout / retry policy
- stuck detection rule
- replay / recovery policy

例:

```text
edi.file.received
  -> edi.file.parsed
  -> edi.message.accepted
  -> shipment.created
  -> shipment.pick.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> billing.candidate_created
```

方針:

- workflow dependency は missing event / stuck workflow detection の前提になる
- required predecessor event がない step は manual review 候補になる
- compensation event も dependency として扱う
- workflow dependency の変更は projection / monitoring / recovery 影響を確認する

---

## ■ replay / rebuild dependency

replay / rebuild dependency は、再実行・再構築に必要な event、external input、metadata、version、projection を整理する。

### replay dependency

候補:

- original trace
- original event
- external input
- event version
- metadata version
- replay policy
- approval / operator metadata
- downstream projection / workflow

方針:

- replay は元 event を上書きしない
- replay dependency が不足している場合は automatic replay を避ける
- external file / OCR / EDI input が必要な replay は retention / archive と接続する
- replay 結果がどの consumer / projection / workflow に影響するかを確認する

### rebuild dependency

候補:

- source of truth
- event version adapter
- deprecated event handling
- projection logic
- snapshot
- archive data
- rebuild target range

方針:

- rebuild は event bus の過去配送に依存しない
- rebuild は source of truth を根拠にする
- rebuild dependency が欠落している場合は rebuild failure / manual review の対象にする
- rebuild diff は observability / recovery の対象にする

---

## ■ validation dependency

validation dependency は、validation rule がどの event、metadata、identity、time、state transition、security boundary に依存するかを整理する。

対象候補:

- schema validation
- metadata validation
- identity validation
- time validation
- warehouse boundary validation
- state transition validation
- replay / rebuild validation
- workflow validation
- projection validation
- security validation

例:

| validation | dependency |
| --- | --- |
| state transition validation | required predecessor event / current state |
| projection validation | source of truth / projection checkpoint |
| time validation | created_at / event_time / processed_at |
| identity validation | event_id / trace_id / idempotency_key |
| security validation | warehouse_code / role / sensitive metadata |

方針:

- validation rule は governance で定義された契約に依存する
- validation dependency が不明な rule は導入しない
- validation failure は observability / recovery の入口にする
- validation rule 変更は producer / consumer / projection 影響を確認する

---

## ■ external integration dependency

external integration dependency は、OCR / EDI / webhook / external API など外部 system との依存関係である。

対象候補:

- source_system
- external_file_id
- external_file_hash
- external_message_id
- external_order_no
- partner schema version
- received_at
- parsed_at
- external response id

方針:

- external ID と internal ID を分離する
- external file / message は replay / forensic の起点になり得る
- external schema change は event contract / versioning / validation に影響する
- external integration failure は dead-letter / retry / manual recovery の対象にする
- 外部送信済み event は replay / deletion に制約を持つ

---

## ■ ordering dependency

ordering dependency は、event の順序に関する依存関係である。

対象:

- local transaction 内の順序
- workflow step order
- producer / consumer processing order
- event_time / created_at / processed_at
- replay event と original event
- correction / compensation event

方針:

- `created_at` だけで完全な ordering を保証しない
- workflow step / parent_trace_id / event metadata で業務順を補足する
- ordering dependency が不明な場合は monitoring / forensic / manual review の対象にする
- late arriving event は projection / workflow status への影響を評価する
- ordering assumption を event contract に含めることを検討する

---

## ■ temporal dependency

temporal dependency は、時間差・期限・鮮度・滞留に関する依存関係である。

対象:

- projection freshness
- workflow timeout
- stuck workflow threshold
- external receive delay
- offline upload delay
- replay / rebuild target time range
- archive retention period
- validation window

例:

- `shipment.pick.confirmed` 後、一定時間内に `inventory.out.distributed` が必要
- event は作成済みだが projection freshness が遅れている
- external file は受信済みだが parse が完了していない
- rebuild 対象期間の archive data が必要

方針:

- temporal dependency は monitoring / alert と接続する
- timeout は技術エラーだけでなく業務停滞として扱う
- retention / archive は replay / rebuild dependency として扱う
- temporal dependency の閾値は domain ごとに検討する

---

## ■ circular dependency 問題

circular dependency は、event / projection / workflow / validation が互いに依存し、処理順や責務が循環する問題である。

例:

- projection を作るために projection の値を source of truth として参照する
- workflow A が workflow B の完了を待ち、workflow B が workflow A の event を待つ
- validation が projection を根拠に event を拒否し、その projection は対象 event がないと更新できない
- replay の可否判定が replay 結果の projection に依存している

影響:

- stuck workflow
- rebuild 不能
- validation deadlock
- recovery 判断不能
- audit / forensic の根拠不明

方針:

- source of truth と projection の依存方向を守る
- workflow dependency は有向グラフとして循環を避ける
- validation は必要に応じて source of truth を優先する
- circular dependency が疑われる場合は manual review / architecture review の対象にする

---

## ■ dependency observability

dependency observability は、依存関係の欠落・遅延・失敗・循環を観測できる状態である。

観測候補:

- missing dependency count
- unresolved dependency count
- consumer lag
- projection lag
- workflow stuck count
- validation dependency failure count
- external dependency failure count
- rebuild dependency missing count
- replay dependency missing count
- circular dependency warning

必要なID:

- event_id
- event_name
- trace_id
- parent_trace_id
- producer
- consumer
- projection_name
- workflow_name
- validation_rule
- warehouse_code

方針:

- dependency failure は単なる技術エラーではなく業務リスクとして扱う
- alert は owner domain / severity / recovery action と接続する
- dependency graph を将来 observability の入力にすることを検討する
- dependency warning は audit / forensic の調査起点になる

---

## ■ dependency recovery

dependency recovery は、依存関係の欠落・失敗・遅延・循環から回復するための考え方である。

対象:

- missing event
- failed consumer
- projection drift
- stuck workflow
- dead-letter event
- replay dependency missing
- rebuild dependency missing
- external input missing
- validation dependency failure

recovery 候補:

- consumer retry
- projection refresh
- source of truth からの rebuild
- workflow resume
- step replay
- compensation action
- external input restore
- manual recovery

方針:

- recovery は source of truth と dependency を根拠にする
- dependency が不足している場合は automatic recovery を避ける
- recovery 結果も event / trace / audit trail として説明できるようにする
- dependency recovery は event recovery architecture と接続する

---

## ■ governance / approval との関係

dependency は governance / approval の重要な判断材料である。

強い review が必要な変更候補:

- 新しい consumer の追加
- required predecessor event の変更
- projection dependency の変更
- workflow step dependency の変更
- replay / rebuild dependency の変更
- validation dependency の変更
- external integration dependency の変更
- circular dependency を生む可能性がある変更

方針:

- owner domain が primary reviewer になる
- 影響を受ける consumer / projection / workflow owner も確認する
- event catalog に dependency 情報を含めることを検討する
- dependency 変更は replay / rebuild / recovery / audit への影響を確認する
- 初期段階では重い承認プロセスより、依存関係の明文化を優先する

---

## ■ lightweight start 方針

event dependency は重要だが、最初から完全な dependency graph や専用ツールを作ると複雑になる。

lightweight start の候補:

- Markdown の dependency 表から始める
- 主要 event の producer / consumer を整理する
- `inventory_current` / `pallet_units` の projection dependency を整理する
- shipment / OCR / EDI / billing の workflow dependency 候補を文書化する
- replay / rebuild に必要な source of truth / external input を整理する
- validation rule と dependency の対応を設計表で管理する
- circular dependency の代表リスクを棚卸しする

方針:

- まず source of truth から projection / workflow への依存方向を明確にする
- 次に producer / consumer / validation / recovery dependency を追加する
- dependency graph のDB化や自動検出は今回決定しない
- high risk domain から段階的に dependency を整理する

---

## ■ 導入段階案

### Step 1: producer / consumer dependency の棚卸し

inventory、pallet、warehouse location、shipment、OCR / EDI、billing の主要 event について producer / consumer を整理する。

### Step 2: projection / workflow dependency の整理

`inventory_current`、`pallet_units`、trace timeline、billing summary、workflow status の依存 event を整理する。

### Step 3: replay / rebuild / validation dependency の整理

replay / rebuild に必要な source of truth、external input、version、validation rule を整理する。

### Step 4: external / temporal / ordering dependency の整理

OCR / EDI、external system、offline upload、workflow timeout、late event を整理する。

### Step 5: governance / recovery へ接続

dependency 変更を event catalog、governance review、observability、recovery 方針へ接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- dependency graph をDBで管理するか
- dependency をMarkdown / YAML / JSON / code で管理するか
- dependency graph UI を作るか
- dependency をCIで検証するか
- circular dependency detection を実装するか
- producer / consumer registry と統合するか
- event catalog と dependency registry を統合するか
- workflow dependency の正式 schema
- projection dependency の正式 schema
- validation dependency の正式 schema
- replay / rebuild dependency の正式分類
- external integration dependency の管理方法
- dependency failure の alert 方式
- admin-dashboard で dependency / warning を表示するか

---

## ■ 原則

dependency は、event がどの producer / consumer / projection / workflow / validation / recovery に影響するかを説明するための設計情報である。

source of truth から projection / read model への依存方向を守る。

workflow dependency は循環させず、missing / delayed / duplicate を観測できるようにする。

dependency failure は削除ではなく、retry、rebuild、recovery、manual review の対象にする。

event dependency は governance / observability / recovery / audit の共通基盤になる。
