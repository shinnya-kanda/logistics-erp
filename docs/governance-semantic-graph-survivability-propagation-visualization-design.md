# Governance Semantic Graph Survivability Propagation Visualization Design

Phase B77-11 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design、B77-10 semantic convergence visualization design を前提に、将来 governance semantic graph で survivability propagation を表示する場合の visualization 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI は扱わない。

## 1. このドキュメントの目的

governance semantic survivability propagation visualization design の目的は、degradation tolerance から survivability、sustainability、maintainability、evolvability へ続く long-term governance viability の読み方を、read-only observability visualization として整理することである。

この design が整理するもの:

- survivability propagation visualization
- degradation tolerance から evolvability までの survivability chain
- survivability readability
- collapse / convergence visualization との関係
- survivability node / edge / cluster visualization policy
- survivability support model
- read-only observability visualization boundary

この design が整理しないもの:

- graph rendering implementation
- execution workflow
- API implementation
- mutation payload
- actual graph UI

survivability propagation visualization は、collapse / convergence と並ぶ第三の propagation visualization である。ただし、survivable、sustainable、maintainable、evolvable は「観測上そう読める」状態であり、実行許可、変更開始許可、承認完了、automation permission を意味しない。

## 2. Survivability Visualization Boundary

survivability visualization は次の性質を持つ。

- read-only
- observability only
- semantic interpretation visualization
- governance survivability visualization
- lifecycle continuation explanation support

survivability visualization は次を実行しない。

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

- survivability path は execution path ではない。
- survivability edge は execution edge ではない。
- survivability traversal は workflow traversal ではない。
- survivability visualization は action plan ではない。
- survivable / sustainable / maintainable / evolvable は実行許可ではない。
- compare endpoint は `GET` only として維持する。
- survivability visualization は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

survivability node、survivability edge、survivability path、highlight、inspector は、すべて semantic interpretation を支える表示であり、業務実行や自動処理を開始しない。

## 3. Semantic Survivability Definition

semantic survivability は、degraded / critical state 下でも governance semantics を読み続けられるか、長期運用で意味を保てるかを示す observability semantics である。

主な semantics:

- degradation tolerance
- survivability
- sustainability
- maintainability
- evolvability

semantic survivability は次の観点で整理する。

- semantic continuity capacity
- governance lifecycle continuation capacity
- observability persistence capacity
- degradation resistance interpretation

survivability は execution readiness ではない。survivability は degraded state 下で semantic governance がどの程度持続して読めるかを説明する read-only signal である。

## 4. Survivability Propagation Chain

survivability chain は、degradation tolerance が long-term governance viability へどのように伝播して読めるかを示す。

代表 chain:

```text
degradation tolerance
↓
survivability
↓
sustainability
↓
maintainability
↓
evolvability
```

survivability propagation の読み方:

- survivability blocked: unavailable、broken、nonrecoverable、broken continuity などにより survivability を強調できない状態。
- degraded survivability: survivability は読めるが fragile / limited caveat が残る状態。
- conditional sustainability: support semantics や lifecycle continuity に条件付きで sustainability が読める状態。
- fragile maintainability: sustainability が弱く、maintainability が保守可能性として限定的にしか読めない状態。
- limited evolvability: maintainability や support が弱く、future extension safety を限定的にしか読めない状態。
- downstream lifecycle continuation: degradation tolerance / survivability の caveat が sustainability、maintainability、evolvability へ渡る状態。

この chain は execution sequence ではない。上から下へ処理を実行する workflow ではなく、semantic interpretation dependency を読むための map である。

## 5. Survivability Node Visualization Policy

survivability node visualization は、long-term viability を補助として示しつつ、collapse / critical signal を見落とさないように設計する。

表示方針:

- survivability node は補助表示にする。
- sustainability / maintainability / evolvability は optimistic に強調しすぎない。
- survivability summary を表示する。
- survivability confidence を併記する。
- survivability support semantics を近接表示する。
- collapse node より前面に出しすぎない。
- survivability caveat を detail / inspector で追えるようにする。

重要な boundary:

- survivability node は execution state ではない。
- survivability node は workflow item ではない。
- survivability node は action readiness ではない。
- survivability node click は execution trigger ではない。
- sustainable / evolvable node は implementation permission ではない。

survivability node は、semantic lifecycle continuation を説明する read-only display object であり、作業対象や変更対象を生成しない。

## 6. Survivability Edge Visualization Policy

survivability edge visualization は、degradation tolerance から downstream lifecycle continuation への propagation を読みやすくするために設計する。

表示方針:

- survivability propagation edge を表示する。
- lifecycle continuation edge を補助表示する。
- collapse edge より優先表示しない。
- convergence edge との関係を整理する。
- support edge と survivability edge を区別する。
- readability 優先で density 制御する。
- selected survivability path の edge を highlight する。
- non-selected survivability edge は fade / compact にできる。

collapse / convergence との関係:

- collapse edge は critical degradation を先に読むための edge である。
- convergence edge は stabilization / recovery direction を読むための edge である。
- survivability edge は long-term continuation viability を読むための edge である。
- collapse path がある場合、survivability edge は caveat 付きの補助表示にする。

重要な boundary:

- survivability edge は execution edge ではない。
- survivability traversal は workflow traversal ではない。
- survivability edge click は dependency explanation のみである。
- survivability edge direction は operation order ではない。

survivability edge は lifecycle continuation を読むための semantic relation であり、correction、rebuild、replay、sync、repair、orchestration を開始しない。

## 7. Survivability Path Prioritization

survivability path prioritization は、long-term viability を補助的に読むための表示優先順である。

補助表示:

- survivability path
- sustainability path
- maintainability path
- evolvability path

ただし最優先ではない:

- unavailable
- collapse path
- nonrecoverable path
- broken continuity path

重要な方針:

- survivability path は collapse path より前面に出さない。
- survivability は execution readiness ではない。
- sustainable / maintainable / evolvable は change permission ではない。
- survivability path は support caveat と一緒に読む。
- path highlight は action plan ではない。

survivability path は review context のための読み順であり、execution priority ではない。

## 8. Survivability Readability Policy

survivability readability は、long-term viability を短く、誤解なく、collapse caveat と一緒に読むための方針である。

方針:

- summary first とする。
- survivability summary は collapse の後で読む。
- survivability chain を短く読む。
- optimistic semantics を強調しすぎない。
- node explosion を避ける。
- edge spaghetti を避ける。
- survivability detail は inspector に逃がす。
- confidence / evidence / freshness を近接表示する。
- hover だけに依存せず、summary / detail の両方で caveat を読めるようにする。

survivability readability は、operator / reviewer が long-term viability を過信しないための safety policy である。読みやすい survivability は execution permission ではない。

## 9. Survivability Density Control

survivability density control は、long-term viability path を必要な粒度で表示しつつ、collapse / critical signal を埋もれさせないために使う。

方針:

- survivability path は compact 表示可能にする。
- stable survivability node は compact にできる。
- support node は必要時のみ展開する。
- selected survivability path は highlight する。
- non-selected edge は fade できる。
- survivability cluster summary を許容する。
- collapse path がある場合は補助表示にする。
- repeated support signal は detail に寄せる。

重要な boundary:

- hidden node は workflow ignore ではない。
- density control は local visualization state である。
- compact 表示は semantic deletion ではない。
- fade は low priority execution ではない。
- survivability cluster summary は workflow pause ではない。

density control は表示密度を調整するだけであり、business state、workflow state、approval state を変更しない。

## 10. Survivability Hierarchy

survivability visualization は、positive semantics の強調を抑え、blocked / degraded / fragile caveat を先に読める hierarchy に従う。

priority:

1. survivability blocked
2. degraded survivability
3. conditional sustainability
4. fragile maintainability
5. limited evolvability
6. survivable
7. sustainable
8. maintainable
9. evolvable

重要な方針:

- evolvable は最後に扱う。
- optimistic semantics は控えめに表示する。
- support が弱い survivability は強調しない。
- collapse caveat がある survivability は caveat 付きで表示する。
- sustainable / maintainable / evolvable を実行許可として見せない。

この hierarchy は表示上の読み順であり、execution priority や implementation order ではない。

## 11. Survivability Support Model

survivability は support semantics によって支えられる。support が弱い場合、survivability は控えめに表示する。

support semantics examples:

- confidence
- evidence
- freshness
- truth aggregation quality
- explainability
- reasoning coherence
- audit trail

方針:

- support が弱い場合は survivability を控えめ表示にする。
- stale freshness の場合は sustainable を強調しない。
- explainability が弱い場合は evolvability を強調しない。
- reasoning coherence が partial の場合は conditional sustainability として扱う。
- audit trail が弱い場合は maintainability / evolvability を caveat 付きで表示する。
- support unavailable の場合は survivability blocked として安全側に読む。

support model は survivability の読み方を補助するための read-only metadata であり、execution readiness を示さない。

## 12. Survivability Cluster Model

survivability cluster は、long-term lifecycle continuation を意味領域ごとにまとめ、readability を維持するための grouping である。

cluster examples:

- survivability cluster
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

survivability cluster は semantic grouping であり、業務 lane、approval lane、execution group ではない。

## 13. Interaction Boundary

survivability visualization の interaction は、metadata inspection と semantic explanation support に限定する。

方針:

- survivability node click は detail 表示のみである。
- survivability edge click は dependency explanation のみである。
- survivability highlight は semantic explanation aid である。
- survivability traversal は workflow ではない。
- inspector は command panel ではない。
- sustainable / evolvable click で execution しない。
- survivability filter は execution routing ではない。
- survivability expand / collapse は local display state である。

interaction boundary:

- node click で correction / rebuild / replay しない。
- edge click で propagation execution しない。
- highlighted path から repair / retry / sync を開始しない。
- inspector から mutation しない。
- keyboard operation で execution しない。

survivability interaction は、どの support がどの lifecycle continuation を支えて読めるかを確認するための read-only interaction である。

## 14. Accessibility / Safety-First Policy

survivability visualization は、long-term viability を安全に読み取れるようにし、collapse / support caveat を見落とさないようにする。

方針:

- survivability を色だけで表現しない。
- label / badge / text を併用する。
- screen reader でも survivability が伝わるようにする。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- survivability を collapse より目立たせすぎない。
- support の弱さを見落とさない。
- sustainable / maintainable / evolvable が execution permission に見えないようにする。
- read-only / no execution caveat を読み取れるようにする。

survivability state、support caveat、conditional sustainability、limited evolvability、survivability blocked は、色、shape、label、text、badge の複数手段で読めるようにする前提を置く。

## 15. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- survivability visualization design が固定されていること。
- collapse visualization と整合していること。
- convergence visualization と整合していること。
- node / edge taxonomy と整合していること。
- readability / density control と整合していること。
- layering / view mode / interaction boundary / data contract と整合していること。
- graph implementation は別 phase とすること。
- survivability visualization は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- survivability visualization から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。

survivability visualization design は visualization implementation の前提整理であり、implementation approval ではない。

## 16. 今回の範囲外

Phase B77-11 では次を扱わない。

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
- package / lock file change
- Supabase schema change

この document は、governance semantic graph survivability propagation visualization の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
