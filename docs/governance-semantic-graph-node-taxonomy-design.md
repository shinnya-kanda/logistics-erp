# Governance Semantic Graph Node Taxonomy Design

Phase B77-02 documentation.

このドキュメントは、B76-10 から B76-50 の Inventory Integrity compare governance semantics chain と、B77-01 の governance semantic graph visualization design を前提に、将来 graph visualization で使う node taxonomy を整理するための design document である。

今回は visualization architecture documentation phase であり、graph rendering implementation、React implementation、Cytoscape / D3 / Mermaid implementation、API implementation、DB implementation、mutation、workflow execution、rebuild / replay / correction / sync は扱わない。

## 1. このドキュメントの目的

governance semantic graph node taxonomy design の目的は、semantic graph node を安全に分類し、将来 visualization する場合の clustering / filtering / density control の前提を揃えることである。

この taxonomy が整理するもの:

- governance semantic graph node category
- semantic lifecycle graph の分類
- operational / governance / survivability / evolvability layer の分類
- graph clustering / filtering / visualization grouping の前提
- read-only observability node boundary

この taxonomy が整理しないもの:

- execution workflow taxonomy
- workflow state machine
- execution routing
- graph interaction による mutation
- graph rendering implementation

node taxonomy は read-only observability taxonomy である。node category は「どう読めるか」を分類するためのものであり、「何を実行するか」を分類しない。

## 2. Taxonomy Boundary

taxonomy は次の性質を持つ。

- read-only
- observability only
- semantic interpretation classification
- governance metadata categorization

taxonomy は次を実行しない。

- correction
- rebuild
- replay
- mutation
- execution workflow
- orchestration
- approval
- retry
- repair

追加 boundary:

- node taxonomy は workflow state machine ではない。
- node taxonomy は execution routing しない。
- node category に execution 意味を持たせない。
- graph node click から mutation しない。
- node category は operation queue、approval route、repair route を意味しない。
- compare endpoint は `GET` only として維持する。

taxonomy は graph の読みやすさ、semantic grouping、observability filtering のために使う。分類があることは、実行可能な処理や優先実行順があることを意味しない。

## 3. Governance Semantic Graph Node Taxonomy 全体像

将来 visualization する場合、node は以下の category に分類できる。

- compare base semantics: compare 差異の起点、分類、重大度、review / escalation の基本解釈を扱う。
- operational semantics: operator / owner / operational review の読み方を扱う。
- governance semantics: governance posture、auditability、explainability、retention などの管理上の読み方を扱う。
- lifecycle semantics: drift、convergence、resilience、recoverability、continuity など semantic lifecycle の状態を扱う。
- semantic stability semantics: interpretation stability、reasoning coherence、semantic drift / convergence を中心に、意味が安定して読めるかを扱う。
- semantic survivability semantics: degradation 下でも semantic governance を読み続けられるかを扱う。
- semantic sustainability semantics: 長期運用下で semantic governance を持続可能に読めるかを扱う。
- semantic maintainability semantics: 長期運用時に semantic governance を保守・追跡しやすいかを扱う。
- semantic evolvability semantics: 将来の拡張・変更・進化が安全に読めるかを扱う。
- semantic boundary semantics: integrity boundary、execution boundary、truth / projection / compare boundary を扱う。
- semantic observability semantics: freshness、evidence、confidence、continuity など観測品質を扱う。
- semantic explainability semantics: explainability、audit trail、reason / source / signals の読みやすさを扱う。
- semantic reasoning semantics: reasoning coherence、contradiction、partial coherence など reasoning の整合性を扱う。
- semantic degradation semantics: limited、fragile、collapsed、broken、intolerable など安全側 signal を扱う。
- semantic convergence semantics: converging、stable convergence、resilient、recoverable など安定方向の読み方を扱う。

これらの category は semantic interpretation grouping であり、execution grouping ではない。

## 4. Compare Base Semantics Taxonomy

compare base semantics は、truth source compare から governance chain が始まる最初の読み方を分類する。

主な node:

- classification
- severity
- review readiness
- escalation readiness
- operational priority
- ownership
- owner actionability

役割:

- compare 基本解釈を整理する。
- quantity mismatch、stale projection、unavailable projection などの読み方を分ける。
- operational routing metadata として見える情報を、実行経路ではなく review / observability の補助として扱う。
- governance escalation metadata を表示するが、escalation execution は開始しない。

この category は compare result の入口であり、source of truth error の確定や correction requirement を意味しない。

## 5. Operational Semantics Taxonomy

operational semantics は、operator や owner が compare result をどう読めるかを分類する。

主な node:

- operator guidance
- operator message
- operator summary
- operator timeline
- operational impact
- operational attention
- decision readiness

役割:

- operational observability を支える。
- human review support として短い説明、時系列、注意度を整理する。
- operational interpretation support として impact / attention / decision readiness を表示する。
- operator-facing wording を safe wording に揃える。

この category は現場作業指示、通知、担当割当、approval mutation を意味しない。decision readiness は decision execution ではない。

## 6. Governance Semantics Taxonomy

governance semantics は、compare result を governance / audit / explainability の観点でどう読めるかを分類する。

主な node:

- governance posture
- governance disposition
- governance retention
- governance audit trail
- governance explainability

役割:

- governance interpretation を支える。
- auditability と traceability を整理する。
- explainability と reason / source / signals の読み方を支える。
- governance lifecycle support として observe / review / escalate などの表示上の扱いを整理する。

この category は audit workflow、retention execution、approval route、assignment route ではない。posture / disposition は governance metadata であり、operation state ではない。

## 7. Semantic Lifecycle Taxonomy

semantic lifecycle taxonomy は、semantic governance が drift しているか、収束しているか、境界内で維持されているか、回復可能か、継続して観測可能かを分類する。

主な node:

- semantic drift
- semantic convergence
- semantic resilience
- semantic integrity boundary
- semantic recoverability
- semantic observability continuity

役割:

- semantic lifecycle tracking を支える。
- semantic degradation tracking として drift、fragility、collapse を読めるようにする。
- semantic recovery tracking として recoverability / resilience を読めるようにする。
- semantic continuity tracking として observability が継続しているかを読めるようにする。
- boundary crossing / outside boundary を safety-first に強調する。

この category は recovery execution、boundary repair、monitoring orchestration を意味しない。

## 8. Survivability / Sustainability Taxonomy

survivability / sustainability taxonomy は、degraded state や長期運用下で governance semantics が生存、持続、保守、進化できるかを分類する。

主な node:

- semantic degradation tolerance
- semantic survivability
- semantic sustainability
- semantic maintainability
- semantic evolvability

役割:

- long-term governance viability を整理する。
- semantic lifecycle survivability を示す。
- governance maintenance viability を示す。
- governance evolution viability を示す。
- critical degradation、semantic collapse、unmaintainable、unevolvable などを安全側に分類する。

この category の positive state は実行可能性ではない。sustainable、maintainable、evolvable は「観測上そう読める」状態であり、automation permission や change execution permission ではない。

## 9. Graph Cluster Model

将来 visualization する場合、graph は cluster に分けることで読みやすさと密度を制御する。

cluster 候補:

- operational cluster
- governance cluster
- lifecycle cluster
- survivability cluster
- evolvability cluster

cluster の役割:

- graph readability を高める。
- graph density control を支える。
- semantic grouping を明確にする。
- semantic filtering の単位にする。
- observability layering を分ける。
- operational layer と governance layer を混同しないようにする。

cluster は execution grouping ではなく、semantic interpretation grouping である。cluster が分かれていても、別 workflow、別 queue、別 endpoint、別 mutation path を意味しない。

## 10. Graph Filtering Model

将来 visualization する場合、filtering はユーザーが必要な semantic context を限定して読むために使う。

filter 候補:

- operational only
- governance only
- lifecycle only
- collapse chain only
- convergence chain only
- survivability only
- sustainability only
- maintainability only
- evolvability only
- unavailable / broken / collapsed only
- reason / source / signals detail

filtering の役割:

- 表示情報量を抑える。
- review 対象の semantic category を絞る。
- collapse path と convergence path を分けて読む。
- long-term semantics と immediate operational semantics を分ける。
- safety-first signal を優先して表示する。

filtering は execution routing ではなく、observability filtering である。filter を選ぶことは mutation、approval、retry、repair、workflow dispatch を意味しない。

## 11. Graph Density Control

governance semantics chain は B76-10 から B76-49 まで多層化しているため、全 node を常時表示すると読みづらくなる。graph density control は operator safety と review readability のために必要である。

密度制御の方針:

- semantic chain 全体表示は overview として扱う。
- collapse path は限定表示できるようにする。
- convergence path は限定表示できるようにする。
- unavailable / broken / collapsed / outside boundary / nonrecoverable を優先表示する。
- optimistic semantics の過度表示を避ける。
- stable / sustainable / maintainable / evolvable は subdued positive として表示する。
- reason / source / signals は必要に応じて detail 表示に回す。
- node cluster と filter を併用して readability priority を維持する。

Density control は情報表示の制御であり、処理優先度や execution scheduling ではない。

## 12. Node Severity / Importance Layering

node severity / importance layering は、semantic graph 内でどの signal に注意すべきかを safety-first に整理するための分類である。

Critical layer:

- collapsed resilience
- outside boundary
- nonrecoverable
- broken continuity
- intolerable degradation
- contradictory reasoning
- severe drift
- nonsurvivable semantics
- unsustainable semantics
- unmaintainable semantics
- unevolvable semantics

Warning layer:

- drifting
- fragile resilience
- limited tolerance
- difficult recovery
- interrupted continuity
- critical survivability
- fragile sustainability
- fragile maintainability
- fragile evolvability

Conditional layer:

- partial coherence
- slight drift
- converging semantics
- near boundary
- partially recoverable
- partially continuous
- degraded survivability
- conditionally sustainable
- conditionally maintainable
- conditionally evolvable

Stable layer:

- resilient
- inside boundary
- recoverable
- continuous observability
- survivable
- sustainable
- maintainable
- evolvable

Layering 方針:

- optimistic semantics を過度強調しない。
- safety-first coloring を優先する。
- unavailable / broken / collapsed は stable より視認性を高くする。
- stable layer は correctness guarantee や execution permission に見せない。
- importance は review attention の補助であり、execution priority ではない。

## 13. 将来 Visualization Implementation に進む前提条件

将来 graph visualization implementation に進む場合は、次の前提を満たす必要がある。

- governance semantics architecture が安定していること。
- taxonomy が固定されていること。
- graph cluster / filtering model が整理されていること。
- lifecycle semantics が安定していること。
- graph node / edge model が observability object / semantic dependency として定義されていること。
- graph implementation は別 phase とすること。
- graph interaction は execution workflow にしないこと。
- graph node を execution object にしないこと。
- compare endpoint を mutation 化しないこと。
- compare endpoint は `GET` only として維持すること。
- execution layer が必要な場合は別 endpoint / 別 workflow として設計すること。

taxonomy は visualization implementation の前提整理であり、implementation approval ではない。

## 14. 今回の範囲外

Phase B77-02 では次を扱わない。

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

この document は、governance semantic graph node taxonomy の architecture / boundary / grouping 整理であり、実装差分や runtime behavior を追加しない。
