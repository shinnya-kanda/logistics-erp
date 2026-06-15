# Governance Semantic Graph Real Compare Runtime Integration Plan

Phase B79-02 documentation.

このドキュメントは、B79-01 Real Compare Runtime Readiness Review を前提に、`real_compare_readonly` を将来 runtime integration する場合の接続順序と安全条件を整理する。

B79-02 は Design / Planning only である。implementation change、test change、route change、fetch adapter change、graph adapter change、validation change、projection change、UI change、source option change、feature flag change、real_compare_readonly enablement、fetch execution、API execution、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B79-02 is Runtime Integration Plan only.

Scope:

- Runtime integration の接続順序を整理する。
- 各 phase の verification target を整理する。
- 各 phase の safety gates と rollout gates を固定する。
- Runtime integration に進む前の exit criteria を明文化する。
- B79-03 Real Compare Route Verification Review へ進む前に、最初に確認する boundary を決める。

Out of scope:

- implementation change
- test change
- route change
- fetch adapter change
- graph adapter change
- validation change
- projection change
- UI change
- source option change
- feature flag change
- `real_compare_readonly` enablement
- fetch execution
- API execution
- DB / Supabase access
- adapter integration
- mutation
- execution control

## 2. Current State

Current state:

```text
Validation = implemented
Projection = implemented
Disclosure = implemented
ReadOnly Wiring = implemented
UI Metadata = implemented
Runtime Integration = not connected
```

Current state interpretation:

- Validation is available as local fixture mapping validation and fallback decision metadata.
- Projection is available as pure disclosure / inspector metadata.
- Disclosure is available as read-only explanation metadata.
- ReadOnly Wiring is available as metadata-only wiring targets with no UI connection.
- UI Metadata is available as display candidate metadata.
- Runtime Integration remains not connected across Route, Fetch Adapter, Validation, Graph Adapter, Presentation, and UI.

Current runtime gap remains:

```text
Route
↓
Fetch Adapter
↓
Validation
↓
Graph Adapter
↓
Presentation
↓
UI
```

The arrows describe the future planning sequence only. They are not runtime execution, fetch execution, route invocation, adapter integration, UI wiring, source option enablement, feature flag enablement, mutation, repair, rebuild, replay, sync, auto-fix, or workflow execution.

## 3. Integration Order

Recommended integration order:

1. Route Contract Verification
2. Fetch Adapter Verification
3. Validation Integration
4. Graph Adapter Integration
5. Presentation Integration
6. UI Review

This order is intentionally conservative:

- Verify the route contract before transport handoff.
- Verify the fetch adapter boundary before validation receives runtime-shaped input.
- Verify validation before graph normalization.
- Verify graph adapter behavior before presentation candidates.
- Verify presentation candidates before any UI review.
- Keep UI review last because it is the closest step to user-visible behavior and source interpretation.

### Phase 1: Route Contract Verification

Verification target:

- GET only
- read-only
- response shape

Plan:

- Review `compare-readonly` contract as a read-only response source.
- Confirm the contract does not expose write-oriented behavior.
- Confirm response shape categories remain compatible with validation review.
- Confirm unavailable, unsupported, drifted, and divergent response categories fail closed in downstream planning.

Safety requirements:

- No route change.
- No route execution.
- No DB / Supabase access.
- No mutation.
- No UI wiring.
- No `real_compare_readonly` enablement.

Exit condition:

- Route contract can be described as GET-only, read-only, and validation-input-candidate only.

### Phase 2: Fetch Adapter Verification

Verification target:

- transport only
- no validation decision
- no mutation

Plan:

- Review fetch adapter as a transport boundary.
- Confirm it preserves route response semantics without deciding validation or fallback.
- Confirm it forwards payload semantics as read-only input candidate only.
- Confirm transport error semantics remain available for validation without retry, repair, rebuild, replay, sync, or auto-fix behavior.

Safety requirements:

- No fetch adapter change.
- No fetch execution.
- No API execution.
- No adapter integration.
- No mutation.
- No source option integration.

Exit condition:

- Fetch adapter can be described as transport-only and safe to plan as a future handoff boundary.

### Phase 3: Validation Integration

Verification target:

- shape validation
- metadata validation
- fallback decision

Plan:

- Define how runtime-shaped input would be evaluated by validation before any graph adapter normalization.
- Preserve the existing fail-closed policy for unsupported shape, unavailable response, source divergence, enum drift, key drift, and missing metadata.
- Keep fallback decision as read-only metadata.
- Confirm validation output cannot enable source visibility, live data, execution controls, or UI actions.

Safety requirements:

- No validation change.
- No projection change.
- No runtime route input connection in this phase.
- No graph adapter execution.
- No UI wiring.
- No feature flag change.

Exit condition:

- Validation boundary can reject unsafe runtime-shaped inputs before graph normalization is considered.

### Phase 4: Graph Adapter Integration

Verification target:

- normalization
- presentation input generation

Plan:

- Define how validation-approved read-only candidates would be passed to graph adapter planning.
- Confirm graph adapter remains normalization-only.
- Confirm graph output remains graph display candidate data, warning candidate data, and fallback explanation candidate data.
- Confirm graph normalization cannot validate source trust, decide fallback, enable source options, or create workflows.

Safety requirements:

- No graph adapter change.
- No graph adapter execution.
- No adapter integration.
- No UI wiring.
- No source option integration.
- No mutation.

Exit condition:

- Graph adapter boundary can be planned as normalization-only and cannot bypass validation.

### Phase 5: Presentation Integration

Verification target:

- disclosure
- badge
- inspector
- fallback explanation

Plan:

- Define how graph presentation input would become display candidates.
- Preserve Disclosure as explanation only.
- Preserve Badge as status indication only.
- Preserve Inspector as inspection metadata only.
- Preserve Fallback Explanation as guarded or unavailable explanation only.
- Confirm presentation candidates remain non-actionable and non-live.

Safety requirements:

- No presentation component addition.
- No UI implementation.
- No UI wiring.
- No feature flag change.
- No source option integration.
- No `real_compare_readonly` enablement.

Exit condition:

- Presentation boundary can produce display candidates without rendering, wiring, triggering, enabling, or mutating.

### Phase 6: UI Review

Verification target:

- read-only rendering
- guarded rollout
- disabled state

Plan:

- Review what a future UI wiring design would need to preserve before any UI implementation is considered.
- Confirm read-only rendering policy remains visible.
- Confirm guarded rollout remains visible and not bypassable.
- Confirm disabled / non-live state remains explicit.
- Confirm no UI surface becomes an action surface, approval surface, repair surface, retry surface, source enablement surface, mutation surface, or execution surface.

Safety requirements:

- No UI change.
- No UI wiring.
- No graph section change.
- No source option change.
- No feature flag change.
- No `real_compare_readonly` enablement.

Exit condition:

- UI can be reviewed as a future read-only display target only, with no runtime enablement.

## 4. Safety Gates

Common safety gates for every phase:

- No mutation.
- No execution workflow.
- No repair workflow.
- No auto-fix.
- No enablement.

Expanded safety gates:

- No correction workflow.
- No rebuild workflow.
- No replay workflow.
- No sync workflow.
- No approval workflow.
- No retry workflow.
- No source option activation.
- No feature flag activation.
- No live data claim.
- No bypass of guarded rollout.

Safety interpretation:

- A phase may review contracts, boundaries, and planning sequence.
- A phase may not execute the corresponding runtime handoff unless a later explicit implementation phase allows it.
- A phase may not convert read-only metadata into commands, jobs, operator actions, or mutation payloads.

## 5. Rollout Gates

Rollout gates remain:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isEnabled = false
isGuarded = true
isLiveData = false
```

Rollout gate interpretation:

- `ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE` remains false.
- `ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE` remains false.
- `isEnabled` remains false.
- `isGuarded` remains true.
- `isLiveData` remains false.
- UI wiring remains none.
- Source option integration remains none.

Rollout gate policy:

- Runtime integration planning does not modify rollout gates.
- Passing a verification phase does not enable source visibility.
- Passing all verification phases still does not enable live data without an explicit later enablement review.

## 6. Runtime Exit Criteria

Runtime connection must not proceed until the following conditions are satisfied:

- route contract verified
- fetch boundary verified
- validation boundary verified
- graph boundary verified
- presentation boundary verified
- read-only contract maintained

Read-only contract:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
```

Exit criteria interpretation:

- Route contract must be accepted before fetch adapter planning proceeds.
- Fetch boundary must be accepted before validation integration planning proceeds.
- Validation boundary must be accepted before graph adapter planning proceeds.
- Graph boundary must be accepted before presentation planning proceeds.
- Presentation boundary must be accepted before UI review proceeds.
- Read-only and guarded rollout state must be maintained through every phase.

## 7. Risks

### Response Shape Drift

Risk:

- Runtime response shape may differ from reviewed fixture or contract shapes.

Mitigation:

- Route verification must classify response shape before downstream planning.
- Unsupported shape must fail closed.

### Metadata Drift

Risk:

- Expected metadata may be missing, renamed, nested differently, stale, or incomplete.

Mitigation:

- Validation must preserve metadata caveats.
- Graph adapter must not normalize missing metadata into healthy graph state.

### Enum Drift

Risk:

- Known enum values may drift into unknown values and understate risk, severity, confidence, or fallback posture.

Mitigation:

- Validation must block unsafe enum drift.
- Presentation must keep drift as explanation, not as source readiness.

### Source Divergence

Risk:

- Top-level metadata, response metadata, raw payload metadata, and nested metadata may disagree.

Mitigation:

- Validation must fail closed until precedence policy is explicit.
- Fetch adapter must not choose source precedence.
- Graph adapter must not silently select a source.

### Unsupported Shape

Risk:

- Runtime payload may be null, primitive, array, or unsupported object.

Mitigation:

- Validation must classify unsupported shape as blocked or unavailable.
- Graph adapter must not coerce unsupported shape into graph data.

## 8. Recommended Next Phase

Recommended next phase:

```text
B79-03 Real Compare Route Verification Review
```

Recommended content:

- `compare-readonly` GET contract review
- response shape verification plan
- route response category review
- route output to validation input candidate policy
- fail-closed policy for unavailable, unsupported, drifted, and divergent route responses

B79-03 should remain review-only and must not execute the route.

## 9. Non-goals

B79-02 does not include:

- No implementation.
- No tests.
- No route changes.
- No fetch adapter changes.
- No graph adapter changes.
- No validation changes.
- No projection changes.
- No UI changes.
- No source option changes.
- No feature flag enablement.
- No `real_compare_readonly` enablement.
- No fetch.
- No API execution.
- No route execution.
- No DB / Supabase.
- No adapter integration.
- No UI wiring.
- No mutation.
- No correction.
- No repair.
- No rebuild.
- No replay.
- No sync.
- No auto-fix.
- No execution control.
- No package install.

変更禁止:

- `apps/admin-dashboard/src/app/**`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityGraphAdapter.ts`
- `api/inventory-integrity/compare-readonly/route.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- Edge Functions
- DB schema
- `services/api`

追加禁止:

- fetch implementation pattern
- Supabase client creation pattern
- insert / update / upsert / delete / RPC mutation pattern
- POST route export pattern

## 10. Closing Plan

B79-02 defines the safe planning order:

```text
Route Contract Verification
↓
Fetch Adapter Verification
↓
Validation Integration
↓
Graph Adapter Integration
↓
Presentation Integration
↓
UI Review
```

The plan recommends B79-03 as Route Verification Review because route contract verification is the first safe boundary before any runtime handoff can be considered.

This plan does not implement, test, wire, execute, fetch, call, mutate, enable, or connect real data.
