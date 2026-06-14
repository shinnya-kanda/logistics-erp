# Governance Semantic Graph Real Compare Guarded Availability Read-only Wiring Projection Tests

Phase B77-67 documentation.

このドキュメントは、B77-66 Real Compare Guarded Availability Read-only Wiring Metadata Projection に対する pure unit tests の範囲と read-only boundary を整理する test note である。

B77-67 では実データ接続、fixture 実体評価、graph adapter fixture import、runtime API response validation、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、UI integration、source option wiring、feature flag change、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-67 is read-only wiring projection unit tests.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyWiringProjection.test.ts` を追加する。
- B77-66 pure projection のみを対象にする。
- `projectRealCompareReadOnlyWiringBundle()` を検証する。
- test-local `RealCompareGuardedAvailabilityDisplayBundle` objects を使う。
- wiring bundle が read-only / non-actionable / non-executable / not-wired / non-live であることを確認する。

Out of scope:

- UI integration
- source option integration
- feature flag integration
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- fixture payload import
- graph adapter fixture import
- real data connection
- production enablement

## 2. Coverage

### Candidate Mapping

The tests create passed display bundle metadata in the test file.

Coverage:

- `badge.status` is `passed`.
- wiring metadata status is `candidate`.
- read-only metadata invariants are preserved.

### Guarded Mapping

The tests create warning and guarded display bundle metadata in the test file.

Coverage:

- `badge.status` `warning` maps to `guarded`.
- `badge.status` `guarded` maps to `guarded`.
- read-only metadata invariants are preserved.

### Blocked Mapping

The tests create blocked display bundle metadata in the test file.

Coverage:

- `badge.status` is `blocked`.
- wiring metadata status is `blocked`.
- read-only metadata invariants are preserved.

### Unavailable Mapping

The tests create unavailable display bundle metadata in the test file.

Coverage:

- `badge.status` is `unavailable`.
- wiring metadata status is `unavailable`.
- read-only metadata invariants are preserved.

### Target Generation

The tests confirm all read-only wiring targets are generated.

Coverage:

- `graph_source_disclosure`
- `source_badge`
- `inspector_validation_section`
- `guarded_fallback_reason`
- `unavailable_fallback_explanation`

### Bundle Invariants

The tests confirm bundle-level invariants.

Coverage:

- `sourceMode === "real_compare_readonly"`
- `isReadOnly === true`
- `isWiredToUi === false`
- `isLiveData === false`
- input `displayBundle` is preserved.

### Metadata Invariants

The tests confirm metadata-level invariants for every metadata item.

Coverage:

- `sourceMode === "real_compare_readonly"`
- `isReadOnly === true`
- `isActionable === false`
- `isExecutionAllowed === false`

## 3. Read-only Safety

The tests are pure unit tests.

Safety rules:

- Tests do not connect runtime data.
- Tests do not import real fixture payloads.
- Tests do not import graph adapter fixtures.
- Tests do not mock API calls.
- Tests do not mock DB calls.
- Tests do not mock Supabase.
- Tests do not mock fetch.
- Tests do not wire UI.
- Tests do not import source options.
- Tests do not import feature flags.
- Tests do not enable `real_compare_readonly`.
- Tests do not change hidden flag or admin-only guard.
- Tests do not add mutation, correction, repair, rebuild, replay, sync, or auto-fix behavior.

The tests may import:

- B77-66 wiring projection function
- B77-65 wiring types
- B77-61 guarded availability disclosure types

The tests must not import:

- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityGraphAdapter.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `api/inventory-integrity/compare-readonly/route.ts`

## 4. Future Candidate

Candidate future phases:

- Read-only Wiring Metadata Inspector Design
  - Design how wiring metadata may appear in Inspector.
  - Keep Inspector explanatory and non-actionable.
- Read-only Wiring UI Boundary Design
  - Define read-only UI boundaries for source disclosure, badge, and Inspector areas.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
- Read-only Wiring Projection Integration Design
  - Design any future integration boundary before implementation.
  - Keep source option integration, UI wiring, fetch, API, DB, and adapter connection out of projection tests.

This document describes pure wiring projection tests. It does not implement live validation, expose a source option, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
