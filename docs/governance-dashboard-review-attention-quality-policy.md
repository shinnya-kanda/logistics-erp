# Governance Dashboard Review Attention Quality Policy（Phase B25-01）

作成日: 2026-05-11

---

## ■ 目的

このドキュメントは、governance dashboard の review attention quality / review signal quality / attention routing quality を継続 review する governance を整理する。

Phase B19 では、prioritization / attention semantics と escalation / coordination semantics を整理し、attention は read-only review / investigation / audit のための signal であり、assignment mutation や execution priority ではないことを明確にした。Phase B20 以降では、review heuristics、operator safety、explainability、lineage、semantic consistency、boundary drift、integrity degradation を整理し、attention signal を人間が安全に読み解くための前提を固めた。

Phase B25-01 では、attention signal 自体の品質を継続的に review するために、review attention quality、review signal quality、attention routing quality、noise / false-positive、attention degradation の観点を定義する。目的は、重要 signal が埋もれず、過剰な attention が fatigue を生まず、attention が execution instruction に見えない状態を維持することである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

review attention quality policy は、dashboard 上の attention signal が review / investigation / audit のために十分に明確で、過不足なく、誤読されにくいかを継続的に確認するための方針である。

基本方針:

- attention は read-only review signal として扱う
- attention quality は governance quality の一部として扱う
- review signal は reason / scope / limitation と一緒に表示する
- attention route は assignment mutation ではない
- prioritization は execution priority ではない
- noise / false-positive を意識する
- uncertainty / escalation / cross-dashboard attention を分けて review する
- attention degradation を隠さない
- attention review は human review を補助する
- execution attention remediation を置かない

---

## ■ Review Attention Quality Policy の目的

この policy の目的は、operator / reviewer / domain owner / auditor が、どの signal に注意を向けるべきかを安全に理解できるようにすることである。

答えたい問い:

- attention signal は過不足なく表示されているか
- critical / cross-warehouse / unresolved aging が埋もれていないか
- low-value signal が多すぎて fatigue を起こしていないか
- attention reason / scope / limitation が説明されているか
- attention routing が assignment mutation に見えていないか
- escalation attention が execution escalation に見えていないか
- uncertainty attention が safe / resolved と誤読されていないか
- cross-dashboard link により attention の意味が変わっていないか
- attention quality degradation が review note / limitation として扱われているか

---

## ■ Review Attention Quality Semantics

review attention quality は、attention signal が review / investigation / audit の入口として有用で、理解しやすく、過剰でも不足でもない状態を示す。

quality 観点:

- relevance
- clarity
- specificity
- severity alignment
- scope clarity
- reason clarity
- routing clarity
- noise control
- false-positive awareness
- fatigue prevention

方針:

- review attention quality は operation correctness ではない
- attention high は execution permission ではない
- attention low は safe ではない
- attention quality gap は review limitation として扱う
- attention quality から correction / rebuild / replay を実行しない

---

## ■ Review Signal Quality

review signal quality は、review_required / warning / priority / confidence / uncertainty / escalation candidate などの signal が review の入口として適切かを示す。

確認対象:

- signal type
- reason_code / reason_text
- severity / risk
- affected scope
- warehouse_code boundary
- generated_at / freshness
- confidence / uncertainty
- evidence completeness
- lineage limitation
- semantic limitation

方針:

- signal は category / reason / scope / limitation と一緒に扱う
- signal が原因確定に見えないようにする
- signal が execution instruction に見えないようにする
- stale / partial / unknown signal は safe と見せない
- review signal gap は attention quality limitation とする

---

## ■ Attention Routing Quality

attention routing quality は、どの role がどの signal を確認すべきかが明確で、assignment mutation に見えない状態を示す。

role 候補:

- operator
- reviewer
- domain owner
- incident owner
- technical owner
- auditor
- approver

方針:

- attention route は role suggestion として扱う
- route 表示は assignment mutation ではない
- role が複数ある場合は responsibility を分けて説明する
- high / critical signal では domain owner / auditor attention を明示する候補にする
- routing gap は coordination / audit limitation として扱う
- attention routing から assign / approve / execute button を出さない

---

## ■ Review Prioritization Quality

review prioritization quality は、attention signal の順序や強調が review / investigation / audit に適しているかを示す。

優先観点:

- critical / cross-warehouse
- high risk
- unresolved aging
- evidence missing
- low / unknown confidence
- uncertainty / conflict
- recurring hotspot
- audit limitation

方針:

- prioritization は review order の補助である
- prioritization は execution priority ではない
- severity / risk / confidence / uncertainty を単一 score にしない
- critical / cross-warehouse を埋もれさせない
- low priority signal は grouping / collapse の候補にする
- prioritization quality gap は fatigue / safety risk として扱う

---

## ■ Review Noise / False-positive Quality

review noise / false-positive quality は、attention signal が多すぎる、重複する、または誤検知により review fatigue を生んでいないかを確認する。

noise 候補:

- duplicate warning
- repeated same reason
- low-value alert
- stale snapshot alert repeated
- hotspot false-positive
- uncertainty over-labeling
- confidence warning without reason
- redundant escalation candidate

方針:

- noise は attention quality degradation として扱う
- false-positive 可能性を隠さない
- duplicate attention は grouping 候補にする
- low-value attention は collapse / detail 表示候補にする
- false-positive candidate は resolved ではない
- noise reduction から automatic remediation を行わない

---

## ■ Escalation Attention Quality

escalation attention quality は、通常 review より強い role / evidence / audit attention が必要な signal が適切に表示されているかを示す。

確認対象:

- escalation candidate
- domain owner attention
- cross-warehouse escalation
- unresolved escalation
- evidence escalation
- recurring incident escalation
- coordination gap

方針:

- escalation attention は stronger review signal である
- escalation は assignment / approval / execution permission ではない
- escalation reason / affected scope / role suggestion を表示する
- unresolved escalation は audit limitation として扱う
- escalation attention から assign / approve / execute button を出さない

---

## ■ Uncertainty Attention Quality

uncertainty attention quality は、unknown / ambiguous / conflicting な状態が review / investigation attention として適切に扱われているかを示す。

確認対象:

- unknown state
- ambiguous cause
- conflicting evidence
- conflicting timeline
- conflicting compare result
- low / unknown confidence
- unresolved ambiguity
- warehouse scope unknown

方針:

- uncertainty attention は safe ではない
- uncertainty attention は business failure の確定でもない
- unknown field / conflicting pair / unchecked scope を説明する
- uncertainty reason と confidence reason を分ける
- uncertainty attention から automatic resolution を行わない

---

## ■ Cross-dashboard Attention Quality

cross-dashboard attention quality は、compare / observability / recovery / trace の間で attention の意味が一貫しているかを確認する。

review 対象:

- Compare -> Recovery attention context
- Observability -> Recovery hotspot / trend attention
- Recovery -> Trace investigation attention
- Trace -> Recovery incident / operation attention
- shared attention badge
- shared tooltip
- shared warehouse_code / trace_id labels
- related reference link

方針:

- compare attention は diff review の入口である
- observability attention は operational quality review の入口である
- recovery attention は governance review の入口である
- trace attention は timeline / request chain investigation の入口である
- dashboard 間 link は read-only reference とする
- cross-dashboard attention から execution workflow を開始しない

---

## ■ Attention Degradation Semantics

attention degradation は、attention signal の品質が低下し、重要 signal の見落とし、誤読、fatigue、境界違反の risk が高まる状態である。

degradation 候補:

- critical attention が埋もれる
- attention reason が欠落する
- routing が曖昧になる
- duplicate alert が増える
- false-positive が増える
- uncertainty attention が safe に見える
- escalation attention が assignment に見える
- prioritization が execution priority に見える
- cross-dashboard attention が意味を変える

方針:

- attention degradation は governance quality degradation として扱う
- attention degradation は business incident の確定ではない
- attention degradation は review / investigation / audit limitation として扱う
- repeated degradation は prioritization / boundary / semantic review に戻す
- attention degradation から execution remediation を行わない

---

## ■ Attention Review Heuristics

attention review heuristics は、attention quality degradation を human review で見つけやすくするための観点である。

検知観点:

- critical / cross-warehouse が overview / list / detail で見えるか
- attention reason / affected scope / limitation が説明されているか
- attention route が assignment に見えていないか
- duplicate / low-value attention が多すぎないか
- uncertainty / low confidence が safe と見えていないか
- escalation candidate が execution escalation に見えていないか
- hotspot / aging が automatic correction に見えていないか
- cross-dashboard link 先でも attention meaning が維持されているか

方針:

- heuristics は detection support であり automatic remediation ではない
- high / critical attention quality issue は human review recommended とする
- false-positive awareness を持つ
- repeated issue は attention / semantic / boundary review に戻す
- heuristic result から execution action を出さない

---

## ■ Attention Review Lifecycle

attention review lifecycle は、attention quality issue candidate を発見してから整理・確認・記録するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | attention quality issue candidate が見つかった |
| reviewing | affected signal / scope / route を review 中 |
| classified | issue type を分類した |
| noise_candidate | noise / false-positive 候補として扱う |
| routing_limitation_recorded | routing limitation として説明可能にした |
| review_recommended | human review recommended とした |
| attention_quality_reaffirmed | attention quality が保たれていると確認した |

方針:

- attention review lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- noise_candidate は resolved ではない
- routing_limitation_recorded は assignment ではない
- lifecycle から assignment mutation を行わない

---

## ■ Attention Visualization Policy

attention visualization は、attention quality / signal reason / route / limitation を読みやすく表示するための方針である。

表示候補:

- `Review attention`
- `Attention quality`
- `Attention reason`
- `Attention route`
- `Routing limitation`
- `Noise candidate`
- `False-positive candidate`
- `Escalation attention`
- `Uncertainty attention`
- `Human review recommended`
- `No execution remediation`

方針:

- attention visualization は review signal として扱う
- attention badge は action button にしない
- attention reason / route / affected scope / limitation を短く表示する
- route は role suggestion として表示する
- color だけに依存しない
- attention visualization から execution affordance を出さない

例:

```text
[REVIEW ATTENTION]
Reason: missing post-compare evidence and low confidence.
Route: reviewer / auditor attention recommended.
Limitation: evidence package completeness is unknown.
This is a read-only attention signal. No assignment, approval, retry, correction, rebuild, replay, or sync is executed here.
```

---

## ■ Execution Attention Remediation を置かない方針

read-only governance dashboard では、execution attention remediation を置かない。

置かない概念:

- attention high, execute correction
- critical attention, run rebuild
- uncertainty attention, replay operation
- noise detected, auto suppress signal
- routing issue, assign owner
- escalation attention, approve operation
- hotspot attention, auto sync
- attention review triggers retry

理由:

- attention review は read-only governance quality review である
- attention は review / investigation / audit の補助である
- remediation には別の design / review / implementation process が必要である
- automatic remediation 自体が mutation / automation になり得る
- source of truth protection / warehouse boundary / blast radius を attention remediation だけで保証できない
- execution attention remediation を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Review attention`
- `Attention quality limitation`
- `Human review recommended`
- `Routing limitation`
- `Noise candidate`
- `No execution remediation`

---

## ■ 導入段階案

### Step 0: Review Attention Quality Policy の明文化

本ドキュメントで review attention quality / review signal quality / attention routing quality の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Review Attention Semantics Review

確認:

- attention が execution permission として扱われていないか
- attention high が automatic recovery に見えていないか
- attention low / absent が safe と見えていないか

### Step 2: Signal / Routing Quality Review

確認:

- review signal に reason / scope / limitation があるか
- attention route が assignment mutation に見えていないか
- role suggestion と approval / execution state が混同されていないか

### Step 3: Prioritization / Noise Review

確認:

- critical / cross-warehouse が埋もれていないか
- duplicate / low-value attention が多すぎないか
- false-positive candidate を resolved と見せていないか

### Step 4: Escalation / Uncertainty Attention Review

確認:

- escalation attention が assignment / approval / execution に見えていないか
- uncertainty attention が safe と見えていないか
- unresolved ambiguity / conflicting evidence が limitation として説明されているか

### Step 5: Cross-dashboard Attention Review

確認:

- compare / observability / recovery / trace の attention role が分かれているか
- dashboard 間 link が read-only reference として扱われているか
- link 先で attention meaning が変わっていないか

### Step 6: No Execution Attention Remediation Review

確認:

- `attention high, execute correction` のような概念がないか
- attention review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- attention review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B25-01 では、review attention quality policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- attention review contract 実装
- attention visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず review attention quality / review signal quality semantics を固定する必要がある
- attention routing quality / prioritization quality / noise quality を review 可能にする必要がある
- escalation / uncertainty / cross-dashboard attention の品質を整理する必要がある
- execution attention remediation を置かない方針を明確にする必要がある

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
- `docs/governance-dashboard-escalation-coordination-policy.md`
- `docs/governance-dashboard-review-investigation-heuristics-policy.md`
- `docs/governance-dashboard-cognitive-load-safety-policy.md`
- `docs/governance-dashboard-explainability-rationale-policy.md`
- `docs/governance-dashboard-provenance-lineage-policy.md`
- `docs/governance-dashboard-semantic-consistency-review.md`
- `docs/governance-dashboard-semantic-evolution-policy.md`
- `docs/governance-dashboard-policy-boundary-review.md`
- `docs/governance-dashboard-boundary-drift-review-policy.md`
- `docs/governance-dashboard-integrity-review-policy.md`
- `docs/governance-dashboard-integrity-degradation-review-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard review attention quality policy は、read-only governance dashboard の review attention quality / review signal quality / attention routing quality を継続的に review し、重要 signal の見落とし・attention fatigue・誤った routing・execution への誤誘導を防ぐための方針である。

review signal quality、attention routing quality、review prioritization quality、review noise / false-positive quality、escalation attention quality、uncertainty attention quality、cross-dashboard attention quality、attention degradation、attention review heuristics、attention review lifecycle を整理し、execution attention remediation を置かないことで、visibility と mutation の境界を守る。
