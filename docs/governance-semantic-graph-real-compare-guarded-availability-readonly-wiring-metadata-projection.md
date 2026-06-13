# Governance Semantic Graph Real Compare Guarded Availability Read-only Wiring Metadata Projection

Phase B77-66 documentation.

このドキュメントは、B77-65 Read-only Wiring Type Design を前提に、`RealCompareGuardedAvailabilityDisplayBundle` から `RealCompareReadOnlyWiringBundle` を生成する pure / local / read-only wiring metadata projection の境界を整理する。

B77-66 では UI wiring、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、fixture payload import、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-66 is pure read-only wiring metadata projection.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyWiringProjection.ts` を追加する。
- input は `RealCompareGuardedAvailabilityDisplayBundle` に限定する。
- output は `RealCompareReadOnlyWiringBundle` に限定する。
- display bundle を保持し、Graph UI へ将来渡すための target metadata を生成する。
- output が read-only / non-actionable / non-executable / not-wired / non-live であることを固定する。

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
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyWiringProjection.ts
docs/governance-semantic-graph-real-compare-guarded-availability-readonly-wiring-metadata-projection.md
```

Allowed boundary:

- `import type` only.
- read `RealCompareGuardedAvailabilityDisplayBundle`.
- return `RealCompareReadOnlyWiringBundle`.
- file-local helper functions only.
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

The projection builds a wiring bundle from an already-projected guarded availability display bundle.

### Display Bundle Preservation

Projection rules:

- `sourceMode` is always `real_compare_readonly`.
- `displayBundle` preserves the input object.
- `isReadOnly` is always `true`.
- `isWiredToUi` is always `false`.
- `isLiveData` is always `false`.

Interpretation:

- Preserving the display bundle does not connect it to Graph UI.
- `isWiredToUi: false` records that B77-66 is not a UI wiring phase.
- `isLiveData: false` records that B77-66 does not enable live real compare data.

### Target Metadata Generation

The projection generates metadata for all future read-only display targets:

- `graph_source_disclosure`
- `source_badge`
- `inspector_validation_section`
- `guarded_fallback_reason`
- `unavailable_fallback_explanation`

Target policy:

- `graph_source_disclosure` describes read-only disclosure for Graph source display.
- `source_badge` describes read-only state for a future source selector / badge surface.
- `inspector_validation_section` describes read-only validation summary metadata for Inspector.
- `guarded_fallback_reason` describes guarded / blocked / not evaluated fallback reason metadata.
- `unavailable_fallback_explanation` describes unavailable / `fallback_unavailable` explanation metadata.

Each metadata item preserves:

- `sourceMode: "real_compare_readonly"`
- `isReadOnly: true`
- `isActionable: false`
- `isExecutionAllowed: false`

### Status Mapping

Metadata status is mapped from `displayBundle.badge.status`.

Status mapping:

| Display bundle badge status | Wiring metadata status |
| --- | --- |
| `passed` | `candidate` |
| `warning` | `guarded` |
| `guarded` | `guarded` |
| `blocked` | `blocked` |
| `unavailable` | `unavailable` |

Mapping interpretation:

- `candidate` means read-only candidate only, not enablement.
- `guarded` means guarded, disabled, and non-live display state.
- `blocked` means fallback explanation is required.
- `unavailable` means `fallback_unavailable` explanation is required.
- No mapped status is an execution permission, mutation intent, role escalation, or source option enablement signal.

### Read-only Invariants

Required metadata invariants:

```text
metadata[].sourceMode = "real_compare_readonly"
metadata[].isReadOnly = true
metadata[].isActionable = false
metadata[].isExecutionAllowed = false
```

Required bundle invariants:

```text
sourceMode = "real_compare_readonly"
isReadOnly = true
isWiredToUi = false
isLiveData = false
```

### Non-live / Not-wired State

The wiring bundle is a metadata package only.

Policy:

- It does not change source option visibility.
- It does not change feature flags.
- It does not render a disclosure, badge, or Inspector section.
- It does not call a route.
- It does not fetch real compare data.
- It does not connect to DB / Supabase.
- It does not import adapters or fixtures.

## 3. Read-only Contract

The wiring metadata projection is observability metadata only.

Read-only contract:

- `isReadOnly` remains `true`.
- `isActionable` remains `false`.
- `isExecutionAllowed` remains `false`.
- `isWiredToUi` remains `false`.
- `isLiveData` remains `false`.
- No execution action.
- No mutation intent.
- No workflow action.
- No source option state change.
- No feature flag state change.
- No route invocation.
- No real data connection.

Interpretation:

- A wiring bundle can explain future display targets.
- A wiring bundle cannot wire UI.
- A target metadata item can describe a future surface.
- A target metadata item cannot render the surface.
- A status can explain guarded availability.
- A status cannot enable `real_compare_readonly`.

## 4. Non-goals

B77-66 does not include:

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

## 5. Future Candidate

Candidate future phases after B77-66:

- Read-only Wiring Projection Tests
  - Add pure unit tests for status mapping, target coverage, display bundle preservation, and read-only invariants.
  - Do not import UI, source options, feature flags, route, adapters, or fixtures.
- Inspector Read-only Wiring Design
  - Design how `inspector_validation_section` metadata may appear in Inspector.
  - Keep counts explanatory, not operational tasks.
- Guarded Availability UI Boundary Design
  - Review future disclosure / badge / Inspector wording before UI implementation.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. Read-only Wiring Projection Tests.
2. Inspector Read-only Wiring Design.
3. Guarded Availability UI Boundary Design.
4. UI wiring implementation only after the above gates are accepted.

This document describes a pure read-only wiring metadata projection. It does not implement UI, expose a source option, change flags, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
