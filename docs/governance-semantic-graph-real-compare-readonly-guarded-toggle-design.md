# Governance Semantic Graph Real Compare Readonly Guarded Toggle Design

Phase B77-45 documentation.

このドキュメントは、B77-44 read-only compare integration spike で `compare_fixture` を Graph UI 上で確認できる状態にしたことを前提に、将来 `real_compare_readonly` を安全に解放するための guarded toggle design を整理する documentation-only phase である。

今回は設計のみである。fetch implementation、route change、API integration、UI implementation、Supabase integration、DB query、mutation、POST、execution workflow は行わない。

## 1. Design Purpose

B77-45 の目的は、`real_compare_readonly` source mode を将来有効化する場合の条件、境界、露出方法、失敗時挙動を先に固定することである。

Design purpose:

- `real_compare_readonly` source mode の設計を明確にする。
- accidental enablement を防止する。
- `compare-readonly` の `GET` only / read-only boundary を維持する。
- feature gate / environment gate / admin gate / validation gate の役割を定義する。
- rollout strategy を段階化し、production default が意図せず real source に切り替わらないようにする。
- failure 時に mock data へ silent fallback せず、`createUnavailableGraphData()` と `fallback_unavailable` で安全に表示する。

この design は implementation permission ではない。`real_compare_readonly` を active source mode として追加する許可、fetch を実装する許可、route を変更する許可、UI を変更する許可、本番解放する許可を含まない。

## 2. Current State Review

Current source modes:

```text
mock
adapter_fixture
compare_fixture
fallback_unavailable

real_compare_readonly:
未実装 / not implemented
```

Current state:

- `mock`
  - Static mock graph data を表示する mode。
  - UI layout、readability、keyboard / screen reader 表示確認用であり、real compare data ではない。
- `adapter_fixture`
  - `sampleInventoryIntegrityCompareResponseFixture` を graph adapter に渡す adapter verification mode。
  - `Compare Response Fixture -> extractGraphFixtureMetadata -> buildInventoryIntegrityGraphData -> InventoryIntegrityGraphData -> Graph UI Rendering` を表示できる。
- `compare_fixture`
  - B77-43 の contract validation fixtures を Graph UI で選択し、adapter projection / fallback / warning visibility を確認する mode。
  - full metadata、missing metadata、nested metadata、partial lifecycle、unsupported shape、drifted key、unavailable response、source divergence、enum drift を確認できる。
- `fallback_unavailable`
  - `createUnavailableGraphData()` による safety fallback mode。
  - graph unavailable / not live compare data / no execution action を明示する。
- `real_compare_readonly`
  - future candidate only。
  - type / option / UI active source としてはまだ実装されていない。
  - hidden flag、admin-only、limited rollout、general availability のいずれにも未解放である。

Current architecture conclusion:

- Fixture-based projection と fallback visibility は前段階として成立している。
- Contract review、adapter coverage expansion、validation fixtures、compare fixture UI spike は完了している。
- ただし real source の transport boundary、feature gate、admin visibility、production rollout policy は未実装である。
- `real_compare_readonly` は B77-45 時点では設計対象であり、解放対象ではない。

## 3. Proposed Future Source Mode

Future candidate:

```text
real_compare_readonly
```

Definition:

```text
compare-readonly endpoint
↓
fetch adapter
↓
inventory adapter
↓
graph adapter
↓
InventoryIntegrityGraphData
↓
Graph UI
```

Layer responsibilities:

- `compare-readonly endpoint`
  - `GET` only の read-only compare source。
  - `inventory_transactions` を truth source、`inventory_current` を cache compare target として扱う。
  - correction、rebuild、sync、approval、remediation、execution workflow を開始しない。
- fetch adapter
  - future transport result を read-only payload semantics に変換する boundary。
  - Graph UI に直接接続せず、network / route invocation の責務を graph adapter に持ち込まない。
- inventory adapter
  - raw / static / response-like data を normalized read-only projection として扱う boundary。
  - mutation、DB write、workflow transition を持たない。
- graph adapter
  - unknown compare-like response を guard し、metadata を summary / node / edge / graph metadata に投影する pure projection boundary。
  - unsupported / missing / ambiguous response は warnings と unavailable fallback に倒す。
- `InventoryIntegrityGraphData`
  - rendering input。
  - command payload、workflow state、approval request、repair request ではない。
- Graph UI
  - read-only observability display。
  - source disclosure、warning visibility、fallback visibility、no execution controls を表示する。

The proposed flow is a read-only projection chain, not an execution chain. Arrows indicate interpretation order only.

## 4. Guard Strategy

`real_compare_readonly` は単一 guard ではなく、多層 guard で解放する。

| Guard | Purpose | Strength | Risk | Recommendation |
| --- | --- | --- | --- | --- |
| compile-time guard | active source union / option に含めるかを code level で制御する | accidental runtime exposure を防ぎやすい | 切替に code change が必要 | early phase では最強 guard として維持 |
| feature flag guard | source mode の利用可否を明示 flag で制御する | staged rollout しやすい | flag 設定ミスで露出する | hidden flag phase 以降で採用候補 |
| environment guard | development / staging / production で default を分ける | production default を保守的にできる | environment 設定 drift が起きる | production は explicit allow-list のみ |
| admin-only guard | 限定ユーザーだけに表示する | production-like 確認が可能 | admin UI が実行操作に見える可能性 | display-only wording と併用 |
| rollout guard | hidden -> admin-only -> limited -> GA の段階解放 | release blast radius を制御できる | phase 境界が曖昧だと拡大しやすい | phase gate checklist と併用 |
| validation guard | contract / adapter / fallback / warning checks が通った場合のみ表示 | data correctness risk を下げる | validation が古くなる可能性 | every rollout phase の必須条件 |

Recommended guard composition:

```text
compile-time guard
↓
feature flag guard
↓
environment allow-list
↓
admin-only or limited cohort guard
↓
validation guard
↓
real_compare_readonly display
```

Guard principles:

- `real_compare_readonly` は explicit enablement なしに active option へ入れない。
- production default は gate 完了まで `mock`、`adapter_fixture`、`compare_fixture`、または `fallback_unavailable` に留める。
- query parameter だけで production の real source を有効化しない。
- real source failure は mock へ silent fallback しない。
- guard failure は unavailable / disabled / conservative source として見せる。
- guard は workflow permission ではない。source visibility の制御に限定する。

## 5. Enablement Prerequisites

`real_compare_readonly` を将来有効化する前に、次の prerequisites を満たす必要がある。

Required prerequisites:

1. Compare response contract review complete.
   - `compare-readonly` response envelope、metadata placement、top-level metadata vs nested `metadata` の source selection が documented である。
   - `GET` only が維持されている。
2. Adapter coverage review complete.
   - B77-42 で追加した ownership、actionability、operator、audit、explainability、reasoning coherence、drift、resilience、recoverability、continuity metadata が projection / warning / intentional omission として整理済みである。
3. Validation fixtures complete.
   - full metadata、missing metadata、nested metadata、partial lifecycle、unsupported shape、drifted key、unavailable response、source divergence、enum drift の fixtures が維持されている。
4. Fallback validation complete.
   - missing metadata、unsupported shape、null response、adapter unavailable、source divergence の場合に `createUnavailableGraphData()` が safe fallback として成立する。
5. Warning visibility verified.
   - adapter warnings が compact badge / list / Inspector detail で visible である。
   - high-volume warnings の grouping / dedup / severity ordering 方針が決まっている。
6. Source disclosure verified.
   - `Read-only Compare Data`、`Live Read-only Source`、`Observability Projection`、`No Execution Controls` が表示方針として固定されている。
7. Guard configuration reviewed.
   - compile-time guard、feature flag、environment allow-list、admin-only guard、rollout cohort が documented である。
8. Build / type / lint passed.
   - changed files に対して TypeScript / lint / build checks が成功している。
9. No mutation confirmed.
   - no POST、no DB write、no Supabase mutation、no workflow execution が確認済みである。
10. No silent mock fallback confirmed.
   - real compare failure は `fallback_unavailable` または explicit unavailable display へ倒し、mock data に隠さない。

Prerequisite failure behavior:

- `real_compare_readonly` を active source として表示しない。
- implementation phase に進まない。
- unavailable / fixture / conservative source へ留める。
- missing prerequisite を documentation に戻して再レビューする。

## 6. Read-only Gate

`real_compare_readonly` が将来許可される場合でも、次の read-only gate は必須である。

Mandatory read-only gate:

- `GET` only
  - `compare-readonly` は GET endpoint として維持する。
  - Graph UI や graph adapter から POST / mutation route を呼ばない。
- Read Only
  - Graph data は visualization input であり、inventory data を変更しない。
  - source toggle は display source selection であり business state ではない。
- Observability Only
  - summaries、nodes、edges、warnings、Inspector は状態を読むための surface である。
  - correction、approval、rebuild、sync、repair、remediation の開始点にしない。
- No Mutation
  - `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を source mode enablement に含めない。
  - DB schema、migration、Edge Functions、services/api を変更しない。
- No Execution Workflow
  - retry、repair、sync、rebuild、approve、correct、assign、execute の controls を追加しない。
  - edge direction は semantic relation direction であり operation route ではない。

Gate wording:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `GET Only / GET のみ`
- `No Mutation / データ変更なし`
- `No Execution Workflow / 実行ワークフローなし`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`

## 7. Failure Strategy

Future failure flow:

```text
real_compare_readonly
↓
warning
↓
createUnavailableGraphData()
↓
fallback_unavailable
```

Failure triggers:

- feature flag disabled.
- environment not allowed.
- user is not in admin / rollout cohort.
- compare response unavailable.
- transport unavailable in a future phase.
- response is null / undefined.
- metadata missing.
- metadata source ambiguous.
- unsupported response shape.
- adapter warnings exceed safe projection threshold.
- required graph summaries / nodes / edges cannot be projected safely.
- contract version mismatch.
- enum drift would understate risk.

Failure behavior:

- Show `fallback_unavailable`, not `mock`.
- Preserve warning codes as read-only caveats.
- Display `Graph Unavailable / グラフ利用不可`.
- Display `Safety Fallback Active / 安全側フォールバック中`.
- Display `Not Live Compare Data / 実比較データではありません` when fallback is used.
- Display `No Execution Action / 実行操作はありません`.
- Do not show retry / repair / sync / rebuild / approve controls.

Failure policy:

- unavailable is safer than overconfident partial graph.
- warning visibility is required; silent failure is not allowed.
- mock fallback is not allowed for real source failure.
- partial graph may be allowed only when validation guard confirms warnings are visible and risk is not understated.

## 8. Visibility Strategy

When `real_compare_readonly` is eventually visible, it must be disclosed as real read-only source data without implying execution authority.

Required wording:

- `Read-only Compare Data / 読み取り専用比較データ`
- `Live Read-only Source / ライブ読み取り専用ソース`
- `Observability Projection / 観測用投影`
- `GET Only / GET のみ`
- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `No Execution Controls / 実行操作なし`
- `No Execution Route / 実行経路ではありません`

Recommended placement:

- Graph Header
  - source mode、trust level、live read-only status、GET only、read-only boundary。
- Source Panel
  - `real_compare_readonly` label、feature gate status、environment scope、admin / rollout scope。
- Projection Path
  - `compare-readonly endpoint -> fetch adapter -> inventory adapter -> graph adapter -> InventoryIntegrityGraphData -> Graph UI`。
- Warning Panel
  - adapter / source warnings as caveats, not actions。
- Inspector
  - source provenance、contract caveat、warning detail、no execution meaning。
- Legend / Edge detail
  - semantic relation only、not operation route。

Trust level candidate:

```text
Real read-only source
```

Interpretation:

- It indicates data came from the read-only compare source.
- It does not guarantee business correctness.
- It does not grant approval, correction, repair, rebuild, sync, or workflow permission.

## 9. Rollout Strategy

Recommended rollout:

### Phase 1: Design Only

Scope:

- Documentation only.
- No source mode implementation.
- No fetch implementation.
- No route change.
- No UI change.

Exit criteria:

- Guard strategy documented.
- Enablement prerequisites documented.
- Read-only gate documented.
- Failure / visibility / rollout strategies documented.

### Phase 2: Hidden Flag

Scope:

- `real_compare_readonly` remains hidden by default.
- The mode can only be enabled by explicit internal configuration in a non-production or controlled environment.
- No public UI default change.

Exit criteria:

- hidden flag cannot enable mutation.
- disabled flag falls back to conservative source or unavailable display.
- build / lint / type checks pass.

### Phase 3: Admin-only

Scope:

- Admin / debug visibility only.
- Display-only source selection.
- Strong read-only badges and no execution controls.

Exit criteria:

- admin-only guard verified.
- non-admin users cannot see or select real source.
- warnings and fallback are visible.

### Phase 4: Limited Rollout

Scope:

- Limited cohort or environment allow-list.
- Production default remains conservative unless explicitly allowed.
- Monitoring is observational only; no automatic repair.

Exit criteria:

- source outage behavior verified.
- contract drift warnings reviewed.
- fallback does not hide real source failure.

### Phase 5: General Availability

Scope:

- `real_compare_readonly` may be available as a normal read-only source mode after all gates pass.
- It remains observability-only.
- Production default may be reconsidered only after operational review.

Exit criteria:

- read-only gate remains intact.
- no mutation / no execution workflow confirmed.
- warning overload policy remains usable.
- support / operations wording avoids action implication.

Rollout stop conditions:

- contract drift detected.
- adapter mismatch detected.
- warnings become too noisy to interpret.
- source outage is hidden by fallback.
- UI wording implies execution or remediation.
- any mutation / POST / workflow path appears.

## 10. Risks

Risks:

- contract drift
  - Real endpoint may change envelope, metadata placement, field names, enum values, or nesting.
- adapter mismatch
  - Graph adapter may read `metadata` when top-level compare metadata is the intended source, or may over-normalize rich metadata.
- source outage
  - Real compare source may be unavailable, slow, or partially unavailable.
- warning overload
  - Real responses may produce many missing / normalized / incomplete warnings.
- accidental execution perception
  - Users may interpret source toggle, edge direction, or operator guidance as an action route.
- accidental enablement
  - Environment or feature flag misconfiguration may expose real source before validation.
- silent mock fallback
  - Real source failure could be hidden if fallback returns mock data.
- partial graph overconfidence
  - Missing metadata may still render many nodes and appear healthy.
- admin-only leakage
  - Debug source selection could appear to non-admin or review users.
- production default drift
  - Defaults could shift from conservative source to real source without explicit release decision.

## 11. Mitigation

Mitigations:

- validation fixtures
  - Keep full metadata, missing metadata, nested metadata, partial lifecycle, unsupported shape, drifted key, unavailable response, source divergence, and enum drift fixtures.
  - Add fixtures whenever contract shape changes.
- fallback strategy
  - Use `createUnavailableGraphData()` for unsafe real source states.
  - Never silently fallback from real source to mock source.
- disclosure strategy
  - Keep source mode, trust level, live read-only source status, projection path, and caveat visible.
  - Use explicit `No Execution Controls` and `No Execution Route` wording.
- warning strategy
  - Keep typed warnings visible.
  - Group / dedup / severity-order warnings before limited rollout.
  - Treat warnings as caveats, not action prompts.
- guarded rollout
  - Use compile-time guard first, then hidden flag, admin-only, limited rollout, and GA.
  - Require explicit environment allow-list for production.
- contract strategy
  - Document metadata source precedence.
  - Preserve provenance and contract version where needed.
  - Avoid assertion-only mapping from unknown responses.
- access strategy
  - Admin-only means display-only inspection, not execution authority.
  - Non-admin default remains conservative until GA.

## 12. Recommendation

Design readiness: High.

- Prior phases have clarified read-only projection boundaries, source toggle semantics, fallback behavior, warning visibility, contract risks, and validation fixtures.
- B77-45 can define a clear guarded release path for `real_compare_readonly`.

Implementation readiness: Medium.

- Adapter coverage and contract validation fixtures are in place for a future spike.
- Actual source mode wiring, feature flag, environment gate, admin-only visibility, loading / unavailable transitions, and source provenance handling are still not implemented.

Production readiness: Low.

- Production should not enable `real_compare_readonly` until hidden flag, admin-only validation, limited rollout, fallback behavior, warning overload handling, and explicit release review pass.
- Conservative default should remain in place until real source behavior is verified.

Overall recommendation:

- Proceed to a future guarded implementation phase only after this design is accepted.
- Start with hidden flag implementation, not production exposure.
- Keep `real_compare_readonly` disabled by default.
- Keep `compare-readonly` GET-only and Graph UI observability-only.
- Fail closed to `fallback_unavailable`, not to `mock`.

## 13. Future Phases

Candidate future phases:

- B77-46 guarded toggle implementation
  - Add type / option scaffolding for `real_compare_readonly` behind explicit guard.
  - Keep default disabled.
  - No production enablement.
- B77-47 hidden flag integration
  - Add hidden feature flag / environment allow-list for non-public verification.
  - Confirm disabled behavior falls back safely.
- B77-48 admin-only compare source
  - Expose read-only source selection to admin / debug users only.
  - Keep display-only wording and no execution controls.
- B77-49 real compare validation spike
  - Validate real read-only response projection, warning visibility, fallback behavior, and contract drift handling.
  - No mutation, no route change, no workflow execution.
- Later release gate
  - Consider limited rollout only after B77-49 evidence is reviewed.
  - Consider general availability only after production readiness moves from Low to Medium / High.

## 14. Out of Scope

B77-45 is documentation only.

Out of scope:

- fetch implementation
- route change
- API integration
- UI implementation
- Graph source mode implementation
- feature flag implementation
- environment variable implementation
- query parameter implementation
- admin guard implementation
- Supabase integration
- DB query
- DB schema change
- migration
- Edge Function change
- services/api change
- package install
- mutation
- execution workflow
- approval workflow
- remediation workflow
- production enablement

変更禁止:

- `apps/admin-dashboard/src/app`
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

This document is a guarded toggle design gate. It does not implement, expose, invoke, or enable `real_compare_readonly`.
