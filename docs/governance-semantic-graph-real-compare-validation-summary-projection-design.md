# Governance Semantic Graph Real Compare Validation Summary Projection Design

Phase B77-56 documentation.

このドキュメントは、B77-51 から B77-55 で定義した validation types、fixture mapping、fixture evaluator、unit tests を前提に、`RealCompareValidationSummary` と `RealCompareGuardedAvailability` を将来 Graph UI の disclosure / Inspector / source metadata 表示へ投影するための summary projection design を整理する。

B77-56 では projection implementation、projection type implementation、UI wiring、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-56 is summary projection design only.

Scope:

- B77-51 の validation types を前提にする。
- B77-52 の fixture mapping を前提にする。
- B77-53 の evaluator design を前提にする。
- B77-54 の fixture evaluator を前提にする。
- B77-55 の evaluator tests を前提にする。
- `RealCompareValidationSummary` と `RealCompareGuardedAvailability` を将来 disclosure / Inspector / source metadata 表示へ読み替える設計を整理する。
- projection output が read-only explanation であり、source enablement や execution authority ではないことを固定する。

Out of scope:

- projection implementation
- projection type implementation
- UI wiring
- source option integration
- feature flag change
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- fixture payload import
- real data connection
- production enablement

## 2. Projection Boundary

The future projection boundary is a read-only metadata interpretation boundary. It can translate validation readiness into UI-safe wording and Inspector-safe explanation. It must not produce command metadata or source enablement state.

Input:

- `RealCompareValidationSummary`
- `RealCompareGuardedAvailability`

Future output:

- graph source disclosure metadata
- Inspector validation summary
- read-only warning metadata
- guarded fallback reason
- source availability explanation

The future output may describe:

- whether validation is passed, warning-only, blocked, not evaluated, or unavailable
- why source availability is guarded
- which validation gates contributed reasons
- why fallback is expected
- why display remains read-only
- why `real_compare_readonly` is not enabled

The future output must not include:

- execution action
- correction action
- rebuild action
- repair action
- replay action
- sync action
- approval workflow
- mutation intent
- retry instruction
- route invocation instruction
- fetch instruction
- source option enablement instruction

Boundary interpretation:

- `RealCompareValidationSummary` is readiness metadata.
- `RealCompareGuardedAvailability` is guarded state metadata.
- Projection is a display explanation layer only.
- Projection does not change validation results.
- Projection does not change hidden flag, admin-only guard, source option, graph adapter, or UI state.

## 3. Projection Flow

The future projection flow should be:

```text
validation summary
↓
blocking / warning / valid classification
↓
guarded availability interpretation
↓
disclosure metadata projection
↓
Inspector read-only summary
↓
source availability explanation
```

Flow meaning:

- validation summary
  - Reads `sourceMode`, `isEvaluated`, `isValidForReadOnlyGraph`, `hasBlockingFailure`, and gate results.
- blocking / warning / valid classification
  - Classifies the summary into display-safe states such as passed, warning, blocked, not evaluated, or unavailable.
- guarded availability interpretation
  - Reads `isGuarded`, `isEnabled`, `isLiveData`, `isVisible`, and optional validation summary.
  - Treats `isVisible` as projected metadata, not actual UI source visibility.
- disclosure metadata projection
  - Produces future badge / source metadata wording.
  - Keeps wording explicit that this is validation disclosure, not source enablement.
- Inspector read-only summary
  - Lists validation gate reasons and caveats as explanation.
  - Does not include action instructions.
- source availability explanation
  - Explains why real compare remains guarded, disabled, unavailable, or only future-eligible.
  - Does not ask operators to execute recovery or remediation.

This flow is not an execution flow. The arrows describe interpretation order only. They do not trigger fetch, route calls, correction, repair, rebuild, replay, sync, auto-fix, approval, or workflow execution.

## 4. Classification Rules

Future projection should classify summaries conservatively.

### Blocking Failure

If `hasBlockingFailure === true`:

- disclosure status should be `blocked` or `unavailable`.
- headline should indicate validation blocked / unavailable.
- reasons should include blocking gate messages.
- availability explanation should point to guarded fallback.
- read-only graph availability should not be presented as valid.
- UI must not show action controls.

### Valid Read-only Graph

If `isValidForReadOnlyGraph === true` and `hasBlockingFailure === false`:

- disclosure status may be `passed`.
- headline may indicate validation passed for read-only projection.
- description must state that this is validation readiness only.
- projection must not enable `real_compare_readonly`.
- projection must not imply live data or production readiness.
- guarded availability still keeps `isEnabled: false` and `isLiveData: false`.

### Warning Status

If any result has `status === "warning"`:

- disclosure status should include warning when no blocking status is present.
- warning reasons should be visible.
- warning must be shown as read-only caveat.
- warning must not prompt operator action.
- warning must not be hidden by a passed headline.

### Not Evaluated

If any result has `status === "not_evaluated"` or summary is not evaluated:

- disclosure status should be `not_evaluated`.
- explanation should say validation is not available yet.
- guarded fallback disclosure is required.
- `real_compare_readonly` remains disabled / guarded.
- no action button or retry prompt is allowed.

### Unavailable Response Gate

If a result has `gateId === "unavailable_response"`:

- disclosure status should be `unavailable`.
- guarded fallback reason should mention unavailable response.
- source availability explanation should not ask for retry.
- unavailable must not be converted to mock success.

### Enum Drift / Unsupported Shape

If a result has `gateId === "enum_drift"` or `gateId === "unsupported_shape"` and is failed / blocked / blocking:

- disclosure status should be `blocked`.
- reasons should include the gate message.
- explanation should emphasize risk understatement or unsupported shape risk.
- projection must not show a healthy source state.

### Source Divergence

If a result has `gateId === "source_divergence"`:

- warning or blocked interpretation must follow mapping / summary output.
- if blocking, disclosure status should be `blocked`.
- if warning-only, disclosure status should be `warning`.
- projection must not invent metadata precedence.
- projection must not silently resolve divergence.

## 5. Metadata Shape Design

B77-56 does not implement a projection type. The following is a future design candidate only.

```ts
type RealCompareValidationProjection = {
  sourceMode: "real_compare_readonly";
  disclosureStatus:
    | "passed"
    | "warning"
    | "blocked"
    | "not_evaluated"
    | "unavailable";
  headline: string;
  description: string;
  reasons: string[];
  guardedFallbackReason?: string;
  sourceAvailabilityExplanation: string;
  isReadOnly: true;
  isActionable: false;
  isExecutionAllowed: false;
};
```

Field meanings:

- `sourceMode`
  - Always describes `real_compare_readonly`.
  - Does not select or enable the source.
- `disclosureStatus`
  - Display classification for validation summary.
  - Does not change guard state.
- `headline`
  - Short disclosure text for future badge / source metadata.
  - Must avoid command wording.
- `description`
  - Read-only explanation for Inspector or source disclosure.
  - Must state validation readiness is not production enablement.
- `reasons`
  - Gate messages and caveats.
  - Must be explanatory, not instructional.
- `guardedFallbackReason`
  - Optional reason for unavailable / guarded fallback.
  - Must not request retry, repair, rebuild, sync, or approval.
- `sourceAvailabilityExplanation`
  - Explains current guarded / disabled / non-live state.
  - Must remain separate from source option visibility logic.
- `isReadOnly`
  - Always `true`.
- `isActionable`
  - Always `false`.
- `isExecutionAllowed`
  - Always `false`.

This candidate type is documentation-only in B77-56.

## 6. UI Boundary

Future UI usage must remain read-only.

Allowed future UI surfaces:

- disclosure badge
- source metadata text
- Inspector validation summary
- warning caveat list
- guarded fallback explanation
- unavailable explanation

Required UI boundary:

- disclosure / badge / Inspector is read-only.
- action button is not shown.
- retry / repair / rebuild / sync / approve is not shown.
- operator is not prompted to execute an operation.
- `fallback_unavailable` is display-only.
- `real_compare_readonly` enablement conditions remain separate.
- validation projection does not control hidden flag.
- validation projection does not control admin-only guard.
- validation projection does not control source option filtering.

Required wording:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `GET Only / GET のみ`
- `No Mutation / データ変更なし`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`
- `Validation Disclosure / 検証結果表示`
- `Guarded Source / ガード中ソース`

Forbidden UI wording / controls:

- `Run`
- `Execute`
- `Approve`
- `Repair`
- `Rebuild`
- `Replay`
- `Sync`
- `Auto-fix`
- `Correct`
- retry button
- repair button
- rebuild button
- sync button
- approval button
- action recommendation panel

## 7. Guarded Rollout State

B77-56 preserves the current guarded rollout state.

Required current state:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
UI wiring = none
```

Current behavior preserved:

- `real_compare_readonly` remains hidden by hidden flag and admin-only guard.
- `real_compare_readonly` remains disabled / guarded.
- `real_compare_readonly` remains non-live.
- Graph UI behavior is unchanged.
- Source option behavior is unchanged.
- Feature flags are unchanged.
- Validation projection design does not expose a source.
- Validation projection design does not connect to fetch, adapter, route, or DB.

Interpretation:

- A future projection can explain validation readiness.
- A future projection cannot enable the source.
- A future projection cannot bypass B77-49 guarded / disabled structure.
- A future projection cannot convert fallback into healthy data.

## 8. Non-goals

B77-56 does not include:

- No projection implementation.
- No projection type implementation.
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
- `inventoryIntegrityRealCompareValidationTypes.ts`
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

## 9. Future Candidate

Candidate future phases:

- B77-57 Real Compare Validation Summary Projection Type Design
  - Define a type-only projection contract if the display shape needs to be shared.
  - Keep it read-only and non-executable.
- Real Compare Validation Summary Projection Implementation
  - Implement a pure projection function after the type design is accepted.
  - Do not wire it to UI or source option in the same phase.
- Real Compare Guarded Availability Disclosure Design
  - Design exact wording and placement for guarded availability disclosure.
  - Keep action controls out of scope.
- Real Compare Guarded Availability Wiring
  - Wire disclosure metadata into a future display surface only after design and tests.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.

Recommended order:

1. B77-57 Real Compare Validation Summary Projection Type Design.
2. Real Compare Validation Summary Projection Implementation.
3. Real Compare Guarded Availability Disclosure Design.
4. Real Compare Guarded Availability Wiring.
5. Later guarded read-only fetch design only after validation and disclosure evidence is accepted.

This document is a summary projection design gate. It does not implement projection code, expose a source option, fetch, call a route, authorize, mutate, or enable `real_compare_readonly`.
