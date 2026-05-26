# Governance Semantic Graph Edge Taxonomy Design

Phase B77-03 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 governance semantic graph visualization design、B77-02 governance semantic graph node taxonomy design を前提に、将来 graph visualization で使う edge taxonomy を整理するための design document である。

今回は visualization architecture documentation phase であり、graph rendering implementation、React implementation、Cytoscape / D3 / Mermaid implementation、API implementation、DB implementation、mutation、workflow execution、rebuild / replay / correction / sync は扱わない。

## 1. このドキュメントの目的

governance semantic graph edge taxonomy design の目的は、semantic graph の node 間にある関係を read-only observability の edge として分類し、semantic dependency / propagation / lifecycle / collapse / convergence を安全に読めるようにすることである。

この taxonomy が整理するもの:

- semantic dependency edge
- semantic propagation edge
- semantic lifecycle edge
- semantic collapse propagation
- semantic convergence propagation
- survivability / sustainability / maintainability / evolvability propagation
- observability support edge
- read-only observability edge boundary

この taxonomy が整理しないもの:

- execution workflow edge
- workflow routing
- execution chain
- graph interaction による mutation
- retry / repair / orchestration route

edge taxonomy は read-only observability edge taxonomy である。edge は「どの semantics がどの interpretation を支えるか、制限するか、伝播させるか」を示し、「どの処理を実行するか」を示さない。

## 2. Edge Taxonomy Boundary

edge taxonomy は次の性質を持つ。

- read-only
- observability only
- semantic interpretation dependency
- governance metadata propagation

edge taxonomy は次を実行しない。

- correction
- rebuild
- replay
- mutation
- execution workflow
- orchestration
- approval
- retry
- repair
- sync

追加 boundary:

- edge は workflow routing しない。
- edge は execution chain ではない。
- edge traversal で mutation しない。
- graph edge click で execution しない。
- compare endpoint は `GET` only として維持する。
- edge direction は operation order ではない。
- edge category は approval route、repair route、retry route を意味しない。

edge は semantic interpretation dependency を読むための表示 metadata であり、実行可能性、正しさ保証、承認完了、現場作業指示を意味しない。

## 3. Governance Semantic Graph Edge Taxonomy 全体像

将来 visualization する場合、edge は以下の category に分類できる。

- semantic dependency edge: 前段 semantics が後段 semantics の読み方に影響する関係を示す。
- semantic escalation edge: severity / risk / attention などが governance posture や disposition に伝わる読み方を示す。
- semantic degradation edge: drift、fragility、limited state が後段の degradation に伝わる関係を示す。
- semantic collapse edge: collapsed、broken、outside、nonrecoverable など critical state が下流 collapse を強める関係を示す。
- semantic convergence edge: partial / converging / stable state が安定方向へ読める関係を示す。
- semantic recovery edge: resilience、recoverability、continuity へつながる回復可能性の読み方を示す。
- semantic continuity edge: observability continuity が survivability / sustainability の前提になる関係を示す。
- semantic survivability propagation edge: degradation tolerance から survivability へ伝播する関係を示す。
- semantic sustainability propagation edge: survivability から sustainability へ長期 viability が伝播する関係を示す。
- semantic maintainability propagation edge: sustainability から maintainability へ保守可能性が伝播する関係を示す。
- semantic evolvability propagation edge: maintainability から evolvability へ将来拡張可能性が伝播する関係を示す。
- semantic evidence support edge: evidence quality が confidence、reasoning、auditability を支える関係を示す。
- semantic explainability support edge: explainability が reasoning coherence と lifecycle readability を支える関係を示す。
- semantic auditability support edge: audit trail が explainability、retention、governance interpretation を支える関係を示す。
- semantic confidence support edge: confidence が convergence、risk、decision readiness の読み方を支える関係を示す。

これらの edge category は semantic interpretation dependency であり、workflow dependency ではない。

## 4. Semantic Dependency Edge Taxonomy

semantic dependency edge は、ある semantics が別の semantics の解釈を支える、制限する、または caveat を渡す関係を表す。

例:

```text
confidence
→ explainability

evidence
→ reasoning coherence

freshness
→ confidence

reasoning coherence
→ convergence
```

役割:

- semantic dependency を明示する。
- semantic interpretation dependency を可視化する。
- governance meaning dependency を追跡する。
- reason / source / signals の由来を読みやすくする。
- upstream caveat が downstream semantics にどう影響するかを示す。

dependency edge は causal proof ではない。edge があることは、上流 node が下流 node を実行、確定、承認することを意味しない。

## 5. Semantic Degradation / Collapse Edge Taxonomy

semantic degradation / collapse edge は、弱い signal や破綻 signal が downstream semantics を安全側へ倒す伝播を表す。

例:

```text
drift
→ fragile resilience

fragile resilience
→ outside integrity boundary

outside integrity boundary
→ nonrecoverable

nonrecoverable
→ broken continuity

broken continuity
→ unsustainable

unsustainable
→ unmaintainable

unmaintainable
→ unevolvable
```

役割:

- semantic collapse propagation を示す。
- lifecycle degradation propagation を示す。
- governance instability propagation を示す。
- unavailable / broken / collapsed / outside / nonrecoverable の downstream impact を強調する。
- optimistic interpretation を抑制し、安全側評価を支える。

collapse edge は repair route ではない。critical propagation が見えても、correction、rebuild、replay、sync、repair、orchestration は開始しない。

## 6. Semantic Convergence / Recovery Edge Taxonomy

semantic convergence / recovery edge は、partial / degraded な signal が安定方向へ読めるときの semantic propagation を表す。

例:

```text
partial coherence
→ converging semantics

converging semantics
→ stable convergence

stable convergence
→ resilient semantics

resilient semantics
→ recoverable semantics

recoverable semantics
→ continuous observability

continuous observability
→ sustainable semantics

sustainable semantics
→ maintainable semantics

maintainable semantics
→ evolvable semantics
```

役割:

- semantic stabilization propagation を示す。
- lifecycle recovery propagation を示す。
- governance recovery propagation を示す。
- convergence が resilience / recoverability / continuity を支える読み方を示す。
- positive path を「実行できる」ではなく「安定方向に読める」として整理する。

convergence edge は automation permission ではない。stable convergence、resilient、recoverable、evolvable であっても execution eligibility は意味しない。

## 7. Semantic Survivability Propagation Taxonomy

semantic survivability propagation edge は、degradation tolerance から long-term governance viability へつながる後段 semantics の関係を表す。

例:

```text
degradation tolerance
→ survivability

survivability
→ sustainability

sustainability
→ maintainability

maintainability
→ evolvability
```

役割:

- long-term governance viability propagation を示す。
- governance lifecycle survivability propagation を示す。
- governance continuity propagation を示す。
- degraded / critical / fragile state が long-term semantics へどう caveat を渡すかを示す。
- maintainability と evolvability が前段 survivability / sustainability に依存することを明確にする。

この propagation は実行計画ではない。evolvability が高く見える場合でも、semantic change execution や workflow migration を開始しない。

## 8. Semantic Observability Support Edge Taxonomy

semantic observability support edge は、auditability、explainability、confidence、freshness、evidence quality が lifecycle stabilization を支える関係を表す。

例:

```text
audit trail
→ explainability

explainability
→ reasoning coherence

reasoning coherence
→ resilience

confidence
→ convergence

freshness
→ truth quality

evidence quality
→ auditability
```

役割:

- observability support を示す。
- governance interpretability support を示す。
- lifecycle stabilization support を示す。
- reason / source / signals が downstream semantics をどう支えるかを整理する。
- audit trail / explainability / reasoning coherence の不足が lifecycle caveat になることを示す。

support edge は correctness guarantee ではない。evidence strong、confidence high、audit traceable であっても source of truth confirmation や execution permission ではない。

## 9. Graph Edge Directionality

edge direction は、semantic interpretation の流れを示す。

direction の種類:

- upstream semantics: downstream semantics の前提や caveat を供給する。
- downstream semantics: upstream signal を統合して高次の読み方を示す。
- degradation direction: drift / fragile / collapsed などが下流 risk を強める方向を示す。
- recovery direction: convergence / resilience / recoverability などが安定方向に読める流れを示す。
- survivability propagation direction: degradation tolerance から survivability、sustainability、maintainability、evolvability へ caveat が伝わる方向を示す。
- convergence direction: partial coherence から stable convergence、resilience、recoverability、continuity へ向かう読み方を示す。

重要な boundary:

- direction は workflow order ではない。
- direction は execution order ではない。
- direction は operation dependency ではない。
- direction は semantic interpretation direction である。
- direction を辿っても mutation、approval、retry、repair、sync は行わない。

## 10. Edge Severity / Importance Layering

edge severity / importance layering は、semantic propagation の注意度を safety-first に整理するための分類である。

Critical propagation edge:

- collapse propagation
- outside boundary propagation
- nonrecoverable propagation
- broken continuity propagation
- intolerable degradation propagation
- unmaintainable to unevolvable propagation

Warning propagation edge:

- drift propagation
- fragile resilience propagation
- difficult recovery propagation
- interrupted continuity propagation
- limited tolerance propagation
- fragile maintainability propagation

Stable propagation edge:

- convergence propagation
- resilience propagation
- recoverability propagation
- continuity propagation
- sustainability propagation
- maintainability propagation
- evolvability propagation

Layering 方針:

- unavailable / broken / collapsed を優先表示する。
- optimistic propagation を過度強調しない。
- safety-first coloring を優先する。
- stable propagation edge は subdued positive として扱う。
- critical edge は review attention の補助であり、execution priority ではない。

## 11. Graph Filtering / Traversal Model

edge filtering / traversal は、semantic graph の関係を必要な観点だけに絞って読むための observability mechanism である。

filter / traversal 候補:

- collapse propagation only
- convergence propagation only
- survivability propagation only
- governance dependency only
- lifecycle dependency only
- observability support only
- confidence / evidence support only
- auditability / explainability support only
- critical propagation only
- warning propagation only

重要な boundary:

- traversal は execution traversal ではない。
- traversal は observability traversal / semantic interpretation traversal である。
- traversal は workflow dispatch ではない。
- edge traversal は mutation、approval、retry、repair、sync を開始しない。
- filter selection は review view の変更であり、operation route の選択ではない。

Traversal は「どの semantics がどの caveat を下流へ渡しているか」を読むために使う。

## 12. Graph Density Control for Edges

governance semantics chain が増えるほど edge 数は増え、すべての relation を常時表示すると semantic spaghetti になりやすい。edge density control は readability と semantic safety のために必要である。

密度制御の方針:

- edge 数爆発への対策として cluster 単位で edge を折りたたむ。
- collapse edge を優先表示する。
- critical propagation edge を優先表示する。
- convergence edge は必要な view で限定表示する。
- stable propagation の過密化を避ける。
- support edge は hover / detail に退避できるようにする。
- cross-cluster edge は summary edge と detail edge に分ける。
- readability priority を維持する。
- semantic spaghetti を避ける。

Density control は表示量の調整であり、edge の実行順、処理優先度、workflow scheduling ではない。

## 13. 将来 Visualization Implementation に進む前提条件

将来 graph visualization implementation に進む場合は、次の前提を満たす必要がある。

- governance semantics architecture が安定していること。
- node taxonomy が固定されていること。
- edge taxonomy が固定されていること。
- lifecycle semantics が安定していること。
- graph cluster / filtering / density control model が整理されていること。
- graph implementation は別 phase とすること。
- graph interaction を execution workflow にしないこと。
- edge traversal を workflow execution にしないこと。
- compare endpoint を mutation 化しないこと。
- compare endpoint は `GET` only として維持すること。
- execution layer が必要な場合は別 endpoint / 別 workflow として設計すること。

edge taxonomy は visualization implementation の前提整理であり、implementation approval ではない。

## 14. 今回の範囲外

Phase B77-03 では次を扱わない。

- graph rendering implementation
- React implementation
- Cytoscape / D3 / Mermaid implementation
- DB implementation
- API implementation
- mutation
- workflow execution
- rebuild / replay / correction / sync
- package / lock file change
- Supabase schema change
- Edge Function change

この document は、governance semantic graph edge taxonomy の architecture / boundary / propagation 整理であり、実装差分や runtime behavior を追加しない。
