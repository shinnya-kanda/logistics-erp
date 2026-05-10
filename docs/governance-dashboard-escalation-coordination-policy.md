# Governance Dashboard Escalation and Coordination Policy（Phase B19-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の escalation semantics / coordination semantics / cross-role coordination / cross-warehouse coordination を整理する。

Phase B19-01 では、prioritization / attention semantics を整理し、critical / cross-warehouse / unresolved aging / hotspot / uncertainty などを review / investigation / audit の attention signal として扱う方針を定義した。そこでは、attention routing は assignment mutation ではなく、human review / investigation の誘導であること、execution prioritization を置かないことを明確にした。

Phase B19-02 では、それらの attention signal が複数 role や複数 warehouse にまたがる場合に、どのように escalation と coordination を見える化するかを整理する。目的は assignment や approval / execution を実装することではなく、read-only dashboard 上で「誰と連携すべきか」「どの boundary を確認すべきか」「未解決 escalation が残っているか」を誤解なく伝えることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

escalation and coordination policy は、read-only governance dashboard 上で role / warehouse / incident / audit の連携状態を安全に表示するための方針である。

基本方針:

- escalation は stronger review / evidence / role attention の signal として扱う
- coordination は read-only visibility / context sharing として扱う
- coordination は assignment mutation ではない
- escalation は approval / execution permission ではない
- cross-role coordination と cross-warehouse coordination を分ける
- unresolved escalation は audit limitation として扱う
- compare / observability / recovery の coordination semantics を分ける
- coordination without mutation を徹底する
- execution escalation を置かない

---

## ■ Escalation and Coordination Policy の目的

この policy の目的は、operator / reviewer / approver / domain owner / incident owner / technical owner / auditor が、read-only dashboard 上で必要な連携先と未解決の escalation context を理解できるようにすることである。

答えたい問い:

- どの signal が escalation candidate か
- escalation は誰の attention を必要としているか
- reviewer と domain owner の coordination はどう見えるべきか
- cross-warehouse risk がある場合、どの warehouse boundary を確認すべきか
- incident / operation / evidence / timeline の coordination context はどう繋がるか
- escalation が unresolved のまま残っていないか
- coordination が assignment / approval / execution に見えていないか
- escalation signal から execution workflow が出ていないか

---

## ■ Escalation Semantics

escalation は、通常の review より強い role / evidence / attention が必要な状態を示す。

trigger 候補:

- high / critical severity
- cross-warehouse risk
- warehouse boundary unknown
- unresolved aging
- recurring hotspot
- repeated failed operation
- conflicting evidence in critical scope
- missing evidence in high risk operation
- shipment / billing impact candidate
- source of truth correction candidate with wide scope

方針:

- escalation は automatic execution の根拠ではない
- escalation は role attention / evidence strengthening / audit limitation の signal とする
- escalation candidate と escalated / reviewed / resolved を混同しない
- escalation reason と affected scope を表示する
- escalation から assign / approve / execute button を出さない

表示候補:

- `Escalation candidate`
- `Domain owner attention recommended`
- `Cross-warehouse escalation`
- `Unresolved escalation`
- `Evidence escalation required`

---

## ■ Coordination Semantics

coordination は、複数 role / warehouse / dashboard / evidence が同じ issue を確認するための context sharing である。

coordination 対象:

- incident owner と reviewer
- reviewer と domain owner
- domain owner と technical owner
- auditor と evidence owner
- source warehouse と affected warehouse
- compare / observability / recovery / trace dashboard

方針:

- coordination は read-only context の見える化である
- coordination は assignment mutation ではない
- coordination は approval mutation ではない
- coordination は execution workflow ではない
- coordination context は incident / operation / evidence / timeline に紐づけて表示する
- coordination gap は audit limitation / unresolved attention として扱う

表示候補:

- `Coordination context`
- `Related role attention`
- `Cross-role review recommended`
- `Coordination gap`
- `Read-only coordination reference`

---

## ■ Cross-role Coordination

cross-role coordination は、複数 role が同じ incident / operation / evidence を確認する必要がある状態を示す。

role 候補:

- operator
- reviewer
- approver
- domain owner
- incident owner
- technical owner
- auditor

coordination 例:

| Context | Coordination |
| --- | --- |
| review_required diff + evidence missing | operator / reviewer |
| high severity + approval pending | reviewer / approver |
| cross-warehouse risk | reviewer / domain owner |
| trace relation conflict | reviewer / technical owner |
| audit evidence gap | reviewer / auditor |
| recurring hotspot | incident owner / technical owner |

方針:

- cross-role coordination は role suggestion として表示する
- role suggestion は assignment action ではない
- role が複数ある場合は responsibility を分けて説明する
- role conflict / missing owner は coordination gap として表示する
- cross-role coordination から assign / approve / execute button を出さない

---

## ■ Cross-warehouse Coordination

cross-warehouse coordination は、複数 warehouse_code または warehouse boundary 不明な scope が関係する場合の coordination である。

対象:

- affected warehouse list
- requested warehouse_code
- source rows warehouse_code
- projection rows warehouse_code
- trace timeline warehouse_code
- evidence warehouse_code
- cross-warehouse risk flag
- unknown warehouse scope

方針:

- cross-warehouse coordination は critical coordination として扱う
- warehouse_code boundary を最重要 boundary として表示する
- source warehouse / affected warehouse / unknown warehouse を分ける
- cross-warehouse は原則 execution 対象外として扱う既存方針を尊重する
- cross-warehouse coordination から execution button を出さない
- domain owner attention と warehouse boundary evidence を関連付ける

表示候補:

- `Cross-warehouse coordination required`
- `Affected warehouse list`
- `Warehouse boundary evidence missing`
- `Unknown warehouse scope`
- `Domain owner coordination recommended`

---

## ■ Reviewer Coordination

reviewer coordination は、reviewer が compare / evidence / lifecycle / uncertainty を確認するための連携 context である。

対象:

- review_required
- reason_code unknown
- evidence missing
- low / unknown confidence
- conflicting evidence
- partial consistency
- failed operation needing review

方針:

- reviewer coordination は review path の可視化である
- reviewer coordination は approval mutation ではない
- reviewer coordination から approve / reject button を出さない
- evidence / timeline / compare reference を辿れるようにする
- reviewer coordination gap は unresolved attention として扱う

---

## ■ Domain Owner Coordination

domain owner coordination は、domain 境界・warehouse 境界・shipment / billing impact など、domain 判断が必要な context を見える化する。

対象:

- critical incident
- cross-warehouse risk
- shipment / billing impact candidate
- wide blast radius candidate
- conflicting warehouse boundary evidence
- recurring critical hotspot
- source of truth correction candidate

方針:

- domain owner coordination は critical / high coordination として強調する
- domain owner coordination は approval execution ではない
- affected scope / warehouse boundary / evidence limitation を一緒に表示する
- domain owner coordination から approve / execute button を出さない
- domain owner coordination は audit note の候補として扱う

---

## ■ Incident Coordination

incident coordination は、incident を中心に related diff / operation / evidence / timeline / role attention を束ねる考え方である。

coordination context:

- incident_id
- incident owner
- severity / risk
- affected warehouse_code
- related differences
- related operations
- evidence package
- incident timeline
- unresolved ambiguity
- escalation candidate

方針:

- incident は coordination の上位単位として扱う
- operation completed は incident coordinated / resolved を意味しない
- incident coordination は recovery execution ではない
- unresolved coordination gap は incident detail で見えるようにする
- incident coordination から resolve / execute button を出さない

---

## ■ Audit Coordination

audit coordination は、auditor が evidence / timeline / approval / warehouse boundary / limitation を追えるようにする coordination である。

対象:

- evidence_package_id
- approval status
- lifecycle state
- warehouse boundary evidence
- generated_at / snapshot date
- stale / partial / consistency / confidence / uncertainty limitation
- conflicting evidence pair
- missing timeline range

方針:

- audit coordination は audit trail の見える化である
- audit package は source of truth の代替ではない
- audit coordination は attachment / evidence edit action ではない
- audit limitation を隠さない
- audit coordination から attach / edit / approve / execute button を出さない

---

## ■ Unresolved Escalation Handling

unresolved escalation は、escalation candidate が残っているが、必要な review / evidence / coordination が完了していない状態である。

例:

- domain owner attention が必要だが確認 context が不足
- cross-warehouse risk があるが warehouse boundary evidence が missing
- unresolved aging が threshold を超えている
- conflicting evidence が未解決
- repeated failed operation の technical owner context がない
- incident owner が不明

方針:

- unresolved escalation を resolved と表示しない
- unresolved escalation は attention / audit limitation として表示する
- high / critical scope の unresolved escalation は強調する
- unresolved escalation は automatic escalation mutation ではない
- unresolved escalation から assignment / approval / execution button を出さない

表示候補:

- `Unresolved escalation`
- `Coordination gap`
- `Domain owner attention pending`
- `Warehouse boundary evidence missing`
- `Incident owner unknown`

---

## ■ Escalation Limitation

escalation limitation は、escalation signal を解釈する際の制約である。

limitation 候補:

- evidence incomplete
- stale data
- partial consistency
- unknown confidence
- ambiguous cause
- conflicting timeline
- missing warehouse boundary evidence
- unknown owner / role context

方針:

- escalation limitation は audit limitation として説明できるようにする
- escalation limitation は escalation reason と分けて表示する
- limitation がある場合でも automatic execution に進まない
- limitation は human review / investigation の対象とする
- limitation を隠して escalation resolved と表示しない

---

## ■ Coordination Visibility

coordination visibility は、誰が・何を・どの context で確認すべきかを read-only に見えるようにする方針である。

表示候補:

- role attention
- related incident / operation / evidence
- affected warehouse list
- coordination gap
- escalation candidate
- unresolved escalation
- audit limitation
- reference links

方針:

- coordination visibility は mutation state ではない
- current assignee / owner を future field として表示する場合も assignment button を置かない
- reference link は read-only navigation とする
- coordination visibility から approval / execution / assignment affordance を出さない
- coordination context は audit trail と関連付けられるようにする

---

## ■ Compare / Observability / Recovery Coordination Separation

compare / observability / recovery は、coordination の意味が異なる。

| Area | Coordination meaning | 誤解しないこと |
| --- | --- | --- |
| Compare | diff / reason / severity を誰が確認すべきか | recovery operation assignment ではない |
| Observability | backlog / hotspot / trend を誰が継続観測すべきか | incident resolution ではない |
| Recovery | incident / operation / approval / evidence / lifecycle を誰が review すべきか | correction executed ではない |
| Trace | timeline / request chain / relation を誰が調査すべきか | replay permission ではない |

方針:

- compare coordination と recovery assignment を混同しない
- observability coordination と incident ownership を混同しない
- recovery coordination と approval mutation を混同しない
- trace coordination と replay workflow を混同しない
- dashboard 間 link から execution しない

---

## ■ Coordination Without Mutation 方針

read-only governance dashboard では、coordination を mutation として扱わない。

置かない mutation:

- owner assignment
- reviewer assignment
- approver assignment
- domain owner assignment
- escalation state change
- incident resolution
- approval / rejection
- evidence attachment / edit
- lifecycle transition

方針:

- coordination は visibility / reference / guidance に限定する
- role / owner / escalation 表示は read-only data として扱う
- suggested coordination は button ではなく label / badge / reference とする
- coordination gap は audit limitation として扱う
- future mutation flow を作る場合は別設計とする

代替表示:

- `Reviewer attention recommended`
- `Domain owner coordination recommended`
- `Incident owner unknown`
- `Coordination gap`
- `Read-only coordination reference`

---

## ■ Execution Escalation を置かない方針

read-only governance dashboard では、execution escalation を置かない。

置かない概念:

- escalate to execute
- escalation means approve
- cross-warehouse escalation means rebuild now
- unresolved escalation means replay now
- domain owner attention means execute
- escalation-based auto correction
- escalation-based lifecycle transition

理由:

- escalation は read-only review / evidence / role attention の signal である
- coordination は assignment / approval / execution mutation ではない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を escalation だけで保証できない
- escalation を execution trigger にすると監査性が弱くなる

代替表現:

- `Escalation candidate`
- `Coordination required`
- `Domain owner attention recommended`
- `Reviewer coordination recommended`
- `Audit limitation`
- `Read-only escalation signal`

---

## ■ 導入段階案

### Step 0: Escalation and Coordination Policy の明文化

本ドキュメントで escalation semantics / coordination semantics / cross-role coordination / cross-warehouse coordination を整理する。

この段階では実装しない。

### Step 1: Escalation Semantics Review

確認:

- escalation candidate と execution permission を分けているか
- escalation reason / affected scope / limitation を表示できるか
- escalation から assign / approve / execute button が出ていないか

### Step 2: Cross-role Coordination Review

確認:

- reviewer / approver / domain owner / technical owner / auditor の role attention が分かるか
- role suggestion が assignment mutation に見えていないか
- role conflict / owner missing を coordination gap として扱っているか

### Step 3: Cross-warehouse Coordination Review

確認:

- affected warehouse list / unknown warehouse scope / boundary evidence が見えるか
- cross-warehouse coordination が critical coordination として扱われているか
- cross-warehouse coordination から execution していないか

### Step 4: Incident / Audit Coordination Review

確認:

- incident を coordination の上位単位として見られるか
- audit evidence / timeline / limitation を辿れるか
- operation completed を incident resolved と見せていないか

### Step 5: Coordination Without Mutation Review

確認:

- assignment mutation がないか
- approval / rejection mutation がないか
- evidence attach / edit mutation がないか
- suggested coordination が button に見えていないか

### Step 6: No Execution Escalation Review

確認:

- `escalate to execute` のような概念がないか
- escalation から correction / rebuild / replay / approval / retry に進んでいないか
- escalation warning が read-only signal として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B19-02 では、escalation and coordination policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- escalation contract 実装
- coordination visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず escalation / coordination semantics を固定する必要がある
- cross-role / cross-warehouse coordination と assignment / execution mutation を分ける必要がある
- unresolved escalation / coordination gap を audit limitation として扱う方針が必要である
- execution escalation を置かない方針を明確にする必要がある

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
- `docs/governance-dashboard-navigation-workflow-policy.md`
- `docs/governance-dashboard-data-freshness-policy.md`
- `docs/governance-dashboard-consistency-semantics-policy.md`
- `docs/governance-dashboard-trust-confidence-policy.md`
- `docs/governance-dashboard-ambiguity-uncertainty-policy.md`
- `docs/governance-dashboard-prioritization-attention-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard escalation and coordination policy は、read-only governance dashboard 上の escalation / coordination signal を正しく解釈するための設計方針である。

escalation semantics、coordination semantics、cross-role coordination、cross-warehouse coordination、reviewer / domain owner / incident / audit coordination、unresolved escalation、coordination visibility、coordination without mutation を整理し、execution escalation を置かないことで、visibility と mutation の境界を守る。
