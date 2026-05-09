# Event Processing Model Architecture（Phase B7-91）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event の生成・配送・処理・projection 更新・workflow 起動の実行モデルを整理する。

event store、CQRS、event bus、projection consistency、event recovery、workflow / saga を前提にすると、event は保存されるだけではなく、read model 更新、workflow 進行、monitoring、replay / rebuild、recovery の起点になる。そのため、同期処理と非同期処理、local transaction と eventual consistency、retry と replay、dead-letter と recovery の境界を整理しておく必要がある。

本ドキュメントでは以下を整理する。

- event processing model の目的
- synchronous / asynchronous processing
- local transaction processing
- eventual consistency processing
- projection update processing
- workflow trigger processing
- retry / idempotency processing
- ordering / duplicate handling
- replay / rebuild processing
- dead-letter processing
- processing observability
- processing authorization
- lightweight start 方針
- governance / recovery との関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event processing model の目的

event processing model は、event が生成されてから consumer に処理され、projection / workflow / monitoring / integration に反映されるまでの実行上の責務を整理する考え方である。

目的:

- command から source of truth event が生成される流れを明確にする
- event の同期処理と非同期処理を使い分ける
- local transaction で守る範囲を明確にする
- projection 更新のタイミングと失敗時の扱いを整理する
- workflow 起動・後続 step 実行の責務を整理する
- retry / idempotency / duplicate / ordering を設計対象にする
- replay / rebuild / dead-letter を通常処理と区別する
- processing failure を observability / recovery につなげる

event processing model は、特定の queue / broker / job 実装を決めるものではない。

既存 RPC、Edge Function、DB transaction、scheduled job、将来の event bus を含め、処理責務をどこで持つべきかを整理するための設計である。

---

## ■ 全体モデル

基本的な処理の流れ:

```text
Command
  -> authorization / validation
  -> local transaction
  -> source of truth event
  -> projection update
  -> workflow trigger
  -> monitoring / observability
```

CQRS 観点:

```text
Write model / event store
  -> processing model
  -> read model / projection
  -> query
```

event bus 観点:

```text
Producer
  -> event delivery
  -> consumer processing
  -> retry / dead-letter / recovery
```

方針:

- source of truth は event processing failure で壊さない
- consumer 処理は duplicate / retry を前提にする
- projection は source of truth から rebuild 可能であることを目指す
- workflow は event chain と trace chain で説明できるようにする

---

## ■ synchronous processing

synchronous processing は、command の実行中に必要な処理を同じ request / transaction flow で完了させる考え方である。

適用候補:

- 在庫数量チェック
- 不足在庫チェック
- warehouse_code / role authorization
- idempotency_key による二重実行防止
- source of truth transaction の作成
- 即時整合が必要な current / cache 更新
- field operation に直結する validation

利点:

- command 成功時点で重要な整合性を担保しやすい
- 利用者へ即時に結果を返せる
- local transaction と組み合わせやすい

注意点:

- 処理が重いと request latency が増える
- 複数 domain を同期連鎖させると結合が強くなる
- 外部 API や長時間処理を同期で抱えると timeout / partial failure が起きやすい

方針:

- 在庫・パレットなど現場操作の即時整合は synchronous processing を優先する
- billing summary や monitoring aggregate などは非同期候補にできる
- 同期処理に含める範囲は業務リスクで判断する

---

## ■ asynchronous processing

asynchronous processing は、source of truth event の作成後に、projection 更新、workflow 後続 step、monitoring、integration などを別処理として実行する考え方である。

適用候補:

- dashboard / monitoring aggregate 更新
- billing summary 更新
- workflow status read model 更新
- external integration
- OCR / EDI 後続処理
- long-running workflow step
- projection diff / rebuild job

利点:

- command latency を抑えられる
- consumer を追加しやすい
- 重い集計や外部連携を分離できる
- retry / dead-letter / recovery の対象を明確にしやすい

注意点:

- eventual consistency を前提にする必要がある
- projection lag / consumer lag を観測する必要がある
- duplicate delivery / ordering 問題が発生し得る
- stuck workflow を検知する必要がある

方針:

- 非同期処理は source of truth の成功後に動く派生処理として扱う
- 非同期 failure は source of truth の破壊ではなく、consumer / projection / workflow delay として扱う
- 初期段階では queue / broker の導入を急がず、job / RPC / Edge Function / DB polling などの候補を比較する

---

## ■ local transaction processing

local transaction processing は、1つの DB transaction または RPC の中で、業務上不可分な書き込みを完了させる考え方である。

対象候補:

- inventory in / out / move
- pallet create / move / out
- warehouse location update + history
- idempotency record + transaction creation
- source of truth event + immediate projection update

方針:

- local transaction 内では commit / rollback により即時整合を守る
- local transaction は domain boundary をまたぎすぎない
- local transaction の成功後に非同期 consumer が失敗しても source of truth を戻さない
- command の `warehouse_code` は guard 由来など信頼できる値を使う
- transaction 内で生成した trace_id / request_id は後続処理の観測軸にする

注意:

- local transaction は distributed workflow 全体の整合性を保証しない
- 複数 domain にまたがる長い業務フローは workflow / saga として扱う
- commit 済みの業務事実は rollback ではなく correction / compensation で扱う

---

## ■ eventual consistency processing

eventual consistency processing は、source of truth と projection / workflow / read model の反映に時間差がある前提で処理する考え方である。

例:

- `inventory_transactions` は作成済みだが dashboard aggregate は未反映
- `pallet_transactions` は作成済みだが monitoring read model は遅延
- `shipment.pick.confirmed` 後に billing candidate 作成が非同期で進む
- OCR parse 完了後に expected / actual reconciliation が後続 job で進む

方針:

- eventual consistency は不整合放置ではない
- projection lag / workflow delay / consumer failure を観測する
- read model freshness を説明できるようにすることを検討する
- 即時整合が必要な操作は synchronous / local transaction を検討する
- 遅延許容できる dashboard / monitoring / billing summary は非同期候補にする

---

## ■ projection update processing

projection update processing は、source of truth event から read model / summary / cache を更新する処理である。

対象候補:

- `inventory_transactions` -> `inventory_current`
- `pallet_transactions` -> `pallet_units`
- transactions / histories -> trace timeline
- shipment event -> shipment status
- billing event -> billing summary
- workflow event chain -> workflow status

処理方式候補:

| 方式 | 特徴 |
| --- | --- |
| synchronous update | command 内で projection も更新する |
| asynchronous consumer | event 作成後に consumer が更新する |
| scheduled rebuild | 定期的に source of truth から再作成する |
| query-time aggregation | query 時に複数 source から組み立てる |

方針:

- projection は source of truth ではない
- projection consumer は idempotent にする
- projection failure は read model 遅延または drift として扱う
- projection は source of truth から rebuild できることを目指す
- projection update の処理方式は業務リスクと latency 要件で判断する

---

## ■ workflow trigger processing

workflow trigger processing は、event を起点に workflow / saga の後続 step を開始する処理である。

例:

```text
edi.message.accepted
  -> shipment.created
```

```text
shipment.pick.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> billing.candidate_created
```

処理方式候補:

- orchestration controller が次の command を呼ぶ
- choreography として consumer が event を受けて自 domain の command を実行する
- scheduled job が stuck / pending step を検出して再開する
- operator が manual recovery として step を進める

方針:

- workflow 全体は `parent_trace_id` または workflow metadata で接続する
- workflow trigger は retry / idempotency を前提にする
- workflow step の失敗は source of truth を削除せず、retry / compensation / recovery の対象にする
- 請求・実物流に関わる workflow trigger は authorization / approval を強く検討する

---

## ■ retry / idempotency processing

retry は、一時的な失敗に対して同じ processing を再試行する考え方である。

idempotency は、同一操作の二重実行を防ぐ考え方である。

| 項目 | retry | idempotency |
| --- | --- | --- |
| 主目的 | 一時失敗から再試行する | 二重実行を防ぐ |
| 対象 | consumer / workflow step / external integration | command / processing key |
| 注意 | retry 回数や間隔が必要 | replay と混同しない |

方針:

- command retry は idempotency_key と組み合わせる
- consumer retry は duplicate processing を前提に設計する
- retry count / last_error / next_retry_at は将来検討する
- retry で回復しないものは dead-letter / recovery に回す
- retry と replay を混同しない

---

## ■ ordering / duplicate handling

ordering は、event の処理順序が業務順と一致するかの問題である。

duplicate は、同じ event または同じ業務操作が複数回処理される問題である。

ordering の観点:

- local transaction 内の順序
- cross-domain workflow の順序
- created_at と business event time の違い
- retry による再処理順序
- replay event と通常 event の順序

duplicate の観点:

- 同じ idempotency_key
- 同じ event_id
- 同じ external file hash
- 同じ trace_id / business identifier
- consumer checkpoint の重複

方針:

- `created_at` だけで完全な ordering を保証しない
- workflow step / parent_trace_id / event metadata で業務順を補足する
- duplicate は削除ではなく、skip / investigation / correction / recovery の対象にする
- consumer は idempotent にする
- ordering 不明は observability / forensic の調査対象にする

---

## ■ replay / rebuild processing

### replay processing

replay processing は、過去 event / trace / external input を参照し、新しい操作として再実行する処理である。

方針:

- replay は元 event を上書きしない
- replay には新しい trace_id を発行することを基本にする
- replay event と通常 event を metadata で区別する
- replay 結果は projection / workflow consumer の処理対象になり得る
- replay と retry / idempotency replay を混同しない

### rebuild processing

rebuild processing は、source of truth から projection / read model を再構築する処理である。

方針:

- rebuild は event bus の過去配送に依存しない
- rebuild は source of truth を根拠にする
- rebuild 結果と現行 read model の差分を検出する
- rebuild job と event consumer の責務を混同しない
- rebuild failure は recovery 対象にする

---

## ■ dead-letter processing

dead-letter processing は、通常の processing 経路で処理できない event / task を分離し、調査・再処理・補正・保留へつなげる考え方である。

dead-letter 候補:

- schema version を解釈できない
- required metadata が欠落している
- consumer retry が上限に達した
- warehouse_code boundary と矛盾している
- external file が参照できない
- duplicate / ordering 問題が解決できない
- authorization で処理できない

方針:

- dead-letter は event を捨てる場所ではない
- source of truth を削除せず、処理不能状態を説明可能にする
- dead-letter は recovery / manual intervention / owner domain review の入口にする
- sensitive metadata を含む場合は閲覧権限を強くする
- dead-letter の具体的な table / queue は今回決定しない

---

## ■ processing observability

processing observability は、event の生成・配送・処理・projection 更新・workflow 起動を観測できる状態である。

観測候補:

- event produced count
- event processing success / failure count
- consumer lag
- retry count
- duplicate count
- dead-letter count
- projection latency
- projection freshness
- workflow trigger count
- workflow stuck count
- replay processing count
- rebuild duration / diff
- processing duration

必要なID:

- event_id
- event_name
- event_version
- trace_id
- parent_trace_id
- request_id
- idempotency_key
- warehouse_code
- producer
- consumer
- projection name
- workflow name

方針:

- processing failure は単なる技術エラーではなく業務リスクとして扱う
- alert は severity と対応手順に結びつける
- processing observability は recovery observability と接続する
- read model の見た目だけで source of truth の正しさを判断しない

---

## ■ processing authorization

processing authorization は、event の生成・処理・再処理・replay / rebuild / dead-letter 操作に必要な権限を整理する考え方である。

対象:

- command execution
- event production
- projection refresh / rebuild
- workflow trigger / resume
- dead-letter retry
- replay execution
- correction event creation
- external integration processing

方針:

- command は role / warehouse_code をサーバー側で確定する
- consumer は許可された warehouse_code / metadata の範囲だけ処理する
- replay / rebuild / dead-letter / recovery は通常 command より強い権限を検討する
- worker が processing 管理操作を行えるかは慎重に判断する
- authorization の具体実装は今回決定しない

---

## ■ governance / recovery との関係整理

### governance

event processing は governance で定義された event contract に従う。

確認観点:

- event name / owner domain
- event schema / version
- producer / consumer catalog
- deprecated event support
- integration event compatibility
- replay / rebuild support

方針:

- owner domain は event の意味と schema を管理する
- consumer 追加時は producer / consumer catalog を更新することを検討する
- deprecated event も必要な consumer が読めるようにする

### recovery

processing failure は recovery の入力になる。

接続例:

- projection update failure -> projection recovery
- workflow trigger failure -> workflow recovery
- retry exhausted -> dead-letter recovery
- replay processing failure -> replay failure recovery
- rebuild processing failure -> rebuild failure recovery

方針:

- processing failure を silent skip しない
- recovery は source of truth と trace chain を根拠にする
- recovery の結果として replay / rebuild / correction / manual intervention を選び分ける

---

## ■ lightweight start 方針

event processing model は重要だが、最初から大きな event processing platform を作ると複雑になる。

lightweight start の候補:

- 既存 RPC 内の local transaction processing を明文化する
- `inventory_current` / `pallet_units` の projection update 方式を整理する
- trace-search で確認できる event source と processing の関係を整理する
- workflow trigger 候補を設計文書上で棚卸しする
- retry / idempotency / duplicate の既存仕様を一覧化する
- dead-letter / recovery はまず運用設計として整理する

方針:

- まず source of truth と local transaction を安定させる
- projection は rebuild 可能性を優先する
- exactly-once processing を初期目標にしない
- at-least-once + idempotent consumer を基本候補にする
- queue / broker / outbox / DB polling などの具体方式は今回決定しない

---

## ■ 導入段階案

### Step 1: command / event / projection flow の整理

inventory、pallet、warehouse location、shipment、OCR / EDI、billing の command から projection までの処理流れを整理する。

### Step 2: synchronous / asynchronous の分類

即時整合が必要な処理と、eventual consistency を許容できる処理を分類する。

### Step 3: retry / idempotency / duplicate 方針整理

command、consumer、workflow step、external integration ごとに retry と idempotency の扱いを整理する。

### Step 4: observability / dead-letter 候補整理

processing failure、consumer lag、dead-letter、projection failure、workflow stuck の観測項目を整理する。

### Step 5: recovery / governance への接続

processing failure を recovery 方針、event catalog、governance review と接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event processing platform を作るか
- queue / broker / outbox / DB polling のどれを採用するか
- event_id をDBへ保存するか
- consumer checkpoint の保存先
- retry count / last_error / next_retry_at の保存先
- dead-letter table / queue を作るか
- projection update を同期にするか非同期にするか
- workflow trigger を orchestration / choreography のどちらに寄せるか
- replay event を通常 consumer に流すか分けるか
- rebuild job の実行方式
- processing observability の保存先
- processing authorization の正式ロール設計
- event catalog と processing registry を統合するか
- processing failure の severity 定義

---

## ■ 原則

event processing は、source of truth を作る処理と、そこから派生する consumer 処理を分けて考える。

local transaction は即時整合を守り、distributed workflow は event chain / trace chain / recovery で説明する。

projection failure や event delivery failure で source of truth を壊してはいけない。

consumer は retry / duplicate を前提に idempotent に設計する。

processing model は軽量に始め、projection、workflow、integration、recovery の必要性に応じて段階的に拡張する。
