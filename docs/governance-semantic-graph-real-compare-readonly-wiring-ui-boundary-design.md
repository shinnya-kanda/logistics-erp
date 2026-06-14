# Governance Semantic Graph Real Compare Read-only Wiring UI Boundary Design

Phase B77-68 documentation.

このドキュメントは、B77-60 から B77-67 で整理した Real Compare Guarded Availability disclosure / read-only wiring types / wiring metadata projection / projection tests を前提に、`RealCompareReadOnlyWiringBundle` を将来 Graph UI の disclosure / badge / Inspector へ渡す際の UI boundary を設計する。

B77-68 は design only である。UI implementation、wiring implementation、UI component、source option integration、feature flag change、real compare enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-68 is UI boundary design only.

Scope:

- B77-60 から B77-67 の成果物を前提にする。
- `RealCompareReadOnlyWiringBundle` を将来 Graph UI へ渡す場合の UI input / output boundary を整理する。
- disclosure / badge / Inspector が read-only explanation であり、source enablement や execution authority ではないことを固定する。
- B77-68 時点では `isWiredToUi = false` と `UI wiring = none` を維持する。

Out of scope:

- UI implementation
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

## 2. UI Input Boundary

Future UI input:

```text
RealCompareReadOnlyWiringBundle
```

Future UI surfaces:

- Graph Source Disclosure
- Source Badge
- Inspector Validation Section
- Guarded Fallback Reason
- Unavailable Fallback Explanation

Input interpretation:

- `RealCompareReadOnlyWiringBundle` is read-only metadata.
- `metadata[].target` may describe where information can be displayed later.
- `metadata[].status` may describe candidate / guarded / blocked / unavailable display state.
- `displayBundle` may provide badge, disclosure, and Inspector-safe text.
- The bundle does not select a source option.
- The bundle does not change feature flags.
- The bundle does not call a route, fetch data, connect adapters, or mutate data.

## 3. UI Output Boundary

Allowed UI output:

- 状態表示
- 理由表示
- 件数表示
- fallback explanation 表示

Forbidden UI output:

- 実行ボタン
- approve
- repair
- rebuild
- retry
- sync
- replay
- correction
- mutation workflow
- auto-fix
- execution route

Boundary interpretation:

- Disclosure can explain read-only status only.
- Badge can show state only.
- Inspector can show reasons, counts, and read-only state only.
- Fallback explanation can explain why unavailable / guarded display is used.
- No UI surface may become a command surface.
- No UI surface may imply operator execution or approval.

## 4. Read-only Contract

Future UI connection must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isWiredToUi = false（B77-68時点）
isLiveData = false
```

Contract interpretation:

- `isReadOnly = true` means display metadata is observational only.
- `isActionable = false` means UI must not create operator tasks.
- `isExecutionAllowed = false` means UI must not expose execution controls.
- `isWiredToUi = false` means B77-68 does not connect the metadata to UI.
- `isLiveData = false` means B77-68 does not enable live real compare data.

Required wording:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`
- `Guarded Source / ガード中ソース`
- `Validation Disclosure / 検証結果表示`

## 5. Display Policy

### Candidate

Display policy:

- show as read-only candidate.
- show candidate readiness only.
- do not imply source enablement.
- do not imply `real_compare_readonly` is visible, selectable, live, or production-ready.

### Guarded

Display policy:

- show guarded disclosure.
- show caution display.
- keep guarded / disabled / non-live wording.
- do not show action prompts.

### Blocked

Display policy:

- show blocked disclosure.
- show fallback reason.
- keep blocking reason explanatory.
- do not convert blocked state into healthy source display.

### Unavailable

Display policy:

- show `fallback_unavailable` explanation.
- show unavailable explanation.
- keep `Graph Unavailable / グラフ利用不可` wording available for future UI.
- do not silently fallback to mock.
- do not prompt retry.

## 6. Inspector Boundary

Future Inspector display may include:

- status
- headline
- description
- reasons
- totalReasons
- readOnly state

Inspector policy:

- status explains display state only.
- headline is a short read-only summary.
- description is explanatory, not instructional.
- reasons are validation / fallback caveats.
- totalReasons is an observability count, not an action queue.
- readOnly state confirms no execution surface.

B77-68 does not implement Inspector rendering, Inspector rows, Inspector tabs, or UI wiring.

Forbidden Inspector content:

- retry instruction
- approve instruction
- repair instruction
- rebuild instruction
- replay instruction
- sync instruction
- correction instruction
- mutation payload
- route invocation instruction
- role escalation workflow
- action button metadata

## 7. Guarded Rollout State

B77-68 preserves the current guarded rollout state.

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
- No UI implementation is added.
- No wiring implementation is added.

Guard interpretation:

- Hidden flag controls source option candidate visibility only.
- Static admin guard controls admin-only candidate visibility only.
- UI boundary metadata cannot bypass hidden flag or admin guard.
- UI boundary metadata cannot enable source visibility, source selection, live fetch, or execution controls.

## 8. Non-goals

B77-68 does not include:

- No UI implementation.
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
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphAdapter.ts`
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

Candidate future phases after B77-68:

- Real Compare Read-only Wiring UI Metadata Design
  - Define UI-safe metadata shapes for disclosure, badge, Inspector, guarded fallback, and unavailable explanation.
  - Keep metadata display-only and action-free.
- Real Compare Inspector UI Boundary Design
  - Design Inspector-specific placement, labels, and read-only count display.
  - Keep Inspector explanatory and non-actionable.
- Real Compare Read-only Wiring Integration Design
  - Design future integration boundaries before implementation.
  - Preserve hidden flag, admin-only guard, disabled state, non-live behavior, and no action controls.

Recommended order:

1. Real Compare Read-only Wiring UI Metadata Design.
2. Real Compare Inspector UI Boundary Design.
3. Real Compare Read-only Wiring Integration Design.
4. UI implementation only after the above design gates are accepted.

This document is a UI boundary design gate. It does not implement UI, add wiring, expose a source option, change flags, fetch, call a route, connect adapters, authorize, mutate, or enable `real_compare_readonly`.
