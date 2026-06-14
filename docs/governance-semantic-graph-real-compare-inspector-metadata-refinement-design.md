# Governance Semantic Graph Real Compare Inspector Metadata Refinement Design

Phase B77-79 documentation.

このドキュメントは、B77-78 Real Compare Metadata Rendering Strategy Design を前提に、`RealCompareReadOnlyInspectorUiMetadata` の将来 refinement candidate を整理する。目的は Inspector Metadata を Status / Summary / Reason / Read-only state の責務に分けて考え、将来の Inspector 表示を安定化することである。

B77-79 は design only である。Inspector implementation、UI component、UI wiring、props implementation、props addition、type implementation、type modification、type addition、projection implementation、projection modification、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-79 is Inspector Metadata Refinement Design only.

Scope:

- B77-60 から B77-78 の成果物を前提にする。
- Current Inspector metadata boundary を変えずに、将来の responsibility separation を整理する。
- Inspector Metadata を Status Metadata / Summary Metadata / Reason Metadata / Read-only State Metadata に分ける design candidate を記録する。
- Inspector 表示が read-only display であり、execution workflow、mutation workflow、source enablement、live data enablement ではないことを固定する。
- B77-79 時点では Inspector implementation、型変更、projection 変更、apps 配下変更を行わない。

Conceptual refinement flow:

```text
Inspector Metadata
↓
Reason / Summary / Status responsibility separation
↓
Future Inspector rendering stability
```

The arrows describe future interpretation order only. They are not an execution chain, fetch chain, adapter chain, approval chain, fallback execution chain, or route invocation chain.

Out of scope:

- Inspector implementation
- UI component
- UI wiring
- props implementation
- props addition
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

## 2. Current Inspector Metadata Boundary

Current input boundary:

```text
RealCompareReadOnlyInspectorUiMetadata
```

Current responsibilities:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- `readOnly`

Boundary interpretation:

- `status` explains display state only.
- `headline` provides a short read-only summary.
- `description` provides explanatory context, not operator instruction.
- `reasons` provide validation / fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- `readOnly` confirms that Inspector content is display-only.

Current non-responsibilities:

- execution permission
- mutation workflow
- repair workflow
- retry workflow
- sync workflow
- source enablement
- live data enablement
- role escalation

## 3. Responsibility Separation

The following sections describe future separation candidates only. B77-79 does not add or change types.

### Status Metadata

Responsibilities:

- `status`
- state label
- severity interpretation
- fallback classification

Responsibility interpretation:

- Status Metadata may classify Inspector display state as candidate, guarded, blocked, unavailable, passed, warning, or not_evaluated.
- State label may provide a compact non-action label for the state.
- Severity interpretation may explain caution level for display.
- Fallback classification may clarify guarded fallback or unavailable fallback.

Non-responsibilities:

- execution permission
- role escalation
- repair instruction

Non-responsibility interpretation:

- Status Metadata must not grant execution permission.
- Status Metadata must not expose role escalation controls or admin bypass workflows.
- Status Metadata must not provide repair, rebuild, retry, sync, correction, or auto-fix instructions.
- Status Metadata must not enable `real_compare_readonly`.

### Summary Metadata

Responsibilities:

- `headline`
- `description`
- `totalReasons`
- read-only summary

Responsibility interpretation:

- Summary Metadata may provide a short Inspector headline.
- Summary Metadata may provide explanatory context.
- Summary Metadata may show total reason count as observability information.
- Read-only summary may reinforce that the Inspector is display-only.

Non-responsibilities:

- mutation instruction
- workflow approval
- sync instruction

Non-responsibility interpretation:

- Summary Metadata must not tell operators to mutate data.
- Summary Metadata must not request approval or create workflow steps.
- Summary Metadata must not provide sync, repair, rebuild, retry, correction, or auto-fix guidance.
- `totalReasons` must not become task count, approval count, repair count, retry count, or sync count.

### Reason Metadata

Responsibilities:

- reason message
- source / gate context
- severity
- display order

Responsibility interpretation:

- Reason Metadata may provide explanatory messages.
- Source / gate context may identify validation gate, guarded rollout gate, fallback gate, or unavailable fallback context.
- Severity may help stable ordering and visual emphasis in a future Inspector.
- Display order may keep explanations predictable.

Non-responsibilities:

- operator action
- auto-fix instruction
- execution path

Non-responsibility interpretation:

- Reason Metadata must not become an operator checklist.
- Reason Metadata must not provide auto-fix, repair, rebuild, retry, sync, correction, or replay instructions.
- Reason Metadata must not include route invocation metadata, mutation payloads, callbacks, workflow state, or execution paths.

### Read-only State Metadata

Responsibilities:

- read-only state
- no-action state
- no-execution state
- non-live state

Responsibility interpretation:

- Read-only State Metadata may centralize immutable display-only invariants.
- It may make `Read Only / 読み取り専用` and `No Execution Controls / 実行操作なし` wording consistent.
- It may reinforce that guarded, blocked, unavailable, warning, or passed states remain non-actionable.

Non-responsibilities:

- source activation
- permission escalation
- live data authorization
- execution routing

Non-responsibility interpretation:

- Read-only State Metadata must not activate sources.
- Read-only State Metadata must not provide permission escalation or admin role workflows.
- Read-only State Metadata must not authorize live fetch, route calls, DB access, adapter integration, or mutation.

## 4. Future Refinement Candidate Types

Future design candidate types:

- `RealCompareInspectorStatusMetadata`
- `RealCompareInspectorSummaryMetadata`
- `RealCompareInspectorReasonMetadata`
- `RealCompareInspectorReadOnlyStateMetadata`

B77-79 does not add these types.

Candidate interpretation:

- `RealCompareInspectorStatusMetadata` may represent status, state label, severity interpretation, and fallback classification.
- `RealCompareInspectorSummaryMetadata` may represent headline, description, total reason count, and read-only summary.
- `RealCompareInspectorReasonMetadata` may represent reason message, source / gate context, severity, and display order.
- `RealCompareInspectorReadOnlyStateMetadata` may represent read-only, non-actionable, non-executable, and non-live invariants.

Future refinement rules:

- Any future type refinement must preserve read-only invariants.
- Any future type refinement must remain display metadata only.
- Any future type refinement must not include callbacks, route metadata, mutation payloads, execution permissions, workflow state, source option state, or role escalation state.
- Any future type refinement must be preceded by a dedicated design gate before implementation.

## 5. Inspector Rendering Stability

Future Inspector rendering stability policy:

- `status` is state display only.
- Summary is overview display only.
- Reasons are explanation display only.
- Read-only state is displayed as an invariant.
- `warning`, `blocked`, and `unavailable` are rendered as explanation, not action.
- `passed` does not mean `real_compare_readonly` is enabled.

Stability interpretation:

- Inspector rendering should be stable even when validation posture changes.
- Inspector rendering should separate status, summary, reasons, and read-only state so one field does not imply another responsibility.
- Warning / blocked / unavailable states should remain explanatory and non-actionable.
- Passed validation should not override hidden flag, admin-only guard, disabled state, non-live state, or UI wiring absence.
- Reason ordering should support predictable reading, not remediation workflow.

Forbidden stability outcomes:

- Do not make Inspector an operation console.
- Do not use status to grant execution permission.
- Do not use summary to request approval.
- Do not use reasons as tasks.
- Do not use read-only state as a control.
- Do not convert passed validation into source activation.
- Do not convert unavailable fallback into auto-retry.

## 6. Read-only Contract

Future Inspector metadata refinement must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
readOnly = true
```

Contract interpretation:

- `isReadOnly = true` means Inspector metadata is observational only.
- `isActionable = false` means Inspector metadata must not create operator tasks.
- `isExecutionAllowed = false` means Inspector metadata must not expose execution controls.
- `isLiveData = false` means Inspector metadata must not imply live real compare data.
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

B77-79 preserves the current guarded rollout state.

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
- No Inspector implementation is added.
- No UI component is added.
- No UI wiring is added.
- No props implementation is added.
- No type implementation is added.
- No type modification is added.
- No projection implementation is added.
- No projection modification is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- Inspector metadata refinement design cannot bypass hidden flag or admin guard.
- Inspector metadata refinement design cannot enable source visibility, source selection, live fetch, or execution controls.
- `real_compare_readonly` remains a guarded source candidate, not an active live source.

## 8. Non-goals

B77-79 does not include:

- No Inspector implementation.
- No UI wiring.
- No UI component.
- No props implementation.
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

## 9. B77 Closing Recommendation

B77-79 時点で、Real Compare read-only UI metadata の design chain は十分に厚くなっている。

Established B77 design chain:

- Guarded availability disclosure
- Read-only wiring metadata
- UI metadata types
- UI metadata projection
- UI metadata projection tests
- UI integration boundary
- UI metadata integration design
- UI metadata type refinement design
- Inspector rendering policy design
- UI rendering boundary design
- Metadata rendering strategy design
- Inspector metadata refinement design

Recommendation:

- Next phase should be `B77-80 Real Compare Read-only Rendering Policy Consolidation`.
- After B77-80, move to the B78 series only after the consolidated rendering policy confirms read-only, guarded, disabled, non-live, and no-action invariants.

Candidate next phases:

- `B77-80 Real Compare Read-only Rendering Policy Consolidation`
- `B78-01 Real Compare Validation Integration Spike`

Recommended transition rule:

- Do not begin B78 implementation work until B77-80 consolidates rendering policies.
- Do not add UI, props, type changes, projection changes, source option integration, feature flag changes, fetch / API, DB / Supabase access, adapter integration, or mutation as part of the closing recommendation.

This document is an Inspector metadata refinement design gate. It does not implement Inspector UI, wire UI, add props, add or modify types, add or modify projection, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
