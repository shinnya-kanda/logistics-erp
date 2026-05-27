# Governance Semantic Graph Visualization Layering Design

Phase B77-04 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy を前提に、将来 graph visualization で使う layering model を整理するための design document である。

今回は visualization architecture documentation phase であり、graph rendering implementation、React implementation、Cytoscape / D3 / Mermaid implementation、API implementation、DB implementation、mutation、workflow execution、rebuild / replay / correction / sync は扱わない。

## 1. このドキュメントの目的

governance semantic graph visualization layering design の目的は、B76 系 governance semantics chain を layer 単位で読みやすく分け、semantic graph readability と semantic density control を両立することである。

この design が整理するもの:

- layered observability visualization
- governance semantic graph を layer 単位で可視化する目的
- operational / governance / lifecycle / survivability / evolvability layer の分離
- semantic graph readability 向上
- semantic density control
- graph density reduction layering
- read-only observability visualization boundary

この design が整理しないもの:

- execution workflow layering
- workflow transition
- execution routing
- graph rendering implementation
- graph interaction による mutation

layering は read-only observability layering である。layer は「どの意味領域として読めるか」を分けるための表示構造であり、「どの処理段階を実行するか」を示さない。

## 2. Visualization Layering Boundary

layering は次の性質を持つ。

- read-only
- observability only
- semantic interpretation layering
- governance metadata visualization layering

layering は次を実行しない。

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

- layer transition は workflow transition ではない。
- layer navigation は execution routing しない。
- graph layer interaction で mutation しない。
- compare endpoint は `GET` only として維持する。
- layer selection は operation queue、approval route、repair route を意味しない。
- layer visibility は source of truth confirmation ではない。

layer、cluster、filter、navigation、selection は、すべて read-only governance metadata の見え方である。表示が上位 layer に移っても、承認、修正、再構築、同期、再試行、現場作業指示を意味しない。

## 3. Governance Semantic Graph Layer 全体像

将来 visualization する場合、governance semantic graph は以下の layer に分けて読める。

- compare base layer: truth compare から分類、重大度、review / escalation までの基本解釈を扱う。
- operational interpretation layer: operator / owner / operational review の読み方を扱う。
- governance interpretation layer: posture、disposition、retention、audit trail、explainability、reasoning coherence を扱う。
- semantic lifecycle layer: drift、convergence、resilience、integrity boundary、recoverability、continuity を扱う。
- semantic stability layer: interpretation stability、reasoning coherence、convergence、resilience を中心に意味の安定性を扱う。
- semantic survivability layer: degradation tolerance、survivability、sustainability を中心に semantic governance が読み続けられるかを扱う。
- semantic sustainability layer: 長期運用下で semantic governance を持続可能に読めるかを扱う。
- semantic maintainability layer: 長期運用時に semantic governance を保守・追跡しやすいかを扱う。
- semantic evolvability layer: 将来の拡張・変更・進化が安全に読めるかを扱う。
- semantic observability support layer: confidence、evidence、freshness、truth quality、explainability、auditability など横断支援 semantics を扱う。

これらの layer は semantic interpretation layering であり、execution layer ではない。

## 4. Compare Base Layer

compare base layer は、Inventory Integrity compare の起点となる baseline interpretation を扱う。

主な semantics:

- classification
- severity
- review readiness
- escalation readiness
- operational priority
- ownership
- owner actionability

役割:

- compare baseline interpretation を示す。
- quantity mismatch、stale projection、unavailable projection などの基本分類を表示する。
- operational routing metadata として見える情報を、実行経路ではなく review / observability の補助として扱う。
- governance escalation metadata を表示するが、escalation execution は開始しない。

この layer は source of truth error の確定や correction requirement を意味しない。

## 5. Operational Interpretation Layer

operational interpretation layer は、operator や owner が compare result をどう読めるかを扱う。

主な semantics:

- operator guidance
- operator message
- operator summary
- operator timeline
- operational impact
- operational attention
- decision readiness

役割:

- operational observability を支える。
- human interpretation support として短い説明、時系列、注意度を整理する。
- operational review support として impact / attention / decision readiness を表示する。
- operator-facing wording を safe wording に揃える。

この layer は現場作業指示、通知、担当割当、approval mutation を意味しない。decision readiness は decision execution ではない。

## 6. Governance Interpretation Layer

governance interpretation layer は、compare result を governance / audit / explainability / reasoning の観点でどう読めるかを扱う。

主な semantics:

- governance posture
- governance disposition
- governance retention
- governance audit trail
- governance explainability
- governance reasoning coherence

役割:

- governance interpretation を支える。
- governance explainability と auditability を整理する。
- reason / source / signals の読みやすさを支える。
- governance reasoning support として coherence / contradiction / limitation を読めるようにする。
- observe / review / escalate などの表示上の扱いを整理する。

この layer は audit workflow、retention execution、approval route、assignment route ではない。posture / disposition は governance metadata であり、operation state ではない。

## 7. Semantic Lifecycle Layer

semantic lifecycle layer は、semantic governance が drift しているか、収束しているか、境界内で維持されているか、回復可能か、継続して観測可能かを扱う。

主な semantics:

- semantic drift
- semantic convergence
- semantic resilience
- semantic integrity boundary
- semantic recoverability
- semantic observability continuity

役割:

- lifecycle tracking を支える。
- degradation tracking として drift、fragility、collapse を読めるようにする。
- recovery tracking として recoverability / resilience を読めるようにする。
- continuity tracking として observability が継続しているかを読めるようにする。
- boundary crossing / outside boundary を safety-first に強調する。

この layer は recovery execution、boundary repair、monitoring orchestration を意味しない。

## 8. Survivability / Sustainability / Evolvability Layer

survivability / sustainability / evolvability layer は、degraded state や長期運用下で governance semantics が生存、持続、保守、進化できるかを扱う。

主な semantics:

- semantic degradation tolerance
- semantic survivability
- semantic sustainability
- semantic maintainability
- semantic evolvability

役割:

- long-term governance viability を示す。
- survivability propagation を示す。
- maintenance viability を示す。
- governance evolution viability を示す。
- critical degradation、semantic collapse、unmaintainable、unevolvable などを安全側に表示する。

この layer の positive state は実行可能性ではない。survivable、sustainable、maintainable、evolvable は「観測上そう読める」状態であり、automation permission や change execution permission ではない。

## 9. Observability Support Layer

observability support layer は、複数 layer を横断して semantic interpretation を支える supporting semantics を扱う。

主な semantics:

- confidence
- evidence strength
- freshness
- truth aggregation quality
- explainability
- auditability

役割:

- observability stabilization を支える。
- governance interpretability support を提供する。
- semantic trust support として confidence / evidence / freshness の caveat を示す。
- lifecycle、governance、survivability layer の読み方を補助する。
- reason / source / signals の説明可能性を高める。

support layer は correctness guarantee ではない。confidence high、evidence strong、freshness current、audit traceable であっても source of truth confirmation や execution permission ではない。

## 10. Layer Dependency Model

layer dependency は、上流の semantic caveat が下流の高次 semantics にどう影響するかを読むための model である。

基本 dependency:

```text
compare base
↓
operational interpretation
↓
governance interpretation
↓
semantic lifecycle
↓
survivability
↓
maintainability
↓
evolvability
```

横断 dependency:

- support layer は横断 layer として扱う。
- confidence / evidence / freshness は複数 layer を支える。
- truth aggregation quality は compare base、confidence、evidence、risk、lifecycle に caveat を渡す。
- audit trail / explainability / reasoning coherence は governance interpretation と lifecycle stability を支える。
- lifecycle collapse は survivability layer に波及する。
- survivability collapse は maintainability / evolvability に波及する。
- maintainability が fragile または unavailable の場合、evolvability も安全側に倒れる。

layer dependency は workflow order ではない。dependency を辿っても mutation、approval、retry、repair、sync は行わない。

## 11. Layer Visibility / Filtering Model

layer visibility / filtering は、必要な semantic context だけを限定して読むための observability mechanism である。

filter 候補:

- operational only
- governance only
- lifecycle only
- collapse flow only
- convergence flow only
- survivability only
- maintainability only
- evolvability only
- support layer only
- critical layer only
- unavailable / broken / collapsed only

filtering の役割:

- 表示情報量を抑える。
- review 対象の semantic layer を絞る。
- collapse flow と convergence flow を分けて読む。
- long-term semantics と immediate operational semantics を分ける。
- support layer を横断 caveat として確認しやすくする。

filtering は execution routing ではなく、observability filtering である。filter selection は view の変更であり、operation route の選択ではない。

## 12. Graph Readability Layering

graph readability layering は、semantic density を layer で制御し、semantic galaxy 化を避けるための方針である。

方針:

- semantic density を layer で制御する。
- collapse chain を優先表示する。
- critical layer を優先表示する。
- optimistic semantics を過度表示しない。
- unavailable / broken / collapsed / outside boundary / nonrecoverable を強調する。
- stable / sustainable / maintainable / evolvable は subdued positive として扱う。
- reason / source / signals は必要に応じて detail 表示に回す。
- layer overview と layer detail を分ける。
- readability priority を維持する。
- semantic galaxy 化を避ける。

readability layering は表示量の制御であり、処理優先度や execution scheduling ではない。

## 13. Layer Severity / Importance Hierarchy

layer severity / importance hierarchy は、semantic graph 内でどの signal に注意すべきかを safety-first に整理するための分類である。

Critical layer:

- collapse
- broken continuity
- outside boundary
- nonrecoverable
- intolerable degradation
- collapsed resilience
- contradictory reasoning
- severe drift

Warning layer:

- drift
- fragile resilience
- limited tolerance
- difficult recovery
- interrupted continuity
- fragile sustainability
- fragile maintainability
- fragile evolvability

Stable layer:

- resilient
- inside boundary
- recoverable
- continuous observability
- survivable
- sustainable
- maintainable
- evolvable

Hierarchy 方針:

- safety-first layering を優先する。
- unavailable / broken / collapsed は stable より視認性を高くする。
- optimistic semantics の過度強調を避ける。
- stable layer は correctness guarantee や execution permission に見せない。
- importance は review attention の補助であり、execution priority ではない。

## 14. 将来 Visualization Implementation に進む前提条件

将来 graph visualization implementation に進む場合は、次の前提を満たす必要がある。

- governance semantics architecture が安定していること。
- node taxonomy が固定されていること。
- edge taxonomy が固定されていること。
- visualization layering が固定されていること。
- lifecycle semantics が安定していること。
- graph cluster / filtering / density control model が整理されていること。
- graph implementation は別 phase とすること。
- graph interaction を execution workflow にしないこと。
- layer navigation を workflow execution にしないこと。
- compare endpoint を mutation 化しないこと。
- compare endpoint は `GET` only として維持すること。
- execution layer が必要な場合は別 endpoint / 別 workflow として設計すること。

layering design は visualization implementation の前提整理であり、implementation approval ではない。

## 15. 今回の範囲外

Phase B77-04 では次を扱わない。

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

この document は、governance semantic graph visualization layering の architecture / boundary / layer separation 整理であり、実装差分や runtime behavior を追加しない。
