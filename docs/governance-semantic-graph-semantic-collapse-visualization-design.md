# Governance Semantic Graph Semantic Collapse Visualization Design

Phase B77-09 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design を前提に、将来 governance semantic graph で semantic collapse propagation を表示する場合の visualization 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI、remediation workflow は扱わない。

## 1. このドキュメントの目的

governance semantic collapse visualization design の目的は、semantic collapse propagation を safety-first に可視化し、collapse chain / collapse path / collapse propagation priority を人間が短時間で読み取れるようにすることである。

この design が整理するもの:

- semantic collapse propagation visualization
- collapse chain readability
- collapse path / collapse propagation priority
- collapse node / edge / cluster visualization policy
- collapse readability / density / severity hierarchy
- collapse interaction boundary
- read-only observability visualization boundary

この design が整理しないもの:

- graph rendering implementation
- execution workflow
- remediation workflow
- API implementation
- mutation payload

collapse visualization は、critical semantics を埋もれさせないための read-only observability visualization である。collapse が強調表示されても、修正、再構築、再実行、同期、承認、現場作業指示を意味しない。

## 2. Collapse Visualization Boundary

collapse visualization は次の性質を持つ。

- read-only
- observability only
- semantic interpretation visualization
- governance degradation visualization
- semantic collapse explanation support

collapse visualization は次を実行しない。

- correction
- rebuild
- replay
- sync
- mutation
- POST
- Supabase mutation
- execution workflow
- approval workflow
- retry
- repair
- orchestration

追加 boundary:

- collapse path は remediation workflow ではない。
- collapse edge は execution edge ではない。
- collapse traversal は execution traversal ではない。
- collapse visualization は action plan ではない。
- compare endpoint は `GET` only として維持する。
- collapse visualization は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

collapse node、collapse edge、collapse path、highlight、inspector は、すべて semantic interpretation を支える表示であり、実行可能性や修復手順を示さない。

## 3. Semantic Collapse Definition

semantic collapse は、governance semantics が安全に読めなくなる方向へ劣化し、downstream semantics の読み方も安全側へ倒れる状態として扱う。

collapse examples:

- semantic drift 増大
- contradictory reasoning
- fragile resilience
- outside integrity boundary
- nonrecoverable semantics
- broken continuity
- intolerable degradation
- nonsurvivable semantics
- unsustainable semantics
- unmaintainable semantics
- unevolvable semantics

semantic collapse は次の観点で整理する。

- semantic interpretation degradation
- governance stability degradation
- observability degradation propagation

collapse は source of truth error の確定ではない。collapse は read-only compare / governance metadata をどう安全側に読むかを示す degradation signal である。

## 4. Collapse Propagation Chain

collapse chain は、semantic degradation が upstream から downstream へ伝播して読める関係を示す。

代表 chain:

```text
semantic drift
↓
fragile resilience
↓
outside integrity boundary
↓
nonrecoverable semantics
↓
broken continuity
↓
intolerable degradation
↓
nonsurvivable semantics
↓
unsustainable semantics
↓
unmaintainable semantics
↓
unevolvable semantics
```

collapse propagation の読み方:

- upstream collapse: 前段 semantics の collapse が downstream の読み方を制限する状態。
- downstream collapse: 後段 semantics が upstream caveat を受けて安全側へ倒れる状態。
- partial collapse: 一部の semantics だけが degraded / limited / conditional に倒れる状態。
- cascading collapse: 複数 layer にまたがって collapse signal が連鎖して読める状態。
- support collapse: confidence、evidence、freshness、auditability、explainability などの支援 semantics が弱くなり、主 semantic の読み方を制限する状態。

この chain は execution sequence ではない。上から下へ処理を実行する workflow ではなく、semantic interpretation dependency を読むための map である。

## 5. Collapse Node Visualization Policy

collapse node visualization は、critical degradation を見落とさないために設計する。

表示方針:

- unavailable / broken / collapsed node を優先表示する。
- outside boundary / nonrecoverable node を優先表示する。
- collapse node は compact 化しすぎない。
- collapse node は summary 表示対象にする。
- stable node は compact 可能にする。
- support node は detail on demand を基本にする。
- collapse severity を視認しやすくする。
- reason / source / signals は collapse node の detail で追えるようにする。

重要な boundary:

- collapse node は execution state ではない。
- collapse node は remediation task ではない。
- collapse node は workflow item ではない。
- collapse node click は execution trigger ではない。
- collapse node の id は workflow id ではない。

collapse node は、semantic degradation を説明する read-only display object であり、修復対象や作業対象を生成しない。

## 6. Collapse Edge Visualization Policy

collapse edge visualization は、degradation propagation を読みやすくするために設計する。

表示方針:

- collapse propagation edge を優先表示する。
- collapse edge を fade しすぎない。
- upstream / downstream collapse を明確化する。
- support edge より collapse edge を優先する。
- convergence edge より collapse edge を優先する。
- collapse edge density を readability 優先で制御する。
- selected collapse path の edge を highlight する。
- non-selected edge は必要に応じて fade / compact にする。

重要な boundary:

- collapse edge は execution edge ではない。
- traversal は workflow execution ではない。
- collapse edge click は dependency explanation のみである。
- collapse edge direction は operation order ではない。
- collapse edge は repair route ではない。

collapse edge は downstream impact を読むための semantic relation であり、correction、rebuild、replay、sync、repair、orchestration を開始しない。

## 7. Collapse Path Prioritization

collapse path prioritization は、critical semantics を先に読むための表示優先順である。

最優先:

- unavailable source path
- contradictory reasoning path
- outside boundary path
- nonrecoverable path
- broken continuity path
- nonsurvivable path

次点:

- intolerable degradation
- fragile resilience
- interrupted continuity

補助:

- convergence / recovery path
- maintainability / evolvability path

重要な方針:

- positive path を optimistic に強調しすぎない。
- collapse を最初に読む。
- convergence / recovery は collapse caveat と一緒に読む。
- maintainability / evolvability は collapse path より前面に出しすぎない。
- path highlight は action plan ではない。

collapse path は review attention のための読み順であり、execution priority ではない。

## 8. Collapse Readability Policy

collapse readability は、semantic degradation を短く、誤解なく、埋もれない形で読むための方針である。

方針:

- summary first とする。
- collapse summary を最上位に置く。
- collapse chain を短く読む。
- stable semantics を collapse より前面に出しすぎない。
- node explosion を避ける。
- edge spaghetti を避ける。
- reason / source / signals を collapse path に集中表示する。
- collapse detail は inspector に逃がす。
- hover だけに依存せず、summary / detail の両方で caveat を読めるようにする。

collapse readability は、operator safety / reviewer safety の一部として扱う。collapse を読みやすくしても、execution permission や correction requirement を意味しない。

## 9. Collapse Density Control

collapse density control は、collapse path を埋もれさせず、support / stable semantics の表示量を調整する。

方針:

- collapse path は compact 化しすぎない。
- collapse node は hidden にしない。
- support node は必要時のみ展開する。
- stable path は compact にできる。
- non-selected collapse edge は fade できる。
- selected collapse path は highlight する。
- cluster collapse summary を許容する。
- repeated support signal は detail に寄せる。

重要な boundary:

- hidden node は workflow ignore ではない。
- density control は local visualization state である。
- compact 表示は semantic deletion ではない。
- fade は low priority execution ではない。
- cluster collapse summary は workflow pause ではない。

density control は表示密度を調整するだけであり、business state、workflow state、approval state を変更しない。

## 10. Collapse Severity Hierarchy

collapse visualization は safety-first severity hierarchy に従う。

priority:

1. unavailable
2. broken / collapsed
3. outside boundary
4. nonrecoverable
5. intolerable / nonsurvivable / unsustainable
6. fragile / interrupted
7. partial / conditional
8. stable / maintainable / evolvable

重要な方針:

- stable は最後に扱う。
- optimistic semantics は補助として扱う。
- collapse visibility を最優先にする。
- unavailable / broken を見落とさない。
- positive state は caveat と一緒に表示する。

この hierarchy は表示上の読み順であり、execution priority や remediation order ではない。

## 11. Collapse Cluster Model

collapse cluster は、collapse path を意味領域ごとにまとめ、readability を維持するための grouping である。

cluster examples:

- lifecycle collapse cluster
- resilience collapse cluster
- survivability collapse cluster
- sustainability collapse cluster
- maintainability collapse cluster
- evolvability collapse cluster

方針:

- collapse cluster は summary 表示可能にする。
- critical / unavailable / collapsed を含む cluster は summary に caveat を表示する。
- expanded / collapsed は local UI state として扱う。
- workflow state ではない。
- execution group ではない。
- cluster expansion は execution readiness ではない。

collapse cluster は semantic grouping であり、業務 lane、approval lane、repair group ではない。

## 12. Interaction Boundary For Collapse Visualization

collapse visualization の interaction は、metadata inspection と semantic explanation support に限定する。

方針:

- collapse node click は detail 表示のみである。
- collapse edge click は dependency explanation のみである。
- collapse highlight は semantic explanation aid である。
- collapse traversal は remediation workflow ではない。
- collapse inspector は command panel ではない。
- collapse filter は execution routing ではない。
- collapse expand / collapse は local display state である。

interaction boundary:

- node click で correction / rebuild / replay しない。
- edge click で propagation execution しない。
- highlighted path から repair / retry / sync を開始しない。
- inspector から mutation しない。
- keyboard operation で execution しない。

collapse interaction は、どの degradation がどこへ影響して読めるかを確認するための read-only interaction である。

## 13. Accessibility / Safety-First Policy

collapse visualization は、critical degradation を誰でも読み取れるようにする。

方針:

- collapse を色だけで表現しない。
- label / badge / text を併用する。
- screen reader でも collapse が伝わるようにする。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- optimistic semantics を collapse より目立たせない。
- unavailable / broken を見落とさない。
- read-only / no execution caveat を読み取れるようにする。

collapse severity、collapse path、outside boundary、nonrecoverable は、色、shape、label、text、badge の複数手段で読めるようにする前提を置く。

## 14. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- collapse visualization design が固定されていること。
- node / edge taxonomy と整合していること。
- readability / density control と整合していること。
- layering / view mode / interaction boundary / data contract と整合していること。
- graph implementation は別 phase とすること。
- collapse visualization は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- collapse visualization から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- collapse visualization を execution UI として扱わないこと。

collapse visualization design は visualization implementation の前提整理であり、implementation approval ではない。

## 15. 今回の範囲外

Phase B77-09 では次を扱わない。

- TypeScript implementation
- React implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- Cytoscape / D3 / Mermaid implementation
- mutation
- workflow execution
- rebuild / replay / correction / sync
- actual graph UI
- remediation workflow
- package / lock file change
- Supabase schema change

この document は、governance semantic graph semantic collapse visualization の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
