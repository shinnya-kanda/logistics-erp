# Minimum Viable Event-Driven Architecture（Phase B8-11）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp において event-driven ERP の理想像と、現時点で本当に必要な最小構成を整理する。

ERP設計憲法、開発ルール、event-driven ERP principles、event-driven implementation roadmap、operational rollout strategy、traceability implementation plan、projection consistency implementation plan、rebuild / recovery implementation plan、observability / monitoring implementation plan、workflow / saga implementation plan、event catalog / governance implementation plan を前提にすると、event-driven ERP は最初から巨大な event platform を作ることではない。物流現場の業務事実を壊さず記録し、source of truth、projection、traceability、observability、recovery、validation、workflow、governance を必要最小限から育てるための段階的な設計である。

今回は minimum viable architecture の整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- minimum viable architecture の目的
- already implemented
- must-have vs optional
- source of truth 最小原則
- projection 最小原則
- traceability 最小原則
- observability 最小原則
- recovery 最小原則
- validation 最小原則
- workflow 最小原則
- governance 最小原則
- external integration 最小原則
- anti over-engineering 方針
- anti premature abstraction 方針
- lightweight first 方針
- future expansion boundary

---

## ■ minimum viable architecture の目的

minimum viable event-driven architecture は、logistics-erp を event-driven ERP として育てるために、今すぐ必要な最小構成と、まだ導入しない optional architecture を分けるための判断基準である。

目的:

- event-driven ERP の理想像に引っ張られて過剰実装しない
- 既存 source of truth を守る
- projection を source of truth と混同しない
- traceability / observability / recovery の最小導線を先に作る
- validation / governance を Markdown / checklist から始める
- workflow / external integration を source of truth に直結させない
- high risk domain を優先し、small CRUD を過剰に event-driven 化しない
- future optional architecture の導入条件を明確にする

minimum viable は「雑に作る」ことではない。

現場運用を止めず、既存機能を壊さず、後から説明できる最小限の構造を守ることである。

---

## ■ already implemented 整理

現時点の logistics-erp は、完全な event-driven architecture ではないが、minimum viable event-driven ERP の土台をすでに持っている。

### source of truth

すでに source of truth として扱うべきもの:

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`

これらは業務上の履歴・事実を説明する根拠であり、projection や画面表示より優先される。

### projection / read model

すでに projection / read model として扱うべきもの:

- `inventory_current`
- `pallet_units`
- Admin Dashboard の検索・一覧
- trace-search の統合 timeline

これらは検索・表示・確認のために重要だが、source of truth ではない。

### traceability

導入済みまたは導入済みに近いもの:

- `trace_id` の設計方針
- `inventory-move` / `inventory-out` の `trace_id` write support
- `warehouse_location_history.trace_id` の nullable column
- `trace-search` Edge Function
- Admin Dashboard の trace検索 UI
- `warehouse_code` guard 絞り込み方針

### operational foundation

導入済みまたは整理済みの土台:

- Supabase Auth / JWT を前提にした Edge Function 化
- `adminGuard` / `fieldWriteGuard` などの role / warehouse_code 制御
- event-driven ERP principles
- projection consistency / rebuild / recovery / observability / workflow / governance の設計文書

これらを活かすことが minimum viable architecture の前提である。

---

## ■ must-have vs optional 整理

minimum viable architecture では、must-have と optional を明確に分ける。

### must-have

今すぐ守るべきもの:

- source of truth を削除・上書きしない
- `inventory_current` / `pallet_units` を source of truth として扱わない
- `warehouse_code` boundary を守る
- trace-search / Admin Dashboard で read-only に調査できる
- trace_id / request_id / idempotency_key の意味を混同しない
- projection drift を source of truth との差分として扱う
- recovery は source of truth と trace chain を根拠にする
- validation failure を silent skip しない
- manual review / correction / recovery を正式な運用として扱う
- Excel / NAS / 手作業と共存する

### optional

現時点では導入を決めないもの:

- 汎用 `event_store`
- 汎用 `trace_events`
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
- Admin Dashboard event operations UI

optional は不要という意味ではない。

必要性・業務影響・運用負荷・回復手順が明確になってから導入する候補である。

---

## ■ source of truth 最小原則

minimum viable architecture の最初の柱は、source of truth を守ることである。

最小 source of truth:

| domain | source of truth |
| --- | --- |
| inventory | `inventory_transactions` |
| pallet | `pallet_transactions` |
| warehouse location | `warehouse_location_history` |
| trace timeline | 上記 source of truth の read-only 統合 |
| OCR / EDI / shipment / billing | 将来候補。現時点では source of truth 化を急がない |

最小原則:

- 現在状態より履歴を優先する
- source of truth を通常業務画面から直接 update / delete しない
- 誤りは削除ではなく correction / compensation として説明する
- source of truth と projection がずれた場合、source of truth を根拠に調査する
- source of truth を汎用 event store へ一気に移し替えない
- external input をそのまま source of truth にしない

判断:

- source of truth が誤っている場合は correction を検討する
- projection だけが誤っている場合は refresh / rebuild / recovery を検討する
- read model の表示都合で source of truth を歪めない

---

## ■ projection 最小原則

projection は、source of truth から派生した read model / cache である。

最小 projection:

- `inventory_current`
- `pallet_units`
- trace timeline
- Admin Dashboard の read-only 一覧

最小原則:

- `inventory_current` は `inventory_transactions` から導出される
- `pallet_units` は `pallet_transactions` から導出される
- trace timeline は source rows を read-only に統合する
- projection を直接修正して履歴不整合を隠さない
- projection drift は diff detection / compare-only / manual review の対象にする
- rebuild / refresh は source of truth を変更しない

最初にやるべきこと:

- source of truth と projection の対応表を明確にする
- `inventory_current` / `pallet_units` の差分候補を整理する
- compare-only / dry-run の出力項目を整理する
- projection drift の severity を定義する

現時点では、全 projection を非同期 event consumer に置き換えない。

---

## ■ traceability 最小原則

traceability は、業務操作、API request、transaction、history、workflow、external input を後から追跡できる状態である。

最小 traceability:

- `trace_id`
- trace-search
- Admin Dashboard の trace検索
- `warehouse_code` guard による絞り込み
- idempotency replay 時の trace_id 一貫性

最小原則:

- `trace_id` は1つの業務操作を束ねる
- `request_id` はAPI実行を観測する
- `parent_trace_id` は将来の workflow / distributed trace で使う
- `idempotency_key` は二重実行防止であり、trace_id と混同しない
- `trace_id` は在庫数量の整合性を担保しない
- `trace_id` が NULL の既存行も正当な履歴として扱う
- trace_id が一致しても warehouse boundary を越えて表示しない

最初にやるべきこと:

- `trace_id` 単独検索を安定させる
- inventory / pallet / warehouse location の high risk 操作から traceability を広げる
- `parent_trace_id` / `request_id` の保存先は今すぐ決めない

---

## ■ observability 最小原則

observability は、何が起きたか、どこで止まったか、何を根拠に回復するかを説明できる状態である。

最小 observability:

- trace-search
- Admin Dashboard read-only 表示
- projection drift の候補整理
- validation warning / error の分類
- recovery / correction / replay の観測項目整理
- warehouse_code boundary warning の扱い

最小原則:

- observability はログを増やすこと自体を目的にしない
- technical monitoring と business monitoring を分ける
- alert は対応手順とセットで検討する
- warning を無視せず manual review / recovery の入口にする
- sensitive metadata は通常表示しない
- monitoring aggregate 自体も projection として扱う

現時点では、巨大な monitoring platform や alert system を作らない。

まずは read-only の調査入口と checklist を整える。

---

## ■ recovery 最小原則

recovery は、projection drift、workflow stuck、trace timeline 欠落、validation failure などから説明可能に回復するための考え方である。

最小 recovery:

- compare-only / dry-run
- manual review
- scoped refresh / rebuild の方針
- correction / compensation の方針
- trace / source of truth に基づく incident investigation

最小原則:

- recovery は source of truth と trace chain を根拠にする
- rebuild は source of truth を変更しない
- replay は元 event を上書きしない
- correction は元 event / trace との関係を持つ
- projection だけを直接修正して不整合を隠さない
- duplicate / orphan / missing を自動削除しない
- critical recovery は approval 候補にする

現時点では、recovery engine、replay engine、dead-letter queue を作らない。

手動で判断できる材料を先に整える。

---

## ■ validation 最小原則

validation は、event / metadata / identity / time / warehouse boundary / projection / workflow / external input が業務上説明可能かを確認する判断層である。

最小 validation:

- warehouse boundary validation
- source of truth / projection consistency validation
- trace_id / request_id / idempotency_key の identity validation
- required metadata validation
- external input validation
- workflow missing / stuck validation の候補整理

最小原則:

- validation failure を silent skip しない
- warning / error / manual review を分ける
- high risk validation は warning 期間を検討する
- false positive / false negative の業務影響を確認する
- validation rule は owner domain / governance と接続する
- validation はすべてを自動拒否する仕組みではない

現時点では、validation engine や CI gate を作らない。

Markdown checklist と manual review から始める。

---

## ■ workflow 最小原則

workflow / saga は、複数 domain / 複数 local transaction にまたがる業務フローを trace / event chain と compensation で説明する考え方である。

最小 workflow:

- OCR / expected workflow の候補整理
- actual scan / reconciliation workflow の候補整理
- shipment workflow の候補整理
- billing candidate workflow の将来整理
- required predecessor / expected next event の文書化
- stuck / missing / duplicate の検知候補整理

最小原則:

- 1つの巨大 transaction で複数 domain を抱え込まない
- local transaction と distributed workflow を混同しない
- commit 済み step は rollback ではなく compensation / correction で扱う
- workflow の各 step は domain event として説明できるようにする
- 請求・実物流に関わる workflow は強い review 候補にする
- parent_trace_id の DB 保存方式は今すぐ決めない

現時点では、workflow engine / saga controller を作らない。

まず workflow 候補、step、失敗パターン、manual review 条件を整理する。

---

## ■ governance 最小原則

governance は、event の意味・owner・schema・lifecycle・compatibility・approval を一貫して管理する考え方である。

最小 governance:

- event catalog を Markdown で管理する
- owner domain を整理する
- event name の意味を安定させる
- producer / consumer の主要依存を整理する
- schema / metadata contract の最小項目を整理する
- impact analysis checklist と接続する
- validation rule checklist と接続する

最小原則:

- owner domain が不明な event は active 扱いしない
- event name は UI 表示名や `transaction_type` をそのまま使わない
- schema change は backward compatibility を確認する
- deprecated event を削除しない
- governance は開発速度を落とすためではなく、変更影響を明確にするために使う

現時点では、event catalog DB、schema registry、dependency graph DB を作らない。

Markdown first で始める。

---

## ■ external integration 最小原則

external integration は、OCR / EDI / CSV / Excel / external API / NAS / external system との連携を扱う。

最小 external integration:

- external input を source of truth に直結しない
- parse / validate / preview / accepted / rejected / corrected を分離する
- external ID と internal ID を分離する
- file hash / source_system / received_at を同一性候補にする
- duplicate / retry / replay を分ける
- manual review を正式な step として扱う
- Excel / NAS / 手作業と共存する

最小原則:

- OCR / EDI 結果を確認前に正解扱いしない
- file name / path だけで同一性を判断しない
- client payload / external file 内の warehouse_code を無条件に信頼しない
- external input replay は承認候補にする
- external sent event の replay / deletion は制限候補にする

現時点では、NAS watcher、external API connector、EDI parser framework、external input table を作らない。

まず外部入力の同一性・validation・manual review の方針を整理する。

---

## ■ anti over-engineering 方針

minimum viable architecture では、event-driven らしさのための過剰設計を避ける。

避けること:

- 汎用 event store を先に作る
- queue / broker / outbox を先に作る
- workflow engine に業務を合わせる
- schema registry / catalog DB / dependency graph DB を一度に作る
- small CRUD まで CQRS / event-driven 化する
- alert を大量に作り、対応手順を決めない
- projection を複雑化して source of truth を見失う
- platform 導入で業務ルールの曖昧さを隠す

判断基準:

- source of truth を守るために必要か
- warehouse boundary を守るために必要か
- trace / audit / recovery に必要か
- 現場・事務・管理者が説明できるか
- manual review で足りる段階ではないか
- optional architecture の運用負荷を引き受けられるか

event-driven ERP は、event platform を作ることではない。

業務事実を後から説明できるようにすることである。

---

## ■ anti premature abstraction 方針

premature abstraction は、まだ業務パターンが固まっていない段階で抽象化しすぎる問題である。

避ける抽象化:

- 汎用 workflow abstraction
- 汎用 event schema abstraction
- 汎用 integration connector
- 汎用 recovery engine
- 汎用 validation engine
- 汎用 import pipeline
- 汎用 permission matrix

方針:

- まず inventory / pallet / warehouse location の具体的な source of truth を守る
- OCR / EDI / shipment / billing は業務フローを具体的に整理してから抽象化する
- 複数 domain で同じ失敗パターンが確認できてから共通化を検討する
- abstraction は重複削減より、説明可能性と責務分離に役立つ場合に導入する
- 将来拡張のために、今の業務意味を曖昧にしない

今必要なのは、汎用化された platform ではなく、具体的な業務事実を正しく残す最小構造である。

---

## ■ lightweight first 方針

lightweight first は、Markdown、checklist、read-only view、compare-only、manual review から始める方針である。

最初に使う手段:

- Markdown 設計文書
- event catalog / governance checklist
- validation / impact checklist
- trace-search
- Admin Dashboard read-only 表示
- compare-only / dry-run
- manual review / approval
- scoped investigation

後で検討する手段:

- registry
- DB-managed catalog
- queue / broker
- workflow engine
- validation engine
- recovery engine
- replay engine
- alert platform
- operations UI

方針:

- まず観測できるようにする
- 次に判断できるようにする
- その後に小さく自動化する
- 自動化は source of truth と業務影響が明確な範囲から検討する
- 現場運用を止めない

---

## ■ future expansion boundary 整理

future expansion boundary は、いつ optional architecture を検討するかの境界である。

### event store / trace_events

検討条件:

- 既存 source table の横断 trace が限界になる
- event name / version / metadata を統一的に扱う必要が出る
- audit / forensic の横断要求が強まる

現時点:

- 既存 source of truth を活かす
- 汎用 event store 新設は決めない

### queue / broker / outbox

検討条件:

- consumer が増え、同期処理では coupling が強すぎる
- external integration / monitoring / projection 更新が非同期化を必要とする
- retry / dead-letter の運用要求が明確になる

現時点:

- event bus / queue は導入しない
- local transaction と read model 更新の既存方式を壊さない

### workflow engine / saga controller

検討条件:

- shipment / OCR / EDI / billing の workflow が複雑化する
- stuck / retry / compensation の手動管理が限界になる
- workflow owner / step / timeout / approval が明確になる

現時点:

- workflow engine は導入しない
- workflow step と failure pattern の文書化を優先する

### validation / recovery engine

検討条件:

- validation failure が定常的に増える
- compare-only / manual review では回復判断が追いつかない
- severity / approval / recovery action が安定する

現時点:

- validation engine / recovery engine は導入しない
- checklist / warning / manual review を優先する

### registry / dashboard

検討条件:

- event catalog / dependency / schema / validation rule の Markdown 管理が限界になる
- governance review の証跡が必要になる
- Admin Dashboard で運用担当者が確認する価値が明確になる

現時点:

- registry / dashboard は導入しない
- Markdown first を維持する

---

## ■ 今後の検討事項

以下は今回決定しない。

- 汎用 `event_store` を作るか
- `trace_events` を作るか
- queue / broker / outbox を採用するか
- workflow engine / saga controller を導入するか
- validation engine を作るか
- recovery engine を作るか
- replay engine を作るか
- dead-letter table / queue を作るか
- event catalog DB / schema registry を作るか
- dependency graph DB を作るか
- Admin Dashboard event operations UI を作るか
- external input table / file registry を作るか
- projection rebuild job framework を作るか
- parent_trace_id / request_id の正式保存先
- event_id / event_version / metadata_version の正式保存方式
- optional architecture の正式導入時期

---

## ■ 原則

minimum viable event-driven architecture は、event-driven ERP の理想像を否定しない。

ただし、現時点で必要なのは巨大な platform ではなく、既存 source of truth を守り、projection を派生状態として扱い、traceability / observability / recovery を最小限から成立させることである。

source of truth を守る。

projection を source of truth と混同しない。

trace / audit / recovery の調査導線を先に作る。

workflow / external integration / governance / validation は Markdown / checklist / manual review から始める。

optional architecture は必要性が明確になってから導入する。

logistics-erp は、現場運用を壊さず、説明可能性を少しずつ積み上げる ERP として育てる。
