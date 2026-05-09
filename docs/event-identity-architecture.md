# Event Identity Architecture（Phase B7-93）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event / trace / workflow / replay / projection / integration の識別子設計を整理する。

distributed trace、event catalog、event processing model、event time、trace metadata を前提にすると、ID は単なる文字列ではなく「何を一意に表すか」という責務を持つ。`event_id`、`trace_id`、`request_id`、`idempotency_key`、business identifier、external identifier を混同すると、duplicate detection、replay / rebuild、workflow、audit、forensic、recovery の判断を誤る。

本ドキュメントでは以下を整理する。

- event identity の目的
- `event_id`
- `aggregate_id`
- `correlation_id` / `causation_id`
- `trace_id` / `request_id` / `idempotency_key` との違い
- business identifier との関係
- replay / rebuild identity
- duplicate detection identity
- workflow identity
- external integration identity
- event lineage identity
- observability / audit との関係
- lightweight start 方針
- governance / recovery との関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event identity の目的

event identity は、event や関連処理を「何の単位で一意に識別するか」を定義する考え方である。

目的:

- event 自体を一意に識別する
- 同じ業務操作に属する履歴を束ねる
- event が何を起点に発生したかを追跡する
- workflow / saga の親子関係を説明する
- replay / rebuild / correction の元 event との関係を残す
- duplicate event / duplicate processing を検出する
- projection / consumer の処理済み判定に使う
- external system のIDと internal IDを分離する
- audit / forensic / observability の検索軸にする

identity 設計では、1つのIDに複数の意味を持たせないことが重要である。

---

## ■ `event_id` の考え方

`event_id` は、個別 event を一意に識別するIDである。

用途:

- event store 上の個別 event の一意性
- consumer processing の重複検出
- dead-letter / recovery 対象の特定
- projection checkpoint
- audit / forensic での event 単位追跡
- replay / correction の元 event 参照

例:

```text
event_id = evt_01HX...
event_name = inventory.out.distributed
trace_id = trace-shipment-out-001
```

方針:

- `event_id` は event 自体のIDであり、業務番号ではない
- `event_id` を `trace_id` として流用しない
- `event_id` を `idempotency_key` として流用しない
- source of truth が既存 transaction table の場合、既存 transaction id が event_id 相当になるかは将来整理する
- 初期段階では既存 `inventory_transactions.id` などを event identity として扱えるか検討する

---

## ■ `aggregate_id` の考え方

`aggregate_id` は、複数 event が属する業務上の対象物を識別するIDである。

対象候補:

- pallet
- inventory item / stock bucket
- shipment
- EDI file / message
- OCR document
- billing document
- workflow instance

例:

| aggregate | aggregate_id 候補 |
| --- | --- |
| pallet | `pallet_id` / `pallet_code` |
| inventory stock bucket | warehouse_code + location_code + part_no + stock_type |
| shipment | `shipment_id` / `shipment_no` |
| EDI message | `edi_message_id` |
| OCR document | `ocr_document_id` |

方針:

- `aggregate_id` は event の対象を表す
- aggregate の境界は domain owner が定義する
- `pallet_code` のような現場コードと内部IDは分けて考える
- inventory のように複合キーが aggregate identity になる場合がある
- aggregate_id は workflow 全体のIDとは限らない

---

## ■ `correlation_id` / `causation_id` の考え方

`correlation_id` は、関連する複数 event / request / workflow をまとめるためのIDである。

`causation_id` は、ある event がどの event / command / request を原因として発生したかを示すIDである。

| ID | 目的 | 例 |
| --- | --- | --- |
| `correlation_id` | 関連する処理群を束ねる | EDI file から派生した shipment / inventory / billing |
| `causation_id` | 直接の原因を示す | `shipment.pick.confirmed` が `inventory.out.distributed` を発生させた |

関係例:

```text
event_id: shipment.pick.confirmed
  -> causation_id of inventory.out.distributed

correlation_id: edi-file-001
  -> shipment.created
  -> inventory.out.distributed
  -> billing.candidate_created
```

方針:

- `correlation_id` は広い関連性を示す
- `causation_id` は直接の原因を示す
- `parent_trace_id` と `correlation_id` は近い役割を持つが、完全に同じとは限らない
- 初期段階では `parent_trace_id` で correlation 的な役割を担う可能性がある
- 正式導入するかは将来検討とする

---

## ■ `trace_id` / `request_id` / `idempotency_key` との違い整理

既存設計で重要なIDの違いを整理する。

| ID | 主目的 | 生成単位 |
| --- | --- | --- |
| `event_id` | 個別 event を一意に識別する | event |
| `trace_id` | 1つの業務操作を追跡する | business operation |
| `parent_trace_id` | trace 同士の親子関係を表す | trace chain |
| `request_id` | 1回の API 実行を観測する | API request |
| `idempotency_key` | 同一操作の二重実行を防ぐ | retry-safe operation |
| `aggregate_id` | event の対象物を識別する | domain aggregate |
| `correlation_id` | 関連 event 群を束ねる | process / workflow / external input |
| `causation_id` | event の直接原因を示す | caused-by event / command |

原則:

- `request_id` を `trace_id` として流用しない
- `idempotency_key` を `trace_id` として流用しない
- `trace_id` を個別 event の一意IDとして扱わない
- `event_id` は business identifier ではない
- replay では元 trace と新 trace を分離する

---

## ■ business identifier との関係整理

business identifier は、業務上意味を持つ番号・コードである。

候補:

- `project_no`
- `issue_no`
- `shipment_no`
- `pallet_code`
- `part_no`
- `location_code`
- `external_order_no`
- `external_ref_no`

event identity との違い:

| business identifier | event identity |
| --- | --- |
| 業務担当者が理解する番号 | system / event 処理の識別子 |
| 重複や変更があり得る場合がある | 一意性を強く求める |
| domain ごとに意味が違う | identity type ごとに意味を固定する |
| 例: `project_no` | 例: `event_id` |

方針:

- `project_no` と `issue_no` を混同しない
- 外部番号を internal event_id として扱わない
- business identifier は検索・表示・audit の重要軸として使う
- business identifier の一意性は domain ごとに確認する
- duplicate detection では business identifier だけに依存しない

---

## ■ replay / rebuild identity の扱い

### replay identity

replay では、元 event / trace と replay 結果を分離する。

管理候補:

- replay_trace_id
- replay_event_id
- replay_of_trace_id
- replay_of_event_id
- replay_request_id
- replay_run_id
- dry_run_id

方針:

- replay は元 event_id / trace_id を再利用しないことを基本にする
- replay 結果は新しい event identity を持つ
- 元 event / trace との関係は metadata で残す
- replay run 自体を識別するIDを将来検討する

### rebuild identity

rebuild は source of truth から projection / read model を再構築する処理である。

管理候補:

- rebuild_job_id
- rebuild_run_id
- rebuilt_projection_id
- source_event_range
- source_trace_range
- snapshot_id

方針:

- rebuild は元 event identity を変更しない
- rebuild 結果や diff は rebuild run として識別することを検討する
- projection の version / freshness / checkpoint と接続する

---

## ■ duplicate detection identity

duplicate detection identity は、二重 event / 二重 processing / 二重 external input を検出するための識別子である。

候補:

- `idempotency_key`
- `event_id`
- `trace_id`
- `request_id`
- `external_file_hash`
- `external_message_id`
- `source_system_event_id`
- `business identifier`
- consumer checkpoint
- aggregate_id + event_name + event_time

用途別整理:

| 対象 | 主な identity |
| --- | --- |
| API retry | `idempotency_key` |
| consumer duplicate | `event_id` / checkpoint |
| external file duplicate | `external_file_hash` |
| EDI message duplicate | `source_system` + `external_message_id` |
| business duplicate | business identifier + domain rule |
| replay duplicate | replay metadata + original trace |

方針:

- duplicate detection は1つのIDだけに依存しない
- `request_id` は再送ごとに変わり得るため二重実行防止には使わない
- duplicate を検出しても source of truth を削除しない
- skip / investigation / correction / recovery の対象にする

---

## ■ workflow identity

workflow identity は、workflow / saga の instance と step を識別するためのIDである。

候補:

- workflow_id
- workflow_run_id
- workflow_step_id
- parent_trace_id
- trace_id
- correlation_id
- causation_id

用途:

- workflow 全体の進行状態を追跡する
- step の開始・完了・失敗を記録する
- stuck workflow を検出する
- retry / compensation / recovery の対象 step を特定する
- audit / forensic で業務フローを説明する

方針:

- 初期段階では `parent_trace_id` を workflow identity 的に使う可能性がある
- workflow_id と parent_trace_id を同一にするか分けるかは将来検討する
- workflow step は個別 trace / event と接続する
- compensation / recovery は元 workflow step と関係づける

---

## ■ external integration identity

external integration identity は、外部 system との受信・送信・応答を識別するIDである。

候補:

- source_system
- source_system_event_id
- external_request_id
- external_response_id
- external_file_id
- external_file_hash
- external_message_id
- webhook_id
- partner_code

方針:

- external ID と logistics-erp 内部IDを分離する
- external ID を internal primary key として扱わない
- external_file_hash は再取込・重複検知・forensic に有用である
- external_message_id は source_system と組み合わせて意味を持つ
- 外部送信済み event は replay / recovery / audit の制約に関わる

---

## ■ projection identity

projection identity は、read model / summary / cache と、その元 event / source of truth との関係を識別する考え方である。

候補:

- projection_name
- projection_version
- projection_row_id
- source_event_id
- source_trace_id
- aggregate_id
- last_projected_event_id
- projection_checkpoint_id
- rebuild_run_id

方針:

- projection は source of truth ではない
- projection row がどの source event まで反映しているかを説明できるようにすることを検討する
- projection の duplicate / drift detection では source event identity が重要になる
- rebuild 後の projection は rebuild_run_id と接続することを将来検討する

---

## ■ event lineage identity

event lineage identity は、event がどの入力・前段 event・workflow から生まれ、どの後続 event / projection に影響したかを追うための識別子である。

候補:

- event_id
- causation_id
- correlation_id
- trace_id
- parent_trace_id
- aggregate_id
- source_event_id
- derived_event_id
- correction_of_event_id
- replay_of_event_id

例:

```text
edi.file.received event_id=evt_001
  -> edi.message.accepted event_id=evt_002 causation_id=evt_001
  -> shipment.created event_id=evt_003 causation_id=evt_002
  -> inventory.out.distributed event_id=evt_004 causation_id=evt_003
```

方針:

- lineage は audit / forensic / recovery の重要な起点になる
- correction / replay event は元 event との関係を残す
- event lineage は event catalog / trace chain と接続する
- 初期段階では `trace_id` / `parent_trace_id` / source table id から説明する

---

## ■ observability / audit との関係

observability では、event processing のどこで何が起きたかを identity で追跡する。

必要なID候補:

- event_id
- event_name
- trace_id
- parent_trace_id
- request_id
- idempotency_key
- aggregate_id
- consumer name
- projection name
- workflow_id
- recovery_id

audit では、誰が・いつ・何を・なぜ行ったかを identity で接続する。

audit 観点:

- event_id で個別 event を特定する
- trace_id で業務操作を束ねる
- parent_trace_id / workflow_id で上位業務へ接続する
- request_id でAPI実行ログへ接続する
- business identifier で業務担当者が理解できる番号へ接続する
- replay / correction / recovery の元 event を説明する

方針:

- observability ID と business ID を混同しない
- audit では内部IDだけでなく業務IDも必要になる
- sensitive な external ID の表示範囲は security / privacy と接続する

---

## ■ governance / recovery との関係整理

### governance

identity は governance の対象である。

確認観点:

- ID field の意味
- owner domain
- 一意性の範囲
- external / internal の区別
- replay / rebuild / correction の関係
- backward compatibility
- deprecated ID field

方針:

- ID field の意味を後から変えない
- business identifier の流用を避ける
- event catalog に identity の利用方針を含めることを検討する
- consumer 追加時は必要な identity を確認する

### recovery

recovery では、対象 event / trace / workflow / projection を正しく特定する必要がある。

例:

- projection drift の source event を特定する
- workflow stuck の step を特定する
- dead-letter 対象 event を特定する
- replay 元 event と replay 結果 event を区別する
- duplicate external input を検出する

方針:

- recovery は source of truth と identity を根拠にする
- identity が不足している場合は automatic recovery を避ける
- recovery audit trail には対象 identity と実行 identity を残すことを検討する

---

## ■ lightweight start 方針

event identity は重要だが、最初からすべてのIDを導入すると複雑になる。

lightweight start の候補:

- 既存 `trace_id` / `request_id` / `idempotency_key` / business identifier の違いを明文化する
- 既存 transaction table の主キーを event identity 相当として整理する
- trace-search で返る `source` と source row id の扱いを整理する
- duplicate detection に使うIDを API / domain ごとに棚卸しする
- workflow identity はまず `parent_trace_id` 中心に整理する
- external integration identity は OCR / EDI から整理する

方針:

- まず ID の意味混同を防ぐ
- `event_id` / `aggregate_id` / `correlation_id` / `causation_id` のDB導入は今回決定しない
- business identifier は検索・表示用、event identity は処理・追跡用として分ける
- replay / recovery / audit で必要になる identity から段階的に整理する

---

## ■ 導入段階案

### Step 1: 既存IDの棚卸し

`trace_id`、`request_id`、`idempotency_key`、transaction id、business identifier、external id を一覧化する。

### Step 2: event identity 相当の整理

既存 source table の primary key が event_id 相当として使える範囲を整理する。

### Step 3: duplicate detection identity の整理

inventory、pallet、OCR / EDI、shipment、billing ごとに二重実行・二重取込の判定IDを整理する。

### Step 4: workflow / replay identity の整理

workflow instance、workflow step、replay run、correction の関連IDを整理する。

### Step 5: governance / recovery へ接続

event catalog、metadata schema、recovery audit trail に identity 方針を接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- `event_id` をDBへ保存するか
- 既存 transaction id を event_id と見なすか
- `aggregate_id` を導入するか
- `correlation_id` / `causation_id` を導入するか
- workflow_id と parent_trace_id を同一にするか
- replay_run_id / rebuild_run_id を導入するか
- consumer checkpoint の identity 設計
- projection checkpoint の identity 設計
- external id の一意制約
- duplicate detection の正式ルール
- event lineage table を作るか
- event catalog と identity registry を統合するか
- admin-dashboard で表示するID範囲
- OpenTelemetry の trace/span id との対応有無

---

## ■ 原則

IDは意味を持つ。

`event_id`、`trace_id`、`request_id`、`idempotency_key`、business identifier、external identifier を混同しない。

event identity は処理・追跡・重複検知・audit のために使い、business identifier は業務説明・検索・表示のために使う。

replay / correction / recovery では元 identity と新 identity を分離し、関係を metadata で説明する。

identity 設計は event lineage、observability、governance、recovery の共通基盤になる。
