# Governance Semantic Graph Real Compare Graph Adapter Verification Review

Phase B80-03 documentation.

このドキュメントは、B80-02 Fetch Adapter Verification Review と B78-05 Real Compare Graph Adapter Boundary Design を前提に、`validation layer -> graph adapter -> graph presentation input` における graph adapter の責務、非責務、normalization ownership、presentation input ownership を確認する。

B80-03 は review only である。implementation change、test change、graph adapter change、fetch adapter change、route change、validation change、projection change、UI change、source option change、feature flag change、real_compare_readonly enablement、fetch execution、API execution、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B80-03 is Graph Adapter Verification Review only.

Scope:

- Graph adapter の責務確認を行う。
- Graph adapter の非責務を確認する。
- Normalization ownership を確認する。
- Presentation input ownership を確認する。
- B80-04 Presentation Verification Review へ進む前に、graph boundary の review outcome を固定する。

Out of scope:

- implementation change
- test change
- graph adapter change
- fetch adapter change
- route change
- validation change
- projection change
- UI change
- source option change
- feature flag change
- `real_compare_readonly` enablement
- fetch execution
- API execution
- DB / Supabase access
- adapter integration
- mutation
- execution control

## 2. Verification Target

Target:

```text
apps/admin-dashboard/src/app/inventoryIntegrityGraphAdapter.ts
```

Verification viewpoints:

- normalization boundary
- shape stabilization
- presentation input preparation
- read-only graph mapping

Current review observation:

- The graph adapter file contains a read-only projection scaffold for fixture-like GET-only source data.
- The adapter maps metadata into graph summaries, nodes, edges, metadata, legend, warnings, and unavailable graph data candidates.
- The graph adapter types preserve `readOnlyBoundary` and `compareEndpointMethod` metadata for read-only interpretation.
- The adapter is reviewed as a normalization boundary only in B80-03.
- The adapter is not executed by this review.
- The adapter is not changed by this review.

Boundary interpretation:

- `validation layer` owns shape, metadata, classification, availability, and fallback decision input.
- `graph adapter` owns graph normalization after validation approval.
- `graph presentation input` is a candidate output for later presentation review.
- The boundary does not authorize fetch execution, route execution, validation decision changes, fallback decision changes, UI rendering, source option integration, feature flag change, or mutation.

## 3. Graph Adapter Responsibilities

Graph adapter responsibilities:

- normalization
- shape stabilization
- presentation input preparation
- read-only graph mapping

### Normalization

Responsibility:

- Normalize validation-approved read-only semantics into graph-safe structure candidates.
- Convert metadata candidates into graph summaries, nodes, edges, metadata, and legend candidates.
- Preserve warning and unavailable semantics as graph caveats.
- Preserve non-execution wording and read-only relation meaning.

Boundary:

- Normalization does not validate source trust.
- Normalization does not decide route readiness.
- Normalization does not decide fallback outcome.
- Normalization does not enable source options.

### Shape Stabilization

Responsibility:

- Stabilize graph data shape for downstream presentation input.
- Preserve missing, incomplete, unsupported, fallback, and unavailable warning signals.
- Keep graph data structurally predictable for future display candidates.
- Fail toward unavailable graph candidates when healthy graph data is unsafe.

Boundary:

- Shape stabilization does not repair metadata.
- Shape stabilization does not hide validation caveats.
- Shape stabilization does not coerce unsafe input into healthy graph readiness.

### Presentation Input Preparation

Responsibility:

- Prepare graph display candidate data.
- Prepare graph metadata candidate data.
- Prepare warning candidate data.
- Prepare fallback explanation candidate data as display metadata.

Boundary:

- Presentation input preparation is not presentation rendering.
- Presentation input preparation is not UI wiring.
- Presentation input preparation is not source option integration.
- Presentation input preparation is not feature flag behavior.

### Read-only Graph Mapping

Responsibility:

- Treat graph output as observability projection.
- Map graph semantics for display only.
- Preserve read-only labels and no-execution wording.
- Keep `real_compare_readonly` guarded, disabled, non-live, and unwired.

Boundary:

- Read-only graph mapping does not create commands.
- Read-only graph mapping does not create mutation payloads.
- Read-only graph mapping does not create repair, retry, rebuild, replay, sync, correction, approval, or auto-fix instructions.

## 4. Graph Adapter Non-Responsibilities

Graph adapter non-responsibilities:

- fetch execution
- route execution
- validation decision
- fallback decision
- UI rendering
- mutation execution

### Fetch Execution

The graph adapter must not:

- Execute fetch behavior.
- Trigger API calls.
- Receive responsibility for network transport.
- Own route response reception.

### Route Execution

The graph adapter must not:

- Invoke `compare-readonly` route behavior.
- Change route contract.
- Interpret route access as enablement.
- Own GET contract verification.

### Validation Decision

The graph adapter must not decide:

- shape validation
- metadata validation
- classification validation
- availability validation
- source divergence policy
- enum drift policy

Validation remains upstream ownership.

### Fallback Decision

The graph adapter must not decide:

- `read_only_candidate`
- `guarded_fallback`
- `fallback_unavailable`
- fallback execution
- fallback UI rendering

Fallback decision remains validation / review metadata only.

### UI Rendering

The graph adapter must not render:

- UI components
- graph section changes
- disclosure surfaces
- badge surfaces
- inspector surfaces
- action controls

### Mutation Execution

The graph adapter must not execute or create:

- mutation payloads
- inventory writes
- source option changes
- feature flag changes
- workflow commands

## 5. Normalization Ownership Review

Graph adapter owns:

- graph normalization
- shape stabilization
- presentation-ready mapping

Validation layer does not own graph normalization.

### Graph Normalization Ownership

Graph adapter ownership:

- Build graph-safe summaries, nodes, edges, metadata, and legend candidates.
- Preserve graph warning semantics.
- Preserve unavailable graph candidates.
- Preserve read-only edge meaning.

Validation layer boundary:

- Validation classifies input safety and readiness.
- Validation does not build graph data.
- Validation does not choose graph nodes, graph edges, graph layout, or graph legend semantics.

### Shape Stabilization Ownership

Graph adapter ownership:

- Stabilize graph output shape once validation has accepted graph-mappable input.
- Preserve warning list and fallback graph data when mapping is unsafe.
- Keep graph output predictable for presentation input.

Validation layer boundary:

- Validation may block or pass candidate state.
- Validation does not stabilize presentation-ready graph structure.
- Validation does not hide graph mapping caveats.

### Presentation-ready Mapping Ownership

Graph adapter ownership:

- Prepare graph data as presentation-ready input candidate.
- Preserve graph display candidate semantics.
- Preserve fallback explanation candidate data as metadata.

Validation layer boundary:

- Validation provides decision input and caveats.
- Validation does not produce presentation-ready graph data.
- Validation does not render or wire UI.

## 6. Presentation Input Ownership Review

Presentation layer owns:

- disclosure candidate
- badge candidate
- inspector candidate
- fallback explanation candidate

Graph adapter is responsible only up to presentation input generation and does not own display responsibility.

### Disclosure Candidate

Presentation ownership:

- Explain read-only source posture.
- Explain validation, guarded, unavailable, and fallback caveats.
- Keep disclosure explanatory and non-actionable.

Graph adapter boundary:

- May provide graph metadata and warnings as input candidates.
- Does not format or render disclosure.
- Does not create disclosure UI.

### Badge Candidate

Presentation ownership:

- Represent compact read-only status.
- Preserve guarded, blocked, unavailable, warning, candidate, or not-evaluated state.
- Keep badge state non-triggering.

Graph adapter boundary:

- May provide graph state and warning candidates.
- Does not create badge UI.
- Does not convert status into source selection.

### Inspector Candidate

Presentation ownership:

- Represent status, summary, warnings, reasons, counts, and read-only state as inspection metadata.
- Keep counts observational.
- Keep warnings non-actionable.

Graph adapter boundary:

- May provide graph data and warnings for inspection candidate generation.
- Does not render inspector sections.
- Does not convert warnings into operator tasks.

### Fallback Explanation Candidate

Presentation ownership:

- Explain guarded fallback or unavailable fallback.
- Preserve non-live and disabled source posture.
- Keep fallback explanation non-executing.

Graph adapter boundary:

- May provide unavailable graph data and fallback warnings.
- Does not execute fallback.
- Does not trigger fetch, route, adapter, API, repair, rebuild, replay, sync, correction, approval, auto-fix, or mutation behavior.

## 7. Runtime Safety State

Runtime safety state remains:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isEnabled = false
isGuarded = true
isLiveData = false
UI wiring = none
source option integration = none
```

Safety state interpretation:

- Graph Adapter Verification Review does not enable `real_compare_readonly`.
- Graph Adapter Verification Review does not change feature flags.
- Graph Adapter Verification Review does not connect source options.
- Graph Adapter Verification Review does not wire UI.
- Graph Adapter Verification Review does not execute graph adapter, fetch, route, API, DB / Supabase, or validation.
- Graph Adapter Verification Review does not mutate data.

## 8. Verification Outcome Criteria

B80-03 completion criteria:

- graph adapter remains normalization-only
- presentation ownership remains separate
- mutation ownership absent
- runtime execution not performed

Outcome interpretation:

- A successful verification means the graph adapter boundary is accepted for planning.
- It does not mean graph adapter has been executed.
- It does not mean validation output has been connected to graph adapter.
- It does not mean graph adapter output has been connected to presentation.
- It does not mean runtime graph data is available.
- It does not mean `real_compare_readonly` can be enabled.

## 9. Proceed Conditions

B80-04 Presentation Verification Review may proceed when:

- normalization ownership accepted
- presentation ownership accepted
- non-responsibility boundary accepted
- no implementation changes required

Proceed interpretation:

- B80-04 may review presentation layer ownership for disclosure, badge, inspector, and fallback explanation.
- B80-04 must not implement presentation components.
- B80-04 must not connect graph adapter output to presentation.
- B80-04 must not connect presentation output to UI.
- B80-04 must preserve guarded rollout state.

## 10. Recommended Next Phase

Recommended next phase:

```text
B80-04 Presentation Verification Review
```

Recommended content:

```text
presentation layer
↓
disclosure ownership
↓
badge ownership
↓
inspector ownership
↓
fallback explanation ownership
```

B80-04 should continue review-only and must not implement presentation or UI wiring.

## 11. Non-goals

B80-03 does not include:

- No implementation.
- No tests.
- No graph adapter change.
- No fetch adapter change.
- No route change.
- No validation change.
- No projection change.
- No UI change.
- No source option change.
- No feature flag enablement.
- No `real_compare_readonly` enablement.
- No fetch execution.
- No route execution.
- No API execution.
- No DB / Supabase.
- No adapter integration.
- No UI wiring.
- No mutation.
- No correction.
- No repair.
- No rebuild.
- No replay.
- No sync.
- No auto-fix.
- No execution control.
- No package install.

変更禁止:

- `apps/admin-dashboard/src/app/**`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityGraphAdapterTypes.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityGraphFeatureFlags.ts`
- `InventoryIntegrityGraphSection.tsx`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `api/inventory-integrity/compare-readonly/route.ts`
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

## 12. Closing Review

B80-03 fixes the graph adapter verification review as normalization-only and non-executing.

Accepted verification chain:

```text
validation layer
↓
graph adapter
↓
graph presentation input
```

Accepted ownership split:

```text
validation layer = validation decisions
graph adapter = normalization ownership
presentation layer = display candidate ownership
UI = future rendering review only
```

This review does not implement, test, change adapter behavior, execute graph adapter behavior, execute fetch behavior, execute route behavior, call APIs, connect DB / Supabase, integrate adapters, wire UI, mutate, enable, or connect real data.
