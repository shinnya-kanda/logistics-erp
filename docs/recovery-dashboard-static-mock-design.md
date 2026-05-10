# Recovery Dashboard Static Mock Design（Phase B13-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only recovery governance dashboard の static mock / wireframe / governance UX を整理する。

Phase B11-01 / B11-02 では、recovery dashboard の read-only design と information architecture を整理した。Phase B12-01 では、incident / operation / evidence / lifecycle / approval / queue / timeline の data contract を整理した。

Phase B13-01 では、これらをもとに、実装前の static mock として、どの screen に何を表示し、どの badge / table / detail / timeline / read-only indication を置くかを整理する。目的は React component や API を作ることではなく、read-only governance UX の見た目と情報配置を Markdown / wireframe レベルで確認できるようにすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI実装・React component・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

static mock は、future UI の実装方針を決める前に、情報配置と UX の妥当性を確認するための設計である。

基本方針:

- static mock は read-only governance UI として設計する
- execution button は置かない
- approval mutation button も置かない
- retry / correction / rebuild / replay の action button は置かない
- incident / operation / evidence / timeline を分けて表示する
- severity / lifecycle / approval / risk badge を分けて表示する
- warehouse boundary / cross-warehouse risk を常に見えるようにする
- next action は suggestion として表示し、実行操作にしない
- disabled execution button も初期 mock では置かない

---

## ■ Static Mock Design の目的

static mock design の目的は、UI 実装前に governance UX を確認することである。

確認したいこと:

- Overview で recovery governance の全体状態が分かるか
- Incident list から high / critical incident を見つけやすいか
- Incident detail から related operation / evidence / timeline へ辿れるか
- Operation queue で lifecycle / approval / risk / evidence 状態が分かるか
- Operation detail で dry-run / approval / execution / post-compare の違いが分かるか
- Evidence summary で audit readiness が分かるか
- Timeline で incident timeline / operation timeline / trace timeline の違いが分かるか
- read-only であることが誤解なく伝わるか
- execution button がなくても governance 状態を確認できるか

---

## ■ Governance UX の基本方針

governance UX は、判断材料を分かりやすく提示しながら、誤実行を防ぐ UX である。

UX 原則:

- screen header に `READ ONLY` / `NO EXECUTION` を明示する
- list screen では status badge を並べて比較しやすくする
- detail screen では summary → evidence → timeline の順に深掘りする
- high / critical / cross-warehouse は視認性を高くする
- lifecycle と approval を別 badge として見せる
- missing evidence / post-compare missing を audit risk として見せる
- next action は `Suggested next review` のような文言にする
- button ではなく link / reference / label を中心にする
- mutation を想起させる `Execute` / `Approve` / `Retry` / `Resolve` は使わない

---

## ■ Overview Screen Mock

Overview screen は、recovery governance の全体状態を要約する。

目的:

- 今見るべき incident / operation / approval / failed / evidence risk を把握する

wireframe:

```text
[Recovery Governance Dashboard] [READ ONLY] [NO EXECUTION]

Summary Cards
----------------------------------------------------------------
Open Incidents | High/Critical | Pending Approval | Failed Ops
Retry Candidate | Evidence Missing | Cross-warehouse Risk
----------------------------------------------------------------

Priority Panels
----------------------------------------------------------------
High / Critical Incidents
Pending Approval Aging
Failed / Retry Candidates
Evidence Incomplete
Cross-warehouse Risk
----------------------------------------------------------------

Context Links
----------------------------------------------------------------
Compare Dashboard | Observability Dashboard | Trace Timeline
----------------------------------------------------------------
```

表示候補:

- open incident count
- high / critical incident count
- pending approval count
- failed operation count
- retry candidate count
- evidence incomplete count
- cross-warehouse risk count
- latest activity

方針:

- Overview から execution しない
- summary card は drilldown 入口として扱う
- next action は review / investigate / check evidence のような文言にする

---

## ■ Incident List Mock

Incident list は、incident 単位で業務問題を一覧する。

目的:

- severity / owner / status / warehouse / recurring risk を見て優先順位を判断する

wireframe:

```text
[Incidents] [READ ONLY]

Filters: warehouse_code | severity | owner | status | recurring | cross-warehouse
Search: incident_id / trace_id / part_no / location_code

Table
--------------------------------------------------------------------------------
Severity | Incident ID | Title | Status | Owner | Warehouse | Ops | Evidence | Latest
--------------------------------------------------------------------------------
CRITICAL | INC-001     | A-01 qty mismatch recurring | investigating | Sato | WH-A | 4 | partial | 2026-05-10
HIGH     | INC-002     | project mismatch             | open          | -    | WH-A | 1 | missing | 2026-05-10
--------------------------------------------------------------------------------
```

badge 候補:

- severity badge
- incident status badge
- recurring hotspot badge
- cross-warehouse badge
- evidence completeness badge

方針:

- incident row click は incident detail への drilldown とする
- incident resolution button は置かない
- owner 未設定や high / critical は視認性を高くする

---

## ■ Incident Detail Mock

Incident detail は、incident の原因・影響・関連 operation・evidence・timeline を確認する。

目的:

- incident が何で、どの operation と evidence によって調査・対応されているかを説明する

wireframe:

```text
[Incident Detail: INC-001] [READ ONLY] [NO RESOLUTION ACTION]

Header
----------------------------------------------------------------
Severity: CRITICAL | Status: investigating | Owner: Sato
Warehouse: WH-A | Cross-warehouse: NO | Recurring Hotspot: YES
Opened: 2026-05-10 | Latest Activity: 2026-05-10
----------------------------------------------------------------

Incident Summary
----------------------------------------------------------------
Problem: A-01 location has recurring quantity mismatch for PART-001.
Probable Cause: projection drift / partial move candidate.
Remaining Risk: billing impact not confirmed.
----------------------------------------------------------------

Related Context
----------------------------------------------------------------
Compare Summary | Observability Trend | Hotspot Snapshot | Trace Timeline
----------------------------------------------------------------

Related Operations
----------------------------------------------------------------
Operation ID | Type | Lifecycle | Approval | Risk | Evidence | Post-compare
OP-001       | rebuild dry-run | completed | not_required | medium | available | n/a
OP-002       | scoped rebuild  | reviewing | pending      | high   | partial   | missing
----------------------------------------------------------------

Incident Timeline
----------------------------------------------------------------
2026-05-10 09:00 opened
2026-05-10 09:15 compare summary attached
2026-05-10 09:30 rebuild dry-run completed
----------------------------------------------------------------
```

方針:

- incident detail から operation detail / evidence / timeline へ drilldown する
- resolution action は置かない
- operation completed と incident resolved を混同しない表記にする

---

## ■ Operation Queue Mock

Operation queue は、requested / reviewing / dry_run / approved / scheduled などの operation を一覧する。

目的:

- recovery operation の lifecycle と approval 状態を把握する

wireframe:

```text
[Operations Queue] [READ ONLY]

Filters: warehouse_code | operation_type | lifecycle | approval | risk | evidence
Search: operation_id / incident_id / trace_id / request_id / pallet_code / part_no

Table
------------------------------------------------------------------------------------------------
Risk | Operation ID | Type | Lifecycle | Approval | Incident | Warehouse | Evidence | Next Review
------------------------------------------------------------------------------------------------
HIGH | OP-002       | rebuild | reviewing | pending | INC-001 | WH-A | partial | verify dry-run
MED  | OP-003       | replay  | dry_run   | not_required | INC-003 | WH-B | available | compare result
------------------------------------------------------------------------------------------------
```

表示候補:

- operation_type
- operation_state
- approval_status
- risk_level
- evidence completeness
- affected warehouse_code
- next_action_candidate

方針:

- `Next Review` は suggestion であり action button ではない
- operation_state と approval_status を別 badge にする
- approved でも execution button は置かない

---

## ■ Operation Detail Mock

Operation detail は、1 operation の lifecycle / approval / evidence / trace reference を確認する。

目的:

- operation がどこまで進み、何が承認され、何が不足しているかを説明する

wireframe:

```text
[Operation Detail: OP-002] [READ ONLY] [NO EXECUTION]

Header
----------------------------------------------------------------
Type: scoped rebuild | Risk: HIGH | Lifecycle: reviewing
Approval: pending | Incident: INC-001 | Warehouse: WH-A
Cross-warehouse: NO
----------------------------------------------------------------

Lifecycle Summary
----------------------------------------------------------------
requested -> reviewing -> dry_run completed -> approval pending
Post-compare: missing
Retry candidate: no
----------------------------------------------------------------

Approval Summary
----------------------------------------------------------------
Required role: approver
Dry-run reference: DRY-001
Compare reference: CMP-001
Approval scope: WH-A / location A-01 / PART-001
----------------------------------------------------------------

Evidence Summary
----------------------------------------------------------------
Compare: available
Dry-run: available
Approval evidence: partial
Execution evidence: not_required
Post-compare: missing
Warehouse boundary: available
----------------------------------------------------------------

References
----------------------------------------------------------------
Operation Timeline | Trace Timeline | Evidence Package | Incident Detail
----------------------------------------------------------------
```

方針:

- lifecycle、approval、evidence を分けて表示する
- execution evidence は execution 前なら not_required / missing を明確にする
- execute / approve / retry button は置かない

---

## ■ Evidence Summary Mock

Evidence summary は、audit package の揃い具合と不足を確認する。

目的:

- operation / incident の audit readiness を確認する

wireframe:

```text
[Evidence Package: EVD-001] [READ ONLY]

Evidence Completeness
----------------------------------------------------------------
Overall: PARTIAL
Missing required items: approval evidence, post-compare evidence
----------------------------------------------------------------

Evidence Matrix
----------------------------------------------------------------
Compare Summary            available     CMP-001
Before / After Summary     partial       BEFORE-001
Dry-run Result             available     DRY-001
Trace Timeline             available     TRACE-001
Hotspot / Trend Snapshot   available     SNAP-2026-05-10
Reason Code / Text         available     projection_drift
Attachment Reference       not_required  -
Warehouse Boundary         available     WH-A only
----------------------------------------------------------------

Source References
----------------------------------------------------------------
trace_id: trace-xxx
request_id: req-xxx
parent_trace_id: -
----------------------------------------------------------------
```

方針:

- evidence package は source of truth の代替ではないことを明示する
- attachment は reference のみとする
- raw data を過剰表示しない
- missing evidence を action button ではなく status として表示する

---

## ■ Timeline Mock

Timeline screen は、incident / operation / trace の timeline を分けて表示する。

目的:

- governance timeline と business trace timeline を混同せず確認する

wireframe:

```text
[Timelines] [READ ONLY]

Tabs: Incident Timeline | Operation Timeline | Trace Timeline Links

Incident Timeline: INC-001
----------------------------------------------------------------
09:00 incident opened
09:15 compare summary attached
09:30 dry-run requested
10:00 dry-run completed
10:15 approval pending
----------------------------------------------------------------

Operation Timeline: OP-002
----------------------------------------------------------------
requested -> reviewing -> dry_run -> approval pending
request_id: req-dry-001
operation_trace_id: rec-rebuild-001
----------------------------------------------------------------

Trace Timeline Links
----------------------------------------------------------------
original_trace_id: inv-001
rebuild_operation_trace_id: rec-rebuild-001
parent_trace_id: incident-inc-001 candidate
----------------------------------------------------------------
```

方針:

- incident timeline は incident management の流れを示す
- operation timeline は lifecycle を示す
- trace timeline は source history / business operation を示す
- timeline から execution しない

---

## ■ Severity / Lifecycle / Approval / Risk Badge Mock

badge は状態を短く伝えるが、概念を混ぜない。

badge category:

| Category | Values | 用途 |
| --- | --- | --- |
| Severity | low / medium / high / critical | incident / diff の業務影響 |
| Lifecycle | requested / reviewing / dry_run / approved / scheduled / executing / completed / failed / cancelled | operation の進行状態 |
| Approval | not_required / pending / approved / rejected / expired | execution 承認状態 |
| Risk | low / medium / high / critical / cross-warehouse | operation risk |
| Evidence | missing / partial / available / not_required | audit readiness |

visual 方針:

- critical / cross-warehouse は赤系
- high は橙系
- medium は黄系
- low / available は緑系
- pending / partial は注意色
- not_required は neutral

注意:

- `approved` badge は `completed` ではない
- `dry_run` badge は execution ready ではない
- `critical` badge は automatic execution の根拠ではない

---

## ■ Compare / Observability / Recovery Navigation Mock

compare / observability / recovery は top navigation で分ける。

mock:

```text
[Compare] [Observability] [Trace Timeline] [Recovery Governance]
```

役割:

- Compare: 現在差異の row-level 確認
- Observability: backlog / aging / hotspot / trend
- Trace Timeline: source history / request flow
- Recovery Governance: incident / operation / approval / evidence / lifecycle

link 方針:

- Compare row から incident candidate context へ link する将来余地を残す
- Observability hotspot から incident list filter へ link する将来余地を残す
- Recovery operation から trace timeline へ link する
- Recovery から execution へ link しない

---

## ■ Warehouse Boundary Visibility Mock

warehouse boundary は list / detail / evidence / timeline のすべてで見えるようにする。

mock 表示:

```text
Warehouse: WH-A
Affected: WH-A
Cross-warehouse Risk: NO
Warehouse Evidence: available
```

cross-warehouse の場合:

```text
Warehouse: MULTIPLE
Affected: WH-A, WH-B
Cross-warehouse Risk: CRITICAL
Warehouse Evidence: partial
Execution: not available in read-only dashboard
```

方針:

- cross-warehouse は critical badge として表示する
- warehouse_code unknown は warning / high risk として表示する候補にする
- warehouse evidence への reference を表示する
- cross-warehouse item に execution button を置かない

---

## ■ Read-only Indication の考え方

read-only indication は、画面が確認専用であることを明確に伝える表示である。

表示候補:

- page header に `READ ONLY`
- subheader に `This dashboard does not execute correction, rebuild, replay, approval, or retry.`
- action area に `No execution actions are available in this view.`
- detail screen に `Evidence and status are for governance review only.`

方針:

- read-only 表示は全 screen に置く
- execution button がない理由を短く説明する
- disabled button ではなく、そもそも action area を置かない
- suggested next review は text / badge / link として表示する

---

## ■ Execution Button を置かない Mock 方針

static mock では execution button を置かない。

置かないもの:

- Execute correction
- Execute rebuild
- Execute replay
- Retry
- Approve
- Reject
- Resolve incident
- Attach evidence
- Auto recover

理由:

- static mock は governance visibility を確認するためのものである
- execution flow は approval boundary / lifecycle / evidence / post-compare / audit log の実装後に別設計する
- disabled button は将来 action がある前提に見え、read-only UX を曖昧にする
- action button があると review / audit / execution の責務が混ざる

代替表示:

- `Suggested next review`
- `Approval required`
- `Evidence missing`
- `Post-compare missing`
- `Retry candidate`
- `Escalation candidate`

---

## ■ 導入段階案

### Step 0: Static Mock Design の明文化

本ドキュメントで static mock / wireframe / governance UX を整理する。

この段階では実装しない。

### Step 1: Markdown Wireframe Review

対象:

- overview
- incident list
- incident detail
- operation queue
- operation detail
- evidence summary
- timeline

### Step 2: Badge Glossary Review

対象:

- severity
- lifecycle
- approval
- risk
- evidence completeness
- warehouse boundary

### Step 3: Navigation Mock Review

対象:

- compare / observability / trace / recovery navigation
- incident → operation → evidence drilldown
- operation → timeline / trace timeline link

### Step 4: Read-only UX Review

確認:

- READ ONLY が明確か
- execution button がないか
- disabled button もないか
- next action が suggestion として表現されているか
- mutation を想起する文言がないか

### Step 5: Future UI Implementation Review

UI 実装を検討する場合は、以下を確認する。

- static mock と IA が一致しているか
- data contract と表示項目が対応しているか
- existing dashboard navigation と衝突しないか
- read-only が維持されているか
- warehouse boundary が見えるか

---

## ■ 今回は実装しない判断

Phase B13-01 では、static mock design ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI実装
- React component
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

- まず static mock / wireframe / governance UX を Markdown で確認する必要がある
- UI 実装前に read-only indication と execution button を置かない方針を固定する必要がある
- incident / operation / evidence / timeline の情報配置を確認してから component 設計へ進むべきである
- execution flow は approval boundary / lifecycle / evidence package / post-compare / audit log 実装後に別設計すべきである
- 現時点では read-only governance UX の妥当性を確認する段階である

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

recovery dashboard static mock は、future UI の設計材料であり、実行機能ではない。

Overview、incident、operation、evidence、timeline を read-only に配置し、severity / lifecycle / approval / risk / warehouse boundary を見える化する。execution button は置かず、governance visibility と audit readiness を確認するための wireframe として扱う。
