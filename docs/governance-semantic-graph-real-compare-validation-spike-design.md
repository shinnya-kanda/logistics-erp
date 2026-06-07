# Governance Semantic Graph Real Compare Validation Spike Design

Phase B77-50 documentation.

このドキュメントは、B77-49 admin-only compare source implementation により `real_compare_readonly` の visible condition が hidden flag + static admin guard になったことを前提に、将来の real compare connection 前に必要な validation spike design を整理する documentation-only phase である。

B77-50 では実データ接続、fetch implementation、API invocation、route change、DB / Supabase access、auth implementation、role implementation、mutation、POST、correction / repair / rebuild / replay / sync / auto-fix、workflow approval、execution control は行わない。

## 1. Scope

B77-50 is validation spike design only.

Scope:

- `real_compare_readonly` を有効化する前の validation spike design を整理する。
- `compare-readonly route -> fetch adapter -> inventory adapter -> graph adapter -> graph UI` の read-only pipeline boundary を固定する。
- route contract、response shape、metadata completeness、enum drift、unsupported shape、unavailable response、source divergence、graph adapter normalization、UI guarded fallback の validation gate を定義する。
- B77-43 の contract validation fixtures を validation gate に対応付ける。
- B77-49 の guarded / disabled / admin-only / hidden source structure を維持する前提を明文化する。

Out of this phase:

- 実装しない。
- 接続しない。
- 取得しない。
- API を呼ばない。
- route を変更しない。
- UI behavior を変更しない。
- `real_compare_readonly` を有効化しない。

Current source guard state to preserve:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
real_compare_readonly.isGuarded = true
real_compare_readonly.isEnabled = false
real_compare_readonly.isLiveData = false
```

## 2. Pipeline Boundary

Future validation spike pipeline:

```text
compare-readonly route
↓
fetch adapter
↓
inventory adapter
↓
graph adapter
↓
graph UI
```

This pipeline is a read-only interpretation pipeline, not an execution pipeline. Arrows indicate data interpretation order only. They do not indicate correction, approval, repair, rebuild, replay, sync, auto-fix, or workflow execution.

### compare-readonly route

Receives:

- Future GET request scope for inventory integrity comparison.
- Warehouse / source scope already guarded by the route layer.
- Read-only compare intent only.

Returns:

- `GET` response with `method: "GET"`.
- Truth source and compare target metadata such as `truthSource: "inventory_transactions"` and `cacheCompareTarget: "inventory_current"`.
- Top-level compare metadata and mapped response metadata.
- `normalizedData`, status semantics, semantic boundary, and execution boundary.

Must not:

- Expose POST behavior.
- Mutate inventory data.
- Write to `inventory_current` or `inventory_transactions`.
- Start correction, repair, rebuild, replay, sync, approval, or auto-fix workflows.
- Change route contract as part of B77-50.

Failure handling:

- Return unavailable / guarded / safe response semantics.
- Preserve GET-only and read-only boundary.
- Do not hide source failure behind mock graph data.
- Future validation should treat unavailable route response as validation input, not an instruction to retry.

### fetch adapter

Receives:

- Future read-only transport result from the `compare-readonly` route.
- Response status and fetch-result metadata.
- Compare metadata carried as transport-safe payload semantics.

Returns:

- Raw projection payload metadata.
- Read-only source semantics, response status, governance metadata, compare metadata, and source provenance.
- Transport interpretation result for downstream normalization.

Must not:

- Implement network access in B77-50.
- Call route from the graph adapter or Graph UI.
- Create a Supabase client.
- Read or write DB state.
- Mutate source data.
- Start workflow execution.

Failure handling:

- Preserve transport failure as read-only unavailable metadata.
- Do not convert transport failure into mock success.
- Future spike should verify whether transport failure maps to `fallback_unavailable` with visible warning caveats.

### inventory adapter

Receives:

- Raw / static / response-like read-only source data.
- Projection metadata and normalized payload semantics.
- Compare projections, evidence projections, source mappings, and lifecycle metadata.

Returns:

- Normalized read-only inventory integrity data.
- Preserved compare projection metadata where available.
- Data suitable for graph adapter input selection.

Must not:

- Fetch.
- Invoke endpoint.
- Query DB.
- Mutate inventory state.
- Rebuild inventory.
- Replay transactions.
- Approve, correct, repair, or sync data.

Failure handling:

- Preserve unsupported / missing / incomplete metadata as read-only caveats.
- Avoid assertion-only normalization from unknown shapes.
- Future validation should ensure unsafe normalization does not produce a healthy graph.

### graph adapter

Receives:

- Unknown compare-like response or normalized read-only projection candidate.
- Metadata candidates such as `metadata`, `responseMetadata`, `rawPayloadMetadata`, or a future dedicated graph input wrapper.
- Static contract validation fixtures before any real source is connected.

Returns:

- `InventoryIntegrityGraphData`.
- Typed adapter warnings.
- Unavailable graph data when projection cannot be trusted.

Must not:

- Fetch.
- Call route.
- Read DB.
- Create Supabase client.
- Mutate source data.
- Own React state.
- Render UI.
- Produce command payloads.

Failure handling:

- Use `createUnavailableGraphData()` for unsafe source states.
- Emit warning caveats such as missing metadata, unsupported shape, incomplete fixture, normalized non-string metadata, fallback used, graph unavailable, or adapter unavailable.
- Never silently fallback from real source failure to mock graph data.

### graph UI

Receives:

- `InventoryIntegrityGraphData`.
- Source option metadata and trust-level disclosure.
- Adapter warning caveats.
- Local view state only.

Returns:

- Read-only visual projection.
- Summary, node, edge, relation chip, legend, warning, and Inspector display.
- No business state transition.

Must not:

- Fetch.
- Call API.
- Query DB.
- Use Supabase.
- Mutate inventory data.
- Add retry, repair, rebuild, replay, sync, approve, correction, or auto-fix controls.
- Treat source selection as workflow state.

Failure handling:

- Display `fallback_unavailable` as unavailable, not healthy.
- Display warning / disclosure as read-only caveats.
- Keep `No Execution Controls / 実行操作なし` and `No Execution Route / 実行経路ではありません` visible.
- Do not ask operators to execute recovery actions.

## 3. Validation Gates

`real_compare_readonly` must not be enabled until the following gates are reviewed.

| Gate | Purpose | Required evidence | Fail behavior |
| --- | --- | --- | --- |
| Route contract validation | Confirm route response remains GET-only and preserves read-only metadata | `method: "GET"`, truth source, cache compare target, semantic boundary, execution boundary | Keep source hidden / guarded |
| Response shape validation | Confirm supported envelopes are read safely | full response, nested metadata, mapped metadata, raw payload metadata candidates | Use `fallback_unavailable` for unsafe shape |
| Metadata completeness validation | Confirm required graph semantics are present or safely unavailable | severity, risk, evidence, confidence, freshness, truth quality, stability, lifecycle metadata | Warn and fallback when projection would overstate confidence |
| Enum drift validation | Confirm unknown values do not understate risk | drifted enum values, warning mapping, severity mapping review | Treat as caveat or unavailable |
| Unsupported shape validation | Confirm arrays, primitives, nulls, and unexpected envelopes fail closed | unsupported fixture output and warnings | `fallback_unavailable` |
| Unavailable response validation | Confirm route unavailable semantics display as unavailable | unavailable fixture, blocked confidence, unavailable freshness / evidence | Unavailable display with no action controls |
| Source divergence validation | Confirm top-level compare metadata and nested metadata precedence is explicit | source divergence fixture and selected metadata source policy | Do not enable real source until precedence is fixed |
| Graph adapter normalization validation | Confirm object metadata normalization is visible and does not hide rich caveats | normalized non-string metadata warnings and representative values | Warning caveat or unavailable graph |
| UI guarded fallback validation | Confirm Graph UI shows guarded / unavailable state without actions | disabled source, warnings, badges, Inspector, unavailable panel | Keep disabled / guarded |

Validation principles:

- Validation evidence can use static fixtures first.
- Validation does not require live route invocation in B77-50.
- Passing one gate does not bypass hidden flag, admin guard, validation gate, read-only contract guard, or fallback guard.
- A passing fixture result is not production readiness.

## 4. Fixture Coverage Mapping

B77-43 fixtures should be mapped to validation gates before any real source is connected.

| Fixture | Primary gate | Secondary gate | Expected validation meaning |
| --- | --- | --- | --- |
| `fullMetadataCompareResponseFixture` | route contract validation | graph adapter normalization validation | Full metadata can be projected without losing read-only boundary. |
| `missingMetadataCompareResponseFixture` | metadata completeness validation | UI guarded fallback validation | Missing metadata fails closed with warnings and unavailable graph. |
| `nestedMetadataCompareResponseFixture` | response shape validation | graph adapter normalization validation | Nested rich metadata can be read or warned without assertion-only mapping. |
| `partialLifecycleCompareResponseFixture` | metadata completeness validation | graph adapter normalization validation | Partial lifecycle data does not overstate survivability / sustainability / maintainability / evolvability. |
| `unsupportedShapeCompareResponseFixture` | unsupported shape validation | UI guarded fallback validation | Unsupported shape produces safe unavailable graph, not healthy graph. |
| `driftedKeyCompareResponseFixture` | response shape validation | enum drift validation | Renamed / drifted keys are either mapped intentionally or surfaced as caveats. |
| `unavailableCompareResponseFixture` | unavailable response validation | UI guarded fallback validation | Unavailable route-like response remains visibly unavailable and read-only. |
| `sourceDivergenceCompareResponseFixture` | source divergence validation | route contract validation | Top-level vs nested metadata divergence must not be silently resolved without policy. |
| `enumDriftCompareResponseFixture` | enum drift validation | graph adapter normalization validation | Unknown enum values must not reduce visible severity or confidence caveats. |

Coverage expectations:

- Every fixture should document expected graph state, warning state, and fallback behavior.
- Fixture validation should record whether the result is safe partial projection or forced unavailable projection.
- Fixture validation should not fetch real data.
- Fixture validation should not change route, adapter, or UI behavior in B77-50.

## 5. Guarded Rollout Conditions

B77-50 keeps `real_compare_readonly` locked down.

Required current conditions:

```text
ENABLE_REAL_COMPARE_READONLY_GRAPH_SOURCE = false
ENABLE_ADMIN_ONLY_COMPARE_GRAPH_SOURCE = false
isGuarded = true
isEnabled = false
isLiveData = false
```

Future visible candidate conditions:

```text
hidden flag enabled
AND
static admin guard enabled or future approved admin guard passed
AND
validation gates passed
AND
read-only contract guard passed
AND
fallback guard confirmed
```

Even after future visibility:

- Source remains read-only.
- Source selection remains display-only.
- `GET` only remains mandatory.
- No correction / repair / rebuild / replay / sync / auto-fix controls are added.
- Real source failure does not silently fall back to mock data.

Stop conditions:

- Hidden flag is false.
- Admin guard is false.
- Any validation gate fails.
- Contract source precedence is ambiguous.
- Enum drift may understate risk.
- UI wording implies execution or remediation.
- Any mutation / POST / workflow path appears.

## 6. Failure / Unavailable Policy

Validation failed means safe unavailability.

Failure policy:

- Validation failed -> `fallback_unavailable`.
- Missing metadata -> warning caveat or unavailable graph.
- Unsupported shape -> unavailable graph.
- Source divergence without precedence policy -> unavailable graph.
- Enum drift that may understate risk -> unavailable graph or explicit warning caveat.
- Transport / source unavailable in a future phase -> unavailable graph.

Strict prohibitions:

- Do not auto-recover.
- Do not auto-correct.
- Do not repair, rebuild, replay, sync, or auto-fix.
- Do not add UI action buttons.
- Do not show retry / repair / rebuild / sync / approve controls.
- Do not prompt operators to execute recovery actions.
- Do not hide validation failure by switching to mock data.

Warning / disclosure policy:

- Warnings are read-only caveats.
- Disclosures explain source trust, guarded state, and fallback reason.
- Inspector details are explanations, not instructions.
- Relation edges are semantic relations, not execution routes.

Required wording:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `GET Only / GET のみ`
- `No Mutation / データ変更なし`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`
- `Graph Unavailable / グラフ利用不可`
- `Safety Fallback Active / 安全側フォールバック中`

## 7. Non-goals

B77-50 does not include:

- No API fetch.
- No DB access.
- No Supabase client.
- No mutation.
- No route implementation.
- No route change.
- No auth implementation.
- No role implementation.
- No execution workflow.
- No workflow approval.
- No correction.
- No rebuild.
- No repair.
- No replay.
- No sync.
- No auto-fix.
- No retry / repair / rebuild / sync / approve button.
- No real compare integration.
- No production enablement.
- No package install.

変更禁止:

- `StaticGraphPrototype.tsx`
- `inventoryIntegrityGraphAdapter.ts`
- `inventoryIntegrityGraphAdapterTypes.ts`
- `inventoryIntegrityGraphAdapterFixtures.ts`
- `inventoryIntegrityGraphTypes.ts`
- `inventoryIntegrityGraphMockData.ts`
- `inventoryIntegrityFetchAdapter.ts`
- `api/inventory-integrity/compare-readonly/route.ts`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- Edge Functions
- DB schema
- `services/api`

## 8. Next Phase Candidate

Recommended next phase: B77-51 Real Compare Validation Gate Type Design.

Rationale:

- Before wiring additional validation fixtures into UI or source modes, define typed validation gate results.
- A typed gate result can separate `passed`, `failed`, `blocked`, `warning_only`, and `unavailable_required`.
- It can also preserve gate name, fixture source, warning codes, read-only disclosure, and fallback decision without introducing fetch or live data.

Alternative candidate: B77-51 Real Compare Validation Fixture Wiring.

Rationale:

- If the team wants UI-level confirmation first, static fixtures can be wired into existing `compare_fixture` inspection paths.
- This must remain fixture-only, read-only, and action-free.
- It must not change `real_compare_readonly` visibility or enablement.

Recommended order:

1. B77-51 Real Compare Validation Gate Type Design.
2. B77-52 Real Compare Validation Fixture Wiring.
3. B77-53 Guarded Read-only Fetch Design.
4. B77-54 Guarded Read-only Fetch Implementation, only after all prior gates pass.

This document is a validation spike design gate. It does not implement, expose, invoke, fetch, authorize, mutate, or enable `real_compare_readonly`.
