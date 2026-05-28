# Governance Semantic Graph Data Contract Design

Phase B77-07 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design を前提に、将来 graph visualization UI に渡す read-only data contract を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI は扱わない。

## 1. このドキュメントの目的

governance semantic graph data contract design の目的は、graph visualization に渡す read-only data shape を整理し、node / edge / metadata / viewMode / filter contract が execution workflow contract や command payload に見えないように境界を固定することである。

この design が整理するもの:

- governance semantic graph の read-only data shape
- node contract
- edge contract
- graph metadata contract
- view mode / filter / layer / cluster contract
- reason / source / signals contract
- no execution / no mutation boundary

この design が整理しないもの:

- execution workflow contract
- API implementation
- command payload
- mutation payload
- graph rendering implementation

data contract は read-only observability contract である。graph data は「どう表示・確認・参照できるか」を伝えるための data shape であり、「何を実行するか」を伝える data shape ではない。

## 2. Data Contract Boundary

data contract は次の性質を持つ。

- read-only
- observability only
- semantic interpretation data
- governance metadata data
- visualization input contract

data contract は次を実行しない。

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

- graph data は command payload ではない。
- node data は execution object ではない。
- edge data は workflow transition ではない。
- viewMode / filter は local visualization state 用である。
- compare endpoint は `GET` only として維持する。
- data contract から mutation しない。
- data contract は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を前提にしない。

graph data は governance metadata を可視化するための入力であり、実行可能性、正しさ保証、承認完了、現場作業指示を意味しない。

## 3. Top-Level Graph Contract

将来の graph data shape は、nodes、edges、metadata、任意の viewState を持つ read-only graph input として整理する。

設計例:

```ts
type GovernanceSemanticGraph = {
  nodes: GovernanceSemanticGraphNode[];
  edges: GovernanceSemanticGraphEdge[];
  metadata: GovernanceSemanticGraphMetadata;
  viewState?: GovernanceSemanticGraphViewState;
};
```

これは TypeScript 実装ではなく設計例である。実装 phase では型名、field 名、optional / required の扱いを改めて確認する。

top-level contract の役割:

- governance semantics graph の表示入力をまとめる。
- node / edge / metadata / local view state を分離する。
- read-only boundary を graph 全体に明示する。
- command payload と誤読されないようにする。

`GovernanceSemanticGraph` は visualization input であり、workflow object、execution request、mutation request ではない。

## 4. Graph Node Contract

node contract は、semantic graph 上の 1 つの semantics を read-only observability object として表す。

候補 fields:

- id
- semanticType
- semanticValue
- label
- text
- category
- layer
- cluster
- severity
- importance
- confidence
- evidenceStrength
- lifecycleStage
- reason
- source
- signals
- upstreamNodeIds
- downstreamNodeIds
- readOnlyBoundary
- noExecutionMeaning

field の意味:

- id: visualization 上の node 識別子。workflow id ではない。
- semanticType: classification、confidence、semantic drift、evolvability などの semantics 種別。
- semanticValue: `risk_critical`、`stable_convergence`、`evolvable_semantics` などの値。
- label / text: 人間が読むための短い表示文。
- category / layer / cluster: observability grouping のための分類。
- severity / importance: safety-first ordering を支える表示補助。
- confidence / evidenceStrength: observability support の状態。
- lifecycleStage: lifecycle view での読み方。
- reason / source / signals: 判定理由と根拠。
- upstreamNodeIds / downstreamNodeIds: semantic dependency の参照。
- readOnlyBoundary / noExecutionMeaning: node が実行対象ではないことの caveat。

重要な boundary:

- node は execution object ではない。
- node click は execution trigger ではない。
- node id は workflow id ではない。
- node selected state は local UI state である。
- node data から mutation しない。

## 5. Graph Edge Contract

edge contract は、node 間の semantic interpretation dependency を read-only observability relation として表す。

候補 fields:

- id
- fromNodeId
- toNodeId
- edgeType
- direction
- propagationKind
- label
- reason
- source
- signals
- severity
- importance
- readOnlyBoundary
- noExecutionMeaning

edgeType 例:

- dependency
- degradation
- collapse
- convergence
- recovery
- continuity
- survivability
- maintainability
- evolvability
- support

field の意味:

- id: visualization 上の edge 識別子。workflow transition id ではない。
- fromNodeId / toNodeId: semantic interpretation direction の参照。
- edgeType: dependency / collapse / convergence などの relation 種別。
- direction: upstream から downstream への意味方向。
- propagationKind: degradation propagation、support propagation などの読み方。
- label: 短い relation 表示文。
- reason / source / signals: relation の根拠。
- severity / importance: safety-first 表示の補助。
- readOnlyBoundary / noExecutionMeaning: edge が実行経路ではないことの caveat。

重要な boundary:

- edge は execution transition ではない。
- edge traversal は workflow execution ではない。
- edge click は propagation execution ではない。
- edge data は approval route、repair route、retry route ではない。

## 6. Graph Metadata Contract

metadata contract は、graph generation context と read-only boundary を説明する。

候補 fields:

- generatedAt
- source
- truthSource
- projectionSource
- compareTarget
- compareEndpointMethod
- readOnlyBoundary
- semanticsVersion
- architectureReference
- nodeCount
- edgeCount
- hasUnavailableSignals
- hasCollapsedSignals
- hasCriticalSignals

field の意味:

- generatedAt: graph data を生成した時点。
- source: graph data の生成元。
- truthSource: `inventory_transactions` を明示する。
- projectionSource / compareTarget: `inventory_current` など projection / compare target を明示する。
- compareEndpointMethod: `GET` only を明示する。
- readOnlyBoundary: graph data が read-only observability であることを明示する。
- semanticsVersion: semantics chain / graph contract の version 参照。
- architectureReference: B76/B77 系 docs への参照。
- nodeCount / edgeCount: graph density の目安。
- hasUnavailableSignals / hasCollapsedSignals / hasCriticalSignals: safety-first display の入口。

重要な boundary:

- metadata は graph generation context である。
- metadata は execution context ではない。
- compareEndpointMethod は `GET` only を明示する。
- metadata は command header ではない。

## 7. View State Contract

viewState は local visualization state として整理する。

候補 fields:

- activeViewMode
- activeLayer
- activeFilters
- selectedNodeId
- selectedEdgeId
- highlightedPathId
- expandedClusterIds

field の意味:

- activeViewMode: overview、operational、governance、collapse propagation など現在の表示 view。
- activeLayer: compare base、governance interpretation、semantic lifecycle など現在の表示 layer。
- activeFilters: critical only、collapse path only などの observability filter。
- selectedNodeId / selectedEdgeId: detail panel に表示する対象。
- highlightedPathId: 表示上強調する semantic path。
- expandedClusterIds: expanded / collapsed 状態の cluster。

重要な boundary:

- viewState は business workflow state ではない。
- viewState は DB 永続化を前提にしない。
- viewState は mutation payload ではない。
- viewState は local UI state として扱う。
- view switching は workflow transition ではない。
- selectedNodeId / selectedEdgeId は action target ではない。

## 8. Reason / Source / Signals Contract

reason / source / signals は、semantic value の読み方を人間と Cursor が追えるようにする supporting metadata である。

設計例:

```ts
type SemanticSignal = {
  code: string;
  label: string;
  severity?: string;
  source?: string;
};
```

これは TypeScript 実装ではなく設計例である。

整理内容:

- reason は人間向け補足である。
- source は判定根拠の出所である。
- signals は machine-readable に近い補助情報である。
- reason / source / signals は execution instruction ではない。
- reason は command text ではない。
- source は mutation source ではない。
- signals は workflow trigger ではない。
- B76-22 readability 方針を維持し、reason / source / signals grouping を崩さない。

表示では primary text と supporting metadata を分け、safe wording を使う。

## 9. Layer / Cluster / Category Contract

layer / cluster / category は graph readability と observability grouping のための分類である。

layer examples:

- compare_base
- operational_interpretation
- governance_interpretation
- semantic_lifecycle
- survivability
- sustainability
- maintainability
- evolvability
- observability_support

cluster examples:

- operational_cluster
- governance_cluster
- lifecycle_cluster
- survivability_cluster
- evolvability_cluster

category examples:

- confidence
- evidence
- risk
- lifecycle
- auditability
- explainability
- degradation
- convergence

重要な boundary:

- layer / cluster / category は observability grouping である。
- execution grouping ではない。
- workflow lane ではない。
- operation queue ではない。
- approval lane ではない。

これらの fields は graph density control、filtering、readability のために使う。

## 10. View Mode / Filter Contract

view mode と filter は、semantic graph を用途別に表示するための local visualization contract である。

viewMode examples:

- overview
- operational
- governance
- lifecycle
- collapse_propagation
- convergence_propagation
- survivability
- maintainability
- evolvability
- support
- audit_explainability
- boundary_recoverability

filter examples:

- showCriticalOnly
- showUnavailableOnly
- showCollapsePathOnly
- showConvergencePathOnly
- showSupportEdges
- showOptimisticSignals

重要な boundary:

- filter は observability filtering である。
- execution routing ではない。
- view switching は workflow transition ではない。
- filter selection は mutation condition ではない。
- showOptimisticSignals は execution readiness 表示ではない。

view mode / filter は graph density control と readability のために使う。

## 11. Safety-First Contract Rules

data contract は safety-first display を支えられる shape にする。

rules:

- unavailable / broken / collapsed / outside / nonrecoverable を優先表示できる data shape にする。
- optimistic semantics を過度強調しない。
- stable / maintainable / evolvable は最後に扱う。
- fallback は fragile / limited / hold 側に倒せるようにする。
- severity / importance は safety-first ordering を支える。
- hasUnavailableSignals / hasCollapsedSignals / hasCriticalSignals のような top-level flags を持てるようにする。
- node / edge の severity / importance を layer / view mode / filter から利用できるようにする。
- reason / source / signals を detail に残し、positive state の caveat を隠さない。

Safety-first contract は review attention のための ordering であり、execution priority ではない。

## 12. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- data contract が documentation として固定されていること。
- node / edge taxonomy と整合していること。
- layering / view mode / interaction boundary と整合していること。
- graph implementation は別 phase とすること。
- API implementation は別 phase とすること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- graph data から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- graph data を command payload として扱わないこと。

data contract design は visualization implementation の前提整理であり、implementation approval ではない。

## 13. 今回の範囲外

Phase B77-07 では次を扱わない。

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

この document は、governance semantic graph data contract の architecture / boundary / shape 整理であり、実装差分や runtime behavior を追加しない。
