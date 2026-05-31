# Governance Semantic Graph Evolvability Propagation Visualization Design

Phase B77-14 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design、B77-10 semantic convergence visualization design、B77-11 survivability propagation visualization design、B77-12 sustainability propagation visualization design、B77-13 maintainability propagation visualization design を前提に、将来 governance semantic graph で evolvability propagation を表示する場合の visualization 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、implementation workflow、migration workflow、rebuild / replay / correction / sync、actual graph UI は扱わない。

## 1. このドキュメントの目的

governance semantic evolvability propagation visualization design の目的は、maintainability から evolvability へ続く propagation を read-only observability visualization として整理し、future extension safety を implementation readiness と誤読させないことである。

この design が整理するもの:

- evolvability propagation visualization
- evolvability chain の読み方
- maintainability propagation との関係
- sustainability / survivability / collapse / convergence visualization との関係
- evolvability downstream interpretation
- future extension safety の見せ方
- evolvability readability / density / hierarchy
- read-only observability visualization boundary

この design が整理しないもの:

- graph rendering implementation
- implementation workflow
- migration workflow
- execution workflow
- approval workflow
- API implementation
- mutation payload
- actual graph UI

evolvability propagation visualization は、B77-13 maintainability propagation の次段として、long-term governance maintenance capacity が future extension safety としてどう読めるかを整理する。evolvable は「観測上そう読める」状態であり、implementation readiness、implementation permission、migration readiness、execution permission、automation permission を意味しない。

## 2. Evolvability Visualization Boundary

evolvability visualization は次の性質を持つ。

- read-only
- observability only
- semantic interpretation visualization
- governance evolvability visualization
- future extension safety explanation support

evolvability visualization は次を実行しない。

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
- implementation workflow
- migration workflow

追加 boundary:

- evolvability path は execution path ではない。
- evolvability edge は execution edge ではない。
- evolvability traversal は workflow traversal ではない。
- evolvability visualization は action plan ではない。
- evolvable は implementation permission ではない。
- evolvable は migration readiness ではない。
- compare endpoint は `GET` only として維持する。
- evolvability visualization は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

evolvability node、evolvability edge、evolvability path、highlight、inspector は、すべて semantic interpretation を支える表示であり、実装、移行、承認、業務実行、自動処理を開始しない。

## 3. Semantic Evolvability Definition

semantic evolvability は、maintainability が将来の semantic extension / interpretation change に耐えられるか、また governance semantics を安全に拡張・変更して読めるかを示す observability semantics である。

主な semantics:

- maintainability
- evolvability
- future semantic extension safety
- semantic change tolerance
- governance extension readability

semantic evolvability は次の観点で整理する。

- semantic governance future extension capacity
- future interpretation change tolerance
- governance semantics extension observability
- lifecycle evolution interpretation

evolvability は implementation readiness ではない。evolvability は semantic governance が将来拡張や変更に対してどの程度安全に読めるかを説明する read-only signal である。

## 4. Evolvability Propagation Chain

evolvability chain は、maintainability が future extension safety として downstream interpretation へどう伝播して読めるかを示す。

代表 chain:

```text
maintainability
↓
evolvability
```

evolvability propagation の読み方:

- evolvability blocked: unavailable、broken continuity、unsustainable、unmaintainable、unevolvable などにより evolvability を強調できない状態。
- fragile evolvability: evolvability は読めるが fragile / limited caveat が残る状態。
- conditional evolvability: confidence、evidence、freshness、maintainability context などの条件付きで evolvability が読める状態。
- limited evolvability: support や maintainability context が弱く、future extension safety を限定的にしか読めない状態。
- evolvable semantics: 十分な support と maintainability context により、観測上 future extension safety が読める状態。
- downstream future extension interpretation: evolvability の caveat を将来の semantic extension 判断の文脈として参照する状態。

この chain は execution sequence ではない。上から下へ実装や移行を実行する workflow ではなく、semantic interpretation dependency を読むための map である。

## 5. Evolvability Node Visualization Policy

evolvability node visualization は、future extension safety を補助として示しつつ、collapse / critical signal と maintainability caveat を見落とさないように設計する。

表示方針:

- evolvability node は補助表示にする。
- evolvable semantics は optimistic に強調しすぎない。
- evolvability summary を表示する。
- evolvability confidence を併記する。
- support semantics を近接表示する。
- collapse path より前面に出さない。
- maintainability context を近接表示する。
- evolvability caveat を detail / inspector で追えるようにする。

重要な boundary:

- evolvability node は execution state ではない。
- evolvability node は workflow item ではない。
- evolvability node は implementation task ではない。
- evolvability node は migration readiness ではない。
- evolvability node は approval readiness ではない。
- evolvability node click は execution trigger ではない。

evolvability node は、future extension safety を説明する read-only display object であり、実装対象、移行対象、承認対象、変更対象を生成しない。

## 6. Evolvability Edge Visualization Policy

evolvability edge visualization は、maintainability から evolvability への future extension interpretation を読みやすくするために設計する。

表示方針:

- evolvability propagation edge を表示する。
- maintainability → evolvability relationship を補助表示する。
- collapse edge より優先表示しない。
- convergence / sustainability / maintainability edge との関係を整理する。
- readability 優先で density 制御する。
- selected evolvability path の edge を highlight する。
- non-selected evolvability edge は fade / compact にできる。

collapse / convergence / sustainability / maintainability との関係:

- collapse edge は critical degradation を先に読むための edge である。
- convergence edge は stabilization / recovery direction を読むための edge である。
- sustainability edge は long-term persistence と maintainability / evolvability への caveat を読むための edge である。
- maintainability edge は long-term maintenance capacity と evolvability への caveat を読むための edge である。
- evolvability edge は maintainability context を受けて future extension safety を読むための edge である。
- collapse path、unsustainable path、unmaintainable path がある場合、evolvability edge は caveat 付きの補助表示にする。

重要な boundary:

- evolvability edge は execution edge ではない。
- evolvability traversal は workflow traversal ではない。
- evolvability edge click は dependency explanation のみである。
- evolvability edge direction は operation order ではない。

evolvability edge は future extension interpretation を読むための semantic relation であり、correction、rebuild、replay、sync、repair、orchestration、implementation workflow、migration workflow を開始しない。

## 7. Evolvability Path Prioritization

evolvability path prioritization は、future extension safety を補助的に読むための表示優先順である。

補助表示:

- evolvability path
- future extension interpretation path

ただし最優先ではない:

- unavailable
- collapse path
- nonrecoverable path
- broken continuity path
- unsustainable path
- unmaintainable path

重要な方針:

- evolvability path は collapse path より前面に出さない。
- evolvability は implementation readiness ではない。
- evolvability は migration readiness ではない。
- evolvable は implementation permission ではない。
- evolvability path は support caveat と maintainability context と一緒に読む。
- path highlight は action plan ではない。

evolvability path は review context のための読み順であり、execution priority、implementation priority、migration priority ではない。

## 8. Evolvability Readability Policy

evolvability readability は、future extension safety を短く、誤解なく、collapse / sustainability / maintainability caveat と一緒に読むための方針である。

方針:

- summary first とする。
- evolvability summary は collapse / sustainability / maintainability の後で読む。
- evolvability chain を短く読む。
- optimistic semantics を強調しすぎない。
- node explosion を避ける。
- edge spaghetti を避ける。
- evolvability detail は inspector に逃がす。
- confidence / evidence / freshness を近接表示する。
- maintainability context を近接表示する。
- hover だけに依存せず、summary / detail の両方で caveat を読めるようにする。

evolvability readability は、operator / reviewer が future extension safety を implementation permission と誤読しないための safety policy である。読みやすい evolvability は implementation readiness や migration readiness ではない。

## 9. Evolvability Density Control

evolvability density control は、future extension interpretation path を必要な粒度で表示しつつ、collapse / critical signal を埋もれさせないために使う。

方針:

- evolvability path は compact 表示可能にする。
- stable evolvability node は compact にできる。
- support node は必要時のみ展開する。
- selected evolvability path は highlight する。
- non-selected edge は fade できる。
- evolvability cluster summary を許容する。
- collapse path がある場合は補助表示にする。
- repeated support signal は detail に寄せる。
- maintainability context は summary と detail の両方で参照可能にする。

重要な boundary:

- hidden node は workflow ignore ではない。
- density control は local visualization state である。
- compact 表示は semantic deletion ではない。
- fade は low priority execution ではない。
- evolvability cluster summary は workflow pause ではない。

density control は表示密度を調整するだけであり、business state、workflow state、approval state、implementation state、migration state を変更しない。

## 10. Evolvability Hierarchy

evolvability visualization は、positive semantics の強調を抑え、blocked / fragile / conditional / limited caveat を先に読める hierarchy に従う。

priority:

1. evolvability blocked
2. fragile evolvability
3. conditional evolvability
4. limited evolvability
5. evolvable

重要な方針:

- evolvable は最後に扱う。
- optimistic semantics は控えめに表示する。
- support が弱い evolvability は強調しない。
- maintainability context が fragile の場合は evolvability を強調しない。
- sustainability context が fragile の場合は evolvability を強調しない。
- evolvable を implementation permission として見せない。

この hierarchy は表示上の読み順であり、execution priority、implementation priority、migration priority、change order ではない。

## 11. Evolvability Support Model

evolvability は support semantics、maintainability context、sustainability context によって支えられる。support が弱い場合、evolvability は控えめに表示する。

support semantics examples:

- confidence
- evidence
- freshness
- truth aggregation quality
- explainability
- reasoning coherence
- audit trail
- maintainability context
- sustainability context

方針:

- support が弱い場合は evolvability を控えめ表示にする。
- stale freshness の場合は evolvable を強調しない。
- explainability が弱い場合は evolvability を強調しない。
- maintainability context が fragile の場合は evolvability を強調しない。
- sustainability context が fragile の場合は evolvability を強調しない。
- reasoning coherence が partial の場合は conditional evolvability として扱う。
- audit trail が弱い場合は evolvability を caveat 付きで表示する。
- support unavailable の場合は evolvability blocked として安全側に読む。

support model は evolvability の読み方を補助するための read-only metadata であり、implementation workflow、migration workflow、execution readiness を示さない。

## 12. Evolvability Cluster Model

evolvability cluster は、future extension safety を意味領域ごとにまとめ、readability を維持するための grouping である。

cluster examples:

- evolvability cluster
- future extension safety cluster
- semantic change tolerance cluster

方針:

- cluster summary 表示可能にする。
- support caveat と maintainability context を cluster summary に表示できるようにする。
- expanded / collapsed は local UI state として扱う。
- workflow state ではない。
- execution group ではない。
- implementation group ではない。
- migration group ではない。
- cluster expansion は implementation readiness ではない。

evolvability cluster は semantic grouping であり、業務 lane、approval lane、execution group、implementation group、migration group ではない。

## 13. Interaction Boundary

evolvability visualization の interaction は、metadata inspection と semantic explanation support に限定する。

方針:

- evolvability node click は detail 表示のみである。
- evolvability edge click は dependency explanation のみである。
- evolvability highlight は semantic explanation aid である。
- evolvability traversal は workflow ではない。
- inspector は command panel ではない。
- evolvable click で execution しない。
- evolvable click で implementation / migration を開始しない。
- evolvability filter は execution routing ではない。
- evolvability expand / collapse は local display state である。

interaction boundary:

- node click で correction / rebuild / replay しない。
- edge click で propagation execution しない。
- highlighted path から repair / retry / sync を開始しない。
- highlighted path から implementation workflow を開始しない。
- highlighted path から migration workflow を開始しない。
- inspector から mutation しない。
- keyboard operation で execution しない。

evolvability interaction は、どの support と maintainability context が future extension safety を支えて読めるかを確認するための read-only interaction である。

## 14. Accessibility / Safety-First Policy

evolvability visualization は、future extension safety を安全に読み取れるようにし、collapse / support / maintainability caveat を見落とさないようにする。

方針:

- evolvability を色だけで表現しない。
- label / badge / text を併用する。
- screen reader でも evolvability が伝わるようにする。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- evolvability を collapse より目立たせすぎない。
- support の弱さを見落とさない。
- implementation readiness と誤読されない wording にする。
- migration readiness と誤読されない wording にする。
- read-only / no execution caveat を読み取れるようにする。

evolvability state、support caveat、conditional evolvability、limited evolvability、evolvability blocked、maintainability context は、色、shape、label、text、badge の複数手段で読めるようにする前提を置く。

## 15. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- evolvability visualization design が固定されていること。
- maintainability visualization と整合していること。
- sustainability / survivability / collapse / convergence visualization と整合していること。
- node / edge taxonomy と整合していること。
- readability / density control と整合していること。
- layering / view mode / interaction boundary / data contract と整合していること。
- graph implementation は別 phase とすること。
- evolvability visualization は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- evolvability visualization から mutation しないこと。
- implementation / migration / execution layer は別 endpoint / 別 workflow として設計すること。

evolvability visualization design は visualization implementation の前提整理であり、implementation approval、migration approval、execution approval ではない。

## 16. 今回の範囲外

Phase B77-14 では次を扱わない。

- TypeScript implementation
- React implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- Cytoscape / D3 / Mermaid implementation
- mutation
- workflow execution
- implementation workflow
- migration workflow
- rebuild
- replay
- correction
- sync
- actual graph UI
- package / lock file change
- Supabase schema change

この document は、governance semantic graph evolvability propagation visualization の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
