# Governance Semantic Graph Compare Response Contract Review

Phase B77-41 documentation.

このドキュメントは、B77-40 real compare data validation review を前提に、将来 `real_compare_readonly` を有効化する前の `compare-readonly` response contract を棚卸しする documentation-only phase である。

今回は review document のみを追加する。fetch implementation、route change、adapter change、UI change、Supabase integration、DB query、mutation、POST、workflow execution は行わない。

## 1. Review Purpose

B77-41 の目的は、Graph Adapter が将来 real compare response を読む前に、route / adapter / graph adapter の contract drift を洗い出すことである。

Review purpose:

- `compare-readonly` response contract の棚卸し。
- Graph Adapter が期待する metadata と actual route response / mapped response の対応確認。
- response envelope、metadata placement、field naming、value shape の drift risk を整理する。
- B77-42 adapter coverage expansion に向け、対応済み metadata / 未対応 metadata / fixture gap を明確にする。

この review は implementation permission ではない。ここで "ready" と表現する場合も、contract review 上の readiness であり、real fetch、route change、adapter implementation、UI change、production enablement を開始しない。

## 2. Current Response Sources

### compare-readonly route

`apps/admin-dashboard/src/app/api/inventory-integrity/compare-readonly/route.ts` は `GET` handler を持つ read-only endpoint である。

Route response characteristics:

- Top-level response includes:
  - `ok`
  - `endpoint`
  - `method: "GET"`
  - `truthSource: "inventory_transactions"`
  - `cacheCompareTarget: "inventory_current"`
  - `warehouseCode`
  - compare metadata fields such as `compareSeverity`, `compareRisk`, `compareEvidence`, lifecycle governance metadata, and many governance / operator metadata fields.
  - `normalizedData`
  - `metadata: mappedResponse.metadata`
  - `statusSemantics`
  - `semanticBoundary`
  - `executionBoundary`
- The route builds compare metadata directly, then creates a fetch result, adapts it to payload semantics, maps it into an edge projection response, and returns both top-level compare metadata and mapped response metadata.
- The route has unavailable response construction for guard / scope / source unavailable cases and still uses read-only compare metadata semantics.
- The route uses Supabase internally for auth / read-only source access, but B77-41 does not change or invoke the route.

Contract concern:

- Graph Adapter currently looks for `metadata`, `responseMetadata`, or `rawPayloadMetadata`.
- Actual route response has important compare metadata at top level and also has `metadata: mappedResponse.metadata`.
- If Graph Adapter receives the full route JSON, it may read `mappedResponse.metadata` rather than top-level compare fields. This can omit or rename fields unless a future contract adapter chooses the intended metadata source explicitly.

### fetch adapter

`inventoryIntegrityFetchAdapter.ts` adapts future fetch result metadata into raw payload metadata.

Responsibilities:

- Convert `InventoryIntegrityFetchResultMetadata` into `RawProjectionMetadataPayload`.
- Preserve read-only semantics, source metadata, response status, consistency / degradation / governance / health / resilience metadata, and the full compare metadata chain.
- Preserve nested signal arrays by copying arrays rather than mutating them.
- Avoid real fetch implementation; this file is a pure transformation boundary.

Contract concern:

- It writes metadata into payload-oriented names such as `payloadId`, `payloadKind`, `payloadVersion`.
- It carries compare metadata fields, but downstream mappers may rename envelope fields to response-oriented names.
- Graph Adapter must not assume that fetch adapter payload shape is identical to route response shape.

### inventory integrity adapter

`inventoryIntegrityAdapter.ts` normalizes raw/static source data into `InventoryIntegrityReadOnlyData`.

Responsibilities:

- Normalize projection metadata, evidence metadata, lineage, lifecycle, confidence, freshness, completeness, traceability, and review readiness.
- Preserve compare metadata objects if present.
- Normalize `compareProjections`, `attentionProjections`, `evidenceProjections`, and source mappings.
- Remain pure and read-only: no fetch, no mutation, no rebuild, no replay, no workflow execution.

Contract concern:

- This adapter preserves rich metadata objects with reason / source / signals fields.
- Current graph adapter reduces metadata to string values and does not yet preserve most rich fields.

### edge response mapper

`inventoryIntegrityEdgeResponseMapper.ts` maps raw Edge-like payload response into normalized response envelope.

Responsibilities:

- Convert `RawProjectionMetadataPayload` into `ProjectionResponseMetadata`.
- Preserve source, semantic status, lifecycle metadata, and compare metadata fields.
- Normalize data via `normalizeInventoryIntegrityReadOnlyData`.
- Return `InventoryIntegrityEdgeProjectionResponse` with `metadata`, `lifecycle`, `statusSemantics`, `normalizedData`, `semanticBoundary`, and `executionBoundary`.

Contract concern:

- It maps payload naming to response naming:
  - `payloadId` -> `responseId`
  - `payloadKind` -> `responseKind`
  - `payloadVersion` -> `responseContractVersion`
- Graph Adapter must treat this as a separate layer, not as the original route response.

### graph adapter fixture

`inventoryIntegrityGraphAdapterFixtures.ts` provides `sampleInventoryIntegrityCompareResponseFixture`.

Fixture characteristics:

- Uses `metadata` as the primary object for compare metadata.
- Includes object metadata for classification, severity, review readiness, escalation readiness, operational priority, operator summary, confidence, freshness, truth quality, evidence, risk, interpretation stability, survivability, sustainability, maintainability, and evolvability.
- Includes `responseMetadata` and `rawPayloadMetadata` as secondary fixture context.

Contract concern:

- Fixture `metadata` is intentionally close to compare response metadata, but it is not the same as the real route response envelope.
- It does not include the full route metadata chain.
- It does not validate route top-level metadata vs `mappedResponse.metadata` selection.

## 3. Contract Layers

The current and future contract layers should be understood as separate read-only boundaries.

```text
Route Response
↓
Fetch Adapter Result
↓
Inventory Integrity Adapter Normalized Result
↓
Graph Adapter Input
↓
InventoryIntegrityGraphData
```

Route Response:

- Responsibility:
  - Return `compare-readonly` JSON over `GET`.
  - Expose truth source, cache compare target, warehouse scope, compare metadata, normalized data, mapped response metadata, and read-only boundaries.
- Boundary:
  - Endpoint response is source metadata, not command authority.
  - Route response must remain GET-only.

Fetch Adapter Result:

- Responsibility:
  - Represent future transport / fetch-result semantics as payload semantics.
  - Carry compare metadata fields and read-only source semantics without implementing fetch in the graph layer.
- Boundary:
  - Fetch adapter result is transport interpretation, not UI rendering or workflow execution.

Inventory Integrity Adapter Normalized Result:

- Responsibility:
  - Normalize raw/static read-only inventory integrity data.
  - Preserve compare projection metadata, evidence metadata, lineage, and lifecycle fields.
- Boundary:
  - Normalization does not perform compare execution, mutation, correction, rebuild, or sync.

Graph Adapter Input:

- Responsibility:
  - Accept unknown compare-like response.
  - Select metadata candidate safely.
  - Normalize supported metadata values for graph projection.
  - Return `InventoryIntegrityGraphAdapterResult` with graph data and warnings.
- Boundary:
  - Graph adapter is a pure projection layer.
  - It must not fetch, call route, read DB, create Supabase client, or mutate data.

`InventoryIntegrityGraphData`:

- Responsibility:
  - Provide rendering input for Graph UI: metadata, summaries, nodes, edges, legend, view modes, and default selection.
- Boundary:
  - Graph data is not a command payload, execution request, approval request, or workflow state.

## 4. Metadata Contract Inventory

### Graph Adapter expected metadata

Current graph adapter `InventoryIntegrityGraphAdapterFixtureMetadata` expects these projection fields:

- `compareSeverity`
- `compareRisk`
- `compareEvidence`
- `compareConfidence`
- `compareProjectionFreshness`
- `compareTruthAggregationQuality`
- `compareInterpretationStability`
- `compareGovernanceSemanticSurvivability`
- `compareGovernanceSemanticSustainability`
- `compareGovernanceSemanticMaintainability`
- `compareGovernanceSemanticEvolvability`

The adapter also accepts shortened lifecycle aliases:

- `governanceSemanticSurvivability`
- `governanceSemanticSustainability`
- `governanceSemanticMaintainability`
- `governanceSemanticEvolvability`

### Current graph mapping use

- `compareSeverity`
  - Summary: Graph Health.
  - Node: severity node.
  - Edge: severity -> risk.
- `compareRisk`
  - Summary: Graph Risk.
  - Node: risk node.
  - Edge: risk -> survivability.
- `compareEvidence`
  - Summary: Evidence.
  - Node: evidence node.
  - Edge: evidence -> confidence.
- `compareConfidence`
  - Summary: Confidence.
  - Node: confidence node.
  - Edge: confidence -> stability.
- `compareProjectionFreshness`
  - Node: freshness node.
  - Edge: freshness -> confidence.
  - Summary is currently omitted for density.
- `compareTruthAggregationQuality`
  - Node: truth quality node.
  - Summary is currently omitted for density.
- `compareInterpretationStability`
  - Summary: Stability.
  - Node: stability node.
- `compareGovernanceSemanticSurvivability`
  - Summary: Survivability.
  - Node: survivability node.
  - Edge: survivability -> sustainability.
- `compareGovernanceSemanticSustainability`
  - Summary: Sustainability.
  - Node: sustainability node.
  - Edge: sustainability -> maintainability.
- `compareGovernanceSemanticMaintainability`
  - Summary: Maintainability.
  - Node: maintainability node.
  - Edge: maintainability -> evolvability.
- `compareGovernanceSemanticEvolvability`
  - Summary: Evolvability.
  - Node: evolvability node.

### Metadata present in route / fetch / mapper but not fully projected

Route, fetch adapter, inventory adapter, and edge response mapper carry many additional compare metadata fields:

- `compareHardening`
- `compareClassification`
- `compareReviewReadiness`
- `compareEscalationReadiness`
- `compareOperationalPriority`
- `compareOwnership`
- `compareOwnerActionability`
- `compareOperatorGuidance`
- `compareOperatorMessage`
- `compareOperatorSummary`
- `compareOperatorTimeline`
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

User-facing grouping for future adapter coverage:

- Ownership / actionability:
  - `compareOwnership`
  - `compareOwnerActionability`
- Operator guidance / message / summary / timeline:
  - `compareOperatorGuidance`
  - `compareOperatorMessage`
  - `compareOperatorSummary`
  - `compareOperatorTimeline`
- Evidence detail / risk detail:
  - `compareEvidence`
  - `compareRisk`
  - related reason / source / signals fields.
- Audit / explainability / reasoning coherence:
  - `compareGovernanceAuditTrail`
  - `compareGovernanceExplainability`
  - `compareGovernanceReasoningCoherence`
- Semantic drift / convergence / resilience / boundary / recoverability / continuity / degradation tolerance:
  - `compareGovernanceSemanticDrift`
  - `compareGovernanceSemanticConvergence`
  - `compareGovernanceSemanticResilience`
  - `compareGovernanceSemanticIntegrityBoundary`
  - `compareGovernanceSemanticRecoverability`
  - `compareGovernanceSemanticObservabilityContinuity`
  - `compareGovernanceSemanticDegradationTolerance`

Inventory conclusion:

- Current graph adapter covers a core graph readability subset.
- The real route exposes a wider governance and operator contract.
- B77-42 should expand coverage or explicitly mark unsupported metadata as out of scope with warnings.

## 5. Shape Review

Current graph adapter shape handling:

- string value
  - Accepted directly.
  - Example: `compareSeverity: "warning"`.
- object with preferred key
  - Accepted through `readMetadataField(value, preferredKey, warnings)`.
  - Example: `compareSeverity: { severity: "warning" }` is read via fallback object fields, not via preferred key.
- object with short key
  - Accepted through `toShortMetadataKey(preferredKey)`.
  - Example: `compareProjectionFreshness` can read `projectionFreshness`.
- object with `value`
  - Accepted.
- object with `state`
  - Accepted.
- object with `level`
  - Accepted.
- object with `status`
  - Accepted.
- object with `classification`
  - Accepted.
- object with `severity`
  - Accepted.
- object with `readiness`
  - Accepted.
- object with `priority`
  - Accepted.
- object with `operatorSummary`
  - Accepted.
- object with domain-specific value fields
  - Accepted for `compareConfidence`, `projectionFreshness`, `truthAggregationQuality`, `compareEvidence`, `compareRisk`, `interpretationStability`, `governanceSemanticSurvivability`, `governanceSemanticSustainability`, `governanceSemanticMaintainability`, `governanceSemanticEvolvability`.
- object with reason/source/signals
  - Partially handled.
  - The adapter currently does not preserve rich reason/source/signals arrays from real metadata objects.
  - It emits `normalized_non_string_metadata` and extracts one representative display value.
- unknown / missing
  - Missing response or missing metadata falls back with warnings.
  - Missing individual values become `unavailable` and may still render as partial graph.

Route / type shape characteristics:

- Most real compare metadata are rich objects.
- Common fields include:
  - id field such as `severityId`, `riskId`, `semanticSurvivabilityId`.
  - primary semantic value such as `severity`, `compareRisk`, `compareConfidence`, `governanceSemanticSurvivability`.
  - text / reason / source / signals fields.
  - `label`, `interpretation`, `noExecutionMeaning`.
  - upstream semantic references.
  - `truthSource`, `cacheCompareTarget`, `semanticBoundary`, `executionBoundary`.

Shape review conclusion:

- Current graph adapter can extract a representative value from many object shapes.
- It is not yet a full rich metadata contract mapper.
- B77-42 should decide when to preserve reason/source/signals and when to keep compact value-only projection.

## 6. Contract Drift Risks

- Metadata key rename
  - Example: `compareGovernanceSemanticSurvivability` vs `governanceSemanticSurvivability`.
  - Current adapter has aliases only for lifecycle backend fields, not all fields.
- Nested object shape change
  - Route metadata may use rich object fields like `riskText`, `riskReason`, `riskSignals`.
  - Graph adapter currently reads a representative value and drops most rich fields.
- Value enum drift
  - Route values include names like `risk_high`, `confidence_blocked`, `freshness_unavailable`, `survivability_unavailable`.
  - Graph severity mapping recognizes some generic values such as `critical`, `warning`, `fragile`, `limited`, `unavailable`, but not all route enum values.
- Missing metadata
  - A missing top-level `metadata` object or missing expected fields can cause unavailable fallback or partial graph values.
- Multiple metadata sources divergence
  - Route response returns top-level compare metadata and also `metadata: mappedResponse.metadata`.
  - These can diverge in naming, versioning, or completeness.
- Route response and fetch adapter result naming mismatch
  - Fetch adapter uses payload-oriented fields.
  - Edge mapper uses response-oriented fields.
  - Route response includes top-level endpoint fields and mapped response fields.
- Graph adapter source selection ambiguity
  - `selectFixtureMetadataRecord()` chooses `metadata` before `responseMetadata` before `rawPayloadMetadata`.
  - If full route response is passed directly, the adapter may choose mapped response metadata rather than top-level compare metadata.
- Over-normalization
  - `normalized_non_string_metadata` warns, but value-only extraction may hide important source / reason / signals detail.
- Partial graph overconfidence
  - Missing individual metadata values may render as `unavailable` nodes inside an otherwise normal graph.

## 7. Adapter Coverage Gap

Currently handled by graph adapter:

- Core health / risk:
  - `compareSeverity`
  - `compareRisk`
- Evidence / support:
  - `compareEvidence`
  - `compareConfidence`
  - `compareProjectionFreshness`
  - `compareTruthAggregationQuality`
- Stability:
  - `compareInterpretationStability`
- Lifecycle:
  - `compareGovernanceSemanticSurvivability`
  - `compareGovernanceSemanticSustainability`
  - `compareGovernanceSemanticMaintainability`
  - `compareGovernanceSemanticEvolvability`

Not currently projected as graph-specific summaries/nodes/edges:

- Classification and review:
  - `compareClassification`
  - `compareReviewReadiness`
  - `compareEscalationReadiness`
  - `compareOperationalPriority`
- Ownership and actionability:
  - `compareOwnership`
  - `compareOwnerActionability`
- Operator guidance / message / summary / timeline:
  - `compareOperatorGuidance`
  - `compareOperatorMessage`
  - `compareOperatorSummary`
  - `compareOperatorTimeline`
- Decision / impact / attention:
  - `compareDecisionReadiness`
  - `compareOperationalImpact`
  - `compareOperationalAttention`
- Governance posture / disposition / retention:
  - `compareGovernancePosture`
  - `compareGovernanceDisposition`
  - `compareGovernanceRetention`
- Audit / explainability / reasoning coherence:
  - `compareGovernanceAuditTrail`
  - `compareGovernanceExplainability`
  - `compareGovernanceReasoningCoherence`
- Semantic drift / convergence / resilience / integrity / recoverability / continuity / degradation tolerance:
  - `compareGovernanceSemanticDrift`
  - `compareGovernanceSemanticConvergence`
  - `compareGovernanceSemanticResilience`
  - `compareGovernanceSemanticIntegrityBoundary`
  - `compareGovernanceSemanticRecoverability`
  - `compareGovernanceSemanticObservabilityContinuity`
  - `compareGovernanceSemanticDegradationTolerance`

Important detail gap:

- Rich metadata fields are not yet preserved:
  - `reason`
  - `*Reason`
  - `source`
  - `*Source`
  - `signals`
  - `*Signals`
  - `interpretation`
  - `noExecutionMeaning`
- Graph adapter creates generic reason text from mapping specs rather than source-specific route reasons.

Coverage gap conclusion:

- Current adapter is fit for fixture-driven Graph UI compatibility.
- It is not yet fit for complete real compare semantic coverage.
- B77-42 should either add mappings or explicitly define unsupported metadata as intentionally excluded from graph projection.

## 8. Validation Fixtures Needed

Future fixture set needed before `real_compare_readonly` is enabled:

- Full metadata fixture
  - Includes full route-like top-level compare metadata and `metadata: mappedResponse.metadata`.
  - Verifies which metadata source Graph Adapter should select.
- Missing metadata fixture
  - No `metadata`, no `responseMetadata`, no `rawPayloadMetadata`.
  - Expected result: unavailable graph and `missing_metadata` / `fallback_used` warnings.
- Nested object metadata fixture
  - Uses real metadata object shapes with id / value / reason / source / signals / interpretation.
  - Verifies value extraction and warnings.
- Partial lifecycle fixture
  - Includes survivability / sustainability / maintainability but missing evolvability, or similar lifecycle gaps.
  - Verifies partial graph vs unavailable threshold.
- Unsupported shape fixture
  - Metadata is array, primitive, or unsupported nested envelope.
  - Expected result: unavailable graph or typed unsupported shape warning.
- Drifted key fixture
  - Uses aliases or renamed keys such as `governanceSemanticOwnership`, `governanceSemanticActionability`, or missing `compare` prefix.
  - Verifies alias policy and warning behavior.
- Unavailable response fixture
  - Mirrors route unavailable response semantics: unavailable source, unverified scope, blocked confidence, unavailable freshness, unavailable evidence, unassessable risk.
  - Verifies `fallback_unavailable` or partial unavailable projection is chosen intentionally.
- Multiple source divergence fixture
  - Top-level compare metadata differs from `metadata: mappedResponse.metadata`.
  - Verifies source precedence.
- Enum drift fixture
  - Uses values like `risk_high`, `confidence_blocked`, `freshness_unavailable`, `survivability_unavailable`.
  - Verifies severity mapping does not understate risk.

## 9. Contract Guard Strategy

Type guard:

- Keep graph adapter input as `unknown`.
- Use `isRecord()` before reading object fields.
- Avoid direct property access without a guard.

Unknown handling:

- Treat unknown response shape as unsupported or unavailable.
- Do not coerce unknown data into healthy graph state.
- Preserve warning visibility for partial / normalized / unsupported cases.

Safe string normalization:

- Continue using `readString()` to avoid empty display values.
- Use documented aliases rather than ad hoc fallback chains.
- Normalize only display values, not business meaning.

Warnings:

- Continue typed warnings:
  - `missing_metadata`
  - `unsupported_metadata_shape`
  - `missing_value`
  - `incomplete_fixture`
  - `normalized_non_string_metadata`
  - `incomplete_relation`
  - `fallback_used`
  - `adapter_unavailable`
  - `graph_unavailable`
- Add future warnings for contract drift if needed:
  - `metadata_source_ambiguous`
  - `metadata_key_drift`
  - `unsupported_enum_value`
  - `rich_metadata_not_projected`

Unavailable fallback:

- Continue using `createUnavailableGraphData()` for unsafe source states.
- Avoid silent fallback from real data to mock data.
- Use unavailable graph when metadata source selection is ambiguous and cannot be validated.

No assertion-only mapping:

- Do not assume route response shape solely from TypeScript types.
- Validate real-like fixtures before adding real source mode.
- Avoid mapping by assertion when response can drift.

## 10. Read-only Boundary Review

This contract review is:

- read-only
- observability only
- documentation only
- no mutation
- no route change
- no fetch implementation
- no adapter implementation
- no UI implementation
- no production enablement

Boundary confirmations:

- `compare-readonly` remains `GET` only.
- Graph adapter remains pure projection.
- Graph UI remains display-only.
- Contract review does not create execution workflow, correction workflow, rebuild workflow, sync workflow, approval workflow, or remediation workflow.

## 11. Recommendation

Contract documentation readiness: Medium.

- Route, fetch adapter, edge mapper, inventory adapter, graph adapter, and graph UI all expose enough contract information to document the current chain.
- The exact graph adapter input source for real route response is not yet fixed.

Adapter coverage readiness: Medium.

- Core graph projection fields are covered.
- Broad route metadata coverage is not yet covered.
- Rich reason / source / signals preservation is not yet covered.

Fixture readiness: Low to Medium.

- One compare-response-shaped fixture exists and supports adapter fixture rendering.
- It does not cover full route response, unavailable response, source divergence, enum drift, or unsupported shape cases.

Real compare enablement readiness: Not yet.

- `real_compare_readonly` should not be enabled until response contract source selection, adapter coverage gaps, validation fixtures, fallback thresholds, and warning strategy are resolved.

Recommended next step:

- Proceed to B77-42 adapter coverage expansion only after deciding:
  - whether graph adapter should read top-level route compare metadata, `metadata: mappedResponse.metadata`, or a dedicated graph adapter input wrapper.
  - how to preserve rich reason / source / signals fields.
  - how to treat enum drift from route metadata values.

## 12. Future Phases

Candidate future phases:

- B77-42 adapter coverage expansion
  - Add or explicitly defer mappings for ownership, actionability, operator guidance, audit, explainability, reasoning coherence, drift, convergence, resilience, recoverability, observability continuity, and degradation tolerance.
- B77-43 contract validation fixtures
  - Add static fixtures for full response, unavailable response, partial lifecycle, unsupported shape, drifted key, enum drift, and source divergence.
- B77-44 read-only compare integration spike
  - Spike real compare projection as read-only display source after contract fixtures pass.
  - Keep no mutation, no POST, no workflow execution, and no production enablement.
- B77-45 real_compare_readonly guarded toggle
  - Add guarded `real_compare_readonly` mode only after explicit integration gate.
  - Keep production default conservative.

## 13. Out of Scope

B77-41 is documentation only.

Out of scope:

- implementation
- route change
- fetch
- adapter change
- UI change
- Supabase integration
- DB query
- DB schema change
- migration
- Edge Function change
- package install
- mutation
- POST
- execution workflow
- approval workflow
- remediation workflow
- production enablement

変更禁止:

- `apps/admin-dashboard/src/app`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- Edge Functions
- DB schema
- `services/api`

追加禁止:

- `fetch`
- `createClient`
- mutation implementation
- `POST` implementation
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`

This document is a contract review gate. It does not grant implementation permission, route change permission, adapter change permission, UI change permission, release permission, workflow permission, or mutation authority.
