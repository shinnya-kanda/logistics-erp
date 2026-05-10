# Recovery Dashboard Component Boundary Design（Phase B13-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only recovery governance dashboard の React component responsibility / boundary / state separation を整理する。

Phase B11-01 / B11-02 では recovery dashboard の read-only design と information architecture を整理し、Phase B12-01 では read-only data contract を整理した。Phase B13-01 では static mock / wireframe として、overview、incident、operation、evidence、timeline、badge、read-only indication を整理した。

Phase B13-02 では、将来 React component を実装する場合に、どの component が何を表示し、どの state を持ち、どこから先を責務外とするかを整理する。目的は component を実装することではなく、read-only governance UI の責務境界と、execution mutation component を置かない方針を明確にすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

recovery dashboard component は、read-only governance visibility を提供するための component として設計する。

基本方針:

- component は read-only 表示責務を持つ
- execution mutation component は置かない
- approval mutation component は置かない
- correction / rebuild / replay / retry button component は置かない
- page / shell / list / detail / panel / timeline の責務を分ける
- compare / observability / recovery の component を混ぜない
- server data と local UI state を分ける
- filter / sort / search state は mutation state と混同しない
- warehouse boundary visibility は共通責務として扱う
- `next_action_candidate` は suggestion 表示であり action component ではない

---

## ■ Component Boundary Design の目的

component boundary design の目的は、UI 実装時に責務が混ざることを防ぐことである。

防ぎたい混乱:

- dashboard component が execution mutation を持つ
- list component が approval / retry action を持つ
- evidence component が attachment upload を持つ
- timeline component が state transition mutation を持つ
- compare / observability / recovery の data contract が混ざる
- operation_state と approval_status が同じ UI state として扱われる
- warehouse boundary marker が一部画面で欠落する

component design の目的:

- read-only governance UX を守る
- incident / operation / evidence / timeline の drilldown を整理する
- state 表示と state mutation を分離する
- contract boundary と component boundary を揃える
- future implementation で additive に進められるようにする

---

## ■ Page Boundary の考え方

page boundary は、routing / data loading / layout shell の境界である。

候補:

```text
RecoveryDashboardPage
  -> RecoveryDashboardShell
     -> RecoveryOverviewTab
     -> RecoveryIncidentsTab
     -> RecoveryOperationsTab
     -> RecoveryApprovalsTab
     -> RecoveryFailedRetryTab
     -> RecoveryEvidenceTab
     -> RecoveryTimelinesTab
```

責務:

- page title / read-only indication を表示する
- top-level tab state を持つ
- read-only data fetch の境界を将来定義する
- error / loading / empty state をまとめる
- execution mutation を持たない

非責務:

- correction / rebuild / replay の実行
- approval / rejection
- retry
- incident resolution
- evidence attachment upload

方針:

- page component は read-only dashboard の入口に限定する
- page state は navigation / filter / selected item などの UI state に限定する
- server mutation state は持たない

---

## ■ Navigation Shell Responsibility

navigation shell は、dashboard 全体の navigation と read-only framing を担当する。

候補:

```text
RecoveryDashboardShell
  -> RecoveryReadOnlyBanner
  -> RecoveryTopNavigation
  -> RecoveryTabNavigation
  -> RecoveryFilterBar
  -> RecoveryContentArea
```

責務:

- `READ ONLY` / `NO EXECUTION` を明示する
- Compare / Observability / Trace / Recovery の navigation を分ける
- Recovery 内 tab navigation を提供する
- selected tab / selected filter を子 component へ渡す
- execution button が存在しないことを UX 上明確にする

非責務:

- operation execution
- approval mutation
- data contract の変換ロジック全体
- domain-specific rendering の詳細

方針:

- shell は dashboard の read-only framing を担う
- shell に action button slot を設けない
- disabled execution button の slot も設けない

---

## ■ Overview Summary Card Component

overview summary card は、queue / incident / approval / failed / evidence / warehouse risk の aggregate を表示する。

候補:

```text
RecoveryOverviewCards
  -> RecoverySummaryCard
```

props 候補:

- label
- value
- severity
- badge
- description
- drilldownTarget

責務:

- aggregate count を表示する
- high / critical / cross-warehouse を視認しやすくする
- drilldown link を提供する
- read-only summary として表示する

非責務:

- count をもとに automatic execution する
- approval / retry action を表示する
- source data を直接 fetch する

方針:

- card click は tab / filter / detail への navigation に限定する
- card 内に action button を置かない
- critical count は priority signal であり execution trigger ではない

---

## ■ Incident List / Detail Component

incident component は、incident 単位の governance 情報を表示する。

候補:

```text
IncidentList
  -> IncidentListRow
  -> IncidentSeverityBadge
  -> IncidentStatusBadge
  -> WarehouseBoundaryBadge

IncidentDetailPanel
  -> IncidentHeader
  -> IncidentContextPanel
  -> RelatedOperationsTable
  -> IncidentTimelinePreview
  -> IncidentRetrospectiveSummary
```

責務:

- incident summary を一覧表示する
- severity / status / owner / warehouse / recurring を表示する
- incident detail で related operations / context / timeline を表示する
- operation completed と incident resolved を混同しない表示にする

非責務:

- incident resolution mutation
- owner assignment mutation
- escalation mutation
- automatic incident creation

state boundary:

- selectedIncidentId は UI state として扱う
- incident data は read-only contract 由来として扱う
- resolution / escalation は表示のみで mutation しない

---

## ■ Operation Queue / Detail Component

operation component は、recovery operation の lifecycle / approval / risk / evidence 状態を表示する。

候補:

```text
OperationQueue
  -> OperationQueueRow
  -> OperationTypeBadge
  -> LifecycleBadge
  -> ApprovalStatusBadge
  -> RiskBadge
  -> EvidenceCompletenessBadge

OperationDetailPanel
  -> OperationHeader
  -> LifecycleSummaryPanel
  -> ApprovalSummaryPanel
  -> DryRunSummaryPanel
  -> ExecutionSummaryPanel
  -> OperationReferenceLinks
```

責務:

- operation summary を一覧表示する
- lifecycle と approval を別表示する
- operation risk と evidence completeness を表示する
- operation detail で dry-run / approval / execution / post-compare の違いを表示する
- operation timeline / trace timeline / evidence package への link を表示する

非責務:

- correction execution
- rebuild execution
- replay execution
- retry execution
- approval / rejection
- lifecycle transition mutation

state boundary:

- selectedOperationId は UI state として扱う
- operation_state は server response の read-only value として扱う
- local state で operation_state を変更しない
- optimistic update は行わない

---

## ■ Evidence Panel Component

evidence panel は、operation / incident の audit package summary を表示する。

候補:

```text
EvidenceSummaryPanel
  -> EvidenceCompletenessBadge
  -> EvidenceMatrix
  -> EvidenceReferenceList
  -> WarehouseBoundaryEvidencePanel
```

責務:

- evidence completeness を表示する
- compare / dry-run / approval / execution / post-compare evidence の有無を表示する
- trace timeline / hotspot / snapshot / attachment reference を表示する
- warehouse boundary evidence を表示する
- missing evidence を audit risk として表示する

非責務:

- evidence attachment upload
- evidence creation / edit
- evidence completeness を mutation する
- raw source data の過剰表示

state boundary:

- evidence detail expand/collapse は local UI state とする
- evidence status は read-only contract 由来とする
- attachment reference は link / label として扱う

---

## ■ Timeline Component

timeline component は、incident timeline / operation timeline / trace timeline link を表示する。

候補:

```text
RecoveryTimelinePanel
  -> IncidentTimelineView
  -> OperationTimelineView
  -> TraceTimelineLinkList
```

責務:

- incident management の timeline を表示する
- operation lifecycle の timeline を表示する
- trace timeline への reference を表示する
- operation timeline と trace timeline を分けて表示する
- failed / cancelled / retry candidate / post-compare missing を明示する

非責務:

- state transition mutation
- retry execution
- trace replay execution
- timeline event creation

state boundary:

- selectedTimelineType は UI state とする
- timeline events は read-only response とする
- trace timeline link は navigation であり mutation ではない

---

## ■ Filter / Sort / Search State Boundary

filter / sort / search は read-only investigation のための UI state である。

state 候補:

- warehouse_code
- severity
- risk_level
- operation_type
- operation_state
- approval_status
- owner
- domain_owner
- cross_warehouse_risk
- evidence_status
- date range
- search query

責務:

- list / table の絞り込み条件を管理する
- URL query / local state / controlled inputs のどれで持つかを将来検討する
- filter 結果を drilldown に渡す

非責務:

- filter 結果から operation を実行する
- search 結果から mutation capability を返す
- warehouse boundary を無視した broad query を許す

方針:

- filter / sort / search state は read-only UI state とする
- mutation state と混同しない
- search result に execution affordance を出さない

---

## ■ Read-only State Boundary

read-only state boundary は、UI が持ってよい state と持ってはいけない state を分ける考え方である。

持ってよい state:

- selected tab
- selected incident
- selected operation
- selected evidence package
- selected timeline type
- filter / sort / search
- expand / collapse
- visible columns

持たない state:

- approving / approved mutation in progress
- executing correction / rebuild / replay
- retrying
- resolving incident
- attaching evidence
- optimistic operation_state
- optimistic approval_status

方針:

- server response の lifecycle / approval / evidence status を local mutation で変更しない
- UI state は exploration / display に限定する
- read-only banner と no execution policy を component tree の上位で明示する

---

## ■ Compare / Observability / Recovery Component Separation

compare / observability / recovery は component boundary を分ける。

| Area | Component responsibility |
| --- | --- |
| Compare | row-level diff / severity / reason / review_required |
| Observability | backlog / critical / aging / hotspot / trend |
| Trace | trace timeline / request_id grouping / business history |
| Recovery | incident / operation / approval / evidence / lifecycle |

方針:

- Recovery component は compare row を直接編集しない
- Recovery component は observability metrics を mutation に使わない
- Recovery component は compare / observability への reference link を持てる
- shared badge / layout component は使ってよいが、domain responsibility は混ぜない

---

## ■ Warehouse Boundary Visibility Responsibility

warehouse boundary visibility は複数 component の共通責務である。

対象 component:

- IncidentListRow
- IncidentDetailPanel
- OperationQueueRow
- OperationDetailPanel
- EvidenceSummaryPanel
- RecoveryTimelinePanel
- RecoveryOverviewCards

表示責務:

- primary warehouse_code
- affected warehouse_code list
- cross_warehouse_risk
- warehouse boundary evidence status
- unknown warehouse warning

方針:

- warehouse_code は list / detail / evidence / timeline で欠落させない
- cross-warehouse risk は critical badge として表示する
- warehouse boundary component は mutation を持たない
- cross-warehouse item に execution affordance を出さない

---

## ■ Execution Mutation Component を置かない方針

recovery dashboard component tree には execution mutation component を置かない。

置かない component:

- ExecuteCorrectionButton
- ExecuteRebuildButton
- ExecuteReplayButton
- RetryOperationButton
- ApproveOperationButton
- RejectOperationButton
- ResolveIncidentButton
- AttachEvidenceButton
- AutoRecoverButton

理由:

- read-only governance dashboard の責務と mutation flow の責務が異なる
- approval boundary / lifecycle / evidence / post-compare / audit log の実装前に mutation component を置くと監査性が弱い
- disabled button でも future action を示唆し、read-only UX を曖昧にする
- operation_state / approval_status の optimistic update が混入する risk がある
- cross-warehouse risk / blast radius / source of truth protection を component 単体で保証できない

代替 component:

- SuggestedNextReviewLabel
- ApprovalRequiredBadge
- EvidenceMissingBadge
- PostCompareMissingBadge
- RetryCandidateBadge
- CrossWarehouseRiskBadge
- ReadOnlyReferenceLink

---

## ■ 導入段階案

### Step 0: Component Boundary の明文化

本ドキュメントで component responsibility / boundary / state separation を整理する。

この段階では実装しない。

### Step 1: Component Inventory Review

候補:

- RecoveryDashboardPage
- RecoveryDashboardShell
- RecoveryOverviewCards
- IncidentList / IncidentDetailPanel
- OperationQueue / OperationDetailPanel
- EvidenceSummaryPanel
- RecoveryTimelinePanel
- Badge components
- Filter / Search components

### Step 2: Props / Contract Mapping

対象:

- IncidentSummary
- OperationSummary
- EvidenceSummary
- LifecycleSummary
- ApprovalSummary
- QueueSummary
- TimelineSummary

component props は read-only contract 由来とする。

### Step 3: State Boundary Review

確認:

- UI state と server state が分かれているか
- mutation state が混ざっていないか
- optimistic update がないか
- filter / sort / search が read-only か

### Step 4: Read-only UX Review

確認:

- READ ONLY indication が上位 shell にあるか
- execution button slot がないか
- approval mutation slot がないか
- next action が suggestion として表示されているか
- warehouse boundary が見えるか

### Step 5: Future Implementation Review

React component を実装する場合は、以下を確認する。

- existing dashboard component と責務が衝突しないか
- compare / observability / recovery component が分離されているか
- API / DTO 実装なしでも static data で検証できるか
- component が mutation を持っていないか
- TypeScript type が read-only contract と対応しているか

---

## ■ 今回は実装しない判断

Phase B13-02 では、component boundary design ドキュメントの追加のみを行う。

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
- dashboard component
- README変更

理由:

- まず component responsibility と state boundary を固定する必要がある
- read-only governance dashboard に mutation component を混ぜない方針を実装前に明確にする必要がある
- component 実装前に IA / static mock / data contract と対応付ける必要がある
- execution flow は approval boundary / lifecycle / evidence package / post-compare / audit log 実装後に別設計すべきである
- 現時点では component 境界を整理する段階である

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

recovery dashboard component boundary は、future React implementation の安全な設計境界である。

page / shell / list / detail / panel / timeline を分け、state は read-only exploration に限定する。execution mutation component は置かず、badge / label / reference link によって governance 状態を見える化することで、read-only recovery dashboard の責務を守る。
