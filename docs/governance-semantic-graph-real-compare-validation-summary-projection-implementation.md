# Governance Semantic Graph Real Compare Validation Summary Projection Implementation

Phase B77-58 documentation.

このドキュメントは、B77-56 Summary Projection Design と B77-57 Projection Type Design を前提に、`RealCompareValidationSummary` から disclosure metadata / Inspector metadata を生成する pure projection implementation の境界を整理する。

B77-58 では UI wiring、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、fixture payload import、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-58 is pure projection implementation.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationProjection.ts` を追加する。
- input は `RealCompareValidationSummary` に限定する。
- output は `RealCompareValidationDisclosureMetadata` と `RealCompareValidationInspectorMetadata` に限定する。
- validation results を disclosure status、reason metadata、Inspector counts に投影する。
- projection output が read-only explanation であり、source enablement や execution authority ではないことを維持する。

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
- real data connection
- production enablement

Implementation files:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationProjection.ts
docs/governance-semantic-graph-real-compare-validation-summary-projection-implementation.md
```

Allowed boundary:

- `import type` from validation and projection type files
- pure file-local helper functions
- exported projection functions
- summary result classification
- read-only metadata construction

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

The disclosure status is classified conservatively.

Classification order:

1. `unavailable`
2. `blocked`
3. `warning`
4. `not_evaluated`
5. `passed`
6. fallback `blocked`

### Unavailable

If a result has `gateId === "unavailable_response"` and status `failed` or `blocked`, disclosure status is `unavailable`.

Meaning:

- unavailable response is a guarded fallback condition.
- unavailable is not converted to healthy projection.
- unavailable does not prompt retry, repair, rebuild, sync, approval, or correction.

### Blocked

If `summary.hasBlockingFailure === true`, disclosure status is `blocked`.

Meaning:

- blocking is readiness metadata.
- blocking does not execute a block action.
- blocking does not mutate data.
- blocking does not change source option visibility or feature flags.

### Warning

If any result has `status === "warning"`, disclosure status is `warning`.

Meaning:

- warnings remain visible read-only caveats.
- warning-only states do not become healthy production readiness.
- warnings do not create operator tasks or action controls.

### Not Evaluated

If `summary.isEvaluated === false` or any result has `status === "not_evaluated"`, disclosure status is `not_evaluated`.

Meaning:

- validation is not ready for read-only projection disclosure.
- `real_compare_readonly` remains guarded, disabled, and non-live.
- no retry or execution prompt is produced.

### Passed

If `summary.isValidForReadOnlyGraph === true` after the prior conditions, disclosure status is `passed`.

Meaning:

- passed indicates future read-only projection readiness only.
- passed does not enable `real_compare_readonly`.
- passed does not indicate live data or production readiness.

### Fallback Blocked

Any remaining state falls back to `blocked`.

Meaning:

- unknown or inconsistent readiness falls closed.
- fallback blocked is explanatory metadata only.
- fallback blocked does not execute fallback logic.

## 3. Read-only Contract

Projection metadata preserves the read-only contract.

Required projection invariants:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
readOnly = true
```

The projection implementation does:

- classify disclosure state.
- project gate reasons from `summary.results`.
- count blocking results.
- count warning results by warning status or warning severity.
- produce explanatory headline and description text.

The projection implementation does not:

- fetch.
- call an API.
- call a route.
- connect to DB / Supabase.
- import adapters.
- import fixture payloads.
- render UI.
- expose source options.
- change feature flags.
- mutate inventory data.
- create execution controls.

Interpretation:

- A projection can explain readiness.
- A projection cannot authorize source visibility.
- A projection can explain unavailable conditions.
- A projection cannot retry the source.
- A projection can explain blocked gates.
- A projection cannot repair, rebuild, sync, approve, correct, or execute workflows.

## 4. Non-goals

B77-58 does not include:

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

Candidate future phases:

- B77-59 Projection Unit Tests
  - Add pure tests for disclosure status classification and Inspector counts.
  - Keep tests summary-only and read-only.
- Disclosure Metadata Wiring Design
  - Design where disclosure metadata may be displayed without action controls.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
- Inspector Metadata Read-only Wiring
  - Design Inspector rendering for counts and reason metadata.
  - Keep rendering explanatory and non-actionable.

Recommended order:

1. B77-59 Projection Unit Tests.
2. Disclosure Metadata Wiring Design.
3. Inspector Metadata Read-only Wiring.
4. Later guarded read-only fetch design only after projection tests and disclosure design are accepted.

This document describes a pure projection implementation. It does not expose a source option, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
