# Governance Semantic Graph Real Compare Data Validation Review

Phase B77-40 documentation.

このドキュメントは、B77-30 から B77-39 で整備した compare fixture -> graph adapter -> `InventoryIntegrityGraphData` -> Graph UI の read-only projection を前提に、real compare data integration へ進む前の validation review gate を整理する documentation-only phase である。

今回は review document のみを追加する。fetch implementation、route change、API integration、UI change、Supabase integration、DB query、mutation、POST、workflow execution は行わない。

## 1. Review Scope

B77-40 の review scope は次の read-only integration boundary に限定する。

- `compare-readonly` response
  - `GET` only の read-only compare source として扱う。
  - `inventory_transactions` を truth source、`inventory_current` を cache compare target とする前提を維持する。
  - response metadata は correction、rebuild、sync、approval、workflow execution の authority ではない。
- graph adapter
  - `inventoryIntegrityGraphAdapter` の pure function boundary を review する。
  - input は unknown compare response / fixture-like response とし、metadata extraction と normalization で安全に読む。
  - adapter は fetch、route call、Supabase client、DB query、mutation を持たない。
- graph data contract
  - `InventoryIntegrityGraphData` の metadata / summaries / nodes / edges / legend / view modes / default selection を review する。
  - graph data は visualization input であり、command payload ではない。
- graph source toggle
  - `mock`、`adapter_fixture`、`fallback_unavailable` の source mode、trust level、disclosure、caveat を review する。
  - `real_compare_readonly` はまだ exposed mode ではなく、future integration gate の対象である。
- graph unavailable state
  - `createUnavailableGraphData()` と `fallback_unavailable` UI が normal data と誤認されないかを review する。
  - missing metadata / unsupported shape / adapter unavailable / fallback used の visibility を review する。
- graph UI rendering
  - `InventoryIntegrityGraphSection` と `StaticGraphPrototype` への data-driven rendering path を review する。
  - rendering は read-only observability UI であり、action panel ではない。

## 2. Current Architecture Review

現状の implemented review path は次の通り。

```text
compare fixture
↓
graph adapter
↓
InventoryIntegrityGraphData
↓
Graph UI
```

Current state:

- `sampleInventoryIntegrityCompareResponseFixture` は real compare response に近い static fixture として存在する。
- `buildInventoryIntegrityGraphData()` は fixture-like response から metadata を抽出し、summary / node / edge / graph metadata へ projection する。
- `extractGraphFixtureMetadata()` は fixture metadata extraction status を UI disclosure に使える。
- `createUnavailableGraphData()` は adapter failure / missing metadata / unsupported shape の safe fallback graph を返す。
- `InventoryIntegrityGraphSection` は `mock` / `adapter_fixture` / `fallback_unavailable` を local display source として切り替え、同じ `InventoryIntegrityGraphData` contract を `StaticGraphPrototype` に渡せる。
- `adapter_fixture` は read-only compare fixture projection として表示され、not live compare data と明示される。
- `fallback_unavailable` は graph unavailable / safety fallback / unavailable projection として表示され、normal graph と区別される。

Architecture review conclusion:

- Fixture projection architecture は read-only Graph UI validation として成立している。
- Real compare integration architecture は documentation 上は整理されているが、実装上はまだ transport / real response contract / feature gate が未接続である。
- B77-40 時点では real compare data integration を有効化せず、次 phase で response contract review と adapter coverage expansion を行うのが安全である。

## 3. Real Compare Integration Readiness

Adapter readiness: partially ready.

- Ready:
  - `unknown` input を受ける pure adapter として構成されている。
  - `metadata` / `responseMetadata` / `rawPayloadMetadata` の候補から metadata record を選べる。
  - non-string object metadata から代表値を抽出する normalization path がある。
  - missing metadata / unsupported shape は warnings と unavailable fallback に倒せる。
- Not yet ready:
  - real `compare-readonly` response contract の全 metadata chain を網羅していない。
  - real response の top-level placement、payload nesting、metadata naming drift を専用 fixture で検証していない。
  - reason / source / signals の rich metadata は現在 value 中心の projection に寄っている。

Graph contract readiness: ready for fixture projection, partially ready for real compare.

- Ready:
  - `InventoryIntegrityGraphData` は metadata、summaries、nodes、edges、legend、viewModes、default selection を持つ。
  - `StaticGraphPrototype` は graph data contract から data-driven rendering できる。
  - read-only meaning / no execution route を edge and UI surface に出せる。
- Not yet ready:
  - source disclosure と warnings は UI composition 側で補っており、graph data contract 自体には warnings field がない。
  - real compare source identity、contract version、response provenance を graph metadata にどこまで持たせるかは未確定である。

Fallback readiness: ready for current gate.

- `createUnavailableGraphData()` は unavailable summary / placeholder node / placeholder edge を返す。
- fallback graph は `GET` method、read-only boundary、no execution meaning を持つ。
- B77-39 で fallback が normal data に見えない wording へ refinement 済みである。
- Future real integration では real response failure / fetch failure / contract mismatch を同じ unavailable surface に接続する validation が必要である。

Unavailable state readiness: ready for current gate.

- `fallback_unavailable` mode は source option、header badge、unavailable panel、warning badge、Inspector caveat で明示される。
- `Graph Unavailable / グラフ利用不可`、`Safety Fallback Active / 安全側フォールバック中`、`Unavailable Projection / 利用不可状態の投影` が visible である。
- `Not Live Compare Data / 実比較データではありません` と `No Execution Action / 実行操作はありません` が表示される。

Source toggle readiness: partially ready.

- Ready:
  - `mock`、`adapter_fixture`、`fallback_unavailable` は typed source mode として整理済みである。
  - trustLevel、disclosure、caveat、isLiveData を source option として持つ。
  - current toggle は local display state であり workflow transition ではない。
- Not yet ready:
  - `real_compare_readonly` は future candidate only であり、active mode として存在しない。
  - production default policy / environment gate / build-time gate は実装されていない。

Warning visibility readiness: ready for fixture and fallback, partially ready for real compare.

- Ready:
  - adapter warnings は typed union として定義されている。
  - warning count、compact list、Inspector caveat として表示できる。
  - fallback reasons は missing metadata / unsupported metadata shape / adapter unavailable / fallback used として可視化される。
- Not yet ready:
  - real compare data 由来の high-volume warnings を grouping / dedup / severity ordering する policy は未実装である。
  - warnings を graph data contract に含めるか、source result wrapper として持つかは次 phase で決める必要がある。

## 4. Compare Response Coverage Review

Current graph adapter coverage:

- `compareSeverity`
  - summary: yes, node: yes, edge influence: yes.
  - severity -> risk relation に使用される。
- `compareRisk`
  - summary: yes, node: yes, edge influence: yes.
  - risk -> survivability relation に使用される。
- `compareEvidence`
  - summary: yes, node: yes, edge influence: yes.
  - evidence -> confidence relation に使用される。
- `compareConfidence`
  - summary: yes, node: yes, edge influence: yes.
  - confidence -> stability relation に使用される。
- `compareProjectionFreshness`
  - summary: no in current summary list, node: yes, edge influence: yes.
  - freshness -> confidence relation に使用される。
- `compareTruthAggregationQuality`
  - summary: no in current summary list, node: yes, edge influence: no current edge.
- `compareInterpretationStability`
  - summary: yes, node: yes, edge target: yes.
- `compareGovernanceSemanticSurvivability`
  - summary: yes, node: yes, edge influence: yes.
- `compareGovernanceSemanticSustainability`
  - summary: yes, node: yes, edge influence: yes.
- `compareGovernanceSemanticMaintainability`
  - summary: yes, node: yes, edge influence: yes.
- `compareGovernanceSemanticEvolvability`
  - summary: yes, node: yes, edge target: yes.

Currently normalized by adapter field reading:

- direct string value.
- object value with keys such as preferred key, short key, `value`, `state`, `level`, `status`, `classification`, `severity`, `readiness`, `priority`, `operatorSummary`.
- fallback field names such as `projectionFreshness`, `truthAggregationQuality`, `compareEvidence`, `compareRisk`, `interpretationStability`, `governanceSemanticSurvivability`, `governanceSemanticSustainability`, `governanceSemanticMaintainability`, `governanceSemanticEvolvability`.

Unsupported or not fully projected candidates:

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

Coverage review conclusion:

- Current adapter covers the core risk / evidence / confidence / freshness / stability / lifecycle chain needed for Graph UI compatibility.
- It does not yet cover the broader real endpoint metadata chain exposed by fetch adapter, edge response mapper, inventory adapter, and compare-readonly route.
- Before enabling real compare data, B77-41 / B77-42 should confirm the real response shape and expand adapter coverage deliberately.

## 5. Data Contract Review

`InventoryIntegrityGraphData` metadata:

- Current metadata includes title, activeLayer, generatedAt, compareEndpointMethod, readOnlyBoundary, noExecutionMeaning.
- This is sufficient for fixture projection and unavailable state.
- Real compare integration may need additional source identity, response contract version, fixture / real source disclosure, and warning summary outside or inside graph data.

Summaries:

- Current summaries are safety-first display cards with id, title, value, severity, description, shortDescription, priority, relatedNodeId, relatedPathId.
- Summary priority is reading order, not execution priority.
- Current adapter excludes freshness and truth quality summaries even though nodes exist, which is acceptable for density but should be documented as intentional or expanded later.

Nodes:

- Current nodes include source semantic type, label, value, severity, reason, source, signals.
- Current node reasons are generic adapter projection wording, not rich real metadata reason extraction.
- Real integration should decide how to preserve source reason / interpretation / caveat / signal arrays.

Edges:

- Current edges define semantic relation type, display label, semantic category, path meaning, read-only meaning, description, severity, source.
- Edge direction is semantic interpretation direction, not workflow route.
- Current edge set is adequate for fixture graph readability but does not represent all possible real compare metadata dependencies.

Source disclosure:

- Source disclosure currently lives in `inventoryIntegrityGraphDataSourceOptions` and `InventoryIntegrityGraphSection`.
- This keeps graph data contract focused but means source disclosure is not portable with `InventoryIntegrityGraphData` alone.
- Future real integration should decide whether source metadata belongs in graph data metadata or in a wrapper result.

Warnings:

- Warnings are returned by `InventoryIntegrityGraphAdapterResult`, not embedded in `InventoryIntegrityGraphData`.
- UI can show warnings for current local source modes.
- Future integration should preserve warnings across transport / adapter / UI boundaries without turning them into action prompts.

Data contract conclusion:

- Contract readiness is high for fixture rendering.
- Contract readiness is medium for real compare because warning carriage, real source identity, and rich metadata preservation remain open.

## 6. Fallback Review

Missing metadata:

- `extractFixtureMetadata()` returns `missing_metadata`, `adapter_unavailable`, `fallback_used` when the response is not a record.
- If metadata-like records are absent, it returns `missing_metadata`, `unsupported_metadata_shape`, `adapter_unavailable`, `fallback_used`.
- `buildInventoryIntegrityGraphData()` returns `createUnavailableGraphData()` when metadata cannot be extracted.

Unsupported shape:

- Non-record metadata is treated as unsupported and falls back safely.
- Non-string metadata objects are normalized to representative display values and emit `normalized_non_string_metadata`.
- Shape normalization is useful but may hide detail loss unless warnings remain visible.

Adapter unavailable:

- `adapter_unavailable` is a typed warning.
- `fallback_unavailable` UI displays adapter unavailable as a cause.
- The unavailable projection is explicit and not presented as healthy graph data.

Incomplete fixture:

- Missing expected metadata values emit `incomplete_fixture` and `missing_value`.
- Current adapter still creates graph nodes with `unavailable` values for missing fields.
- This is acceptable for fixture validation but should be reviewed for real data: high missingness may need unavailable graph rather than partial graph.

Is `createUnavailableGraphData()` sufficient?

- Sufficient for current B77-40 gate:
  - It returns a valid `InventoryIntegrityGraphData`.
  - It includes graph unavailable metadata, placeholder summary, placeholder node, placeholder edge, read-only meaning, and default ids.
  - It can be rendered by the same UI without special graph engine changes.
- Remaining improvements for future real integration:
  - Allow reason-specific unavailable graph generation, for example missing metadata vs unsupported response shape vs transport unavailable.
  - Preserve original warning list or reason list in a wrapper result.
  - Add validation fixture cases for null response, missing metadata, unsupported nesting, partial metadata, and real-like full response.

Fallback review conclusion:

- Fallback readiness is high for current fixture and UI validation.
- Fallback readiness is medium for real compare until real response failure modes are validated with fixtures.

## 7. UI Readiness Review

Source mode visibility:

- Graph Source panel displays selected source mode, source label, trust, disclosure, caveat, live data flag, and display-only toggle wording.
- Current modes are `mock`, `adapter_fixture`, `fallback_unavailable`.

Trust visibility:

- `Demo only`, `Adapter verification only`, and `Safety fallback` are visible.
- Trust level is also shown in Inspector for summary detail.

Disclosure visibility:

- `adapter_fixture` shows read-only compare fixture projection and not live compare data.
- `fallback_unavailable` shows unavailable graph projection and not healthy graph caveat.
- Projection path is visible for mock, adapter fixture, and unavailable fallback.

Warning visibility:

- Warning count and compact warning list are visible.
- Warning labels are typed and bilingual enough for fallback causes.
- Inspector includes warning causes and cause detail for unavailable summary state.

Unavailable visibility:

- B77-39 added explicit graph unavailable header / safety fallback / unavailable projection wording.
- Fallback graph is distinguished from normal graph and from live compare data.
- No workflow action wording is visible.

Accessibility:

- Buttons are display-only and use ARIA labels that explain display change only / no execution action.
- Keyboard navigation text explains Tab / Enter / Space as detail display only.
- Inspector uses `aria-live` and tablist semantics for read-only detail switching.
- Color is not the only signal; badges and text labels carry read-only, warning, unavailable, source, and trust semantics.

UI readiness conclusion:

- UI readiness is high for fixture, source disclosure, warning visibility, and unavailable state.
- UI readiness is medium for real compare because `real_compare_readonly` mode, loading/unavailable transitions, and production source policy are not implemented.

## 8. Read-only Boundary Review

Maintained boundaries:

- Read Only
  - Graph UI and adapter are read-only projection surfaces.
  - Graph data is visualization input, not command payload.
- Observability Only
  - Summary, node, edge, source, warning, and Inspector surfaces are metadata reading surfaces.
  - View mode and source mode are display state, not business state.
- GET Only
  - `compare-readonly` remains documented as GET-only.
  - Graph adapter output keeps `compareEndpointMethod: "GET"`.
- No Mutation
  - Graph adapter has no DB write, Supabase mutation, route mutation, or inventory data change.
  - Graph UI has no mutation path.
- No Execution Workflow
  - Source toggle is display-only.
  - Node / edge / summary / inspector interactions change local detail only.
  - Fallback is not a repair instruction.

Boundary review conclusion:

- Read-only boundary is preserved for B77-40.
- Real integration must keep fetch / route / DB responsibilities outside Graph UI and keep `compare-readonly` as GET-only.

## 9. Risks

- Compare response shape drift
  - Real endpoint may nest metadata differently than fixture.
  - Top-level `metadata` / `responseMetadata` / `rawPayloadMetadata` may be insufficient for future response envelopes.
- Metadata naming drift
  - Real endpoint fields may use source-specific names or nested object fields not recognized by `readMetadataField()`.
- Incomplete mapping
  - Current adapter covers a subset of the real compare metadata chain.
  - Operational, ownership, governance posture, audit, explainability, semantic drift, convergence, resilience, recoverability, observability continuity, and degradation tolerance are not yet projected.
- Warning overload
  - Real response may generate many partial / normalized / missing warnings.
  - Compact warning surface may become noisy without grouping.
- Unavailable state confusion
  - If real compare fails and fallback is shown without clear source disclosure, users may misunderstand unavailable projection as a healthy graph.
- Partial data overconfidence
  - Missing metadata currently can produce node values as `unavailable` while still rendering a graph.
  - A threshold for when partial becomes unavailable is not yet defined.
- Source toggle misuse
  - Exposing real source without explicit gate could make review/demo data appear production-ready.
- Contract ambiguity
  - Warnings are outside `InventoryIntegrityGraphData`, while source disclosure is outside graph data as UI option.
  - Future data flow must preserve these surfaces consistently.

## 10. Mitigation

- Adapter normalization
  - Keep `unknown` input and type guard boundary.
  - Add real response contract fixtures before adding real source mode.
  - Extend field readers intentionally with documented naming aliases.
- Warning strategy
  - Keep typed warnings.
  - Add grouping for missing / unsupported / normalized / incomplete / fallback warnings.
  - Keep warnings as read-only caveats, not action prompts.
- Fallback strategy
  - Continue using `createUnavailableGraphData()` for unsafe or unsupported states.
  - Add reason-specific unavailable fixtures.
  - Avoid silent fallback from real compare to mock data.
- Disclosure strategy
  - Keep source mode, trust level, disclosure, caveat, projection path, and live data flag visible.
  - Add `real_compare_readonly` only after integration gate passes.
  - Keep `Not Live Compare Data` for fixture and `Graph Unavailable` for fallback.
- Validation fixtures
  - Add fixtures for full real-like compare response, missing metadata, unsupported metadata shape, partial metadata, non-string metadata, and unknown nesting.
  - Verify adapter warnings and UI warning display against these fixtures.
- Contract strategy
  - Decide whether warnings and source disclosure belong in `InventoryIntegrityGraphData.metadata` or in an adapter result wrapper.
  - Preserve response provenance and contract version before real integration.

## 11. Integration Gate Review

`real_compare_readonly` must remain disabled until all conditions below are satisfied.

Gate conditions:

1. `compare-readonly` contract confirmed.
   - Response envelope, metadata placement, field naming, optional fields, and unavailable cases are documented.
   - Endpoint remains `GET` only.
2. Adapter coverage confirmed.
   - Core fields are projected correctly.
   - Unsupported fields are either deliberately out of scope or mapped to warning / unavailable caveats.
   - No real response shape silently becomes healthy graph data when metadata is missing.
3. Fallback validated.
   - Missing metadata, unsupported shape, adapter unavailable, incomplete fixture, and partial metadata fixtures are verified.
   - `createUnavailableGraphData()` remains valid `InventoryIntegrityGraphData`.
4. Unavailable state validated.
   - Graph UI clearly shows Graph Unavailable / Safety Fallback / Not Live Compare Data / No Execution Action.
   - Fallback is not confused with normal data.
5. Warning visibility validated.
   - Adapter warnings are visible as compact badge/list and Inspector detail.
   - Warning overload policy is defined for real responses.
6. Source toggle gate confirmed.
   - `real_compare_readonly` is added only behind explicit configuration or separate integration spike.
   - Production default does not switch to real compare automatically.
7. Build / type / lint passed.
   - Admin dashboard build succeeds.
   - TypeScript and linter checks pass for changed files.
8. No mutation confirmed.
   - No POST.
   - No DB write.
   - No Supabase mutation.
   - No workflow execution.
9. No silent mock fallback.
   - Real compare failure must show fallback unavailable or explicit unavailable state, not mock data.
10. Documentation updated.
   - Integration boundary, validation fixtures, fallback policy, and production gate are documented before real connection.

Gate conclusion:

- B77-40 does not pass the full real integration gate yet.
- It confirms that the gate checklist is known and that current fixture/fallback/UI readiness is sufficient to proceed to B77-41.

## 12. Recommendation

Documentation readiness: High.

- The docs clearly define read-only observability boundaries, adapter responsibilities, UI responsibilities, fallback strategy, source toggle strategy, and integration gates.
- B77-40 adds the pre-integration validation review needed before real compare data is enabled.

Adapter readiness: Medium.

- The adapter can project real-like fixture metadata into graph data and has safe fallback behavior.
- It does not yet cover the full real compare metadata chain and needs response contract validation plus coverage expansion.

Graph contract readiness: Medium to High.

- `InventoryIntegrityGraphData` is stable enough for fixture rendering and unavailable projection.
- Real integration needs a decision on warnings, source provenance, contract version, and rich metadata preservation.

Fallback readiness: High for current gate, Medium for real integration.

- The unavailable graph is explicit and renderable.
- Future work should validate real failure modes and possibly add reason-specific unavailable output.

UI readiness: High for fixture/fallback, Medium for real compare.

- Source, trust, disclosure, warnings, and unavailable state are visible.
- `real_compare_readonly` mode and production source policy are not implemented, which is appropriate for B77-40.

Real compare integration readiness: Medium.

- The architecture is ready to review and validate, but not ready to enable.
- Next phases should focus on contract review and adapter coverage before any integration spike.

Production enablement readiness: Low.

- Production should not enable real graph source until contract, adapter coverage, fallback validation, warning strategy, and explicit gate are complete.
- Conservative default should remain `mock`, `adapter_fixture`, or `fallback_unavailable` until real compare is verified.

Overall recommendation:

- Proceed to B77-41 compare response contract review.
- Do not implement real fetch, route changes, production source selection, or UI redesign in B77-40.
- Keep `real_compare_readonly` behind a separate read-only integration gate.

## 13. Future Phases

Candidate future phases:

- B77-41 compare response contract review
  - Confirm real `compare-readonly` response envelope, metadata placement, field names, optionality, and unavailable cases.
  - Document exact adapter input contract before implementation changes.
- B77-42 adapter coverage expansion
  - Expand adapter mapping for additional real metadata candidates.
  - Add intentional omissions and warning mappings for unsupported semantics.
- B77-43 real compare fixture validation
  - Add static real-like fixtures only.
  - Validate full, partial, missing metadata, unsupported shape, and unavailable cases without fetch.
- B77-44 real compare integration spike
  - Spike `real_compare_readonly` as a read-only display source only after B77-41 to B77-43 pass.
  - Keep no mutation, no POST, no workflow execution, and no production enablement.

## 14. Out of Scope

B77-40 is documentation only.

Out of scope:

- fetch implementation
- route change
- API integration
- UI redesign
- Supabase integration
- DB query
- DB schema change
- migration
- Edge Function change
- package install
- mutation
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

This document is a review gate. It does not grant implementation permission, release permission, workflow permission, or mutation authority.
