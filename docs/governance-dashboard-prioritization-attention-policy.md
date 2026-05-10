# Governance Dashboard Prioritization and Attention Policy（Phase B19-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の prioritization semantics / attention routing / review attention guidance を整理する。

Phase B16 から B18 では、information density、navigation workflow、freshness、consistency、trust / confidence、ambiguity / uncertainty の semantics を整理した。そこでは、critical / cross-warehouse / stale / partial / inconsistent / low confidence / unknown / conflicting evidence は read-only visibility / review / investigation / audit の signal であり、execution trigger ではないことを明確にした。

Phase B19-01 では、それらの signal をどのように優先表示し、誰の attention に routing し、どの review / investigation を促すかを整理する。目的は execution priority を作ることではなく、read-only dashboard 上で「何を先に確認すべきか」を誤解なく伝えることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

prioritization and attention policy は、dashboard 上の多数の signal を review / investigation / audit の優先度として整理するための方針である。

基本方針:

- prioritization は read-only review priority として扱う
- attention routing は human review / investigation の誘導である
- critical / cross-warehouse / unresolved aging は強い attention signal とする
- uncertainty / low confidence / conflicting evidence は human investigation attention とする
- hotspot は recurring issue attention であり incident 確定ではない
- escalation attention は automatic execution の根拠ではない
- attention signal は execution permission ではない
- attention fatigue を避ける
- compare / observability / recovery の attention semantics を分ける
- execution prioritization を置かない

---

## ■ Prioritization and Attention Policy の目的

この policy の目的は、operator / reviewer / domain owner / auditor が、限られた時間で「何を先に見るべきか」「誰が見るべきか」「何を追加確認すべきか」を理解できるようにすることである。

答えたい問い:

- critical / high / cross-warehouse をどう優先するか
- reviewer attention と domain owner attention をどう分けるか
- unresolved aging / recurring hotspot / uncertainty をどう扱うか
- attention signal が多い場合に何を上に出すか
- attention が execution instruction に見えていないか
- compare / observability / recovery の attention を混同していないか
- attention fatigue を防げているか
- attention signal から execution workflow が出ていないか

---

## ■ Prioritization Semantics

prioritization は、read-only dashboard 上で review / investigation / audit の順序を決めるための signal である。

priority 候補:

| Priority | 意味 | 主な例 |
| --- | --- | --- |
| critical_attention | 最優先で確認すべき重大 signal | cross-warehouse, critical severity, critical risk |
| high_attention | 業務影響候補として優先確認すべき signal | high severity, failed high risk operation |
| review_attention | reviewer が確認すべき signal | review_required, evidence missing |
| investigation_attention | 原因調査が必要な signal | ambiguous cause, conflicting evidence |
| audit_attention | 監査上の limitation がある signal | missing timeline, stale evidence |
| watch_attention | 継続観測すべき signal | hotspot, trend worsening, aging |

方針:

- priority は display / routing / review のために使う
- priority は execution permission ではない
- priority は severity / risk / confidence / uncertainty をそのまま単一 score にしない
- priority reason を表示できるようにする
- priority は dashboard area ごとに意味を分ける

---

## ■ Attention Routing

attention routing は、どの role がどの signal を確認すべきかを示す read-only guidance である。

role 候補:

- operator
- reviewer
- approver
- domain owner
- incident owner
- technical owner
- auditor

routing 例:

| Signal | Attention route |
| --- | --- |
| review_required diff | reviewer |
| missing evidence | reviewer / auditor |
| cross-warehouse risk | domain owner |
| repeated failed operation | technical owner / incident owner |
| recurring hotspot | operator / technical owner |
| unresolved aging | incident owner / reviewer |
| conflicting evidence | reviewer / auditor |
| trace relation conflict | technical owner |

方針:

- attention route は assignment mutation ではない
- route 表示から owner assign button を出さない
- route は suggested review path として扱う
- high / critical signal では domain owner attention を明示する候補にする
- attention route は audit note の候補として残せるようにする

---

## ■ Critical Attention

critical attention は、重大な業務影響・warehouse boundary・監査 risk がある signal に向ける attention である。

対象:

- critical severity
- critical risk
- cross-warehouse risk
- warehouse_code mismatch
- billing / shipment impact candidate
- source of truth correction candidate with wide scope
- missing warehouse boundary evidence in high risk item

方針:

- critical attention は overview / list / detail で一貫して表示する
- critical attention は badge + reason + affected scope とする
- critical attention は domain owner review 候補とする
- critical attention は execution permission ではない
- critical attention から correction / rebuild / replay button を出さない

---

## ■ Reviewer Attention

reviewer attention は、reviewer が差異・根拠・状態を確認すべき signal である。

対象:

- review_required
- evidence missing
- partial consistency
- low / unknown confidence
- stale data affecting review
- reason_code unknown
- operation failed_needs_review
- approval pending aging

方針:

- reviewer attention は review queue / list / detail で表示する
- reviewer attention は approval mutation ではない
- reviewer attention から approve / reject button を出さない
- suggested next review は短い guidance とする
- reviewer attention は evidence / timeline / compare reference に繋げる

---

## ■ Domain Owner Attention

domain owner attention は、業務境界・倉庫境界・顧客影響・請求/出荷影響など、domain 判断が必要な signal に向ける attention である。

対象:

- cross-warehouse risk
- warehouse boundary unknown
- critical incident
- shipment / billing impact candidate
- wide blast radius candidate
- recurring critical hotspot
- conflicting warehouse boundary evidence

方針:

- domain owner attention は critical / high attention として強調する
- domain owner attention は domain review candidate であり approval execution ではない
- domain owner attention から approve / execute button を出さない
- affected warehouse list / scope / evidence を一緒に表示する
- domain owner attention は audit limitation と関連付けられるようにする

---

## ■ Unresolved Attention

unresolved attention は、長く未解決・未確認のまま残っている signal に向ける attention である。

対象:

- unresolved aging
- pending review aging
- on_hold aging
- failed operation left without review
- evidence missing left unresolved
- post-compare missing
- unresolved ambiguity

方針:

- unresolved attention は aging bucket と一緒に表示する
- unresolved attention は incident owner / reviewer attention として扱う
- unresolved attention は automatic escalation ではなく escalation candidate とする
- unresolved が長い場合も execution button を出さない
- unresolved attention は trend / snapshot と関連付ける候補にする

---

## ■ Hotspot Attention

hotspot attention は、同じ location / project / part / warehouse で繰り返し発生する signal に向ける attention である。

対象:

- recurring location_code
- recurring warehouse_code
- recurring part_no
- recurring project_no
- recurring reason_code
- repeated failed operation
- recurring evidence missing

方針:

- hotspot attention は recurring issue の入口として扱う
- hotspot は incident 確定ではない
- hotspot は execution trigger ではない
- overview では top hotspot に絞る
- detail では related incident / operation / evidence context を表示する
- hotspot attention は observability / recovery link として扱う

---

## ■ Aging Attention

aging attention は、時間経過により review / investigation / audit risk が高まる signal に向ける attention である。

対象:

- review backlog aging
- unresolved aging
- pending approval aging
- stale data aging
- evidence missing aging
- failed operation aging
- incident open duration

方針:

- aging attention は time-based review signal とする
- aging threshold は future policy / config として調整余地を残す
- aging attention は execution trigger ではない
- aging と severity / risk を組み合わせて表示する
- aging が長い場合は reviewer / incident owner attention とする

---

## ■ Uncertainty Attention

uncertainty attention は、不明・曖昧・競合がある signal に向ける attention である。

対象:

- unknown state
- ambiguous cause
- conflicting evidence
- conflicting timeline
- conflicting compare result
- confidence unknown / low
- trust boundary unknown
- warehouse scope unknown

方針:

- uncertainty attention は human investigation candidate とする
- uncertainty は safe ではない
- uncertainty は business incident とも断定しない
- high / critical scope の uncertainty は強調する
- uncertainty attention から automatic correction / rebuild / replay を行わない

---

## ■ Cross-warehouse Attention

cross-warehouse attention は、warehouse_code boundary を跨ぐ risk / ambiguity / inconsistency に向ける最重要 attention である。

対象:

- cross-warehouse risk
- warehouse_code mismatch
- affected warehouse list が multiple
- warehouse boundary evidence missing
- unknown warehouse scope
- trace timeline warehouse mismatch

方針:

- cross-warehouse attention は critical attention として扱う
- list / detail / evidence / timeline で常に見えるようにする
- domain owner attention と関連付ける
- warehouse boundary evidence を表示する
- cross-warehouse attention から execution button を出さない

---

## ■ Escalation Attention

escalation attention は、より強い role / evidence / review が必要な signal に向ける attention である。

trigger 候補:

- high / critical severity
- cross-warehouse risk
- unresolved aging
- recurring hotspot
- repeated failed operation
- missing evidence in high risk operation
- conflicting evidence in critical scope
- billing / shipment impact candidate

方針:

- escalation attention は escalation candidate として表示する
- escalation attention は automatic escalation mutation ではない
- escalation attention は execution permission ではない
- escalation reason と affected scope を表示する
- escalation attention から assign / approve / execute button を出さない

---

## ■ Attention Fatigue Prevention

attention fatigue prevention は、warning / attention が多すぎて重要 signal が埋もれることを避けるための方針である。

方針:

- attention signal を category ごとに整理する
- 同じ理由の warning を重複表示しすぎない
- critical / cross-warehouse を最上位に置く
- low priority signal は grouping / collapse を検討する
- attention reason を短くする
- badge を大量に並べすぎない
- stale / partial / uncertainty / confidence / consistency を混同しない
- attention signal から action area を作らない

表示整理例:

```text
Critical attention:
- Cross-warehouse risk: 2
- Missing warehouse evidence: 1

Review attention:
- Evidence missing: 5
- Reason unknown: 3
```

---

## ■ Compare / Observability / Recovery Attention Separation

compare / observability / recovery は、attention の意味が異なる。

| Area | Attention meaning | 誤解しないこと |
| --- | --- | --- |
| Compare | row-level diff / reason / severity を優先確認する signal | recovery operation execution ではない |
| Observability | backlog / aging / hotspot / trend を継続観測する signal | incident resolution ではない |
| Recovery | incident / operation / approval / evidence / lifecycle を governance review する signal | correction executed ではない |
| Trace | timeline / request chain / relation を調査する signal | replay permission ではない |

方針:

- compare attention と recovery approval を混同しない
- observability attention と incident resolution を混同しない
- recovery attention と execution priority を混同しない
- trace attention と replay eligibility を混同しない
- dashboard 間 link から execution しない

---

## ■ Attention Visualization Policy

attention visualization は、attention level / route / reason / scope を分かりやすく表示するための方針である。

表示候補:

- `Critical attention`
- `Reviewer attention`
- `Domain owner attention`
- `Investigation attention`
- `Audit attention`
- `Hotspot attention`
- `Aging attention`
- `Uncertainty attention`
- `Escalation candidate`

方針:

- attention は badge + reason + affected scope で表示する
- color だけに依存しない
- critical / cross-warehouse は強調する
- attention route を role suggestion として表示する
- attention reason を detail / tooltip で確認できるようにする
- attention visualization から execution affordance を出さない

例:

```text
[CRITICAL ATTENTION]
Reason: cross-warehouse risk detected.
Route: domain owner review recommended.
This is a read-only attention signal. No execution action is available here.
```

---

## ■ Execution Prioritization を置かない方針

read-only governance dashboard では、execution prioritization を置かない。

置かない概念:

- execute high priority first
- critical means rebuild now
- aging means replay now
- attention means approve retry
- hotspot means auto sync
- attention-based auto correction
- attention-based lifecycle transition

理由:

- prioritization / attention は read-only review / investigation / audit のための signal である
- attention signal は原因分類を確定しない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を attention だけで保証できない
- attention を execution priority にすると監査性が弱くなる

代替表現:

- `Review priority`
- `Attention signal`
- `Human review recommended`
- `Domain owner attention`
- `Investigation recommended`
- `Suggested next review`
- `Read-only attention signal`

---

## ■ 導入段階案

### Step 0: Prioritization and Attention Policy の明文化

本ドキュメントで prioritization semantics / attention routing / review attention guidance を整理する。

この段階では実装しない。

### Step 1: Priority Signal Review

確認:

- critical / high / review / investigation / audit / watch attention の意味が明確か
- priority reason が表示できるか
- priority を execution permission として扱っていないか

### Step 2: Attention Routing Review

確認:

- reviewer / domain owner / technical owner / auditor の attention route が分かるか
- route 表示が assignment mutation に見えていないか
- high / critical signal の route が曖昧ではないか

### Step 3: Critical / Cross-warehouse Review

確認:

- critical / cross-warehouse が overview / list / detail で埋もれていないか
- affected warehouse list / boundary evidence が見えるか
- domain owner attention が execution approval と混同されていないか

### Step 4: Hotspot / Aging / Uncertainty Review

確認:

- hotspot を incident / execution trigger と断定していないか
- aging を escalation candidate として扱っているか
- uncertainty / conflicting evidence を human investigation attention として扱っているか

### Step 5: Attention Fatigue Review

確認:

- warning / badge が多すぎないか
- same reason の重複表示を避けているか
- low priority signal を grouping / collapse できる余地があるか

### Step 6: Compare / Observability / Recovery Attention Review

確認:

- compare attention と recovery approval を混同していないか
- observability attention と incident resolution を混同していないか
- recovery attention と execution priority を混同していないか

### Step 7: No Execution Prioritization Review

確認:

- `execute high priority first` のような概念がないか
- attention から correction / rebuild / replay / approval / retry に進んでいないか
- attention warning が read-only signal として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B19-01 では、prioritization and attention policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- attention contract 実装
- attention visualization 実装
- routing / assignment 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず prioritization / attention semantics を固定する必要がある
- review / investigation / audit attention と execution priority を分ける必要がある
- critical / cross-warehouse / hotspot / aging / uncertainty の attention meaning を混同しないための方針が必要である
- execution prioritization を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard prioritization and attention policy は、read-only governance dashboard 上の attention signal を正しく routing するための設計方針である。

prioritization semantics、attention routing、critical / reviewer / domain owner / unresolved / hotspot / aging / uncertainty / cross-warehouse / escalation attention、attention fatigue prevention、attention visualization を整理し、execution prioritization を置かないことで、visibility と mutation の境界を守る。
