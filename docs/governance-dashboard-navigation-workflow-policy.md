# Governance Dashboard Navigation and Workflow Policy（Phase B16-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の navigation workflow / review workflow / investigation workflow / audit workflow を整理する。

Phase B11 から B16-01 では、read-only recovery governance dashboard の information architecture、data contract、static mock、component boundary、state machine、rendering model、accessibility / usability、terminology / glossary、information density を整理した。そこでは、compare / observability / trace / recovery の役割を分けること、summary から detail / evidence / timeline へ段階的に辿ること、reference navigation は read-only interaction として扱うこと、execution affordance / execution wording / execution density を置かないことを明確にした。

Phase B16-02 では、それらの前提を navigation / workflow の観点で補強し、operator / reviewer / auditor が「どの順序で情報を見るか」「どこへ戻るか」「どの navigation が reference であり action ではないか」を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

navigation and workflow policy は、read-only governance dashboard 内外の移動と確認順序を整理するための方針である。

基本方針:

- navigation は investigation / review / audit のために使う
- workflow は read-only information flow として扱う
- compare / observability / trace / recovery の役割を混同しない
- incident -> operation -> evidence -> timeline を主要 drilldown とする
- cross-dashboard navigation は reference navigation とする
- back navigation は user の探索文脈を壊さない
- filter / search / sort / drilldown は local read-only interaction とする
- suggested next review は navigation hint であり execution instruction ではない
- execution workflow を置かない

---

## ■ Navigation and Workflow Policy の目的

この policy の目的は、dashboard の情報が多くても、user が安全に確認・調査・監査できる navigation path を持つことである。

答えたい問い:

- Compare / Observability / Trace / Recovery のどこから見始めるべきか
- diff / hotspot / incident / operation / evidence / timeline をどう辿るか
- incident triage はどの情報順で確認するか
- reviewer は何を確認し、どこまで drilldown するか
- auditor は evidence と timeline をどう追うか
- reference link は action ではないことが伝わるか
- back navigation で filter / selected item / context を保てるか
- execution workflow が navigation に混入していないか

---

## ■ Top-level Navigation Workflow

top-level navigation は、dashboard の目的ごとに分ける。

navigation:

| Navigation | 主な問い | Workflow 上の役割 |
| --- | --- | --- |
| Compare | どこに差異があるか | row-level diff の入口 |
| Observability | 運用品質はどう変化しているか | backlog / hotspot / trend の入口 |
| Trace | 何が起きたか | source history / request flow の入口 |
| Recovery | governance はどう進んでいるか | incident / operation / evidence / lifecycle の入口 |

方針:

- top-level navigation は dashboard の切り替えであり execution ではない
- Recovery から execution dashboard へ遷移しない
- Trace は lifecycle mutation ではなく history reference として扱う
- Compare / Observability から Recovery へは context link として扱う
- current dashboard と active filter を分かるようにする

---

## ■ Compare -> Observability -> Recovery Workflow

compare -> observability -> recovery は、現在差異から運用品質、governance 状態へ進む確認 workflow である。

基本 flow:

```text
Compare
  -> diff / severity / reason_code / review_required
Observability
  -> backlog / aging / hotspot / trend / health
Recovery
  -> incident / operation / approval / evidence / lifecycle
```

方針:

- Compare は recovery operation を直接作る場所ではない
- Observability は execution trigger ではなく priority context である
- Recovery は governance state を確認する場所であり execution しない
- Compare severity と Recovery risk を混同しない
- Observability health と incident resolution を混同しない

navigation 例:

```text
Compare row with critical quantity_diff
  -> Observability hotspot context
  -> Recovery incident candidate / related incident
  -> Incident detail
```

---

## ■ Incident Triage Workflow

incident triage workflow は、incident を優先度順に確認するための read-only workflow である。

確認順:

1. severity / risk
2. warehouse_code / affected warehouse list
3. cross-warehouse risk
4. owner / domain owner
5. related operation count
6. evidence completeness
7. latest activity / aging
8. related hotspot / trend

方針:

- triage は priority sorting / filtering として扱う
- triage から resolve incident action を出さない
- owner_missing / escalation_required は attention signal として表示する
- critical / cross-warehouse は triage list で埋もれないようにする
- recurring hotspot は incident の背景として表示する

drilldown:

```text
Incident List
  -> Incident Detail
     -> Related Operations
     -> Evidence Summary
     -> Incident Timeline
```

---

## ■ Review Workflow

review workflow は、operator / reviewer が状態と根拠を確認するための read-only workflow である。

対象:

- review_required diff
- pending approval operation
- evidence missing operation
- failed operation
- retry candidate
- escalation candidate

確認順:

1. reason / severity / risk
2. related incident
3. operation lifecycle
4. approval status
5. evidence completeness
6. dry-run / post-compare status
7. trace / timeline reference

方針:

- review は approval mutation ではない
- review workflow から approve / reject button を出さない
- failed operation は retry candidate として表示する
- suggested next review は text / badge / reference link とする
- review result を local UI state で operation_state に反映しない

---

## ■ Investigation Workflow

investigation workflow は、差異や incident の原因を辿るための read-only workflow である。

入口:

- Compare diff row
- Observability hotspot
- Recovery incident
- Failed operation
- Trace timeline search

確認順:

```text
Context
  -> Affected warehouse / scope
  -> Reason code / reason text
  -> Related operation
  -> Evidence package
  -> Timeline
  -> Trace reference
```

方針:

- investigation は source history / evidence / timeline を参照する
- investigation から correction / rebuild / replay を実行しない
- trace reference は business history の確認であり replay action ではない
- warehouse boundary を investigation context に常に含める
- partial / stale data は investigation limitation として表示する

---

## ■ Audit Workflow

audit workflow は、後から operation / incident の根拠と状態を説明するための read-only workflow である。

確認順:

1. incident_id / operation_id / evidence_package_id
2. warehouse_code / affected warehouse list
3. lifecycle state
4. approval status
5. evidence completeness
6. before / after summary
7. dry-run result
8. post-compare evidence
9. timeline / trace reference
10. generated_at / stale / partial limitation

方針:

- audit workflow は事実確認と根拠確認のために使う
- raw data を過剰表示せず、summary + reference として辿る
- evidence package は source of truth の代替ではない
- stale / partial data は audit limitation として明示する
- audit workflow から attach evidence / edit evidence action を出さない

---

## ■ Evidence Review Workflow

evidence review workflow は、operation に必要な evidence が揃っているかを確認するための read-only workflow である。

確認対象:

- compare summary
- before / after summary
- dry-run result
- approval evidence
- execution evidence
- post-compare evidence
- warehouse boundary evidence
- trace timeline reference

確認順:

```text
Operation Detail
  -> Evidence Summary
     -> Evidence Package
        -> Evidence Item Detail
        -> Trace / Timeline Reference
```

方針:

- evidence missing は upload action ではなく audit warning とする
- evidence available は operation correctness の保証ではない
- post-compare missing は completed operation で強調する
- warehouse boundary evidence missing は high / critical warning 候補とする
- evidence review から attach / edit / approve action を出さない

---

## ■ Timeline Investigation Workflow

timeline investigation workflow は、incident / operation / trace の時系列関係を確認するための read-only workflow である。

timeline 種別:

- incident timeline
- operation lifecycle timeline
- evidence timeline
- trace timeline reference

確認順:

1. timeline type
2. key event
3. timestamp
4. actor / source
5. state / status
6. related ID
7. missing event warning
8. trace reference

方針:

- operation lifecycle timeline と trace timeline を混同しない
- timeline event は read-only event として扱う
- missing event は audit warning として表示する
- timeline から lifecycle transition しない
- timeline から replay / correction / rebuild を実行しない

---

## ■ Cross-dashboard Navigation Policy

cross-dashboard navigation は、dashboard 間の context を参照するための read-only navigation である。

navigation 候補:

| From | To | 目的 |
| --- | --- | --- |
| Compare | Observability | diff の hotspot / trend context を見る |
| Compare | Recovery | related incident / incident candidate を見る |
| Observability | Recovery | recurring hotspot に紐づく governance を見る |
| Recovery | Compare | related diff / compare summary を見る |
| Recovery | Trace | operation / incident に関係する履歴を見る |
| Trace | Recovery | trace に関係する incident / operation context を見る |

方針:

- cross-dashboard navigation は reference link として扱う
- link 先の filter context を維持する将来余地を残す
- cross-dashboard navigation から execution しない
- dashboard 間で `warehouse_code` / `trace_id` / `request_id` / `parent_trace_id` の label を揃える
- link が action button に見えないようにする

---

## ■ Reference Navigation Semantics

reference navigation は、関連情報へ移動する read-only navigation である。

reference 対象:

- incident_id
- operation_id
- evidence_package_id
- trace_id
- request_id
- parent_trace_id
- warehouse_code
- compare summary
- observability snapshot
- timeline event

方針:

- reference link は data / context を見るための link である
- reference link は mutation を起動しない
- reference link の label は `Open reference` / `View related` / `Trace reference` などにする
- `Run` / `Execute` / `Retry` / `Approve` を reference wording に使わない
- external reference / future deep link は read-only として扱う

---

## ■ Back Navigation Semantics

back navigation は、user の探索文脈を保ったまま前の view に戻るための navigation である。

保持したい context:

- selected top-level dashboard
- selected tab
- active filter
- sort order
- search query
- selected incident / operation / evidence
- expansion state
- scroll position

方針:

- back は state mutation ではない
- back navigation で lifecycle / approval / evidence state を変えない
- back from reference は previous context に戻る
- browser back / in-app back の semantics を将来整理する
- critical / stale / partial warning は戻った後も見えるようにする

---

## ■ Read-only Workflow Ergonomics

read-only workflow ergonomics は、user が安全に調査・確認・監査できるように workflow を整える考え方である。

方針:

- workflow の入口を明確にする
- active context を常に表示する
- drilldown depth を深くしすぎない
- breadcrumb / context label の将来導入余地を残す
- reference link と action button を視覚的に分ける
- suggested next review は workflow hint として表示する
- workflow hint から execution affordance を出さない

ergonomics checklist:

- どこから来たか分かるか
- 何を見ているか分かるか
- 次に何を確認すべきか分かるか
- どこへ戻るか分かるか
- action に見える要素が混ざっていないか

---

## ■ Execution Workflow を置かない方針

read-only governance dashboard では、execution workflow を置かない。

置かない workflow:

- correction execution workflow
- rebuild execution workflow
- replay execution workflow
- approval mutation workflow
- retry workflow
- incident resolution workflow
- evidence attachment workflow
- automatic recovery workflow
- lifecycle transition workflow

置かない navigation / event:

- `Execute correction`
- `Run rebuild`
- `Replay now`
- `Approve`
- `Reject`
- `Retry`
- `Resolve incident`
- `Attach evidence`
- `Change lifecycle state`

理由:

- read-only governance dashboard は visibility / review / investigation / audit のための dashboard である
- execution workflow には approval boundary / lifecycle / evidence / post-compare / audit log が必要である
- navigation workflow に execution を混ぜると user が review と mutation を混同する
- source of truth protection / warehouse boundary / blast radius を navigation だけで保証できない
- execution は将来別の controlled execution workflow として設計する

代替 workflow:

- incident triage workflow
- review workflow
- investigation workflow
- evidence review workflow
- timeline investigation workflow
- audit workflow
- reference navigation workflow

---

## ■ 導入段階案

### Step 0: Navigation and Workflow Policy の明文化

本ドキュメントで navigation workflow / review workflow / investigation workflow / audit workflow を整理する。

この段階では実装しない。

### Step 1: Top-level Navigation Review

確認:

- Compare / Observability / Trace / Recovery の役割が分かれているか
- Recovery から execution しないことが明確か
- active dashboard / filter context が分かるか

### Step 2: Drilldown Workflow Review

確認:

- incident -> operation -> evidence -> timeline の flow が自然か
- drilldown が read-only interaction として扱われているか
- drilldown から execution affordance が出ていないか

### Step 3: Review / Investigation Workflow Review

確認:

- review は approval mutation と混同されていないか
- failed operation は retry candidate として表示されているか
- investigation から correction / rebuild / replay を実行していないか

### Step 4: Audit / Evidence Workflow Review

確認:

- audit に必要な ID / status / evidence / timeline が辿れるか
- evidence missing が upload action に見えないか
- stale / partial data が audit limitation として分かるか

### Step 5: Cross-dashboard Navigation Review

確認:

- reference link が action button に見えないか
- dashboard 間で label が揃っているか
- link 先でも execution affordance がないか

### Step 6: Back Navigation Review

確認:

- active filter / sort / search が戻った後も文脈として維持されるか
- selected item / expansion state の扱いが明確か
- back navigation が server state mutation と混同されていないか

### Step 7: No Execution Workflow Review

確認:

- correction / rebuild / replay workflow がないか
- approval / retry / resolve / attach workflow がないか
- lifecycle transition workflow がないか
- suggested next review が execution instruction に見えないか

---

## ■ 今回は実装しない判断

Phase B16-02 では、navigation and workflow policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- navigation UI 実装
- workflow UI 実装
- breadcrumb 実装
- deep link 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず navigation / workflow semantics を固定する必要がある
- information density / accessibility / terminology の方針に対して、確認順序と戻り方を追加する段階である
- review / investigation / audit workflow と execution workflow を明確に分離する必要がある
- execution workflow を置かない方針を明確にする必要がある

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/request-chain-parent-trace-design.md`
- `docs/historical-observability-snapshot-design.md`
- `docs/controlled-correction-policy.md`
- `docs/scoped-rebuild-policy.md`
- `docs/replay-isolation-policy.md`
- `docs/approval-boundary-policy.md`
- `docs/recovery-operation-lifecycle-policy.md`
- `docs/operation-evidence-audit-package-policy.md`
- `docs/recovery-incident-management-policy.md`
- `docs/read-only-recovery-dashboard-design.md`
- `docs/recovery-dashboard-information-architecture.md`
- `docs/recovery-data-contract-design.md`
- `docs/recovery-dashboard-static-mock-design.md`
- `docs/recovery-dashboard-component-boundary-design.md`
- `docs/governance-dashboard-state-machine-design.md`
- `docs/governance-dashboard-rendering-model-design.md`
- `docs/governance-dashboard-accessibility-usability-policy.md`
- `docs/governance-dashboard-terminology-glossary-policy.md`
- `docs/governance-dashboard-information-density-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard navigation and workflow policy は、read-only governance dashboard の探索・確認・監査の流れを整理するための設計方針である。

top-level navigation、compare -> observability -> recovery、incident triage、review、investigation、audit、evidence review、timeline investigation、cross-dashboard reference navigation、back navigation を整理し、execution workflow を置かないことで、visibility と mutation の境界を守る。
