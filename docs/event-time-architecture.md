# Event Time Architecture（Phase B7-92）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event time / processing time / business time / replay time / workflow time の違いと扱いを整理する。

event store、event processing model、workflow / saga、trace replay、trace integrity、event recovery を前提にすると、event の「いつ起きたか」は1種類ではない。業務上発生した時刻、システムに記録された時刻、処理された時刻、replay された時刻、workflow 上の開始・完了時刻を混同すると、ordering、audit、forensic、monitoring、rebuild、recovery の判断を誤る。

本ドキュメントでは以下を整理する。

- event time の目的
- business event time と system time の違い
- `created_at` / `scanned_at` / `uploaded_at` / `processed_at` の整理
- workflow time
- replay / rebuild 時間の扱い
- offline scan / delayed event
- ordering と event time
- cross-system clock drift
- audit / forensic との関係
- observability / monitoring との関係
- time metadata
- lightweight start 方針
- governance / recovery との関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event time の目的

event time は、業務 event が「業務上いつ発生したか」を表す時刻である。

目的:

- 業務事実の発生順を説明する
- offline scan / delayed upload を正しく扱う
- workflow の開始・完了・滞留を判断する
- replay / rebuild 時に元 event と再処理時刻を区別する
- audit / forensic で「いつ起きたか」と「いつ記録されたか」を分ける
- ordering / duplicate / late event の判断材料にする
- monitoring で遅延・滞留・clock drift を検知する

event time は `created_at` と常に同じとは限らない。

特に現場 scan、OCR / EDI、外部 system 連携、offline operation、replay / rebuild では、複数の時刻を区別する必要がある。

---

## ■ business event time と system time の違い

business event time は、業務上の事実が発生した時刻である。

system time は、logistics-erp または関連 system が event を受信・保存・処理した時刻である。

| 時刻 | 意味 | 例 |
| --- | --- | --- |
| business event time | 業務上発生した時刻 | 現場で scan した時刻 |
| system received time | system が受信した時刻 | Edge Function が request を受けた時刻 |
| persisted time | DB に保存された時刻 | `created_at` |
| processing time | consumer / job が処理した時刻 | projection updater 実行時刻 |
| replay time | replay を実行した時刻 | OCR再処理の実行時刻 |
| rebuild time | read model を再構築した時刻 | `inventory_current` rebuild 完了時刻 |

方針:

- 業務上の順序判断には business event time を考慮する
- system の受信・保存・処理遅延には system time を使う
- audit では business event time と system time の両方を説明できるようにする
- system time だけで現場業務の発生順を断定しない

---

## ■ `created_at` / `scanned_at` / `uploaded_at` / `processed_at` の整理

時刻 field は意味を分けて扱う。

| field | 意味 | 主な用途 |
| --- | --- | --- |
| `created_at` | DB に record / event が作成された時刻 | persisted time / audit |
| `scanned_at` | 現場で scan が行われた時刻 | business event time |
| `uploaded_at` | device / external system から upload された時刻 | delay / offline 判定 |
| `received_at` | API / Edge Function が request を受けた時刻 | request observability |
| `processed_at` | consumer / job が処理した時刻 | processing observability |
| `completed_at` | workflow step / recovery が完了した時刻 | workflow / recovery |
| `replayed_at` | replay が実行された時刻 | replay audit |
| `rebuilt_at` | rebuild が実行・完了した時刻 | rebuild audit / freshness |

方針:

- `created_at` は保存時刻であり、必ずしも業務発生時刻ではない
- `scanned_at` は device clock 由来になる可能性があるため信頼度を考慮する
- `uploaded_at` と `scanned_at` の差分は offline / delayed upload の判断材料になる
- `processed_at` は projection / workflow / consumer lag の観測に使う
- field 名の意味を後から変えない

---

## ■ workflow time の考え方

workflow time は、workflow / saga の開始・各 step・完了・滞留・補正に関する時刻である。

管理候補:

- workflow_started_at
- step_started_at
- step_completed_at
- step_failed_at
- last_retry_at
- timeout_at
- stuck_detected_at
- compensation_started_at
- compensation_completed_at
- recovery_started_at
- recovery_completed_at

例:

```text
shipment.created at 09:00
shipment.pick.confirmed at 09:30
inventory.out.distributed at 09:32
billing.candidate_created at 10:10
```

この場合、billing candidate 作成までの遅延が業務上許容されるかを workflow time として評価する。

方針:

- workflow の進行判断は event chain と workflow time を合わせて行う
- stuck workflow は「期待 event が一定時間内に発生していない状態」として扱う
- timeout は技術時間だけでなく業務停滞として扱う
- compensation / recovery も workflow time に含めて監査可能にする

---

## ■ replay / rebuild 時間の扱い

### replay time

replay time は、過去 event / trace / external input を参照して再実行した時刻である。

replay では以下の時刻を分ける。

- original event time
- original created_at
- replay requested_at
- replay executed_at
- replay completed_at
- replay result event time
- replay result created_at

方針:

- replay は元 event の時刻を上書きしない
- replay 結果は新しい event として現在の system time を持つ
- 元 event の business time と replay time を混同しない
- replay 差分は audit / forensic で説明できるようにする

### rebuild time

rebuild time は、source of truth から projection / read model を再構築した時刻である。

rebuild では以下の時刻を分ける。

- rebuild_started_at
- rebuild_completed_at
- source_event_time_range
- source_created_at_range
- projection_rebuilt_at
- snapshot_time

方針:

- rebuild は過去 event の event time を変更しない
- rebuild は「いつの source of truth まで反映したか」を説明できるようにする
- rebuild failure / diff には対象時間範囲を含めることを検討する

---

## ■ offline scan / delayed event の扱い

offline scan / delayed event は、業務上の発生時刻と system への記録時刻に差がある event である。

例:

- driver app が offline で pallet scan し、後で upload した
- 倉庫内通信不良で scan upload が遅れた
- OCR file は前日に受領されたが処理は翌日になった
- EDI file は外部 system で生成後、数時間遅れて受信された

観点:

- scanned_at と uploaded_at の差分
- uploaded_at と created_at の差分
- external_event_time と received_at の差分
- delay が業務許容範囲内か
- 遅延 event が既存 projection / workflow にどう影響するか

方針:

- delayed event を単純に不正 event と扱わない
- ordering は `created_at` だけで判断しない
- offline scan は device clock の信頼性を検討する
- delayed event が projection / workflow に影響する場合は recovery / rebuild / correction の対象にする

---

## ■ ordering と event time の関係

ordering は、event の処理順序や業務順序をどう解釈するかの問題である。

ordering に使われる可能性がある時刻:

- business event time
- `created_at`
- processing time
- workflow step time
- external system event time
- sequence / transaction id

注意:

- `created_at` は保存順であり、業務発生順とは限らない
- business event time は device / external system clock に依存する場合がある
- processing time は consumer 処理順であり、event 発生順ではない
- replay event は元 event より後の system time を持つが、元 event と関係づけて解釈する

方針:

- 単一 local transaction 内では DB transaction の整合性を優先する
- cross-domain workflow では `parent_trace_id` / workflow step / event metadata を併用する
- ordering が不明な場合は monitoring / forensic / manual review の対象にする
- late arriving event は projection / workflow status への影響を評価する

---

## ■ cross-system clock drift 問題

cross-system clock drift は、複数 system / device の時計がずれている問題である。

発生源:

- driver app device
- warehouse scanner
- OCR service
- EDI partner system
- external API provider
- Edge Function runtime
- database server

問題例:

- scanned_at が created_at より未来になっている
- external_event_time が received_at より大きくずれている
- partner system の timezone が不明
- device clock が数時間ずれている
- daylight saving / timezone 解釈で日付がずれる

方針:

- system persisted time は server / DB clock を信頼する
- external / device time は source_system と confidence を考慮する
- timezone を明示できる metadata を検討する
- clock drift は validation / monitoring の対象にする
- drift が大きい event は dead-letter / manual review / recovery の候補にする

---

## ■ audit / forensic との関係

audit では、「いつ業務が起きたか」と「いつ system に記録されたか」を説明できる必要がある。

audit 観点:

- event occurred time
- record created_at
- operator action time
- approval time
- replay / correction time
- recovery execution time
- external input received time

forensic では、障害や不整合の原因調査に時刻差分を使う。

forensic 観点:

- request received から DB write までの遅延
- event created から projection reflected までの遅延
- workflow step 間の gap
- retry / timeout / stuck duration
- offline upload delay
- external system clock drift
- replay / recovery の前後関係

方針:

- audit / forensic では複数の time を併記する
- どの time を根拠に判断したかを明示する
- 時刻の欠落や矛盾は integrity issue として扱う

---

## ■ observability / monitoring との関係

observability / monitoring では、時刻差分が lag / latency / stuck / freshness の基礎になる。

観測候補:

- request latency
- processing latency
- projection lag
- read model freshness
- workflow step latency
- workflow stuck duration
- upload delay
- external receive delay
- replay duration
- rebuild duration
- recovery duration
- clock drift count

必要な時刻候補:

- received_at
- created_at
- processed_at
- projected_at
- workflow_started_at
- step_completed_at
- last_retry_at
- replayed_at
- rebuilt_at
- recovered_at

方針:

- latency と業務遅延を分けて観測する
- projection freshness は source of truth のどこまで反映したかで説明する
- workflow stuck は期待 event と時刻閾値を組み合わせて検出する
- monitoring aggregate 自体も projection であるため freshness を検討する

---

## ■ time metadata の考え方

time metadata は、event / trace / workflow / processing / recovery に付随する時刻情報である。

候補:

- `event_time`
- `business_event_time`
- `created_at`
- `received_at`
- `scanned_at`
- `uploaded_at`
- `processed_at`
- `projected_at`
- `workflow_started_at`
- `workflow_completed_at`
- `replay_requested_at`
- `replayed_at`
- `rebuild_started_at`
- `rebuilt_at`
- `recovery_started_at`
- `recovered_at`
- `source_timezone`
- `time_source`
- `time_confidence`

方針:

- time metadata は意味を明確にする
- `created_at` を万能な時刻として使わない
- external / device 由来の時刻は source を持つことを検討する
- replay / recovery / correction の時刻は元 event time と分離する
- time metadata の追加・変更は governance 対象にする

---

## ■ governance / recovery との関係整理

### governance

time metadata は event schema / metadata schema の一部として governance 対象になる。

確認観点:

- field 名の意味
- timezone の扱い
- server time / device time / external time の区別
- required / optional の判断
- backward compatibility
- deprecated time field

方針:

- time field の意味を後から変えない
- owner domain が event time の意味を定義する
- external system time を使う場合は source_system と schema version を確認する

### recovery

recovery では時刻情報が判断材料になる。

例:

- projection lag が許容範囲を超えた
- workflow step が timeout した
- offline scan が遅延し、既存 projection と矛盾した
- replay / rebuild の対象時間範囲が不明
- clock drift により ordering が判断できない

方針:

- recovery は source of truth と time metadata を合わせて判断する
- time metadata の矛盾は manual recovery / forensic の対象にする
- recovery audit trail には実行時刻と対象 event time range を含めることを検討する

---

## ■ lightweight start 方針

event time は重要だが、最初から全 event に多数の time field を追加すると複雑になる。

lightweight start の候補:

- 既存 `created_at` の意味を保存時刻として明確化する
- scan / upload / process の代表的な時刻 field 候補を整理する
- offline scan / delayed upload の業務パターンを棚卸しする
- workflow stuck 判定に必要な最小 time metadata を整理する
- replay / rebuild / recovery の audit に必要な時刻を整理する
- clock drift が問題になりやすい external / device source を洗い出す

方針:

- まず `created_at` と business event time の違いを文書化する
- 現場 scan、OCR / EDI、workflow、replay / recovery など高リスク領域から整理する
- timezone / clock drift / delayed event は設計対象として扱う
- 具体的な DB column / migration / API response は今回決定しない

---

## ■ 導入段階案

### Step 1: 既存 time field の棚卸し

`created_at`、`scanned_at`、`uploaded_at`、`processed_at` に相当する既存 field と意味を整理する。

### Step 2: event type ごとの business time 整理

inventory、pallet、warehouse location、OCR / EDI、shipment、billing ごとに、業務発生時刻を何で表すか整理する。

### Step 3: workflow / processing time 整理

workflow step、projection update、consumer processing、retry / timeout の時刻候補を整理する。

### Step 4: replay / rebuild / recovery time 整理

元 event time と再実行・再構築・回復の実行時刻を分けて整理する。

### Step 5: monitoring / governance へ接続

projection lag、workflow stuck、clock drift、delayed event を monitoring / governance の観点に接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- `event_time` をDBへ追加するか
- `business_event_time` と `created_at` をどう分けるか
- `scanned_at` / `uploaded_at` / `processed_at` の正式 field 定義
- timezone の保存形式
- device / external clock の信頼度をどう表すか
- clock drift validation を作るか
- delayed event の許容閾値
- workflow timeout の正式閾値
- replay / rebuild / recovery の time metadata 保存先
- projection freshness の保存先
- admin-dashboard で freshness / delayed warning を表示するか
- event ordering に sequence を導入するか
- archive / cold storage 後の time metadata 保持方針

---

## ■ 原則

event time、processing time、business time、replay time、workflow time を混同しない。

`created_at` は保存時刻であり、業務発生時刻とは限らない。

offline scan、delayed event、external system event では、発生時刻と記録時刻の差分を設計対象にする。

ordering は時刻だけでなく、trace chain、workflow step、source of truth、metadata を合わせて判断する。

time metadata は audit / forensic / observability / recovery の共通基盤になる。
