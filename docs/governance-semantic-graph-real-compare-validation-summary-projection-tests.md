# Governance Semantic Graph Real Compare Validation Summary Projection Tests

Phase B77-59 documentation.

このドキュメントは、B77-58 Real Compare Validation Summary Projection Implementation に対する pure unit tests の範囲と read-only boundary を整理する test note である。

B77-59 では実データ接続、fixture 実体評価、graph adapter fixture import、runtime API response validation、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、UI integration、source option wiring、feature flag change、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-59 is projection pure unit tests.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationProjection.test.ts` を追加する。
- B77-58 summary projection implementation のみを対象にする。
- `projectRealCompareValidationDisclosureMetadata()` を検証する。
- `projectRealCompareValidationInspectorMetadata()` を検証する。
- test-local `RealCompareValidationSummary` objects のみを使う。
- disclosure metadata と Inspector metadata が read-only / non-actionable / non-executable であることを確認する。

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

### Passed Projection

The tests create a valid summary in the test file.

Coverage:

- disclosure status is `passed`.
- projection keeps `isReadOnly: true`.
- projection keeps `isActionable: false`.
- projection keeps `isExecutionAllowed: false`.
- disclosure has no blocking failure.
- disclosure has no warnings.
- disclosure has no unavailable condition.
- Inspector status is `passed`.
- Inspector keeps `readOnly: true`.

### Warning Projection

The tests create a warning summary in the test file.

Coverage:

- disclosure status is `warning`.
- `hasWarnings` is `true`.
- Inspector `warningCount` is greater than zero.
- execution remains disallowed.

### Blocked Projection

The tests create a blocking summary in the test file.

Coverage:

- disclosure status is `blocked`.
- `hasBlockingFailure` is `true`.
- Inspector `blockingCount` is greater than zero.
- execution remains disallowed.

### Unavailable Projection

The tests create an `unavailable_response` summary in the test file.

Coverage:

- disclosure status is `unavailable`.
- `hasUnavailableCondition` is `true`.
- Inspector status is `unavailable`.

### Not Evaluated Projection

The tests create a `not_evaluated` summary in the test file.

Coverage:

- disclosure status is `not_evaluated`.
- projection remains read-only.
- action and execution remain false.

### Reasons Projection

The tests confirm `summary.results` are projected into reasons.

Coverage:

- `gateId` is projected.
- `message` is projected.
- `severity` is projected.

### Inspector Metadata Counts

The tests confirm Inspector counts are derived from summary results.

Coverage:

- `totalResults` follows `summary.results.length`.
- `warningCount` includes warning severity.
- `blockingCount` follows `isBlocking`.
- `readOnly` remains true.

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

- B77-58 projection functions
- validation types

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

- Real Compare Guarded Availability Disclosure Design
  - Design future disclosure wording and placement.
  - Keep action controls out of scope.
- Real Compare Guarded Availability Disclosure Type Design
  - Define type-only disclosure contract for guarded availability.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
- Real Compare Guarded Availability Disclosure Implementation
  - Implement pure disclosure projection only after design approval.
  - Do not connect live data in the same phase.

This document describes pure projection tests. It does not implement live validation, expose a source option, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
