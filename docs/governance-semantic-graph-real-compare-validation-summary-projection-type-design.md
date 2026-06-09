# Governance Semantic Graph Real Compare Validation Summary Projection Type Design

Phase B77-57 documentation.

このドキュメントは、B77-56 Real Compare Validation Summary Projection Design を前提に、`RealCompareValidationSummary` と `RealCompareGuardedAvailability` を将来 disclosure metadata へ投影するための type-only contract を整理する。

B77-57 では projection function、projection evaluator、UI wiring、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、POST、workflow approval、execution control は行わない。

## 1. Scope

B77-57 is projection type design only.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationProjectionTypes.ts` を追加する。
- Summary projection の future output shape を type-only で定義する。
- Disclosure status、projection reason、projection、disclosure metadata、Inspector metadata の型境界を固定する。
- Projection output が read-only explanation であり、execution authority ではないことを型で表現する。

Out of scope:

- projection function
- projection evaluator
- runtime projection
- UI component
- disclosure renderer
- Inspector renderer
- source option integration
- feature flag integration
- route implementation or route change
- fetch implementation
- DB / Supabase access
- adapter integration
- mutation

## 2. Type Boundary

The new type file is:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationProjectionTypes.ts
```

Allowed:

- `import type` from `inventoryIntegrityRealCompareValidationTypes.ts`
- type aliases only
- read-only disclosure status labels
- reason metadata labels
- projection metadata shape
- disclosure metadata shape
- Inspector metadata shape

Not allowed:

- function implementation
- runtime projection
- mapping import
- evaluator import
- adapter import
- UI import
- source option import
- feature flag import
- route import
- fetch
- DB / Supabase access
- mutation
- execution action

### Disclosure Status

`RealCompareValidationDisclosureStatus` classifies future disclosure display state.

Values:

- `passed`
- `warning`
- `blocked`
- `not_evaluated`
- `unavailable`

Interpretation:

- status is disclosure metadata only.
- status does not enable `real_compare_readonly`.
- status does not control source visibility.
- status does not trigger fallback execution.

### Projection Reason

`RealCompareValidationProjectionReason` carries the gate-level explanation.

Fields:

- `gateId`
- `message`
- `severity`

Interpretation:

- reasons are explanatory.
- reasons are not operator instructions.
- reasons do not include retry, repair, rebuild, sync, approval, or correction actions.

### Projection

`RealCompareValidationProjection` is the future source disclosure projection shape.

Fields:

- `sourceMode: "real_compare_readonly"`
- `disclosureStatus`
- `headline`
- `description`
- `reasons`
- `isReadOnly: true`
- `isActionable: false`
- `isExecutionAllowed: false`

Interpretation:

- `headline` and `description` are display text candidates.
- `reasons` preserve validation gate explanations.
- `isReadOnly`, `isActionable`, and `isExecutionAllowed` encode the read-only boundary.
- projection does not include action callbacks, URLs, route metadata, mutation payloads, or workflow state.

### Disclosure Metadata

`RealCompareValidationDisclosureMetadata` wraps a projection with derived disclosure booleans.

Fields:

- `projection`
- `hasBlockingFailure`
- `hasWarnings`
- `hasUnavailableCondition`

Interpretation:

- booleans are display metadata.
- booleans do not execute fallback.
- booleans do not alter source option behavior.

### Inspector Metadata

`RealCompareValidationInspectorMetadata` summarizes result counts for future Inspector display.

Fields:

- `summaryStatus`
- `totalResults`
- `blockingCount`
- `warningCount`
- `readOnly: true`

Interpretation:

- Inspector metadata is read-only explanation.
- counts are observability metadata.
- counts are not execution priority or operator task queues.

## 3. Read-only Contract

Projection types are observability metadata only.

Read-only contract:

- types do not contain execution callbacks.
- types do not contain action button metadata.
- types do not contain route invocation metadata.
- types do not contain fetch instructions.
- types do not contain mutation payloads.
- types do not contain approval workflow state.
- types do not connect to correction / rebuild / repair / replay / sync.
- types do not change `InventoryIntegrityGraphData`.
- types do not change source option behavior.
- types do not change feature flags.

Required invariant:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
```

Interpretation:

- A projection can say validation passed.
- A projection cannot enable `real_compare_readonly`.
- A projection can say validation is blocked.
- A projection cannot execute a block action.
- A projection can explain unavailable conditions.
- A projection cannot retry, repair, rebuild, sync, approve, or correct.

## 4. Guarded Rollout State

B77-57 does not change guarded rollout behavior.

The following conditions remain required:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
```

Current behavior preserved:

- `real_compare_readonly` remains hidden unless hidden flag and static admin guard both pass.
- `real_compare_readonly` remains disabled / guarded.
- `real_compare_readonly` remains non-live.
- Type definitions do not wire UI.
- Type definitions do not wire source option metadata.
- Type definitions do not alter feature flags.
- Type definitions do not fetch.
- Type definitions do not call API or route.
- Type definitions do not connect to DB / Supabase.

Guard interpretation:

- Hidden flag controls source option candidate visibility.
- Static admin guard controls admin-only candidate visibility.
- Validation summary and disclosure projection can inform readiness in future phases.
- Projection types do not bypass hidden flag or admin guard.
- Projection types keep enablement out of scope.

## 5. Future Candidate

Candidate future phases:

- Real Compare Validation Summary Projection Implementation
  - Implement a pure function from validation summary / guarded availability to projection metadata.
  - Keep implementation local, read-only, and action-free.
  - Do not wire UI in the same phase.
- Disclosure Metadata Projection
  - Define derived disclosure booleans and wording rules.
  - Keep blocked / warning / unavailable states explicit.
- Inspector Metadata Projection
  - Project counts and status into Inspector-safe metadata.
  - Keep counts explanatory, not operational tasks.
- Guarded Availability Wiring
  - Wire disclosure metadata only after design and tests.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.

Recommended order:

1. Real Compare Validation Summary Projection Implementation.
2. Disclosure Metadata Projection.
3. Inspector Metadata Projection.
4. Guarded Availability Wiring.
5. Later guarded read-only fetch design only after validation and disclosure evidence is accepted.

This document is a projection type design gate. It does not implement projection logic, expose a source option, fetch, call a route, authorize, mutate, or enable `real_compare_readonly`.
