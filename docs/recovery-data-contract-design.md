# Recovery Data Contract Design（Phase B12-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only recovery governance dashboard のための API / DTO / response model / summary contract を整理する。

Phase B11-01 / B11-02 では、recovery dashboard を read-only governance UI として設計し、incident → operation → evidence の drilldown、operation timeline / trace timeline linkage、compare / observability / recovery dashboard の役割分離を整理した。

Phase B12-01 では、これらの view を将来 API / DTO / response model として表現する場合に、どの contract を分けるべきか、どの情報を summary として返すべきか、どこまでを read-only API とし、どこからを mutation として含めないかを整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・API実装・DTO実装・UI実装・execution mutation・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

recovery data contract は、read-only recovery governance dashboard の表示と drilldown を支える contract である。

基本方針:

- contract は read-only response model として整理する
- execution mutation を含めない
- approval mutation を含めない
- correction / rebuild / replay mutation を含めない
- incident / operation / evidence / lifecycle / approval / timeline を分離する
- compare / observability / recovery の contract を混同しない
- warehouse boundary / cross-warehouse risk を明示する
- summary contract と detail contract を分ける
- source of truth の代替として扱わない
- contract versioning の余地を残す

---

## ■ Recovery Data Contract の目的

recovery data contract の目的は、read-only dashboard が必要とする情報を、責務ごとに分けて安全に提供できるようにすることである。

目的:

- recovery dashboard の view model を整理する
- incident / operation / evidence の drilldown を表現する
- approval state と execution state を分けて表現する
- lifecycle state を一覧・詳細で表示できるようにする
- warehouse_code boundary と cross-warehouse risk を明示する
- compare / observability context を reference として接続する
- trace timeline / operation timeline を link できるようにする
- API 実装前に response model の境界を決める

contract が防ぎたい混乱:

- compare result と recovery operation の混同
- observability metrics と approval status の混同
- incident severity と operation risk_level の混同
- lifecycle state と approval state の混同
- dry-run result と execution result の混同
- read-only API と execution mutation の混同

---

## ■ Contract 全体構造

recovery dashboard 向け contract は、summary と detail を分ける。

候補:

```text
RecoveryDashboardSummary
  -> QueueSummary
  -> IncidentSummary[]
  -> OperationSummary[]
  -> ApprovalSummary[]
  -> EvidenceSummary[]
  -> LifecycleSummary[]
  -> TimelineSummary[]
```

detail drilldown:

```text
IncidentSummary
  -> IncidentDetail
     -> OperationSummary[]
        -> OperationDetail
           -> EvidenceSummary
              -> EvidenceDetail / References
```

方針:

- list view は summary contract を使う
- detail view は detail contract を使う
- summary に raw data を詰め込みすぎない
- detail でも source row 全量を複製しない
- source / trace / snapshot への reference を優先する

---

## ■ Incident Summary Contract

incident summary contract は、incident list / overview / drilldown entry のための contract である。

候補 fields:

```ts
type IncidentSeverity = "low" | "medium" | "high" | "critical";
type IncidentStatus = "open" | "investigating" | "mitigated" | "resolved" | "cancelled";

type IncidentSummary = {
  incident_id: string;
  incident_title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  owner?: string | null;
  domain_owner?: string | null;
  primary_warehouse_code?: string | null;
  affected_warehouse_codes: string[];
  cross_warehouse_risk: boolean;
  affected_keys: RecoveryAffectedKey[];
  related_operation_count: number;
  open_operation_count: number;
  failed_operation_count: number;
  evidence_completeness: EvidenceCompletenessSummary;
  recurring_hotspot: boolean;
  latest_activity_at?: string | null;
  opened_at: string;
};
```

方針:

- incident は operation の上位管理単位として表現する
- incident severity と operation risk_level は分ける
- operation completed を incident resolved とみなさない
- cross-warehouse risk は list view でも見えるようにする

---

## ■ Operation Summary Contract

operation summary contract は、recovery queue / operation list / incident detail のための contract である。

候補 fields:

```ts
type OperationType = "investigation" | "correction" | "rebuild" | "replay" | "recovery";
type OperationState =
  | "requested"
  | "reviewing"
  | "dry_run"
  | "approved"
  | "scheduled"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

type RiskLevel = "low" | "medium" | "high" | "critical";

type OperationSummary = {
  operation_id: string;
  incident_id?: string | null;
  operation_type: OperationType;
  operation_state: OperationState;
  approval_status: ApprovalStatus;
  risk_level: RiskLevel;
  primary_warehouse_code?: string | null;
  affected_warehouse_codes: string[];
  cross_warehouse_risk: boolean;
  affected_keys: RecoveryAffectedKey[];
  requested_by?: string | null;
  requested_at: string;
  latest_activity_at?: string | null;
  dry_run_id?: string | null;
  evidence_package_id?: string | null;
  evidence_completeness: EvidenceCompletenessSummary;
  next_action_candidate?: string | null;
};
```

方針:

- operation_state と approval_status を同じ field にしない
- operation_type は correction / rebuild / replay の違いを明示する
- next_action_candidate は suggestion であり mutation ではない
- operation summary から execution mutation を提供しない

---

## ■ Evidence Summary Contract

evidence summary contract は、audit package の揃い具合と主要 reference を表示するための contract である。

候補 fields:

```ts
type EvidenceStatus = "missing" | "partial" | "available" | "not_required";

type EvidenceCompletenessSummary = {
  status: EvidenceStatus;
  missing_required_items: string[];
  available_count: number;
  required_count: number;
};

type EvidenceSummary = {
  evidence_package_id: string;
  incident_id?: string | null;
  operation_id?: string | null;
  compare_summary_status: EvidenceStatus;
  dry_run_result_status: EvidenceStatus;
  approval_evidence_status: EvidenceStatus;
  execution_evidence_status: EvidenceStatus;
  post_compare_evidence_status: EvidenceStatus;
  trace_timeline_reference_status: EvidenceStatus;
  hotspot_trend_snapshot_status: EvidenceStatus;
  warehouse_boundary_evidence_status: EvidenceStatus;
  attachment_reference_count: number;
  source_references: RecoverySourceReference[];
  updated_at?: string | null;
};
```

方針:

- evidence summary は audit readiness を表示する
- raw evidence 全量は summary に含めない
- evidence package は source of truth の代替ではない
- missing evidence は automatic blocking 実装ではなく read-only signal として扱う

---

## ■ Lifecycle Summary Contract

lifecycle summary contract は、operation の現在状態と state transition の概要を表示するための contract である。

候補 fields:

```ts
type LifecycleSummary = {
  operation_id: string;
  current_state: OperationState;
  previous_state?: OperationState | null;
  approval_status: ApprovalStatus;
  state_started_at?: string | null;
  state_updated_at?: string | null;
  pending_duration_minutes?: number | null;
  failed_at?: string | null;
  cancelled_at?: string | null;
  completed_at?: string | null;
  retry_candidate: boolean;
  post_compare_completed: boolean;
};
```

方針:

- lifecycle summary は execution 状態を表示する
- approval_status は別 field として持つ
- retry_candidate は execution mutation ではなく signal として扱う
- completed は post_compare_completed と合わせて読む

---

## ■ Approval Summary Contract

approval summary contract は、pending approval / approval evidence / governance status を表示するための contract である。

候補 fields:

```ts
type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected" | "expired";
type ApprovalRole = "operator" | "reviewer" | "approver" | "domain_owner";

type ApprovalSummary = {
  operation_id: string;
  incident_id?: string | null;
  approval_status: ApprovalStatus;
  required_approval_role?: ApprovalRole | null;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_requested_at?: string | null;
  approval_pending_age_minutes?: number | null;
  approval_scope_summary?: string | null;
  dry_run_id?: string | null;
  compare_summary_reference?: RecoverySourceReference | null;
  evidence_package_id?: string | null;
  risk_level: RiskLevel;
  cross_warehouse_risk: boolean;
};
```

方針:

- approval summary は execution permission そのものではなく governance state として扱う
- approved は executed を意味しない
- dry-run approval と execution approval を将来分けられる余地を残す
- approval summary から approve mutation を提供しない

---

## ■ Queue Summary Contract

queue summary contract は、recovery queue / dashboard overview を表示するための aggregate contract である。

候補 fields:

```ts
type QueueSummary = {
  total_open_operations: number;
  requested_count: number;
  reviewing_count: number;
  dry_run_count: number;
  approved_count: number;
  scheduled_count: number;
  executing_count: number;
  completed_recent_count: number;
  failed_count: number;
  cancelled_recent_count: number;
  pending_approval_count: number;
  retry_candidate_count: number;
  high_risk_count: number;
  critical_risk_count: number;
  cross_warehouse_risk_count: number;
  evidence_incomplete_count: number;
};
```

方針:

- queue summary は overview 用の aggregate とする
- aggregate は drilldown への入口であり、execution trigger ではない
- completed_recent_count は history / audit 表示用であり incident resolved を意味しない
- critical count は priority signal として扱う

---

## ■ Timeline Summary Contract

timeline summary contract は、incident / operation / trace への link を表示するための contract である。

候補 fields:

```ts
type TimelineType = "incident" | "operation" | "trace";

type TimelineSummary = {
  timeline_type: TimelineType;
  incident_id?: string | null;
  operation_id?: string | null;
  trace_id?: string | null;
  parent_trace_id?: string | null;
  request_id?: string | null;
  original_trace_id?: string | null;
  replay_trace_id?: string | null;
  latest_event_at?: string | null;
  event_count: number;
  has_failed_event: boolean;
  has_pending_approval_event: boolean;
  has_post_compare_event: boolean;
  source_references: RecoverySourceReference[];
};
```

方針:

- operation timeline と trace timeline を分ける
- timeline summary は drilldown link として使う
- trace timeline は source history の説明に使う
- timeline から execution mutation を提供しない

---

## ■ 共通 Reference / Key Contract

複数 contract で使う共通型候補を整理する。

```ts
type RecoveryAffectedKey = {
  warehouse_code?: string | null;
  pallet_code?: string | null;
  part_no?: string | null;
  project_no?: string | null;
  inventory_type?: string | null;
  location_code?: string | null;
  trace_id?: string | null;
  parent_trace_id?: string | null;
};

type RecoverySourceReference = {
  source_type:
    | "compare_summary"
    | "observability_snapshot"
    | "trace_timeline"
    | "operation_timeline"
    | "evidence_package"
    | "external_attachment";
  source_id?: string | null;
  trace_id?: string | null;
  request_id?: string | null;
  parent_trace_id?: string | null;
  created_at?: string | null;
  label?: string | null;
};
```

方針:

- reference は source row 全量の複製ではない
- trace_id / request_id / parent_trace_id は optional とする
- nullable / additive な拡張を前提にする
- external_attachment は reference のみで、attachment 実体保存は本 design に含めない

---

## ■ Compare / Observability / Recovery Contract 分離

compare / observability / recovery は contract の責務が異なる。

| Contract | 主目的 | 主な data |
| --- | --- | --- |
| Compare contract | 現在差異を表示する | row-level diff / severity / reason_codes |
| Observability contract | 運用品質を要約する | backlog / critical / aging / hotspot / trend |
| Recovery contract | governance 状態を表示する | incident / operation / approval / evidence / lifecycle |

方針:

- compare contract は correction / rebuild / replay の execution 情報を持たない
- observability contract は approval / execution state を持たない
- recovery contract は compare / observability の source reference を持てる
- recovery contract は mutation endpoint と分ける
- dashboard 間の link は reference で接続する

---

## ■ Contract Versioning の考え方

recovery contract は、段階導入で項目が増えるため versioning を意識する。

versioning 候補:

- response root に `contract_version` を持つ
- summary ごとに `schema_version` を持つ
- optional field を追加する
- breaking change は別 endpoint / version とする

root response 候補:

```ts
type RecoveryReadOnlyResponse<T> = {
  contract_version: "recovery.v1";
  generated_at: string;
  warehouse_scope?: string | null;
  data: T;
  warnings: RecoveryContractWarning[];
};

type RecoveryContractWarning = {
  code: string;
  message: string;
  severity: "info" | "warning" | "high" | "critical";
};
```

方針:

- 初期は additive / nullable を基本にする
- existing dashboard を壊す breaking change を避ける
- warning は data quality / warehouse boundary / missing evidence の表示に使う
- version は execution permission を意味しない

---

## ■ Read-only API の考え方

read-only API は、dashboard 表示のために governance summary / detail を返す API である。

候補 endpoint:

```text
GET /recovery/dashboard/summary
GET /recovery/incidents
GET /recovery/incidents/:incident_id
GET /recovery/operations
GET /recovery/operations/:operation_id
GET /recovery/evidence/:evidence_package_id
GET /recovery/timelines
```

方針:

- GET / read-only を基本にする
- response は summary / detail を分ける
- filter / sort / search は read-only query とする
- warehouse_code scope を必ず意識する
- API 実装は本 phase では行わない

---

## ■ Execution Mutation を含めない理由

recovery data contract には execution mutation を含めない。

含めないもの:

- correction execution
- rebuild execution
- replay execution
- retry execution
- approval mutation
- incident resolution mutation
- evidence attachment mutation
- automatic recovery trigger

理由:

- read-only governance dashboard の contract と mutation contract は責務が異なる
- mutation には approval boundary / lifecycle / evidence / post-compare / audit log が必要である
- summary response に mutation capability を混ぜると誤実行 risk が増える
- compare-only / visibility first の境界が曖昧になる
- warehouse boundary enforcement と cross-warehouse risk control が必要である

方針:

- B12-01 では read-only response model のみ整理する
- mutation contract は別 phase / 別 policy / 別 endpoint とする
- response に `can_execute` のような実行可能 flag を初期段階では持たせない
- next_action_candidate は suggestion であり action permission ではない

---

## ■ Warehouse Boundary / Cross-warehouse Visibility Contract

warehouse boundary は全 recovery contract に共通する重要情報である。

共通 fields 候補:

```ts
type WarehouseBoundarySummary = {
  primary_warehouse_code?: string | null;
  affected_warehouse_codes: string[];
  requested_warehouse_code?: string | null;
  approved_warehouse_code?: string | null;
  execution_affected_warehouse_codes?: string[];
  source_row_warehouse_codes?: string[];
  projection_row_warehouse_codes?: string[];
  cross_warehouse_risk: boolean;
  warehouse_boundary_evidence_status: EvidenceStatus;
};
```

方針:

- list / detail / timeline / evidence で warehouse boundary を見えるようにする
- warehouse_code が不明な contract は warning を返す候補にする
- cross_warehouse_risk は critical risk marker として扱う
- cross-warehouse item から execution mutation を提供しない
- warehouse boundary は UI 表示だけでなく API contract 上も明示する

---

## ■ Filter / Sort / Search Contract

read-only API では filter / sort / search query を整理する。

filter 候補:

- `warehouse_code`
- `severity`
- `risk_level`
- `operation_type`
- `operation_state`
- `approval_status`
- `owner`
- `domain_owner`
- `cross_warehouse_risk`
- `evidence_status`
- `recurring_hotspot`
- `date_from`
- `date_to`

search 候補:

- `incident_id`
- `operation_id`
- `evidence_package_id`
- `trace_id`
- `parent_trace_id`
- `request_id`
- `original_trace_id`
- `replay_trace_id`
- `pallet_code`
- `part_no`
- `project_no`
- `location_code`

方針:

- filter / sort / search は read-only query とする
- query result から execution mutation を返さない
- broad search でも warehouse boundary warnings を返せるようにする
- sensitive / customer / billing data の検索は別途設計する

---

## ■ 導入段階案

### Step 0: Contract Design の明文化

本ドキュメントで recovery data contract の境界を整理する。

この段階では実装しない。

### Step 1: Summary Contract の確定

対象:

- incident summary
- operation summary
- evidence summary
- lifecycle summary
- approval summary
- queue summary
- timeline summary

Markdown / TypeScript-like pseudo type で確認する。

### Step 2: Detail Contract の検討

候補:

- incident detail
- operation detail
- evidence detail
- timeline detail

summary より後に検討する。

### Step 3: Contract Versioning

候補:

- `contract_version`
- optional fields
- warnings
- nullable / additive policy

### Step 4: Read-only Endpoint Candidate

候補:

- dashboard summary
- incidents list/detail
- operations list/detail
- evidence detail
- timelines summary

Edge Function / RPC 実装は別 phase とする。

### Step 5: UI Mapping Review

確認:

- B11-01 の view model と対応しているか
- B11-02 の IA / drilldown と対応しているか
- compare / observability / recovery の役割が分かれているか
- execution mutation が混ざっていないか
- warehouse boundary が見えるか

### Step 6: Future Implementation Review

実装する場合の確認:

- DB schema は必要か
- existing data から read-only に組み立てられるか
- warehouse_code filter は保証できるか
- response size は適切か
- raw evidence を返しすぎていないか
- sensitive data を含まないか

---

## ■ 今回は実装しない判断

Phase B12-01 では、data contract design ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- API実装
- DTO実装
- UI実装
- execution mutation
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- dashboard API
- README変更

理由:

- まず read-only response model と mutation の境界を固定する必要がある
- compare / observability / recovery contract を分離しないと責務が混ざる
- execution mutation を含めるには approval boundary / lifecycle / evidence package / post-compare / audit log の実装が必要である
- warehouse boundary / cross-warehouse visibility を contract 上で明示してから API 実装すべきである
- 現時点では read-only governance dashboard のための contract を設計する段階である

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

recovery data contract は、execution capability ではなく read-only governance visibility のための response model である。

incident / operation / evidence / lifecycle / approval / timeline を分け、compare / observability / recovery の contract を分離することで、dashboard は安全に drilldown できる。execution mutation は含めず、warehouse boundary と cross-warehouse risk を contract 上で明示する。
