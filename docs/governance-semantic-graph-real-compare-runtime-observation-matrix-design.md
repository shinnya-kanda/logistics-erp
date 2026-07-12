# Governance Semantic Graph Real Compare Runtime Observation Matrix Design

Phase B82-03 documentation.

このドキュメントは、B82-01 Runtime Dry-Run Plan と B82-02 Runtime Integration Spike Design を前提に、`real_compare_readonly` の Runtime Integration を将来検討する際に各段階で観察すべき項目を matrix として整理する。

B82-03 は Runtime Observation Matrix Design only である。runtime connection、runtime execution、runtime enablement、implementation change、test change、route change、fetch adapter change、graph adapter change、validation change、projection change、UI change、source option change、feature flag change、`real_compare_readonly` enablement、API execution、DB / Supabase access、adapter integration、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B82-03 is Runtime Observation Matrix Design only.

Scope:

- Runtime Observation Matrix を設計する。
- Stage 別の Observation Target、Expected Signal、Stop Signal、Owner を整理する。
- Boundary preservation checks を整理する。
- Ownership preservation checks を整理する。
- Read-only preservation checks を整理する。
- Stop condition detection を整理する。
- B82-04 Runtime Spike Exit Criteria Design へ進む前に、観察対象と停止シグナルを固定する。

Out of scope:

- implementation
- tests
- runtime execution
- runtime enablement
- runtime connection
- route change
- fetch adapter change
- graph adapter change
- validation change
- projection change
- UI change
- source option change
- feature flag change
- `real_compare_readonly` enablement
- API execution
- DB / Supabase access
- adapter integration
- mutation
- execution control

Scope interpretation:

- Observation Matrix is a design artifact only.
- Observation Matrix does not execute or connect runtime behavior.
- Observation Matrix does not change ownership, feature flags, source options, route behavior, adapter behavior, validation, projection, or UI.
- Observation Matrix does not make `real_compare_readonly` live, selectable, or enabled.

## 2. Observation Matrix Purpose

Observation Matrix purpose:

- Runtime observation points
- Boundary preservation checks
- Ownership preservation checks
- Read-only preservation checks
- Stop condition detection

### Runtime Observation Points

Purpose:

- Identify what should be observed at each stage before any future spike or integration work is considered.
- Keep observations structured by stage.
- Keep observations limited to contract, metadata, response shape, ownership, and read-only signals.

Expected posture:

- Observations are review signals only.
- Observations do not imply runtime readiness.
- Observations do not imply enablement readiness.

### Boundary Preservation Checks

Purpose:

- Confirm each stage remains inside its reviewed responsibility boundary.
- Prevent route, transport, validation, graph, presentation, or UI responsibilities from expanding.
- Detect any boundary crossing before a downstream stage is considered.

Expected posture:

- Route remains contract source only.
- Fetch Adapter remains transport-only.
- Validation remains validation owner.
- Graph Adapter remains normalization-only.
- Presentation remains display-candidate-only.
- UI remains read-only rendering review only.

### Ownership Preservation Checks

Purpose:

- Confirm each stage owns only its assigned responsibility.
- Detect responsibility leakage between stages.
- Prevent enablement authority from appearing in any stage.

Expected posture:

- Fetch Adapter does not decide validation.
- Validation does not build graph data.
- Graph Adapter does not decide fallback.
- Presentation does not wire UI.
- UI does not enable source behavior.

### Read-only Preservation Checks

Purpose:

- Confirm each stage remains observational, non-actionable, non-executable, and non-live.
- Confirm no mutation path is introduced.
- Confirm no workflow semantics are created.

Expected posture:

- Stage outputs remain review metadata.
- Stage outputs do not become commands or operator actions.
- Stage outputs do not enable `real_compare_readonly`.

### Stop Condition Detection

Purpose:

- Identify stop signals early.
- Stop before a downstream stage inherits unsafe assumptions.
- Preserve fail-closed behavior for unsafe or unknown signals.

Expected posture:

- Stop signals block continuation.
- Stop signals do not trigger repair, retry, approval, or execution workflows.
- Stop signals remain review findings only.

## 3. Observation Matrix

| Stage | Observation Target | Expected Signal | Stop Signal | Owner |
| --- | --- | --- | --- | --- |
| Route | GET-only contract, read-only response, response shape candidate | Contract remains read-only; response remains validation input candidate; no enablement implication | mutation route, unsupported method, unexpected execution path | Route Boundary |
| Fetch Adapter | transport-only behavior, payload forwarding, error propagation | Transport semantics preserved; unavailable / degraded state remains observable; no validation decision | validation decision leakage, mutation path, execution workflow | Fetch Boundary |
| Validation | shape validation, metadata validation, availability validation, fallback decision input | Unsafe shape fails closed; metadata caveats remain visible; fallback remains read-only metadata | unsupported shape, enum drift, metadata drift, source divergence | Validation Layer |
| Graph Adapter | normalization, shape stabilization, presentation input preparation | Graph mapping waits for validation-approved candidate; warnings and unavailable candidates remain visible | validation decision leakage, fallback decision leakage, mutation path | Graph Boundary |
| Presentation | disclosure candidate, badge candidate, inspector candidate, fallback explanation candidate | Display candidates remain explanatory, non-actionable, non-live, and non-executable | execution action, mutation action, repair workflow | Presentation Boundary |
| UI | read-only rendering, guarded state, disabled state, non-live state | UI remains display review only; guarded / disabled / non-live state remains visible; no source enablement | enablement action, execution button, approval workflow | UI Boundary |

Matrix interpretation:

- `Observation Target` identifies what the stage must make visible.
- `Expected Signal` identifies the safe review signal.
- `Stop Signal` identifies the condition that blocks continuation.
- `Owner` identifies the boundary responsible for preserving the signal.
- The matrix does not authorize runtime execution, adapter integration, UI wiring, source option enablement, feature flag enablement, or mutation.

## 4. Route Observation

Observation targets:

- GET-only contract
- read-only response
- response shape candidate

Expected signals:

- Route remains reviewed as a GET-only read-only contract.
- Route output remains candidate data for validation review only.
- Response shape categories remain visible and do not imply live graph readiness.

Stop signals:

- mutation route
- unsupported method
- unexpected execution path

Owner:

- Route Boundary

Boundary preservation:

- Route does not own validation, transport execution, graph normalization, presentation, UI wiring, source option behavior, feature flag behavior, or mutation.

Read-only preservation:

- Route observation remains contract inspection.
- Route observation does not invoke runtime behavior.
- Route observation does not authorize downstream connection.

## 5. Fetch Adapter Observation

Observation targets:

- transport-only behavior
- payload forwarding
- error propagation

Expected signals:

- Fetch Adapter remains transport-only.
- Payload semantics remain forwarded as data, not interpreted as validation outcome.
- Error, unavailable, degraded, and diagnostic states remain observable.

Stop signals:

- validation decision leakage
- mutation path
- execution workflow

Owner:

- Fetch Boundary

Boundary preservation:

- Fetch Adapter does not own validation decision, fallback decision, graph normalization, presentation generation, UI rendering, source option behavior, feature flag behavior, or mutation.

Read-only preservation:

- Fetch Adapter observation remains transport inspection.
- Fetch Adapter observation does not execute transport behavior.
- Fetch Adapter observation does not connect output to validation.

## 6. Validation Observation

Observation targets:

- shape validation
- metadata validation
- availability validation
- fallback decision input

Expected signals:

- Validation owns shape, metadata, classification, availability, and fallback decision input.
- Unsupported or unsafe shape fails closed before graph normalization.
- Metadata drift, enum drift, source divergence, unavailable state, and caveats remain visible.
- Fallback decision remains read-only metadata.

Stop signals:

- unsupported shape
- enum drift
- metadata drift
- source divergence

Owner:

- Validation Layer

Boundary preservation:

- Validation does not own graph normalization, presentation generation, UI rendering, source option behavior, feature flag behavior, or mutation.

Read-only preservation:

- Validation observation remains validation inspection.
- Validation observation does not connect runtime payloads.
- Validation observation does not enable `real_compare_readonly`.

## 7. Graph Adapter Observation

Observation targets:

- normalization
- shape stabilization
- presentation input preparation

Expected signals:

- Graph Adapter remains normalization-only.
- Graph mapping requires validation-approved candidate input in any future design.
- Shape stabilization preserves missing, incomplete, unsupported, warning, and unavailable signals.
- Presentation input remains display candidate data only.

Stop signals:

- validation decision leakage
- fallback decision leakage
- mutation path

Owner:

- Graph Boundary

Boundary preservation:

- Graph Adapter does not own fetch execution, route execution, validation decision, fallback decision, presentation rendering, UI wiring, source option behavior, feature flag behavior, or mutation.

Read-only preservation:

- Graph Adapter observation remains normalization inspection.
- Graph Adapter observation does not execute adapter integration.
- Graph Adapter observation does not convert warnings into workflow actions.

## 8. Presentation Observation

Observation targets:

- disclosure candidate
- badge candidate
- inspector candidate
- fallback explanation candidate

Expected signals:

- Disclosure remains explanatory text and read-only explanation.
- Badge remains compact status indication only.
- Inspector remains inspection metadata only.
- Fallback explanation remains guarded, unavailable, and read-only explanation only.
- Presentation candidates remain non-actionable and non-live.

Stop signals:

- execution action
- mutation action
- repair workflow

Owner:

- Presentation Boundary

Boundary preservation:

- Presentation does not own UI rendering, UI wiring, source option behavior, feature flag behavior, adapter integration, route execution, transport execution, DB / Supabase access, or mutation.

Read-only preservation:

- Presentation observation remains display-candidate inspection.
- Presentation observation does not add components.
- Presentation observation does not create operator instructions or workflow prompts.

## 9. UI Observation

Observation targets:

- read-only rendering
- guarded state
- disabled state
- non-live state

Expected signals:

- UI remains a future read-only display review surface only.
- Guarded state remains visible.
- Disabled state remains visible.
- Non-live state remains visible.
- No source enablement or action controls are introduced.

Stop signals:

- enablement action
- execution button
- approval workflow

Owner:

- UI Boundary

Boundary preservation:

- UI does not own route execution, transport execution, validation, graph normalization, presentation metadata generation, source option enablement, feature flag enablement, or mutation.

Read-only preservation:

- UI observation remains rendering inspection.
- UI observation does not wire graph section behavior.
- UI observation does not enable `real_compare_readonly`.

## 10. Safety Requirements

Safety requirements remain:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isEnabled = false
isGuarded = true
isLiveData = false
```

Safety interpretation:

- Feature flags remain disabled.
- `real_compare_readonly` remains guarded, disabled, and non-live.
- UI wiring remains absent.
- Source option integration remains absent.
- Observation matrix completion does not authorize implementation.
- Observation matrix completion does not authorize runtime execution.
- Observation matrix completion does not authorize runtime enablement.
- Observation matrix completion does not authorize adapter integration, UI wiring, DB / Supabase access, or mutation.

## 11. Matrix Exit Criteria

Matrix exit criteria:

- observation matrix documented
- stop signals documented
- ownership owners documented
- runtime execution not required
- runtime enablement not required

Exit interpretation:

- The matrix is complete when each stage has an observation target, expected signal, stop signal, and owner.
- The matrix is complete when each stop signal blocks continuation without triggering execution.
- The matrix is complete when safety requirements remain unchanged.
- Completion means design readiness only, not implementation readiness or enablement readiness.

## 12. Recommended Next Phase

Recommended next phase:

```text
B82-04 Runtime Spike Exit Criteria Design
```

B82-04 should remain design-only and should define the exit criteria before any spike implementation.

Recommended B82-04 contents:

- spike exit criteria
- stage-specific pass conditions
- stage-specific stop conditions
- evidence requirements
- safety gate mapping

Required B82-04 posture:

- No implementation.
- No tests.
- No runtime execution.
- No adapter integration.
- No UI wiring.
- No feature flag enablement.
- No source option enablement.
- No mutation.

## 13. Non-goals

Non-goals:

- implementation
- tests
- runtime execution
- adapter integration
- UI wiring
- feature flag enablement
- mutation

Additional non-goals:

- No route change.
- No fetch adapter change.
- No graph adapter change.
- No validation change.
- No projection change.
- No source option change.
- No UI change.
- No `real_compare_readonly` enablement.
- No DB / Supabase access.
- No live data behavior.
- No correction / repair / rebuild / replay / sync / auto-fix workflow.
- No approval workflow.
- No execution workflow.

