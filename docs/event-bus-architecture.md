# Event Bus Architecture（Phase B7-87）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event delivery、consumer、projection 更新、workflow 接続、integration event 配送の考え方を整理する。

event store / CQRS / workflow / governance / security を前提にすると、domain event は保存されるだけでなく、read model 更新、workflow 進行、monitoring、外部連携の起点になり得る。その配送境界を曖昧にすると、missing event、duplicate、ordering、stuck workflow、projection 不整合が発生しやすくなる。

本ドキュメントでは以下を整理する。

- event bus の目的
- producer / consumer の考え方
- domain event / integration event delivery
- projection update flow
- workflow / saga event flow
- retry / duplicate / ordering 問題
- dead-letter 的考え方
- event delivery guarantee
- eventual consistency と event bus
- replay / rebuild と event bus
- observability / monitoring
- security / governance
- external integration bus の将来像
- lightweight start 方針

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event bus の目的

event bus は、producer が発行した event を consumer へ届けるための論理的な配送境界である。

目的:

- domain event を projection / read model 更新へつなげる
- integration event を他 domain へ届ける
- workflow / saga の後続 step を起動する
- monitoring / alerting の入力にする
- retry / duplicate / ordering / dead-letter を整理する
- producer と consumer の結合を弱める

event bus は、必ずしも最初から専用 queue / message broker を導入することを意味しない。

初期段階では、DB transaction、RPC、Edge Function、scheduled job、projection job などの既存構成を使いながら、event delivery の責務と境界を明確にする。

---

## ■ producer / consumer の考え方

producer は event を発行する側である。

consumer は event を受け取り、projection 更新、workflow 進行、integration、monitoring などを行う側である。

| 項目 | producer | consumer |
| --- | --- | --- |
| 主責務 | event を作る | event を処理する |
| 例 | inventory command / pallet command / OCR parser | projection updater / workflow step / monitoring job |
| 所有者 | owner domain | 処理先 domain または read model owner |
| 注意点 | event schema と意味を安定させる | idempotent に処理する |

方針:

- producer は event の意味と schema を owner domain として管理する
- consumer は event を自 domain の処理へ変換する
- consumer は duplicate delivery を想定して idempotent にする
- producer は consumer の内部実装に依存しない
- consumer の失敗は event store の source of truth を壊さない

---

## ■ domain event delivery

domain event delivery は、同一 domain または近い read model へ domain event を届ける考え方である。

例:

```text
inventory.out.distributed
  -> inventory_current projection
  -> inventory monitoring aggregate
```

```text
pallet.move.completed
  -> pallet_units projection
  -> pallet timeline read model
```

方針:

- domain event は owner domain が意味を管理する
- domain 内 projection は source of truth から rebuild できることを目指す
- local transaction 内で同期更新するか、後続 job で非同期更新するかは業務要件で判断する
- projection 更新に失敗しても、source of truth を更新・削除しない
- delivery failure は monitoring 対象にする

---

## ■ integration event delivery

integration event delivery は、ある domain の event を別 domain へ届ける考え方である。

例:

```text
edi.message.accepted
  -> shipment.created
```

```text
shipment.outbound.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> billing.candidate_created
```

方針:

- integration event は domain 間の契約として扱う
- producer domain は event name / version / schema を安定させる
- consumer domain は unknown field を許容する
- required field の削除や意味変更は破壊的変更として扱う
- integration event の失敗・遅延は workflow / monitoring の対象にする

注意:

- integration event は他 domain の source of truth を直接共有するものではない
- 受信側 domain は event を自 domain の command / workflow step へ変換する

---

## ■ projection update flow

projection update flow は、event store / write model から read model を更新する流れである。

例:

```text
Command
  -> source of truth event
  -> projection update
  -> read model
  -> Query
```

対象例:

- `inventory_transactions` -> `inventory_current`
- `pallet_transactions` -> `pallet_units`
- transaction / history -> trace timeline
- shipment event -> shipment status read model
- billing event -> billing summary read model
- workflow event -> workflow status read model

方針:

- read model は source of truth ではない
- projection は再実行・rebuild 可能であることを目指す
- projection consumer は idempotent にする
- projection failure は source of truth の破壊ではなく read model 遅延として扱う
- projection latency / failure / freshness は observability 対象にする

---

## ■ workflow / saga event flow

workflow / saga event flow は、複数 domain にまたがる長い業務フローを event chain で進める考え方である。

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

orchestration saga では、workflow controller が次の command を明示的に呼び出す。

choreography saga では、各 domain が event を受けて自律的に後続処理を行う。

方針:

- workflow 全体は `parent_trace_id` または workflow metadata で接続する
- 各 step は domain event として説明できるようにする
- stuck workflow は event chain の欠落・遅延として監視する
- compensation は元 event を消さず、correction / compensation event として扱う
- retry と replay を混同しない

---

## ■ retry / duplicate / ordering 問題

event bus では、retry、duplicate、ordering が重要な設計課題になる。

### retry

retry は、一時的な失敗に対して同じ event processing を再試行する考え方である。

方針:

- consumer 処理は retry される可能性を前提にする
- retry count / last_error / next_retry_at を将来検討する
- retry と replay を混同しない

### duplicate

duplicate は、同じ event が複数回処理される問題である。

方針:

- consumer は idempotent にする
- event_id / trace_id / idempotency_key / consumer checkpoint の利用を将来検討する
- duplicate を検出した場合は削除ではなく調査・skip・補正として扱う

### ordering

ordering は、event の処理順序が業務順と一致するかの問題である。

方針:

- 単一 local transaction 内ではDB transaction の整合性を優先する
- cross-domain event では `parent_trace_id` / workflow step / event metadata で業務順を補足する
- `created_at` だけで完全な ordering を保証しない
- ordering 不明は monitoring / forensic の調査対象にする

---

## ■ dead-letter 的考え方

dead-letter は、処理できなかった event を通常の処理経路から分離し、調査・再処理・補正の対象にする考え方である。

dead-letter 候補:

- schema version を解釈できない event
- required metadata が欠落している event
- consumer が一定回数 retry しても失敗する event
- warehouse_code boundary と矛盾する event
- external file が見つからない event
- duplicate / ordering 問題が解決できない event

方針:

- dead-letter は event を捨てる場所ではない
- source of truth を削除せず、処理不能状態を説明可能にする
- manual recovery / correction / replay の候補にする
- severity と業務影響を分ける
- dead-letter の表示・通知・再処理権限は将来検討する

---

## ■ event delivery guarantee の考え方

event delivery guarantee は、event が consumer にどの程度保証されて届くかの考え方である。

候補:

| guarantee | 意味 | 注意 |
| --- | --- | --- |
| at-most-once | 最大1回届ける | 欠落の可能性がある |
| at-least-once | 1回以上届ける | duplicate の可能性がある |
| exactly-once | ちょうど1回届ける | 実現が難しく複雑 |

方針:

- 初期段階では exactly-once を前提にしない
- at-least-once + idempotent consumer を基本候補にする
- 重要 projection は rebuild で補正できるようにする
- duplicate / retry を観測できるようにする
- delivery guarantee は domain ごとに業務影響を見て判断する

event delivery guarantee は、source of truth の正しさと read model の鮮度を分けて考える必要がある。

---

## ■ eventual consistency と event bus

event bus は、write model と read model、または domain 間の処理を非同期につなぐため、eventual consistency と関係が深い。

例:

- inventory event は作成済みだが dashboard 集計が未反映
- shipment event は作成済みだが billing candidate がまだ作られていない
- OCR parse は完了したが expected / actual reconciliation が未実行

方針:

- eventual consistency は不整合放置ではない
- projection delay / workflow delay / stuck event を monitoring する
- UI / dashboard では read model freshness を説明できるようにすることを検討する
- 即時整合が必要な field operation は local transaction / synchronous update を検討する
- billing / monitoring / dashboard は非同期更新を許容できる場合がある

---

## ■ replay / rebuild と event bus の関係

### replay

replay は、過去 event / input / trace を参照して新しい操作として再実行する。

event bus との関係:

- replay 結果は新しい event として配送対象になり得る
- replay event と通常 event を区別する metadata が必要になる
- replay により projection / workflow consumer が再実行される可能性がある
- replay は idempotency retry と混同しない

方針:

- replay event は元 trace と関係づける
- replay consumer は通常 consumer と同じか分けるかを将来検討する
- replay による二重配送や二重 projection を防ぐ設計を検討する

### rebuild

rebuild は、event bus の過去配送に依存せず、source of truth から read model を再構築する処理である。

方針:

- rebuild は event bus delivery failure の回復手段になり得る
- rebuild は source of truth を根拠にする
- rebuild 結果と現行 read model の差分を検出する
- rebuild job と event bus consumer の責務を混同しない

---

## ■ observability / monitoring との関係

event bus は、配送・処理・遅延・失敗を観測できる必要がある。

観測候補:

- event produced count
- event consumed count
- consumer success / failed count
- retry count
- duplicate count
- dead-letter count
- projection latency
- workflow stuck count
- consumer lag
- last processed event time
- delivery duration
- domain 別 failure count

必要なID:

- event_id
- event_name
- event_version
- trace_id
- parent_trace_id
- request_id
- warehouse_code
- consumer name

方針:

- event bus の失敗は単なる技術エラーではなく、業務フロー停滞として扱う
- alert は業務影響と対応手順に結びつける
- event bus observability は workflow / CQRS / integrity monitoring と接続する

---

## ■ security / governance との関係

event bus は、event を複数 consumer に届けるため、security / governance の影響を受ける。

security 観点:

- producer / consumer の実行権限
- warehouse_code boundary
- sensitive metadata の配送範囲
- external file 参照権限
- replay event の実行権限
- dead-letter の閲覧権限

governance 観点:

- event name / owner domain
- event schema / version
- compatibility policy
- deprecated event
- integration consumer
- replay / rebuild support

方針:

- event bus は governance で定義された event contract に従う
- consumer は許可された warehouse_code / metadata のみ処理する
- sensitive metadata を不要な consumer に配送しないことを検討する
- deprecated event も必要な consumer が読めるようにする
- replay / dead-letter / recovery は強い権限を検討する

---

## ■ external integration bus の将来像

external integration bus は、外部システムとの event / message 連携を扱う将来構想である。

対象候補:

- EDI file / message
- external API webhook
- billing export
- shipment notification
- OCR service callback
- partner system integration

方針:

- internal domain event と external integration event を混同しない
- external system id と internal id を分離する
- external payload は schema version / source system を持つことを検討する
- 外部送信済み event は replay / deletion に制約を持つ
- external integration failure は dead-letter / retry / manual recovery の対象にする

初期段階では、外部連携専用 bus の導入は決定しない。

まずは internal event delivery と external input metadata の整理を優先する。

---

## ■ lightweight start 方針

event bus は重要だが、最初から大きな基盤を導入すると複雑さが増える。

lightweight start の候補:

- 既存 RPC 内で source of truth と同期 projection を更新する
- 定期 job で projection diff / rebuild を検証する
- trace-search で event を横断確認する
- consumer を明示した設計文書から始める
- event catalog で producer / consumer を管理する
- workflow / saga の重要箇所から event delivery を整理する

方針:

- まず source of truth を安定させる
- projection は rebuild 可能性を優先する
- exactly-once delivery を初期目標にしない
- event bus 導入は、業務リスク・処理量・consumer 数を見て段階的に判断する
- queue / broker / outbox などの具体実装は今回決定しない

---

## ■ 導入段階案

### Step 1: producer / consumer の棚卸し

inventory、pallet、warehouse location、shipment、OCR / EDI、billing の event producer / consumer を整理する。

### Step 2: projection update flow の整理

`inventory_current`、`pallet_units`、trace timeline、billing summary、monitoring aggregate の更新経路を整理する。

### Step 3: workflow event flow の整理

shipment、OCR / EDI、expected / actual の workflow step と integration event を整理する。

### Step 4: retry / duplicate / dead-letter 方針整理

consumer idempotency、retry、duplicate detection、dead-letter 的扱いを設計する。

### Step 5: lightweight implementation 方針検討

既存 RPC / job / Edge Function / future queue のどこまでを使うかを、業務影響に応じて検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event bus を実装するか
- queue / broker / outbox / DB polling のどれを採用するか
- event_id をDBへ保存するか
- consumer checkpoint の保存先
- retry count / last_error / next_retry_at の保存先
- dead-letter queue / table を作るか
- event delivery guarantee の正式方針
- projection update を同期にするか非同期にするか
- workflow controller と event bus の責務分離
- replay event を通常 bus に流すか分けるか
- external integration bus を作るか
- consumer ごとの warehouse_code / metadata filtering
- event bus monitoring / alert の実装方式
- event catalog と consumer registry の管理方法

---

## ■ 原則

event bus は、event を producer から consumer へ届ける論理的な境界である。

source of truth は event delivery の失敗で壊してはいけない。

consumer は duplicate / retry を前提に idempotent に設計する。

projection は source of truth から rebuild できることを目指す。

event bus は軽量に始め、workflow / projection / integration の必要性に応じて段階的に拡張する。
