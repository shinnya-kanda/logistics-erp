# Workflow / Saga Implementation Plan（Phase B8-06）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における workflow / saga / distributed trace の段階導入計画を整理する。

ERP設計憲法、開発ルール、workflow / saga architecture、event-driven implementation roadmap、traceability implementation plan、rebuild / recovery implementation plan、observability / monitoring implementation plan、event processing model、event validation を前提にすると、workflow / saga は単に複数 API を順番に呼ぶ仕組みではない。local transaction で守るべき即時整合と、複数 domain にまたがる長い業務フローを分離し、`parent_trace_id`、event chain、compensation、retry、timeout、manual review によって後から説明できるようにする段階導入である。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- workflow / saga implementation の目的
- current local transaction
- OCR / expected workflow 方針
- actual scan workflow 方針
- reconciliation workflow 方針
- shipment workflow 方針
- billing candidate workflow 方針
- compensation / retry / timeout 方針
- `parent_trace_id` 利用方針
- workflow validation 方針
- workflow observability 方針
- manual review / approval 方針
- warehouse boundary 方針
- rollout / verification 方針
- lightweight workflow 方針
- future optional architecture

---

## ■ workflow / saga implementation の目的

workflow / saga implementation は、複数 domain・複数 API・複数 local transaction にまたがる業務フローを、trace chain と補正可能な step として説明できる状態へ段階的に近づけるための導入計画である。

目的:

- local transaction と distributed workflow の境界を明確にする
- OCR / expected / actual / reconciliation / shipment / billing の流れを段階的に整理する
- workflow の各 step を domain event として説明できるようにする
- `parent_trace_id` で workflow 全体と child trace を接続する
- stuck / missing / duplicate / timeout を検知できるようにする
- commit 済み step は rollback ではなく compensation / correction で扱う
- 実物流・請求・外部送信に関わる step は manual review / approval を前提にする
- warehouse_code boundary を workflow 全体で維持する

workflow / saga は、最初から workflow engine を導入することではない。

まずは業務フロー、step、期待 event、失敗パターン、補正方針を Markdown で整理し、必要な範囲から traceability / observability / validation を接続する。

---

## ■ current local transaction 整理

local transaction は、1つの RPC / DB transaction / command の中で業務上不可分な書き込みを完了させる範囲である。

現時点で local transaction として扱うべき候補:

- inventory in / out / move
- pallet create / move / out
- warehouse location update + history
- idempotency record + transaction creation
- source of truth transaction + immediate projection update

方針:

- 在庫数量やパレット現在状態など、現場操作に直結する即時整合は local transaction を優先する
- local transaction 内では commit / rollback により整合性を守る
- local transaction は domain boundary をまたぎすぎない
- local transaction 成功後の後続処理失敗で source of truth を戻さない
- commit 済みの業務事実は rollback ではなく correction / compensation で扱う

distributed workflow として扱うべき候補:

- OCR / EDI 取込から Expected / Actual / 在庫更新へ進む流れ
- Actual scan から mismatch / reconciliation / inventory update へ進む流れ
- shipment から inventory / pallet / billing へ進む流れ
- replay / recovery / compensation を伴う長い業務フロー

---

## ■ OCR / expected workflow 方針

OCR / expected workflow は、外部入力を受け取り、構造化し、Expected 作成へつなげる workflow である。

代表的な流れ:

```text
ocr.import.received
  -> ocr.import.parsed
  -> ocr.import.corrected
  -> expected.created
```

目的:

- OCR / PDF / CSV などの外部入力をそのまま正解として扱わない
- 人間による確認・補正を workflow step として分離する
- Expected がどの外部入力から作られたかを trace で追えるようにする
- external file hash / source_system / received_at を将来の観測軸として整理する

方針:

- OCR 入力は workflow の起点として扱う
- parse / corrected / accepted / rejected を混同しない
- Expected 作成前に validation / manual review が必要な場合を明確にする
- OCR retry と OCR replay を混同しない
- 元入力や補正理由を trace / metadata で説明できるようにすることを検討する

初期導入では、OCR workflow の DB / job / UI 実装は行わず、step と event 候補を整理する。

---

## ■ actual scan workflow 方針

actual scan workflow は、現場 scan / driver app / 手入力などから Actual を作成し、Expected と照合できる状態へつなげる workflow である。

代表的な流れ:

```text
actual.scan.received
  -> actual.created
  -> actual.validation.completed
  -> actual.matching.requested
```

目的:

- 現場で発生した実績を source / trace として説明できるようにする
- offline scan / delayed upload / device clock の差異を考慮する
- Actual がどの現場操作・QR・OCR・EDI 由来かを分ける
- Expected との照合前に最低限の validation を行う方針を整理する

方針:

- actual scan は business event time と system persisted time を分けて扱う
- scan の重複や再送は idempotency / duplicate detection と接続する
- warehouse_code は guard / server-side profile 由来を基本にする
- Actual を在庫更新へ直結させず、reconciliation step を挟む方針を優先する
- scan 失敗や不整合は削除ではなく investigation / manual review 対象にする

---

## ■ reconciliation workflow 方針

reconciliation workflow は、Expected と Actual を照合し、差異を検出・解消した上で在庫・出荷・請求などの後続処理へつなげる workflow である。

代表的な流れ:

```text
expected.created
  -> actual.created
  -> actual.matched
  -> inventory.in.created
```

差異がある場合:

```text
expected.created
  -> actual.created
  -> actual.mismatch_detected
  -> actual.reconciled
  -> inventory.in.created
```

目的:

- mismatch を単なるエラーではなく業務 event として扱う
- 差異理由、補正者、承認者を後から説明できるようにする
- reconciliation 後の inventory / shipment / billing 影響を trace chain で追えるようにする
- 不確かな OCR / Actual を source of truth に直結させない

方針:

- mismatch は自動削除しない
- reconciliation は上書きではなく `actual.reconciled` のような補正 event として説明する
- inventory update へ進む条件を workflow validation として整理する
- manual review が必要な差異を明確にする
- reconciliation replay は元 trace と新 trace を分離する

---

## ■ shipment workflow 方針

shipment workflow は、出荷指示からピッキング、在庫・パレット出庫、出荷確定、請求候補までをつなぐ workflow である。

代表的な流れ:

```text
shipment.created
  -> shipment.pick.started
  -> shipment.pick.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> shipment.outbound.confirmed
  -> billing.candidate_created
```

目的:

- shipment を親 workflow として扱い、inventory / pallet / billing を child trace として接続する
- shipment 確定、inventory out、pallet out、billing candidate の欠落・順序・重複を検知できるようにする
- 実物流が動いた後の補正を manual review / approval に接続する

方針:

- 在庫出庫やパレット出庫は local transaction として即時整合を守る
- shipment 全体は distributed workflow として扱う
- shipment cancel が出庫後に発生する場合は rollback ではなく compensation を検討する
- billing へ進む前に required predecessor event を確認する方針を整理する
- 実物流・請求に関わる failure は high / critical severity 候補にする

---

## ■ billing candidate workflow 方針

billing candidate workflow は、shipment / inventory / pallet / reconciliation の結果から請求候補を作る将来 workflow である。

代表的な流れ:

```text
shipment.outbound.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> billing.candidate_created
  -> billing.candidate_reviewed
```

目的:

- 請求計算そのものを急がず、請求根拠となる source of truth を正しく蓄積する
- billing candidate がどの shipment / inventory / pallet event から作られたか説明できるようにする
- 請求候補の重複・欠落・取り消しを workflow / projection / validation で検知できるようにする

方針:

- billing candidate は source of truth ではなく、将来の billing event / summary として扱う
- 請求確定後の補正は強い approval 候補にする
- billing candidate workflow は最初から自動化しない
- shipment / inventory / pallet の source of truth を根拠にする
- 請求に関わる replay / correction は audit / manual review を前提にする

---

## ■ compensation / retry / timeout 方針

### compensation

compensation は、commit 済みの業務 step を削除・巻き戻しではなく、別の業務 event / transaction で補正する考え方である。

方針:

- compensation は元 event / trace との関係を持つ
- 実物流・請求・外部送信に関わる compensation は manual approval 候補にする
- compensation reason、operator、approver を metadata として扱うことを検討する
- compensation 後に projection refresh / rebuild が必要か確認する

### retry

retry は、一時的な失敗に対して同じ step を再試行する考え方である。

方針:

- retry は idempotency と組み合わせて二重実行を防ぐ
- retry と replay を混同しない
- retry count / last_error / next_retry_at は将来検討に分離する
- retry で回復しないものは dead-letter / manual review / recovery 対象にする

### timeout

timeout は、一定時間内に step が完了しない状態である。

方針:

- timeout 後に partial write がないか確認する
- timeout は技術エラーだけでなく workflow 停滞として扱う
- timeout severity は業務影響で分類する
- expected next event の期限や閾値は今回決定しない

---

## ■ `parent_trace_id` 利用方針

`parent_trace_id` は、workflow 全体または上位業務と child trace を接続するためのIDである。

利用候補:

- OCR / expected workflow の親 trace
- reconciliation workflow の親 trace
- shipment workflow の親 trace
- billing candidate workflow の親 trace
- replay / compensation / recovery の元 trace 関係

方針:

- `trace_id` は1つの業務操作を束ねる
- `parent_trace_id` は複数 trace を1つの workflow へ接続する
- `request_id` は API 実行の観測IDとして扱う
- `idempotency_key` は二重実行防止であり、workflow identity として流用しない
- 初期段階では `trace_id` 単独検索を安定させ、その後 `parent_trace_id` の保存先・検索方式を検討する

今回、`parent_trace_id` の DB 保存先や relation table は決定しない。

---

## ■ workflow validation 方針

workflow validation は、workflow / saga の event chain と state が業務フローとして妥当かを検証する方針である。

検証候補:

- required predecessor event が存在するか
- expected next event が一定時間内に発生しているか
- stuck workflow が発生していないか
- duplicate step がないか
- invalid transition が発生していないか
- compensation action が元 step と関係づいているか
- replay 禁止 transition に replay が実行されていないか
- workflow owner / step owner が明確か

方針:

- workflow validation は event catalog / dependency / impact analysis と接続する
- validation failure を silent skip しない
- stuck は削除ではなく retry / compensation / manual recovery の対象にする
- 請求・実物流に関わる workflow は強い validation / approval 候補にする
- synchronous に拒否すべき rule と asynchronous に検知する rule を分ける

---

## ■ workflow observability 方針

workflow observability は、workflow の進行状態・失敗・補正・再試行を外部から観測できる状態である。

観測候補:

- workflow name
- parent_trace_id
- current step
- step status
- started_at / completed_at
- retry count
- timeout count
- stuck duration
- last_error
- compensation status
- replay / recovery status
- warehouse_code
- operator / approver metadata

monitoring 候補:

- workflow started count
- workflow completed count
- workflow failed count
- stuck workflow count
- missing event count
- duplicate step count
- compensation count
- replay count
- average duration
- step latency
- domain 別 failure count

方針:

- workflow は成功時だけでなく途中状態も観測対象にする
- alert は severity と対応手順に結びつける
- trace_id / parent_trace_id / request_id を調査軸にする
- Admin Dashboard は初期段階では read-only の観測入口として扱う
- workflow observability の保存先や UI は今回決定しない

---

## ■ manual review / approval 方針

manual review は、自動 workflow では業務判断ができない場合に operator / approver が判断する正式な経路である。

manual review が必要なケース:

- OCR / EDI 入力の正当性が不明
- Expected / Actual mismatch が発生した
- source of truth 自体が誤っている可能性がある
- shipment cancel が出庫後に要求された
- compensation action が必要
- replay 禁止ケースに該当する可能性がある
- 請求・外部送信・実物流へ影響する
- warehouse_code boundary に疑義がある

review に必要な情報:

- workflow name
- parent_trace_id
- affected trace_id
- affected warehouse_code
- current step
- failure / mismatch reason
- suggested action
- source of truth reference
- before / after diff
- operator / approver
- reviewed_at

方針:

- manual review は例外ではなく正式な recovery / approval 経路として扱う
- worker に workflow 管理・replay・compensation 権限を与えるかは慎重に検討する
- role matrix は今回決定しない

---

## ■ warehouse boundary 方針

workflow / saga / distributed trace でも `warehouse_code` boundary を維持する。

方針:

- workflow の各 step は許可された warehouse_code 内で実行・参照する
- command の warehouse_code は guard / server-side profile 由来を基本にする
- client payload の warehouse_code を信頼しない
- trace_id / parent_trace_id が一致しても warehouse boundary を越えてよいとは限らない
- workflow validation / observability / recovery でも warehouse_code を観測軸にする
- warehouse boundary violation は high / critical severity 候補にする

注意:

- cross-warehouse workflow が将来必要な場合は、別途 role / approval / audit / data isolation 方針を検討する
- warehouse boundary 問題は workflow stuck ではなく security / data isolation issue として扱う場合がある

---

## ■ rollout / verification 方針

rollout は、workflow engine や queue を作る前に、workflow 候補・step・失敗パターンを整理するところから始める。

推奨 rollout 順:

1. current local transaction を棚卸しする
2. distributed workflow 候補を整理する
3. OCR / expected / actual / reconciliation の step 対応を整理する
4. shipment / billing candidate の step 対応を整理する
5. required predecessor / expected next event を整理する
6. stuck / missing / duplicate / timeout pattern を整理する
7. compensation / retry / manual review 方針を整理する
8. parent_trace_id / trace chain 方針を整理する
9. observability / validation / recovery との接続を整理する

verification 観点:

- local transaction と distributed workflow を混同していない
- commit 済み step を rollback で消す方針になっていない
- source of truth を workflow 表示都合で変更していない
- parent_trace_id / trace_id / request_id / idempotency_key を混同していない
- warehouse_code boundary を維持している
- stuck / missing / duplicate を自動削除していない
- manual review が必要なケースを自動実行しない方針になっている

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の workflow checklist review
- 将来の Admin Dashboard read-only display review
- 将来の role / warehouse_code 別表示確認

---

## ■ lightweight workflow 方針

lightweight workflow は、最初から workflow engine / saga controller / event bus を作らず、業務フローを説明できる最小単位から始める方針である。

初期方針:

- workflow engine を作らない
- saga controller を作らない
- queue / broker / event bus を急がない
- workflow state table を今回決めない
- parent_trace_id / trace-search / manual checklist から始める
- high risk workflow から設計を整理する
- retry / timeout / compensation はまず方針を文書化する

lightweight start の対象:

- OCR / expected workflow
- actual scan workflow
- reconciliation workflow
- shipment workflow
- billing candidate workflow
- replay / recovery workflow

方針:

- 現場運用を止めない
- 既存 local transaction を尊重する
- source of truth を守る
- workflow は audit / recovery / observability のために説明可能にする
- 自動化は source of truth と業務影響が明確になってから検討する

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回決定しない。

候補:

- workflow state table
- workflow_id
- workflow_run_id
- workflow_step_id
- parent_trace_id relation table
- saga controller
- orchestration workflow service
- choreography event bus
- outbox / queue / broker
- workflow status read model
- workflow validation job
- stuck workflow check job
- dead-letter queue
- retry scheduler
- compensation event catalog
- approval workflow
- Admin Dashboard workflow timeline
- workflow observability dashboard

導入判断の観点:

- source of truth を壊さないか
- local transaction と distributed workflow の境界が明確か
- warehouse boundary を維持できるか
- replay / compensation / recovery の監査性を保てるか
- workflow failure を silent skip しないか
- operational simplicity を損なわないか

---

## ■ 今後の検討事項

以下は今回決定しない。

- workflow state を DB に保存するか
- workflow_id と parent_trace_id を同一にするか分離するか
- `parent_trace_id` の保存先
- workflow relation table を作るか
- saga controller を作るか
- orchestration / choreography の採用基準
- event bus / queue / outbox の導入有無
- step status / retry count / timeout の保存先
- stuck workflow の判定閾値
- compensation action の正式 event name
- compensation approval flow
- replay を workflow 全体単位にするか step 単位にするか
- workflow validation job を作るか
- Admin Dashboard workflow timeline
- workflow alert の通知先・severity
- OCR / EDI / shipment / billing の正式 event catalog
- billing candidate workflow の実装時期

---

## ■ 原則

workflow / saga は、複数 domain にまたがる長い業務フローを、trace chain、event chain、compensation、manual review で説明できるようにするための設計である。

在庫・パレットなど即時整合が必要な範囲は local transaction を優先する。

distributed workflow では、commit 済み step を rollback で消さず、compensation / correction / replay / recovery として扱う。

`parent_trace_id` は workflow 全体を接続する候補であり、`trace_id`、`request_id`、`idempotency_key` と混同しない。

最初から workflow engine を作らず、workflow 候補、step、stuck / missing / duplicate pattern、manual review、observability から軽量に始める。
