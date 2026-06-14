# Governance Semantic Graph Real Compare Metadata Rendering Strategy Design

Phase B77-78 documentation.

このドキュメントは、B77-77 Real Compare Read-only UI Rendering Boundary Design を前提に、Real Compare read-only UI metadata を将来どのような方針で Graph UI の各表示面へ描画するかを整理する。

B77-78 は design only である。Rendering implementation、rendering function、UI component、UI wiring、props implementation、props addition、type implementation、type modification、projection implementation、projection modification、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-78 is Metadata Rendering Strategy Design only.

Scope:

- B77-60 から B77-77 の成果物を前提にする。
- `RealCompareReadOnlyDisclosureUiMetadata`、`RealCompareReadOnlyBadgeUiMetadata`、`RealCompareReadOnlyInspectorUiMetadata` の将来 rendering strategy を整理する。
- Metadata rendering strategy が read-only display strategy であり、execution workflow、mutation workflow、source enablement、live data enablement ではないことを固定する。
- B77-78 時点では rendering implementation、rendering function、UI component、UI wiring、props implementation、type implementation、projection implementation、apps 配下変更を行わない。

Conceptual strategy flow:

```text
UI Metadata
↓
Disclosure / Badge / Inspector
↓
Rendering Strategy
```

The arrows describe future interpretation order only. They are not an execution chain, fetch chain, adapter chain, approval chain, fallback execution chain, or route invocation chain.

Out of scope:

- rendering implementation
- rendering function
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

## 2. Rendering Inputs

Target inputs:

- `RealCompareReadOnlyDisclosureUiMetadata`
- `RealCompareReadOnlyBadgeUiMetadata`
- `RealCompareReadOnlyInspectorUiMetadata`

Input interpretation:

- Disclosure metadata is the future input candidate for Graph Source Disclosure.
- Badge metadata is the future input candidate for Source Badge.
- Inspector metadata is the future input candidate for Inspector Section.
- These inputs are display metadata only.
- These inputs do not render UI by themselves.
- These inputs do not add props.
- These inputs do not wire UI.
- These inputs do not select source options.
- These inputs do not change feature flags.
- These inputs do not fetch data, call routes, connect adapters, access DB / Supabase, or mutate data.
- These inputs do not enable `real_compare_readonly`.

## 3. Rendering Surfaces

Future display surfaces:

- Graph Source Disclosure
- Source Badge
- Inspector Section
- Guarded Fallback Explanation
- Unavailable Fallback Explanation

Surface interpretation:

- Graph Source Disclosure explains read-only status, headline, description, reasons, and read-only state.
- Source Badge summarizes compact status, label, short description, and read-only state.
- Inspector Section expands status, headline, description, reasons, total reason count, and read-only state.
- Guarded Fallback Explanation explains why `real_compare_readonly` remains guarded, disabled, and non-live.
- Unavailable Fallback Explanation explains why `fallback_unavailable` is displayed.
- No surface may become a command surface, approval surface, repair surface, retry surface, source enablement surface, or execution surface.

## 4. Strategy by Surface

### Graph Source Disclosure

Display strategy:

- `headline`
- `description`
- `reasons`
- read-only state

Rendering intent:

- Present the disclosure as a read-only explanation of guarded / blocked / unavailable state.
- Use headline as a short display summary.
- Use description as explanatory context, not an operator instruction.
- Use reasons as validation / fallback caveats.
- Use read-only state to confirm no execution surface.

Forbidden:

- action button
- retry / repair / rebuild / sync
- mutation intent

### Source Badge

Display strategy:

- `status`
- `label`
- short description
- read-only state

Rendering intent:

- Present the badge as compact display state only.
- Use `status` as a compact state classifier.
- Use `label` as a non-commanding state label.
- Use short description to clarify the badge state without long-form reasoning.
- Use read-only state to avoid implying source enablement.

Forbidden:

- click-to-execute
- escalation workflow
- mutation intent

### Inspector Section

Display strategy:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- `readOnly` state

Rendering intent:

- Present Inspector as observability only.
- Use status to explain display state, not execution permission.
- Use headline and description as explanatory summary.
- Use reasons as validation / fallback evidence.
- Use `totalReasons` as an observability count, not a task count.
- Use `readOnly` state to confirm display-only semantics.

Forbidden:

- approve
- repair
- rebuild
- retry
- sync
- execution workflow

### Guarded Fallback Explanation

Display strategy:

- guarded fallback reason
- why `real_compare_readonly` is not enabled
- read-only only

Rendering intent:

- Explain that guarded fallback is intentional and safety-first.
- Explain that hidden flag, admin-only guard, validation gate, disabled state, and non-live state remain active.
- Make clear that `real_compare_readonly` is a guarded source candidate, not an active live source.

Forbidden:

- enable button
- bypass guard
- role escalation workflow

### Unavailable Fallback Explanation

Display strategy:

- unavailable reason
- `fallback_unavailable` explanation
- read-only only

Rendering intent:

- Explain that unavailable fallback is a safe display state.
- Explain why healthy real compare graph data is not being rendered.
- Keep the fallback explanation observational and non-actionable.
- Avoid implying that unavailable fallback can be fixed from the UI.

Forbidden:

- auto-retry
- repair
- rebuild
- correction
- sync

## 5. Status Rendering Strategy

Status rendering must remain display-only. Status values explain state, caveats, or validation posture; they do not grant execution permission, source enablement, live fetch permission, mutation authority, or workflow authority.

### `candidate`

Display strategy:

- Show as read-only candidate.
- Explain that the source or metadata may be considered for future display.
- Make clear that candidate does not mean enabled.
- Keep wording close to `Read-only candidate / 未有効の表示候補`.

Forbidden interpretation:

- Do not render as selectable live source.
- Do not render as approval request.
- Do not render as execution readiness.

### `guarded`

Display strategy:

- Show as caution / guarded fallback.
- Explain that hidden flag, admin-only guard, validation gate, or rollout gate still blocks activation.
- Keep wording close to `Guarded Source / ガード中ソース`.

Forbidden interpretation:

- Do not render bypass controls.
- Do not render role escalation workflow.
- Do not imply admin guard can be changed from the UI.

### `blocked`

Display strategy:

- Show as fallback required.
- Explain that rendering must stay in guarded or unavailable fallback.
- Prefer explicit blocked wording over ambiguous warning-only wording.

Forbidden interpretation:

- Do not render repair / rebuild / retry controls.
- Do not render blocked state as an actionable queue.
- Do not imply source can be enabled by user action.

### `unavailable`

Display strategy:

- Show as `fallback_unavailable`.
- Explain that healthy graph data is unavailable for this source path.
- Use safety fallback wording.

Forbidden interpretation:

- Do not silently fall back to mock.
- Do not render unavailable state as temporary auto-retry.
- Do not imply live data is partially available.

### `passed`

Display strategy:

- Show as validation passed but not enabled.
- Explain that passed validation does not override guarded rollout.
- Keep read-only and non-live labels visible when needed.

Forbidden interpretation:

- Do not render passed as source enablement.
- Do not render passed as execution permission.
- Do not render passed as live data availability.

### `warning`

Display strategy:

- Show as caution disclosure.
- Explain caveats without creating operator tasks.
- Use warning as explanatory signal only.

Forbidden interpretation:

- Do not render warning as repair prompt.
- Do not render warning as retry prompt.
- Do not convert warning reasons into checklist actions.

### `not_evaluated`

Display strategy:

- Show as guarded fallback.
- Explain that validation or metadata has not been evaluated for UI rendering.
- Use wording that avoids implying error recovery is available from the UI.

Forbidden interpretation:

- Do not render as start-evaluation control.
- Do not render as pending execution workflow.
- Do not render as approval request.

## 6. Read-only Contract

Future metadata rendering strategy must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
readOnly = true
```

Contract interpretation:

- `isReadOnly = true` means metadata rendering is observational only.
- `isActionable = false` means metadata rendering must not create operator tasks.
- `isExecutionAllowed = false` means metadata rendering must not expose execution controls.
- `isLiveData = false` means metadata rendering must not imply live real compare data.
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

B77-78 preserves the current guarded rollout state.

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
- No rendering implementation is added.
- No rendering function is added.
- No UI component is added.
- No UI wiring is added.
- No props implementation is added.
- No type implementation is added.
- No projection implementation is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- Metadata rendering strategy cannot bypass hidden flag or admin guard.
- Metadata rendering strategy cannot enable source visibility, source selection, live fetch, or execution controls.
- `real_compare_readonly` remains a guarded source candidate, not an active live source.

## 8. Non-goals

B77-78 does not include:

- No rendering implementation.
- No rendering function.
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

## 9. Future Candidate

Candidate future phases after B77-78:

- Real Compare Inspector Metadata Refinement Design
  - Design whether Inspector reason grouping, severity, source metadata, or summary metadata should be represented in future types.
  - Keep refinement design-only until accepted.
- Real Compare Read-only Rendering Policy Consolidation
  - Consolidate rendering policies across disclosure, badge, Inspector, guarded fallback, unavailable fallback, wording, and accessibility.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.
- Real Compare Read-only UI Rendering Props Design
  - Design future props boundaries before adding UI component implementation.
  - Keep props design display-only and action-free.

Recommended order:

1. Real Compare Inspector Metadata Refinement Design.
2. Real Compare Read-only Rendering Policy Consolidation.
3. Real Compare Read-only UI Rendering Props Design.
4. Rendering implementation only after metadata refinement, policy consolidation, and props design gates are accepted.

This document is a read-only metadata rendering strategy design gate. It does not implement rendering, add a rendering function, wire UI, add components, add props, add or modify types, add or modify projection, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
