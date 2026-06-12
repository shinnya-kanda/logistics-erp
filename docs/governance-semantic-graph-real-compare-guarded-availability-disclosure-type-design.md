# Governance Semantic Graph Real Compare Guarded Availability Disclosure Type Design

Phase B77-61 documentation.

このドキュメントは、B77-60 Real Compare Guarded Availability Disclosure Design を前提に、Guarded Availability を将来 Disclosure Metadata / Badge Metadata / Inspector Metadata へ投影するための type-only contract を整理する。

B77-61 では disclosure function、projection function、badge projection function、Inspector projection function、renderer、React component、UI wiring、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、POST、workflow approval、execution control は行わない。

## 1. Scope

B77-61 is guarded availability disclosure type design only.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes.ts` を追加する。
- guarded availability disclosure の future display shape を type-only で定義する。
- Badge metadata、disclosure metadata、Inspector metadata、display bundle の型境界を固定する。
- Display output が read-only explanation であり、source enablement や execution authority ではないことを型で表現する。

Out of scope:

- disclosure function
- projection function
- badge projection function
- Inspector projection function
- runtime projection
- renderer
- React component
- UI wiring
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
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes.ts
```

Allowed:

- type aliases only
- badge status labels
- badge metadata shape
- disclosure metadata shape
- Inspector metadata shape
- display bundle shape
- read-only invariant fields

Not allowed:

- function implementation
- runtime projection
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

### Badge Status

`RealCompareGuardedAvailabilityBadgeStatus` classifies future guarded availability display state.

Values:

- `passed`
- `warning`
- `blocked`
- `unavailable`
- `guarded`

Interpretation:

- status is display metadata only.
- status does not enable `real_compare_readonly`.
- status does not control source visibility.
- status does not trigger fallback execution.
- `guarded` is the safe default for not-ready or not-exposed states.

### Badge Metadata

`RealCompareGuardedAvailabilityBadgeMetadata` carries compact source badge metadata.

Fields:

- `status`
- `label`
- `description`
- `isReadOnly: true`

Interpretation:

- badge metadata is state display only.
- badge label is not an action label.
- badge description is explanatory, not instructional.
- badge metadata does not contain action callbacks.

### Disclosure Metadata

`RealCompareGuardedAvailabilityDisclosureMetadata` carries future disclosure text and reasons.

Fields:

- `status`
- `headline`
- `description`
- `reasons`
- `isReadOnly: true`
- `isActionable: false`
- `isExecutionAllowed: false`

Interpretation:

- disclosure metadata explains guarded availability.
- reasons are explanatory strings.
- `isReadOnly`, `isActionable`, and `isExecutionAllowed` encode the read-only boundary.
- disclosure metadata does not include action buttons, route metadata, mutation payloads, or workflow state.

### Inspector Metadata

`RealCompareGuardedAvailabilityInspectorMetadata` summarizes future Inspector display counts.

Fields:

- `status`
- `totalReasons`
- `readOnly: true`

Interpretation:

- Inspector metadata is explanation-only.
- `totalReasons` is an observability count.
- `totalReasons` is not an action queue, task count, or workflow priority.

### Display Bundle

`RealCompareGuardedAvailabilityDisplayBundle` groups future display metadata.

Fields:

- `badge`
- `disclosure`
- `inspector`

Interpretation:

- display bundle is a read-only metadata package.
- display bundle does not render UI.
- display bundle does not connect to source options.
- display bundle does not enable `real_compare_readonly`.

## 3. Read-only Contract

Guarded availability disclosure types are observability metadata only.

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
readOnly = true
```

Interpretation:

- A badge can say validation passed.
- A badge cannot enable `real_compare_readonly`.
- A disclosure can explain guarded state.
- A disclosure cannot change guarded state.
- Inspector metadata can summarize reasons.
- Inspector metadata cannot retry, repair, rebuild, sync, approve, correct, or execute workflows.

## 4. Guarded Rollout State

B77-61 does not change guarded rollout behavior.

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
- Validation disclosure can inform future readiness display.
- Guarded availability disclosure types do not bypass hidden flag or admin guard.
- Guarded availability disclosure types keep enablement out of scope.

## 5. Future Candidate

Candidate future phases:

- Disclosure Projection Implementation
  - Implement a pure function from guarded availability and validation disclosure metadata to display bundle.
  - Keep implementation local, read-only, and action-free.
  - Do not wire UI in the same phase.
- Badge Projection Implementation
  - Define status label and description mapping.
  - Keep badge display-only and non-actionable.
- Inspector Projection Implementation
  - Project reason counts and status into Inspector-safe metadata.
  - Keep counts explanatory, not operational tasks.
- Read-only Disclosure Wiring
  - Design where badge / disclosure / Inspector metadata may be shown.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.

Recommended order:

1. Disclosure Projection Implementation.
2. Badge Projection Implementation.
3. Inspector Projection Implementation.
4. Read-only Disclosure Wiring.
5. Later guarded read-only fetch design only after disclosure type and projection evidence are accepted.

This document is a guarded availability disclosure type design gate. It does not implement projection logic, expose a source option, fetch, call a route, authorize, mutate, or enable `real_compare_readonly`.
