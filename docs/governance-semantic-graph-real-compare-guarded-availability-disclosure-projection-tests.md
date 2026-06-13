# Governance Semantic Graph Real Compare Guarded Availability Disclosure Projection Tests

Phase B77-63 documentation.

このドキュメントは、B77-62 Real Compare Guarded Availability Disclosure Projection Implementation に対する pure unit tests の範囲と read-only boundary を整理する test note である。

B77-63 では実データ接続、fixture 実体評価、graph adapter fixture import、runtime API response validation、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、UI integration、source option wiring、feature flag change、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-63 is disclosure projection pure unit tests.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.test.ts` を追加する。
- B77-62 display bundle projection implementation のみを対象にする。
- `projectRealCompareGuardedAvailabilityDisplayBundle()` を検証する。
- test-local `RealCompareValidationDisclosureMetadata` objects を使う。
- test-local `RealCompareValidationInspectorMetadata` objects を使う。
- display bundle が read-only / non-actionable / non-executable であることを確認する。

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

## 2. Test Coverage

### Passed Mapping

The tests create passed disclosure metadata in the test file.

Coverage:

- badge status is `passed`.
- disclosure status is `passed`.
- Inspector status is `passed`.
- read-only invariants are preserved.

### Warning Mapping

The tests create warning disclosure metadata in the test file.

Coverage:

- badge status is `warning`.
- disclosure status is `warning`.
- Inspector status is `warning`.
- read-only invariants are preserved.

### Blocked Mapping

The tests create blocked disclosure metadata in the test file.

Coverage:

- badge status is `blocked`.
- disclosure status is `blocked`.
- Inspector status is `blocked`.
- read-only invariants are preserved.

### Unavailable Mapping

The tests create unavailable disclosure metadata in the test file.

Coverage:

- badge status is `unavailable`.
- disclosure status is `unavailable`.
- Inspector status is `unavailable`.
- read-only invariants are preserved.

### Not Evaluated To Guarded Mapping

The tests create not evaluated disclosure metadata in the test file.

Coverage:

- badge status is `guarded`.
- disclosure status is `guarded`.
- Inspector status is `guarded`.
- read-only invariants are preserved.

### Reasons Projection

The tests confirm projection reason messages are projected into disclosure reasons.

Coverage:

- `disclosure.reasons.length` follows `projection.reasons.length`.
- `disclosure.reasons` includes each reason message.

### Inspector Total Reasons

The tests confirm Inspector reason counts are derived from disclosure reasons.

Coverage:

- `inspector.totalReasons` equals `disclosure.reasons.length`.

### Read-only Invariants

The tests confirm display bundle invariants.

Coverage:

- `badge.isReadOnly === true`
- `disclosure.isReadOnly === true`
- `disclosure.isActionable === false`
- `disclosure.isExecutionAllowed === false`
- `inspector.readOnly === true`

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

- B77-62 disclosure projection function
- B77-61 guarded availability disclosure types
- B77-57 validation projection types

The tests must not import:

- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityGraphAdapter.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityRealCompareValidationFixtureMapping.ts`
- `api/inventory-integrity/compare-readonly/route.ts`

## 4. Future Candidate

Candidate future phases:

- Real Compare Guarded Availability Read-only Wiring Design
  - Design where display bundle may appear in Graph UI.
  - Keep UI action controls out of scope.
- Real Compare Guarded Availability Disclosure UI Boundary Design
  - Define read-only UI boundaries for badge, disclosure, and Inspector areas.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
- Real Compare Validation Inspector Read-only Wiring Design
  - Design Inspector display for validation and guarded availability metadata.
  - Keep Inspector explanatory and non-actionable.

This document describes pure disclosure projection tests. It does not implement live validation, expose a source option, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
