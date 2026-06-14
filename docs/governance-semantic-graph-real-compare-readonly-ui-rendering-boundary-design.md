# Governance Semantic Graph Real Compare Read-only UI Rendering Boundary Design

Phase B77-77 documentation.

このドキュメントは、B77-76 Real Compare Inspector Rendering Policy Design を前提に、Inspector / Disclosure / Badge / Guarded Fallback / Unavailable Fallback の将来 UI rendering boundary を整理する。

B77-77 は design only である。Rendering implementation、UI component、UI wiring、props addition、type implementation、type modification、projection implementation、projection modification、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-77 is Rendering Boundary Design only.

Scope:

- B77-60 から B77-76 の成果物を前提にする。
- Real Compare read-only UI metadata を将来 Graph UI で描画する場合の rendering input / target / allowed content / disallowed content を整理する。
- Rendering boundary が read-only display boundary であり、execution workflow、mutation workflow、source enablement、live data enablement ではないことを固定する。
- B77-77 時点では rendering implementation、UI component、UI wiring、props addition、type implementation、projection implementation、apps 配下変更を行わない。

Out of scope:

- Rendering implementation
- UI component
- UI wiring
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

## 2. Rendering Inputs

Future rendering inputs:

- `RealCompareReadOnlyDisclosureUiMetadata`
- `RealCompareReadOnlyBadgeUiMetadata`
- `RealCompareReadOnlyInspectorUiMetadata`

Input interpretation:

- Disclosure metadata is a future Source Disclosure input candidate.
- Badge metadata is a future Source Badge input candidate.
- Inspector metadata is a future Inspector Section input candidate.
- Metadata inputs are display metadata only.
- Metadata inputs do not render UI by themselves.
- Metadata inputs do not wire UI.
- Metadata inputs do not select source options.
- Metadata inputs do not change feature flags.
- Metadata inputs do not call routes, fetch data, connect adapters, or mutate data.
- Metadata inputs do not enable `real_compare_readonly`.

## 3. Rendering Targets

Future rendering targets:

- Source Disclosure
- Source Badge
- Inspector Section
- Guarded Fallback
- Unavailable Fallback

Target interpretation:

- Source Disclosure may display read-only status, headline, description, reasons, and read-only invariants.
- Source Badge may display compact read-only state.
- Inspector Section may display status, headline, description, reasons, total reason count, and read-only state.
- Guarded Fallback may display why guarded / disabled / non-live display remains active.
- Unavailable Fallback may display why unavailable fallback is shown.
- No target may become a command surface.
- No target may imply operator execution, approval, correction, repair, rebuild, sync, replay, retry, or auto-fix.

## 4. Allowed Rendering

Allowed rendering content:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- read-only state

Allowed interpretation:

- `status` explains read-only candidate / guarded / blocked / unavailable state.
- `headline` provides a short read-only summary.
- `description` provides explanatory context, not operator instruction.
- `reasons` provide validation / fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- read-only state confirms no execution surface.

Allowed target mapping:

- Source Disclosure may use `status`, `headline`, `description`, `reasons`, `isReadOnly`, `isActionable`, and `isExecutionAllowed`.
- Source Badge may use `status`, `label`, `description`, and `isReadOnly`.
- Inspector Section may use `status`, `headline`, `description`, `reasons`, `totalReasons`, and `readOnly`.
- Guarded Fallback may use status / headline / description / reasons to explain guarded state only.
- Unavailable Fallback may use status / headline / description / reasons to explain unavailable state only.

## 5. Disallowed Rendering

Disallowed rendering content:

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
- Do not make any rendering target an operation console.
- Do not convert fallback or guarded state into healthy live data.

## 6. Rendering Boundary Rules

### Inspector

Inspector rendering may show status, headline, description, reasons, totalReasons, and read-only state.

Policy:

- Show Inspector content as observability only.
- Keep reason lists explanatory.
- Keep total reason count informational.
- Do not render task queues, workflow actions, mutation payloads, retry controls, repair controls, rebuild controls, sync controls, approval controls, or execution routes.

### Disclosure

Disclosure rendering may show status, headline, description, reasons, and read-only invariants.

Policy:

- Show disclosure content as guarded / read-only explanation.
- Keep `isActionable = false` and `isExecutionAllowed = false` semantics visible in wording when needed.
- Do not render disclosure as a call to action.

### Badge

Badge rendering may show compact status, label, description, and read-only state.

Policy:

- Show badge content as compact state only.
- Keep badge labels non-commanding.
- Do not render badge as source enablement, approval, retry, repair, or execution control.

### Guarded Fallback

Guarded Fallback rendering may explain why guarded / disabled / non-live display remains active.

Policy:

- Show guarded fallback as safety explanation.
- Keep wording conservative.
- Do not offer retry, approve, repair, rebuild, sync, correction, or auto-fix options.
- Do not imply `real_compare_readonly` is active, live, or production-ready.

### Unavailable Fallback

Unavailable Fallback rendering may explain why unavailable fallback is shown.

Policy:

- Show unavailable fallback as safety fallback explanation.
- Prefer unavailable over overconfident partial graph display.
- Do not silently fall back to mock.
- Do not offer retry, repair, rebuild, sync, correction, approval, or auto-fix options.

## 7. Read-only Contract

Future rendering must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
readOnly = true
```

Contract interpretation:

- `isReadOnly = true` means rendering is observational only.
- `isActionable = false` means rendering must not create operator tasks.
- `isExecutionAllowed = false` means rendering must not expose execution controls.
- `isLiveData = false` means rendering must not imply live real compare data.
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

B77-77 preserves the current guarded rollout state.

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
- No rendering implementation is added.
- No UI component is added.
- No UI wiring is added.
- No props are added.
- No type implementation is added.
- No projection implementation is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- Rendering boundary design cannot bypass hidden flag or admin guard.
- Rendering boundary design cannot enable source visibility, source selection, live fetch, or execution controls.
- `real_compare_readonly` remains a guarded source candidate, not an active live source.

## 9. Non-goals

B77-77 does not include:

- No Rendering Implementation.
- No UI Wiring.
- No UI component.
- No props addition.
- No Type Changes.
- No type implementation.
- No type modification.
- No type addition.
- No Projection Changes.
- No projection implementation.
- No projection modification.
- No source option integration.
- No feature flag change.
- No real compare enablement.
- No Fetch / API.
- No DB / Supabase.
- No route change.
- No Adapter Integration.
- No fixture payload import.
- No graph adapter fixture import.
- No Mutation.
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

## 10. Future Candidate

Candidate future phases after B77-77:

- Real Compare Metadata Rendering Strategy Design
  - Design how disclosure, badge, Inspector, guarded fallback, and unavailable fallback metadata should be rendered consistently.
  - Keep rendering strategy display-only and action-free.
- Real Compare Inspector Metadata Refinement Design
  - Design whether Inspector reason grouping, severity, or source metadata should be represented in future types.
  - Keep refinement design-only until accepted.
- Real Compare Read-only Rendering Policy Consolidation
  - Consolidate rendering policies across disclosure, badge, Inspector, fallback, wording, and accessibility.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. Real Compare Metadata Rendering Strategy Design.
2. Real Compare Inspector Metadata Refinement Design.
3. Real Compare Read-only Rendering Policy Consolidation.
4. Rendering implementation only after rendering strategy and integration gates are accepted.

This document is a read-only UI rendering boundary design gate. It does not implement rendering, wire UI, add props, add or modify types, add or modify projection, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
