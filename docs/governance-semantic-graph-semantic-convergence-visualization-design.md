# Governance Semantic Graph Semantic Convergence Visualization Design

Phase B77-10 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design を前提に、将来 governance semantic graph で semantic convergence propagation を表示する場合の visualization 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI、recovery workflow、auto-fix workflow は扱わない。

## 1. このドキュメントの目的

governance semantic convergence visualization design の目的は、semantic convergence propagation を read-only observability として可視化し、stabilization path / recovery path を人間が安全に読み取れるようにすることである。

この design が整理するもの:

- semantic convergence propagation visualization
- convergence chain / stabilization path / recovery path
- collapse visualization と対になる stabilization visualization の位置付け
- convergence node / edge / cluster visualization policy
- convergence readability / density / confidence hierarchy
- convergence support model
- read-only observability visualization boundary

この design が整理しないもの:

- graph rendering implementation
- recovery workflow
- auto-fix workflow
- API implementation
- mutation payload

convergence visualization は、collapse visualization と対になる stabilization visualization である。ただし、positive path を collapse path より強く見せるためのものではない。stable、recoverable、maintainable、evolvable は「観測上その方向に読める」ことを示すだけであり、実行許可、正しさ保証、承認完了を意味しない。

## 2. Convergence Visualization Boundary

convergence visualization は次の性質を持つ。

- read-only
- observability only
- semantic interpretation visualization
- governance stabilization visualization
- semantic recovery explanation support

convergence visualization は次を実行しない。

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

- convergence path は recovery workflow ではない。
- convergence edge は execution edge ではない。
- convergence traversal は execution traversal ではない。
- convergence visualization は action plan ではない。
- stable / recoverable / maintainable / evolvable は実行許可ではない。
- compare endpoint は `GET` only として維持する。
- convergence visualization は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

convergence node、convergence edge、convergence path、highlight、inspector は、すべて semantic interpretation を支える表示であり、回復処理や自動修復を開始しない。

## 3. Semantic Convergence Definition

semantic convergence は、partial / degraded な semantic state が安定方向へ読める状態として扱う。

convergence examples:

- partial coherence
- coherent reasoning
- slight drift
- converging semantics
- stable convergence
- resilient semantics
- recoverable semantics
- continuous observability
- sustainable semantics
- maintainable semantics
- evolvable semantics

semantic convergence は次の観点で整理する。

- semantic interpretation stabilization
- governance meaning stabilization
- observability recovery propagation
- lifecycle stabilization propagation

convergence は correctness guarantee ではない。convergence は read-only compare / governance metadata を「安定方向に読める可能性」として説明する stabilization signal である。

## 4. Convergence Propagation Chain

convergence chain は、semantic interpretation が支援 signal を受けながら安定方向へ伝播して読める関係を示す。

代表 chain:

```text
partial coherence
↓
coherent reasoning
↓
slight drift stabilized
↓
converging semantics
↓
stable convergence
↓
resilient semantics
↓
recoverable semantics
↓
continuous observability
↓
sustainable semantics
↓
maintainable semantics
↓
evolvable semantics
```

convergence propagation の読み方:

- upstream support: 前段 semantics や support semantics が downstream stabilization を支える状態。
- downstream stabilization: 後段 semantics が upstream support を受けて安定方向に読める状態。
- partial convergence: 一部の semantics が stable / coherent 方向へ読めるが caveat が残る状態。
- conditional convergence: confidence、evidence、freshness などの条件付きで安定方向に読める状態。
- convergence blocked: unavailable、broken、outside boundary、nonrecoverable などにより convergence を強調できない状態。
- support convergence: confidence、evidence、freshness、auditability、explainability などの支援 semantics が整い、安定方向の読み方を補強する状態。

この chain は execution sequence ではない。上から下へ処理を実行する workflow ではなく、semantic interpretation dependency を読むための map である。

## 5. Convergence Node Visualization Policy

convergence node visualization は、安定方向の読み方を補助として示しつつ、collapse signal を見落とさないように設計する。

表示方針:

- stable / recoverable / maintainable / evolvable node は補助表示にする。
- convergence node は optimistic に強調しすぎない。
- convergence node は collapse node より目立たせすぎない。
- convergence summary は context として表示する。
- support node は必要時のみ展開する。
- convergence confidence / evidence / freshness を併記する。
- convergence node の caveat を detail / inspector で追えるようにする。

重要な boundary:

- convergence node は execution state ではない。
- convergence node は recovery task ではない。
- convergence node は workflow item ではない。
- stable node は action permission ではない。
- convergence node click は execution trigger ではない。

convergence node は、semantic stabilization を説明する read-only display object であり、回復対象や作業対象を生成しない。

## 6. Convergence Edge Visualization Policy

convergence edge visualization は、stabilization / recovery propagation を読みやすくするために設計する。

表示方針:

- convergence propagation edge を補助表示する。
- recovery / stabilization edge を必要時表示にする。
- collapse edge より優先表示しない。
- upstream / downstream convergence を明確化する。
- support edge と convergence edge を区別する。
- convergence edge density を readability 優先で制御する。
- selected convergence path の edge を highlight する。
- non-selected convergence edge は fade / compact にできる。

重要な boundary:

- convergence edge は execution edge ではない。
- traversal は workflow execution ではない。
- convergence edge は auto-fix route ではない。
- convergence edge click は dependency explanation のみである。
- convergence edge direction は operation order ではない。

convergence edge は stabilization impact を読むための semantic relation であり、correction、rebuild、replay、sync、repair、orchestration を開始しない。

## 7. Convergence Path Prioritization

convergence path prioritization は、positive / stable direction の path を補助的に読むための表示優先順である。

補助的に優先:

- stable convergence path
- recoverable path
- continuous observability path
- sustainable path
- maintainable path
- evolvable path

ただし最優先ではない:

- unavailable / broken / collapsed
- outside boundary
- nonrecoverable
- critical collapse path

重要な方針:

- convergence path は collapse path より前面に出しすぎない。
- positive path を optimistic に強調しすぎない。
- convergence は安全確認の補助であり実行許可ではない。
- convergence path は confidence / evidence / freshness caveat と一緒に読む。
- path highlight は action plan ではない。

convergence path は review context のための読み順であり、execution priority ではない。

## 8. Convergence Readability Policy

convergence readability は、stabilization / recovery direction を短く、誤解なく、collapse caveat と一緒に読むための方針である。

方針:

- summary first とする。
- convergence summary は collapse summary の後で読む。
- convergence chain を短く読む。
- stable semantics を過度強調しない。
- node explosion を避ける。
- edge spaghetti を避ける。
- reason / source / signals を convergence path に集中表示する。
- convergence detail は inspector に逃がす。
- confidence / evidence / freshness を近くに表示する。
- hover だけに依存せず、summary / detail の両方で caveat を読めるようにする。

convergence readability は、operator / reviewer が positive semantics を過信しないための safety policy である。読みやすい convergence は execution permission ではない。

## 9. Convergence Density Control

convergence density control は、positive path を必要な粒度で表示しつつ、collapse / critical signal を埋もれさせないために使う。

方針:

- convergence path は必要時展開にする。
- stable node は compact 表示にできる。
- support node は必要時のみ展開する。
- selected convergence path は highlight する。
- non-selected convergence edge は fade できる。
- cluster convergence summary を許容する。
- collapse path がある場合は convergence path を補助扱いする。
- repeated support signal は detail に寄せる。

重要な boundary:

- hidden node は workflow ignore ではない。
- density control は local visualization state である。
- compact 表示は semantic deletion ではない。
- fade は low priority execution ではない。
- cluster convergence summary は workflow pause ではない。

density control は表示密度を調整するだけであり、business state、workflow state、approval state を変更しない。

## 10. Convergence Severity / Confidence Hierarchy

convergence visualization は、positive semantics の強調を抑え、confidence / evidence caveat を反映できる hierarchy に従う。

priority:

1. convergence blocked / unavailable support
2. conditional convergence
3. partial convergence
4. stable convergence
5. recoverable
6. continuous
7. sustainable
8. maintainable
9. evolvable

重要な方針:

- stable / evolvable は最後に扱う。
- optimistic semantics は控えめに表示する。
- confidence / evidence が弱い convergence は強調しない。
- stale freshness がある convergence は stable として強く見せない。
- support caveat を convergence summary から隠さない。

この hierarchy は表示上の読み順であり、execution priority や recovery order ではない。

## 11. Convergence Support Model

convergence は support semantics によって支えられる。support が弱い場合、convergence は控えめに表示する。

support semantics examples:

- compare confidence
- evidence strength
- projection freshness
- truth aggregation quality
- audit trail
- explainability
- reasoning coherence

方針:

- support が弱い場合は convergence を控えめに表示する。
- evidence / freshness が stale の場合は stable convergence を強調しない。
- explainability / audit trail が弱い場合は recovery path を強調しない。
- reasoning coherence が partial の場合は conditional convergence として扱う。
- support unavailable の場合は convergence blocked / unavailable support として安全側に読む。

support model は confidence を補助するための read-only metadata であり、execution readiness を示さない。

## 12. Convergence Cluster Model

convergence cluster は、stabilization / recovery path を意味領域ごとにまとめ、readability を維持するための grouping である。

cluster examples:

- reasoning convergence cluster
- lifecycle convergence cluster
- resilience convergence cluster
- recovery convergence cluster
- sustainability convergence cluster
- maintainability convergence cluster
- evolvability convergence cluster

方針:

- convergence cluster は summary 表示可能にする。
- support caveat を cluster summary に表示できるようにする。
- expanded / collapsed は local UI state として扱う。
- workflow state ではない。
- execution group ではない。
- cluster expansion は execution readiness ではない。

convergence cluster は semantic grouping であり、業務 lane、approval lane、recovery group ではない。

## 13. Interaction Boundary For Convergence Visualization

convergence visualization の interaction は、metadata inspection と semantic explanation support に限定する。

方針:

- convergence node click は detail 表示のみである。
- convergence edge click は dependency explanation のみである。
- convergence highlight は semantic explanation aid である。
- convergence traversal は recovery workflow ではない。
- convergence inspector は command panel ではない。
- stable / maintainable / evolvable click で execution しない。
- convergence filter は execution routing ではない。
- convergence expand / collapse は local display state である。

interaction boundary:

- node click で correction / rebuild / replay しない。
- edge click で propagation execution しない。
- highlighted path から repair / retry / sync を開始しない。
- inspector から mutation しない。
- keyboard operation で execution しない。

convergence interaction は、どの support がどの stabilization を支えて読めるかを確認するための read-only interaction である。

## 14. Accessibility / Safety-First Policy

convergence visualization は、positive semantics を安全に読み取れるようにし、collapse / support caveat を見落とさないようにする。

方針:

- convergence を色だけで表現しない。
- label / badge / text を併用する。
- screen reader でも convergence state が伝わるようにする。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- convergence を collapse より目立たせすぎない。
- confidence / evidence の弱さを見落とさない。
- stable / recoverable / maintainable / evolvable が execution permission に見えないようにする。
- read-only / no execution caveat を読み取れるようにする。

convergence state、support caveat、conditional convergence、convergence blocked は、色、shape、label、text、badge の複数手段で読めるようにする前提を置く。

## 15. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- convergence visualization design が固定されていること。
- collapse visualization design と整合していること。
- node / edge taxonomy と整合していること。
- readability / density control と整合していること。
- layering / view mode / interaction boundary / data contract と整合していること。
- graph implementation は別 phase とすること。
- convergence visualization は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- convergence visualization から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- convergence visualization を execution UI として扱わないこと。

convergence visualization design は visualization implementation の前提整理であり、implementation approval ではない。

## 16. 今回の範囲外

Phase B77-10 では次を扱わない。

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
- recovery workflow
- auto-fix workflow
- package / lock file change
- Supabase schema change

この document は、governance semantic graph semantic convergence visualization の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
