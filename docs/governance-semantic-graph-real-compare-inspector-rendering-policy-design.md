# Governance Semantic Graph Real Compare Inspector Rendering Policy Design

Phase B77-76 documentation.

このドキュメントは、B77-75 Real Compare Read-only UI Metadata Type Refinement Design を前提に、`RealCompareReadOnlyInspectorUiMetadata` を将来 Inspector で表示する場合の rendering policy、表示可能情報、表示禁止情報を整理する。

B77-76 は design only である。Inspector implementation、UI wiring、rendering implementation、type implementation、type modification、projection implementation、projection modification、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-76 is Inspector Rendering Policy Design only.

Scope:

- B77-60 から B77-75 の成果物を前提にする。
- `RealCompareReadOnlyInspectorUiMetadata` を将来 Inspector rendering input として扱う場合の表示境界を整理する。
- Inspector rendering が read-only display であり、execution action、mutation workflow、source enablement、live data enablement ではないことを固定する。
- B77-76 時点では Inspector implementation、UI wiring、rendering implementation、type implementation、projection implementation、apps 配下変更を行わない。

Out of scope:

- Inspector implementation
- UI wiring
- rendering implementation
- type implementation
- type modification
- type addition
- projection implementation
- projection modification
- source option integration
- feature flag change
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- mutation
- execution action

## 2. Inspector Input

Future Inspector rendering input:

```text
RealCompareReadOnlyInspectorUiMetadata
```

Input interpretation:

- `RealCompareReadOnlyInspectorUiMetadata` is display metadata only.
- Inspector input may explain guarded / blocked / unavailable read-only state.
- Inspector input may show reason text and reason count.
- Inspector input must not include callbacks, command labels, route metadata, mutation payloads, workflow state, or role escalation state.
- Inspector input must not enable `real_compare_readonly`.
- Inspector input must not select source options or change feature flags.

## 3. Allowed Rendering Content

Allowed Inspector rendering content:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- `readOnly` state

Allowed interpretation:

- `status` explains display state only.
- `headline` provides a short read-only summary.
- `description` provides explanatory context, not operator instruction.
- `reasons` provide validation / fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- `readOnly` state confirms that Inspector content is display-only.

## 4. Disallowed Rendering Content

Disallowed Inspector rendering content:

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

Disallowed interpretation:

- Do not render action buttons.
- Do not render approval controls.
- Do not render retry, repair, rebuild, replay, sync, correction, or auto-fix prompts.
- Do not render mutation workflow state.
- Do not render route invocation metadata.
- Do not render role escalation workflow.
- Do not convert reason count into task count.
- Do not make Inspector an operation console.
- Do not convert fallback or guarded state into healthy live data.

## 5. Rendering Policy

### Status

Status is displayable.

Policy:

- Show status as read-only state only.
- Use status to explain candidate / guarded / blocked / unavailable display state.
- Do not use status as execution permission, mutation intent, source enablement, or workflow state.

### Headline

Headline is displayable.

Policy:

- Show headline as a short read-only summary.
- Keep headline explanatory.
- Do not phrase headline as an instruction, command, approval prompt, or retry prompt.

### Description

Description is displayable.

Policy:

- Show description as explanatory context.
- Keep description focused on observability and guarded state.
- Do not include execution instructions, repair guidance, rebuild guidance, sync guidance, correction guidance, or route invocation guidance.

### Reasons

Reasons are displayable.

Policy:

- Show reasons as validation / fallback caveats.
- Keep reasons ordered as explanatory evidence, not tasks.
- Do not render reasons as checklist actions, work queue items, approval requests, mutation payloads, or remediation steps.

### Total Reasons

Total Reasons is displayable.

Policy:

- Show `totalReasons` as an observability count.
- Use the count to help readers understand how many caveats are visible.
- Do not interpret the count as task count, error count requiring action, retry count, repair count, rebuild count, or sync count.

### Read-only State

Read-only state is displayable.

Policy:

- Show read-only state to confirm display-only semantics.
- Use wording such as `Read Only / 読み取り専用` and `No Execution Controls / 実行操作なし`.
- Do not attach read-only state to a control, callback, route, workflow, mutation, or approval surface.

## 6. Read-only Contract

Future Inspector rendering must preserve the read-only contract.

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

B77-76 preserves the current guarded rollout state.

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
- No Inspector implementation is added.
- No UI wiring is added.
- No rendering implementation is added.
- No type implementation is added.
- No projection implementation is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- Inspector rendering policy cannot bypass hidden flag or admin guard.
- Inspector rendering policy cannot enable source visibility, source selection, live fetch, or execution controls.
- `real_compare_readonly` remains a guarded source candidate, not an active live source.

## 8. Non-goals

B77-76 does not include:

- No Inspector implementation.
- No UI wiring.
- No rendering implementation.
- No UI component.
- No props addition.
- No type implementation.
- No type modification.
- No type addition.
- No projection implementation.
- No projection modification.
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

Candidate future phases after B77-76:

- Real Compare Read-only UI Rendering Boundary Design
  - Define full UI rendering boundaries, wording, fallback labels, and accessibility rules before adding UI.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.
- Real Compare Metadata Rendering Strategy Design
  - Design how disclosure, badge, and Inspector metadata should be rendered consistently.
  - Keep rendering strategy display-only and action-free.
- Real Compare Inspector Metadata Refinement Design
  - Design whether Inspector reason grouping, severity, or source metadata should be represented in future types.
  - Keep refinement design-only until accepted.

Recommended order:

1. Real Compare Read-only UI Rendering Boundary Design.
2. Real Compare Metadata Rendering Strategy Design.
3. Real Compare Inspector Metadata Refinement Design.
4. Inspector implementation only after rendering and integration gates are accepted.

This document is an Inspector rendering policy design gate. It does not implement Inspector UI, wire UI, add props, add or modify types, add or modify projection, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
