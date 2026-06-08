# Governance Semantic Graph Real Compare Validation Gate Evaluator Design

Phase B77-53 documentation.

このドキュメントは、B77-51 Real Compare Validation Gate Type Design と B77-52 Real Compare Validation Fixture Mapping を前提に、将来の Real Compare Validation Gate Evaluator の評価設計を整理する design-only phase である。

B77-53 では evaluator implementation、fixture runtime evaluation、helper function、runtime validation、fetch implementation、API invocation、route change、DB / Supabase access、auth implementation、role implementation、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-53 is evaluator design only.

Scope:

- B77-51 の validation types を前提にする。
- B77-52 の static fixture mapping を前提にする。
- `RealCompareValidationFixtureMapping` から `RealCompareValidationSummary` と `RealCompareGuardedAvailability` を将来どう投影するかを設計する。
- fixture mapping -> validation gate evaluator -> validation result summary -> guarded availability decision の read-only judgement flow を明文化する。
- evaluator result が表示解禁や実データ接続を意味しないことを固定する。

Out of scope:

- evaluator implementation
- runtime validation
- fixture runtime evaluation
- helper function
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- auth / role implementation
- mutation
- correction / repair / rebuild / replay / sync / auto-fix
- workflow approval
- execution control

Current source guard state to preserve:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
real_compare_readonly.isGuarded = true
real_compare_readonly.isEnabled = false
real_compare_readonly.isLiveData = false
```

## 2. Evaluator Boundary

The future evaluator boundary is a read-only projection boundary. It converts static validation expectations into validation summary metadata. It does not inspect live data, call routes, invoke adapters, or execute recovery.

Input:

- `RealCompareValidationFixtureMapping`
- fixture id
- fixture name
- expected gate outcomes
- expected read-only graph availability
- expected blocking failure
- read-only purpose

Output:

- `RealCompareValidationSummary`
- `RealCompareGuardedAvailability`
- read-only judgement metadata only

The output may describe:

- whether the mapping was evaluated
- whether the fixture is valid for read-only graph projection
- whether any blocking failure exists
- which gate results were projected from expected outcomes
- whether guarded availability should remain unavailable / disabled

The output must not return:

- execution action
- correction request
- repair request
- rebuild request
- replay request
- sync request
- workflow approval state
- route invocation instruction
- mutation payload
- UI action button metadata

Boundary interpretation:

- `RealCompareValidationFixtureMapping` is the evaluator input contract.
- `expectedOutcomes` are projected into `RealCompareValidationResult` records.
- `RealCompareValidationSummary` is readiness metadata only.
- `RealCompareGuardedAvailability` preserves `isGuarded: true`, `isEnabled: false`, and `isLiveData: false`.
- Passing validation does not change source option visibility or enablement in B77-53.

## 3. Evaluation Flow

The future evaluation flow should be:

```text
fixture mapping
↓
expected gate outcomes
↓
result projection
↓
blocking failure aggregation
↓
read-only graph availability judgement
↓
guarded availability projection
```

Flow meaning:

- fixture mapping
  - Static B77-52 mapping record for one fixture.
  - Contains fixture id, fixture name, expected outcomes, expected availability, and expected blocking state.
- expected gate outcomes
  - Gate-level expectations such as `route_contract`, `metadata_completeness`, `unsupported_shape`, or `enum_drift`.
  - Each outcome carries expected status, severity, blocking flag, and reason.
- result projection
  - Each expected gate outcome becomes a future `RealCompareValidationResult` record.
  - Projection is descriptive and read-only.
- blocking failure aggregation
  - Any blocking expected outcome contributes to `hasBlockingFailure`.
  - Blocked / failed states are aggregated before availability judgement.
- read-only graph availability judgement
  - The evaluator compares expected blocking state and expected read-only graph availability.
  - Unsafe states must fall closed to unavailable judgement.
- guarded availability projection
  - The summary is attached to guarded availability metadata.
  - `isEnabled` remains `false`; availability is not live data enablement.

This flow is not an execution flow. The arrows describe judgement order only. They do not trigger transport, correction, rebuild, repair, replay, sync, auto-fix, approval, or workflow execution.

## 4. Gate Evaluation Rules

Future evaluator rules should be deterministic and fail closed.

Blocking rules:

- If any expected outcome has `expectedBlocking: true`, `hasBlockingFailure` must be `true`.
- If a gate has status `blocked`, the fixture is not valid for read-only graph availability.
- If a gate has status `failed` and it is blocking, the fixture is not valid for read-only graph availability.
- `unsupported_shape` is blocking.
- `enum_drift` is blocking when unknown values may understate risk.
- `unavailable_response` always requires unavailable fallback.

Availability rules:

- `blocked` status turns `isValidForReadOnlyGraph` to `false`.
- Blocking `failed` status turns `isValidForReadOnlyGraph` to `false`.
- `expectedReadOnlyGraphAvailability: false` turns `isValidForReadOnlyGraph` to `false`.
- `expectedBlockingFailure: true` turns `hasBlockingFailure` to `true`.
- A fixture can be displayable only when it has no blocking failure and expected read-only graph availability is `true`.

Warning rules:

- `warning` status is generally compatible with read-only display.
- Warning display requires disclosure.
- Warning display must not be presented as healthy production readiness.
- Warning display must not prompt operator execution.
- Partial lifecycle and nested metadata warnings can remain displayable only when mapping says they are non-blocking.

Not evaluated rules:

- `not_evaluated` means the source remains guarded fallback.
- `not_evaluated` does not permit read-only graph availability.
- A not evaluated summary must not enable `real_compare_readonly`.

Gate-specific rules:

- `unavailable_response`
  - Always maps to unavailable fallback.
  - Must not be converted to mock graph data.
- `unsupported_shape`
  - Must fail closed.
  - Must not coerce unknown shape into graph data.
- `enum_drift`
  - Must block if drift could understate severity, confidence, risk, or lifecycle caveats.
- `source_divergence`
  - May be warning or blocking only according to mapping.
  - If mapping marks divergence as blocking, evaluator must preserve blocking judgement.
  - Metadata precedence must not be invented by evaluator implementation.
- `ui_guarded_fallback`
  - May pass while the overall fixture remains unavailable.
  - A passed fallback UI gate means the unavailable display is expected, not that source data is valid.

## 5. Guarded Availability Rules

B77-53 does not change `real_compare_readonly` behavior.

Rules:

- `real_compare_readonly` remains disabled / guarded.
- Hidden flag and admin-only guard remain false.
- Validation result can inform future readiness, but cannot enable the source.
- Even if validation summary is valid, `isEnabled` remains `false`.
- Even if validation summary is valid, `isLiveData` remains `false`.
- Validation is a safety condition for future enablement review, not display release.
- Validation failure means `fallback_unavailable`.
- UI action button must not be added.
- Source selection remains display-only and local view state / configuration only.

Future guarded availability projection should preserve:

```text
sourceMode: real_compare_readonly
isGuarded: true
isEnabled: false
isLiveData: false
validation: RealCompareValidationSummary
```

Interpretation:

- `isVisible` remains controlled by hidden flag and admin-only guard in existing source option logic.
- The evaluator should not bypass hidden flag.
- The evaluator should not bypass admin-only guard.
- The evaluator should not alter source option definitions.
- The evaluator should not alter Graph UI behavior in B77-53.

## 6. Failure / Unavailable Policy

Evaluator failure means safe unavailability.

Failure policy:

- evaluator failure -> `fallback_unavailable`
- blocked outcome -> `fallback_unavailable`
- blocking failed outcome -> `fallback_unavailable`
- unavailable response -> `fallback_unavailable`
- unsupported shape -> `fallback_unavailable`
- blocking enum drift -> `fallback_unavailable`
- blocking source divergence -> `fallback_unavailable`
- not evaluated -> guarded fallback

Strict prohibitions:

- Do not auto-recover.
- Do not auto-correct.
- Do not repair.
- Do not rebuild.
- Do not replay.
- Do not sync.
- Do not auto-fix.
- Do not connect validation to correction workflows.
- Do not connect validation to repair workflows.
- Do not connect validation to rebuild workflows.
- Do not connect validation to sync workflows.
- Do not prompt operators to execute recovery actions.
- Do not add retry, repair, rebuild, sync, approve, correction, or execution controls.
- Do not silently fallback from real source failure to mock data.

Warning / disclosure policy:

- Warnings are read-only caveats.
- Disclosures explain guarded state, fallback reason, and validation caveat.
- Inspector details are explanations, not instructions.
- Relation edges remain semantic relations, not execution routes.
- Operator wording must avoid action prompts.

Required wording for future UI usage:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `GET Only / GET のみ`
- `No Mutation / データ変更なし`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`
- `Graph Unavailable / グラフ利用不可`
- `Safety Fallback Active / 安全側フォールバック中`

## 7. Non-goals

B77-53 does not include:

- No evaluator implementation.
- No fixture runtime evaluation.
- No helper function.
- No runtime validation.
- No API fetch.
- No DB access.
- No Supabase client.
- No route implementation.
- No route change.
- No auth implementation.
- No role implementation.
- No execution workflow.
- No workflow approval.
- No correction.
- No rebuild.
- No repair.
- No replay.
- No sync.
- No auto-fix.
- No retry / repair / rebuild / sync / approve button.
- No real compare integration.
- No production enablement.
- No package install.

変更禁止:

- `StaticGraphPrototype.tsx`
- `inventoryIntegrityGraphFeatureFlags.ts`
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

- network source call
- Supabase client
- mutation implementation
- POST implementation
- insert / update / upsert / delete / rpc operation
- workflow execution
- approval workflow
- remediation workflow

## 8. Future Candidate

Candidate future phases:

- B77-54 Real Compare Validation Fixture Evaluator
  - Implement a pure fixture evaluator that accepts `RealCompareValidationFixtureMapping`.
  - Project expected outcomes into validation results.
  - Keep it fixture-only, read-only, and action-free.
- B77-55 Real Compare Validation Summary Projection
  - Review summary aggregation rules and disclosure wording.
  - Confirm blocked, failed, warning, and not evaluated behavior.
  - Keep summary output as readiness metadata only.
- B77-56 Real Compare Guarded Availability Wiring
  - Wire validation summary into guarded availability metadata.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.
  - Do not connect live data in the same phase.
- Later Guarded Read-only Fetch Design
  - Only after validation evidence is accepted.
  - Must preserve GET only, no mutation, no execution controls, and unavailable fallback.

Recommended order:

1. B77-54 Real Compare Validation Fixture Evaluator.
2. B77-55 Real Compare Validation Summary Projection.
3. B77-56 Real Compare Guarded Availability Wiring.
4. Later guarded read-only fetch design only after all validation and guard evidence is accepted.

This document is an evaluator design gate. It does not implement, expose, invoke, fetch, authorize, mutate, or enable `real_compare_readonly`.
