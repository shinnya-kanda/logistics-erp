# Governance Dashboard Rendering Model Design（Phase B14-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の rendering semantics / rendering priority / visualization consistency を整理する。

Phase B14-01 では、governance dashboard の loading / empty / error、overview / incident / operation / lifecycle / approval / evidence / risk、filter / search / drilldown の state machine を整理した。Phase B14-02 では、それらの state を UI 上でどう描画し、どの表示を優先し、compare / observability / recovery dashboard 間でどのように一貫性を保つかを整理する。

目的は React component を実装することではなく、future UI 実装時に、read-only governance dashboard が誤解なく状態を表示し、execution rendering を持たないことを明確にすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

rendering model は、同じ状態を同じ意味で描画するための方針である。

基本方針:

- rendering は read-only visualization のために行う
- execution rendering を置かない
- approval mutation rendering を置かない
- retry / correction / rebuild / replay action rendering を置かない
- lifecycle / approval / evidence / risk を別概念として描画する
- compare / observability / recovery の rendering semantics を混同しない
- loading / empty / error から execution を促さない
- critical / cross-warehouse / missing evidence は目立たせるが action permission ではない
- stale / partial data は data quality warning として描画する
- warehouse boundary は list / detail / evidence / timeline で一貫して表示する

---

## ■ Rendering Model の目的

rendering model の目的は、state と表示意味の対応を固定することである。

答えたい問い:

- loading 中に何を見せるか
- partial data のとき、どこまで描画するか
- stale data をどう伝えるか
- empty state を stable と誤認させないために何を表示するか
- error state を business incident と混同させないために何を表示するか
- severity / lifecycle / approval / evidence / risk badge をどう使い分けるか
- timeline では何を read-only event として描画するか
- cross-dashboard で badge や warning の意味をどう揃えるか
- execution action を想起させる UI をどう避けるか

---

## ■ Rendering Priority

複数の state / warning が同時に存在する場合、表示優先度を決める。

優先度候補:

1. `READ ONLY` / `NO EXECUTION` indication
2. critical / cross-warehouse risk
3. data fetch error / contract error
4. stale / partial data warning
5. high risk / failed operation / missing post-compare
6. pending approval aging / missing evidence
7. normal lifecycle / approval / evidence badges
8. suggested next review

方針:

- read-only indication は常に最上位に表示する
- critical / cross-warehouse は通常 badge より強く表示する
- stale / partial data は business risk と混同しない
- suggested next review は action button にしない
- priority は visual emphasis の順であり、execution permission ではない

---

## ■ Loading / Skeleton Rendering

loading rendering は、read-only data を取得中であることを示す。

表示候補:

- page header
- `READ ONLY` banner
- skeleton cards
- skeleton tables
- loading message
- last loaded timestamp if available

方針:

- loading 中も read-only indication を消さない
- skeleton に action button placeholder を置かない
- previous data を表示する場合は stale candidate として明示する
- loading state から execution affordance を出さない

例:

```text
[Recovery Governance Dashboard] [READ ONLY] [NO EXECUTION]
Loading recovery governance summaries...
[skeleton cards]
[skeleton table]
```

---

## ■ Partial Render の考え方

partial render は、一部 contract / data だけ取得できた状態で描画する考え方である。

例:

- incident summary は取得できたが evidence summary がない
- queue summary は取得できたが timeline summary がない
- approval summary はあるが warehouse boundary evidence が欠落

表示方針:

- 取得できた summary は表示する
- 欠落した contract は `partial data` warning として表示する
- missing contract と missing evidence を分ける
- partial render から execution を促さない

rendering rule:

| 欠落対象 | 表示 |
| --- | --- |
| evidence summary contract | `Evidence data unavailable` |
| timeline summary contract | `Timeline unavailable` |
| warehouse boundary data | `Warehouse boundary unknown` warning |
| approval summary | `Approval data unavailable` |

---

## ■ Stale Render の考え方

stale render は、表示 data の生成時刻が古い状態を示す。

stale 判定候補:

- `generated_at` が一定時間より古い
- snapshot date が現在日付より古い
- last activity が更新されている可能性がある
- fetch retry 中に previous data を表示している

表示候補:

- `Stale data` badge
- generated_at
- last refreshed at
- affected contract

方針:

- stale は business incident ではなく data freshness warning として表示する
- stale data から operation execution を促さない
- stale 表示中でも drilldown は read-only とする
- stale と historical snapshot を混同しない

---

## ■ Empty Render の考え方

empty render は、表示対象が存在しない状態を示す。

empty 種別:

- no incident
- no operation
- no pending approval
- no failed operation
- no retry candidate
- no evidence package
- no timeline event
- no search result

表示方針:

- empty reason を明示する
- active filter / search condition を表示する
- empty を stable と断定しない
- execution action は表示しない

例:

```text
No failed operations found.
Filters: warehouse_code = WH-A, risk = high
This view is read-only. No retry actions are available here.
```

---

## ■ Error Render の考え方

error render は、read-only data の取得・変換・contract validation に失敗した状態を示す。

error 種別:

- network error
- API error
- contract parse error
- warehouse boundary validation warning
- permission / warehouse scope error
- partial dependency error

表示候補:

- error severity
- error code
- message
- affected contract
- request_id if available
- generated_at if available
- retry fetch suggestion

方針:

- error を business incident と混同しない
- error から correction / rebuild / replay へ誘導しない
- retry fetch は read-only data fetch の retry として扱う
- warehouse scope error は security / critical warning 候補として描画する

---

## ■ Severity Badge Rendering Rule

severity badge は、incident / diff の業務影響を示す。

values:

- low
- medium
- high
- critical

rendering rule:

| Severity | Visual | 意味 |
| --- | --- | --- |
| low | green / neutral | 軽微または確認のみ |
| medium | yellow | review が必要 |
| high | orange | 業務影響候補 |
| critical | red | warehouse / 実物流 / 請求など重大 risk |

方針:

- severity は approval status ではない
- severity は operation risk_level と同一視しない
- critical badge から execution しない
- tooltip / glossary で意味を説明できるようにする

---

## ■ Lifecycle Rendering Rule

lifecycle rendering は、operation の進行状態を示す。

values:

- requested
- reviewing
- dry_run
- approved
- scheduled
- executing
- completed
- failed
- cancelled

rendering rule:

- current state を強調する
- completed は post-compare status と一緒に表示する
- failed は failure reason と一緒に表示する
- cancelled は cancel reason と一緒に表示する
- dry_run は execution-ready と見せない
- approved は executed と見せない

non-rendering:

- lifecycle step を button にしない
- lifecycle transition control を表示しない
- retry button を failed state に置かない

---

## ■ Approval Rendering Rule

approval rendering は、execution approval の governance state を示す。

values:

- not_required
- pending
- approved
- rejected
- expired

rendering rule:

| Approval | Visual | 注意 |
| --- | --- | --- |
| not_required | neutral | execution 不要という意味ではない |
| pending | yellow | 承認待ち |
| approved | blue / green | 実行済みではない |
| rejected | red / muted | operation 再検討候補 |
| expired | orange | re-review 候補 |

方針:

- approval badge は approve / reject button ではない
- pending aging は attention として表示する
- approved_not_executed を明示する
- approval missing for execution は audit warning として表示する

---

## ■ Evidence Rendering Rule

evidence rendering は、audit readiness を示す。

values:

- missing
- partial
- available
- not_required

rendering rule:

| Evidence | Visual | 意味 |
| --- | --- | --- |
| missing | red / warning | 必須 evidence がない |
| partial | yellow | 一部 evidence が不足 |
| available | green | 必要 evidence がある |
| not_required | neutral | この operation では不要 |

方針:

- evidence missing は upload button ではなく status として表示する
- post-compare missing は completed operation で強調する
- warehouse boundary evidence missing は high / critical warning 候補とする
- evidence package は source of truth の代替ではないことを detail で説明する

---

## ■ Escalation Rendering Rule

escalation rendering は、review / approval / domain owner attention が必要な signal を示す。

values:

- no_escalation
- reviewer_attention
- approver_attention
- domain_owner_attention
- cross_warehouse_escalation
- recurring_incident_escalation

rendering rule:

- reviewer_attention は medium attention
- approver_attention は high attention
- domain_owner_attention は critical attention
- cross_warehouse_escalation は critical / red
- recurring_incident_escalation は improvement candidate として表示

方針:

- escalation badge は escalate button ではない
- escalation は automatic execution の根拠ではない
- escalation reason を表示する
- unresolved aging / recurring hotspot / repeated failure を context として表示する

---

## ■ Timeline Rendering Rule

timeline rendering は、incident / operation / trace の event を時系列で示す。

timeline 種別:

- incident timeline
- operation timeline
- trace timeline link

rendering rule:

- incident timeline は incident management event を表示する
- operation timeline は lifecycle event を表示する
- trace timeline は source history / business operation への link として表示する
- timeline type を明示する
- missing event は audit warning として表示する候補にする
- event status は read-only label として表示する

非表示 / 非操作:

- timeline event 追加 button
- lifecycle transition button
- replay from timeline button
- correction from timeline button

---

## ■ Compare / Observability / Recovery Rendering Consistency

compare / observability / recovery は、それぞれ rendering semantics が異なる。

| Area | Rendering focus | 禁止する混同 |
| --- | --- | --- |
| Compare | row-level diff / severity / reason | diff severity を approval として描画しない |
| Observability | aggregate health / trend / hotspot | health を incident resolved として描画しない |
| Recovery | incident / operation / approval / evidence / lifecycle | operation state を compare diff として描画しない |

方針:

- shared badge component を使う場合も label / tooltip で意味を分ける
- same color を使う場合でも category を明示する
- compare severity と recovery risk は別 badge とする
- observability health と incident severity は別 badge とする

---

## ■ Cross-dashboard Rendering Consistency

cross-dashboard rendering consistency は、dashboard 間 link と context 表示を一貫させる考え方である。

対象:

- Compare Dashboard
- Observability Dashboard
- Trace Timeline
- Recovery Governance Dashboard

consistency rule:

- warehouse_code は同じ表記で表示する
- trace_id / request_id / parent_trace_id は同じ label を使う
- critical / cross-warehouse は共通して強調する
- read-only dashboard では mutation action を表示しない
- link は reference navigation として表示する

方針:

- Recovery から Compare / Observability / Trace へは reference link とする
- Compare / Observability から Recovery へは incident candidate context として link する将来余地を残す
- dashboard 間 link から execution しない

---

## ■ Execution Rendering を置かない方針

governance dashboard rendering model では、execution rendering を置かない。

置かない rendering:

- execution button
- disabled execution button
- approve / reject button
- retry button
- resolve incident button
- attach evidence button
- auto recover button
- lifecycle transition control

理由:

- rendering model は read-only governance visibility のための設計である
- mutation rendering は controlled execution flow の責務である
- disabled button は future action を示唆し、read-only UX を曖昧にする
- action rendering があると state visualization と state mutation が混ざる
- warehouse boundary / source of truth protection / audit log が未実装の段階で action rendering を置くべきではない

代替 rendering:

- `Suggested next review`
- `Approval required`
- `Evidence missing`
- `Post-compare missing`
- `Retry candidate`
- `Escalation candidate`
- `Read-only reference`

---

## ■ 導入段階案

### Step 0: Rendering Model の明文化

本ドキュメントで rendering semantics / priority / consistency を整理する。

この段階では実装しない。

### Step 1: Data State Rendering Review

対象:

- loading
- skeleton
- partial render
- stale render
- empty
- error

### Step 2: Badge Rendering Review

対象:

- severity
- lifecycle
- approval
- evidence
- escalation
- risk
- warehouse boundary

### Step 3: Timeline Rendering Review

対象:

- incident timeline
- operation timeline
- trace timeline link
- missing event warning

### Step 4: Cross-dashboard Consistency Review

対象:

- compare severity
- observability health
- recovery risk
- warehouse_code
- trace_id / request_id / parent_trace_id
- read-only indication

### Step 5: No Execution Rendering Review

確認:

- execution button がないか
- disabled execution button がないか
- approve / retry / resolve / attach button がないか
- suggested next review が action に見えないか
- loading / empty / error から execution を促していないか

### Step 6: Future UI Implementation Review

React component を実装する場合は、以下を確認する。

- rendering semantics が component boundary と一致しているか
- state machine と rendering が一致しているか
- data contract の status values を正しく描画しているか
- compare / observability / recovery の badge meaning が混ざっていないか
- execution rendering が混入していないか

---

## ■ 今回は実装しない判断

Phase B14-02 では、rendering model design ドキュメントの追加のみを行う。

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
- dashboard rendering 実装
- README変更

理由:

- まず rendering semantics と priority を固定する必要がある
- loading / partial / stale / empty / error の描画方針を実装前に整理する必要がある
- severity / lifecycle / approval / evidence / risk の badge 意味を混同しないための rule が必要である
- execution rendering を置かない方針を明確にする必要がある
- 現時点では read-only governance dashboard の visualization consistency を設計する段階である

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard rendering model は、read-only dashboard が状態をどう描画するかを決める設計であり、operation を実行する設計ではない。

loading / partial / stale / empty / error、severity / lifecycle / approval / evidence / escalation / risk、timeline、cross-dashboard consistency を明確にし、execution rendering を置かないことで、visibility と mutation の境界を守る。
