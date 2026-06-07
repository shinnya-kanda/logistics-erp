# Governance Semantic Graph Real Compare Validation Gate Type Design

Phase B77-51 documentation.

このドキュメントは、B77-50 Real Compare Validation Spike Design を前提に、将来 `real_compare_readonly` を有効化する前の validation gate を type-level contract として整理する documentation phase である。

B77-51 では `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationTypes.ts` に型定義のみを追加する。runtime validation、fixture evaluation、fetch implementation、API invocation、route change、DB / Supabase access、auth implementation、role implementation、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-51 is Real Compare Validation Gate type design.

Scope:

- B77-50 の validation spike design を受け、validation gate の typed contract を追加する。
- fixture / route response / fetch adapter / inventory adapter / graph adapter / graph UI を read-only に検証するための型境界を定義する。
- `real_compare_readonly` の guarded availability を型として表現する。
- 将来の validation evaluator や fixture mapping が実装される前に、結果 shape、status、severity、source、blocking semantics を固定する。

Out of scope:

- runtime validation implementation
- fixture evaluation function
- adapter connection
- UI display
- source option change
- feature flag change
- route change
- fetch adapter change
- real data connection
- production enablement

## 2. Type Boundary

The new type file is:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationTypes.ts
```

This file is type-only. It must not import route code, call runtime APIs, fetch data, connect to DB / Supabase, render UI, or create execution actions.

### Gate ID

`RealCompareValidationGateId` identifies the gate being evaluated.

Gate IDs:

- `route_contract`
- `response_shape`
- `metadata_completeness`
- `enum_drift`
- `unsupported_shape`
- `unavailable_response`
- `source_divergence`
- `graph_adapter_normalization`
- `ui_guarded_fallback`

Boundary:

- Gate ID is a classification label.
- It is not an execution instruction.
- It does not trigger route calls, adapter calls, fallback calls, or UI actions.

### Severity

`RealCompareValidationSeverity` describes validation importance.

Severity values:

- `info`
- `warning`
- `error`
- `blocked`

Boundary:

- Severity is observability metadata.
- `blocked` means the source should not be considered valid for read-only graph enablement.
- Severity does not create approval, repair, correction, rebuild, or sync authority.

### Status

`RealCompareValidationStatus` describes evaluation outcome.

Status values:

- `not_evaluated`
- `passed`
- `warning`
- `failed`
- `blocked`

Boundary:

- Status is a read-only validation result.
- `passed` does not enable `real_compare_readonly` by itself.
- `failed` or `blocked` should keep the source guarded / unavailable in future wiring.

### Validation Source

`RealCompareValidationSource` identifies where validation evidence came from.

Source values:

- `fixture`
- `route_response`
- `fetch_adapter`
- `inventory_adapter`
- `graph_adapter`
- `graph_ui`

Boundary:

- Source labels describe evidence origin.
- They do not call the source.
- They do not authorize runtime connection.

### Validation Result

`RealCompareValidationResult` captures a single gate result.

Fields:

- `gateId`
- `status`
- `severity`
- `source`
- `message`
- `details`
- `isBlocking`

Boundary:

- `message` and `details` are explanation fields.
- `details` is `Record<string, unknown>` for safe, non-executable metadata.
- `isBlocking` controls future readiness interpretation, not workflow execution.

### Validation Summary

`RealCompareValidationSummary` captures a set of validation results for `real_compare_readonly`.

Fields:

- `sourceMode: "real_compare_readonly"`
- `isEvaluated`
- `isValidForReadOnlyGraph`
- `hasBlockingFailure`
- `results`

Boundary:

- Summary is read-only readiness metadata.
- Summary does not enable source visibility.
- Summary does not fetch or mutate.

### Guarded Availability

`RealCompareGuardedAvailability` models future availability while preserving B77-49 constraints.

Fields:

- `sourceMode: "real_compare_readonly"`
- `isVisible`
- `isGuarded: true`
- `isEnabled: false`
- `isLiveData: false`
- `validation`

Boundary:

- Availability is a read-only state description.
- It preserves guarded / disabled / non-live semantics.
- It does not create a source option change or UI behavior change in B77-51.

### Fixture Mapping

`RealCompareValidationFixtureMapping` maps B77-43-style validation fixtures to gate expectations.

Fields:

- `fixtureId`
- `primaryGateId`
- `secondaryGateIds`
- `expectedStatus`
- `expectedFallbackRequired`
- `readOnlyPurpose`

Boundary:

- Mapping is descriptive.
- It does not evaluate fixtures.
- It does not connect fixture data to the UI or adapter.

## 3. Read-only Contract

Validation result types are for observability and readiness judgment only.

Read-only contract:

- Validation types do not contain execution callbacks.
- Validation types do not contain action button metadata.
- Validation types do not contain route invocation metadata.
- Validation types do not contain mutation payloads.
- Validation types do not contain approval workflow state.
- Validation types do not connect to correction / rebuild / repair / replay / sync.
- Validation types do not change `InventoryIntegrityGraphData`.
- Validation types do not change source option behavior.

Interpretation:

- A validation result can say a gate is blocked.
- A validation result cannot perform the blocking action.
- A validation result can explain why fallback is expected.
- A validation result cannot invoke fallback.
- A validation summary can say the source is not valid for read-only graph.
- A validation summary cannot enable or disable the source.

Required wording for future UI usage:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `GET Only / GET のみ`
- `No Mutation / データ変更なし`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`

## 4. Guarded Rollout State

B77-51 does not change guarded rollout behavior.

The following conditions remain required:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
```

Current behavior preserved:

- `real_compare_readonly` is hidden unless hidden flag and static admin guard both pass.
- Even if visible in a future phase, it remains disabled / guarded until a validation gate explicitly allows the next phase.
- It does not fetch.
- It does not call API.
- It does not call route.
- It does not connect to DB / Supabase.
- It does not mutate.
- It does not expose execution controls.

Guard interpretation:

- Hidden flag controls source option candidate visibility.
- Static admin guard controls admin-only candidate visibility.
- Validation summary can inform readiness, but does not bypass hidden flag or admin guard.
- Guarded availability keeps `isEnabled: false` and `isLiveData: false` in B77-51.

## 5. Future Wiring

Candidate future phases:

- Real Compare Validation Fixture Mapping
  - Add static mapping records from B77-43 fixtures to `RealCompareValidationFixtureMapping`.
  - Keep fixture-only, type-safe, and read-only.
  - Do not evaluate fixtures at runtime unless a separate evaluator phase is approved.

- Real Compare Validation Gate Evaluator Design
  - Design a pure evaluator that accepts fixture-like input and returns `RealCompareValidationSummary`.
  - Define no-fetch, no-route-call, no-mutation boundaries.
  - Keep failure behavior as blocked / unavailable metadata.

- Real Compare Guarded Availability Wiring
  - Wire validation summary into guarded availability metadata.
  - Keep `real_compare_readonly` hidden / disabled unless all prior gates are explicitly passed.
  - Do not connect live data in the same phase.

Recommended next order:

1. B77-52 Real Compare Validation Fixture Mapping.
2. B77-53 Real Compare Validation Gate Evaluator Design.
3. B77-54 Real Compare Guarded Availability Wiring.
4. Later guarded read-only fetch design only after validation evidence is accepted.

This document is a type design gate. It does not implement validation execution, route invocation, fetch, UI display, authorization, mutation, or `real_compare_readonly` enablement.
