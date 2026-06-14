# Governance Semantic Graph Real Compare Read-only Rendering Policy Consolidation

Phase B77-80 documentation.

このドキュメントは、B77-60 から B77-79 までで整理した Validation / Disclosure / Guarded Availability / Read-only Wiring / UI Metadata / Inspector Metadata / Rendering Strategy / Rendering Boundary を、Read-only Rendering Policy として統合する。B77 系 Design Chain の締めとして、将来 runtime validation integration へ進む前の read-only 表示方針を固定する。

B77-80 は design only である。UI implementation、UI component、UI wiring、rendering implementation、props implementation、props addition、type implementation、type modification、type addition、projection implementation、projection modification、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-80 is Rendering Policy Consolidation.

Scope:

- B77-60 から B77-79 の成果物を統合する。
- Real Compare read-only metadata を将来 UI で表示する場合の unified rendering policy を整理する。
- Rendering policy が read-only display policy であり、execution workflow、mutation workflow、source enablement、live data enablement ではないことを固定する。
- B77 系 Design Chain の closing document として、次フェーズ B78-01 へ移る前の不変条件を明文化する。
- B77-80 時点では実装を行わない。

Out of scope:

- UI implementation
- UI component
- UI wiring
- rendering implementation
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

Consolidated rendering input candidates:

- `RealCompareValidationProjection`
- `RealCompareGuardedAvailabilityDisplayBundle`
- `RealCompareReadOnlyWiringBundle`
- `RealCompareReadOnlyUiMetadataBundle`

Input interpretation:

- `RealCompareValidationProjection` represents validation projection output for read-only interpretation.
- `RealCompareGuardedAvailabilityDisplayBundle` represents guarded availability display metadata.
- `RealCompareReadOnlyWiringBundle` represents read-only wiring metadata that remains unwired to UI.
- `RealCompareReadOnlyUiMetadataBundle` represents future UI metadata for Disclosure / Badge / Inspector surfaces.
- Inputs are display metadata or projection output only.
- Inputs do not render UI by themselves.
- Inputs do not wire UI.
- Inputs do not select source options.
- Inputs do not change feature flags.
- Inputs do not call routes, connect adapters, access DB / Supabase, or mutate data.
- Inputs do not enable `real_compare_readonly`.

Consolidated conceptual flow:

```text
Validation Projection
↓
Guarded Availability Display
↓
Read-only Wiring
↓
UI Metadata
↓
Read-only Rendering Policy
```

The arrows describe future interpretation order only. They are not an execution chain, fetch chain, adapter chain, approval chain, fallback execution chain, mutation chain, or route invocation chain.

## 3. Rendering Surfaces

Consolidated rendering surfaces:

- Source Disclosure
- Source Badge
- Inspector Section
- Guarded Fallback
- Unavailable Fallback

Surface interpretation:

- Source Disclosure displays read-only status, headline, description, reasons, and read-only invariants.
- Source Badge displays compact read-only state.
- Inspector Section displays status, headline, description, reasons, total reason count, and read-only state.
- Guarded Fallback explains why guarded / disabled / non-live display remains active.
- Unavailable Fallback explains why unavailable fallback is displayed.
- No surface may become a command surface, approval surface, repair surface, retry surface, source enablement surface, mutation surface, or execution surface.

## 4. Unified Read-only Policy

Allowed rendering:

- `status`
- `headline`
- `description`
- `reasons`
- `totalReasons`
- read-only state
- fallback explanation

Allowed interpretation:

- `status` explains read-only candidate / guarded / blocked / unavailable / passed / warning / not_evaluated state.
- `headline` provides a short read-only summary.
- `description` provides explanatory context, not operator instruction.
- `reasons` provide validation / guarded rollout / fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- Read-only state confirms no execution surface.
- Fallback explanation clarifies guarded fallback or unavailable fallback without offering remediation controls.

Disallowed rendering:

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
- Do not convert reasons into checklist actions.
- Do not convert `totalReasons` into task count, approval count, retry count, repair count, rebuild count, or sync count.
- Do not convert fallback or guarded state into healthy live data.

## 5. Unified Status Policy

All status values must be interpreted as read-only display state. Status never grants execution permission, mutation authority, source enablement, live fetch permission, route invocation authority, adapter integration authority, or role escalation authority.

### `candidate`

Read-only interpretation:

- Display as read-only candidate.
- Explain that this is a future display candidate, not an enabled source.
- Keep wording close to `Read-only candidate / 未有効の表示候補`.

Forbidden interpretation:

- Do not render as selectable live source.
- Do not render as approval request.
- Do not render as execution readiness.

### `guarded`

Read-only interpretation:

- Display as guarded source or guarded fallback.
- Explain that hidden flag, admin-only guard, validation gate, or rollout gate still blocks activation.
- Keep wording close to `Guarded Source / ガード中ソース`.

Forbidden interpretation:

- Do not render bypass controls.
- Do not render role escalation workflow.
- Do not imply admin guard can be changed from UI.

### `blocked`

Read-only interpretation:

- Display as fallback required.
- Explain that rendering must stay in guarded or unavailable fallback.
- Keep blocked wording explanatory, not actionable.

Forbidden interpretation:

- Do not render repair / rebuild / retry controls.
- Do not render as actionable queue.
- Do not imply source can be enabled by user action.

### `unavailable`

Read-only interpretation:

- Display as unavailable fallback.
- Explain that healthy graph data is unavailable for this source path.
- Use safety fallback wording.

Forbidden interpretation:

- Do not silently fall back to mock.
- Do not render as temporary auto-retry.
- Do not imply live data is partially available.

### `passed`

Read-only interpretation:

- Display as validation passed but not enabled.
- Explain that passed validation does not override guarded rollout.
- Keep read-only and non-live labels visible when needed.

Forbidden interpretation:

- Do not render as source enablement.
- Do not render as execution permission.
- Do not render as live data availability.

### `warning`

Read-only interpretation:

- Display as caution disclosure.
- Explain caveats without creating operator tasks.
- Use warning as explanatory signal only.

Forbidden interpretation:

- Do not render as repair prompt.
- Do not render as retry prompt.
- Do not convert warning reasons into checklist actions.

### `not_evaluated`

Read-only interpretation:

- Display as guarded fallback or not-yet-evaluated disclosure.
- Explain that validation or metadata has not been evaluated for UI rendering.
- Use wording that avoids implying user-triggered evaluation is available.

Forbidden interpretation:

- Do not render as start-evaluation control.
- Do not render as pending execution workflow.
- Do not render as approval request.

## 6. Read-only Contract

Future rendering policy must preserve the read-only contract.

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

## 7. Guarded Rollout Policy

B77-80 preserves the current guarded rollout state.

Required current state:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
UI wiring = none
```

Policy interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- `real_compare_readonly` remains hidden unless hidden flag and static admin guard both pass.
- `real_compare_readonly` remains disabled / guarded.
- `real_compare_readonly` remains non-live.
- UI wiring remains none.
- Rendering policy cannot bypass hidden flag or admin guard.
- Rendering policy cannot enable source visibility, source selection, live fetch, route invocation, adapter integration, DB access, mutation, or execution controls.

Current behavior preserved:

- Graph UI behavior is unchanged.
- Source option behavior is unchanged.
- Feature flags are unchanged.
- UI metadata types are unchanged.
- UI metadata projection behavior is unchanged.
- No UI implementation is added.
- No UI wiring is added.
- No rendering implementation is added.
- No type implementation is added.
- No projection implementation is added.

## 8. Consolidated Non-goals

B77-80 does not include:

- No UI implementation.
- No UI wiring.
- No UI component.
- No rendering implementation.
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

## 9. B77 Closure

B77 series established a read-only design chain for `real_compare_readonly`.

### Validation Layer

Validation Layer defined how real compare validation status, gate state, summary, severity, and guarded availability should be evaluated and projected without live data access or mutation.

Outcome:

- Validation is read-only.
- Validation output is explanatory.
- Validation does not enable source selection, fetch, route invocation, DB access, adapter integration, or mutation.

### Projection Layer

Projection Layer converted validation and guarded availability state into display-oriented metadata through pure functions and type-only contracts.

Outcome:

- Projection remains pure and local.
- Projection does not wire UI.
- Projection does not add execution paths.

### Disclosure Layer

Disclosure Layer defined how guarded validation results may be explained through status, headline, description, reasons, and read-only invariants.

Outcome:

- Disclosure is explanatory.
- Disclosure is non-actionable.
- Disclosure must not become approval, retry, repair, rebuild, sync, correction, auto-fix, mutation, or execution UI.

### Guarded Availability Layer

Guarded Availability Layer explained why `real_compare_readonly` remains unavailable, blocked, guarded, or not evaluated.

Outcome:

- Guarded state is visible as explanation only.
- Fallback remains safe and explicit.
- Passed validation does not imply enablement.

### Read-only Wiring Layer

Read-only Wiring Layer described how guarded availability display metadata may become future UI-facing metadata while preserving `isWiredToUi = false`.

Outcome:

- Wiring is documented, not active.
- UI wiring remains none.
- `isLiveData` remains false.

### UI Metadata Layer

UI Metadata Layer introduced display metadata boundaries for Disclosure / Badge / Inspector while keeping all metadata read-only and non-live.

Outcome:

- Disclosure, Badge, and Inspector metadata are display-only.
- UI metadata does not add props or components.
- UI metadata does not select source options or change flags.

### Inspector Policy Layer

Inspector Policy Layer clarified Inspector-specific rendering rules and later refined Inspector metadata responsibilities into status, summary, reasons, and read-only state design candidates.

Outcome:

- Inspector remains observability only.
- Reasons remain explanatory evidence, not tasks.
- `totalReasons` remains an observability count, not an action queue.

### Rendering Strategy Layer

Rendering Strategy Layer consolidated how metadata may be displayed across Source Disclosure, Source Badge, Inspector Section, Guarded Fallback, and Unavailable Fallback.

Outcome:

- Rendering surfaces are display surfaces only.
- Status values are read-only state labels.
- Fallback explanations remain non-actionable.

### Rendering Boundary Layer

Rendering Boundary Layer defined allowed and disallowed rendering content before any UI implementation.

Outcome:

- Allowed content is limited to status, headline, description, reasons, totalReasons, read-only state, and fallback explanation.
- Disallowed content includes approval, retry, repair, rebuild, correction, replay, sync, auto-fix, execution workflow, mutation workflow, and execution route.
- B77 closes with no UI implementation, no wiring, no type changes, no projection changes, and no real data connection.

## 10. Next Phase Recommendation

Recommended next phase:

```text
B78-01 Real Compare Validation Integration Spike
```

Purpose:

```text
Design → Runtime Validation
```

B78-01 should investigate how the B77 read-only validation design can move toward runtime validation while preserving the consolidated B77 rendering policy.

Recommended B78-01 constraints:

- Start from validation integration, not UI rendering.
- Preserve GET-only compare route constraints.
- Preserve read-only semantics.
- Preserve guarded rollout state unless a later explicit validation gate changes it.
- Do not enable `real_compare_readonly` as part of the spike.
- Do not add UI implementation, UI wiring, props, type changes, projection changes, source option integration, feature flag changes, DB / Supabase access, adapter integration, or mutation without a new design gate.

Recommended B78-01 focus:

- Identify runtime validation boundaries.
- Identify where validation can be observed without enabling source behavior.
- Identify test scope for runtime validation.
- Confirm that validation integration cannot create execution workflows or mutation workflows.
- Confirm that rendering remains read-only even if runtime validation data becomes available in a later approved phase.

This document closes B77 as a read-only rendering policy consolidation gate. It does not implement UI, wire UI, add rendering, add props, add or modify types, add or modify projection, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
