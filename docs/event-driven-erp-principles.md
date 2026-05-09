# Event-Driven ERP Principles（Phase B7-100）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event-driven ERP の原理原則を整理する。

ERP設計憲法、開発ルール、event store、CQRS、workflow / saga、event processing model、event contract、event validation、event lifecycle、event impact analysis、event governance、event recovery、observability、event security を前提にすると、logistics-erp は単なる CRUD 型の在庫アプリではなく、業務事実を履歴として残し、projection / workflow / replay / rebuild / audit / recovery へつなげる ERP として育てる必要がある。

ただし、event-driven ERP は最初から巨大な event platform を作ることではない。

現場運用を止めず、既存機能を壊さず、真実ログと説明可能性を守りながら、段階的に event-driven な構造へ進化させるための原則である。

本ドキュメントでは以下を整理する。

- event-driven ERP の目的
- source of truth 原則
- append-only 原則
- correction over overwrite 原則
- replay / rebuild 原則
- projection は cache / read model 原則
- eventual consistency 原則
- workflow / saga 原則
- traceability 原則
- auditability 原則
- observability 原則
- governance 原則
- security / warehouse boundary 原則
- compatibility / lifecycle 原則
- lightweight evolution 原則
- operational simplicity 原則
- anti-pattern 集

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event-driven ERP の目的

event-driven ERP は、物流ERP上で発生した業務上の事実を event / transaction / history として残し、その event を根拠に現在状態、検索、監視、workflow、replay、rebuild、audit、recovery を成立させる考え方である。

目的:

- 業務上「何が起きたか」を後から説明できる
- 現在状態の根拠を source of truth へ戻れる
- 誤りを削除ではなく補正として扱える
- projection / read model を rebuild できる
- 長い workflow を trace / event chain で追える
- replay / recovery を元履歴と関係づけられる
- warehouse_code 境界を守りながら横断調査できる
- 現場運用を止めず段階的に拡張できる

event-driven ERP は、イベントを増やすこと自体を目的にしない。

在庫・パレット・OCR / EDI・shipment・billing・audit を、将来も説明できる形でつなげるための設計原則である。

---

## ■ source of truth 原則

source of truth は、業務上の事実を説明する根拠データである。

現時点の代表:

| domain | source of truth 候補 |
| --- | --- |
| inventory | `inventory_transactions` |
| pallet | `pallet_transactions` |
| warehouse location | `warehouse_location_history` |
| shipment | 将来の shipment event / shipment history |
| OCR / EDI | 将来の external input event / parsed event |
| billing | 将来の billing event / billing history |

原則:

- 現在状態より履歴を優先する
- `inventory_current` を在庫の真実として扱わない
- `pallet_units` をパレット履歴の代替として扱わない
- source of truth は trace_id / parent_trace_id / metadata と接続できるようにする
- read model / projection から source of truth へ戻れるようにする

判断:

- 画面表示や検索性能の都合で source of truth を歪めない
- source of truth が誤っている場合は correction event / compensation transaction で説明する
- source of truth と projection がずれた場合は source of truth を根拠に調査する

---

## ■ append-only 原則

append-only は、過去の業務事実を安易に update / delete せず、新しい event / transaction / history を追加して履歴を積み上げる考え方である。

原則:

- 過去の真実ログを安易に更新・削除しない
- 誤りは correction / compensation として追加する
- replay 結果は元 event を上書きせず、新しい event として残す
- archive 後も append-only の意味を維持する
- audit では元 event と補正 event の両方を確認できるようにする

append-only は、誤りを放置するという意味ではない。

誤りを消すのではなく、誤りがあり、どう補正したかを説明できるようにする原則である。

---

## ■ correction over overwrite 原則

correction over overwrite は、commit 済みの業務事実を上書きで消さず、新しい補正 event / transaction で説明する考え方である。

原則:

- commit 前の失敗は rollback で扱う
- commit 済みの誤りは correction / compensation で扱う
- correction は元 event / trace との関係を持つ
- correction reason、operator、approver を metadata として扱うことを検討する
- 請求・実物流に関わる correction は強い承認候補にする

例:

| 誤り | 対応候補 |
| --- | --- |
| 誤入庫 | 調整 transaction / `inventory.adjust.created` |
| 誤出庫 | 逆方向の補正 transaction |
| 誤パレット移動 | 正しい棚番への追加 move event |
| OCR 誤読 | `ocr.corrected` |
| Expected / Actual 差異 | `actual.reconciled` |
| 請求候補誤り | billing correction / cancel candidate |

---

## ■ replay / rebuild 原則

replay と rebuild は、どちらも過去データを使うが目的が異なる。

| 項目 | replay | rebuild |
| --- | --- | --- |
| 主目的 | 過去入力・event を参照して新しい操作として再実行する | source of truth から projection / read model を再作成する |
| 対象 | trace / workflow step / external input | projection / read model / summary |
| 結果 | 新しい event / trace | read model 更新 / diff |
| 注意 | retry と混同しない | source of truth を変更しない |

原則:

- replay は元 event を上書きしない
- replay は idempotency retry と混同しない
- replay 結果は新しい trace_id / event として扱う
- rebuild は source of truth を根拠にする
- rebuild は event bus の過去配送に依存しない
- rebuild で読めない event を silent skip しない
- replay / rebuild failure は recovery 対象にする

---

## ■ projection は cache / read model 原則

projection / read model / cache は、source of truth から派生した読み取り用の状態である。

原則:

- projection は source of truth ではない
- read model は検索・表示・集計・監視のために最適化してよい
- read model を直接直すだけでは audit / integrity は回復しない
- projection は source of truth から rebuild できることを目指す
- projection drift は diff detection / refresh / rebuild / recovery の対象にする

代表例:

| projection / read model | source of truth |
| --- | --- |
| `inventory_current` | `inventory_transactions` |
| `pallet_units` | `pallet_transactions` |
| trace timeline | transactions / histories |
| billing summary | shipment / inventory / billing event |
| workflow status | workflow event chain |

---

## ■ eventual consistency 原則

eventual consistency は、source of truth への書き込みと projection / workflow / read model への反映に時間差があっても、最終的に整合することを目指す考え方である。

原則:

- 即時整合が必要な現場操作は local transaction を優先する
- cross-domain workflow や集計 read model では eventual consistency を許容できる場合がある
- eventual consistency は不整合放置ではない
- projection lag / workflow delay / consumer failure を観測する
- read model freshness を説明できるようにすることを検討する

注意:

- すべてを同期処理にすると coupling と latency が増える
- すべてを非同期処理にすると現場操作の整合性が説明しにくくなる
- 業務リスクに応じて synchronous / asynchronous を選び分ける

---

## ■ workflow / saga 原則

workflow / saga は、複数 domain / 複数 local transaction にまたがる長い業務フローを、event chain と compensation によって説明可能にする考え方である。

原則:

- 1つの巨大 transaction で複数 domain を抱え込まない
- 各 domain は自分の local transaction を完了させる
- distributed workflow では rollback ではなく compensation を基本にする
- workflow の各 step は domain event として説明できるようにする
- workflow 全体は parent_trace_id / workflow metadata で接続する
- stuck / missing / duplicate は monitoring / recovery の対象にする

方針:

- 業務影響が大きい workflow ほど orchestration を検討する
- event contract が安定した領域では choreography を検討できる
- どちらの場合も trace / event / metadata / observability を前提にする

---

## ■ traceability 原則

traceability は、業務操作、API request、transaction、history、workflow、external input を後から追跡できる状態である。

原則:

- `trace_id` は1つの業務操作を束ねる
- `parent_trace_id` は長い業務フローや親子関係を表す
- `request_id` はAPI実行を観測する
- `idempotency_key` は二重実行防止であり trace_id と混同しない
- external file hash / source_system / business identifier は外部入力との接続軸になる
- trace chain を archive / logical deletion で切断しない

traceability は、調査画面のためだけではない。

audit、forensic、replay、rebuild、recovery、billing 根拠の共通基盤である。

---

## ■ auditability 原則

auditability は、後から「誰が・いつ・何を・なぜ行ったか」を説明できる状態である。

原則:

- source of truth を監査根拠にする
- read model の見た目だけで業務事実を判断しない
- correction / replay / recovery は元 event との関係を残す
- operator / approver / reason metadata を必要に応じて残す
- deprecated / archived event も必要な期間読めるようにする
- audit view の閲覧範囲は security boundary に従う

注意:

- audit に便利だからといって、すべての sensitive metadata を通常画面に出してよいわけではない
- auditability と privacy / security は同時に設計する

---

## ■ observability 原則

observability は、event / trace / projection / workflow / recovery の状態を外部から観測できる状態である。

原則:

- observability は単なるログ出力ではない
- trace / event / metadata / request / external input をつなげて「何が起きたか」を説明する
- processing failure は単なる技術エラーではなく業務リスクとして扱う
- alert は severity と対応手順に結びつける
- read model の見た目だけで source of truth の正しさを判断しない

観測候補:

- event produced / consumed count
- projection lag / freshness
- workflow stuck count
- retry / timeout / dead-letter count
- replay / rebuild count
- correction event count
- validation error / warning count
- warehouse_code 別の異常

---

## ■ governance 原則

governance は、event の意味・owner・schema・lifecycle・compatibility・approval を一貫して管理する考え方である。

原則:

- event name は業務意味を表す安定名にする
- owner domain が event の意味を管理する
- owner domain が不明な event は追加しない
- schema change は backward compatibility、projection、replay、rebuild、audit への影響を確認する
- deprecated event は削除せず、必要な consumer が読めるようにする
- event catalog / dependency / impact analysis を governance の入力にする

governance は開発速度を落とすためではない。

domain boundary を守り、event chain を将来も説明可能にするための仕組みである。

---

## ■ security / warehouse boundary 原則

security / warehouse boundary は、event / trace / metadata / archive / replay / rebuild を権限と業務境界で保護する原則である。

原則:

- `warehouse_code` は主要な業務境界として扱う
- command の `warehouse_code` は guard / server-side profile 由来を基本にする
- client payload の `warehouse_code` を信頼しない
- event / trace / metadata / archive 検索は warehouse_code で絞る
- trace_id が一致しても warehouse boundary を越えてよいとは限らない
- replay / rebuild / recovery は通常 query より強い権限を検討する
- metadata に secret / token / API key を入れない
- archive / cold storage 後も access control を維持する

security はAPI認証だけではない。

source of truth、projection、trace search、replay、archive、metadata のそれぞれに適した境界を設計する。

---

## ■ compatibility / lifecycle 原則

compatibility / lifecycle は、event が長期間読み続けられ、schema / metadata / consumer が変わっても破壊されないようにする原則である。

原則:

- event は immutable として扱う
- 新しい reader / projection / replay は古い event version を読めることを目指す
- 古い consumer は未知 optional field を無視できることを目指す
- required field の削除・意味変更は breaking change として扱う
- active / deprecated / archived / replay-only / audit-only を区別する
- lifecycle change は impact analysis と governance review の対象にする
- archived event は deleted ではない

方針:

- 業務意味が変わる場合は version だけで吸収せず、新 event name を検討する
- deprecated event は削除せず、replacement event と移行方針を明示する
- logical deletion / mask / anonymize は source of truth 削除と区別する

---

## ■ lightweight evolution 原則

lightweight evolution は、最初から巨大な event platform を作らず、既存業務と既存データを壊さず段階的に進化させる原則である。

原則:

- 完璧な event sourcing を最初から目指さない
- 現場運用を止めない
- 既存機能を壊さない
- 小さく変更し、戻せる状態を保つ
- high risk domain から優先する
- Markdown / 管理表から始め、必要になった段階で registry / job / UI を検討する
- 具体実装より、まず source of truth と責務境界を明確にする

優先候補:

- `inventory_transactions` / `inventory_current` の関係整理
- `pallet_transactions` / `pallet_units` の関係整理
- trace_id / parent_trace_id の段階的整備
- trace-search / audit / recovery の調査導線
- projection rebuild / diff detection の候補整理

---

## ■ operational simplicity 原則

operational simplicity は、現場・事務・管理者が使い続けられ、障害時に説明できる運用を優先する原則である。

原則:

- 美しい設計より、説明できる設計を優先する
- 例外はコードだけで吸収せず明文化する
- alert は多すぎないようにする
- recovery はまず検知・可視化・手動判断から始める
- 自動化は source of truth と業務影響が明確な範囲から検討する
- query のために write model を歪めない
- small CRUD まで過剰に CQRS / event-driven 化しない

event-driven ERP は、運用を複雑にするための設計ではない。

現場で起きたことを壊さず記録し、事務員・所長・開発者・監査担当者が同じ事実を説明できるようにするための設計である。

---

## ■ anti-pattern 集

避けるべき anti-pattern:

- `inventory_current` を在庫の真実として扱う
- `pallet_units` の直接修正だけで履歴不整合を解決したことにする
- transaction / history を物理削除する
- 誤りを update で上書きし、補正理由を残さない
- replay と retry / idempotency replay を混同する
- rebuild を read model から行う
- projection drift を source of truth の修正で隠す
- workflow 全体を1つの巨大 transaction にする
- stuck workflow を自動削除する
- event name を `IN` / `OUT` / `done` のような曖昧な名前にする
- event meaning の変更を version だけで吸収する
- deprecated event を突然読めなくする
- `warehouse_code` を client payload から信頼する
- trace_id が一致すれば warehouse boundary を越えてよいと考える
- metadata に secret / token / API key / 大きな外部ファイル本文を入れる
- alert を大量に作り、対応手順を決めない
- event platform / queue / registry / UI を最初から過剰に作る
- ついで修正や大規模リファクタで既存業務を壊す

---

## ■ 導入段階案

### Step 1: source of truth と projection の整理

inventory、pallet、warehouse location を中心に、source of truth と read model の対応を明確にする。

### Step 2: traceability と correction 方針の整理

trace_id / parent_trace_id、correction event、compensation、replay relationship の考え方を整理する。

### Step 3: workflow / projection / observability の整理

shipment、OCR / EDI、billing につながる workflow と、projection lag / stuck / drift の観測候補を整理する。

### Step 4: governance / security / lifecycle の整理

event catalog、owner domain、warehouse boundary、deprecated / archived / replay-only の扱いを整理する。

### Step 5: lightweight な実装候補の検討

必要になった範囲から、validation、diff detection、rebuild、dead-letter、recovery、dashboard などを段階的に検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- 汎用 event store / trace_events テーブルを新設するか
- queue / broker / outbox / DB polling のどれを採用するか
- event_id / event_version / metadata_version をDBへ保存するか
- event catalog / schema registry / dependency graph をDB化するか
- projection rebuild job を作るか
- validation engine / recovery engine を作るか
- dead-letter table / queue を作るか
- workflow controller / saga controller を作るか
- replay engine の実装方式
- admin-dashboard で event catalog / lifecycle / impact / recovery を表示するか
- observability / alert の保存先と通知先
- security role matrix / forensic 権限の正式設計
- archive / cold storage の具体方式
- legal hold / deletion request への対応

---

## ■ 最終原則

event-driven ERP は、物流現場の業務事実を壊さず記録し、後から説明できるようにするための設計である。

source of truth を守り、projection を派生状態として扱い、誤りは上書きではなく補正で説明する。

replay / rebuild / workflow / recovery は、event store と trace chain を根拠に行う。

warehouse_code boundary、governance、compatibility、lifecycle、observability を守りながら、軽量に始めて段階的に育てる。

logistics-erp は「作って終わり」ではなく、現場運用を壊さず育てる ERP である。
