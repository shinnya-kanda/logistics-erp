# Recovery Dashboard Information Architecture（Phase B11-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only recovery governance dashboard の情報構造・画面関係・drilldown flow を整理する。

Phase B11-01 では、correction / rebuild / replay / incident / approval / lifecycle を安全な read-only governance UI として可視化する dashboard design を整理した。Phase B11-02 では、その dashboard をどのような top-level navigation、tab structure、drilldown flow、badge、filter / sort / search、timeline linkage として構成するかを整理する。

目的は UI 実装ではなく、compare dashboard / observability dashboard / recovery dashboard の役割を分け、incident → operation → evidence の流れを明確にし、execution button を置かない read-only governance UX の情報構造を定義することである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

recovery dashboard information architecture は、recovery governance 情報を安全に探索・確認するための構造である。

基本方針:

- read-only governance UI として設計する
- execution button は置かない
- approval mutation も初期段階では置かない
- compare / observability / recovery dashboard の役割を分ける
- incident を上位管理単位として扱う
- operation を lifecycle / approval / evidence の単位として扱う
- evidence package は operation / incident の根拠として drilldown する
- operation timeline と trace timeline を混同しない
- warehouse boundary と cross-warehouse risk を常に見える化する
- dashboard 表示結果だけで automatic correction / rebuild / replay を行わない

---

## ■ Dashboard Information Architecture の目的

information architecture の目的は、ユーザーが recovery governance 情報を迷わず辿れるようにすることである。

答えたい問い:

- 今どこに差異・risk・incident があるか
- どの incident が high / critical か
- incident にどの operation が紐づくか
- operation は lifecycle のどこで止まっているか
- approval は pending / approved / rejected / expired のどれか
- evidence package は揃っているか
- operation timeline と trace timeline はどう関係するか
- compare / observability / recovery のどの dashboard を見るべきか

IA がない場合の risk:

- compare result と recovery operation が混ざる
- observability metrics と approval 判断が混ざる
- incident と operation が混ざる
- operation timeline と trace timeline が混ざる
- execution につながる UI と read-only visibility が混ざる
- warehouse boundary risk が見落とされる

---

## ■ Top-level Navigation の考え方

top-level navigation は、dashboard の大きな目的ごとに分ける。

候補:

| Navigation | 主目的 | 主な対象 |
| --- | --- | --- |
| Compare | 現在の差異確認 | quantity diff / severity / reason / review_required |
| Observability | 運用品質の要約 | backlog / critical / aging / hotspot / trend |
| Trace | 業務履歴の追跡 | trace timeline / request_id grouping / parent_trace |
| Recovery | governance 状態確認 | incident / operation / approval / evidence / lifecycle |

方針:

- Compare は「差異がどこにあるか」を見る
- Observability は「運用品質がどう変化しているか」を見る
- Trace は「何が起きたか」を時系列で見る
- Recovery は「差異に対する governance がどう進んでいるか」を見る
- Recovery から execution しない

---

## ■ Dashboard Tab Structure の考え方

recovery dashboard 内では、governance の用途別に tab を分ける。

tab 候補:

- Overview
- Incidents
- Operations
- Pending Approvals
- Failed / Retry
- Evidence
- Timelines

### Overview

目的:

- recovery governance の全体状態を要約する

表示候補:

- open incident count
- high / critical incident count
- pending approval count
- failed operation count
- retry candidate count
- evidence incomplete count
- cross-warehouse risk count

### Incidents

目的:

- incident 単位で業務問題を確認する

表示候補:

- incident list
- severity
- owner
- status
- affected warehouse_code
- related operation count
- recurring hotspot flag

### Operations

目的:

- recovery operation の lifecycle と approval 状態を確認する

表示候補:

- operation queue
- operation_type
- operation_state
- approval_status
- risk_level
- incident_id
- evidence completeness

### Pending Approvals

目的:

- approval 待ち operation を確認する

表示候補:

- required approval role
- pending age
- dry-run / compare reference
- risk_level
- cross-warehouse flag

### Failed / Retry

目的:

- failed operation と retry candidate を確認する

表示候補:

- failure stage
- failure reason
- retry candidate reason
- partial result
- post-failure compare status

### Evidence

目的:

- audit package の揃い具合を確認する

表示候補:

- compare summary status
- dry-run result status
- approval evidence status
- execution evidence status
- post-compare evidence status
- warehouse boundary evidence status

### Timelines

目的:

- incident / operation / trace の timeline を参照する

表示候補:

- incident timeline
- operation timeline
- trace timeline link
- request_id / trace_id / parent_trace_id reference

---

## ■ Incident → Operation → Evidence Drilldown Flow

recovery dashboard の主要 drilldown は、incident → operation → evidence である。

基本 flow:

```text
Incident Summary
  -> Incident Detail
     -> Related Operations
        -> Operation Detail
           -> Evidence Package
              -> Source References / Trace Timeline
```

### Incident Summary

一覧で見るもの:

- incident_id
- title
- severity
- owner
- status
- affected warehouse_code
- related operation count
- latest activity
- recurring hotspot flag

### Incident Detail

詳細で見るもの:

- incident description
- severity history
- ownership
- escalation status
- related compare summary
- related hotspot / trend
- related operations
- incident timeline
- resolution / retrospective status

### Related Operations

incident に紐づく operation を見る。

表示候補:

- operation_id
- operation_type
- operation_state
- approval_status
- risk_level
- dry_run status
- execution status
- post-compare status

### Operation Detail

operation の lifecycle と governance を見る。

表示候補:

- operation lifecycle
- approval evidence summary
- dry-run summary
- execution summary
- failure / retry state
- affected keys
- request_id / trace_id references

### Evidence Package

operation の根拠を見る。

表示候補:

- compare summary
- before / after summary
- dry-run result
- approval evidence
- execution evidence
- post-compare evidence
- trace timeline reference
- warehouse boundary evidence

方針:

- drilldown は read-only とする
- drilldown 先に execution button を置かない
- evidence は source of truth の代替ではなく reference として扱う
- incident resolved と operation completed を混同しない

---

## ■ Operation Timeline Linkage

operation timeline は、recovery operation の lifecycle を時系列で示す。

対象 event:

- requested
- reviewing
- dry_run
- approved
- scheduled
- executing
- completed
- failed
- cancelled
- retry candidate
- evidence attached
- post-compare completed

関連 ID:

- operation_id
- incident_id
- dry_run_id
- request_id
- operation_trace_id
- parent_trace_id
- evidence_package_id

方針:

- operation timeline は operation lifecycle を説明する
- operation timeline は business trace timeline と分ける
- approval event と execution event を分ける
- failed / cancelled / retry candidate を明示する
- timeline から execution しない

---

## ■ Trace Timeline Linkage

trace timeline は、business operation / source history / request execution を時系列で示す。

link したい対象:

- original_trace_id
- correction_trace_id
- rebuild_operation_trace_id
- replay_trace_id
- parent_trace_id
- request_id

方針:

- trace timeline は source history / business operation の説明に使う
- operation timeline から trace timeline へ link できるようにする
- trace timeline から recovery execution へ進まない
- replay では original trace と replay trace の分離を明示する
- correction では original trace と correction trace の関係を明示する
- rebuild では rebuild operation trace と対象 source history を分ける

---

## ■ Compare / Observability / Recovery Dashboard の Navigation 分離

compare dashboard、observability dashboard、recovery dashboard は目的が異なる。

| Dashboard | 入口 | 主な表示 | 次の行動 |
| --- | --- | --- | --- |
| Compare | 現在差異 | row-level diff / severity / reason | manual review / incident candidate |
| Observability | 運用品質 | backlog / aging / hotspot / trend | priority / recurring issue identification |
| Recovery | governance | incident / operation / approval / evidence / lifecycle | review / audit / escalation |

方針:

- Compare から Recovery へは incident candidate としてつなぐ
- Observability から Recovery へは recurring hotspot / high risk signal としてつなぐ
- Recovery から Compare へは post-compare / source diff 確認として戻る
- Recovery から Trace へは original / correction / replay / request chain 確認として link する
- Recovery は execution 画面ではない

---

## ■ Risk Badge System の考え方

risk badge は、incident / operation / evidence / approval の risk を短く伝える表示である。

badge 候補:

- low
- medium
- high
- critical
- cross-warehouse
- missing-evidence
- approval-pending
- failed
- retry-candidate
- post-compare-missing
- recurring-hotspot

方針:

- risk badge は判断補助であり automatic action の根拠ではない
- critical / cross-warehouse は視認性を高くする
- missing evidence は audit readiness の不足として表示する
- badge の意味は glossary / tooltip で説明できるようにする
- severity badge と lifecycle badge を混同しない

---

## ■ Severity / Lifecycle / Approval Status 表示整理

severity、lifecycle、approval status は別の概念として表示する。

| 表示 | 意味 | 例 |
| --- | --- | --- |
| severity | incident / diff の業務影響 | low, medium, high, critical |
| lifecycle | operation の現在状態 | requested, reviewing, dry_run, approved, scheduled, executing, completed, failed, cancelled |
| approval status | execution 承認状態 | pending, approved, rejected, expired, not_required |

方針:

- severity と approval status を同じ badge にしない
- approved は completed ではない
- dry_run completed は execution approved ではない
- failed は approval rejected ではない
- incident severity と operation risk_level を分ける

---

## ■ Filter / Sort / Search の考え方

filter / sort / search は、read-only investigation を支援するために設計する。

filter 候補:

- warehouse_code
- incident severity
- operation risk_level
- operation_type
- operation_state
- approval_status
- owner
- domain_owner
- cross-warehouse risk
- evidence completeness
- recurring hotspot
- date range

sort 候補:

- latest activity
- opened_at
- requested_at
- pending age
- severity
- risk_level
- failed_at
- affected row count

search 候補:

- incident_id
- operation_id
- evidence_package_id
- trace_id
- parent_trace_id
- request_id
- original_trace_id
- replay_trace_id
- warehouse_code
- part_no
- project_no
- location_code
- pallet_code

方針:

- search は read-only とする
- broad search でも warehouse boundary を意識する
- sensitive data / customer data を検索対象にする場合は別途設計する
- filter 結果から execution しない

---

## ■ Warehouse Boundary Visibility の考え方

warehouse boundary visibility は、dashboard 上で operation / incident がどの warehouse_code に属するかを明確にする設計である。

表示候補:

- primary warehouse_code
- affected warehouse_code list
- requested warehouse_code
- approved warehouse_code
- execution affected warehouse_code
- source rows warehouse_code
- projection rows warehouse_code
- trace timeline warehouse_code
- cross-warehouse risk flag

方針:

- warehouse_code は list / detail / timeline / evidence で常に確認できるようにする
- warehouse_code が不明な item は warning / high risk として扱う候補にする
- cross-warehouse は critical risk として強調する
- cross-warehouse item から execution できる UI は置かない
- warehouse boundary evidence と関連付ける

---

## ■ Read-only Governance UX の考え方

read-only governance UX は、状態と根拠を確認しやすくしつつ、誤実行を防ぐ UX である。

UX 方針:

- view header に read-only / no execution を明示する
- list では severity / lifecycle / approval / warehouse を分けて表示する
- detail では incident / operation / evidence / trace を段階的に見せる
- missing evidence や post-compare missing を分かりやすく表示する
- next action は suggestion として表示し、button execution にはしない
- destructive / mutating action を置かない
- disabled execution button も初期段階では置かない

理由:

- disabled button は「将来押せるもの」と誤解されやすい
- governance visibility と execution flow を混ぜると監査性が弱くなる
- read-only であることを UI 構造で明確にする必要がある

---

## ■ Execution Button を置かない IA 方針

recovery dashboard IA では、execution button を置かない。

置かない対象:

- correction execution
- rebuild execution
- replay execution
- retry execution
- approval mutation
- incident resolution mutation
- evidence attachment mutation
- automatic recovery

理由:

- approval boundary / lifecycle / evidence package の実装が先に必要である
- execution と read-only governance は責務が異なる
- execution button があると compare-only / visibility first の前提が崩れる
- cross-warehouse risk / blast radius / source of truth protection を UI だけで保証できない
- post-compare / audit package / incident resolution まで一連で設計する必要がある

将来条件:

- approval boundary 実装済み
- lifecycle state 実装済み
- evidence package 実装済み
- warehouse boundary enforcement 実装済み
- post-compare 実装済み
- audit log 実装済み
- rollback / compensation policy の運用確認済み

---

## ■ 導入段階案

### Step 0: IA の明文化

本ドキュメントで recovery dashboard の情報構造を整理する。

この段階では実装しない。

### Step 1: Navigation / Tab Model の確認

候補:

- top-level navigation
- recovery dashboard tabs
- incident detail
- operation detail
- evidence detail
- timeline detail

Markdown / wireframe レベルで確認する。

### Step 2: Drilldown Flow の確認

対象:

- incident → operation → evidence
- operation → operation timeline
- operation → trace timeline
- incident → compare / observability context
- evidence → source references

### Step 3: Badge / Status Glossary

対象:

- risk badge
- severity badge
- lifecycle badge
- approval badge
- evidence completeness badge
- warehouse boundary marker

### Step 4: Filter / Sort / Search Design

対象:

- warehouse_code
- severity / risk
- lifecycle
- approval_status
- incident owner
- trace_id / request_id
- affected business keys

### Step 5: Read-only UX Mock

候補:

- static mock
- no API
- no execution button
- no approval mutation
- clear read-only labels

### Step 6: Data Contract Candidate

候補:

- incident summary contract
- operation summary contract
- evidence summary contract
- timeline summary contract
- dashboard aggregate contract

Edge Function / RPC 実装は別 phase とする。

### Step 7: Future Implementation Review

UI 実装を検討する場合は、以下を確認する。

- existing dashboard と navigation が衝突しないか
- read-only が明確か
- execution button がないか
- warehouse boundary が見えるか
- observability / recovery の役割が分かれているか
- drilldown flow が分かりやすいか

---

## ■ 今回は実装しない判断

Phase B11-02 では、information architecture ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- recovery dashboard component
- dashboard API
- README変更

理由:

- まず information architecture と drilldown flow を固定する必要がある
- compare / observability / recovery dashboard の役割分離を実装前に明確にする必要がある
- execution button を置かない IA 方針を先に固定する必要がある
- incident / operation / evidence / timeline の関係を明確にしないまま UI を作ると、監査性と説明性が弱くなる
- 現時点では read-only governance UX を設計する段階である

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

recovery dashboard information architecture は、execution flow ではなく read-only governance exploration の構造である。

incident → operation → evidence の drilldown を中心に、operation timeline と trace timeline を分け、compare / observability / recovery dashboard の役割を分離する。execution button は置かず、risk / severity / lifecycle / approval / warehouse boundary を読み取りやすくすることで、安全な governance visibility を優先する。
