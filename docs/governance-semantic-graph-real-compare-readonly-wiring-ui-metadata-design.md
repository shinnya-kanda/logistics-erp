# Governance Semantic Graph Real Compare Read-only Wiring UI Metadata Design

Phase B77-69 documentation.

このドキュメントは、B77-68 Real Compare Read-only Wiring UI Boundary Design を前提に、`RealCompareReadOnlyWiringBundle` を将来 UI Metadata へ変換し、Disclosure / Badge / Inspector Props へ渡す場合の metadata boundary を設計する。

B77-69 は design only である。UI implementation、UI metadata type implementation、projection implementation、wiring implementation、UI component、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-69 is UI Metadata Design only.

Scope:

- B77-60 から B77-68 の成果物を前提にする。
- `ReadOnlyWiringBundle -> UI Metadata -> Disclosure / Badge / Inspector Props` の境界を整理する。
- Future UI Metadata が read-only display metadata であり、UI 実装、source enablement、live data enablement、execution authority ではないことを固定する。
- B77-69 時点では apps 配下変更、型追加、projection 追加、wiring 追加を行わない。

Out of scope:

- UI implementation
- UI metadata type implementation
- projection implementation
- wiring implementation
- UI component
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

## 2. Metadata Boundary

Future input:

```text
RealCompareReadOnlyWiringBundle
```

Future metadata:

- Disclosure Metadata
- Badge Metadata
- Inspector Metadata

Future flow:

```text
ReadOnlyWiringBundle
↓
UI Metadata
↓
Disclosure / Badge / Inspector Props
```

Boundary interpretation:

- `RealCompareReadOnlyWiringBundle` is the only future input candidate.
- UI Metadata is display metadata only.
- Disclosure / Badge / Inspector Props are future props candidates only.
- Metadata does not select source options.
- Metadata does not change feature flags.
- Metadata does not call routes, fetch data, connect adapters, or mutate data.
- Metadata does not enable `real_compare_readonly`.

## 3. Disclosure Metadata Candidate

Future Disclosure Metadata may carry:

- `status`
- `headline`
- `description`
- `reasons`
- `isReadOnly`
- `isActionable = false`
- `isExecutionAllowed = false`

Disclosure interpretation:

- `status` explains read-only candidate / guarded / blocked / unavailable state.
- `headline` is a short display summary.
- `description` is explanatory, not instructional.
- `reasons` are validation or fallback caveats.
- `isReadOnly` must remain true.
- `isActionable` must remain false.
- `isExecutionAllowed` must remain false.
- Disclosure metadata must not contain callbacks, command labels, route metadata, mutation payloads, or workflow state.

## 4. Badge Metadata Candidate

Future Badge Metadata may carry:

- `status`
- `label`
- `description`
- `isReadOnly`

Badge interpretation:

- `status` is state display only.
- `label` is a compact state label, not an action label.
- `description` explains the badge state.
- `isReadOnly` must remain true.
- Badge metadata must not enable source visibility, source selection, live fetch, or execution controls.

## 5. Inspector Metadata Candidate

Future Inspector Metadata may carry:

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
- Inspector metadata must not include retry, repair, rebuild, replay, sync, approve, correction, mutation, route invocation, or role escalation metadata.

## 6. Read-only Contract

Future UI metadata must preserve:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
```

Contract interpretation:

- `isReadOnly = true` means UI metadata is observational only.
- `isActionable = false` means UI metadata cannot create operator tasks.
- `isExecutionAllowed = false` means UI metadata cannot expose execution controls.
- `isLiveData = false` means UI metadata cannot imply live real compare data.

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

## 7. Guarded Rollout State

B77-69 preserves the current guarded rollout state.

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
- Wiring projection behavior is unchanged.
- Wiring projection tests are unchanged.
- No UI metadata type is added.
- No projection implementation is added.
- No wiring implementation is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- UI Metadata cannot bypass hidden flag or admin guard.
- UI Metadata cannot enable source visibility, source selection, live fetch, or execution controls.

## 8. Non-goals

B77-69 does not include:

- No UI implementation.
- No UI metadata type implementation.
- No projection implementation.
- No wiring implementation.
- No UI component.
- No feature flag change.
- No source option integration.
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
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityGraphFeatureFlags.ts`
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

Candidate future phases after B77-69:

- Real Compare Read-only Wiring UI Metadata Type Design
  - Define type-only UI metadata contracts for Disclosure / Badge / Inspector Props.
  - Keep metadata display-only and action-free.
- Real Compare Inspector UI Metadata Design
  - Design Inspector-specific metadata names, count labels, and read-only display semantics.
  - Keep Inspector explanatory and non-actionable.
- Real Compare Read-only Wiring UI Metadata Projection Design
  - Design how `RealCompareReadOnlyWiringBundle` may be projected into UI Metadata before implementation.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. Real Compare Read-only Wiring UI Metadata Type Design.
2. Real Compare Inspector UI Metadata Design.
3. Real Compare Read-only Wiring UI Metadata Projection Design.
4. UI metadata implementation only after the above design gates are accepted.

This document is a UI Metadata design gate. It does not implement UI, add types, add projection, add wiring, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
