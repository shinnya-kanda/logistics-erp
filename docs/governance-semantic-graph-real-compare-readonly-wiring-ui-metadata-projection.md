# Governance Semantic Graph Real Compare Read-only Wiring UI Metadata Projection

Phase B77-71 documentation.

このドキュメントは、B77-70 Real Compare Read-only Wiring UI Metadata Type Design を前提に、`RealCompareReadOnlyWiringBundle` から `RealCompareReadOnlyUiMetadataBundle` を生成する pure / local / read-only UI metadata projection の境界を整理する。

B77-71 では UI integration、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、fixture payload import、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-71 is pure read-only UI metadata projection.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyUiMetadataProjection.ts` を追加する。
- input は `RealCompareReadOnlyWiringBundle` に限定する。
- output は `RealCompareReadOnlyUiMetadataBundle` に限定する。
- wiring bundle の `displayBundle` から Disclosure / Badge / Inspector UI metadata を生成する。
- output が read-only / non-actionable / non-executable / non-live であることを固定する。

Out of scope:

- UI integration
- source option integration
- feature flag integration
- real compare enablement
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- fixture payload import
- real data connection
- production enablement

Implementation files:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyUiMetadataProjection.ts
docs/governance-semantic-graph-real-compare-readonly-wiring-ui-metadata-projection.md
```

Allowed boundary:

- `import type` only.
- read `RealCompareReadOnlyWiringBundle`.
- return `RealCompareReadOnlyUiMetadataBundle`.
- file-local helper functions only if needed.
- exported projection function only.

Not allowed:

- route import
- adapter import
- UI import
- source option import
- feature flag import
- fixture payload import
- fetch
- DB / Supabase access
- mutation
- execution action

## 2. Projection Rules

The projection builds a UI metadata bundle from an already-projected read-only wiring bundle.

### Disclosure Metadata Projection

Projection rules:

- `status` is copied from `wiringBundle.displayBundle.disclosure.status`.
- `headline` is copied from `wiringBundle.displayBundle.disclosure.headline`.
- `description` is copied from `wiringBundle.displayBundle.disclosure.description`.
- `reasons` is copied from `wiringBundle.displayBundle.disclosure.reasons`.
- `isReadOnly` is always `true`.
- `isActionable` is always `false`.
- `isExecutionAllowed` is always `false`.

Interpretation:

- Disclosure metadata explains read-only guarded availability only.
- Disclosure metadata does not create a command surface.
- Disclosure metadata does not select, enable, fetch, or execute anything.

### Badge Metadata Projection

Projection rules:

- `status` is copied from `wiringBundle.displayBundle.badge.status`.
- `label` is copied from `wiringBundle.displayBundle.badge.label`.
- `description` is copied from `wiringBundle.displayBundle.badge.description`.
- `isReadOnly` is always `true`.

Interpretation:

- Badge metadata is compact display state only.
- Badge metadata does not enable source visibility, source selection, live fetch, or execution controls.

### Inspector Metadata Projection

Projection rules:

- `status` is copied from `wiringBundle.displayBundle.inspector.status`.
- `headline` is copied from `wiringBundle.displayBundle.disclosure.headline`.
- `description` is copied from `wiringBundle.displayBundle.disclosure.description`.
- `reasons` is copied from `wiringBundle.displayBundle.disclosure.reasons`.
- `totalReasons` is copied from `wiringBundle.displayBundle.inspector.totalReasons`.
- `readOnly` is always `true`.

Interpretation:

- Inspector metadata shows reasons and counts for observability only.
- `totalReasons` is an explanatory count, not an action queue.
- Inspector metadata does not include retry, approval, repair, rebuild, replay, sync, correction, mutation, route invocation, or role escalation metadata.

### Bundle Invariants

Projection rules:

- `isReadOnly` is always `true`.
- `isLiveData` is always `false`.

Interpretation:

- The UI metadata bundle is display metadata only.
- The UI metadata bundle does not render UI.
- The UI metadata bundle does not wire UI.
- The UI metadata bundle does not enable live real compare data.

## 3. Read-only Contract

The UI metadata projection is observability metadata only.

Required invariants:

```text
disclosure.isReadOnly = true
disclosure.isActionable = false
disclosure.isExecutionAllowed = false
badge.isReadOnly = true
inspector.readOnly = true
bundle.isReadOnly = true
bundle.isLiveData = false
```

Read-only contract:

- `isReadOnly` remains `true`.
- `isActionable` remains `false`.
- `isExecutionAllowed` remains `false`.
- `isLiveData` remains `false`.
- No execution action.
- No mutation intent.
- No workflow action.
- No source option state change.
- No feature flag state change.
- No route invocation.
- No real data connection.

Interpretation:

- A UI metadata bundle can explain future display props.
- A UI metadata bundle cannot wire UI.
- A status can explain guarded availability.
- A status cannot enable `real_compare_readonly`.
- A reason can explain a caveat.
- A reason cannot trigger correction, repair, rebuild, replay, sync, auto-fix, or approval.

## 4. Non-goals

B77-71 does not include:

- No UI integration.
- No source option integration.
- No feature flag change.
- No real compare enablement.
- No fetch.
- No API invocation.
- No DB access.
- No Supabase client.
- No route implementation.
- No route change.
- No adapter integration.
- No fixture payload import.
- No graph adapter fixture import.
- No mutation.
- No correction.
- No rebuild.
- No repair.
- No replay.
- No sync.
- No auto-fix.
- No workflow approval.
- No execution workflow.
- No package install.

変更禁止:

- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityRealCompareReadOnlyWiringProjection.ts`
- `inventoryIntegrityRealCompareReadOnlyWiringProjection.test.ts`
- `inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.ts`
- `inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.test.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `api/inventory-integrity/compare-readonly/route.ts`
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

## 5. Future Candidate

Candidate future phases after B77-71:

- UI Metadata Projection Tests
  - Add pure tests for disclosure / badge / Inspector metadata projection.
  - Verify read-only invariants and non-live state.
- Inspector UI Metadata Projection Design
  - Refine Inspector-specific display semantics before additional Inspector projection work.
  - Keep Inspector explanatory and non-actionable.
- Read-only UI Integration Boundary Design
  - Design any future UI connection boundary before implementation.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

This document describes a pure UI metadata projection. It does not implement UI, expose a source option, change feature flags, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
