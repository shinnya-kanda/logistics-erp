# Governance Semantic Graph Real Compare Validation Integration Spike

Phase B78-01 documentation.

このドキュメントは、B77 系で整理した `real_compare_readonly` の read-only validation / projection / disclosure / wiring / rendering policy を前提に、local fixture mapping only の Integration Spike を整理する。

B78-01 は Runtime Validation への第一歩である。ただし、この phase では実データ接続、fetch、API integration、route change、DB / Supabase access、adapter integration、graph adapter execution、fixture payload import、UI wiring、source option integration、feature flag change、real_compare_readonly enablement、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B78-01 is a local fixture mapping integration spike.

Scope:

- `REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS` を全件 local / pure に評価する。
- Fixture mapping evaluator から validation summary を得る。
- Validation summary から guarded availability を得る。
- Validation summary projection から disclosure metadata と inspector metadata を得る。
- Local fallback decision を算出する。
- Runtime validation へ進む前に、fixture mapping integration の戻り値 shape と safety boundary を確認する。

Out of scope:

- Real data connection
- Fetch implementation
- API invocation
- Route implementation or route change
- DB / Supabase access
- Adapter integration
- Graph adapter execution
- Fixture payload import
- UI wiring
- Source option integration
- Feature flag change
- `real_compare_readonly` enablement
- Mutation
- Execution control

## 2. Integration Flow

Local integration flow:

```text
fixture mapping
↓
fixture evaluator
↓
validation summary
↓
guarded availability
↓
validation projection
↓
fallback decision
```

Flow interpretation:

- Fixture mapping is static descriptive metadata.
- Fixture evaluator projects expected outcomes into validation summary.
- Validation summary remains read-only readiness metadata.
- Guarded availability remains guarded, disabled, and non-live.
- Validation projection produces disclosure / inspector metadata only.
- Fallback decision is local integration metadata only.

The arrows describe local pure interpretation order only. They are not an execution chain, fetch chain, adapter chain, route invocation chain, correction chain, approval chain, mutation chain, or fallback execution chain.

## 3. Fallback Decision

Fallback decision values:

- `fallback_unavailable`
- `guarded_fallback`
- `read_only_candidate`

Decision rules:

```text
hasUnavailableCondition === true
  -> fallback_unavailable

summary.hasBlockingFailure === true
  -> fallback_unavailable

summary.isValidForReadOnlyGraph === true
  && guardedAvailability.isVisible === true
  -> read_only_candidate

otherwise
  -> guarded_fallback
```

Decision interpretation:

- `fallback_unavailable` means the local fixture mapping integration indicates unavailable fallback should be used for safety.
- `guarded_fallback` means the local fixture mapping integration remains guarded without unavailable response semantics.
- `read_only_candidate` means the mapping is a candidate for future read-only interpretation only.
- `read_only_candidate` is not enablement.
- Fallback decision does not invoke fallback execution.
- Fallback decision does not render UI.
- Fallback decision does not change source option behavior.

## 4. Read-only Contract

Read-only contract:

- `read_only_candidate` is not enablement.
- UI wiring is not added.
- Source option integration is not added.
- Feature flags are not changed.
- `real_compare_readonly` remains guarded, disabled, and non-live.
- Local fixture mapping integration does not fetch, call API, call route, access DB / Supabase, connect adapters, or mutate data.

Required guarded state remains:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
UI wiring = none
```

Required wording for future display remains:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`
- `Guarded Source / ガード中ソース`
- `Validation Disclosure / 検証結果表示`

## 5. Implementation Boundary

Added implementation file:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationIntegrationSpike.ts
```

Allowed imports:

- `import type`
- `REAL_COMPARE_VALIDATION_FIXTURE_MAPPINGS`
- `evaluateRealCompareValidationFixtureMapping`
- `projectRealCompareGuardedAvailabilityFromValidation`
- `projectRealCompareValidationDisclosureMetadata`
- `projectRealCompareValidationInspectorMetadata`

Disallowed imports:

- fixture payload imports
- route imports
- adapter imports
- graph adapter imports
- UI component imports
- source option imports
- feature flag imports

Added test file:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationIntegrationSpike.test.ts
```

Test boundary:

- Pure unit test only.
- DOM is not required.
- React Testing Library is not required.
- API mock is not required.
- Fetch mock is not required.
- Supabase mock is not required.
- Fixture payload is not imported.

## 6. Non-goals

B78-01 does not include:

- No fetch.
- No API integration.
- No route change.
- No DB / Supabase.
- No adapter integration.
- No graph adapter execution.
- No fixture payload import.
- No UI wiring.
- No UI component.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.
- No correction.
- No repair.
- No rebuild.
- No replay.
- No sync.
- No auto-fix.
- No workflow approval.
- No execution control.
- No package install.

変更禁止:

- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityGraphAdapterTypes.ts`
- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityGraphMockData.ts`
- `inventoryIntegrityFetchAdapter.ts`
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

## 7. Future Candidate

Candidate future phases:

- B78-02 Real Compare Validation Integration Result Review
  - Review integration result shape, fallback decisions, and candidate readiness semantics.
  - Keep review read-only and detached from UI / source options.
- B78-03 Real Compare Validation Route Contract Spike
  - Design how route contract validation could be observed without changing route behavior.
  - Preserve GET-only and no-mutation constraints.
- B78-04 Real Compare Fetch Adapter Boundary Design
  - Design fetch adapter boundary before any runtime connection.
  - Keep adapter boundary separate from Graph UI and source option enablement.

This document describes a local fixture mapping integration spike. It does not connect real data, fetch, call API, change routes, connect DB / Supabase, connect adapters, wire UI, integrate source options, change flags, mutate, or enable `real_compare_readonly`.
