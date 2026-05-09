# Event-Driven Implementation Roadmap（Phase B8-01）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event-driven ERP 設計を、現実的な段階導入へ落とし込むための roadmap を整理する。

event-driven ERP principles、event store、CQRS、event processing model、event recovery、event validation、event impact analysis、event lifecycle を前提にすると、logistics-erp は source of truth、append-only、correction、traceability、projection rebuild、workflow / saga、governance、observability を段階的に整備していく必要がある。

ただし、event-driven ERP を一度に全面導入することは目的ではない。

現場運用を止めず、既存機能を壊さず、Node API から Supabase Edge Functions への移行状況とも整合させながら、high risk domain から小さく進める。

本ドキュメントでは以下を整理する。

- implementation roadmap の目的
- current state
- already implemented
- lightweight start 方針
- traceability phase
- replay / rebuild phase
- projection consistency phase
- workflow / saga phase
- event catalog / governance phase
- observability / recovery phase
- validation / impact analysis phase
- archive / lifecycle phase
- external integration phase
- anti big-bang migration 方針
- operational rollout 方針
- high risk domain 優先方針
- future optional architecture

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ implementation roadmap の目的

implementation roadmap は、event-driven ERP の原則を、実装・運用・検証の順序へ落とし込むための段階計画である。

目的:

- どこから着手するかを明確にする
- big-bang migration を避ける
- 既存 source of truth を壊さず拡張する
- traceability / replay / rebuild / projection consistency を段階的に強化する
- workflow / saga / governance / observability を過剰実装せず育てる
- high risk domain を優先する
- 将来 optional architecture と今やることを分離する

roadmap は、実装を強制する作業チケット一覧ではない。

設計判断の順序、依存関係、優先度を揃えるための導入方針である。

---

## ■ current state 整理

現時点の logistics-erp は、完全な event-driven architecture ではないが、event-driven ERP へ移行するための土台をすでに持っている。

主な current state:

- `inventory_transactions` は在庫数量変動の source of truth として機能している
- `inventory_current` は在庫現在状態の projection / cache として扱うべき位置づけにある
- `pallet_transactions` はパレット移動・出庫などの source of truth として機能している
- `pallet_units` はパレット現在状態の projection / cache として扱うべき位置づけにある
- `warehouse_location_history` は棚番変更履歴の source of truth 候補である
- 主要 write API は Supabase Edge Functions へかなり移行済みである
- `warehouse_code` は Edge Function guard 由来へ寄せる方針が進んでいる
- `trace_id` は一部の inventory 系操作で write support が入り始めている
- `trace-search` により複数履歴 source の横断検索が始まっている
- Admin Dashboard に trace_id 検索 UI が追加されている
- Node API 依存は一部残っている
- admin 在庫表示など、source of truth と read model の整理が必要な箇所が残る

現状の評価:

- source of truth の候補は明確になりつつある
- projection / read model の位置づけはまだ運用・画面ごとに混在している
- traceability は初期段階であり、全 domain を横断するには未整備である
- replay / rebuild / workflow / governance / observability は設計整理が先行しており、実装は今後段階導入する

---

## ■ already implemented 整理

すでに実装または導入済みに近いもの:

### Edge Functions / Auth / RBAC

- Supabase Auth / JWT を前提にした Edge Function 化が進行中
- `adminGuard` / `fieldWriteGuard` による role 制御が導入済み
- write 系 Edge Functions では `warehouse_code` を guard 由来に寄せる方針が適用されている
- `admin` / `chief` / `office` / `worker` の role 境界が整理されつつある

### Source of Truth

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`

これらは event store 的な source of truth として扱う前提ができている。

### Projection / Read Model

- `inventory_current`
- `pallet_units`
- Admin Dashboard の検索・一覧
- trace-search の統合 timeline

これらは source of truth から派生する read model / cache として扱う方向が整理されている。

### Traceability

- `trace_id` の design / DB design / migration plan が整理済み
- inventory-move / inventory-out に trace_id write support が導入済み
- `warehouse_location_history.trace_id` の nullable column が追加済み
- `trace-search` Edge Function が追加済み
- Admin Dashboard に trace検索 UI が追加済み

### Design Foundation

B7 系で以下の設計文書が整理済み:

- event store
- CQRS
- workflow / saga
- event processing model
- event catalog / governance / contract
- event validation
- event dependency / impact analysis
- event lifecycle
- event-driven ERP principles
- recovery / security / observability / retention 系設計

---

## ■ lightweight start 方針

event-driven ERP の実装は、最初から大きな event platform を作らない。

lightweight start の方針:

- 既存 source of truth を尊重する
- 汎用 event store の新設を急がない
- 既存履歴テーブルに traceability を段階的に追加する
- projection rebuild / validation は high risk domain から始める
- event catalog / governance は Markdown / 管理表から始める
- observability / recovery はまず検知・可視化・手動判断を優先する
- queue / broker / workflow engine / schema registry は必要性が明確になってから検討する

最初に守るもの:

- source of truth
- warehouse_code boundary
- traceability
- projection rebuild 可能性
- correction over overwrite
- impact analysis

---

## ■ traceability phase

traceability phase は、業務操作を `trace_id` / `parent_trace_id` / `request_id` / metadata で追跡できるようにする段階である。

目的:

- どの API request がどの transaction / history を作ったか追える
- inventory / pallet / warehouse location を trace_id で横断できる
- 将来の workflow / replay / recovery の調査軸を作る
- warehouse_code 境界を守った trace 検索を維持する

優先候補:

1. trace_id write support の対象拡大
2. pallet_transactions への trace_id 対応検討
3. warehouse_location_history の trace_id 利用箇所整理
4. request_id / parent_trace_id の導入方針整理
5. trace-search の対象 source / 表示項目整理
6. trace_id と idempotency_key の関係整理

注意:

- trace_id を NOT NULL 化しない
- backfill を急がない
- trace_id が一致しても warehouse boundary を越えない
- traceability のために既存業務ロジックを壊さない

---

## ■ replay / rebuild phase

replay / rebuild phase は、過去 event / trace / source of truth を使って再実行・再構築できる状態を整える段階である。

目的:

- projection drift を source of truth から回復できる
- replay と retry を区別する
- rebuild の根拠を current / cache ではなく source of truth に置く
- replay / rebuild failure を recovery へ接続する

優先候補:

1. `inventory_current` rebuild の正式手順整理
2. `pallet_units` rebuild / validation の正式手順整理
3. rebuild 前後 diff の確認項目整理
4. replay 禁止 / 要承認 event の整理
5. replay metadata の候補整理
6. old event / deprecated event を rebuild で読めるか確認

導入方針:

- まず dry-run / compare-only の考え方から整理する
- 自動 apply より diff detection を優先する
- source of truth を変更しない rebuild を優先する
- replay は high risk domain では手動承認を前提に検討する

---

## ■ projection consistency phase

projection consistency phase は、source of truth と projection / read model / cache の整合性を検出・説明・回復できるようにする段階である。

対象:

- `inventory_current`
- `pallet_units`
- trace timeline
- workflow status
- billing summary
- monitoring aggregate

優先候補:

1. source of truth と projection の対応表整理
2. `inventory_transactions` 集計と `inventory_current` の差分候補整理
3. `pallet_transactions` 最新状態と `pallet_units` の差分候補整理
4. projection freshness / lag の設計整理
5. projection rebuild / refresh の運用設計
6. admin 在庫表示の責務整理

方針:

- projection を source of truth として扱わない
- projection 差分は削除ではなく調査・refresh・rebuild・correction の対象にする
- read model の表示都合で source of truth を歪めない
- high risk projection から進める

---

## ■ workflow / saga phase

workflow / saga phase は、複数 domain にまたがる長い業務フローを trace / event chain と compensation で説明できるようにする段階である。

対象候補:

- shipment workflow
- OCR / EDI workflow
- expected / actual reconciliation workflow
- billing workflow
- replay / recovery workflow

優先候補:

1. workflow 候補の棚卸し
2. workflow step と domain event の対応整理
3. required predecessor / expected next event の整理
4. stuck / missing / duplicate pattern の整理
5. compensation action 候補整理
6. workflow trace / parent_trace_id 方針整理

方針:

- 最初から workflow engine を作らない
- 実物流・請求に関わる workflow は強い review 候補にする
- local transaction と distributed workflow を混同しない
- commit 済み処理は rollback ではなく compensation で扱う

---

## ■ event catalog / governance phase

event catalog / governance phase は、event name、owner domain、producer / consumer、schema、lifecycle、replay / rebuild support を管理できるようにする段階である。

優先候補:

1. event registry 最小版を Markdown で作る
2. owner domain を整理する
3. producer / consumer を整理する
4. projection / workflow dependency を整理する
5. deprecated / replacement event の候補を整理する
6. impact analysis checklist と接続する

管理候補:

- event_name
- owner_domain
- source_of_truth
- producer
- consumer
- projection
- workflow
- event_version
- metadata_version
- lifecycle
- replay_supported
- rebuild_supported

方針:

- DB 化や schema registry を急がない
- catalog は source of truth ではなく設計情報として扱う
- owner domain が不明な event は追加しない
- governance は開発速度を落とすためではなく、変更影響を明確にするために使う

---

## ■ observability / recovery phase

observability / recovery phase は、event / projection / workflow の異常を検知し、説明可能に回復できるようにする段階である。

観測候補:

- event produced / consumed count
- projection lag / freshness
- workflow stuck count
- retry / timeout count
- dead-letter count
- validation failure count
- replay / rebuild count
- recovery count
- warehouse_code 別異常

recovery 候補:

- consumer retry
- projection refresh
- projection rebuild
- workflow resume
- step replay
- compensation action
- manual recovery

方針:

- まず検知・可視化・手動判断を優先する
- alert は多すぎないようにする
- recovery は source of truth と trace chain を根拠にする
- recovery 自体も audit / forensic の対象にする
- 自動 recovery は業務影響が明確な範囲から検討する

---

## ■ validation / impact analysis phase

validation / impact analysis phase は、event / metadata / identity / time / state transition / projection / security の検証と変更影響確認を段階導入する段階である。

validation 優先候補:

1. warehouse boundary validation
2. source of truth / projection consistency validation
3. trace_id / request_id / idempotency_key の identity validation
4. required metadata validation
5. workflow missing / stuck validation
6. security metadata validation

impact analysis 優先候補:

1. schema change impact
2. metadata change impact
3. producer / consumer impact
4. projection impact
5. workflow impact
6. replay / rebuild impact
7. security / governance impact

方針:

- 最初から validation engine を作らない
- high risk validation は warning 期間を検討する
- validation failure を silent skip しない
- breaking change 判定は技術互換性だけでなく業務影響で判断する
- impact analysis は Markdown checklist から始める

---

## ■ archive / lifecycle phase

archive / lifecycle phase は、event / trace / metadata / external input の保持・archive・deprecated・logical deletion を整理する段階である。

対象:

- active event
- deprecated event
- archived event
- replay-only event
- audit-only event
- external file / OCR / EDI input
- projection snapshot / rebuild result

優先候補:

1. active / deprecated / archived の3分類から始める
2. source of truth の保持優先度を整理する
3. archive 後も trace chain を切らない方針を整理する
4. external input の file id / hash / source_system / received_at を整理する
5. logical deletion / mask / anonymize の考え方を整理する
6. legal / privacy / accounting 要件を将来検討へ分離する

方針:

- archived は deleted ではない
- source of truth の物理削除は慎重に扱う
- deprecated event は必要な consumer / projection / replay / audit が読めるようにする
- archive data にも warehouse_code boundary を維持する

---

## ■ external integration phase

external integration phase は、OCR / EDI / CSV / PDF / external API など外部入力・外部送信を event-driven ERP の trace / workflow / replay / audit へ接続する段階である。

対象候補:

- OCR import
- EDI file / message
- CSV upload / download
- PDF extraction
- external API / webhook
- external file archive

優先候補:

1. external input identity の整理
2. external_file_hash / source_system / received_at の扱い整理
3. parse / accepted / rejected / corrected の event 整理
4. OCR / EDI workflow の traceability 整理
5. external input replay の承認・禁止ケース整理
6. external sent event の deletion / replay 制限整理

方針:

- OCR / EDI 入力をそのまま source of truth にしない
- 人間による確認・補正・確定データ化を分ける
- external ID を内部主キーとして扱わない
- external input は replay / forensic の起点として保持方針を検討する

---

## ■ anti big-bang migration 方針

event-driven ERP 化は big-bang migration で行わない。

禁止したい進め方:

- 汎用 event store を一気に作り、全履歴を移し替える
- 既存 source of truth を置き換える
- 全 API を一度に event bus 経由へ変更する
- 全 read model を一度に非同期 projection 化する
- workflow engine を先に導入して業務フローを合わせに行く
- schema registry / catalog / validation / recovery を一度に自動化する
- 現場画面を止めて設計都合で全面刷新する

方針:

- existing source of truth を活かす
- nullable column / optional metadata / read-only tool から始める
- high risk domain ごとに小さく進める
- migration は最小単位に分ける
- feature flag / dry-run / compare-only の考え方を優先する
- 既存業務と既存 UI を壊さない

---

## ■ operational rollout 方針

operational rollout は、実装だけでなく、現場・事務・管理者が使い続けられる形で段階導入する方針である。

rollout 観点:

- 現場操作に影響するか
- admin dashboard の表示に影響するか
- warehouse_code boundary を維持するか
- role 制御を維持するか
- rollback / compensation / recovery の判断ができるか
- trace_id / request_id で調査できるか
- 既存 Node API 依存が残るか
- Edge Function deploy / verification が可能か

段階導入例:

1. 設計文書・catalog・checklist の整備
2. read-only trace / diff / validation の追加
3. dry-run / compare-only の導入
4. 管理者限定の manual recovery 導線検討
5. high confidence な自動化候補の検討

方針:

- 運用で説明できない自動化を急がない
- alert は対応手順とセットで導入する
- 現場の入力負荷を急に増やさない
- 事務・所長が判断できる情報を優先する

---

## ■ high risk domain 優先方針

event-driven ERP の段階導入では、業務影響が大きい domain を優先する。

優先度が高い domain:

1. inventory
2. pallet
3. warehouse location
4. trace / audit
5. OCR / EDI
6. shipment
7. billing
8. external integration

優先理由:

- inventory は数量と請求の根拠になりやすい
- pallet は実物流の位置・状態と直結する
- warehouse location は棚番・現場作業の正確性に関わる
- trace / audit は recovery / forensic の入口になる
- OCR / EDI は外部入力で誤りや重複が起きやすい
- shipment / billing は確定後の補正・承認・監査が重要になる

方針:

- high risk domain では source of truth / traceability / validation を優先する
- low risk domain では CRUD を維持してよい
- billing は最後に実装する方針を維持し、先に根拠 event を蓄積する

---

## ■ future optional architecture 整理

以下は将来 optional architecture として検討する。

現時点で導入を決めないもの:

- 汎用 `event_store` / `trace_events` table
- outbox pattern
- queue / broker
- workflow engine
- saga controller
- schema registry
- event catalog DB
- dependency graph DB
- validation engine
- recovery engine
- replay engine
- dead-letter queue / table
- projection rebuild job framework
- archive table / cold storage integration
- OpenTelemetry integration
- admin-dashboard event operations UI

導入判断の観点:

- event 数が増えて手動管理が難しいか
- consumer 数が増えて impact analysis が難しいか
- projection drift が運用課題になっているか
- workflow stuck が頻発しているか
- replay / rebuild の手動判断が限界に近いか
- audit / forensic の要求が強まっているか
- external integration の失敗・重複・遅延が増えているか

方針:

- optional architecture は必要性が明確になってから導入する
- 導入前に source of truth / traceability / governance を整える
- platform 導入で業務ルールの曖昧さを隠さない

---

## ■ 導入順序案

### Step 1: source of truth / traceability を安定させる

inventory / pallet / warehouse location の履歴と trace_id を中心に、調査できる状態を優先する。

### Step 2: projection consistency を整理する

`inventory_current` / `pallet_units` と source of truth の差分検出・rebuild 方針を整理する。

### Step 3: validation / impact analysis を軽量導入する

warehouse boundary、identity、metadata、projection、workflow の high risk validation から始める。

### Step 4: observability / recovery を運用設計する

stuck、missing、duplicate、projection drift、replay / rebuild failure を検知し、手動判断へつなげる。

### Step 5: workflow / external integration を段階導入する

OCR / EDI、shipment、billing など長い workflow を trace chain と event contract で接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- 各 phase の正式なスケジュール
- 各 phase の担当者 / owner
- 汎用 event store を作るか
- queue / broker / outbox を採用するか
- event_id / event_version / metadata_version の保存方式
- replay engine / rebuild job の実装方式
- validation engine / recovery engine を作るか
- dead-letter table / queue を作るか
- event catalog / dependency graph / impact analysis のDB化
- admin-dashboard で event operations UI を作るか
- archive / cold storage の具体方式
- lifecycle transition の実行方式
- external integration の正式 event schema
- OpenTelemetry との連携方式

---

## ■ 原則

event-driven implementation は、設計原則を一気に実装へ置き換える作業ではない。

既存 source of truth を守り、traceability を強化し、projection consistency と recovery を段階的に整える。

big-bang migration を避け、high risk domain から小さく導入する。

future optional architecture は必要性が明確になるまで決定しない。

logistics-erp は、現場運用を壊さず、説明可能性を高めながら event-driven ERP へ育てる。
