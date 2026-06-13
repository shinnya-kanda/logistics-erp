# Governance Semantic Graph Real Compare Guarded Availability Read-only Wiring Type Design

Phase B77-65 documentation.

このドキュメントは、B77-64 Real Compare Guarded Availability Read-only Wiring Design を前提に、`RealCompareGuardedAvailabilityDisplayBundle` を将来 Graph source disclosure / source badge / Inspector validation section へ read-only で渡すための wiring metadata type design を整理する。

B77-65 は type-only である。wiring function、wiring helper、projection function、UI component、disclosure renderer、badge renderer、Inspector renderer、source option integration、feature flag integration、runtime wiring、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、workflow approval、execution control は行わない。

## 1. Scope

B77-65 is read-only wiring type design only.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyWiringTypes.ts` を追加する。
- `RealCompareGuardedAvailabilityDisplayBundle` から将来 Graph UI 表示面へ渡す metadata shape を type-only で定義する。
- wiring target、wiring status、wiring metadata、wiring bundle の型境界を固定する。
- 型が read-only metadata であり、UI 接続、source enablement、live data enablement、execution authority ではないことを表現する。

Out of scope:

- wiring projection function
- wiring helper
- runtime wiring
- UI component
- disclosure renderer
- badge renderer
- Inspector renderer
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
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyWiringTypes.ts
```

Allowed:

- type aliases only
- `import type` for `RealCompareGuardedAvailabilityDisplayBundle`
- wiring target labels
- wiring status labels
- wiring metadata shape
- wiring bundle shape
- read-only invariant fields

Not allowed:

- function implementation
- helper implementation
- runtime projection
- React component
- renderer
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

### Wiring Target

`RealCompareReadOnlyWiringTarget` classifies the future display surface that wiring metadata may describe.

Values:

- `graph_source_disclosure`
- `source_badge`
- `inspector_validation_section`
- `guarded_fallback_reason`
- `unavailable_fallback_explanation`

Interpretation:

- target is display placement metadata only.
- target does not create UI wiring.
- target does not select a source option.
- target does not trigger fallback execution.
- target does not call a route, fetch data, or connect adapters.

### Wiring Status

`RealCompareReadOnlyWiringStatus` classifies the safe handoff state for future display metadata.

Values:

- `not_wired`
- `candidate`
- `guarded`
- `blocked`
- `unavailable`

Interpretation:

- `not_wired` means B77-65 has no UI connection.
- `candidate` means metadata may be considered for a future read-only display phase.
- `guarded` means display remains guarded, disabled, and non-live.
- `blocked` means readiness is blocked and fallback explanation is required.
- `unavailable` means unavailable fallback explanation is required.
- No status is an execution permission, mutation intent, role escalation, or enablement signal.

### Wiring Metadata

`RealCompareReadOnlyWiringMetadata` describes one future read-only display handoff target.

Fields:

- `sourceMode: "real_compare_readonly"`
- `target`
- `status`
- `headline`
- `description`
- `isReadOnly: true`
- `isActionable: false`
- `isExecutionAllowed: false`

Interpretation:

- metadata is explanatory only.
- headline and description are display text, not action instructions.
- `isReadOnly`, `isActionable`, and `isExecutionAllowed` encode the read-only boundary.
- metadata does not contain callbacks, route metadata, fetch instructions, mutation payloads, workflow state, or source option state.

### Wiring Bundle

`RealCompareReadOnlyWiringBundle` groups the display bundle with future wiring metadata.

Fields:

- `sourceMode: "real_compare_readonly"`
- `displayBundle: RealCompareGuardedAvailabilityDisplayBundle`
- `metadata: readonly RealCompareReadOnlyWiringMetadata[]`
- `isReadOnly: true`
- `isWiredToUi: false`
- `isLiveData: false`

Interpretation:

- bundle is type-level metadata only.
- `displayBundle` remains the B77-61/B77-62 guarded availability display bundle.
- `metadata` describes future display targets but does not connect them.
- `isWiredToUi: false` records that B77-65 has no UI wiring.
- `isLiveData: false` records that B77-65 does not enable live real compare data.

## 3. Read-only Contract

Read-only wiring types are observability metadata only.

Read-only contract:

- type-only implementation.
- read-only only.
- no execution action.
- no mutation intent.
- no workflow action.
- no source option state change.
- no feature flag state change.
- no route invocation.
- no fetch instruction.
- no DB / Supabase instruction.
- no adapter integration.
- `isWiredToUi` remains `false`.
- `isLiveData` remains `false`.

Required invariants:

```text
sourceMode = "real_compare_readonly"
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isWiredToUi = false
isLiveData = false
```

Interpretation:

- A wiring target can describe where metadata may appear later.
- A wiring target cannot render UI.
- A wiring status can describe safe handoff state.
- A wiring status cannot enable `real_compare_readonly`.
- A wiring bundle can group display metadata for future design phases.
- A wiring bundle cannot fetch, call API, connect adapters, mutate, or execute workflows.

## 4. Guarded Rollout State

B77-65 preserves the current guarded rollout state.

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
- Disclosure projection implementation is unchanged.
- No wiring function is added.
- No projection helper is added.
- No UI connection is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- Wiring metadata types cannot bypass hidden flag or admin guard.
- Wiring metadata types cannot convert fallback into healthy live data.
- Wiring metadata types cannot enable source visibility, source selection, live fetch, or execution controls.

## 5. Non-goals

B77-65 does not include:

- No wiring projection function.
- No wiring helper.
- No runtime wiring.
- No UI component.
- No disclosure renderer.
- No badge renderer.
- No Inspector renderer.
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

- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityGraphAdapterTypes.ts`
- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityGraphMockData.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityRealCompareValidationProjection.ts`
- `inventoryIntegrityRealCompareValidationProjection.test.ts`
- `inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.ts`
- `inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.test.ts`
- `inventoryIntegrityRealCompareValidationFixtureMapping.ts`
- `inventoryIntegrityRealCompareValidationFixtureEvaluator.ts`
- `inventoryIntegrityRealCompareValidationFixtureEvaluator.test.ts`
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

Candidate future phases after B77-65:

- Read-only Wiring Metadata Projection
  - Implement a pure metadata projection from display bundle to wiring bundle only after this type design is accepted.
  - Keep projection local, read-only, and action-free.
- Read-only Wiring Projection Tests
  - Add pure tests for target metadata, statuses, and read-only invariants.
  - Do not import UI, source options, feature flags, route, adapters, or fixtures.
- Inspector Read-only Wiring Design
  - Design how `inspector_validation_section` metadata may appear in the Inspector.
  - Keep counts explanatory, not operational tasks.
- Guarded Availability UI Boundary Design
  - Review future disclosure / badge / Inspector wording before any UI implementation.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. Read-only Wiring Metadata Projection.
2. Read-only Wiring Projection Tests.
3. Inspector Read-only Wiring Design.
4. Guarded Availability UI Boundary Design.
5. UI wiring implementation only after the above gates are accepted.

This document is a read-only wiring type design gate. It does not implement wiring, projection, helper logic, UI, source option integration, feature flag integration, fetch, route calls, adapter connection, authorization, mutation, or `real_compare_readonly` enablement.
