# Governance Semantic Graph Visualization Design

Phase B77-01 documentation.

このドキュメントは、B76-10 から B76-50 で整理した Inventory Integrity compare governance semantics chain を、将来的に semantic graph / lifecycle graph / semantic collapse flow / semantic convergence flow として可視化するための design document である。

今回は visualization architecture の documentation phase であり、graph UI implementation、React implementation、D3 / Cytoscape / Mermaid 導入、API implementation、DB implementation、mutation、execution workflow、rebuild / replay / correction / sync は扱わない。

## 1. このドキュメントの目的

governance semantic graph visualization design の目的は、Inventory Integrity compare governance semantics を、人間と Cursor が同じ構造で読み取れる graph として整理することである。

この design が扱うもの:

- Inventory Integrity compare governance semantics visualization layer
- semantic lifecycle observability
- semantic collapse flow の可視化方針
- semantic convergence flow の可視化方針
- read-only observability visualization boundary
- 将来 visualization UI に進むための前提条件

この design が扱わないもの:

- execution UI
- governance semantic state machine
- workflow state machine
- graph interaction による mutation
- compare endpoint の変更

semantic lifecycle graph は、semantic state がどのように読めるかを示す observability map であり、operation lifecycle や execution lifecycle ではない。

## 2. Visualization Boundary

visualization layer は次の性質を持つ。

- read-only
- observability only
- semantic interpretation layer
- governance metadata visualization

visualization layer は次を実行しない。

- correction
- rebuild
- replay
- sync
- mutation
- execution workflow
- approval
- retry
- repair
- orchestration

追加 boundary:

- compare endpoint は `GET` only として維持する。
- visualization layer は `POST` しない。
- graph interaction から mutation しない。
- graph node click で execution しない。
- graph edge は workflow transition ではない。
- graph state は operation state ではない。

node、edge、flow、color、hover、selection は、すべて read-only governance metadata の見え方である。表示が強調されても、承認、修正、再構築、同期、再試行、現場作業指示を意味しない。

## 3. Governance Semantic Graph 全体像

B76 semantics chain は、truth compare から始まり、operational semantics、governance semantics、semantic lifecycle semantics、survivability、maintainability、evolvability へ進む semantic dependency graph として読める。

```text
truth compare
↓
classification
↓
severity
↓
review readiness
↓
escalation readiness
↓
operational priority
↓
ownership
↓
owner actionability
↓
operator guidance
↓
operator message
↓
operator summary
↓
operator timeline
↓
confidence
↓
freshness
↓
truth aggregation quality
↓
evidence
↓
risk
↓
stability
↓
decision readiness
↓
operational impact
↓
operational attention
↓
governance posture
↓
governance disposition
↓
governance retention
↓
audit trail
↓
explainability
↓
reasoning coherence
↓
semantic drift
↓
semantic convergence
↓
semantic resilience
↓
semantic integrity boundary
↓
semantic recoverability
↓
semantic continuity
↓
semantic degradation tolerance
↓
semantic survivability
↓
semantic sustainability
↓
semantic maintainability
↓
semantic evolvability
```

Graph sections:

- operational semantics: classification、severity、review readiness、escalation readiness、priority、ownership、operator guidance、operator message、summary、timeline。
- governance semantics: confidence、freshness、truth aggregation quality、evidence、risk、stability、decision readiness、impact、attention、posture、disposition、retention、audit trail、explainability、reasoning coherence。
- semantic lifecycle semantics: drift、convergence、resilience、integrity boundary、recoverability、continuity、degradation tolerance。
- semantic survivability semantics: survivability と sustainability を中心に、重大 degradation 下で semantic governance が読み続けられるかを示す。
- semantic maintainability semantics: maintainability を中心に、長期運用時に追跡・保守しやすいかを示す。
- semantic evolvability semantics: evolvability を中心に、将来的な拡張・変更・進化が安全に読めるかを示す。

この graph は execution ordering ではない。上流と下流の関係は semantic interpretation dependency であり、workflow dependency ではない。

## 4. Semantic Lifecycle Graph

semantic lifecycle graph は、semantic state が安定、drift、convergence、resilience、recoverability、continuity、survivability、sustainability、maintainability、evolvability のどの読み方に近いかを観測する graph である。

Positive / convergence-oriented flow:

```text
stable
↓
slight drift
↓
drifting
↓
converging
↓
resilient
↓
recoverable
↓
continuous
↓
survivable
↓
sustainable
↓
maintainable
↓
evolvable
```

Safety-first / degradation-oriented flow:

```text
unavailable
↓
unverified
↓
missing evidence
↓
contradictory reasoning
↓
collapsed
↓
broken
↓
outside boundary
↓
nonrecoverable
↓
intolerable degradation
↓
nonsurvivable
↓
unsustainable
↓
unmaintainable
↓
unevolvable
```

Lifecycle visualization では、positive state を強く断定しない。stable / maintainable / evolvable は「観測上そう読める」状態であり、正しさ保証、承認、実行許可ではない。

## 5. Semantic Collapse Visualization

semantic collapse visualization は、前段 semantics の破綻が下流 semantics にどのように悪影響として伝播するかを示す。

Collapse chain example:

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

Downstream collapse の主な起点:

- reasoning coherence の collapse: contradictory reasoning は drift、explainability 低下、audit limitation を通じて下流の semantic collapse を強める。
- semantic drift の collapse: severe drift は convergence を阻害し、resilience と integrity boundary を脆弱にする。
- resilience の collapse: collapsed resilience は異常下で semantic meaning が維持できない状態として、boundary crossing / outside boundary を誘発する。
- integrity boundary の collapse: outside integrity boundary は recoverability と continuity を強く制限する。
- recoverability の collapse: nonrecoverable semantics は continuity、degradation tolerance、survivability に直接影響する。
- continuity の collapse: broken continuity は長期 sustainability / maintainability / evolvability の前提を壊す。
- sustainability / maintainability の collapse: unsustainable / unmaintainable semantics は future extension safety を下げ、unevolvable semantics に接続する。

collapse visualization は注意喚起のための read-only graph であり、repair、retry、orchestration、correction を開始しない。

## 6. Semantic Convergence Visualization

semantic convergence visualization は、partial / degraded な signal がどのように安定方向へ読めるかを示す。

Convergence chain example:

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
inside integrity boundary
↓
recoverable semantics
↓
continuous observability
↓
high degradation tolerance
↓
survivable semantics
↓
sustainable semantics
↓
maintainable semantics
↓
evolvable semantics
```

Convergence を支える semantics:

- confidence: confidence high / medium は説明可能性の材料になる。ただし correctness guarantee ではない。
- evidence: evidence strong は reasoning と audit trail を支える。ただし execution permission ではない。
- freshness: freshness current / recent は観測時点の caveat を減らす。ただし rebuild 不要の保証ではない。
- audit traceability: audit traceable は説明責任を支える。ただし audit workflow の開始や完了ではない。
- explainability: explainable / partially explainable は人間が semantic flow を読める条件になる。ただし原因確定ではない。
- reasoning coherence: coherent / partially coherent は convergence の前提になる。ただし truth confirmation ではない。

convergence visualization では、positive path を「安全に進める」ではなく「安全に読める」と表現する。

## 7. Graph Node Model

将来 visualization する場合、node は governance metadata を表示する read-only observability object として扱う。

node model 候補:

- id
- semantics type
- semantics value
- severity
- confidence
- evidence quality
- drift level
- resilience level
- lifecycle stage
- reason
- source
- signals
- upstream semantics
- downstream semantics
- truth source
- projection target
- semantic boundary
- execution boundary

Node boundary:

- node は execution object ではない。
- node は mutation key ではない。
- node は workflow state ではない。
- node は source of truth confirmation ではない。
- node click は execution を起こさない。
- node visibility は、その semantics が review / audit / observability 上どう読めるかを示す。

Node の primary display は `semantics type + semantics value + short text` とし、detail display に reason / source / signals / upstream / downstream を置く。

## 8. Graph Edge Model

edge は node 間の semantic interpretation dependency を表す。edge は workflow execution、operation transition、approval route、retry route ではない。

edge type 候補:

- semantic dependency
- semantic escalation
- semantic degradation
- semantic recovery
- semantic convergence
- semantic survivability propagation
- semantic sustainability propagation
- semantic maintainability propagation
- semantic evolvability propagation
- evidence support
- confidence support
- freshness caveat
- audit traceability support
- explainability support

Edge boundary:

- edge は workflow dependency ではない。
- edge は execution path ではない。
- edge は mutation path ではない。
- edge は graph orchestration ではない。
- edge direction は semantic influence / interpretation dependency を示す。

edge label は短くし、hover / detail で relation reason、source、signals を表示する。

## 9. UI Visualization 方針

将来 UI visualization に進む場合も、graph は observability visualization として扱う。

UI 方針:

- graph は read-only observability visualization である。
- node click は execution を起こさない。
- hover は reason / source / signals を表示する。
- graph は safety-first coloring を採用する。
- unavailable / broken / collapsed / outside boundary / nonrecoverable を強調する。
- maintainable / evolvable は optimistic に強調しすぎない。
- readability を優先する。
- graph density を制御する。
- governance layer と operational layer を分離表示する。
- semantic lifecycle、collapse、convergence は別 view または filter として分ける。
- graph の凡例に read-only / no-execution boundary を明示する。

Coloring guidance:

- unavailable / missing / blocked: high attention color。
- contradictory / collapsed / broken / outside / nonrecoverable: critical attention color。
- partial / limited / fragile / degraded: caution color。
- converging / resilient / recoverable / continuous: neutral-positive color。
- sustainable / maintainable / evolvable: subdued positive color。

UI wording は「実行してください」「修正してください」「再構築してください」ではなく、「このように読めます」「この caveat があります」「この signal に基づきます」とする。

## 10. 将来 Visualization Implementation に進む前提条件

将来 graph visualization implementation に進む場合は、次の前提を満たす必要がある。

- semantics chain が安定していること。
- governance semantics architecture が固定されていること。
- reasoning coherence / explainability / audit trail が十分に確認可能であること。
- source / scope / evidence / confidence / freshness の caveat が metadata と UI で読めること。
- graph implementation は別 phase とすること。
- graph UI は compare endpoint を mutation 化しないこと。
- compare endpoint は `GET` only として維持すること。
- graph interaction を execution workflow にしないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- graph node / edge model が observability object / semantic dependency として定義済みであること。

visualization implementation は、semantic understanding を助けるための表示 layer であり、execution layer の前段承認ではない。

## 11. 今回の範囲外

Phase B77-01 では次を扱わない。

- graph UI implementation
- React implementation
- D3 / Cytoscape / Mermaid 導入
- API implementation
- DB implementation
- mutation
- execution workflow
- rebuild / replay / correction / sync
- package / lock file change
- Supabase schema change
- Edge Function change

この document は、governance semantic graph visualization を将来検討するための architecture / boundary / model 整理であり、実装差分や runtime behavior を追加しない。
