# Governance Semantic Graph View Mode Design

Phase B77-05 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design を前提に、将来 graph visualization で使う view mode を整理するための design document である。

今回は visualization architecture documentation phase であり、graph rendering implementation、React implementation、Cytoscape / D3 / Mermaid implementation、API implementation、DB implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI は扱わない。

## 1. このドキュメントの目的

governance semantic graph view mode design の目的は、semantic graph を用途別 view として整理し、operator / reviewer / governance observer が必要な意味領域を安全に把握できるようにすることである。

この design が整理するもの:

- graph view mode
- semantic graph を用途別に見るための表示単位
- semantic graph readability 向上
- semantic density control
- operational / governance / lifecycle / collapse / convergence / survivability / maintainability / evolvability view
- read-only observability view boundary
- graph density control / filtering / readability の前提

この design が整理しないもの:

- execution workflow view
- workflow transition view
- execution routing view
- graph rendering implementation
- graph interaction による mutation

view mode は read-only observability view である。view は「どの意味領域を表示するか」を選ぶためのものであり、「どの処理を実行するか」を選ぶものではない。

## 2. View Mode Boundary

view mode は次の性質を持つ。

- read-only
- observability only
- semantic interpretation view
- governance metadata visualization view

view mode は次を実行しない。

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

- view switching は workflow transition ではない。
- view selection は execution routing しない。
- graph view interaction で mutation しない。
- node click / edge click / view mode switch で execution しない。
- compare endpoint は `GET` only として維持する。
- view mode は operation queue、approval route、repair route を意味しない。
- view visibility は source of truth confirmation ではない。

view、filter、selection、hover、expand は、すべて read-only governance metadata の見え方である。view を切り替えても、承認、修正、再構築、同期、再試行、現場作業指示を意味しない。

## 3. Governance Semantic Graph View Mode 全体像

将来 visualization する場合、governance semantic graph は以下の view mode に分けて読める。

- overview view: graph 全体像、critical / unavailable / collapsed、top-level maintainability / evolvability を短く把握する。
- operational view: operator / owner / operational review の読み方を把握する。
- governance view: posture、disposition、retention、audit trail、explainability、reasoning coherence を把握する。
- lifecycle view: drift、convergence、resilience、boundary、recoverability、continuity を把握する。
- collapse propagation view: collapse path と downstream risk を safety-first に把握する。
- convergence propagation view: stabilization path と recovery / continuity の読み方を把握する。
- survivability view: degradation tolerance、survivability、sustainability を把握する。
- maintainability view: sustainability、maintainability を中心に long-term maintenance viability を把握する。
- evolvability view: maintainability、evolvability を中心に future extension safety を把握する。
- evidence / confidence support view: confidence、freshness、truth aggregation quality、evidence strength の支援関係を把握する。
- audit / explainability view: audit trail、explainability、reasoning coherence、reason / source / signals を把握する。
- boundary / recoverability view: integrity boundary、recoverability、observability continuity を把握する。

これらの view mode は semantic observability の表示単位であり、execution UI ではない。

## 4. Overview View

overview view の目的:

- semantic graph 全体像を短時間で把握する。
- critical / unavailable / collapsed を早期に把握する。
- optimistic semantics を過度表示しない。
- graph density を抑える。
- top-level governance state と long-term viability を俯瞰する。

表示対象例:

- summary semantics
- highest risk / broken path
- current governance state
- semantic lifecycle status
- top-level survivability / sustainability
- top-level maintainability / evolvability
- unavailable / broken / collapsed / outside boundary / nonrecoverable

表示方針:

- summary first とする。
- collapse path がある場合は stable path より優先して見せる。
- positive state は subdued positive として扱う。
- detail は hover / expand に回す。

overview view は status dashboard であり、execution dashboard ではない。

## 5. Operational View

operational view は、operator や owner が compare result をどう読めるかを扱う。

対象 semantics:

- severity
- review readiness
- escalation readiness
- operational priority
- operator guidance
- operator message
- operator summary
- operator timeline
- operational impact
- operational attention
- decision readiness

目的:

- operational observability を支える。
- human review support として短い説明、時系列、注意度を整理する。
- operator interpretation support として impact / attention / decision readiness を表示する。
- operational caveat を safe wording で読めるようにする。

注意:

- action button / execution workflow ではない。
- guidance は実行指示ではなく read-only wording である。
- decision readiness は decision execution ではない。
- escalation readiness は escalation workflow の開始ではない。

## 6. Governance View

governance view は、compare result を governance / audit / explainability / reasoning の観点でどう読めるかを扱う。

対象 semantics:

- governance posture
- governance disposition
- governance retention
- governance audit trail
- governance explainability
- governance reasoning coherence

目的:

- governance interpretation を支える。
- auditability を把握する。
- explainability を把握する。
- reasoning consistency / contradiction / limitation を把握する。
- reason / source / signals の関係を読みやすくする。

注意:

- governance approval workflow ではない。
- retention / disposition は queue execution ではない。
- audit trail は audit execution ではない。
- explainability は approval ではない。

## 7. Lifecycle View

lifecycle view は、semantic governance が drift しているか、収束しているか、境界内で維持されているか、回復可能か、継続して観測可能かを扱う。

対象 semantics:

- semantic drift
- semantic convergence
- semantic resilience
- semantic integrity boundary
- semantic recoverability
- semantic observability continuity

目的:

- lifecycle state を把握する。
- semantic degradation / recovery / continuity を把握する。
- boundary crossing / outside boundary を把握する。
- collapse と convergence の前段状態を確認する。

注意:

- lifecycle state machine ではない。
- recovery execution ではない。
- boundary crossing は repair command ではない。
- continuity は monitoring orchestration ではない。

## 8. Collapse Propagation View

collapse propagation view は、critical semantics が downstream semantics を安全側へ倒す流れを把握するための view である。

対象 flow:

```text
contradictory reasoning
↓
drifting semantics
↓
collapsed resilience
↓
outside integrity boundary
↓
nonrecoverable semantics
↓
broken continuity
↓
unsustainable semantics
↓
unmaintainable semantics
↓
unevolvable semantics
```

目的:

- semantic collapse path を可視化する。
- downstream risk を把握する。
- safety-first priority display を行う。
- unavailable / broken / collapsed / outside boundary / nonrecoverable を見落としにくくする。

注意:

- collapse view は remediation workflow ではない。
- graph interaction から correction / rebuild / replay しない。
- collapse path は repair route ではない。
- critical edge は execution priority ではない。

## 9. Convergence Propagation View

convergence propagation view は、partial / degraded な signal が安定方向へどう読めるかを把握するための view である。

対象 flow:

```text
partial coherence
↓
slight drift
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

目的:

- semantic stabilization path を把握する。
- convergence / recovery / continuity を把握する。
- positive path を表示するが optimistic に過度強調しない。
- stable direction の前提 caveat を確認する。

注意:

- convergence view は auto-fix / recovery execution ではない。
- resilient / recoverable / evolvable は execution readiness ではない。
- positive path は correctness guarantee ではない。

## 10. Survivability View

survivability view は、degraded / critical state 下で semantic governance がどこまで読み続けられるかを扱う。

対象 semantics:

- semantic degradation tolerance
- semantic survivability
- semantic sustainability

目的:

- degradation をどこまで吸収できるかを把握する。
- collapse 下でも semantic governance が生存可能かを把握する。
- long-term viability を把握する。
- survivability caveat が sustainability へどう伝わるかを読む。

注意:

- survivability は execution readiness ではない。
- degradation tolerance は degradation execution ではない。
- sustainability は lifecycle execution ではない。

## 11. Maintainability / Evolvability View

maintainability / evolvability view は、semantic governance を長期的に保守・追跡・拡張できるかを扱う。

対象 semantics:

- semantic sustainability
- semantic maintainability
- semantic evolvability

目的:

- long-term governance maintenance を把握する。
- future extension safety を把握する。
- semantic governance の保守・拡張可能性を把握する。
- sustainability caveat が maintainability / evolvability へどう伝わるかを読む。

注意:

- evolvability は実装開始許可ではない。
- maintainability は maintenance workflow ではない。
- sustainable / maintainable / evolvable は automation permission ではない。

## 12. Evidence / Confidence Support View

evidence / confidence support view は、downstream semantics を支える根拠や観測品質を確認するための view である。

対象 semantics:

- compare confidence
- projection freshness
- truth aggregation quality
- compare evidence strength

目的:

- semantics を支える根拠を確認する。
- confidence / evidence / freshness の support relationship を確認する。
- downstream semantics の信頼性と caveat を把握する。
- unavailable / weak / stale / partial の影響を見落としにくくする。

注意:

- evidence support は correction trigger ではない。
- confidence high は safe to execute ではない。
- freshness current は rebuild 不要の保証ではない。
- truth aggregation quality は source of truth completeness guarantee ではない。

## 13. Audit / Explainability View

audit / explainability view は、governance semantics が後から説明可能か、audit trace を辿れるか、reasoning chain が coherent かを扱う。

対象 semantics:

- governance audit trail
- governance explainability
- reasoning coherence
- reason / source / signals

目的:

- 後から説明可能かを把握する。
- audit trace があるかを把握する。
- reasoning chain が coherent かを把握する。
- contradictory reasoning や weak explainability を早期に見つける。

注意:

- audit view は audit execution ではない。
- explainability は approval ではない。
- reasoning coherence は truth guarantee ではない。
- reason / source / signals は correction command ではない。

## 14. Boundary / Recoverability View

boundary / recoverability view は、semantic interpretation が安全境界内にあるか、境界を越えた場合に review 上 recover 可能か、observability が継続しているかを扱う。

対象 semantics:

- semantic integrity boundary
- semantic recoverability
- semantic observability continuity

目的:

- 安全解釈境界を把握する。
- boundary crossing / outside boundary を把握する。
- recoverability / continuity を把握する。
- outside boundary から nonrecoverable / broken continuity への流れを確認する。

注意:

- recoverability view は recovery execution ではない。
- boundary view は repair route ではない。
- continuity view は monitoring execution ではない。

## 15. View Switching / Filtering Model

view switching / filtering は、semantic graph の表示密度を制御し、必要な context を安全に読むための observability mechanism である。

方針:

- view switch は observability filter である。
- view switch は workflow transition ではない。
- view switch で `POST` しない。
- view switch で mutation しない。
- view switch は local UI state で足りる想定とする。
- view mode は graph density control に利用する。
- view selection は operation route の選択ではない。
- node / edge detail は hover / expand で表示する。

view switching は「何を見るか」を変えるだけであり、「何を実行するか」を変えない。

## 16. View Mode Readability Policy

view mode readability は、semantic graph が大きくなっても user が重要 signal、caveat、read-only boundary を誤読しないようにするための方針である。

方針:

- unavailable / broken / collapsed を優先表示する。
- collapse path を優先する。
- optimistic semantics を過度表示しない。
- positive path は補助的に表示する。
- summary first とする。
- detail は hover / expand に置く。
- reason / source / signals grouping を維持する。
- B76-22 readability refinement を尊重する。
- view ごとに primary display と supporting display を分ける。
- execution instruction に見える wording を避ける。

view mode は readability と safety のための display model であり、workflow model ではない。

## 17. 将来 Visualization Implementation に進む前提条件

将来 graph visualization implementation に進む場合は、次の前提を満たす必要がある。

- graph visualization architecture が安定していること。
- node taxonomy / edge taxonomy / layering が固定されていること。
- view mode が固定されていること。
- graph cluster / filtering / density control model が整理されていること。
- graph implementation は別 phase とすること。
- graph view interaction を execution workflow にしないこと。
- compare endpoint を mutation 化しないこと。
- compare endpoint は `GET` only として維持すること。
- execution layer は別 endpoint / 別 workflow として設計すること。

view mode design は visualization implementation の前提整理であり、implementation approval ではない。

## 18. 今回の範囲外

Phase B77-05 では次を扱わない。

- graph rendering implementation
- React implementation
- Cytoscape / D3 / Mermaid implementation
- API implementation
- DB implementation
- mutation
- workflow execution
- rebuild / replay / correction / sync
- actual graph UI
- package / lock file change
- Supabase schema change
- Edge Function change

この document は、governance semantic graph view mode の architecture / boundary / filtering / readability 整理であり、実装差分や runtime behavior を追加しない。
