# Governance Semantic Graph Real Compare Guarded Availability Read-only Wiring Design

Phase B77-64 documentation.

このドキュメントは、B77-60 から B77-63 で整理した Real Compare Guarded Availability の disclosure design / types / projection / tests を前提に、`RealCompareGuardedAvailabilityDisplayBundle` を将来 Graph UI の disclosure / badge / Inspector へ read-only 表示用に渡す境界を設計する。

B77-64 は design only である。UI implementation、wiring function、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、fixture payload import、graph adapter fixture import、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-64 is read-only wiring design only.

Scope:

- B77-60 の Guarded Availability Disclosure Design を前提にする。
- B77-61 の Guarded Availability Disclosure Types を前提にする。
- B77-62 の pure disclosure projection implementation を前提にする。
- B77-63 の disclosure projection tests を前提にする。
- `RealCompareGuardedAvailabilityDisplayBundle` を将来 Graph UI の read-only display metadata として扱う境界を整理する。
- wiring が source enablement、live data enablement、execution authority ではないことを固定する。

Out of scope:

- UI implementation
- wiring function
- source option integration
- feature flag change
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase connection
- adapter integration
- fixture payload import
- graph adapter fixture import
- real data connection
- production enablement

## 2. Wiring Boundary

The read-only wiring boundary is a future metadata handoff boundary. It may carry already-projected display metadata into Graph UI surfaces, but it must not create commands, workflow state, route invocation metadata, source visibility changes, or source enablement.

Input:

- `RealCompareGuardedAvailabilityDisplayBundle`

Future target:

- graph source disclosure
- source badge
- Inspector validation section
- guarded fallback reason display
- unavailable fallback explanation display

Forbidden target:

- action button
- retry / repair / rebuild / sync / approve button
- mutation workflow
- role escalation workflow
- auto-fix control
- execution route

Boundary interpretation:

- The display bundle is read-only metadata.
- The badge is status display only.
- The disclosure is explanatory text only.
- The Inspector section is reasons, counts, and status display only.
- No future wiring may bypass hidden flag, admin-only guard, disabled source option state, fallback policy, or graph adapter boundaries.
- No future wiring may enable `real_compare_readonly`.

## 3. Read-only Data Flow

Future read-only display flow:

```text
validation summary
↓
validation disclosure metadata
↓
guarded availability display bundle
↓
Graph source disclosure metadata
↓
badge / Inspector read-only display
```

Flow interpretation:

- `validation summary` is the evaluated read-only validation result.
- `validation disclosure metadata` explains validation status, reasons, and read-only invariants.
- `guarded availability display bundle` packages badge, disclosure, and Inspector-safe metadata.
- `Graph source disclosure metadata` is a future UI-facing handoff shape.
- `badge / Inspector read-only display` is the final display surface.

B77-64 does not connect this flow. The arrows describe a future interpretation order only. They are not an execution chain, fetch chain, adapter chain, approval chain, fallback execution chain, or route invocation chain.

## 4. UI Boundary

Future UI handoff must preserve read-only semantics.

Required UI boundary:

- disclosure は read-only 表示のみ。
- badge は状態表示のみ。
- Inspector は理由・件数・状態表示のみ。
- action button は出さない。
- retry / repair / rebuild / sync / approve は出さない。
- operator に実行操作を促さない。
- `fallback_unavailable` は表示のみ。
- `passed` でも `real_compare_readonly` 有効化を意味しない。

Display wording policy:

- Use `Read Only / 読み取り専用`.
- Use `Observability Only / 観測専用`.
- Use `No Execution Controls / 実行操作なし`.
- Use `No Execution Route / 実行経路ではありません`.
- Use `Guarded Source / ガード中ソース`.
- Use `Validation Disclosure / 検証結果表示`.
- Avoid command wording such as `Run`, `Execute`, `Approve`, `Repair`, `Rebuild`, `Replay`, `Sync`, `Auto-fix`, `Correct`, or `Retry`.

UI interpretation:

- A disclosure may explain why a source is guarded.
- A disclosure may explain why fallback is visible.
- A badge may show `passed`, `warning`, `blocked`, `unavailable`, or `guarded`.
- Inspector may show reason messages and counts.
- None of these surfaces may provide an action route, role escalation route, mutation route, or real source enablement route.

## 5. Wiring Preconditions

Future wiring must not begin until the guarded rollout and validation preconditions are still satisfied.

Required preconditions:

- hidden flag is still false.
- admin-only guard is still false.
- source option remains disabled / guarded.
- validation projection tests are passing.
- disclosure projection tests are passing.
- UI has no action control.
- `fallback_unavailable` policy is maintained.
- real source failure does not silently fall back to mock.
- source disclosure wording remains read-only and observability-only.
- Inspector reason counts remain explanatory, not task counts.
- `compare-readonly` remains GET-only.
- no mutation, correction, repair, rebuild, replay, sync, approve, or auto-fix path exists.

Precondition failure behavior:

- Do not wire the display bundle to Graph UI.
- Do not expose or enable `real_compare_readonly`.
- Keep current source option behavior unchanged.
- Return to documentation / validation before implementation.

## 6. Failure / Fallback Policy

Future wiring must preserve the existing guarded fallback policy.

Status policy:

- `blocked` / `unavailable` => `fallback_unavailable`
- `not_evaluated` => guarded fallback
- `warning` => caution disclosure
- `passed` => read-only candidate

Policy interpretation:

- `blocked` means read-only projection readiness is blocked. Show fallback explanation only.
- `unavailable` means unavailable source or response conditions require `fallback_unavailable` explanation.
- `not_evaluated` means validation is incomplete. Keep guarded / disabled / non-live display.
- `warning` means caveats must remain visible. Do not convert warning into an operator task.
- `passed` means candidate readiness only. It does not enable `real_compare_readonly`.
- No status connects to execution action, mutation workflow, role escalation workflow, or auto-fix control.

## 7. Guarded Rollout State

B77-64 preserves the current guarded rollout state.

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
- Disclosure projection implementation is unchanged.
- Disclosure projection tests are unchanged.
- No UI wiring is added.
- No display bundle handoff function is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- Validation disclosure can inform future readiness display only.
- Guarded availability display bundle cannot enable the source.
- Guarded availability display bundle cannot bypass hidden flag or admin guard.
- Guarded availability display bundle cannot convert fallback into healthy live data.

## 8. Non-goals

B77-64 does not include:

- No UI implementation.
- No wiring function.
- No source option integration.
- No feature flag change.
- No real compare enablement.
- No fetch / API.
- No DB / Supabase.
- No route change.
- No adapter integration.
- No fixture payload import.
- No graph adapter fixture import.
- No mutation / correction / rebuild / repair / sync / auto-fix.
- No replay.
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
- `inventoryIntegrityRealCompareGuardedAvailabilityDisclosureTypes.ts`
- `inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.ts`
- `inventoryIntegrityRealCompareGuardedAvailabilityDisclosureProjection.test.ts`
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

## 9. Future Candidate

Candidate future phases after B77-64:

- Real Compare Guarded Availability Read-only Wiring Type Design
  - Define type-only handoff metadata from display bundle to future Graph UI disclosure surfaces.
  - Keep type fields display-only and action-free.
- Real Compare Guarded Availability Read-only Wiring Metadata
  - Define source disclosure metadata names, badge placement metadata, and Inspector validation section metadata.
  - Keep metadata independent from source option enablement.
- Real Compare Guarded Availability Read-only Wiring Implementation
  - Implement a pure, local, read-only handoff function only after type design is accepted.
  - Do not fetch, call route, import fixtures, connect adapters, or enable source options in the same phase.
- Real Compare Validation Inspector Read-only Wiring Design
  - Design how validation reasons, counts, and guarded fallback status may appear in Inspector.
  - Keep Inspector explanatory and non-actionable.
- Real Compare Guarded Availability UI Boundary Review
  - Review badge / disclosure / Inspector wording before any UI implementation.
  - Confirm no action control, retry, repair, rebuild, sync, approve, or auto-fix wording is introduced.

Recommended order:

1. Real Compare Guarded Availability Read-only Wiring Type Design.
2. Real Compare Guarded Availability Read-only Wiring Metadata.
3. Real Compare Validation Inspector Read-only Wiring Design.
4. Real Compare Guarded Availability UI Boundary Review.
5. Real Compare Guarded Availability Read-only Wiring Implementation only after the above gates are accepted.

This document is a read-only wiring design gate. It does not implement UI, add a wiring function, expose a source option, change flags, fetch, call a route, import fixtures, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
