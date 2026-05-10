# Governance Dashboard State Machine Design（Phase B14-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の UI state / lifecycle visualization / interaction state を state machine として整理する。

Phase B11 から B13 では、read-only recovery governance dashboard の design、information architecture、data contract、static mock、component boundary を整理した。そこでは、dashboard が correction / rebuild / replay / approval / retry / incident resolution を実行しないこと、UI state と server state を分けること、operation_state / approval_status / evidence_status を local mutation で変更しないことを明確にした。

Phase B14-01 では、それらを UI state machine として整理し、loading / empty / error、overview / incident / operation / lifecycle / approval / evidence / risk の visualization state、filter / search / drilldown interaction state、read-only interaction state を定義する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

governance dashboard state machine は、read-only dashboard がどの表示状態にあるかを説明するための設計である。

基本方針:

- state machine は visualization / interaction のためのものである
- execution interaction を持たない
- approval mutation interaction を持たない
- retry / correction / rebuild / replay mutation を持たない
- server data state と local UI state を分ける
- lifecycle visualization と lifecycle mutation を混同しない
- approval visualization と approval mutation を混同しない
- filter / search / drilldown は read-only interaction として扱う
- compare / observability / recovery の visualization state を分ける
- warehouse boundary / cross-warehouse risk を state 表示に含める

---

## ■ Governance Dashboard State Machine の目的

state machine の目的は、dashboard の UI がどの状態にあり、どの interaction を許可するかを明確にすることである。

答えたい問い:

- data loading 中か
- data は empty か
- error は recoverable か
- overview は stable / warning / critical のどれか
- incident list は normal / escalated / empty のどれか
- operation は requested / reviewing / dry_run / approved / scheduled / executing / completed / failed / cancelled のどれか
- approval は pending / approved / rejected / expired / not_required のどれか
- evidence は missing / partial / available / not_required のどれか
- user interaction は filter / search / drilldown か
- execution interaction が UI に混入していないか

state machine が防ぎたいこと:

- loading 中に mutation action を出す
- empty state から execution を促す
- failed operation を retry button として出す
- approved を completed として見せる
- dry_run completed を execution ready と見せる
- cross-warehouse risk から execution affordance を出す

---

## ■ State Machine 全体像

read-only governance dashboard の state は、大きく 3 系統に分ける。

```text
Data Fetch State
  -> idle
  -> loading
  -> loaded
  -> empty
  -> error

Visualization State
  -> overview
  -> incident
  -> operation
  -> lifecycle
  -> approval
  -> evidence
  -> timeline
  -> risk

Interaction State
  -> viewing
  -> filtering
  -> searching
  -> sorting
  -> drilling_down
  -> expanding
```

含めない state:

```text
executing_correction
executing_rebuild
executing_replay
approving
retrying
resolving_incident
attaching_evidence
```

方針:

- mutation state は本 dashboard の state machine に含めない
- future controlled execution flow を作る場合は別 state machine とする
- read-only dashboard は display / navigation / drilldown に限定する

---

## ■ Loading / Empty / Error State

### loading

loading は read-only data を取得中の状態である。

表示方針:

- skeleton / loading indicator を表示する
- `READ ONLY` banner は表示したままにする
- execution action は表示しない
- previous data を表示する場合は stale 表示を検討する

許可する interaction:

- navigation tab change
- cancel / retry fetch の将来検討

許可しない interaction:

- execution
- approval
- retry operation
- incident resolution

### empty

empty は表示対象の data がない状態である。

empty 種別:

- no incidents
- no operations
- no pending approvals
- no failed operations
- no evidence packages
- no timeline events
- no search results

表示方針:

- empty reason を明示する
- `No execution actions are available in this view.` を維持する
- empty を stable と誤認しないように、filter 条件も表示する

### error

error は read-only data の取得や変換に失敗した状態である。

表示候補:

- error code
- error message
- retry fetch suggestion
- affected contract
- generated_at / request_id があれば表示

方針:

- error から recovery execution を促さない
- data contract error と business incident を混同しない
- warehouse boundary error は high / critical warning 候補として表示する

---

## ■ Overview Visualization State

overview visualization は、recovery governance 全体の状態を summary として表示する。

state 候補:

- stable
- attention
- critical
- empty
- partial_data
- stale_data

判定候補:

| State | 例 |
| --- | --- |
| stable | high / critical incident なし、failed operation なし |
| attention | pending approval / evidence missing / retry candidate あり |
| critical | critical incident / cross-warehouse risk / failed high risk operation あり |
| empty | queue / incident / operation がない |
| partial_data | 一部 contract が欠落 |
| stale_data | generated_at が古い |

表示方針:

- overview card は drilldown 入口とする
- critical card から execution しない
- partial_data / stale_data は data quality warning として表示する

---

## ■ Incident Visualization State

incident visualization は、incident の状態と severity / escalation / ownership を表示する。

incident status 候補:

- open
- investigating
- mitigated
- resolved
- cancelled

visualization state 候補:

- no_incident
- has_open_incident
- has_high_incident
- has_critical_incident
- owner_missing
- escalation_required
- retrospective_required
- recurring_incident

表示方針:

- incident severity と operation risk_level を分ける
- operation completed を incident resolved と見せない
- owner_missing / escalation_required は attention badge とする
- recurring_incident は improvement candidate として表示する

許可する interaction:

- incident detail drilldown
- related operation drilldown
- related evidence drilldown
- compare / observability context link

許可しない interaction:

- resolve incident
- assign owner
- escalate mutation

---

## ■ Operation Visualization State

operation visualization は、operation の lifecycle / approval / evidence / risk を表示する。

operation_state:

- requested
- reviewing
- dry_run
- approved
- scheduled
- executing
- completed
- failed
- cancelled

visualization state 候補:

- waiting_review
- waiting_dry_run
- waiting_approval
- scheduled_readonly
- executing_readonly
- completed_with_post_compare
- completed_missing_post_compare
- failed_needs_review
- cancelled_readonly
- retry_candidate_readonly

表示方針:

- operation_state は server response の read-only value として表示する
- local UI state で operation_state を変更しない
- approved は completed ではない
- failed は retry button ではなく retry candidate badge として表示する
- executing は status 表示であり control UI ではない

---

## ■ Lifecycle Visualization State

lifecycle visualization は、operation がどの段階を経たかを示す。

state path 候補:

```text
requested -> reviewing -> dry_run -> approved -> scheduled -> executing -> completed
requested -> reviewing -> dry_run -> failed
requested -> reviewing -> cancelled
approved -> scheduled -> executing -> failed
```

表示方針:

- completed は post_compare_completed と合わせて表示する
- failed / cancelled は reason を表示する
- retry candidate は別 badge として表示する
- lifecycle step を click して mutation しない
- missing lifecycle event は audit warning として表示する候補にする

interaction:

- step detail expand
- related evidence link
- related trace link

non-interaction:

- state transition
- retry
- approve
- execute

---

## ■ Approval Visualization State

approval visualization は、execution approval の状態を表示する。

approval_status:

- not_required
- pending
- approved
- rejected
- expired

visualization state 候補:

- approval_not_required
- approval_pending
- approval_pending_aging
- approval_approved_not_executed
- approval_rejected
- approval_expired
- approval_missing_for_execution

表示方針:

- approval_status と operation_state を別 badge として表示する
- approved は executed を意味しない
- pending aging は attention / high risk signal とする
- approval_missing_for_execution は audit warning とする
- approve / reject button は置かない

---

## ■ Evidence Completeness Visualization State

evidence completeness は audit readiness を表示する。

evidence status:

- missing
- partial
- available
- not_required

visualization state 候補:

- evidence_available
- evidence_partial
- evidence_missing_required
- post_compare_missing
- warehouse_boundary_evidence_missing
- attachment_reference_only

表示方針:

- missing evidence は audit risk として表示する
- missing evidence から attachment upload へ進まない
- post_compare_missing は completed operation で強調する
- warehouse_boundary_evidence_missing は high / critical warning 候補とする
- raw data を過剰表示しない

---

## ■ Incident Escalation Visualization State

incident escalation は、より強い review / approval / domain owner involvement が必要な signal を表示する。

state 候補:

- no_escalation
- reviewer_attention
- approver_attention
- domain_owner_attention
- cross_warehouse_escalation
- recurring_incident_escalation

trigger 候補:

- high / critical severity
- cross-warehouse risk
- unresolved aging
- recurring hotspot
- repeated failed operation
- missing evidence in high risk operation
- billing / shipment impact candidate

方針:

- escalation は automatic execution の根拠ではない
- escalation は review priority と evidence 強化の signal として表示する
- escalation mutation button は置かない

---

## ■ Risk Visualization State

risk visualization は、operation / incident / evidence / warehouse boundary の risk を表示する。

risk state:

- low
- medium
- high
- critical
- cross_warehouse
- unknown

表示方針:

- risk badge と severity badge を分ける
- critical / cross_warehouse は強調する
- unknown warehouse / unknown risk は warning として扱う候補にする
- risk は priority signal であり action permission ではない
- risk badge から execution しない

---

## ■ Filter / Search / Drilldown Interaction State

filter / search / drilldown は read-only interaction state である。

interaction state:

- idle_viewing
- filtering
- sorting
- searching
- search_no_result
- drilldown_incident
- drilldown_operation
- drilldown_evidence
- drilldown_timeline
- expanding_section

許可する transition:

```text
idle_viewing -> filtering -> idle_viewing
idle_viewing -> searching -> search_no_result
idle_viewing -> drilldown_incident -> drilldown_operation -> drilldown_evidence
drilldown_operation -> drilldown_timeline
```

方針:

- filter / search result は read-only data view とする
- drilldown は reference navigation とする
- filter / search から execution affordance を出さない
- selected item state は local UI state とする
- server lifecycle / approval state は local UI で変更しない

---

## ■ Read-only Interaction State

read-only interaction は、user が dashboard 内でできる操作を明確に制限する。

許可する interaction:

- tab navigation
- filter
- sort
- search
- drilldown
- expand / collapse
- copy ID
- open trace reference
- open compare / observability reference

許可しない interaction:

- execute correction
- execute rebuild
- execute replay
- retry operation
- approve / reject
- resolve incident
- attach evidence
- edit evidence
- change lifecycle state
- change approval status

方針:

- read-only banner は常に表示する
- action area を置かない
- disabled execution button も置かない
- suggestion label は action button にしない

---

## ■ Compare / Observability / Recovery Visualization Separation

compare / observability / recovery の visualization state は分ける。

| Area | Visualization State | 主な問い |
| --- | --- | --- |
| Compare | diff / severity / reason / review_required | どこに差異があるか |
| Observability | backlog / critical / aging / hotspot / trend | 運用品質はどう変化しているか |
| Recovery | incident / operation / approval / evidence / lifecycle | governance はどう進んでいるか |

方針:

- compare state を recovery operation_state として扱わない
- observability health を approval_status として扱わない
- recovery risk を compare severity と同一視しない
- cross-dashboard link は reference として扱う
- dashboard 間 link から execution しない

---

## ■ Execution Interaction を置かない State Machine 方針

governance dashboard state machine には execution interaction を置かない。

含めない state:

- executing_correction_from_ui
- executing_rebuild_from_ui
- executing_replay_from_ui
- approving_from_ui
- retrying_from_ui
- resolving_incident_from_ui
- attaching_evidence_from_ui

含めない event:

- CLICK_EXECUTE_CORRECTION
- CLICK_EXECUTE_REBUILD
- CLICK_EXECUTE_REPLAY
- CLICK_APPROVE
- CLICK_RETRY
- CLICK_RESOLVE_INCIDENT
- CLICK_ATTACH_EVIDENCE

理由:

- read-only governance dashboard と controlled execution flow は別責務である
- mutation には approval boundary / lifecycle / evidence / post-compare / audit log が必要である
- dashboard state machine に mutation を入れると optimistic update / partial failure / rollback / compensation の責務が混ざる
- execution interaction は source of truth protection と warehouse boundary enforcement が実装された後に別 state machine として設計する

代替 event:

- CLICK_DRILLDOWN_INCIDENT
- CLICK_DRILLDOWN_OPERATION
- CLICK_DRILLDOWN_EVIDENCE
- CLICK_OPEN_TRACE_REFERENCE
- CLICK_FILTER
- CLICK_SEARCH
- CLICK_SORT
- CLICK_COPY_ID

---

## ■ 導入段階案

### Step 0: State Machine Design の明文化

本ドキュメントで visualization / interaction state を整理する。

この段階では実装しない。

### Step 1: Data Fetch State Review

対象:

- loading
- empty
- error
- stale
- partial_data

### Step 2: Visualization State Review

対象:

- overview
- incident
- operation
- lifecycle
- approval
- evidence
- escalation
- risk

### Step 3: Interaction State Review

対象:

- filter
- sort
- search
- drilldown
- expand / collapse
- copy ID
- open reference

### Step 4: Read-only Guard Review

確認:

- execution interaction がないか
- approval mutation interaction がないか
- retry / resolve / attach evidence がないか
- disabled button がないか
- suggestion が action に見えないか

### Step 5: Component Mapping Review

対象:

- RecoveryDashboardPage
- RecoveryDashboardShell
- IncidentList / Detail
- OperationQueue / Detail
- EvidenceSummaryPanel
- RecoveryTimelinePanel
- Badge components
- Filter / Search components

### Step 6: Future Implementation Review

React component を実装する場合は、以下を確認する。

- UI state と server state が分離されているか
- lifecycle / approval / evidence を local mutation していないか
- loading / empty / error が read-only として表現されているか
- execution state machine が混ざっていないか
- compare / observability / recovery の visualization が分離されているか

---

## ■ 今回は実装しない判断

Phase B14-01 では、state machine design ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- dashboard state machine 実装
- README変更

理由:

- まず visualization state と interaction state を固定する必要がある
- execution interaction を dashboard state machine に含めない方針を明確にする必要がある
- loading / empty / error / stale / partial data を実装前に整理する必要がある
- lifecycle / approval / evidence status を local mutation しない境界を明文化する必要がある
- 現時点では read-only governance dashboard の state design を整理する段階である

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard state machine は、read-only visualization と interaction の設計であり、controlled execution の設計ではない。

loading / empty / error、overview / incident / operation / lifecycle / approval / evidence / risk、filter / search / drilldown を明確に分ける。execution interaction は含めず、correction / rebuild / replay / approval / retry / incident resolution は別 phase の controlled execution flow として扱う。
