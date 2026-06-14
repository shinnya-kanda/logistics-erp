# Governance Semantic Graph Real Compare Validation Integration Result Review

Phase B78-02 documentation.

このドキュメントは、B78-01 Real Compare Validation Integration Spike の結果 shape と fallback decision semantics を review する。目的は、9 fixture mappings から local / pure / read-only に得られる `fallbackDecision` の妥当性を整理し、B78-03 Real Compare Validation Route Contract Spike へ進む条件を明文化することである。

B78-02 は review / design only である。implementation change、test change、fixture mapping change、projection change、UI wiring、source option integration、feature flag change、real_compare_readonly enablement、fetch implementation、API invocation、route change、DB / Supabase access、adapter integration、graph adapter execution、fixture payload import、mutation、correction / repair / rebuild / replay / sync / auto-fix、execution control は行わない。

## 1. Scope

B78-02 is Integration Result Review only.

Scope:

- B78-01 の local fixture integration spike を前提にする。
- `runRealCompareValidationIntegrationSpike()` の output を review 対象にする。
- 9 fixture mappings の expected validation posture、blocking state、fallbackDecision を整理する。
- fallbackDecision が read-only review metadata であり、UI action、source option change、feature flag change、runtime execution ではないことを固定する。
- B78-03 Route Contract Spike へ進む条件を明文化する。

Out of scope:

- implementation change
- test change
- fixture mapping change
- projection change
- fetch implementation
- API invocation
- route implementation or route change
- DB / Supabase access
- adapter integration
- graph adapter execution
- fixture payload import
- UI wiring
- source option integration
- feature flag change
- mutation
- execution control

## 2. Review Target

Review target:

```text
runRealCompareValidationIntegrationSpike()
```

Output fields:

- `summary`
- `guardedAvailability`
- `disclosureMetadata`
- `inspectorMetadata`
- `fallbackDecision`

Review interpretation:

- `summary` is local fixture mapping validation summary.
- `guardedAvailability` is guarded / disabled / non-live availability metadata.
- `disclosureMetadata` is read-only disclosure projection metadata.
- `inspectorMetadata` is read-only inspector projection metadata.
- `fallbackDecision` is local review metadata only.
- None of these fields enable `real_compare_readonly`.
- None of these fields connect UI, source options, feature flags, fetch, route, DB / Supabase, or adapters.

## 3. Fixture Review Matrix

| Fixture | Expected validation posture | Expected blocking state | Expected fallbackDecision | Review note |
| --- | --- | --- | --- | --- |
| `fullMetadataCompareResponseFixture` | Complete read-only compare response shape. Route contract, response shape, metadata completeness, and graph adapter normalization are expected to pass. | Non-blocking. | `read_only_candidate` | Accept as local read-only candidate only. This does not enable `real_compare_readonly`, live data, source option visibility, or UI behavior. |
| `missingMetadataCompareResponseFixture` | Metadata is incomplete. Response shape may be warning-only, but metadata completeness fails. | Blocking. | `fallback_unavailable` | Correctly fails closed because missing graph metadata must not render as healthy graph readiness. |
| `nestedMetadataCompareResponseFixture` | Nested rich metadata is expected and may normalize with warnings while preserving caveats. | Non-blocking. | `read_only_candidate` | Accept as local read-only candidate with caveats. Nested metadata readiness remains fixture-mapping-only and does not imply production readiness. |
| `partialLifecycleCompareResponseFixture` | Partial lifecycle metadata is expected to remain visible as warning-only caveats. | Non-blocking. | `read_only_candidate` | Accept as local read-only candidate with warning posture. Partial lifecycle caveats must remain visible in future review. |
| `unsupportedShapeCompareResponseFixture` | Unsupported metadata shape blocks safe projection and response shape fails. | Blocking. | `fallback_unavailable` | Correctly falls closed. Unsupported shape must not be coerced into graph data. |
| `driftedKeyCompareResponseFixture` | Key drift makes expected metadata unreliable. Response shape and metadata completeness fail. | Blocking. | `fallback_unavailable` | Correctly blocks readiness until explicit key drift policy exists. |
| `unavailableCompareResponseFixture` | Unavailable response condition is explicitly blocked and lacks safe graph metadata. | Blocking. | `fallback_unavailable` | Correctly produces unavailable fallback semantics. This remains explanation only, not retry. |
| `sourceDivergenceCompareResponseFixture` | Source divergence requires explicit metadata precedence before readiness. Route contract and normalization are warning-only, but source divergence is blocked. | Blocking. | `fallback_unavailable` | Mapping currently treats divergence as a readiness blocker. Review accepts fallback unavailable until precedence policy is documented. |
| `enumDriftCompareResponseFixture` | Unknown enum values may understate risk. Enum drift is blocked and normalization fails. | Blocking. | `fallback_unavailable` | Correctly blocks readiness because enum drift must not reduce visible severity or confidence caveats. |

Matrix review summary:

- 3 fixtures are expected as `read_only_candidate`: full metadata, nested metadata, partial lifecycle.
- 6 fixtures are expected as `fallback_unavailable`: missing metadata, unsupported shape, drifted key, unavailable response, source divergence, enum drift.
- No fixture requires `guarded_fallback` under the current mapping because warning-only local candidates remain read-only candidates and blocking mappings fall unavailable.
- This distribution is acceptable for B78-02 because the review is local fixture mapping only.

## 4. Fallback Decision Review

### `read_only_candidate`

Meaning:

- Local fixture integration indicates read-only projection candidate semantics.
- The mapping is non-blocking.
- The summary is valid for read-only graph interpretation.
- Guarded availability is visible as metadata.

Important constraints:

- `read_only_candidate` is not enablement.
- `read_only_candidate` does not change `real_compare_readonly` visibility.
- `read_only_candidate` does not change feature flags.
- `read_only_candidate` does not wire UI.
- `read_only_candidate` does not fetch, call route, connect adapters, connect DB / Supabase, or mutate data.

### `guarded_fallback`

Meaning:

- Local fixture integration should remain guarded without unavailable response semantics.
- It represents hidden / admin guard / validation caution preservation.
- It is a possible future state for non-blocking but not-ready metadata.

Important constraints:

- `guarded_fallback` is not a UI action.
- `guarded_fallback` is not an approval workflow.
- `guarded_fallback` does not bypass hidden flag or admin guard.
- `guarded_fallback` does not enable source option visibility or live data.

Current B78-02 review:

- No current fixture maps to `guarded_fallback`.
- This is acceptable because the current B78-01 rule maps blocking states to `fallback_unavailable` and read-only valid states to `read_only_candidate`.
- Future route contract review may produce guarded fallback cases if a response is evaluated, non-blocking, but not valid for read-only graph interpretation.

### `fallback_unavailable`

Meaning:

- Local fixture integration indicates read-only unavailable explanation.
- The mapping has unavailable condition or blocking failure.
- Fallback is a safety display decision, not execution.

Important constraints:

- `fallback_unavailable` does not retry.
- `fallback_unavailable` does not repair, rebuild, correct, replay, sync, or auto-fix.
- `fallback_unavailable` does not call APIs or routes.
- `fallback_unavailable` does not render UI by itself.
- `fallback_unavailable` does not mutate data.

## 5. Safety Boundary

B78-02 preserves the safety boundary:

- No fetch.
- No API integration.
- No route change.
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

- Review can accept or question local fallback semantics.
- Review cannot change runtime behavior.
- Review cannot activate source visibility.
- Review cannot introduce execution controls.
- Review cannot make fixture mapping output production readiness.

## 6. Proceed Conditions to B78-03

B78-03 Real Compare Validation Route Contract Spike may proceed when the following conditions are accepted:

- Local fixture integration passes.
- `fallbackDecision` semantics are accepted.
- `read_only_candidate` remains non-enabling.
- `fallback_unavailable` policy remains read-only explanation only.
- `guarded_fallback` remains available as a future non-action guarded state.
- Route contract spike remains GET-only.
- Route contract spike remains no mutation.
- Route contract spike does not change route implementation.
- Route contract spike does not fetch real data unless a later explicit phase allows it.
- No UI wiring occurs before route contract review.
- No source option integration occurs before route contract review.
- No feature flag change occurs before route contract review.
- No adapter integration occurs before route contract review.

B78-03 should preserve:

- local contract shape review
- fixture / contract metadata review
- read-only validation semantics
- no execution workflow
- no mutation workflow
- no real_compare_readonly enablement

## 7. Non-goals

B78-02 does not include:

- No implementation change.
- No test change.
- No fixture mapping change.
- No projection change.
- No fetch / API.
- No DB / Supabase.
- No route change.
- No adapter integration.
- No graph adapter execution.
- No fixture payload import.
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
- `inventoryIntegrityGraphFeatureFlags.ts`
- `inventoryIntegrityGraphDataSourceOptions.ts`
- `inventoryIntegrityGraphDataSourceTypes.ts`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityGraphAdapterTypes.ts`
- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `inventoryIntegrityRealCompareValidationIntegrationSpike.ts`
- `inventoryIntegrityRealCompareValidationIntegrationSpike.test.ts`
- `inventoryIntegrityRealCompareValidationFixtureMapping.ts`
- `inventoryIntegrityRealCompareValidationFixtureEvaluator.ts`
- `inventoryIntegrityRealCompareValidationProjection.ts`
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

Next phase candidate:

```text
B78-03 Real Compare Validation Route Contract Spike
```

Recommendation:

- B78-03 should remain a read-only route contract review / local contract shape review phase.
- B78-03 should not connect UI or source options.
- B78-03 should not change feature flags.
- B78-03 should not enable `real_compare_readonly`.
- B78-03 should preserve GET-only and no-mutation constraints.
- B78-03 should review route contract shape before any runtime route invocation or adapter boundary work.

This document is an Integration Result Review gate. It does not implement code, change tests, modify fixture mappings, change projections, fetch, call API, change routes, connect DB / Supabase, connect adapters, wire UI, integrate source options, change flags, mutate, or enable `real_compare_readonly`.
