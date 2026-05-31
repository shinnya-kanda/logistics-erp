# Governance Semantic Graph Sustainability Propagation Visualization Design

Phase B77-12 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design、B77-10 semantic convergence visualization design、B77-11 survivability propagation visualization design を前提に、将来 governance semantic graph で sustainability propagation を表示する場合の visualization 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI は扱わない。

## 1. このドキュメントの目的

governance semantic sustainability propagation visualization design の目的は、survivability から sustainability、maintainability、evolvability へ続く downstream propagation を read-only observability visualization として整理することである。

この design が整理するもの:

- sustainability propagation visualization
- sustainability chain の読み方
- survivability propagation との関係
- collapse / convergence visualization との関係
- maintainability / evolvability への downstream propagation
- sustainability readability / density / hierarchy
- read-only observability visualization boundary

この design が整理しないもの:

- graph rendering implementation
- execution workflow
- approval workflow
- API implementation
- mutation payload
- actual graph UI

sustainability propagation visualization は、B77-11 survivability propagation の次段として、long-term governance persistence が maintainability / evolvability へどう caveat を渡すかを整理する。sustainable、maintainable、evolvable は「観測上そう読める」状態であり、approval、execution readiness、automation permission、change permission を意味しない。

## 2. Sustainability Visualization Boundary

sustainability visualization は次の性質を持つ。

- read-only
- observability only
- semantic interpretation visualization
- governance sustainability visualization
- lifecycle persistence explanation support

sustainability visualization は次を実行しない。

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

- sustainability path は execution path ではない。
- sustainability edge は execution edge ではない。
- sustainability traversal は workflow traversal ではない。
- sustainability visualization は action plan ではない。
- sustainable / maintainable / evolvable は実行許可ではない。
- compare endpoint は `GET` only として維持する。
- sustainability visualization は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

sustainability node、sustainability edge、sustainability path、highlight、inspector は、すべて semantic interpretation を支える表示であり、承認、業務実行、自動処理を開始しない。

## 3. Semantic Sustainability Definition

semantic sustainability は、survivability が downstream の長期 persistence として読めるか、また maintainability / evolvability の前提として持続可能かを示す observability semantics である。

主な semantics:

- survivability
- sustainability
- maintainability
- evolvability

semantic sustainability は次の観点で整理する。

- semantic lifecycle persistence capacity
- governance continuity persistence capacity
- observability sustainability interpretation
- degradation-resilient continuation capacity

sustainability は approval readiness ではない。sustainability は semantic governance が長期運用下で持続して読めるかを説明する read-only signal である。

## 4. Sustainability Propagation Chain

sustainability chain は、survivability が long-term persistence として downstream semantics へどう伝播して読めるかを示す。

代表 chain:

```text
survivability
↓
sustainability
↓
maintainability
↓
evolvability
```

sustainability propagation の読み方:

- sustainability blocked: unavailable、broken continuity、nonrecoverable、unsustainable などにより sustainability を強調できない状態。
- fragile sustainability: sustainability は読めるが fragile / limited caveat が残る状態。
- conditional sustainability: confidence、evidence、freshness、continuity などの条件付きで sustainability が読める状態。
- maintainability degradation: sustainability caveat が maintainability の読み方を弱める状態。
- evolvability limitation: maintainability / support が弱く、future extension safety を限定的にしか読めない状態。
- downstream sustainability propagation: sustainability の caveat が maintainability、evolvability へ渡る状態。

この chain は execution sequence ではない。上から下へ処理を実行する workflow ではなく、semantic interpretation dependency を読むための map である。

## 5. Sustainability Node Visualization Policy

sustainability node visualization は、long-term persistence を補助として示しつつ、collapse / critical signal を見落とさないように設計する。

表示方針:

- sustainability node は補助表示にする。
- maintainability / evolvability は optimistic に強調しすぎない。
- sustainability summary を表示する。
- sustainability confidence を併記する。
- support semantics を近接表示する。
- collapse path より前面に出さない。
- sustainability caveat を detail / inspector で追えるようにする。

重要な boundary:

- sustainability node は execution state ではない。
- sustainability node は workflow item ではない。
- sustainability node は approval readiness ではない。
- sustainability node click は execution trigger ではない。
- maintainable / evolvable node は implementation permission ではない。

sustainability node は、semantic lifecycle persistence を説明する read-only display object であり、承認対象、作業対象、変更対象を生成しない。

## 6. Sustainability Edge Visualization Policy

sustainability edge visualization は、survivability から maintainability / evolvability への downstream propagation を読みやすくするために設計する。

表示方針:

- sustainability propagation edge を表示する。
- maintainability propagation edge を補助表示する。
- collapse edge より優先表示しない。
- convergence edge との関係を整理する。
- survivability edge との関係を整理する。
- readability 優先で density 制御する。
- selected sustainability path の edge を highlight する。
- non-selected sustainability edge は fade / compact にできる。

collapse / convergence / survivability との関係:

- collapse edge は critical degradation を先に読むための edge である。
- convergence edge は stabilization / recovery direction を読むための edge である。
- survivability edge は degradation tolerance から lifecycle continuation を読むための edge である。
- sustainability edge は survivability の downstream persistence と maintainability / evolvability への caveat を読むための edge である。
- collapse path がある場合、sustainability edge は caveat 付きの補助表示にする。

重要な boundary:

- sustainability edge は execution edge ではない。
- sustainability traversal は workflow traversal ではない。
- sustainability edge click は dependency explanation のみである。
- sustainability edge direction は operation order ではない。

sustainability edge は lifecycle persistence を読むための semantic relation であり、correction、rebuild、replay、sync、repair、orchestration を開始しない。

## 7. Sustainability Path Prioritization

sustainability path prioritization は、long-term persistence を補助的に読むための表示優先順である。

補助表示:

- sustainability path
- maintainability path
- evolvability path

ただし最優先ではない:

- unavailable
- collapse path
- nonrecoverable path
- broken continuity path

重要な方針:

- sustainability path は collapse path より前面に出さない。
- sustainability は execution readiness ではない。
- sustainable / maintainable / evolvable は approval や change permission ではない。
- sustainability path は support caveat と一緒に読む。
- path highlight は action plan ではない。

sustainability path は review context のための読み順であり、execution priority ではない。

## 8. Sustainability Readability Policy

sustainability readability は、long-term persistence を短く、誤解なく、collapse caveat と一緒に読むための方針である。

方針:

- summary first とする。
- sustainability summary は collapse の後で読む。
- sustainability chain を短く読む。
- optimistic semantics を強調しすぎない。
- node explosion を避ける。
- edge spaghetti を避ける。
- sustainability detail は inspector に逃がす。
- confidence / evidence / freshness を近接表示する。
- hover だけに依存せず、summary / detail の両方で caveat を読めるようにする。

sustainability readability は、operator / reviewer が long-term persistence を過信しないための safety policy である。読みやすい sustainability は approval readiness や execution permission ではない。

## 9. Sustainability Density Control

sustainability density control は、long-term persistence path を必要な粒度で表示しつつ、collapse / critical signal を埋もれさせないために使う。

方針:

- sustainability path は compact 表示可能にする。
- stable sustainability node は compact にできる。
- support node は必要時のみ展開する。
- selected sustainability path は highlight する。
- non-selected edge は fade できる。
- sustainability cluster summary を許容する。
- collapse path がある場合は補助表示にする。
- repeated support signal は detail に寄せる。

重要な boundary:

- hidden node は workflow ignore ではない。
- density control は local visualization state である。
- compact 表示は semantic deletion ではない。
- fade は low priority execution ではない。
- sustainability cluster summary は workflow pause ではない。

density control は表示密度を調整するだけであり、business state、workflow state、approval state を変更しない。

## 10. Sustainability Hierarchy

sustainability visualization は、positive semantics の強調を抑え、blocked / fragile / conditional caveat を先に読める hierarchy に従う。

priority:

1. sustainability blocked
2. fragile sustainability
3. conditional sustainability
4. maintainability degradation
5. evolvability limitation
6. sustainable
7. maintainable
8. evolvable

重要な方針:

- evolvable は最後に扱う。
- optimistic semantics は控えめに表示する。
- support が弱い sustainability は強調しない。
- collapse caveat がある sustainability は caveat 付きで表示する。
- sustainable / maintainable / evolvable を実行許可として見せない。

この hierarchy は表示上の読み順であり、execution priority、approval priority、implementation order ではない。

## 11. Sustainability Support Model

sustainability は support semantics によって支えられる。support が弱い場合、sustainability は控えめに表示する。

support semantics examples:

- confidence
- evidence
- freshness
- truth aggregation quality
- explainability
- reasoning coherence
- audit trail

方針:

- support が弱い場合は sustainability を控えめ表示にする。
- stale freshness の場合は sustainable を強調しない。
- explainability が弱い場合は evolvability を強調しない。
- reasoning coherence が partial の場合は conditional sustainability として扱う。
- audit trail が弱い場合は maintainability / evolvability を caveat 付きで表示する。
- support unavailable の場合は sustainability blocked として安全側に読む。

support model は sustainability の読み方を補助するための read-only metadata であり、approval readiness や execution readiness を示さない。

## 12. Sustainability Cluster Model

sustainability cluster は、long-term lifecycle persistence を意味領域ごとにまとめ、readability を維持するための grouping である。

cluster examples:

- sustainability cluster
- maintainability cluster
- evolvability cluster

方針:

- cluster summary 表示可能にする。
- support caveat を cluster summary に表示できるようにする。
- expanded / collapsed は local UI state として扱う。
- workflow state ではない。
- execution group ではない。
- cluster expansion は execution readiness ではない。

sustainability cluster は semantic grouping であり、業務 lane、approval lane、execution group ではない。

## 13. Interaction Boundary

sustainability visualization の interaction は、metadata inspection と semantic explanation support に限定する。

方針:

- sustainability node click は detail 表示のみである。
- sustainability edge click は dependency explanation のみである。
- sustainability highlight は semantic explanation aid である。
- sustainability traversal は workflow ではない。
- inspector は command panel ではない。
- sustainable / maintainable / evolvable click で execution しない。
- sustainability filter は execution routing ではない。
- sustainability expand / collapse は local display state である。

interaction boundary:

- node click で correction / rebuild / replay しない。
- edge click で propagation execution しない。
- highlighted path から repair / retry / sync を開始しない。
- inspector から mutation しない。
- keyboard operation で execution しない。

sustainability interaction は、どの support がどの lifecycle persistence を支えて読めるかを確認するための read-only interaction である。

## 14. Accessibility / Safety-First Policy

sustainability visualization は、long-term persistence を安全に読み取れるようにし、collapse / support caveat を見落とさないようにする。

方針:

- sustainability を色だけで表現しない。
- label / badge / text を併用する。
- screen reader でも sustainability が伝わるようにする。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- sustainability を collapse より目立たせすぎない。
- support の弱さを見落とさない。
- sustainable / maintainable / evolvable が execution permission に見えないようにする。
- read-only / no execution caveat を読み取れるようにする。

sustainability state、support caveat、conditional sustainability、evolvability limitation、sustainability blocked は、色、shape、label、text、badge の複数手段で読めるようにする前提を置く。

## 15. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- sustainability visualization design が固定されていること。
- survivability visualization と整合していること。
- collapse visualization と整合していること。
- convergence visualization と整合していること。
- node / edge taxonomy と整合していること。
- readability / density control と整合していること。
- layering / view mode / interaction boundary / data contract と整合していること。
- graph implementation は別 phase とすること。
- sustainability visualization は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- sustainability visualization から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。

sustainability visualization design は visualization implementation の前提整理であり、implementation approval ではない。

## 16. 今回の範囲外

Phase B77-12 では次を扱わない。

- TypeScript implementation
- React implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- Cytoscape / D3 / Mermaid implementation
- mutation
- workflow execution
- rebuild
- replay
- correction
- sync
- actual graph UI
- package / lock file change
- Supabase schema change

この document は、governance semantic graph sustainability propagation visualization の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
