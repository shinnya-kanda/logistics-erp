# Event Contract Architecture（Phase B7-96）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における producer / consumer 間の event contract、compatibility、delivery expectation、validation expectation を整理する。

event versioning、event governance、event validation、event processing model、event bus、event catalog を前提にすると、event は単なる通知ではなく、domain 間・projection・workflow・monitoring・replay / rebuild をつなぐ契約になる。producer と consumer の期待が曖昧なままだと、schema change、metadata 欠落、duplicate delivery、ordering、projection drift、workflow stuck、replay / rebuild failure が発生しやすくなる。

本ドキュメントでは以下を整理する。

- event contract の目的
- producer responsibility
- consumer responsibility
- schema contract
- metadata contract
- compatibility contract
- ordering / delivery contract
- replay / rebuild contract
- projection contract
- workflow contract
- validation contract
- governance / approval contract
- observability / audit contract
- lightweight start 方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event contract の目的

event contract は、producer が発行する event と consumer が期待する event の意味・schema・metadata・配送・互換性を明確にするための契約である。

目的:

- producer / consumer の責務を分離する
- event name / schema / metadata の意味を安定させる
- schema change の影響を制御する
- projection / workflow / monitoring が壊れないようにする
- replay / rebuild 時に古い event を解釈できるようにする
- delivery / retry / duplicate / ordering の期待値を揃える
- validation failure / dead-letter / recovery の扱いを明確にする
- governance / approval の判断材料にする

event contract は、producer の内部実装を consumer に公開するものではない。

consumer が安全に event を解釈し、自 domain の処理へ変換するための安定した境界である。

---

## ■ producer responsibility

producer は event を発行する側であり、event の意味・生成条件・schema・metadata を安定させる責務を持つ。

責務:

- owner domain として event の意味を定義する
- event_name / event_version / metadata_version を管理する
- required metadata を正しく付与する
- `warehouse_code` を信頼できる source から設定する
- source of truth を壊さない形で event を作る
- deprecated event の新規生成停止を管理する
- schema change 時に consumer 影響を確認する
- replay / correction / compensation event の意味を明確にする

方針:

- producer は consumer の内部実装に依存しない
- producer は event の意味を後から勝手に変えない
- event name だけで業務意味を曖昧にしない
- integration event は domain 間の契約として扱う

---

## ■ consumer responsibility

consumer は event を受け取り、projection 更新、workflow 進行、monitoring、external integration などを行う側である。

責務:

- event contract に基づいて event を解釈する
- unknown optional field を許容する
- duplicate delivery を前提に idempotent に処理する
- 処理できない event を silent skip しない
- deprecated event を必要な期間読み続ける
- replay / correction / compensation event を通常 event と区別する
- consumer failure を observability / recovery へ接続する
- `warehouse_code` / sensitive metadata の処理範囲を守る

方針:

- consumer は event を自 domain の command / projection / workflow step へ変換する
- consumer の失敗は source of truth を壊さない
- consumer は producer の DB schema に直接依存しすぎない
- consumer 追加時は event catalog / governance review の対象にする

---

## ■ schema contract

schema contract は、event payload / metadata の構造と型に関する契約である。

管理候補:

- event_name
- event_version
- metadata_version
- required fields
- optional fields
- field type
- enum values
- deprecated fields
- replacement fields
- compatibility policy

方針:

- required field の削除や意味変更は破壊的変更として扱う
- optional field 追加は比較的安全な変更候補とする
- field 名変更より新 field 追加を優先する
- event の業務意味が変わる場合は version だけで吸収せず、新 event name を検討する
- schema contract は event catalog / schema registry 的管理と接続する

注意:

- schema contract は過去 event を直接書き換える理由にはならない
- 古い event を読めない場合は warning / error / manual review の対象にする

---

## ■ metadata contract

metadata contract は、event に付随する trace / identity / time / business / operator / external metadata の意味と必須性に関する契約である。

候補:

- `trace_id`
- `parent_trace_id`
- `request_id`
- `warehouse_code`
- `event_time`
- `event_id`
- `aggregate_id`
- `idempotency_key`
- `operator_id`
- `source_system`
- `external_file_hash`
- `replay_of_trace_id`
- `metadata_version`

方針:

- metadata は「何でも入れる自由欄」にしない
- `warehouse_code` は guard / server-side profile 由来など信頼できる値を使う
- `project_no` と `issue_no` のような business identifier を混同しない
- secret / token / API key を metadata に入れない
- 大きな OCR / EDI / PDF 本文を metadata に直接入れない
- required metadata の追加は consumer 影響を確認する

metadata contract は validation contract と密接に関係する。

---

## ■ compatibility contract

compatibility contract は、新旧 event schema / metadata schema が consumer、projection、replay、rebuild で扱える状態を保つための契約である。

観点:

- backward compatibility
- forward compatibility
- deprecated event support
- unknown field handling
- version adapter / mapper
- archive data handling
- external partner schema version

方針:

- 新しい consumer は古い event version を読めることを目指す
- 古い consumer は未知 optional field を無視できることを目指す
- required field の削除・意味変更は破壊的変更として扱う
- deprecated event は削除せず、必要な consumer が読めるようにする
- compatibility のために業務意味を曖昧にしない

例:

```text
edi.message.accepted v1
  -> shipment.created

edi.message.accepted v2
  -> shipment.created
  -> billing.candidate_created metadata enriched
```

---

## ■ ordering / delivery contract

ordering / delivery contract は、event が consumer に届く順序・回数・遅延についての期待値を整理する。

観点:

- delivery guarantee
- ordering guarantee
- duplicate delivery
- retry policy
- dead-letter handling
- consumer checkpoint
- late arriving event
- workflow step dependency

方針:

- 初期段階では exactly-once を前提にしない
- at-least-once + idempotent consumer を基本候補にする
- `created_at` だけで完全な ordering を保証しない
- workflow step / parent_trace_id / event metadata で業務順を補足する
- delivery failure は source of truth の破壊ではなく processing / projection / workflow delay として扱う
- retry と replay を混同しない

delivery contract は event bus 実装方式を直接決めるものではない。

---

## ■ replay / rebuild contract

replay / rebuild contract は、event が replay / rebuild に使えるか、どの制約を持つかを整理する契約である。

管理候補:

- replay_supported
- replay_requires_approval
- replay_forbidden_reason
- rebuild_supported
- required external input
- event version handling
- deprecated event handling
- correction / compensation policy
- projection rebuild impact

方針:

- replay は元 event を上書きしない
- replay 結果は新しい event / trace として扱う
- replay 禁止 event は producer / owner domain が定義する
- rebuild は source of truth を根拠にする
- rebuild で読めない event を silent skip しない
- replay / rebuild support は event catalog に含めることを検討する

---

## ■ projection contract

projection contract は、consumer が event から read model / summary / cache を更新する際の期待値である。

対象候補:

- `inventory_current`
- `pallet_units`
- trace timeline
- billing summary
- workflow status
- monitoring aggregate

契約候補:

- source event / table
- projection owner
- projection update timing
- idempotency / duplicate handling
- rebuild support
- freshness expectation
- diff detection policy
- deprecated event handling

方針:

- projection は source of truth ではない
- projection consumer は idempotent にする
- projection は source of truth から rebuild できることを目指す
- projection failure は read model 遅延 / drift として扱う
- projection contract は rebuild / recovery / observability と接続する

---

## ■ workflow contract

workflow contract は、event が workflow / saga のどの step を起動・完了・補正するかを整理する契約である。

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

方針:

- workflow の各 step は domain event として説明できるようにする
- workflow event chain の変更は consumer / projection / monitoring 影響を確認する
- missing / delayed / duplicate は observability / recovery の対象にする
- compensation は元 event を消さず、correction / compensation event として扱う
- 請求・実物流に関わる workflow contract は強い review を検討する

---

## ■ validation contract

validation contract は、producer / consumer がどの validation を期待するかを整理する契約である。

validation 観点:

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

方針:

- producer は required metadata を満たす責務を持つ
- consumer は受信時に解釈可能性を検証する
- validation failure を silent skip しない
- error / warning / dead-letter / manual review / recovery を分類する
- warehouse boundary violation は high / critical severity 候補とする
- validation rule は event governance と接続する

---

## ■ governance / approval contract

governance / approval contract は、event contract の追加・変更・廃止をどのように review するかの契約である。

強い review が必要な変更候補:

- 新しい event name の追加
- required metadata の追加
- event meaning の変更
- integration event schema の変更
- deprecated event の設定
- replay / rebuild 影響がある変更
- workflow / projection / billing / external system に関わる変更

方針:

- owner domain が primary reviewer になる
- 影響を受ける consumer domain も確認する
- schema change は compatibility を確認する
- event catalog / validation rule / projection dependency を更新対象にする
- 初期段階では重い承認プロセスより、設計レビューと変更理由の明文化を優先する

---

## ■ observability / audit contract

observability / audit contract は、event contract を運用時に確認・追跡できるようにするための契約である。

観測候補:

- event produced count
- event consumed count
- consumer success / failed count
- schema validation failure count
- contract violation count
- deprecated event consumed count
- duplicate count
- dead-letter count
- projection lag / freshness
- workflow stuck count
- replay / rebuild count

必要なID / metadata:

- event_id
- event_name
- event_version
- trace_id
- parent_trace_id
- request_id
- warehouse_code
- producer
- consumer
- projection_name
- workflow_name

方針:

- contract violation は observability / recovery の入口にする
- audit では event name、owner domain、schema version、producer / consumer、metadata を説明できるようにする
- consumer failure は source of truth を壊さず、dead-letter / recovery の対象にする
- sensitive metadata の表示範囲は security 方針に従う

---

## ■ lightweight start 方針

event contract は重要だが、最初から厳密な contract registry やCIを導入すると複雑になる。

lightweight start の候補:

- Markdown の event contract 表から始める
- 主要 event の producer / consumer / required metadata を整理する
- `inventory_current` / `pallet_units` など重要 projection の contract を整理する
- shipment / OCR / EDI / billing の workflow contract 候補を文書化する
- validation severity と dead-letter 方針を設計表で管理する
- event catalog に contract 情報を段階的に追加する

方針:

- まず owner domain、event name、producer、consumer、source of truth を固める
- 次に schema / metadata / replay / rebuild / projection / workflow を追加する
- exactly-once delivery を初期 contract にしない
- 具体的な schema registry / CI / queue / broker / API は今回決定しない

---

## ■ 導入段階案

### Step 1: producer / consumer contract の棚卸し

inventory、pallet、warehouse location、shipment、OCR / EDI、billing の主要 event について producer / consumer を整理する。

### Step 2: schema / metadata contract の整理

event_name、event_version、required metadata、optional metadata、compatibility policy を整理する。

### Step 3: projection / workflow contract の整理

read model 更新、workflow step、stuck detection、compensation event の依存を整理する。

### Step 4: validation / delivery contract の整理

validation severity、delivery expectation、retry / duplicate / dead-letter の扱いを整理する。

### Step 5: governance / approval へ接続

event contract の変更を event catalog、governance review、validation rule と接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event contract をDBで管理するか
- event contract をMarkdown / YAML / JSON / code で管理するか
- schema registry と統合するか
- contract validation をCIで行うか
- producer / consumer registry の正式 schema
- required metadata の正式定義
- delivery guarantee の正式方針
- consumer checkpoint の保存先
- dead-letter table / queue を作るか
- replay / rebuild support の正式分類
- workflow contract の正式 registry
- projection contract の正式 registry
- contract violation の alert 方式
- admin-dashboard で contract / violation を表示するか

---

## ■ 原則

event contract は、producer と consumer の間で event の意味・schema・metadata・delivery・validation の期待値を揃えるための契約である。

producer は event の意味と schema を安定させる。

consumer は unknown optional field、duplicate delivery、deprecated event を考慮して処理する。

contract change は compatibility、projection、workflow、replay、rebuild、audit への影響を確認する。

event contract は governance / validation / observability / recovery の共通基盤になる。
