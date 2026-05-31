# Governance Semantic Graph Maintainability Propagation Visualization Design

Phase B77-13 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design、B77-10 semantic convergence visualization design、B77-11 survivability propagation visualization design、B77-12 sustainability propagation visualization design を前提に、将来 governance semantic graph で maintainability propagation を表示する場合の visualization 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、maintenance workflow、rebuild / replay / correction / sync、actual graph UI は扱わない。

## 1. このドキュメントの目的

governance semantic maintainability propagation visualization design の目的は、sustainability から maintainability、evolvability へ続く downstream propagation を read-only observability visualization として整理することである。

この design が整理するもの:

- maintainability propagation visualization
- maintainability chain の読み方
- sustainability propagation との関係
- survivability / collapse / convergence visualization との関係
- evolvability への downstream propagation
- maintainability readability / density / hierarchy
- read-only observability visualization boundary

この design が整理しないもの:

- graph rendering implementation
- maintenance workflow
- execution workflow
- approval workflow
- API implementation
- mutation payload
- actual graph UI

maintainability propagation visualization は、B77-12 sustainability propagation の次段として、long-term governance maintenance capacity が evolvability へどう caveat を渡すかを整理する。maintainable、evolvable は「観測上そう読める」状態であり、maintenance workflow、execution readiness、automation permission、change permission を意味しない。

## 2. Maintainability Visualization Boundary

maintainability visualization は次の性質を持つ。

- read-only
- observability only
- semantic interpretation visualization
- governance maintainability visualization
- lifecycle maintenance explanation support

maintainability visualization は次を実行しない。

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
- maintenance workflow

追加 boundary:

- maintainability path は execution path ではない。
- maintainability edge は execution edge ではない。
- maintainability traversal は workflow traversal ではない。
- maintainability visualization は action plan ではない。
- maintainable / evolvable は実行許可ではない。
- maintainability は maintenance workflow ではない。
- compare endpoint は `GET` only として維持する。
- maintainability visualization は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

maintainability node、maintainability edge、maintainability path、highlight、inspector は、すべて semantic interpretation を支える表示であり、保守作業、承認、業務実行、自動処理を開始しない。

## 3. Semantic Maintainability Definition

semantic maintainability は、sustainability が downstream の保守・追跡しやすさとして読めるか、また evolvability の前提として維持可能かを示す observability semantics である。

主な semantics:

- sustainability
- maintainability
- evolvability

semantic maintainability は次の観点で整理する。

- semantic governance maintenance capacity
- long-term interpretation maintenance capacity
- observability maintenance interpretation
- lifecycle maintainability propagation

maintainability は maintenance workflow ではない。maintainability は semantic governance が長期運用下で維持・追跡しやすいかを説明する read-only signal である。

## 4. Maintainability Propagation Chain

maintainability chain は、sustainability が long-term maintenance capacity として downstream semantics へどう伝播して読めるかを示す。

代表 chain:

```text
sustainability
↓
maintainability
↓
evolvability
```

maintainability propagation の読み方:

- maintainability blocked: unavailable、broken continuity、unsustainable、unmaintainable などにより maintainability を強調できない状態。
- fragile maintainability: maintainability は読めるが fragile / limited caveat が残る状態。
- conditional maintainability: confidence、evidence、freshness、sustainability context などの条件付きで maintainability が読める状態。
- maintainability degradation: sustainability caveat や support weakness が maintainability の読み方を弱める状態。
- evolvability limitation: maintainability / support が弱く、future extension safety を限定的にしか読めない状態。
- downstream maintainability propagation: maintainability の caveat が evolvability へ渡る状態。

この chain は execution sequence ではない。上から下へ保守作業を実行する workflow ではなく、semantic interpretation dependency を読むための map である。

## 5. Maintainability Node Visualization Policy

maintainability node visualization は、long-term maintenance capacity を補助として示しつつ、collapse / critical signal を見落とさないように設計する。

表示方針:

- maintainability node は補助表示にする。
- evolvability は optimistic に強調しすぎない。
- maintainability summary を表示する。
- maintainability confidence を併記する。
- support semantics を近接表示する。
- collapse path より前面に出さない。
- maintainability caveat を detail / inspector で追えるようにする。

重要な boundary:

- maintainability node は execution state ではない。
- maintainability node は workflow item ではない。
- maintainability node は maintenance task ではない。
- maintainability node は approval readiness ではない。
- maintainability node click は execution trigger ではない。
- evolvable node は implementation permission ではない。

maintainability node は、semantic lifecycle maintenance を説明する read-only display object であり、保守作業対象、承認対象、変更対象を生成しない。

## 6. Maintainability Edge Visualization Policy

maintainability edge visualization は、sustainability から evolvability への downstream propagation を読みやすくするために設計する。

表示方針:

- maintainability propagation edge を表示する。
- evolvability propagation edge を補助表示する。
- collapse edge より優先表示しない。
- convergence / sustainability edge との関係を整理する。
- readability 優先で density 制御する。
- selected maintainability path の edge を highlight する。
- non-selected maintainability edge は fade / compact にできる。

collapse / convergence / sustainability との関係:

- collapse edge は critical degradation を先に読むための edge である。
- convergence edge は stabilization / recovery direction を読むための edge である。
- sustainability edge は survivability の downstream persistence と maintainability / evolvability への caveat を読むための edge である。
- maintainability edge は sustainability の downstream maintenance capacity と evolvability への caveat を読むための edge である。
- collapse path や unsustainable path がある場合、maintainability edge は caveat 付きの補助表示にする。

重要な boundary:

- maintainability edge は execution edge ではない。
- maintainability traversal は workflow traversal ではない。
- maintainability edge click は dependency explanation のみである。
- maintainability edge direction は operation order ではない。

maintainability edge は lifecycle maintenance を読むための semantic relation であり、correction、rebuild、replay、sync、repair、orchestration、maintenance workflow を開始しない。

## 7. Maintainability Path Prioritization

maintainability path prioritization は、long-term maintenance capacity を補助的に読むための表示優先順である。

補助表示:

- maintainability path
- evolvability path

ただし最優先ではない:

- unavailable
- collapse path
- nonrecoverable path
- broken continuity path
- unsustainable path

重要な方針:

- maintainability path は collapse path より前面に出さない。
- maintainability は execution readiness ではない。
- maintainability は maintenance action ではない。
- maintainable / evolvable は approval や change permission ではない。
- maintainability path は support caveat と一緒に読む。
- path highlight は action plan ではない。

maintainability path は review context のための読み順であり、execution priority や maintenance priority ではない。

## 8. Maintainability Readability Policy

maintainability readability は、long-term maintenance capacity を短く、誤解なく、collapse / sustainability caveat と一緒に読むための方針である。

方針:

- summary first とする。
- maintainability summary は collapse / sustainability の後で読む。
- maintainability chain を短く読む。
- optimistic semantics を強調しすぎない。
- node explosion を避ける。
- edge spaghetti を避ける。
- maintainability detail は inspector に逃がす。
- confidence / evidence / freshness を近接表示する。
- hover だけに依存せず、summary / detail の両方で caveat を読めるようにする。

maintainability readability は、operator / reviewer が long-term maintenance capacity を過信しないための safety policy である。読みやすい maintainability は maintenance workflow や execution permission ではない。

## 9. Maintainability Density Control

maintainability density control は、long-term maintenance path を必要な粒度で表示しつつ、collapse / critical signal を埋もれさせないために使う。

方針:

- maintainability path は compact 表示可能にする。
- stable maintainability node は compact にできる。
- support node は必要時のみ展開する。
- selected maintainability path は highlight する。
- non-selected edge は fade できる。
- maintainability cluster summary を許容する。
- collapse path がある場合は補助表示にする。
- repeated support signal は detail に寄せる。

重要な boundary:

- hidden node は workflow ignore ではない。
- density control は local visualization state である。
- compact 表示は semantic deletion ではない。
- fade は low priority execution ではない。
- maintainability cluster summary は workflow pause ではない。

density control は表示密度を調整するだけであり、business state、workflow state、approval state、maintenance state を変更しない。

## 10. Maintainability Hierarchy

maintainability visualization は、positive semantics の強調を抑え、blocked / fragile / conditional caveat を先に読める hierarchy に従う。

priority:

1. maintainability blocked
2. fragile maintainability
3. conditional maintainability
4. maintainability degradation
5. evolvability limitation
6. maintainable
7. evolvable

重要な方針:

- evolvable は最後に扱う。
- optimistic semantics は控えめに表示する。
- support が弱い maintainability は強調しない。
- sustainability context が fragile な maintainability は caveat 付きで表示する。
- maintainable / evolvable を実行許可として見せない。

この hierarchy は表示上の読み順であり、execution priority、maintenance priority、implementation order ではない。

## 11. Maintainability Support Model

maintainability は support semantics と sustainability context によって支えられる。support が弱い場合、maintainability は控えめに表示する。

support semantics examples:

- confidence
- evidence
- freshness
- truth aggregation quality
- explainability
- reasoning coherence
- audit trail
- sustainability context

方針:

- support が弱い場合は maintainability を控えめ表示にする。
- stale freshness の場合は maintainable を強調しない。
- explainability が弱い場合は evolvability を強調しない。
- sustainability context が fragile の場合は maintainability を強調しない。
- reasoning coherence が partial の場合は conditional maintainability として扱う。
- audit trail が弱い場合は maintainability / evolvability を caveat 付きで表示する。
- support unavailable の場合は maintainability blocked として安全側に読む。

support model は maintainability の読み方を補助するための read-only metadata であり、maintenance workflow や execution readiness を示さない。

## 12. Maintainability Cluster Model

maintainability cluster は、long-term lifecycle maintenance を意味領域ごとにまとめ、readability を維持するための grouping である。

cluster examples:

- maintainability cluster
- evolvability cluster

方針:

- cluster summary 表示可能にする。
- support caveat を cluster summary に表示できるようにする。
- expanded / collapsed は local UI state として扱う。
- workflow state ではない。
- execution group ではない。
- maintenance group ではない。
- cluster expansion は execution readiness ではない。

maintainability cluster は semantic grouping であり、業務 lane、approval lane、execution group、maintenance group ではない。

## 13. Interaction Boundary

maintainability visualization の interaction は、metadata inspection と semantic explanation support に限定する。

方針:

- maintainability node click は detail 表示のみである。
- maintainability edge click は dependency explanation のみである。
- maintainability highlight は semantic explanation aid である。
- maintainability traversal は workflow ではない。
- inspector は command panel ではない。
- maintainable / evolvable click で execution しない。
- maintainability filter は execution routing ではない。
- maintainability expand / collapse は local display state である。

interaction boundary:

- node click で correction / rebuild / replay しない。
- edge click で propagation execution しない。
- highlighted path から repair / retry / sync を開始しない。
- highlighted path から maintenance workflow を開始しない。
- inspector から mutation しない。
- keyboard operation で execution しない。

maintainability interaction は、どの support がどの lifecycle maintenance を支えて読めるかを確認するための read-only interaction である。

## 14. Accessibility / Safety-First Policy

maintainability visualization は、long-term maintenance capacity を安全に読み取れるようにし、collapse / support caveat を見落とさないようにする。

方針:

- maintainability を色だけで表現しない。
- label / badge / text を併用する。
- screen reader でも maintainability が伝わるようにする。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- maintainability を collapse より目立たせすぎない。
- support の弱さを見落とさない。
- maintainable / evolvable が execution permission に見えないようにする。
- read-only / no execution caveat を読み取れるようにする。

maintainability state、support caveat、conditional maintainability、evolvability limitation、maintainability blocked は、色、shape、label、text、badge の複数手段で読めるようにする前提を置く。

## 15. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- maintainability visualization design が固定されていること。
- sustainability visualization と整合していること。
- survivability / collapse / convergence visualization と整合していること。
- node / edge taxonomy と整合していること。
- readability / density control と整合していること。
- layering / view mode / interaction boundary / data contract と整合していること。
- graph implementation は別 phase とすること。
- maintainability visualization は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- maintainability visualization から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- maintenance workflow は別 endpoint / 別 workflow として設計すること。

maintainability visualization design は visualization implementation の前提整理であり、implementation approval ではない。

## 16. 今回の範囲外

Phase B77-13 では次を扱わない。

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
- maintenance workflow
- package / lock file change
- Supabase schema change

この document は、governance semantic graph maintainability propagation visualization の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
