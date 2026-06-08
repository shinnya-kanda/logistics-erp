# Governance Semantic Graph Real Compare Validation Fixture Evaluator Tests

Phase B77-55 documentation.

このドキュメントは、B77-54 Real Compare Validation Fixture Evaluator に対する pure unit tests の範囲と read-only boundary を整理する test note である。

B77-55 では実データ接続、fixture 実体評価、runtime API response validation、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、UI integration、source option wiring、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-55 is pure evaluator tests.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationFixtureEvaluator.test.ts` を追加する。
- `REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS` と B77-54 evaluator のみを対象にする。
- `evaluateRealCompareValidationFixtureMapping()` の summary projection を検証する。
- `projectRealCompareGuardedAvailabilityFromValidation()` の guarded availability projection を検証する。
- 9 fixture mappings すべてを評価する。

Out of scope:

- real fixture payload import
- graph adapter fixture import
- API response validation
- fetch adapter connection
- graph adapter connection
- UI connection
- source option connection
- route implementation or route change
- DB / Supabase access
- real data connection
- production enablement

## 2. Test Coverage

### All Fixture Mappings

The tests evaluate all 9 B77-52 mapping records.

Coverage:

- `sourceMode` is `real_compare_readonly`
- `isEvaluated` is `true`
- `results.length` matches `expectedOutcomes.length`
- each result has `source: "fixture"`
- each result message matches the expected outcome reason
- each result blocking flag matches the expected outcome blocking flag

### Happy Path

The full metadata mapping is tested as the non-live happy path.

Expected summary:

- `hasBlockingFailure === false`
- `isValidForReadOnlyGraph === true`

Expected guarded availability:

- `isGuarded === true`
- `isEnabled === false`
- `isLiveData === false`
- `isVisible === true`

`isVisible` is evaluator projection metadata only. It is not wired to the actual Graph UI source visibility.

### Blocking Path

The unsupported shape mapping is tested as a blocked path.

Expected:

- `hasBlockingFailure === true`
- `isValidForReadOnlyGraph === false`
- guarded availability `isVisible === false`

### Warning / Guarded Fallback

The source divergence mapping is tested to ensure summary output follows mapping expectations.

Expected:

- blocking aggregation follows `expectedBlocking`
- `hasBlockingFailure` follows `expectedBlockingFailure`
- read-only graph validity follows expected availability, blocking state, and failed / blocked status state

### Failed / Blocked Status Handling

Mappings with `failed` or `blocked` expected statuses are tested as invalid for read-only graph projection.

Expected:

- `isValidForReadOnlyGraph === false`

### Guarded Availability Projection

Guarded availability is tested from validation summary only.

Expected:

- availability keeps `sourceMode: "real_compare_readonly"`
- availability embeds the validation summary
- availability keeps guarded / disabled / non-live state
- availability does not imply source option enablement

## 3. Read-only Safety

The tests are pure unit tests.

Safety rules:

- Tests do not connect runtime data.
- Tests do not import real fixture payloads.
- Tests do not import graph adapter fixtures.
- Tests do not mock API calls.
- Tests do not mock DB calls.
- Tests do not mock Supabase.
- Tests do not wire UI.
- Tests do not import source options.
- Tests do not enable `real_compare_readonly`.
- Tests do not change hidden flag or admin-only guard.

The tests may import:

- `REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS`
- B77-54 evaluator functions
- validation types

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

- Real Compare Validation Summary Projection Design
  - Review whether the summary needs additional disclosure metadata.
  - Keep summary metadata read-only and non-executable.
- Real Compare Guarded Availability Wiring
  - Wire guarded availability metadata into a future validation display surface.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
  - Do not connect live data in the same phase.
- Real Compare Validation Fixture Evaluator UI Disclosure Design
  - Design how validation summary could be disclosed without action buttons.
  - Keep warnings as read-only caveats.
  - Keep `No Execution Controls / 実行操作なし` and `No Execution Route / 実行経路ではありません` visible.

This document describes pure evaluator tests. It does not implement live validation, expose a source option, fetch, call a route, authorize, mutate, or enable `real_compare_readonly`.
