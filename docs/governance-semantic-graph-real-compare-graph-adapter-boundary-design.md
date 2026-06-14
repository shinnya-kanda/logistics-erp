# Governance Semantic Graph Real Compare Graph Adapter Boundary Design

Phase B78-05 documentation.

このドキュメントは、B78-04 Real Compare Fetch Adapter Boundary Design を前提に、validation layer、graph adapter、graph normalization、graph presentation input の責務境界を整理する。

B78-05 は design / review only である。graph adapter implementation、graph adapter change、fetch adapter change、route change、graph adapter execution、fetch execution、API execution、DB / Supabase access、UI wiring、source option integration、feature flag change、real_compare_readonly enablement、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B78-05 is Graph Adapter Boundary Design only.

Scope:

- Graph adapter の責務境界を整理する。
- Validation layer から graph adapter へ渡る read-only graph mapping boundary を整理する。
- Graph adapter が validation decision、fallback decision、fetch execution、route execution を所有しないことを明確にする。
- Graph normalization と graph presentation input の分担を固定する。
- B78-06 Real Compare Presentation Boundary Design へ進む前に、validation / graph adapter / normalization / presentation input の分担を明文化する。

Out of scope:

- implementation change
- graph adapter change
- fetch adapter change
- route change
- graph adapter execution
- fetch execution
- API execution
- DB / Supabase access
- UI wiring
- source option integration
- feature flag change
- `real_compare_readonly` enablement
- mutation
- execution control

## 2. Boundary Overview

Target boundary:

```text
validation layer
↓
graph adapter
↓
graph normalization
↓
graph presentation input
```

Boundary interpretation:

- `validation layer` owns validation decisions and fallback decision input.
- `graph adapter` owns normalization-only mapping from validated read-only semantics into graph-safe structure candidates.
- `graph normalization` owns stable graph data shape preparation, not source enablement.
- `graph presentation input` owns display candidates for future presentation surfaces.
- The arrows describe responsibility handoff only.
- The arrows do not indicate graph adapter execution, fetch execution, route invocation, API execution, UI wiring, source option integration, feature flag change, mutation, correction, repair, rebuild, replay, sync, auto-fix, or workflow execution.

## 3. Validation Layer Responsibilities

Validation layer responsibilities:

- shape validation
- metadata validation
- classification validation
- availability validation
- fallback decision input

### Shape Validation

Validation layer owns response shape interpretation before graph mapping is considered.

Boundary:

- Classify full metadata, partial metadata, missing metadata, nested metadata, key drift, enum drift, unavailable, source divergence, and unsupported shape.
- Fail closed for unsupported graph input shapes.
- Preserve blocking failures as validation output.
- Do not coerce unsupported response shapes into graph data.

### Metadata Validation

Validation layer owns metadata completeness and trust review.

Boundary:

- Review metadata presence and completeness.
- Review lifecycle, classification, observability, governance, confidence, evidence, risk, severity, and availability metadata.
- Preserve caveats for downstream read-only interpretation.
- Do not normalize metadata into graph summaries, nodes, edges, or legends.

### Classification Validation

Validation layer owns classification readiness semantics.

Boundary:

- Review severity, risk, result visibility, review readiness, decision readiness, and escalation readiness.
- Treat warning, blocked, unavailable, and drift states as validation posture.
- Do not translate classification into display labels, node labels, edge paths, badges, or Inspector rows.

### Availability Validation

Validation layer owns availability posture.

Boundary:

- Determine whether validation summary is valid for read-only graph interpretation.
- Preserve guarded, blocked, unavailable, non-live, and non-enabled state.
- Do not enable `real_compare_readonly`.
- Do not choose graph source option behavior.

### Fallback Decision Input

Validation layer produces input that may be used by fallback decision review.

Boundary:

- Provide read-only validation summary.
- Provide guarded availability metadata.
- Provide disclosure / inspector projection candidates through projection.
- Do not execute fallback.
- Do not render fallback.

Validation layer non-responsibilities:

- graph normalization
- graph presentation mapping
- UI rendering
- fetch execution
- route execution
- mutation execution
- source option integration
- feature flag changes

## 4. Graph Adapter Responsibilities

Graph adapter responsibilities:

- normalization
- shape stabilization
- presentation input preparation
- read-only graph mapping

### Normalization

Graph adapter may normalize validation-approved read-only semantics into graph-safe structure candidates in a future approved phase.

Boundary:

- Normalize metadata into stable graph summaries, nodes, edges, metadata, and legend candidates.
- Preserve warning and unavailable semantics as read-only graph caveats.
- Preserve `No Execution Route` style edge meaning.
- Do not validate source trust, classification readiness, or availability readiness.

### Shape Stabilization

Graph adapter owns graph data shape stability after validation has accepted the input as graph-mappable.

Boundary:

- Stabilize graph data shape for display candidates.
- Preserve missing / fallback / unavailable warning signals.
- Keep unknown or incomplete graph semantics visible as warnings or unavailable graph candidates.
- Do not hide validation caveats by creating overconfident healthy graph data.

### Presentation Input Preparation

Graph adapter prepares graph-oriented input candidates for presentation layers.

Boundary:

- Prepare graph display candidate data.
- Prepare graph metadata candidate data.
- Prepare warning candidate data.
- Prepare fallback explanation candidate data only as display metadata.
- Do not render UI.
- Do not create interactive controls.

### Read-only Graph Mapping

Graph adapter mapping must remain read-only.

Boundary:

- Treat graph output as observability projection.
- Map semantics for display only.
- Preserve read-only labels and non-execution wording.
- Do not produce commands, mutation payloads, repair requests, retry requests, sync requests, or workflow instructions.

Graph adapter non-responsibilities:

- fetch execution
- route execution
- API execution
- validation decision
- fallback decision
- mutation execution
- DB / Supabase access
- UI wiring
- source option integration
- feature flag behavior
- `real_compare_readonly` enablement

## 5. Graph Presentation Input Responsibilities

Graph presentation input responsibilities:

- graph display candidate
- disclosure candidate
- badge candidate
- inspector candidate
- fallback explanation candidate

### Graph Display Candidate

Graph presentation input may carry graph data candidates for future display surfaces.

Boundary:

- Represent summaries, nodes, edges, legends, metadata, and warning states as display candidates.
- Preserve read-only graph semantics.
- Preserve unavailable graph candidate semantics when healthy graph data is not safe.
- Do not imply live data availability.

### Disclosure Candidate

Graph presentation input may carry disclosure metadata candidates.

Boundary:

- Explain read-only source posture.
- Explain validation / guarded / unavailable caveats.
- Keep disclosure explanatory.
- Do not create approval, retry, repair, rebuild, replay, sync, correction, or auto-fix prompts.

### Badge Candidate

Graph presentation input may carry badge metadata candidates.

Boundary:

- Represent compact read-only status.
- Preserve guarded, blocked, unavailable, candidate, warning, or not-evaluated state.
- Do not convert badge state into source selection, feature flag state, or live data state.

### Inspector Candidate

Graph presentation input may carry Inspector metadata candidates.

Boundary:

- Represent status, summary, reasons, warnings, counts, read-only state, and fallback explanation as future display metadata.
- Keep counts observational.
- Do not convert reasons or warnings into operator tasks.

### Fallback Explanation Candidate

Graph presentation input may carry fallback explanation candidates.

Boundary:

- Explain why guarded fallback or unavailable fallback remains active.
- Preserve validation failures, guarded rollout state, and non-live source posture.
- Do not execute fallback.
- Do not trigger fetch, route, adapter, API, repair, rebuild, replay, sync, or mutation behavior.

Graph presentation input non-responsibilities:

- execution workflow
- mutation workflow
- repair workflow
- correction workflow
- rebuild workflow
- replay workflow
- sync workflow
- auto-fix workflow
- source option integration
- feature flag change

## 6. Read-only Contract

Future graph adapter boundary design must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
```

Contract interpretation:

- `isReadOnly = true` means graph boundary output is observational only.
- `isActionable = false` means graph boundary output must not create operator tasks.
- `isExecutionAllowed = false` means graph boundary output must not expose execution controls.
- `isLiveData = false` means graph boundary output must not imply live real compare data.

Required guarded rollout state remains:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
UI wiring = none
```

## 7. Safety Boundary

B78-05 preserves the safety boundary:

- No graph adapter execution.
- No fetch execution.
- No API execution.
- No route change.
- No DB / Supabase.
- No UI wiring.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.

Safety interpretation:

- Graph Adapter Boundary Design can describe future normalization responsibilities.
- Graph Adapter Boundary Design cannot execute graph adapter code.
- Graph Adapter Boundary Design cannot call fetch, route, API, DB, or Supabase.
- Graph Adapter Boundary Design cannot connect validation output to UI, source option, feature flags, or live real compare data.
- Graph Adapter Boundary Design cannot make a read-only graph candidate production-ready.

## 8. Boundary Review Outcome

Review outcome:

- Validation owns validation decisions.
- Graph adapter owns normalization only.
- Presentation layer owns display metadata only.
- Fallback decisions remain read-only.

Outcome interpretation:

- Validation boundary classifies shape, metadata, classification, availability, and fallback decision input.
- Graph adapter boundary prepares graph-safe normalized structure candidates only after validation semantics are accepted.
- Presentation boundary interprets candidates as display metadata only.
- Fallback decision remains explanation metadata, not fallback execution.
- No boundary owns source enablement in B78-05.
- No boundary changes `real_compare_readonly` behavior in B78-05.

## 9. Proceed Conditions

B78-06 Real Compare Presentation Boundary Design may proceed when the following conditions are accepted:

- route boundary documented
- fetch boundary documented
- validation boundary documented
- graph adapter boundary documented
- presentation boundary documented
- read-only contract maintained

Proceed interpretation:

- Route boundary remains GET-only.
- Fetch boundary remains transport-only.
- Validation boundary remains validation-only.
- Graph adapter boundary remains normalization-only.
- Presentation boundary remains display metadata only.
- `real_compare_readonly` remains guarded, disabled, non-live, and unwired.

## 10. Future Candidate

Next phase candidate:

```text
B78-06 Real Compare Presentation Boundary Design
```

B78-06 should continue Design / Review first and avoid real connection.

Future candidate must preserve:

- No graph adapter execution.
- No fetch execution.
- No API execution.
- No route change.
- No DB / Supabase.
- No UI wiring unless explicitly scoped by a later approved phase.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.

## 11. Non-goals

B78-05 does not include:

- No implementation change.
- No graph adapter change.
- No fetch adapter change.
- No route change.
- No graph adapter execution.
- No fetch / API.
- No DB / Supabase.
- No UI wiring.
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
- `inventoryIntegrityGraphAdapterTypes.ts`
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

## 12. Closing Note

B78-05 fixes the graph adapter boundary as normalization-only and read-only.

The accepted boundary is:

```text
validation decisions
↓
normalization-only graph adapter
↓
stable graph candidate shape
↓
display metadata candidates
```

This document does not implement, execute, wire, fetch, call, mutate, enable, or connect real data.
