# Governance Semantic Graph Real Compare Read-only UI Metadata Type Refinement Design

Phase B77-75 documentation.

このドキュメントは、B77-74 Real Compare Read-only UI Metadata Integration Design を前提に、既存の `RealCompareReadOnlyDisclosureUiMetadata`、`RealCompareReadOnlyBadgeUiMetadata`、`RealCompareReadOnlyInspectorUiMetadata` の責務分離、将来拡張候補、型境界を整理する。

B77-75 は design only である。type implementation、type modification、projection implementation、projection modification、wiring modification、UI implementation、UI wiring、UI component、props addition、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-75 is UI Metadata Type Refinement Design only.

Scope:

- B77-60 から B77-74 の成果物を前提にする。
- 既存 UI Metadata Types を変更せずに、Disclosure Metadata / Badge Metadata / Inspector Metadata の責務境界を整理する。
- 将来の型 refinement candidate を design candidate として列挙する。
- UI Metadata が read-only display metadata であり、execution state、mutation workflow、source enablement、live data enablement ではないことを固定する。

Out of scope:

- type implementation
- type modification
- type addition
- projection implementation
- projection modification
- wiring modification
- UI implementation
- UI wiring
- UI component
- props addition
- source option integration
- feature flag change
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- mutation
- execution action

## 2. Disclosure Metadata Responsibility

Disclosure Metadata is responsible for:

- `status`
- `headline`
- `description`
- `reasons`
- read-only disclosure state

Responsibility interpretation:

- `status` explains read-only candidate / guarded / blocked / unavailable state.
- `headline` provides a short disclosure summary.
- `description` provides explanatory context, not operator instruction.
- `reasons` provide validation or fallback caveats.
- read-only disclosure state is expressed through `isReadOnly: true`, `isActionable: false`, and `isExecutionAllowed: false`.

Disclosure Metadata is not responsible for:

- execution state
- mutation workflow
- repair workflow
- retry workflow

Non-responsibility interpretation:

- Disclosure Metadata must not contain callbacks, route metadata, mutation payloads, workflow state, approval state, retry prompts, repair controls, rebuild controls, sync controls, or auto-fix controls.
- Disclosure Metadata must not enable `real_compare_readonly`.
- Disclosure Metadata must not select source options or change feature flags.

## 3. Badge Metadata Responsibility

Badge Metadata is responsible for:

- `status`
- `label`
- short description
- read-only state

Responsibility interpretation:

- `status` is compact display state only.
- `label` is a compact state label, not an action label.
- short description explains the badge state.
- read-only state is expressed through `isReadOnly: true`.

Badge Metadata is not responsible for:

- detailed explanation
- execution action
- workflow state

Non-responsibility interpretation:

- Badge Metadata must not carry long-form reasoning that belongs in disclosure or Inspector surfaces.
- Badge Metadata must not expose action labels, command text, execution permission, route invocation metadata, mutation payloads, workflow state, or source enablement state.
- Badge Metadata must not imply that guarded or unavailable states are healthy live data.

## 4. Inspector Metadata Responsibility

Inspector Metadata is responsible for:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- `readOnly` state

Responsibility interpretation:

- `status` explains display state only.
- `headline` provides a short read-only summary.
- `description` provides explanatory context, not operator instruction.
- `reasons` provide validation / fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- `readOnly` state confirms that Inspector content is display-only.

Inspector Metadata is not responsible for:

- execution action
- repair action
- sync action
- rebuild action

Non-responsibility interpretation:

- Inspector Metadata must not include retry, approve, repair, rebuild, replay, sync, correction, mutation, route invocation, role escalation, workflow approval, or auto-fix metadata.
- Inspector Metadata must not convert reason count into task count.
- Inspector Metadata must not become an operation console.

## 5. Future Refinement Candidates

Future design candidates:

- `DisclosureReasonMetadata`
- `BadgeDisplayMetadata`
- `InspectorReasonMetadata`
- `InspectorSummaryMetadata`

Candidate interpretation:

- `DisclosureReasonMetadata` may be considered if disclosure reasons need severity, source, or ordering metadata.
- `BadgeDisplayMetadata` may be considered if badge label, tone, or compact state semantics need a narrower display shape.
- `InspectorReasonMetadata` may be considered if Inspector reasons need grouping, source, or detail-level metadata.
- `InspectorSummaryMetadata` may be considered if Inspector summary fields need a separate summary contract.

B77-75 does not add these types. These are design candidates only.

Future refinement rules:

- Any future type refinement must preserve read-only invariants.
- Any future type refinement must remain display metadata only.
- Any future type refinement must not include callbacks, route metadata, mutation payloads, execution permissions, workflow state, or source option state.
- Any future type refinement must be preceded by a dedicated design gate before implementation.

## 6. Read-only Contract

Future type refinement must preserve the read-only contract.

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

## 7. Guarded Rollout State

B77-75 preserves the current guarded rollout state.

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
- No props are added.
- No type implementation is added.
- No type modification is added.
- No projection implementation is added.
- No projection modification is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- Type refinement design cannot bypass hidden flag or admin guard.
- Type refinement design cannot enable source visibility, source selection, live fetch, or execution controls.
- `real_compare_readonly` remains a guarded source candidate, not an active live source.

## 8. Non-goals

B77-75 does not include:

- No type implementation.
- No type modification.
- No type addition.
- No projection implementation.
- No projection modification.
- No wiring modification.
- No UI implementation.
- No UI wiring.
- No UI component.
- No props addition.
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

## 9. Future Candidate

Candidate future phases after B77-75:

- Real Compare Inspector Rendering Policy Design
  - Design Inspector-specific grouping, reason ordering, labels, and count display.
  - Keep Inspector explanatory and non-actionable.
- Real Compare Read-only UI Rendering Boundary Design
  - Define rendering boundaries, wording, fallback labels, and accessibility rules before adding UI.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.
- Real Compare Metadata Rendering Strategy Design
  - Design how disclosure, badge, and Inspector metadata should be rendered consistently.
  - Keep rendering strategy display-only and action-free.

Recommended order:

1. Real Compare Inspector Rendering Policy Design.
2. Real Compare Read-only UI Rendering Boundary Design.
3. Real Compare Metadata Rendering Strategy Design.
4. Type implementation only after a dedicated type design gate is accepted.
5. UI implementation only after rendering and integration gates are accepted.

This document is a UI metadata type refinement design gate. It does not implement or modify types, add projection, change projection, wire UI, add props, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
