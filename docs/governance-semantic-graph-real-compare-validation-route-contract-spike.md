# Governance Semantic Graph Real Compare Validation Route Contract Spike

Phase B78-03 documentation.

このドキュメントは、B78-01 Real Compare Validation Integration Spike と B78-02 Integration Result Review を前提に、`compare-readonly` route の GET contract、response shape expectation、validation input boundary を整理する。

B78-03 は review / design only である。route implementation、route change、fetch implementation、API execution、route import execution、DB / Supabase access、adapter integration、graph adapter execution、fixture payload import、UI wiring、source option integration、feature flag change、real_compare_readonly enablement、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B78-03 is Route Contract Spike only.

Scope:

- `compare-readonly` route の契約境界を整理する。
- GET-only contract を review 対象にする。
- Route response shape が validation layer の input candidate になる境界を整理する。
- B78-04 Real Compare Fetch Adapter Boundary Design へ進む前に、route contract assumptions と fallback boundary を明文化する。

Out of scope:

- route implementation
- route change
- fetch implementation
- API execution
- route import execution
- DB / Supabase access
- adapter integration
- graph adapter execution
- fixture payload import
- UI wiring
- source option integration
- feature flag change
- mutation
- execution control

## 2. Contract Boundary

Contract boundary:

```text
compare-readonly route
↓
response payload
↓
validation layer
```

Boundary interpretation:

- `compare-readonly route` is the future read-only route contract source.
- `response payload` is a candidate shape for validation review.
- `validation layer` may inspect shape categories, metadata candidates, lifecycle candidates, classification candidates, and observability candidates.
- This is a contract review chain only.
- The chain does not invoke a route.
- The chain does not fetch data.
- The chain does not connect adapters.
- The chain does not render UI.

Out of boundary:

- DB
- Supabase
- mutation
- execution workflow
- correction workflow
- repair workflow
- rebuild workflow
- replay workflow
- sync workflow
- auto-fix workflow

## 3. Route Assumptions

Route assumptions:

- GET only.
- Read-only route.
- Non-mutating.
- Response is validation input candidate.
- Response is projection input candidate.
- Response is fallback decision candidate.

Route contract expectations:

- The route contract must preserve read-only semantics.
- The route contract must not expose POST behavior.
- The route contract must not write `inventory_current`.
- The route contract must not write `inventory_transactions`.
- The route contract must not perform correction, repair, rebuild, replay, sync, approval, or auto-fix.
- The route contract must keep unavailable responses observable as unavailable, not silently healthy.

Interpretation:

- A valid GET contract can be reviewed as validation evidence.
- A valid GET contract does not enable `real_compare_readonly`.
- A valid GET contract does not connect UI or source options.
- A valid GET contract does not authorize live graph rendering.

## 4. Expected Response Shape Categories

The route contract review should remain aligned with the B78-02 fixture review matrix.

### Full Metadata

Expectation:

- Complete read-only compare response metadata is present.
- Route contract, response shape, metadata completeness, and graph adapter normalization candidates are reviewable.

Validation meaning:

- May become `read_only_candidate` in local validation review.
- Still not enablement.

### Partial Metadata

Expectation:

- Metadata exists but is incomplete.
- Partial lifecycle or partial governance fields remain visible as caveats.

Validation meaning:

- May remain candidate only when non-blocking.
- Must preserve warning posture.

### Missing Metadata

Expectation:

- Required graph metadata candidate is absent.

Validation meaning:

- Should fail closed.
- Should lead to read-only unavailable explanation.

### Nested Metadata

Expectation:

- Rich nested object metadata may exist.
- Nested metadata must be interpreted carefully without losing caveats.

Validation meaning:

- May be reviewed as a read-only candidate with caveats.
- Must not be flattened into overconfident healthy state.

### Lifecycle Drift

Expectation:

- Lifecycle metadata may be partial, stale, or semantically inconsistent.

Validation meaning:

- Should remain visible as lifecycle caveat.
- Must not imply repair, rebuild, or sync instructions.

### Key Drift

Expectation:

- Expected metadata keys may be renamed, missing, or present under unsupported aliases.

Validation meaning:

- Should block readiness until explicit mapping policy exists.
- Must not be silently accepted as production-ready metadata.

### Enum Drift

Expectation:

- Known enum values may drift into unknown values.

Validation meaning:

- Should block readiness when drift could understate risk, confidence, severity, or fallback posture.
- Must not normalize unknown values into healthy state.

### Unavailable

Expectation:

- Route-like response may indicate unavailable source, unavailable scope, unavailable metadata, or unavailable projection.

Validation meaning:

- Should map to unavailable explanation.
- Must not create auto-retry, repair, rebuild, or sync behavior.

### Source Divergence

Expectation:

- Top-level metadata, response metadata, raw payload metadata, or nested metadata may disagree.

Validation meaning:

- Should block readiness until precedence policy is explicit.
- Must not silently choose a source when semantics conflict.

### Unsupported Shape

Expectation:

- Response shape may be null, primitive, array, or unsupported object.

Validation meaning:

- Should fail closed.
- Must not coerce unsupported shape into graph data.

## 5. Validation Input Boundary

Validation layer input candidates:

- metadata candidate
- lifecycle candidate
- classification candidate
- observability candidate

### Metadata Candidate

Validation may inspect:

- response metadata presence
- graph metadata presence
- source metadata presence
- governance metadata presence
- evidence / confidence / risk / severity metadata presence

Validation must not infer:

- execution permission
- source enablement
- mutation readiness
- UI action availability

### Lifecycle Candidate

Validation may inspect:

- projection freshness
- lifecycle coverage
- stability / survivability / maintainability / evolvability indicators
- unavailable lifecycle caveats

Validation must not infer:

- rebuild instruction
- repair instruction
- sync instruction
- operator workflow

### Classification Candidate

Validation may inspect:

- compare severity
- compare risk
- mismatch classification
- result visibility
- review readiness
- decision readiness

Validation must not infer:

- approval instruction
- correction instruction
- escalation workflow
- execution route

### Observability Candidate

Validation may inspect:

- explanation text
- reason metadata
- audit trail metadata
- provenance / trace semantics
- unavailable or guarded caveats

Validation must not infer:

- operator action
- auto-fix instruction
- mutation intent
- runtime command

Explicitly out of validation input boundary:

- repair instruction
- execution instruction
- mutation intent
- approval workflow
- role escalation workflow
- retry workflow
- route invocation control

## 6. Safety Boundary

B78-03 preserves the safety boundary:

- No fetch.
- No API execution.
- No route change.
- No route import execution.
- No DB / Supabase.
- No adapter integration.
- No graph adapter execution.
- No fixture payload import.
- No UI wiring.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.

Required guarded state remains:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
UI wiring = none
```

Safety interpretation:

- Route contract review can document expected response boundaries.
- Route contract review cannot invoke the route.
- Route contract review cannot connect validation to live route data.
- Route contract review cannot connect fetch adapter, graph adapter, UI, or source options.
- Route contract review cannot make a candidate production-ready.

## 7. Route Contract Review Outcome

Expected outcome:

- Validation layer can consume route payload shape as a future candidate.
- `fallbackDecision` remains read-only.
- `read_only_candidate` remains non-enabling.
- Route contract remains GET-only.
- Unavailable response remains unavailable explanation.
- Key drift, enum drift, source divergence, and unsupported shape remain guarded or unavailable review conditions.

Outcome interpretation:

- The route contract can become a future validation boundary.
- The route contract cannot become execution authority.
- The route contract cannot change feature flags.
- The route contract cannot change source option behavior.
- The route contract cannot make `real_compare_readonly` visible, enabled, or live.

## 8. Proceed Conditions

B78-04 Real Compare Fetch Adapter Boundary Design may proceed when:

- Route contract assumptions are documented.
- Validation boundary is documented.
- Fallback boundary is documented.
- GET-only contract is maintained.
- No mutation contract is maintained.
- No UI wiring has been added.
- No source option integration has been added.
- No feature flag change has been added.
- No adapter integration has been added.
- `read_only_candidate` remains non-enabling.
- `fallback_unavailable` remains read-only explanation.

B78-04 should preserve:

- design / review first
- no runtime connection
- no route invocation
- no DB / Supabase access
- no mutation
- no real_compare_readonly enablement

## 9. Non-goals

B78-03 does not include:

- No route implementation.
- No route change.
- No fetch.
- No API execution.
- No route import execution.
- No adapter execution.
- No graph adapter execution.
- No fixture payload import.
- No UI wiring.
- No source option integration.
- No feature flag change.
- No `real_compare_readonly` enablement.
- No mutation.
- No DB / Supabase.
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

## 10. Future Candidate

Next phase candidate:

```text
B78-04 Real Compare Fetch Adapter Boundary Design
```

Recommendation:

- Continue to prioritize Design / Review.
- Do not connect real data in B78-04.
- Do not fetch in B78-04 unless a later explicit scope changes the plan.
- Keep fetch adapter boundary separate from UI wiring and source option enablement.
- Preserve GET-only and no-mutation route contract assumptions.
- Preserve guarded, disabled, non-live `real_compare_readonly` behavior.

This document is a Route Contract Spike review gate. It does not implement routes, fetch, execute APIs, import and run routes, connect DB / Supabase, connect adapters, execute graph adapters, import fixture payloads, wire UI, integrate source options, change flags, mutate, or enable `real_compare_readonly`.
