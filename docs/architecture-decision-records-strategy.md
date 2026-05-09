# Architecture Decision Records Strategy（Phase B8-12）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における architecture decision records（ADR）の運用方針を整理する。

ERP設計憲法、開発ルール、event-driven ERP principles、minimum viable event-driven architecture、event-driven implementation roadmap、operational rollout strategy、event catalog / governance implementation plan を前提にすると、logistics-erp では「何を作るか」だけでなく、「なぜ今は作らないか」「なぜこの方針を採用したか」「どの判断を保留したか」を残す必要がある。特に event store、workflow engine、queue、registry、recovery engine などの optional architecture は、導入しない判断も将来の重要な設計根拠になる。

今回は ADR 運用方針のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- ADR の目的
- なぜ ADR が必要か
- principle / implementation / optional architecture の違い
- accepted / rejected / deferred decision の考え方
- event store / workflow engine / queue / registry の ADR 候補
- rollback vs correction decision 記録方針
- source of truth decision 記録方針
- projection / CQRS decision 記録方針
- warehouse boundary decision 記録方針
- operational rollout decision 記録方針
- Markdown first ADR 方針
- future ADR repository 方針
- lightweight ADR 方針
- future optional architecture

---

## ■ ADR の目的

ADR は、重要な architecture decision を、背景・選択肢・判断・結果・保留事項とともに記録するための文書である。

目的:

- 設計判断の理由を後から説明できるようにする
- 採用した判断だけでなく、却下・保留した判断も残す
- optional architecture をいつ導入するか、なぜ今は導入しないかを明確にする
- principle と implementation decision を混同しない
- 将来の開発者・運用者・AI agent が同じ議論を繰り返さないようにする
- source of truth、warehouse boundary、correction、projection、workflow などの重要判断を traceable にする
- 現場運用を壊さず育てる方針と、具体設計判断を接続する

ADR は長い設計書の代替ではない。

設計書が原則や計画を整理するのに対し、ADR は特定の判断とその理由を短く明確に残すための記録である。

---

## ■ なぜ ADR が必要か

logistics-erp は、物流現場の既存運用を残しながら、段階的に DB 中心・event-driven ERP へ育てるシステムである。

ADR が必要な理由:

- 現場運用を止めないため、すぐに実装しない判断が多い
- event-driven ERP の理想像と minimum viable architecture を分ける必要がある
- optional architecture が多く、導入時期を誤ると過剰設計になりやすい
- source of truth / projection / recovery / workflow の判断は将来の監査・復旧に影響する
- 変更理由が残らないと、後から「なぜこうなっているか」が分からなくなる
- AI / Cursor / 開発者が過去の判断を知らずに同じ設計を再提案しやすい
- rejected decision が残らないと、却下済み案が繰り返し復活する

ADR で残したいこと:

- 何を決めたか
- なぜ決めたか
- 何を採用しなかったか
- 何を保留したか
- どの原則や文書に基づくか
- 将来見直す条件は何か

---

## ■ principle / implementation / optional architecture の違い整理

ADR では、principle、implementation、optional architecture を分けて扱う。

| 種別 | 意味 | 例 | ADR の扱い |
| --- | --- | --- | --- |
| principle | 長期的に守る原則 | source of truth を守る / correction over overwrite | 原則文書へ参照し、判断の根拠にする |
| implementation | 実際に今作る具体対応 | `trace_id` を nullable で追加する | 実装判断として ADR 候補 |
| optional architecture | 将来導入候補だが今は決めない構成 | queue / workflow engine / registry | deferred / rejected 判断として ADR 候補 |

方針:

- principle は簡単に変えない
- implementation は現場・既存仕様・運用制約に合わせて小さく変えてよい
- optional architecture は必要性が明確になるまで導入を決めない
- optional architecture を導入しない判断も ADR に残せる
- principle と implementation が衝突する場合は、例外理由を明文化する

例:

- principle: `inventory_transactions` が在庫の source of truth
- implementation: `inventory_current` は read model として表示に使う
- optional: 汎用 event store へ移行するかは現時点で deferred

---

## ■ accepted / rejected / deferred decision の考え方

ADR では、判断状態を accepted / rejected / deferred に分ける。

### accepted

accepted は、現時点で採用する判断である。

例:

- `inventory_transactions` を在庫の source of truth とする
- `inventory_current` を projection / read model として扱う
- `trace_id` は nullable / no backfill で段階導入する
- recovery は source of truth と trace chain を根拠にする

### rejected

rejected は、検討したが採用しない判断である。

例:

- `inventory_current` を在庫の真実として扱う
- `pallet_units` の直接修正だけで履歴不整合を解決したことにする
- warehouse_code を client payload から信頼する
- stuck workflow を自動削除する

### deferred

deferred は、今は決めず将来再検討する判断である。

例:

- 汎用 `event_store` を作るか
- queue / broker / outbox を導入するか
- workflow engine / saga controller を導入するか
- event catalog DB / schema registry を作るか

方針:

- deferred は「未検討」ではなく、「現時点では決めない」と明示する
- deferred decision には見直し条件を付ける
- rejected decision は理由を残す
- accepted decision も前提条件が変われば再検討できる

---

## ■ event store / workflow engine / queue / registry の ADR 候補整理

event store、workflow engine、queue、registry は optional architecture であり、導入判断は ADR に残す価値が高い。

### event store / trace_events

ADR 候補:

- 汎用 `event_store` を作るか
- `trace_events` を作るか
- 既存 source table を当面 source of truth として維持するか

現時点の推奨状態:

- deferred

理由:

- `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` が既に source of truth として機能している
- 既存履歴を一気に移し替えると big-bang migration になる
- trace-search で read-only 横断調査を始められている

見直し条件:

- 横断 audit / forensic 要求が既存 source table では追えなくなる
- event_name / event_version / metadata を統一的に保存する必要が高まる
- replay / rebuild / lifecycle 管理が既存 source table だけでは困難になる

### workflow engine / saga controller

ADR 候補:

- workflow engine を導入するか
- saga controller を作るか
- Markdown / trace chain / manual review で当面運用するか

現時点の推奨状態:

- deferred

理由:

- OCR / EDI / shipment / billing workflow はまだ業務 step と failure pattern の整理段階である
- workflow engine を先に入れると業務を engine に合わせるリスクがある
- stuck / retry / compensation の手動判断をまず明確にする必要がある

見直し条件:

- workflow stuck が頻発する
- retry / compensation / approval が手動運用で追えなくなる
- workflow owner / step / timeout / expected next event が安定する

### queue / broker / outbox

ADR 候補:

- queue / broker を導入するか
- outbox pattern を採用するか
- local transaction + read model 更新の既存方式を維持するか

現時点の推奨状態:

- deferred

理由:

- high risk domain では現場操作の即時整合が重要である
- consumer 数や非同期配送要件がまだ明確でない
- at-least-once / duplicate / dead-letter 運用を先に設計する必要がある

見直し条件:

- consumer が増え同期処理の coupling が強くなる
- external integration / monitoring / projection 更新で非同期化が必要になる
- retry / dead-letter / ordering の運用要求が明確になる

### registry / schema registry / catalog DB

ADR 候補:

- event catalog DB を作るか
- schema registry を導入するか
- dependency graph DB を作るか
- Markdown first を維持するか

現時点の推奨状態:

- deferred

理由:

- event catalog / governance は Markdown で始める方針で十分な段階である
- DB / UI / CI を先に作ると管理負荷が増える
- owner domain / producer / consumer / dependency の最小項目を先に安定させる必要がある

見直し条件:

- event 数や consumer 数が増え Markdown 管理が限界になる
- schema / metadata version の互換性確認が頻繁になる
- governance review の証跡保存が必要になる

---

## ■ rollback vs correction decision 記録方針

rollback と correction の扱いは ADR で明確に残す。

記録すべき判断:

- commit 前の失敗は transaction rollback で扱う
- commit 済み業務履歴の誤りは rollback ではなく correction / compensation で扱う
- projection drift は rollback ではなく refresh / rebuild / recovery で扱う
- replay は過去状態への巻き戻しではなく、新しい trace / event として扱う

ADR に残す観点:

- どの業務履歴が commit 済みか
- source of truth を変更するのか、projection を再構築するのか
- correction event / compensation transaction が必要か
- 元 trace と補正 trace の関係をどう説明するか
- manual review / approval が必要か

rejected decision 候補:

- `inventory_transactions` を削除して在庫を戻す
- `pallet_transactions` を削除して移動をなかったことにする
- `inventory_current` だけを直接修正して差分を隠す
- replay 結果を元 trace に上書きする

---

## ■ source of truth decision 記録方針

source of truth に関する判断は、ADR の最重要対象である。

ADR に残すべき判断:

- inventory の source of truth は `inventory_transactions`
- pallet の source of truth は `pallet_transactions`
- warehouse location の変更履歴は `warehouse_location_history`
- `inventory_current` / `pallet_units` は source of truth ではない
- OCR / EDI / CSV / Excel は確認前に source of truth にしない
- shipment / billing の source of truth は将来設計として分離する

記録観点:

- 業務上の真実はどこにあるか
- read model / projection はどこまで信頼できるか
- correction / rebuild / audit の根拠は何か
- どの domain が owner か
- 将来 event store へ移行する可能性をどう扱うか

方針:

- source of truth の変更は accepted ADR または deferred ADR として残す
- source of truth を置き換える判断は強い review 対象にする
- source of truth と projection の混同を rejected decision として明示できるようにする

---

## ■ projection / CQRS decision 記録方針

projection / CQRS に関する判断は、read model と write model の責務を分けるために記録する。

ADR に残すべき判断:

- `inventory_current` は `inventory_transactions` から導出される projection
- `pallet_units` は `pallet_transactions` から導出される projection
- trace timeline は複数 source of truth の read-only 統合 view
- projection drift は source of truth との差分として扱う
- compare-only / dry-run を自動 rebuild より先に導入する
- small CRUD まで過剰に CQRS 化しない

記録観点:

- projection の source は何か
- projection が stale / drift した場合にどう検出するか
- rebuild / refresh の根拠は何か
- read model の都合で write model を歪めていないか
- eventual consistency を許容するか

方針:

- projection を source of truth として扱う判断は rejected にする
- projection rebuild job framework は optional / deferred として扱う
- CQRS は必要な domain から段階導入する

---

## ■ warehouse boundary decision 記録方針

warehouse boundary は security / data isolation / operational rollout に関わるため、ADR で明確に残す。

ADR に残すべき判断:

- `warehouse_code` は主要な業務境界である
- write command の `warehouse_code` は guard / server-side profile 由来を基本にする
- client payload の `warehouse_code` を信頼しない
- trace-search / Admin Dashboard / audit view は warehouse_code で絞る
- trace_id が一致しても warehouse boundary を越えない
- replay / rebuild / recovery でも対象 warehouse_code を明示する

記録観点:

- 誰がどの warehouse_code を操作・閲覧できるか
- external input の warehouse mapping をどう扱うか
- cross-warehouse operation を許すか
- warehouse boundary violation をどの severity で扱うか
- admin 権限でも warehouse 横断閲覧を許すか

方針:

- warehouse boundary の例外は必ず ADR 候補にする
- cross-warehouse operation は deferred または強い review 対象にする
- warehouse_code source を変更する判断は breaking change 候補として扱う

---

## ■ operational rollout decision 記録方針

operational rollout に関する判断は、現場運用を壊さないために ADR に残す。

ADR に残すべき判断:

- big-bang migration を避ける
- Excel / NAS / 手作業と共存する
- read-only / compare-only / dry-run から始める
- Admin Dashboard は初期段階では観測入口として扱う
- manual review / approval を正式な運用 step として扱う
- automation は業務影響が説明できる範囲から検討する

記録観点:

- どの warehouse_code / role / domain から rollout するか
- 旧運用と新運用の共存期間をどう扱うか
- operator education / onboarding が必要か
- incident 時の確認手順はあるか
- rollback ではなく correction / recovery で説明できるか

方針:

- rollout の重要判断は設計メモだけで終わらせず ADR 候補にする
- operational decision は architecture decision として扱う
- 現場運用の例外はコードだけで吸収せず明文化する

---

## ■ Markdown first ADR 方針

ADR は最初から専用ツールや DB を使わず、Markdown first で始める。

初期方針:

- `docs/` 配下の Markdown として管理する
- 1 ADR につき 1 decision を基本にする
- 長すぎる設計説明ではなく、判断と理由を短く残す
- accepted / rejected / deferred を明記する
- 参照した principle / roadmap / implementation plan を明記する
- 見直し条件を必要に応じて書く

最小 ADR template 候補:

```markdown
# ADR-XXXX: <decision title>

日付:
Status: accepted / rejected / deferred

## Context

## Decision

## Consequences

## Alternatives Considered

## Review Conditions
```

方針:

- template の正式形式は今回決定しない
- まずは重要判断を Markdown で残すことを優先する
- ADR は最新設計書の代替ではなく、判断履歴として扱う

---

## ■ future ADR repository 方針

future ADR repository は、ADR が増えてきた場合に検討する将来構想である。

検討候補:

- `docs/adr/` ディレクトリを作る
- ADR index を作る
- ADR status 一覧を作る
- ADR と event catalog / governance を関連付ける
- ADR と impact analysis checklist を関連付ける
- ADR を Admin Dashboard に表示する
- ADR review / approval workflow を作る

registry 化を検討する条件:

- ADR 数が増えて探索しにくくなる
- accepted / rejected / deferred の状態管理が必要になる
- optional architecture の見直し条件を追跡したくなる
- governance review の証跡保存が必要になる
- AI / Cursor が参照しやすい構造が必要になる

方針:

- future ADR repository は今回決定しない
- まずは単一 Markdown strategy と必要な ADR 候補整理から始める
- ADR repository 化する場合も、source of truth の代替にはしない

---

## ■ lightweight ADR 方針

lightweight ADR は、重い承認プロセスではなく、重要判断を短く残す運用である。

初期方針:

- すべての小変更を ADR 化しない
- architecture boundary を変える判断を ADR 候補にする
- optional architecture の accepted / rejected / deferred を優先して残す
- source of truth / warehouse boundary / recovery / projection に関わる判断を優先する
- 実装判断ではなく設計判断を記録する
- decision が変わった場合は過去 ADR を削除せず、新しい ADR で supersede することを検討する

ADR が必要になりやすい変更:

- source of truth を変更する
- projection の責務を変更する
- warehouse boundary の例外を作る
- event store / queue / workflow engine / registry を導入する
- validation severity を operationally breaking に変更する
- rollback / correction / recovery 方針を変更する
- Excel / NAS / manual operation の廃止条件を決める

ADR が不要になりやすい変更:

- 既存方針に沿った小さな UI 表示変更
- typo / docs の説明補足
- 既存 contract を変えない内部 refactor
- 一時的な調査メモ

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回決定しない。

候補:

- `docs/adr/` ディレクトリ
- ADR index
- ADR numbering rule
- ADR status registry
- ADR owner / reviewer rule
- ADR template の正式化
- ADR review workflow
- ADR lint / CI
- ADR と event catalog の cross reference
- ADR と impact analysis checklist の cross reference
- ADR dashboard
- ADR search UI
- superseded ADR 管理
- AI / Cursor 用 ADR lookup rule

導入判断の観点:

- ADR 数が増えて管理しにくいか
- optional architecture の判断履歴が追えなくなっているか
- governance review の証跡が必要か
- AI / Cursor が参照すべき判断が増えているか
- Markdown だけでは status / owner / supersede が追いにくいか

---

## ■ 今後の検討事項

以下は今回決定しない。

- ADR の正式 template
- ADR の numbering rule
- ADR を `docs/adr/` に分離するか
- ADR index を作るか
- ADR owner / reviewer
- ADR status の正式分類
- supersede / obsolete の扱い
- ADR review workflow
- ADR を CI / lint で確認するか
- ADR と event catalog / impact analysis の連携方式
- ADR を Admin Dashboard に表示するか
- ADR repository の検索方式
- AI / Cursor が ADR を優先参照するルール

---

## ■ 原則

ADR は、設計判断を重くするための手続きではない。

なぜその判断を採用し、何を採用せず、何を保留したのかを後から説明できるようにするための軽量な記録である。

principle、implementation、optional architecture を混同しない。

accepted、rejected、deferred を明確にする。

source of truth、projection、warehouse boundary、correction / recovery、operational rollout に関わる判断は ADR 候補にする。

optional architecture は、導入しない判断も含めて記録する。

logistics-erp は、現場運用を壊さず育てる ERP であり、ADR はその判断履歴を守るための道具である。
