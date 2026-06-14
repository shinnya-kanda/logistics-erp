# Governance Semantic Graph Real Compare Read-only Wiring UI Metadata Projection Tests

Phase B77-72 documentation.

このドキュメントは、B77-71 Real Compare Read-only Wiring UI Metadata Projection に対する pure unit tests の範囲と read-only boundary を整理する test note である。

B77-72 では実データ接続、fixture 実体評価、graph adapter fixture import、runtime API response validation、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、UI integration、source option wiring、feature flag change、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-72 is read-only UI metadata projection unit tests.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareReadOnlyUiMetadataProjection.test.ts` を追加する。
- B77-71 pure projection のみを対象にする。
- `projectRealCompareReadOnlyUiMetadataBundle()` を検証する。
- test-local `RealCompareReadOnlyWiringBundle` object を使う。
- UI metadata bundle が read-only / non-actionable / non-executable / non-live であることを確認する。

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

### Disclosure Projection

The tests create wiring bundle metadata in the test file.

Coverage:

- `disclosure.status` is projected from `wiringBundle.displayBundle.disclosure.status`.
- `disclosure.headline` is projected from `wiringBundle.displayBundle.disclosure.headline`.
- `disclosure.description` is projected from `wiringBundle.displayBundle.disclosure.description`.
- `disclosure.reasons` is projected from `wiringBundle.displayBundle.disclosure.reasons`.
- `disclosure.isReadOnly === true`.
- `disclosure.isActionable === false`.
- `disclosure.isExecutionAllowed === false`.

### Badge Projection

The tests confirm badge metadata projection.

Coverage:

- `badge.status` is projected from `wiringBundle.displayBundle.badge.status`.
- `badge.label` is projected from `wiringBundle.displayBundle.badge.label`.
- `badge.description` is projected from `wiringBundle.displayBundle.badge.description`.
- `badge.isReadOnly === true`.

### Inspector Projection

The tests confirm Inspector metadata projection.

Coverage:

- `inspector.status` is projected from `wiringBundle.displayBundle.inspector.status`.
- `inspector.headline` is projected from `wiringBundle.displayBundle.disclosure.headline`.
- `inspector.description` is projected from `wiringBundle.displayBundle.disclosure.description`.
- `inspector.reasons` is projected from `wiringBundle.displayBundle.disclosure.reasons`.
- `inspector.totalReasons` is projected from `wiringBundle.displayBundle.inspector.totalReasons`.
- `inspector.readOnly === true`.

### Bundle Invariants

The tests confirm bundle-level invariants.

Coverage:

- `isReadOnly === true`.
- `isLiveData === false`.

### Read-only Invariants

The tests confirm metadata-level read-only invariants.

Coverage:

- Disclosure metadata is read-only, non-actionable, and non-executable.
- Badge metadata is read-only.
- Inspector metadata is read-only.
- Bundle metadata is read-only and non-live.

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

- B77-71 UI metadata projection function
- B77-70 UI metadata types through projection return types
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

- Read-only UI Metadata Inspector Tests
  - Add additional Inspector-specific tests if future Inspector metadata becomes more detailed.
  - Keep Inspector explanatory and non-actionable.
- Read-only UI Boundary Integration Design
  - Define future UI boundary before any UI integration.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
- Real Compare Inspector Read-only Wiring Design
  - Design how read-only wiring metadata may be represented in Inspector surfaces.
  - Keep source option integration, UI wiring, fetch, API, DB, and adapter connection out of projection tests.

This document describes pure UI metadata projection tests. It does not implement live validation, expose a source option, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
