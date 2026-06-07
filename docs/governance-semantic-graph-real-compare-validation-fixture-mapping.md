# Governance Semantic Graph Real Compare Validation Fixture Mapping

Phase B77-52 documentation.

このドキュメントは、B77-51 Real Compare Validation Gate Type Design を前提に、B77-43 の compare response fixtures と validation gate types を対応付ける static fixture mapping の設計を整理する。

B77-52 では fixture mapping constant のみを追加する。validation evaluator、runtime validation、fixture evaluation、adapter call、UI display、fetch implementation、API invocation、route change、DB / Supabase access、auth implementation、role implementation、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-52 is fixture mapping only.

Scope:

- `apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationFixtureMapping.ts` を追加する。
- B77-43 の 9 fixtures を B77-51 の validation gate types に対応付ける。
- fixture id / fixture name / expected gate outcomes / expected severity / expected blocking state / expected read-only graph availability を static mapping として定義する。
- fixture 実体は import しない。
- evaluator / helper / runtime validation は追加しない。

Out of scope:

- validation evaluator
- fixture runtime evaluation
- adapter connection
- UI display
- source option change
- feature flag change
- route change
- fetch adapter change
- real data connection
- production enablement

## 2. Mapping Boundary

The mapping boundary is descriptive and type-safe.

Mapping file:

```text
apps/admin-dashboard/src/app/inventoryIntegrityRealCompareValidationFixtureMapping.ts
```

Allowed:

- `import type` from `inventoryIntegrityRealCompareValidationTypes.ts`
- fixture id labels
- fixture export names as string literal labels
- expected validation gate outcomes
- expected read-only availability booleans
- read-only purpose text

Not allowed:

- fixture object import
- adapter import
- route import
- fetch
- DB / Supabase access
- evaluator function
- helper function
- UI component
- execution action

### Fixture ID

`fixtureId` identifies the fixture as a type-level validation target.

Examples:

- `full_metadata`
- `missing_metadata`
- `nested_metadata`
- `partial_lifecycle`
- `unsupported_shape`
- `drifted_key`
- `unavailable_response`
- `source_divergence`
- `enum_drift`

### Expected Gate Outcome

Each fixture maps to one or more expected gate outcomes.

Fields:

- `gateId`
- `expectedStatus`
- `expectedSeverity`
- `expectedBlocking`
- `reason`

These fields describe expectations only. They do not run validation.

### Expected Severity

Severity is a read-only classification:

- `info`
- `warning`
- `error`
- `blocked`

Severity does not trigger execution, remediation, correction, rebuild, repair, replay, sync, or approval.

### Expected Blocking State

`expectedBlocking` and `expectedBlockingFailure` describe whether a fixture should block future `real_compare_readonly` readiness.

Blocking means:

- do not enable real source
- keep guarded / disabled behavior
- prefer unavailable fallback for unsafe projection

Blocking does not mean:

- run a repair
- retry source
- rebuild inventory
- approve a workflow
- mutate data

### Expected Read-only Graph Availability

`expectedReadOnlyGraphAvailability` describes whether a fixture is expected to be safe for read-only graph projection.

Interpretation:

- `true`: fixture may be safe for read-only graph display with caveats.
- `false`: fixture should be treated as unavailable / guarded fallback or readiness blocked.

This is not a UI action and does not enable `real_compare_readonly`.

## 3. Fixture Coverage

B77-52 maps all 9 fixtures.

### fullMetadataCompareResponseFixture

Primary purpose:

- Validate a complete read-only compare response shape.

Expected gates:

- `route_contract`: passed
- `response_shape`: passed
- `metadata_completeness`: passed
- `graph_adapter_normalization`: passed

Expected availability:

- `expectedReadOnlyGraphAvailability: true`
- `expectedBlockingFailure: false`

### missingMetadataCompareResponseFixture

Primary purpose:

- Validate missing metadata handling.

Expected gates:

- `response_shape`: warning
- `metadata_completeness`: failed / blocked
- `ui_guarded_fallback`: passed

Expected availability:

- `expectedReadOnlyGraphAvailability: false`
- `expectedBlockingFailure: true`

### nestedMetadataCompareResponseFixture

Primary purpose:

- Validate nested object metadata normalization.

Expected gates:

- `response_shape`: passed
- `metadata_completeness`: warning
- `graph_adapter_normalization`: warning

Expected availability:

- `expectedReadOnlyGraphAvailability: true`
- `expectedBlockingFailure: false`

### partialLifecycleCompareResponseFixture

Primary purpose:

- Validate partial lifecycle metadata visibility.

Expected gates:

- `metadata_completeness`: warning
- `graph_adapter_normalization`: warning
- `ui_guarded_fallback`: warning

Expected availability:

- `expectedReadOnlyGraphAvailability: true`
- `expectedBlockingFailure: false`

### unsupportedShapeCompareResponseFixture

Primary purpose:

- Validate unsupported metadata shape handling.

Expected gates:

- `unsupported_shape`: blocked
- `response_shape`: failed
- `ui_guarded_fallback`: passed

Expected availability:

- `expectedReadOnlyGraphAvailability: false`
- `expectedBlockingFailure: true`

### driftedKeyCompareResponseFixture

Primary purpose:

- Validate key drift handling.

Expected gates:

- `response_shape`: failed
- `metadata_completeness`: failed / blocked
- `graph_adapter_normalization`: warning

Expected availability:

- `expectedReadOnlyGraphAvailability: false`
- `expectedBlockingFailure: true`

### unavailableCompareResponseFixture

Primary purpose:

- Validate unavailable response handling.

Expected gates:

- `unavailable_response`: blocked
- `metadata_completeness`: failed / blocked
- `ui_guarded_fallback`: passed

Expected availability:

- `expectedReadOnlyGraphAvailability: false`
- `expectedBlockingFailure: true`

### sourceDivergenceCompareResponseFixture

Primary purpose:

- Validate divergence between top-level metadata, response metadata, and raw payload metadata.

Expected gates:

- `source_divergence`: blocked
- `route_contract`: warning
- `graph_adapter_normalization`: warning

Expected availability:

- `expectedReadOnlyGraphAvailability: false`
- `expectedBlockingFailure: true`

### enumDriftCompareResponseFixture

Primary purpose:

- Validate enum drift handling.

Expected gates:

- `enum_drift`: blocked
- `metadata_completeness`: warning
- `graph_adapter_normalization`: failed

Expected availability:

- `expectedReadOnlyGraphAvailability: false`
- `expectedBlockingFailure: true`

## 4. Read-only Safety

The fixture mapping is observability and validation design metadata only.

Safety rules:

- Mapping does not evaluate fixtures.
- Mapping does not call adapter code.
- Mapping does not call route code.
- Mapping does not fetch.
- Mapping does not connect to DB / Supabase.
- Mapping does not mutate.
- Mapping does not create UI action buttons.
- Mapping does not connect to correction / rebuild / repair / replay / sync.
- Mapping does not enable `real_compare_readonly`.

The mapping can describe:

- expected pass / warning / failed / blocked state
- expected severity
- expected blocking behavior
- expected read-only graph availability
- read-only validation purpose

The mapping cannot perform:

- recovery
- retry
- correction
- repair
- rebuild
- sync
- approval
- auto-fix

Required boundary wording for future use:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `GET Only / GET のみ`
- `No Mutation / データ変更なし`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`

## 5. Future Candidate

Candidate future phases:

- Real Compare Validation Gate Evaluator Design
  - Design a pure evaluator that reads fixture-like metadata and returns validation summaries.
  - No fetch, no route call, no mutation, no UI control.

- Real Compare Validation Fixture Evaluator
  - Implement fixture-only evaluator after the evaluator design is accepted.
  - Use static fixtures only.
  - Keep output as read-only validation summary.

- Real Compare Guarded Availability Wiring
  - Use validation summary to inform guarded availability metadata.
  - Keep `real_compare_readonly` hidden / disabled unless hidden flag, admin guard, and validation gates all pass.
  - Do not connect live data in the same phase.

Recommended next order:

1. B77-53 Real Compare Validation Gate Evaluator Design.
2. B77-54 Real Compare Validation Fixture Evaluator.
3. B77-55 Real Compare Guarded Availability Wiring.
4. Later guarded read-only fetch design only after validation evidence is accepted.

This document is a fixture mapping design gate. It does not implement evaluator logic, route invocation, fetch, UI display, authorization, mutation, or `real_compare_readonly` enablement.
