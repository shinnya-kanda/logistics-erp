# Governance Semantic Graph Real Compare Fetch Adapter Boundary Design

Phase B78-04 documentation.

このドキュメントは、B78-03 Real Compare Validation Route Contract Spike を前提に、`compare-readonly` route、fetch adapter、validation layer、projection layer の責務境界を整理する。

B78-04 は design / review only である。fetch adapter implementation、fetch adapter change、route change、graph adapter change、fetch execution、API execution、DB / Supabase access、adapter execution、adapter integration、graph adapter execution、UI wiring、source option integration、feature flag change、real_compare_readonly enablement、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B78-04 is Fetch Adapter Boundary Design only.

Scope:

- Fetch adapter の責務境界を整理する。
- Route response から validation layer へ渡る read-only transport boundary を整理する。
- Validation decision と projection metadata が fetch adapter の責務ではないことを明確にする。
- B78-05 Real Compare Graph Adapter Boundary Design へ進む前に、route / fetch / validation / projection の分担を固定する。

Out of scope:

- implementation change
- fetch adapter change
- route change
- graph adapter change
- fetch execution
- API execution
- DB / Supabase access
- adapter execution
- graph adapter execution
- UI wiring
- source option integration
- feature flag change
- mutation
- execution control

## 2. Boundary Overview

Target boundary:

```text
compare-readonly route
↓
fetch adapter
↓
validation layer
↓
projection layer
```

Boundary interpretation:

- `compare-readonly route` is the future GET-only read-only route contract source.
- `fetch adapter` is a transport boundary that receives route response semantics and forwards payload semantics.
- `validation layer` owns shape / metadata / classification / availability validation.
- `projection layer` owns disclosure / inspector / guarded availability / read-only metadata projection.
- The arrows describe responsibility handoff only.
- The arrows do not indicate fetch execution, route invocation, adapter execution, UI wiring, mutation, correction, repair, rebuild, replay, sync, auto-fix, or workflow execution.

## 3. Fetch Adapter Responsibilities

Fetch adapter responsibilities:

- route response reception
- payload forwarding
- read-only transport boundary
- error propagation

### Route Response Reception

The fetch adapter may receive response-like transport semantics in a future approved phase.

Boundary:

- Receive route response semantics as input.
- Preserve GET-only and read-only route assumptions.
- Do not decide source enablement.
- Do not own validation gate outcomes.

### Payload Forwarding

The fetch adapter may forward transport-safe payload metadata toward validation.

Boundary:

- Preserve payload identity and source semantics.
- Preserve unavailable / degraded / guarded transport metadata.
- Preserve error metadata for downstream validation.
- Do not normalize into healthy graph semantics.

### Read-only Transport Boundary

The fetch adapter is responsible for keeping transport semantics read-only.

Boundary:

- Treat transport data as observability input.
- Do not create operator actions.
- Do not create mutation payloads.
- Do not create workflow commands.

### Error Propagation

The fetch adapter may preserve transport errors for validation.

Boundary:

- Propagate unavailable or degraded transport state.
- Preserve error context as validation input candidate.
- Do not retry automatically.
- Do not repair, rebuild, correct, replay, sync, or auto-fix.

Fetch adapter non-responsibilities:

- validation decision
- fallback decision
- UI rendering
- execution workflow
- mutation workflow
- source option behavior
- feature flag behavior
- graph adapter execution

## 4. Validation Layer Responsibilities

Validation layer responsibilities:

- shape validation
- metadata validation
- classification validation
- availability validation
- fallback decision input

### Shape Validation

Validation layer owns response shape interpretation.

Boundary:

- Classify full metadata, partial metadata, missing metadata, nested metadata, key drift, enum drift, unavailable, source divergence, and unsupported shape.
- Fail closed for unsupported shapes.
- Keep shape review read-only.

### Metadata Validation

Validation layer owns metadata completeness and trust review.

Boundary:

- Review metadata presence and completeness.
- Review lifecycle, classification, observability, governance, confidence, evidence, risk, and severity metadata.
- Preserve caveats.
- Do not create repair or sync instructions.

### Classification Validation

Validation layer owns classification readiness semantics.

Boundary:

- Review severity, risk, result visibility, review readiness, and decision readiness.
- Treat warning / blocked / unavailable states as explanation only.
- Do not grant execution permission.

### Availability Validation

Validation layer owns availability posture.

Boundary:

- Determine whether validation summary is valid for read-only graph interpretation.
- Preserve blocking failures.
- Preserve unavailable conditions.
- Do not enable `real_compare_readonly`.

### Fallback Decision Input

Validation layer produces input that may be used by fallback decision.

Boundary:

- Provide read-only validation summary.
- Provide guarded availability metadata.
- Provide disclosure / inspector metadata through projection.
- Do not execute fallback.

Validation layer non-responsibilities:

- network transport
- route execution
- mutation execution
- UI rendering
- source option integration
- feature flag changes

## 5. Projection Layer Responsibilities

Projection layer responsibilities:

- disclosure projection
- inspector projection
- guarded availability projection
- read-only metadata projection

### Disclosure Projection

Projection layer owns disclosure metadata.

Boundary:

- Project status, headline, description, reasons, and read-only invariants.
- Keep disclosure explanatory.
- Do not create action buttons.

### Inspector Projection

Projection layer owns Inspector metadata.

Boundary:

- Project summary status, total results, blocking count, warning count, and read-only state.
- Keep counts observational.
- Do not convert counts into tasks.

### Guarded Availability Projection

Projection layer owns guarded availability metadata.

Boundary:

- Preserve `isGuarded = true`.
- Preserve `isEnabled = false`.
- Preserve `isLiveData = false`.
- Treat visibility as projected metadata only unless a later explicit phase wires it.

### Read-only Metadata Projection

Projection layer owns presentation metadata shape.

Boundary:

- Preserve read-only semantics.
- Preserve non-actionable semantics.
- Preserve no-execution semantics.
- Do not fetch, call route, mutate, or render UI.

Projection layer non-responsibilities:

- fetch execution
- route execution
- mutation
- DB / Supabase access
- adapter integration
- source option integration
- feature flag change

## 6. Read-only Contract

Future boundary design must preserve the read-only contract.

Required state:

```text
isReadOnly = true
isActionable = false
isExecutionAllowed = false
isLiveData = false
```

Contract interpretation:

- `isReadOnly = true` means boundary output is observational only.
- `isActionable = false` means boundary output must not create operator tasks.
- `isExecutionAllowed = false` means boundary output must not expose execution controls.
- `isLiveData = false` means boundary output must not imply live real compare data.

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

B78-04 preserves the safety boundary:

- No fetch execution.
- No API execution.
- No route change.
- No DB / Supabase.
- No adapter integration.
- No graph adapter execution.
- No UI wiring.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.

Safety interpretation:

- Fetch adapter boundary design can describe future transport responsibilities.
- Fetch adapter boundary design cannot execute transport.
- Fetch adapter boundary design cannot call route.
- Fetch adapter boundary design cannot connect validation to live data.
- Fetch adapter boundary design cannot connect graph adapter, UI, source option, or feature flags.
- Fetch adapter boundary design cannot make a read-only candidate production-ready.

## 8. Boundary Review Outcome

Review outcome:

- Fetch adapter remains transport-only.
- Validation owns validation decisions.
- Projection owns presentation metadata.
- Fallback decisions remain read-only.

Outcome interpretation:

- Transport boundary preserves route response semantics.
- Validation boundary classifies safety and readiness.
- Projection boundary prepares read-only metadata.
- Fallback decision does not execute fallback.
- No boundary owns source enablement in B78-04.
- No boundary changes `real_compare_readonly` behavior in B78-04.

## 9. Proceed Conditions

B78-05 Real Compare Graph Adapter Boundary Design may proceed when:

- Route boundary is documented.
- Fetch boundary is documented.
- Validation boundary is documented.
- Projection boundary is documented.
- Read-only contract is maintained.
- GET-only contract is maintained.
- No mutation contract is maintained.
- No UI wiring has been added.
- No source option integration has been added.
- No feature flag change has been added.
- No adapter integration has been added.
- `read_only_candidate` remains non-enabling.
- `fallback_unavailable` remains read-only explanation.

B78-05 should preserve:

- design / review only
- no runtime connection
- no graph adapter execution
- no UI wiring
- no source option integration
- no feature flag change
- no mutation
- no real_compare_readonly enablement

## 10. Future Candidate

Next phase candidate:

```text
B78-05 Real Compare Graph Adapter Boundary Design
```

Recommendation:

- Continue Design / Review only.
- Do not perform real connection in B78-05.
- Do not execute graph adapter in B78-05.
- Keep graph adapter boundary separate from UI wiring and source option enablement.
- Preserve fetch adapter as transport-only.
- Preserve validation as validation-decision owner.
- Preserve projection as presentation-metadata owner.
- Preserve guarded, disabled, non-live `real_compare_readonly` behavior.

## 11. Non-goals

B78-04 does not include:

- No implementation change.
- No fetch adapter change.
- No route change.
- No graph adapter change.
- No fetch execution.
- No API execution.
- No DB / Supabase.
- No adapter execution.
- No adapter integration.
- No graph adapter execution.
- No UI wiring.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.
- No correction.
- No repair.
- No rebuild.
- No replay.
- No sync.
- No auto-fix.
- No package install.

変更禁止:

- `apps/admin-dashboard/src/app/**`
- `api/inventory-integrity/compare-readonly/route.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityGraphAdapter.ts`
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

This document is a Fetch Adapter Boundary Design gate. It does not change fetch adapter code, change routes, change graph adapters, execute fetch, execute APIs, connect DB / Supabase, execute adapters, wire UI, integrate source options, change flags, mutate, or enable `real_compare_readonly`.
