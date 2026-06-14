# Governance Semantic Graph Real Compare Read-only Wiring UI Metadata Type Design

Phase B77-70 documentation.

このドキュメントは、B77-69 Real Compare Read-only Wiring UI Metadata Design を前提に、将来 `RealCompareReadOnlyWiringBundle` から Disclosure / Badge / Inspector へ渡す UI Metadata の type-only contract を整理する。

B77-70 は type-only である。projection implementation、wiring implementation、wiring helper、renderer、React component、UI integration、source option integration、feature flag integration、runtime wiring、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、workflow approval、execution control は行わない。

## 1. Scope

B77-70 is UI metadata type design only.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyUiMetadataTypes.ts` を追加する。
- Disclosure Metadata、Badge Metadata、Inspector Metadata、UI Metadata Bundle の型境界を固定する。
- UI Metadata が read-only display metadata であり、UI 実装、source enablement、live data enablement、execution authority ではないことを型で表現する。

Out of scope:

- projection implementation
- wiring implementation
- wiring helper
- runtime wiring
- renderer
- React component
- UI integration
- source option integration
- feature flag integration
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- mutation
- execution action

## 2. Type Boundary

The new type file is:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyUiMetadataTypes.ts
```

Allowed:

- type aliases only
- disclosure metadata shape
- badge metadata shape
- Inspector metadata shape
- UI metadata bundle shape
- read-only invariant fields

Not allowed:

- function implementation
- helper implementation
- runtime projection
- renderer
- React component
- UI import
- source option import
- feature flag import
- route import
- adapter import
- fixture payload import
- fetch
- DB / Supabase access
- mutation
- execution action

### Disclosure Metadata

`RealCompareReadOnlyDisclosureUiMetadata` carries future disclosure display metadata.

Fields:

- `status`
- `headline`
- `description`
- `reasons`
- `isReadOnly: true`
- `isActionable: false`
- `isExecutionAllowed: false`

Interpretation:

- `status` explains read-only candidate / guarded / blocked / unavailable state.
- `headline` is a short display summary.
- `description` is explanatory, not instructional.
- `reasons` are validation or fallback caveats.
- `isReadOnly`, `isActionable`, and `isExecutionAllowed` encode the display-only boundary.
- Disclosure metadata does not contain callbacks, command labels, route metadata, mutation payloads, or workflow state.

### Badge Metadata

`RealCompareReadOnlyBadgeUiMetadata` carries compact badge display metadata.

Fields:

- `status`
- `label`
- `description`
- `isReadOnly: true`

Interpretation:

- `status` is state display only.
- `label` is a compact state label, not an action label.
- `description` explains the badge state.
- Badge metadata does not enable source visibility, source selection, live fetch, or execution controls.

### Inspector Metadata

`RealCompareReadOnlyInspectorUiMetadata` carries future Inspector display metadata.

Fields:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- `readOnly: true`

Interpretation:

- `status` explains display state only.
- `headline` is a short read-only summary.
- `description` is explanatory, not instructional.
- `reasons` are validation / fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- `readOnly` confirms that Inspector content is display-only.

### Metadata Bundle

`RealCompareReadOnlyUiMetadataBundle` groups the future UI metadata surfaces.

Fields:

- `disclosure`
- `badge`
- `inspector`
- `isReadOnly: true`
- `isLiveData: false`

Interpretation:

- The bundle is a UI metadata package only.
- The bundle does not render UI.
- The bundle does not wire UI.
- The bundle does not connect to source options.
- The bundle does not enable `real_compare_readonly`.

## 3. Read-only Contract

UI metadata types are observability metadata only.

Required invariants:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
readOnly = true
```

Read-only contract:

- type-only implementation.
- no execution action.
- no mutation intent.
- no workflow action.
- no source option state change.
- no feature flag state change.
- no route invocation.
- no fetch instruction.
- no DB / Supabase instruction.
- no adapter integration.

Interpretation:

- Disclosure metadata can explain status.
- Disclosure metadata cannot become an action surface.
- Badge metadata can show state.
- Badge metadata cannot enable source selection.
- Inspector metadata can show reasons and counts.
- Inspector metadata cannot create task queues, retries, approvals, repairs, rebuilds, syncs, corrections, or execution workflows.

## 4. Guarded Rollout State

B77-70 preserves the current guarded rollout state.

Required current state:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
UI wiring = none
```

Current behavior preserved:

- `real_compare_readonly` remains hidden unless hidden flag and static admin guard both pass.
- `real_compare_readonly` remains disabled / guarded.
- `real_compare_readonly` remains non-live.
- Graph UI behavior is unchanged.
- Source option behavior is unchanged.
- Feature flags are unchanged.
- Wiring projection behavior is unchanged.
- No projection implementation is added.
- No wiring implementation is added.
- No UI component is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- UI metadata types cannot bypass hidden flag or admin guard.
- UI metadata types cannot enable source visibility, source selection, live fetch, or execution controls.

## 5. Non-goals

B77-70 does not include:

- No UI implementation.
- No projection implementation.
- No wiring implementation.
- No wiring helper.
- No renderer.
- No React component.
- No source option integration.
- No feature flag integration.
- No real compare enablement.
- No fetch / API.
- No DB / Supabase.
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

## 6. Future Candidate

Candidate future phases after B77-70:

- UI Metadata Projection
  - Implement a pure projection from read-only wiring bundle to UI metadata bundle only after this type design is accepted.
  - Keep projection local, read-only, and action-free.
- UI Metadata Projection Tests
  - Add pure tests for disclosure / badge / Inspector metadata and read-only invariants.
  - Do not import UI, source options, feature flags, route, adapters, or fixtures.
- Inspector UI Metadata Projection
  - Refine Inspector-specific metadata projection for reasons and counts.
  - Keep counts explanatory, not operational tasks.
- Read-only UI Integration Design
  - Design future UI integration boundaries before any implementation.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. UI Metadata Projection.
2. UI Metadata Projection Tests.
3. Inspector UI Metadata Projection.
4. Read-only UI Integration Design.
5. UI implementation only after the above gates are accepted.

This document is a UI metadata type design gate. It does not implement UI, projection, wiring, helper logic, source option integration, feature flag integration, fetch, route calls, adapter connection, authorization, mutation, or `real_compare_readonly` enablement.
