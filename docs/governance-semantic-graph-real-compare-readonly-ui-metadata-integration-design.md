# Governance Semantic Graph Real Compare Read-only UI Metadata Integration Design

Phase B77-74 documentation.

このドキュメントは、B77-73 Real Compare Read-only UI Integration Boundary Design を前提に、`RealCompareReadOnlyUiMetadataBundle` の Disclosure Metadata / Badge Metadata / Inspector Metadata を将来 Graph UI Props Candidate として扱う場合の metadata integration boundary を設計する。

B77-74 は design only である。UI implementation、UI wiring、UI component、props implementation、type implementation、projection implementation、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-74 is UI Metadata Integration Design only.

Scope:

- B77-60 から B77-73 の成果物を前提にする。
- `RealCompareReadOnlyUiMetadataBundle` を Disclosure Metadata / Badge Metadata / Inspector Metadata に分け、将来 Graph UI Props Candidate へ渡す境界を整理する。
- Metadata integration が read-only display metadata の整理であり、UI 実装、source enablement、live data enablement、execution authority ではないことを固定する。
- B77-74 時点では UI implementation、UI wiring、props implementation、type implementation、projection implementation、apps 配下変更を行わない。

Out of scope:

- UI implementation
- UI wiring
- UI component
- props implementation
- type implementation
- projection implementation
- source option integration
- feature flag change
- real compare enablement
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- mutation
- execution action

## 2. Metadata Integration Input

Future metadata integration input:

```text
RealCompareReadOnlyUiMetadataBundle
```

Components:

- Disclosure Metadata
- Badge Metadata
- Inspector Metadata

Input interpretation:

- `RealCompareReadOnlyUiMetadataBundle` is display metadata only.
- Disclosure Metadata may become a future Graph Source Disclosure props candidate.
- Badge Metadata may become a future Source Badge props candidate.
- Inspector Metadata may become a future Inspector Validation Section props candidate.
- The bundle does not render UI.
- The bundle does not add props.
- The bundle does not wire UI.
- The bundle does not select source options.
- The bundle does not change feature flags.
- The bundle does not call routes, fetch data, connect adapters, or mutate data.
- The bundle does not enable `real_compare_readonly`.

Future conceptual flow:

```text
RealCompareReadOnlyUiMetadataBundle
↓
Disclosure Metadata / Badge Metadata / Inspector Metadata
↓
Graph UI Props Candidate
```

The arrows describe future interpretation order only. They are not an execution chain, fetch chain, adapter chain, approval chain, fallback execution chain, or route invocation chain.

## 3. Disclosure Integration Candidate

Future Graph UI props candidate fields:

- `status`
- `headline`
- `description`
- `reasons`
- `isReadOnly`
- `isActionable`
- `isExecutionAllowed`

Disclosure interpretation:

- `status` explains read-only candidate / guarded / blocked / unavailable state.
- `headline` is a short display summary.
- `description` is explanatory, not instructional.
- `reasons` are validation or fallback caveats.
- `isReadOnly` must remain true.
- `isActionable` must remain false.
- `isExecutionAllowed` must remain false.
- Disclosure props candidates must not contain callbacks, command labels, route metadata, mutation payloads, workflow state, or role escalation state.

## 4. Badge Integration Candidate

Future Graph UI props candidate fields:

- `status`
- `label`
- `description`
- `isReadOnly`

Badge interpretation:

- `status` is compact state display only.
- `label` is a compact state label, not an action label.
- `description` explains the badge state.
- `isReadOnly` must remain true.
- Badge props candidates must not enable source visibility, source selection, live fetch, route invocation, or execution controls.

## 5. Inspector Integration Candidate

Future Graph UI props candidate fields:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- `readOnly`

Inspector interpretation:

- `status` explains display state only.
- `headline` is a short read-only summary.
- `description` is explanatory, not instructional.
- `reasons` are validation / fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- `readOnly` confirms that Inspector content is display-only.
- Inspector props candidates must not include retry, approve, repair, rebuild, replay, sync, correction, mutation, route invocation, or role escalation metadata.

## 6. Integration Rules

Allowed future UI metadata usage:

- 状態表示
- 説明表示
- 理由表示
- 件数表示
- read-only 状態表示

Allowed interpretation:

- 状態は read-only candidate / guarded / blocked / unavailable の説明に限定する。
- 説明は user guidance ではなく observability explanation として扱う。
- 理由は validation / fallback caveat として扱う。
- 件数は explanatory count として扱い、task count として扱わない。
- read-only 状態は no execution surface の明示として扱う。

Forbidden future UI metadata usage:

- approve
- retry
- repair
- rebuild
- correction
- replay
- sync
- auto-fix
- execution workflow
- mutation workflow
- execution route

Forbidden interpretation:

- Do not add action buttons.
- Do not add approval controls.
- Do not add retry, repair, rebuild, replay, sync, correction, or auto-fix prompts.
- Do not add mutation workflow state.
- Do not add route invocation metadata.
- Do not add role escalation workflow.
- Do not make Graph UI props candidates source enablement props.
- Do not convert fallback or guarded state into healthy live data.

## 7. Read-only Contract

Future metadata integration must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
readOnly = true
```

Contract interpretation:

- `isReadOnly = true` means UI metadata is observational only.
- `isActionable = false` means metadata must not create operator tasks.
- `isExecutionAllowed = false` means metadata must not expose execution controls.
- `isLiveData = false` means metadata must not imply live real compare data.
- `readOnly = true` confirms Inspector content remains display-only.

Required wording:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`
- `Guarded Source / ガード中ソース`
- `Validation Disclosure / 検証結果表示`

Forbidden wording as action labels:

- `Run`
- `Execute`
- `Approve`
- `Repair`
- `Rebuild`
- `Retry`
- `Replay`
- `Sync`
- `Correct`
- `Auto-fix`

## 8. Guarded Rollout State

B77-74 preserves the current guarded rollout state.

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
- UI metadata types are unchanged.
- UI metadata projection behavior is unchanged.
- UI metadata projection tests are unchanged.
- No UI implementation is added.
- No UI wiring is added.
- No props implementation is added.
- No type implementation is added.
- No projection implementation is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- UI metadata integration cannot bypass hidden flag or admin guard.
- UI metadata integration cannot enable source visibility, source selection, live fetch, or execution controls.
- `real_compare_readonly` remains a guarded source candidate, not an active live source.

## 9. Non-goals

B77-74 does not include:

- No UI implementation.
- No UI wiring.
- No UI component.
- No props implementation.
- No type implementation.
- No projection implementation.
- No source option integration.
- No feature flag change.
- No real compare enablement.
- No fetch / API.
- No DB / Supabase.
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

- `apps/admin-dashboard/src/app/**`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityRealCompareReadOnlyUiMetadataTypes.ts`
- `inventoryIntegrityRealCompareReadOnlyUiMetadataProjection.ts`
- `inventoryIntegrityRealCompareReadOnlyUiMetadataProjection.test.ts`
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

## 10. Future Candidate

Candidate future phases after B77-74:

- Real Compare Read-only UI Metadata Type Refinement Design
  - Review whether future props candidates need more precise status and placement labels before any type change.
  - Keep refinement design-only until accepted.
- Real Compare Inspector Rendering Policy Design
  - Design Inspector-specific grouping, reason ordering, labels, and count display.
  - Keep Inspector explanatory and non-actionable.
- Real Compare Read-only UI Rendering Boundary Design
  - Define rendering boundaries, wording, fallback labels, and accessibility rules before adding UI.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. Real Compare Read-only UI Metadata Type Refinement Design.
2. Real Compare Inspector Rendering Policy Design.
3. Real Compare Read-only UI Rendering Boundary Design.
4. UI implementation only after the above design gates are accepted.

This document is a UI metadata integration design gate. It does not implement UI, add wiring, add props, add types, add projection, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
