# Governance Semantic Graph Real Compare Read-only UI Integration Boundary Design

Phase B77-73 documentation.

このドキュメントは、B77-60 から B77-72 で整理した Real Compare guarded availability、read-only wiring metadata、UI metadata types、UI metadata projection、projection tests を前提に、`RealCompareReadOnlyUiMetadataBundle` を将来 Graph UI へ接続する際の UI Integration Boundary を設計する。

B77-73 は design only である。UI implementation、UI wiring、UI component、props addition、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-73 is UI Integration Boundary Design only.

Scope:

- B77-60 から B77-72 の成果物を前提にする。
- `RealCompareReadOnlyUiMetadataBundle` を将来 Graph UI に渡す場合の integration input / display target / forbidden boundary を整理する。
- UI integration が read-only display integration であり、source enablement、live data enablement、execution authority ではないことを固定する。
- B77-73 時点では UI implementation、UI wiring、props addition、apps 配下変更を行わない。

Out of scope:

- UI implementation
- UI wiring
- UI component
- props addition
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

## 2. UI Integration Input

Future UI integration input:

```text
RealCompareReadOnlyUiMetadataBundle
```

Input interpretation:

- `RealCompareReadOnlyUiMetadataBundle` is display metadata only.
- `disclosure` may provide status, headline, description, reasons, and read-only invariants.
- `badge` may provide compact state display metadata.
- `inspector` may provide status, headline, description, reasons, total reason count, and read-only state.
- `isReadOnly` must remain true.
- `isLiveData` must remain false.
- The bundle does not select a source option.
- The bundle does not change feature flags.
- The bundle does not call routes, fetch data, connect adapters, or mutate data.
- The bundle does not enable `real_compare_readonly`.

Future conceptual flow:

```text
RealCompareReadOnlyWiringBundle
↓
RealCompareReadOnlyUiMetadataBundle
↓
Graph UI read-only display surfaces
```

The arrows describe future interpretation order only. They are not an execution chain, fetch chain, adapter chain, approval chain, fallback execution chain, or route invocation chain.

## 3. Future Integration Targets

Future connection candidates:

- Graph Source Disclosure
- Source Badge
- Inspector Validation Section
- Guarded Fallback Explanation
- Unavailable Fallback Explanation

Target interpretation:

- Graph Source Disclosure may show read-only status, headline, description, and reasons.
- Source Badge may show compact guarded / candidate / blocked / unavailable state.
- Inspector Validation Section may show reasons, total reason count, and read-only state.
- Guarded Fallback Explanation may explain why guarded / disabled / non-live display remains active.
- Unavailable Fallback Explanation may explain why unavailable fallback is displayed.
- No target may become a command surface.
- No target may imply operator execution, approval, correction, repair, rebuild, sync, replay, retry, or auto-fix.

## 4. Integration Boundary Rules

Allowed future UI output:

- status display
- headline display
- description display
- reasons display
- totalReasons display
- readOnly state display

Allowed interpretation:

- Status explains read-only candidate / guarded / blocked / unavailable state.
- Headline and description are explanatory text, not action instructions.
- Reasons are validation or fallback caveats.
- `totalReasons` is an observability count, not an action queue.
- Read-only state confirms no execution surface.

Forbidden future UI output:

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
- Do not make Graph UI a source enablement surface.
- Do not convert fallback or guarded state into healthy live data.

## 5. Read-only Contract

Future UI integration must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
```

Contract interpretation:

- `isReadOnly = true` means UI metadata is observational only.
- `isActionable = false` means UI must not create operator tasks.
- `isExecutionAllowed = false` means UI must not expose execution controls.
- `isLiveData = false` means UI must not imply live real compare data.

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

## 6. Guarded Rollout State

B77-73 preserves the current guarded rollout state.

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
- UI metadata projection behavior is unchanged.
- UI metadata projection tests are unchanged.
- No UI implementation is added.
- No UI wiring is added.
- No props are added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- UI metadata cannot bypass hidden flag or admin guard.
- UI integration cannot enable source visibility, source selection, live fetch, or execution controls.
- `real_compare_readonly` remains a guarded source candidate, not an active live source.

## 7. Non-goals

B77-73 does not include:

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

## 8. Future Candidate

Candidate future phases after B77-73:

- Real Compare Read-only UI Metadata Integration Design
  - Design exact placement and prop boundaries for disclosure / badge / Inspector metadata before implementation.
  - Keep integration display-only and action-free.
- Inspector Read-only Integration Design
  - Design Inspector-specific grouping, labels, and reason count display.
  - Keep Inspector explanatory and non-actionable.
- Read-only UI Rendering Policy Design
  - Define rendering wording, fallback labels, and accessibility rules before adding UI.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. Real Compare Read-only UI Metadata Integration Design.
2. Inspector Read-only Integration Design.
3. Read-only UI Rendering Policy Design.
4. UI implementation only after the above design gates are accepted.

This document is a UI integration boundary design gate. It does not implement UI, add wiring, add props, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
