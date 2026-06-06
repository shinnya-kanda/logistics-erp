# Governance Semantic Graph Mock-to-Real Compare Data Adapter Design

Phase B77-30 documentation.

このドキュメントは、B77-20 から B77-29 で整備した Inventory Integrity Graph UI の mock data model を、将来 `compare-readonly` endpoint の real compare response / metadata から生成するための adapter design を整理する documentation phase である。

今回は documentation only であり、TypeScript implementation、adapter implementation、API fetch、API route change、DB query、Supabase call、Graph UI behavior change、mutation、POST、workflow execution は扱わない。

## 1. このドキュメントの目的

mock-to-real compare data adapter design の目的は、`compare-readonly` response / metadata を `InventoryIntegrityGraphData` にどう投影するかを、実装前に read-only observability adapter として固定することである。

mock data model から real compare response へ移行する理由:

- B77-20 から B77-29 で、Graph UI は mock data model を使って Summary Panel、Static Graph Prototype、SVG Relation Overlay、Relation Chips、Edge Semantics、Inspector、accessibility / keyboard navigation を確認できる状態になった。
- 次に実データへ進む場合も、UI が endpoint response shape に直接依存すると、Graph UI が API response、network state、business workflow state と混ざりやすい。
- `compare-readonly` response は在庫照合の read-only metadata を多く含むため、そのまま UI に流すのではなく、graph summary / node / edge / metadata / inspector detail へ安全に projection する必要がある。
- adapter design を先に固定することで、B77-31 以降の pure adapter implementation を fixture first で進められる。

Graph UI の実データ接続前に adapter design が必要な理由:

- `InventoryIntegrityGraphData` は Graph UI の表示 contract であり、`compare-readonly` response は endpoint response contract である。両者を分離する必要がある。
- graph data は command payload ではなく、semantic observability projection である。
- node / edge / summary / inspector の selected state は local UI state であり、execution workflow state ではない。
- compare endpoint は `GET` only の read-only endpoint として維持する必要がある。

この document は implementation permission ではない。B77-30 は、real data connection を開始する phase ではなく、compare response から graph data への変換ルールを documentation として整理する phase である。

## 2. Adapter Boundary

この adapter design は次に限定する。

- documentation only
- read-only
- observability only
- compare response interpretation
- graph data projection
- no mutation

adapter の意味:

- compare response / metadata を Graph UI 用の `InventoryIntegrityGraphData` に読むための projection rule である。
- endpoint response を command payload に変換しない。
- graph data projection は execution request、approval request、remediation request、migration request ではない。

禁止:

- API 実装
- route 変更
- fetch 実装
- Supabase 接続
- DB 接続
- POST
- mutation
- correction
- rebuild
- replay
- sync
- execution workflow
- approval workflow
- remediation workflow
- implementation workflow
- migration workflow

`compare-readonly` endpoint は `GET` only として維持する。B77-30 では `apps/admin-dashboard/src/app/api/inventory-integrity/compare-readonly/route.ts` を変更しない。

## 3. Source Data

source は `compare-readonly` endpoint の normalized response / metadata である。

既存 code 上の主な source 候補:

- `InventoryIntegrityReadOnlyData`
- `InventoryIntegrityEdgeProjectionResponse`
- `ProjectionResponseMetadata`
- `InventoryIntegrityProjectionMetadata`
- `compareClassification`
- `compareSeverity`
- `compareReviewReadiness`
- `compareEscalationReadiness`
- `compareOperationalPriority`
- `compareOwnership`
- `compareOwnerActionability`
- `compareOperatorGuidance`
- `compareOperatorMessage`
- `compareOperatorSummary`
- `compareOperatorTimeline`
- `compareConfidence`
- `compareProjectionFreshness`
- `compareTruthAggregationQuality`
- `compareEvidence`
- `compareRisk`
- `compareInterpretationStability`
- `compareDecisionReadiness`
- `compareOperationalImpact`
- `compareOperationalAttention`
- `compareGovernancePosture`
- `compareGovernanceDisposition`
- `compareGovernanceRetention`
- `compareGovernanceAuditTrail`
- `compareGovernanceExplainability`
- `compareGovernanceReasoningCoherence`
- `compareGovernanceSemanticDrift`
- `compareGovernanceSemanticConvergence`
- `compareGovernanceSemanticResilience`
- `compareGovernanceSemanticIntegrityBoundary`
- `compareGovernanceSemanticRecoverability`
- `compareGovernanceSemanticObservabilityContinuity`
- `compareGovernanceSemanticDegradationTolerance`
- `compareGovernanceSemanticSurvivability`
- `compareGovernanceSemanticSustainability`
- `compareGovernanceSemanticMaintainability`
- `compareGovernanceSemanticEvolvability`

source data は read-only metadata である。source data は correction、rebuild、replay、sync、inventory mutation、approval workflow を開始しない。

## 4. Target Graph Data Contract

target は `InventoryIntegrityGraphData` である。

既存 `inventoryIntegrityGraphTypes.ts` と整合する target fields:

- `metadata`
- `summaries`
- `nodes`
- `edges`
- `edgeSemanticsLegend`
- `viewModes`
- `defaultSummaryId`
- `defaultNodeId`
- `defaultEdgeId`
- `defaultHighlightedPathId`

重要な target boundary:

- `metadata` は graph generation context と read-only boundary を示す。
- `summaries` は overview であり action recommendation ではない。
- `nodes` は semantic observability node であり workflow state ではない。
- `edges` は semantic relation であり execution route ではない。
- `edgeSemanticsLegend` は relation category の読み方であり workflow legend ではない。
- `viewModes` は local display mode であり workflow transition ではない。
- default selection は initial reading position であり execution priority ではない。

## 5. Mapping Overview

mapping は次の reading hierarchy とする。

```text
compare response metadata
↓
graph metadata
↓
summary cards
↓
semantic nodes
↓
dependency edges
↓
inspector details
```

adapter は実行命令ではなく、表示用 projection である。

mapping の責務:

- compare metadata の read-only semantics を Graph UI contract に変換する。
- missing / unknown / unverified metadata を安全側の unavailable / not_provided 表示へ倒す。
- summary / node / edge / inspector が同じ source metadata を参照できるように reason / source / signals を保存する。
- Graph UI が endpoint response shape を直接読むことを避ける。

mapping が行わないこと:

- endpoint call
- DB query
- Supabase call
- route change
- business workflow state creation
- mutation payload creation

## 6. Summary Mapping

compare metadata から graph summaries への mapping 方針:

| Source metadata | Target summary candidate | Mapping meaning |
| --- | --- | --- |
| `compareSeverity` | Graph Health / Graph Risk | graph 全体の severity caveat を短く表示する |
| `compareRisk` | Risk Summary | semantic risk と risk signals を overview 化する |
| `compareEvidence` | Evidence Summary | evidence strength / caveat を支える summary にする |
| `compareConfidence` | Confidence Summary | confidence level と confidence signals を表示する |
| `compareProjectionFreshness` | Freshness Summary | projection freshness / stale caveat を表示する |
| `compareTruthAggregationQuality` | Truth Quality Summary | truth aggregation quality を表示する |
| `compareInterpretationStability` | Stability Summary | interpretation stability / fluctuation を表示する |
| `compareGovernanceSemanticSurvivability` | Survivability Summary | survivability semantics を表示する |
| `compareGovernanceSemanticSustainability` | Sustainability Summary | sustainability semantics を表示する |
| `compareGovernanceSemanticMaintainability` | Maintainability Summary | maintainability semantics を表示する |
| `compareGovernanceSemanticEvolvability` | Evolvability Summary | evolvability semantics を表示する |

summary field 方針:

- `id`: stable graph summary id。endpoint object id ではない。
- `title`: 日本語 / English の表示名。
- `value`: source metadata の state / level / risk / classification などを短く表示する。
- `severity`: safety-first mapping で決定する。
- `description`: reason / interpretation / caveat から短い説明を作る。
- `shortDescription`: density refined summary 表示用の短い caveat。
- `priority`: critical / warning / unavailable を先に読むための display order。
- `relatedNodeId` / `relatedPathId`: initial graph focus のための local display reference。

summary は action recommendation ではない。critical summary であっても correction、rebuild、replay、sync、approval、inventory update は開始しない。

## 7. Node Mapping

metadata / semantics から node を作る方針:

- classification node: `compareClassification`
- severity node: `compareSeverity`
- review readiness node: `compareReviewReadiness`
- escalation readiness node: `compareEscalationReadiness`
- operational priority node: `compareOperationalPriority`
- ownership node: `compareOwnership`
- owner actionability node: `compareOwnerActionability`
- operator guidance node: `compareOperatorGuidance`
- operator summary node: `compareOperatorSummary`
- evidence node: `compareEvidence`
- confidence node: `compareConfidence`
- freshness node: `compareProjectionFreshness`
- truth quality node: `compareTruthAggregationQuality`
- risk node: `compareRisk`
- stability node: `compareInterpretationStability`
- survivability node: `compareGovernanceSemanticSurvivability`
- sustainability node: `compareGovernanceSemanticSustainability`
- maintainability node: `compareGovernanceSemanticMaintainability`
- evolvability node: `compareGovernanceSemanticEvolvability`

node field 方針:

- `id`: graph-local stable id。workflow id ではない。
- `type`: source semantic type。例: `risk`, `confidence`, `freshness`, `survivability`。
- `label`: user-facing label。
- `value`: state / level / classification / readiness の値。
- `severity`: graph severity へ mapping。
- `reason`: source metadata の reason / interpretation / caveat。
- `source`: source metadata name。例: `compareRisk`, `compareConfidence`。
- `signals`: source metadata の `*Signals` array または fallback signal。

node は workflow state ではなく semantic observability node である。node selected state は local UI state であり、action target、approval target、repair target ではない。

## 8. Edge Mapping

node 間の edge mapping 方針:

| From | To | Semantic category | Meaning |
| --- | --- | --- | --- |
| classification | severity | `boundary_relation` | classification が severity の読み方を制限する |
| severity | risk | `collapse_path` or `boundary_relation` | severity caveat が graph risk を高める |
| evidence | confidence | `support_relation` | evidence quality が confidence を支える |
| freshness | confidence | `support_relation` | projection freshness が confidence を制限する |
| truth quality | evidence | `support_relation` | truth aggregation quality が evidence caveat を支える |
| confidence | stability | `convergence_path` | confidence が interpretation stability に影響する |
| risk | escalation readiness | `boundary_relation` | risk が escalation readiness の読み方を制限する |
| review readiness | escalation readiness | `boundary_relation` | review readiness が escalation caveat に影響する |
| survivability | sustainability | `lifecycle_propagation` | lifecycle 後段の viability propagation |
| sustainability | maintainability | `lifecycle_propagation` | sustainability が maintainability を制限する |
| maintainability | evolvability | `lifecycle_propagation` | maintainability が evolvability を制限する |

edge field 方針:

- `id`: graph-local stable id。
- `from` / `to`: graph node id。
- `type`: semantic relation type。
- `label`: short relation label。
- `displayLabel`: Relation Chip / Inspector 用の読みやすい label。
- `semanticCategory`: `collapse_path` / `convergence_path` / `support_relation` / `lifecycle_propagation` / `boundary_relation`。
- `pathMeaning`: relation の読み方。
- `readOnlyMeaning`: `観測用の意味関係です。実行経路ではありません / Observability Semantic Relation, No Execution Route.` を含める。
- `description`: reason / caveat。
- `severity`: edge severity。
- `source`: source metadata name。

edge は execution route ではなく semantic relation である。edge direction は operation order ではなく interpretation direction である。

## 9. Severity / Priority Mapping

既存 graph severity は次に限定される。

- `critical`
- `warning`
- `stable`
- `neutral`

source severity / state から graph severity への mapping 方針:

| Source value examples | Graph severity |
| --- | --- |
| `critical`, `high`, `escalation_required`, `negative_projection`, `negative_truth`, `unrecoverable`, `unsustainable`, `unmaintainable`, `unevolvable` | `critical` |
| `warning`, `review_required`, `degraded`, `stale`, `partial`, `fragile`, `attention_required`, `unverified` | `warning` |
| `stable`, `maintainable`, `evolvable`, `healthy`, `aligned`, `ready`, `sufficient` | `stable` |
| `neutral`, `not_applicable`, `not_provided`, `unknown` | `neutral` with unavailable caveat, or `warning` when absence blocks safe interpretation |

安全側 fallback:

- unknown / missing metadata は optimistic に扱わない。
- missing metadata が graph health / risk / evidence / confidence を読めなくする場合は `warning` として表示する。
- missing metadata が optional support detail のみの場合は `neutral` とし、`unavailable` / `not_provided` caveat を表示する。
- unavailable response は `graph_unavailable` summary / node を作り、positive summary を強調しない。

priority mapping:

1. `critical` / unavailable / collapse / high risk
2. `warning` / degraded / stale / unverified
3. evidence / confidence caveat
4. lifecycle caveat
5. stable / positive support

priority は execution priority ではない。priority は reading order である。

## 10. Reason / Source / Signals Mapping

reason / source / signals の mapping 方針:

- reason: source metadata の `reason`, `interpretation`, `readability`, `caveat`, `noExecutionMeaning` から human-readable explanation を作る。
- source: source metadata field name を明示する。例: `compareRisk`, `compareEvidence`, `compareGovernanceSemanticMaintainability`。
- signals: source metadata の `riskSignals`, `evidenceSignals`, `confidenceSignals`, `freshnessSignals`, `semanticSurvivabilitySignals`, `semanticSustainabilitySignals`, `semanticMaintainabilitySignals`, `semanticEvolvabilitySignals` などをそのまま supporting context として渡す。

欠落時:

- missing reason: `reason unavailable / 理由未提供`
- missing source: `source unavailable / 根拠未提供`
- missing signals: empty signals + `signals unavailable / シグナル未提供`
- missing value: `not_provided`
- missing metadata object: unavailable node / summary を生成するか、optional support node として省略する。

自動補完で断定しない。adapter は不足を隠さず、unavailable / not_provided として表示する。

## 11. Default Selection Strategy

実データ graph 表示時の初期選択は、safety-first reading position として決める。

候補順:

1. critical risk node
2. collapse / unavailable / unsustainable / unmaintainable / unevolvable node
3. warning severity node
4. evidence / confidence caveat node
5. risk summary
6. first available summary
7. graph unavailable summary

default fields:

- `defaultSummaryId`: selected summary の初期表示。
- `defaultNodeId`: selected node の初期表示。
- `defaultEdgeId`: selected edge の初期表示。
- `defaultHighlightedPathId`: selected path の初期表示。

default selection は execution priority ではない。default selection は最初に読むべき metadata の位置であり、action target ではない。

## 12. Fallback Strategy

metadata 欠落時の fallback 方針:

- missing compare response: `graph_unavailable` summary / node を生成する。
- missing summaries: unavailable summary を 1 件生成し、positive summary を表示しない。
- missing node source: `source unavailable / 根拠未提供` を表示する。
- missing reason: `reason unavailable / 理由未提供` を表示する。
- missing signals: `[]` と `signals unavailable` label を表示する。
- missing edge source: edge `source` を `source unavailable` にする。
- missing edge target: edge を skip するか `incomplete_relation` として neutral / warning 表示にする。
- missing severity: `warning` または `neutral` with unavailable caveat にする。
- missing lifecycle metadata: lifecycle summary は neutral / warning とし、not_provided caveat を出す。

safety-first fallback:

- missing / unknown / unverified を stable として扱わない。
- adapter failure を real data success に見せない。
- mock fallback を使う場合も `Mock Data / モックデータ` と `fallback` caveat を表示する。
- fallback graph は read-only projection であり、再試行、修復、同期を開始しない。

## 13. Mock Coexistence Strategy

B77-31 以降の移行時は、mock data と real adapter output を明確に分けて共存させる。

候補:

- default: `inventoryIntegrityGraphMockData`
- adapter preview: `realGraphData`
- fixture adapter: static compare response fixture -> graph data
- feature flag / local toggle: mock / fixture / real endpoint preview を明示的に切り替える
- real adapter failure: mock fallback ではなく unavailable graph を優先し、mock fallback を使う場合は明示する

coexistence boundary:

- mock data は demo / fallback / local preview である。
- real adapter output は endpoint response projection である。
- fallback は real data success ではない。
- toggle は local display choice であり workflow transition ではない。

## 14. UI Integration Boundary

将来実装時の方針:

- `InventoryIntegrityGraphSection` は将来 `graphData` prop を受け取れる構造へ移行する可能性がある。
- `StaticGraphPrototype` は data-driven component のまま維持する。
- Inspector は `InventoryIntegrityGraphData` の summary / node / edge を読む。
- `edgeSemanticsLegend` は graph data contract に含め、UI 内で hardcode しない。
- API fetch は別 phase とする。
- adapter は pure function とする。
- adapter は mutation しない。

adapter candidate:

```text
compare response fixture
↓
pure adapter
↓
InventoryIntegrityGraphData
↓
InventoryIntegrityGraphSection / StaticGraphPrototype
```

UI integration が行わないこと:

- route change
- API call implementation
- DB query
- Supabase call
- mutation
- POST
- workflow state creation

## 15. Future Implementation Proposal

候補 phase:

- B77-31 graph data adapter type scaffolding
- B77-32 pure mock-to-graph adapter implementation with static fixture
- B77-33 compare response fixture to graph data adapter
- B77-34 read-only compare graph data integration
- B77-35 graph real data toggle / fallback

推奨順序:

1. B77-31: `InventoryIntegrityGraphData` と compare response metadata の bridge type を documentation に沿って scaffold する。
2. B77-32: static fixture を入力にした pure adapter を実装する。API fetch はしない。
3. B77-33: existing `InventoryIntegrityEdgeProjectionResponse` fixture を adapter に通す。
4. B77-34: `compare-readonly` GET response integration を read-only に限定して検討する。
5. B77-35: mock / fixture / real data toggle と fallback caveat を UI で明示する。

future phase の原則:

- pure function first
- fixture first
- no route change before adapter is stable
- no API fetch until separate phase
- no mutation at any phase

## 16. 今回の範囲外

B77-30 の範囲外:

- TypeScript implementation
- adapter implementation
- API fetch
- API route change
- DB query
- Supabase call
- mutation
- POST
- graph UI behavior change
- execution workflow
- approval workflow
- remediation workflow
- implementation workflow
- migration workflow

絶対に変更しない:

- `apps/admin-dashboard/src/app`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- DB schema
- Edge Functions
- `services/api`

追加禁止:

- `fetch`
- `createClient`
- mutation
- `POST`
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`
- execution workflow
- approval workflow
- remediation workflow
- migration workflow
- Graph UI implementation change

この document は real data connection の開始条件ではない。B77-30 は、`compare response → graph data` の変換ルールを安全に固定する documentation phase である。
