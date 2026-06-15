# Governance Semantic Graph Real Compare Presentation Boundary Design

Phase B78-06 documentation.

このドキュメントは、B78-05 Real Compare Graph Adapter Boundary Design を前提に、graph presentation input、disclosure candidate、badge candidate、inspector candidate、fallback explanation candidate の責務境界を整理する。

B78-06 は design / review only である。UI implementation、UI wiring、presentation component addition、graph section change、graph adapter change、fetch adapter change、route change、graph adapter execution、fetch execution、API execution、DB / Supabase access、source option integration、feature flag change、real_compare_readonly enablement、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B78-06 is Presentation Boundary Design only.

Scope:

- Presentation Layer の責務境界を整理する。
- Graph presentation input から Disclosure / Badge / Inspector / Fallback explanation candidates へ渡る display-only boundary を整理する。
- Presentation candidate が UI implementation、UI wiring、execution workflow、mutation workflow、source enablement を所有しないことを明確にする。
- B78-07 Real Compare UI Wiring Boundary Design へ進む前に、presentation candidate の分担を固定する。

Out of scope:

- implementation change
- UI implementation
- UI wiring
- presentation component addition
- graph section change
- graph adapter change
- fetch adapter change
- route change
- graph adapter execution
- fetch execution
- API execution
- DB / Supabase access
- source option integration
- feature flag change
- `real_compare_readonly` enablement
- mutation
- execution control

## 2. Boundary Overview

Target boundary:

```text
graph presentation input
↓
disclosure candidate
↓
badge candidate
↓
inspector candidate
↓
fallback explanation candidate
```

Boundary interpretation:

- `graph presentation input` is the display-candidate handoff from graph normalization.
- `disclosure candidate` owns explanatory headline, description, reasons, and read-only explanation.
- `badge candidate` owns compact status and state indication.
- `inspector candidate` owns inspection metadata for future display surfaces.
- `fallback explanation candidate` owns guarded / unavailable / read-only explanation only.
- The arrows describe presentation responsibility decomposition only.
- The arrows do not indicate UI rendering, UI wiring, component creation, graph adapter execution, fetch execution, route invocation, API execution, source option integration, feature flag change, mutation, correction, repair, rebuild, replay, sync, auto-fix, or workflow execution.

## 3. Disclosure Candidate Responsibilities

Disclosure candidate responsibilities:

- headline
- description
- reasons
- read-only explanation

### Headline

Disclosure headline provides short display context.

Boundary:

- Summarize read-only candidate, guarded, blocked, unavailable, warning, or not-evaluated state.
- Keep wording explanatory and non-actionable.
- Do not imply source enablement, live data, approval, execution readiness, or repair readiness.

### Description

Disclosure description provides display explanation.

Boundary:

- Explain the read-only presentation posture.
- Preserve validation, guarded rollout, graph adapter, and presentation caveats.
- Keep description suitable for future UI display.
- Do not convert explanation into operator instruction.

### Reasons

Disclosure reasons preserve caveat detail.

Boundary:

- List validation, guarded, unavailable, fallback, or presentation caveats.
- Keep reasons observational.
- Do not convert reasons into checklist tasks, approval items, retry prompts, repair prompts, or workflow steps.

### Read-only Explanation

Disclosure candidate must keep read-only state visible.

Boundary:

- Explain that the candidate is read-only, non-actionable, non-executable, and non-live.
- Preserve "No Execution Route" style meaning where useful.
- Do not create UI actions, controls, triggers, or workflow affordances.

Disclosure candidate non-responsibilities:

- execution workflow
- mutation workflow
- repair workflow
- retry workflow
- approval workflow
- source option behavior
- feature flag behavior
- UI rendering

## 4. Badge Candidate Responsibilities

Badge candidate responsibilities:

- status label
- state indication
- read-only state indication

### Status Label

Badge status label provides compact state text.

Boundary:

- Represent status as read-only display state.
- Use compact labels for candidate, guarded, blocked, unavailable, warning, passed, or not-evaluated posture.
- Do not turn status into approval, execution, repair, retry, or enablement state.

### State Indication

Badge state indication provides concise visual semantics for future display.

Boundary:

- Indicate guarded, blocked, unavailable, candidate, warning, or stable display posture.
- Preserve caveats without overstating readiness.
- Do not imply live real compare data is available.
- Do not imply the source can be selected or enabled.

### Read-only State Indication

Badge candidate must preserve read-only semantics.

Boundary:

- Indicate display-only state.
- Preserve non-actionable meaning.
- Preserve no-execution meaning.
- Do not create trigger semantics.

Badge candidate non-responsibilities:

- approval workflow
- execution trigger
- repair trigger
- retry trigger
- mutation trigger
- source option integration
- feature flag change
- UI component behavior

## 5. Inspector Candidate Responsibilities

Inspector candidate responsibilities:

- status
- headline
- description
- reasons
- totalReasons
- readOnly state

### Status

Inspector status provides inspection posture.

Boundary:

- Represent candidate, guarded, blocked, unavailable, warning, passed, or not-evaluated state as inspection metadata.
- Keep status explanatory.
- Do not grant execution permission, mutation authority, source enablement, or live data authority.

### Headline

Inspector headline provides short inspection summary.

Boundary:

- Summarize the current read-only presentation candidate.
- Preserve guarded and unavailable posture where present.
- Do not imply operator action is required.

### Description

Inspector description provides inspection context.

Boundary:

- Explain validation, graph adapter, presentation, guarded rollout, or fallback context.
- Keep description display-only.
- Do not render or define UI controls.

### Reasons

Inspector reasons provide inspection details.

Boundary:

- Preserve validation and presentation caveats.
- Keep reasons as read-only explanation.
- Do not convert reasons into workflow tasks or repair steps.

### Total Reasons

Inspector `totalReasons` is an observability count.

Boundary:

- Count explanation reasons only.
- Keep count informational.
- Do not convert count into task count, approval count, retry count, repair count, rebuild count, sync count, or mutation count.

### ReadOnly State

Inspector candidate must preserve read-only state.

Boundary:

- Preserve read-only inspection semantics.
- Preserve non-actionable, non-executable, and non-live state.
- Do not expose action handles.

Inspector candidate non-responsibilities:

- execution action
- mutation action
- workflow action
- approval action
- repair action
- retry action
- UI rendering
- UI wiring

## 6. Fallback Explanation Responsibilities

Fallback explanation responsibilities:

- guarded explanation
- unavailable explanation
- read-only explanation

### Guarded Explanation

Guarded explanation clarifies why guarded display remains active.

Boundary:

- Explain hidden flag, admin-only guard, validation gate, rollout gate, or non-live state.
- Keep guarded state explanatory.
- Do not provide bypass, escalation, approval, or enablement workflow.

### Unavailable Explanation

Unavailable explanation clarifies why healthy graph display is not available.

Boundary:

- Explain unavailable source, unavailable metadata, unsupported shape, source divergence, enum drift, or blocking validation state.
- Preserve fail-closed posture.
- Do not retry, repair, rebuild, replay, sync, correct, or auto-fix.

### Read-only Explanation

Fallback explanation must remain read-only.

Boundary:

- Explain fallback as display metadata only.
- Preserve non-actionable and non-executable state.
- Do not execute fallback.
- Do not trigger graph adapter, fetch, route, API, DB, Supabase, source option, feature flag, or mutation behavior.

Fallback explanation non-responsibilities:

- retry execution
- repair execution
- auto-fix
- enablement workflow
- correction execution
- rebuild execution
- replay execution
- sync execution
- mutation execution

## 7. Read-only Contract

Future presentation boundary design must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
```

Contract interpretation:

- `isReadOnly = true` means presentation candidates are observational only.
- `isActionable = false` means presentation candidates must not create operator tasks.
- `isExecutionAllowed = false` means presentation candidates must not expose execution controls.
- `isLiveData = false` means presentation candidates must not imply live real compare data.

Required guarded rollout state remains:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
UI wiring = none
```

## 8. Safety Boundary

B78-06 preserves the safety boundary:

- No UI implementation.
- No UI wiring.
- No graph adapter execution.
- No fetch execution.
- No API execution.
- No route change.
- No DB / Supabase.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.

Safety interpretation:

- Presentation Boundary Design can describe future display-candidate responsibilities.
- Presentation Boundary Design cannot implement UI components.
- Presentation Boundary Design cannot wire candidates into `InventoryIntegrityGraphSection`.
- Presentation Boundary Design cannot execute graph adapter code.
- Presentation Boundary Design cannot call fetch, route, API, DB, or Supabase.
- Presentation Boundary Design cannot connect source options, feature flags, or live real compare data.
- Presentation Boundary Design cannot make a display candidate production-ready.

## 9. Boundary Review Outcome

Review outcome:

- Presentation owns display candidates only.
- Disclosure owns explanations only.
- Badge owns status indication only.
- Inspector owns inspection metadata only.
- Fallback owns explanation only.

Outcome interpretation:

- Presentation candidates are not renderers.
- Presentation candidates are not UI wiring.
- Disclosure candidate explains state without commands.
- Badge candidate indicates status without triggers.
- Inspector candidate exposes inspection metadata without actions.
- Fallback explanation describes guarded or unavailable state without execution.
- No boundary owns source enablement in B78-06.
- No boundary changes `real_compare_readonly` behavior in B78-06.

## 10. Proceed Conditions

B78-07 Real Compare UI Wiring Boundary Design may proceed when the following conditions are accepted:

- route boundary documented
- fetch boundary documented
- graph boundary documented
- presentation boundary documented
- read-only contract maintained

Proceed interpretation:

- Route boundary remains GET-only.
- Fetch boundary remains transport-only.
- Graph boundary remains normalization-only.
- Presentation boundary remains display-candidate-only.
- UI wiring remains unimplemented until a later explicitly approved phase.
- `real_compare_readonly` remains guarded, disabled, non-live, and unwired.

## 11. Future Candidate

Next phase candidate:

```text
B78-07 Real Compare UI Wiring Boundary Design
```

B78-07 should continue Design / Review only and must not implement UI wiring.

Future candidate must preserve:

- No UI implementation.
- No UI wiring implementation.
- No presentation component addition.
- No graph section change unless a later approved phase explicitly scopes it.
- No graph adapter execution.
- No fetch execution.
- No API execution.
- No route change.
- No DB / Supabase.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.

## 12. Non-goals

B78-06 does not include:

- No implementation change.
- No UI implementation.
- No UI wiring.
- No presentation component addition.
- No graph section change.
- No graph adapter change.
- No fetch adapter change.
- No route change.
- No graph adapter execution.
- No fetch / API.
- No DB / Supabase.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.
- No correction.
- No rebuild.
- No repair.
- No replay.
- No sync.
- No auto-fix.
- No execution control.
- No package install.

変更禁止:

- `apps/admin-dashboard/src/app/**`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityRealCompareReadOnlyUiMetadataTypes.ts`
- `inventoryIntegrityRealCompareReadOnlyUiMetadataProjection.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `api/inventory-integrity/compare-readonly/route.ts`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- Edge Functions
- DB schema
- `services/api`

追加禁止:

- fetch implementation pattern
- Supabase client creation pattern
- insert / update / upsert / delete / RPC mutation pattern
- POST route export pattern

## 13. Closing Note

B78-06 fixes the presentation boundary as display-candidate-only and read-only.

The accepted boundary is:

```text
graph presentation input
↓
explanation candidates
↓
status indication candidates
↓
inspection metadata candidates
↓
fallback explanation candidates
```

This document does not implement, render, wire, execute, fetch, call, mutate, enable, or connect real data.
