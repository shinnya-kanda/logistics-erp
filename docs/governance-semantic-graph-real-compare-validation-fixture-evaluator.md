# Governance Semantic Graph Real Compare Validation Fixture Evaluator

Phase B77-54 documentation.

このドキュメントは、B77-53 Real Compare Validation Gate Evaluator Design を前提に、B77-52 の `RealCompareValidationFixtureMapping` を入力として `RealCompareValidationSummary` と `RealCompareGuardedAvailability` を生成する fixture mapping evaluator の実装境界を整理する。

B77-54 では実データ接続、fixture 実体評価、runtime API response validation、fetch implementation、API invocation、route change、DB / Supabase access、auth implementation、role implementation、adapter integration、UI integration、source option wiring、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-54 is fixture mapping evaluator implementation.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationFixtureEvaluator.ts` を追加する。
- input は `RealCompareValidationFixtureMapping` に限定する。
- output は `RealCompareValidationSummary` と `RealCompareGuardedAvailability` に限定する。
- `expectedOutcomes` を validation results に投影する。
- expected blocking state を集計する。
- read-only graph availability を判定する。
- guarded availability を read-only metadata として投影する。

Out of scope:

- fixture 実体 import
- fixture 実体評価
- `REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS` の直接 import
- API response validation
- fetch adapter connection
- graph adapter connection
- UI connection
- source option connection
- route implementation or route change
- DB / Supabase access
- real data connection
- production enablement

## 2. Evaluator Boundary

The evaluator is a pure local mapping projection.

Allowed boundary:

- `import type` from `inventoryIntegrityRealCompareValidationTypes.ts`
- mapping type as function input
- expected gate outcome projection
- blocking aggregation
- read-only availability judgement
- guarded availability projection

Not allowed:

- fixture object import
- `REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS` import
- adapter import
- UI component import
- source option import
- route import
- fetch
- DB / Supabase access
- mutation
- execution action

Implementation files:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationFixtureEvaluator.ts
docs/governance-semantic-graph-real-compare-validation-fixture-evaluator.md
```

The evaluator does not own source visibility. It only projects a validation judgement from a mapping already passed to it.

## 3. Evaluation Rules

### Expected Outcomes To Results

Each `expectedOutcomes` entry becomes one `RealCompareValidationResult`.

Projection rules:

- `gateId` <- `expectedOutcome.gateId`
- `status` <- `expectedOutcome.expectedStatus`
- `severity` <- `expectedOutcome.expectedSeverity`
- `source` <- `fixture`
- `message` <- `expectedOutcome.reason`
- `isBlocking` <- `expectedOutcome.expectedBlocking`

The projection does not inspect fixture data. It does not evaluate API response shape. It does not run graph adapter normalization.

### Blocking Aggregation

`hasBlockingFailure` is `true` when any projected result has `isBlocking: true`.

Interpretation:

- blocking means future readiness is blocked
- blocking does not execute a block action
- blocking does not trigger fallback execution
- blocking does not start correction, repair, rebuild, replay, sync, approval, or auto-fix

### Failed / Blocked Status Handling

Failed or blocked status prevents read-only graph validity.

Rules:

- any `failed` status makes `isValidForReadOnlyGraph` false
- any `blocked` status makes `isValidForReadOnlyGraph` false
- `warning` status may remain display-compatible only when non-blocking
- `passed` status does not enable `real_compare_readonly`
- `not_evaluated` is not used by the B77-54 mapping evaluator output, but remains a future guarded fallback status

### Read-only Graph Availability Projection

`isValidForReadOnlyGraph` is true only when all conditions are true:

- `mapping.expectedReadOnlyGraphAvailability === true`
- `hasBlockingFailure === false`
- no projected result has status `failed`
- no projected result has status `blocked`

If any condition fails, the validation summary remains evaluated but not valid for read-only graph projection.

### Guarded Availability Projection

`projectRealCompareGuardedAvailabilityFromValidation()` maps a summary into guarded availability metadata.

Projection rules:

- `sourceMode` is `real_compare_readonly`
- `validation` contains the summary
- `isGuarded` is `true`
- `isEnabled` is `false`
- `isLiveData` is `false`
- `isVisible` is `summary.isValidForReadOnlyGraph && !summary.hasBlockingFailure`

This `isVisible` is a projected metadata field only. B77-54 does not wire it to actual Graph UI source visibility.

## 4. Guarded State

B77-54 preserves the current guarded state.

Required state:

```text
isGuarded: true
isEnabled: false
isLiveData: false
```

Current source option behavior remains unchanged:

- `real_compare_readonly` remains hidden behind hidden flag and admin-only guard.
- `real_compare_readonly` remains disabled / guarded.
- `real_compare_readonly` is not connected to UI by this evaluator.
- validation result does not enable live data.
- valid fixture mapping result does not enable the source.
- guarded availability projection does not bypass B77-49 guard structure.

The evaluator can say a fixture mapping is valid for read-only graph projection. It cannot make `real_compare_readonly` visible in the actual source selector, fetch data, or render a graph.

## 5. Non-goals

B77-54 does not include:

- No fixture import.
- No fixture runtime evaluation.
- No API response validation.
- No fetch.
- No DB access.
- No Supabase client.
- No route implementation.
- No route change.
- No adapter integration.
- No UI integration.
- No source option wiring.
- No auth implementation.
- No role implementation.
- No mutation.
- No correction.
- No repair.
- No rebuild.
- No replay.
- No sync.
- No auto-fix.
- No workflow approval.
- No execution workflow.
- No real compare integration.
- No production enablement.

変更禁止:

- `StaticGraphPrototype.tsx`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityGraphAdapterTypes.ts`
- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityGraphTypes.ts`
- `inventoryIntegrityGraphMockData.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityRealCompareValidationFixtureMapping.ts`
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

Candidate future phases:

- B77-55 Real Compare Validation Fixture Evaluator Tests
  - Add focused tests for all B77-52 mapping records.
  - Confirm valid, warning-only, failed, blocked, and unavailable expectations.
  - Keep tests fixture-mapping only.
- Real Compare Validation Summary Projection Design
  - Review whether summary metadata needs additional disclosure fields.
  - Keep projection read-only and non-executable.
- Real Compare Guarded Availability Wiring
  - Wire guarded availability metadata into a future validation display surface.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
  - Do not connect live data in the same phase.

Recommended order:

1. B77-55 Real Compare Validation Fixture Evaluator Tests.
2. Real Compare Validation Summary Projection Design.
3. Real Compare Guarded Availability Wiring.
4. Later guarded read-only fetch design only after validation evidence is accepted.

This document describes a fixture mapping evaluator implementation. It does not implement live validation, expose a source option, fetch, call a route, authorize, mutate, or enable `real_compare_readonly`.
