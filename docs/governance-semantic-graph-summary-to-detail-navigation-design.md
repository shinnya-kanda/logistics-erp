# Governance Semantic Graph Summary-to-Detail Navigation Design

Phase B77-16 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design、B77-10 semantic convergence visualization design、B77-11 survivability propagation visualization design、B77-12 sustainability propagation visualization design、B77-13 maintainability propagation visualization design、B77-14 evolvability propagation visualization design、B77-15 summary generation design を前提に、将来 governance semantic graph の summary-to-detail navigation を表示する場合の design 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、actual graph UI、summary generation implementation、inspector implementation、workflow execution、mutation、correction / rebuild / replay / sync は扱わない。

## 1. このドキュメントの目的

governance semantic graph summary-to-detail navigation design の目的は、Graph Summary から Summary Section、Path Summary、Node / Edge Detail、Inspector へ段階的に読み進める導線を read-only observability navigation として整理することである。

summary から detail へ読む理由:

- Graph Summary は graph 全体の critical caveat を短時間で把握する入口である。
- Summary Section は health / risk / collapse / convergence / lifecycle 後段の観点ごとに読み方を分ける。
- Path Summary は selected path の upstream / downstream relation を短く説明する。
- Node / Edge Detail は semantic value、reason、source、signals、support context を確認する場所である。
- Inspector は選択中の summary / path / node / edge を read-only metadata として詳しく確認する場所である。

この design が整理するもの:

- summary-to-detail navigation
- Graph Summary から Node / Edge Inspector までの read-only navigation
- collapse / convergence / survivability / sustainability / maintainability / evolvability summary から詳細へ辿る導線
- local navigation state と workflow state の分離
- navigation wording / readability / accessibility / safety-first policy

この design が整理しないもの:

- graph rendering implementation
- actual graph UI
- summary generation implementation
- inspector implementation
- workflow execution
- mutation payload

summary-to-detail navigation は read-only observability navigation である。navigation は「どの metadata を表示・確認・参照するか」を変えるための導線であり、「何を実行するか」を変える workflow ではない。

## 2. Navigation Boundary

summary-to-detail navigation は次の性質を持つ。

- read-only
- observability only
- semantic interpretation navigation
- governance metadata inspection navigation
- local UI navigation state

summary-to-detail navigation は次を実行しない。

- correction
- rebuild
- replay
- sync
- mutation
- POST
- Supabase mutation
- execution workflow
- approval workflow
- implementation workflow
- migration workflow
- remediation workflow
- orchestration

追加 boundary:

- navigation は workflow transition ではない。
- summary click は execution trigger ではない。
- detail open は command panel ではない。
- inspector は action panel ではない。
- path navigation は remediation route ではない。
- compare endpoint は `GET` only として維持する。
- navigation は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

summary click、path highlight、node selection、edge selection、inspector tab switch、breadcrumb navigation は、すべて local UI navigation state であり、業務状態、承認状態、実行状態を変更しない。

## 3. Navigation Hierarchy

summary-to-detail navigation は、graph overview から metadata detail へ段階的に読む hierarchy として整理する。

```text
Graph Summary
├─ Health Summary
├─ Risk Summary
├─ Collapse Summary
├─ Convergence Summary
├─ Survivability Summary
├─ Sustainability Summary
├─ Maintainability Summary
└─ Evolvability Summary
    ↓
Path Summary
    ↓
Node Detail / Edge Detail
    ↓
Inspector
```

各階層の役割:

- Graph Summary: graph 全体の最上位 overview。unavailable / collapse / critical risk を先に読む入口。
- Health Summary: graph health の reason と degraded / unhealthy / unavailable の原因を読む section。
- Risk Summary: critical / elevated / moderate risk と related collapse / boundary path を読む section。
- Collapse Summary: collapse path、unavailable source、outside boundary、nonrecoverable、broken continuity を読む section。
- Convergence Summary: convergence path と support evidence / confidence / freshness / audit / explainability を読む section。
- Survivability Summary: degradation 下の lifecycle continuation を読む section。
- Sustainability Summary: long-term persistence と maintainability / evolvability への caveat を読む section。
- Maintainability Summary: long-term maintenance capacity と support context を読む section。
- Evolvability Summary: future extension safety と maintainability context を読む section。
- Path Summary: selected path の短い説明、upstream / downstream、reason / source / signals を読む section。
- Node Detail / Edge Detail: selected node / edge の semantic metadata を読む detail。
- Inspector: selected summary / path / node / edge の read-only metadata を詳しく確認する panel。

この hierarchy は reading hierarchy であり、workflow order、approval stage、execution progress ではない。

## 4. Summary Card Navigation

summary card click / expand は、overview から関連 metadata へ進むための read-only interaction として扱う。

summary card click / expand で表示するもの:

- summary detail
- related path highlight
- related nodes / edges focus
- reason / source / signals
- confidence / evidence / freshness
- support context

summary card navigation は次を行わない。

- workflow を開始しない。
- execution しない。
- mutation しない。
- approval しない。
- repair / retry / rebuild しない。
- command panel を開かない。

summary card は action card ではない。click / expand は metadata detail を表示するだけであり、button、route、workflow、command を生成しない。

## 5. Health / Risk Summary Navigation

Health Summary navigation は、graph health を支える reason と related critical nodes を読むために使う。

Health Summary から辿るもの:

- graph health reason
- degraded / unhealthy / unavailable の原因
- related critical nodes
- related support weakness
- related freshness / evidence / explainability caveat

Risk Summary navigation は、semantic risk の source と related critical path を読むために使う。

Risk Summary から辿るもの:

- critical / elevated / moderate risk
- risk source
- related collapse path
- related boundary path
- related nonrecoverable path
- related broken continuity path
- related node / edge detail

重要な boundary:

- health / risk navigation は action recommendation ではない。
- health / risk navigation は remediation plan ではない。
- degraded / unhealthy / critical risk は repair instruction ではない。
- graph healthy / low risk は execution permission ではない。

health / risk navigation は graph overview の caveat を読むための導線であり、修復、承認、実行の優先順位を作らない。

## 6. Collapse Summary Navigation

Collapse Summary navigation は、critical degradation を見落とさず、collapse がどの path / node / edge に関係するかを読むために使う。

Collapse Summary から辿る導線:

- collapse path
- unavailable source path
- outside boundary path
- nonrecoverable path
- broken continuity path
- collapse node detail
- collapse edge detail
- collapse reason / source / signals
- collapse severity / support caveat

重要な boundary:

- collapse navigation は remediation workflow ではない。
- collapse path は repair plan ではない。
- collapse node click は correction target selection ではない。
- collapse edge traversal は repair route traversal ではない。
- collapse inspector は remediation panel ではない。

Collapse Summary は read-only に critical semantics を確認する入口であり、correction、rebuild、replay、sync、repair、retry を開始しない。

## 7. Convergence Summary Navigation

Convergence Summary navigation は、stabilization / recovery direction を support context と一緒に読むために使う。

Convergence Summary から辿る導線:

- convergence path
- support evidence
- confidence / freshness / audit / explainability
- recoverable context
- continuous context
- sustainable context
- maintainable context
- evolvable context
- related node / edge detail

重要な boundary:

- convergence navigation は recovery workflow ではない。
- stable / recoverable は execution permission ではない。
- convergence path は auto-fix route ではない。
- convergence support は approval signal ではない。
- convergence inspector は command panel ではない。

Convergence Summary は positive / stable direction を補助的に読む導線であり、collapse path より前面に出しすぎない。

## 8. Lifecycle Propagation Summary Navigation

Survivability / Sustainability / Maintainability / Evolvability Summary navigation は、lifecycle 後段の propagation と support caveat を段階的に読むために使う。

共通して辿る導線:

- related propagation path
- support context
- upstream collapse context
- upstream convergence context
- downstream lifecycle context
- node detail
- edge detail
- confidence / evidence / freshness
- reason / source / signals

Survivability Summary:

- degradation tolerance から survivability / sustainability / maintainability / evolvability へ caveat がどう伝わるかを読む。
- survivable は execution permission ではない。

Sustainability Summary:

- survivability から sustainability、maintainability、evolvability へ long-term persistence がどう伝わるかを読む。
- sustainable は approval readiness ではない。

Maintainability Summary:

- sustainability から maintainability、evolvability へ maintenance capacity がどう伝わるかを読む。
- maintainability navigation は maintenance workflow ではない。

Evolvability Summary:

- maintainability から evolvability へ future extension safety がどう伝わるかを読む。
- evolvability navigation は implementation / migration workflow ではない。

重要な boundary:

- survivable / sustainable / maintainable / evolvable は execution permission ではない。
- lifecycle propagation path は action route ではない。
- lifecycle node / edge detail は command panel ではない。
- positive lifecycle summary は optimistic に強調しすぎない。

## 9. Path Summary Navigation

Path Summary は、selected path を短く説明し、path の upstream / downstream と support context を読むために使う。

Path Summary が表示するもの:

- selected path の短い説明
- upstream nodes
- downstream nodes
- path reason
- path source
- path signals
- severity / confidence
- related support context
- related collapse / convergence caveat

重要な boundary:

- path summary は action route ではない。
- path highlight は semantic explanation aid である。
- path traversal は workflow traversal ではない。
- selected path は execution path ではない。
- path severity は execution priority ではない。

Path Summary は semantic relationship の読み方を支える read-only overview であり、workflow route、repair route、approval route、implementation route ではない。

## 10. Node Detail Navigation

Node Detail は、selected node の semantic metadata を確認するための read-only detail である。

Node Detail が表示するもの:

- semantic type
- semantic value
- label / text
- reason
- source
- signals
- layer
- cluster
- upstream / downstream nodes
- support context
- severity / confidence / freshness
- read-only caveat

重要な boundary:

- node detail は command panel ではない。
- node detail に action button を置かない。
- node selected state は local UI state である。
- node selected state は workflow state ではない。
- node detail から mutation しない。
- node detail から approval / correction / rebuild / sync を開始しない。

Node Detail は node を「どう読めるか」を示す metadata view であり、作業対象や実行対象を作らない。

## 11. Edge Detail Navigation

Edge Detail は、selected edge の semantic dependency / propagation relationship を確認するための read-only detail である。

Edge Detail が表示するもの:

- edge type
- from / to
- semantic dependency
- propagation kind
- reason
- source
- signals
- severity / importance
- upstream / downstream relationship
- read-only caveat

重要な boundary:

- edge detail は execution route ではない。
- edge traversal は workflow traversal ではない。
- edge selected state は local UI state である。
- edge selected state は workflow transition state ではない。
- edge detail から propagation execution しない。
- edge detail から repair / retry / orchestration を開始しない。

Edge Detail は semantic relationship を読むための metadata view であり、workflow transition、execution route、approval route ではない。

## 12. Inspector Model

Inspector は、selected summary / path / node / edge の detail を read-only に確認するための metadata inspection panel である。

Inspector が表示するもの:

- selected summary / path / node / edge の detail
- read-only metadata inspection
- reason / source / signals grouping
- support context
- severity / confidence / freshness
- upstream / downstream context
- no-execution caveat

重要な boundary:

- inspector は command panel ではない。
- inspector は approval panel ではない。
- inspector は remediation panel ではない。
- inspector は implementation / migration panel ではない。
- action button を置かない。
- inspector から mutation しない。

Inspector は「選択中の metadata を詳しく読む」ための場所であり、「選択中の対象に対して実行する」場所ではない。

## 13. Breadcrumb / Back Navigation

breadcrumb / back navigation は、summary-to-detail の読んできた位置を示し、前の表示へ戻るための read-only navigation である。

breadcrumb example:

```text
Graph Summary > Collapse Summary > Collapse Path > Node Detail
```

breadcrumb が示すもの:

- 現在読んでいる summary / path / node / edge の位置
- graph overview から detail までの表示上の context
- back navigation の local UI state

重要な boundary:

- breadcrumb は read-only navigation である。
- breadcrumb は workflow step ではない。
- breadcrumb は approval stage ではない。
- breadcrumb は execution progress ではない。
- breadcrumb click で workflow transition しない。
- breadcrumb click で mutation しない。

breadcrumb は user が「どこを読んでいるか」を把握するための表示補助であり、業務進捗や実行進捗を表さない。

## 14. Local Navigation State

summary-to-detail navigation に必要な state は local UI state として扱う。

local navigation state examples:

- activeSummaryId
- activePathId
- selectedNodeId
- selectedEdgeId
- activeInspectorTab
- activeBreadcrumb
- expandedSummaryIds
- focusedNodeIds
- focusedEdgeIds
- highlightedPathId

重要な boundary:

- local UI state である。
- workflow state ではない。
- review lifecycle state ではない。
- approval state ではない。
- DB 永続化しない前提で扱う。
- mutation payload ではない。
- network write を行わない。
- compare endpoint を `POST` 化しない。

local navigation state は表示と読解のためだけに使い、業務状態、承認状態、実行状態を更新しない。

## 15. Readability / Density Policy

summary-to-detail navigation は、graph を読みやすくし、critical caveat を見落とさないための density policy に従う。

方針:

- summary first とする。
- collapse first とする。
- details later とする。
- inspector on demand とする。
- reason / source / signals を grouping する。
- support context nearby とする。
- optimistic summary を強調しすぎない。
- node explosion を避ける。
- edge spaghetti を避ける。
- selected path 以外の edge は必要に応じて fade / compact にできる。

navigation は graph を全量表示するためではなく、summary から必要な detail へ安全に進むための導線である。

## 16. Accessibility / Safety-First Policy

summary-to-detail navigation は、keyboard / screen reader でも read-only boundary と critical caveat が伝わるようにする。

方針:

- keyboard navigation は表示移動のみに使う。
- keyboard operation で execution しない。
- screen reader で breadcrumb / summary / detail が伝わるようにする。
- collapse / unavailable を見落とさない。
- action wording を避ける。
- navigation wording は 表示 / 確認 / 参照 / 詳細 にする。
- 実行 / 修正 / 再構築 / 承認 / 反映 / 同期 / 解決 / 開始 / 適用 のような wording を避ける。
- positive summary は collapse より目立たせすぎない。

navigation state、selected state、highlight state、breadcrumb は、色だけでなく label / text / badge でも意味が分かるようにする前提を置く。

## 17. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- summary-to-detail navigation design が固定されていること。
- summary generation design と整合していること。
- interaction boundary と整合していること。
- data contract の node / edge / viewState / reason / source / signals と整合していること。
- readability / density control と整合していること。
- graph implementation は別 phase とすること。
- summary-to-detail navigation は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- navigation から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- approval / remediation / implementation / migration layer は別 endpoint / 別 workflow として設計すること。

summary-to-detail navigation design は visualization implementation の前提整理であり、execution approval、approval recommendation、remediation recommendation、implementation recommendation、migration recommendation ではない。

## 18. 今回の範囲外

Phase B77-16 では次を扱わない。

- TypeScript implementation
- React implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- actual graph UI
- summary generation implementation
- inspector implementation
- mutation
- workflow execution
- correction / rebuild / replay / sync
- approval workflow
- remediation workflow
- implementation workflow
- migration workflow
- package / lock file change
- Supabase schema change

この document は、governance semantic graph summary-to-detail navigation の architecture / boundary / local state / readability 整理であり、実装差分や runtime behavior を追加しない。
