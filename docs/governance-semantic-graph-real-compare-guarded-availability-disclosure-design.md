# Governance Semantic Graph Real Compare Guarded Availability Disclosure Design

Phase B77-60 documentation.

このドキュメントは、B77-57 から B77-59 で追加した Real Compare Validation Summary Projection の types / implementation / tests を前提に、`RealCompareGuardedAvailability`、`RealCompareValidationDisclosureMetadata`、`RealCompareValidationInspectorMetadata` を将来 Graph UI の disclosure / badge / Inspector へ表示するための Guarded Availability Disclosure Design を整理する。

B77-60 は design only である。UI implementation、disclosure renderer、badge renderer、Inspector wiring、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、fixture payload import、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-60 is guarded availability disclosure design only.

Scope:

- B77-57 の projection types を前提にする。
- B77-58 の projection implementation を前提にする。
- B77-59 の projection tests を前提にする。
- `RealCompareGuardedAvailability` と validation disclosure metadata を将来 Graph UI へどう説明表示するかを設計する。
- disclosure / badge / Inspector が read-only explanation であり、source enablement や execution authority ではないことを固定する。

Out of scope:

- UI implementation
- UI wiring
- disclosure renderer
- badge renderer
- Inspector wiring
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

## 2. Disclosure Boundary

The guarded availability disclosure boundary is a future display interpretation boundary. It may explain guarded state, validation status, fallback reason, and unavailable conditions. It must not produce command metadata, workflow state, or source enablement state.

Input:

- `RealCompareGuardedAvailability`
- `RealCompareValidationDisclosureMetadata`
- `RealCompareValidationInspectorMetadata`

Future display surface:

- graph source disclosure
- source badge
- Inspector validation section
- guarded fallback reason
- unavailable fallback explanation

Forbidden display surface:

- execution action button
- retry button
- repair button
- rebuild button
- sync button
- approve button
- mutation workflow
- role escalation workflow
- auto-fix control
- correction control
- workflow execution panel

Boundary interpretation:

- `RealCompareGuardedAvailability` describes guarded / disabled / non-live availability metadata.
- `RealCompareValidationDisclosureMetadata` describes validation disclosure metadata.
- `RealCompareValidationInspectorMetadata` describes Inspector-safe counts and summary status.
- Disclosure is display-only.
- Badge is state-only.
- Inspector is explanation-only.
- None of these surfaces can enable `real_compare_readonly`.
- None of these surfaces can bypass hidden flag, admin-only guard, source option filtering, graph adapter boundaries, or UI state.

## 3. Display Policy

Future guarded availability disclosure must remain read-only.

General policy:

- disclosure is read-only only.
- badge is state display only.
- Inspector is validation summary display only.
- failed / blocked status is shown as fallback reason.
- unavailable status is shown as `fallback_unavailable` explanation.
- warning status is shown as caution disclosure.
- passed status does not mean `real_compare_readonly` is enabled.
- not evaluated status is shown as guarded fallback.

Display wording principles:

- Use `Read Only / 読み取り専用`.
- Use `Observability Only / 観測専用`.
- Use `No Execution Controls / 実行操作なし`.
- Use `No Execution Route / 実行経路ではありません`.
- Use `Guarded Source / ガード中ソース`.
- Use `Validation Disclosure / 検証結果表示`.
- Avoid command wording such as `Run`, `Execute`, `Approve`, `Repair`, `Rebuild`, `Replay`, `Sync`, `Auto-fix`, `Correct`, or `Retry`.

### Passed

Passed disclosure means the validation summary is a read-only candidate.

Display policy:

- show as validation passed for read-only projection.
- show as candidate readiness, not production enablement.
- keep `isGuarded: true`, `isEnabled: false`, and `isLiveData: false`.
- do not change source option visibility.
- do not show live-data wording without read-only caveat.

### Warning

Warning disclosure means validation is display-compatible only with visible caveats.

Display policy:

- show warning as caution disclosure.
- keep warning reasons visible.
- do not hide warning behind passed source wording.
- do not create operator tasks.
- do not show retry / repair / rebuild / sync / approve controls.

### Blocked

Blocked disclosure means read-only projection readiness is blocked.

Display policy:

- show blocked state as fallback required.
- show blocking reasons as explanatory metadata.
- prefer guarded fallback / unavailable explanation.
- do not convert blocked state to healthy source display.
- do not execute fallback logic from the disclosure surface.

### Unavailable

Unavailable disclosure means `fallback_unavailable` explanation is required.

Display policy:

- show `Unavailable / fallback_unavailable`.
- show unavailable response or source unavailability as a read-only reason.
- keep `Graph Unavailable / グラフ利用不可` wording available for future UI.
- do not silently fallback to mock.
- do not prompt retry.

### Not Evaluated

Not evaluated disclosure means validation has not been completed.

Display policy:

- show as guarded fallback.
- explain that validation is not available yet.
- keep `real_compare_readonly` guarded, disabled, and non-live.
- do not show action controls.
- do not imply admin or validation bypass.

## 4. Disclosure Status Mapping

Future display status mapping:

| Disclosure status | Display label | Meaning | Required boundary |
| --- | --- | --- | --- |
| `passed` | `Validation passed / read-only candidate` | Validation passed for future read-only projection candidate only | Does not enable `real_compare_readonly` |
| `warning` | `Guarded warning / needs review` | Warning caveats must be visible before any future display review | No action prompt |
| `blocked` | `Blocked / fallback required` | Blocking validation prevents readiness | Fallback explanation only |
| `unavailable` | `Unavailable / fallback_unavailable` | Source or response is unavailable for safe projection | No retry or mock fallback |
| `not_evaluated` | `Not evaluated / guarded fallback` | Validation summary is not evaluated | Guarded / disabled / non-live |

Mapping rules:

- `passed` is a readiness signal only.
- `warning` is a caution signal only.
- `blocked` is a safety signal only.
- `unavailable` is an unavailable explanation only.
- `not_evaluated` is a guarded fallback explanation only.
- No status is an execution permission.
- No status is a role escalation.
- No status is a mutation request.

## 5. Inspector Policy

Future Inspector usage must present validation metadata as explanation only.

Candidate Inspector fields:

- `disclosureStatus`
- `headline`
- `description`
- `reasons`
- `totalResults`
- `blockingCount`
- `warningCount`
- `hasUnavailableCondition`
- `isReadOnly`
- `isActionable`
- `isExecutionAllowed`

Inspector display policy:

- `disclosureStatus` explains current validation disclosure state.
- `headline` is a short read-only summary.
- `description` is explanatory, not instructional.
- `reasons` list gate messages and caveats.
- `totalResults` is an observability count.
- `blockingCount` is a validation count, not a task count.
- `warningCount` is a caution count, not an action queue.
- `hasUnavailableCondition` explains unavailable fallback reason.
- `isReadOnly` must remain true.
- `isActionable` must remain false.
- `isExecutionAllowed` must remain false.

B77-60 does not implement Inspector rendering. It only defines future policy.

Forbidden Inspector content:

- retry instruction
- repair instruction
- rebuild instruction
- sync instruction
- approve instruction
- correction instruction
- route invocation instruction
- mutation payload
- role escalation workflow
- action button metadata

## 6. Guarded Rollout State

B77-60 preserves the current guarded rollout state.

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

- `real_compare_readonly` remains hidden unless hidden flag and static admin guard both pass.
- `real_compare_readonly` remains disabled / guarded.
- `real_compare_readonly` remains non-live.
- Graph UI behavior is unchanged.
- Source option behavior is unchanged.
- Feature flags are unchanged.
- Projection implementation is unchanged.
- Projection tests are unchanged.
- No disclosure renderer is added.
- No Inspector wiring is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility.
- Static admin guard controls admin-only candidate visibility.
- Validation disclosure can inform future readiness display.
- Guarded availability disclosure cannot enable the source.
- Guarded availability disclosure cannot bypass hidden flag or admin guard.
- Guarded availability disclosure cannot convert fallback into healthy data.

## 7. Non-goals

B77-60 does not include:

- No UI implementation.
- No disclosure renderer.
- No badge renderer.
- No Inspector wiring.
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
- No fetch adapter integration.
- No graph adapter integration.
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
- `inventoryIntegrityGraphTypes.ts`
- `inventoryIntegrityGraphMockData.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityRealCompareValidationTypes.ts`
- `inventoryIntegrityRealCompareValidationProjectionTypes.ts`
- `inventoryIntegrityRealCompareValidationProjection.ts`
- `inventoryIntegrityRealCompareValidationProjection.test.ts`
- `inventoryIntegrityRealCompareValidationFixtureMapping.ts`
- `inventoryIntegrityRealCompareValidationFixtureEvaluator.ts`
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

## 8. Future Candidate

Candidate future phases:

- Real Compare Guarded Availability Disclosure Type Design
  - Define type-only disclosure contract for guarded availability display.
  - Keep `isReadOnly: true`, `isActionable: false`, and `isExecutionAllowed: false`.
- Real Compare Guarded Availability Disclosure Projection
  - Implement a pure projection from guarded availability and validation disclosure metadata.
  - Do not wire UI in the same phase.
- Real Compare Guarded Availability Inspector Metadata
  - Define Inspector-specific metadata shape for counts, reasons, and fallback explanations.
  - Keep counts explanatory, not operational tasks.
- Real Compare Guarded Availability Read-only Wiring Design
  - Design where disclosure metadata may appear in Graph UI.
  - Preserve hidden flag, admin-only guard, disabled state, and non-live behavior.

Recommended order:

1. Real Compare Guarded Availability Disclosure Type Design.
2. Real Compare Guarded Availability Disclosure Projection.
3. Real Compare Guarded Availability Inspector Metadata.
4. Real Compare Guarded Availability Read-only Wiring Design.
5. Later guarded read-only fetch design only after disclosure and wiring designs are accepted.

This document is a guarded availability disclosure design gate. It does not implement UI, expose a source option, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
