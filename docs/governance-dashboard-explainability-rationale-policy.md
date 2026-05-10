# Governance Dashboard Explainability and Rationale Policy（Phase B21-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の explainability semantics / rationale semantics / human understandable reasoning を整理する。

Phase B15 から B20 では、accessibility / usability、terminology、information density、navigation workflow、freshness、consistency、trust / confidence、ambiguity / uncertainty、prioritization / attention、escalation / coordination、review / investigation heuristics、cognitive load / operator safety を整理した。そこでは、dashboard 上の signal は read-only review / investigation / audit のための補助であり、assignment mutation や execution trigger ではないことを明確にした。

Phase B21-01 では、それらの signal について「なぜこの warning が出ているのか」「なぜこの priority なのか」「なぜ confidence が低いのか」「なぜ uncertainty と扱うのか」を人間が理解できる形で説明するための方針を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

explainability and rationale policy は、dashboard 上の signal の理由を operator / reviewer / domain owner / auditor が理解できるようにするための方針である。

基本方針:

- explanation は read-only interpretation support として扱う
- rationale は review / investigation / audit の補助である
- rationale は correctness guarantee ではない
- rationale は assignment / approval / execution permission ではない
- warning / priority / confidence / uncertainty には理由を添える
- explanation は human understandable な表現にする
- explanation limitation を隠さない
- compare / observability / recovery の explainability semantics を分ける
- rationale traceability を保つ
- execution rationale を置かない

---

## ■ Explainability and Rationale Policy の目的

この policy の目的は、dashboard の signal が「なぜそう表示されているか」を後から説明できる状態にすることである。

答えたい問い:

- なぜこの warning が出ているか
- なぜこの priority / attention なのか
- なぜ confidence が low / unknown なのか
- なぜ uncertainty として扱っているのか
- どの evidence / timeline / compare result が rationale になっているか
- explanation に limitation はあるか
- auditor が rationale を追えるか
- rationale が execution instruction に見えていないか

---

## ■ Explainability Semantics

explainability は、dashboard 上の signal がどの data / rule / context に基づいているかを説明できる性質である。

対象:

- warning
- priority / attention
- confidence
- uncertainty
- consistency warning
- freshness warning
- escalation candidate
- coordination gap
- review heuristic
- audit limitation

方針:

- signal には reason / scope / source context を紐づける
- explanation は短い summary と詳細 reference に分ける
- explanation は user が読める言葉で書く
- explanation は source of truth の代替ではない
- explanation から execution affordance を出さない

表示候補:

- `Why this warning`
- `Why this priority`
- `Why this confidence`
- `Rationale`
- `Evidence reference`
- `Explanation limitation`

---

## ■ Rationale Semantics

rationale は、dashboard が signal を表示する理由・根拠・判断材料である。

rationale に含める候補:

- reason_code
- reason_text
- severity / risk
- affected scope
- warehouse_code / affected warehouse list
- generated_at / snapshot date
- source query version
- evidence completeness
- timeline gap / trace reference
- confidence reason
- uncertainty reason
- attention reason

方針:

- rationale は review / investigation / audit の補助である
- rationale は原因確定ではない
- rationale は approval / execution permission ではない
- rationale は source context と一緒に表示する
- rationale が partial / uncertain / stale の場合は limitation を表示する

---

## ■ Why-this-warning

why-this-warning は、warning が出ている理由を説明する。

warning 候補:

- stale data
- partial data
- consistency warning
- confidence low / unknown
- uncertainty
- conflicting evidence
- cross-warehouse risk
- evidence missing
- timeline gap

説明に含める候補:

- warning type
- reason
- affected scope
- generated_at / event timestamp
- related evidence / timeline
- limitation
- suggested review

方針:

- warning reason は短く表示する
- detail で related context を辿れるようにする
- warning は business failure と断定しない
- warning から correction / rebuild / replay を実行しない

例:

```text
Why this warning:
Evidence is missing for post-compare verification.
Affected operation: OP-001
Suggested review: verify evidence package and related timeline.
```

---

## ■ Why-this-priority

why-this-priority は、priority / attention の理由を説明する。

priority 候補:

- critical attention
- reviewer attention
- domain owner attention
- investigation attention
- audit attention
- hotspot attention
- aging attention
- escalation candidate

説明に含める候補:

- priority type
- severity / risk
- affected warehouse_code
- aging
- confidence / uncertainty limitation
- evidence gap
- cross-warehouse status
- hotspot recurrence

方針:

- priority は review / investigation / audit の順序を助ける
- priority は execution priority ではない
- priority reason と priority route を分ける
- high priority でも execution button を出さない

例:

```text
Why this priority:
Cross-warehouse risk and missing warehouse boundary evidence.
Route: domain owner review recommended.
This is not an execution priority.
```

---

## ■ Why-this-confidence

why-this-confidence は、confidence level の理由を説明する。

confidence 候補:

- high
- medium
- low
- unknown
- partial confidence

説明に含める候補:

- available evidence
- missing evidence
- stale / partial data
- generated_at
- source query version
- warehouse boundary evidence
- timeline completeness
- conflicting evidence

方針:

- confidence は correctness guarantee ではない
- high confidence の理由も説明する
- low / unknown confidence は limitation として説明する
- confidence reason と uncertainty reason を混同しない
- confidence explanation から execution affordance を出さない

例:

```text
Why this confidence:
Confidence is low because post-compare evidence is missing and generated_at is stale.
This confidence signal supports review only.
```

---

## ■ Why-this-uncertainty

why-this-uncertainty は、uncertainty / ambiguity / unknown / conflict の理由を説明する。

uncertainty 候補:

- unknown state
- ambiguous cause
- conflicting evidence
- conflicting timeline
- conflicting compare result
- trust boundary unknown
- warehouse scope unknown

説明に含める候補:

- uncertainty type
- unknown field
- conflicting pair
- checked scope / unchecked scope
- timeline range
- confidence relationship
- suggested investigation

方針:

- uncertainty は safe ではない
- uncertainty は business failure とも断定しない
- conflicting evidence は片方を自動採用しない
- uncertainty explanation は human investigation に繋げる
- uncertainty explanation から correction / rebuild / replay を実行しない

---

## ■ Rationale Traceability

rationale traceability は、signal の理由を evidence / compare / timeline / snapshot / contract へ辿れるようにする考え方である。

traceability 対象:

- reason_code / reason_text
- evidence_package_id
- incident_id
- operation_id
- trace_id
- request_id
- parent_trace_id
- generated_at
- snapshot date
- source query version
- affected warehouse_code

方針:

- rationale は related IDs と一緒に表示する
- rationale reference は read-only navigation とする
- rationale traceability は source of truth の代替ではない
- rationale gap は audit limitation として扱う
- rationale traceability から execution workflow を出さない

---

## ■ Explanation Limitation

explanation limitation は、signal の説明に不足や制約がある状態である。

limitation 候補:

- reason_code unknown
- reason_text missing
- evidence incomplete
- stale data
- partial consistency
- unknown confidence
- conflicting evidence
- missing timeline range
- source query version unknown
- warehouse boundary evidence missing

方針:

- explanation limitation を隠さない
- limitation がある場合は explanation confidence を下げる候補にする
- limitation は audit note として残せるようにする
- limitation がある signal を resolved と断定しない
- explanation limitation から execution を促さない

表示候補:

- `Explanation limitation`
- `Rationale incomplete`
- `Reason unknown`
- `Evidence incomplete`
- `Additional review recommended`

---

## ■ Human Understandable Reasoning

human understandable reasoning は、operator / reviewer / auditor が短時間で理解できる説明を優先する方針である。

方針:

- technical fields だけで説明しない
- reason_code と plain language を組み合わせる
- category / reason / scope / limitation の順に説明する
- long explanation は detail / expansion に置く
- glossary / tooltip と連携できる文言にする
- machine-like score だけで rationale を表現しない
- explanation を action instruction にしない

例:

```text
Category: Evidence
Reason: Post-compare evidence is missing.
Scope: Operation OP-001, Warehouse WH-A
Limitation: Operation completion cannot be audit-verified from this view.
Suggested review: Open evidence package reference.
```

---

## ■ Audit Explainability

audit explainability は、後から dashboard signal と review / investigation の理由を説明できるようにするための方針である。

auditor が確認したい rationale:

- why warning was shown
- why priority was assigned
- why confidence was low / unknown
- why uncertainty was shown
- which evidence / timeline supported the signal
- which scope was checked / unchecked
- which limitation remained
- when the data was generated

方針:

- rationale は audit note として説明できるようにする
- audit package は source of truth の代替ではない
- explanation limitation を隠さない
- signal rationale と execution rationale を混同しない
- audit explainability から correction / rebuild / replay を実行しない

---

## ■ Compare / Observability / Recovery Explainability Separation

compare / observability / recovery は、explainability の意味が異なる。

| Area | Explainability focus | 誤解しないこと |
| --- | --- | --- |
| Compare | diff / severity / reason_code の理由 | source of truth error の確定ではない |
| Observability | backlog / hotspot / trend / health の理由 | incident resolution ではない |
| Recovery | incident / operation / approval / evidence / lifecycle signal の理由 | correction executed ではない |
| Trace | timeline / request chain / relation の説明 | replay permission ではない |

方針:

- compare rationale と recovery approval rationale を混同しない
- observability rationale と incident resolution rationale を混同しない
- recovery lifecycle rationale と execution result rationale を混同しない
- trace rationale と replay rationale を混同しない
- dashboard 間 link から execution しない

---

## ■ Explainability Visualization Policy

explainability visualization は、signal の理由を読みやすく表示するための方針である。

表示候補:

- `Why this warning`
- `Why this priority`
- `Why this confidence`
- `Why this uncertainty`
- `Rationale`
- `Explanation limitation`
- `Related evidence`
- `Related timeline`

方針:

- explanation は short summary + detail reference とする
- rationale は badge / tooltip / detail panel で確認できるようにする
- color だけに依存しない
- explanation は action button にしない
- explanation link は read-only reference とする
- explainability visualization から execution affordance を出さない

例:

```text
[WHY THIS WARNING]
Reason: Timeline event is missing for post-compare verification.
Related: evidence_package_id=EP-001, operation_id=OP-001
Limitation: audit verification is incomplete.
This is a read-only explanation. No execution action is available here.
```

---

## ■ Execution Rationale を置かない方針

read-only governance dashboard では、execution rationale を置かない。

置かない概念:

- rationale says rebuild
- rationale says replay
- rationale says approve
- explanation means execute
- priority rationale means execution priority
- confidence rationale means safe to execute
- warning rationale means auto correction

理由:

- rationale は read-only review / investigation / audit のための説明である
- rationale は原因分類や実行判断を確定しない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を rationale だけで保証できない
- rationale を execution trigger にすると監査性が弱くなる

代替表現:

- `Rationale`
- `Why this signal`
- `Suggested review`
- `Human review recommended`
- `Evidence reference`
- `Read-only explanation`

---

## ■ 導入段階案

### Step 0: Explainability and Rationale Policy の明文化

本ドキュメントで explainability semantics / rationale semantics / human understandable reasoning を整理する。

この段階では実装しない。

### Step 1: Warning / Priority Rationale Review

確認:

- warning reason が短く説明されているか
- priority reason / route / scope が分かれているか
- warning / priority から execution に進んでいないか

### Step 2: Confidence / Uncertainty Rationale Review

確認:

- confidence reason と uncertainty reason が分かれているか
- low / unknown confidence の limitation が説明されているか
- uncertainty を safe と見せていないか

### Step 3: Rationale Traceability Review

確認:

- reason_code / evidence / timeline / generated_at / query version を辿れるか
- rationale reference が read-only navigation になっているか
- rationale gap を audit limitation として扱っているか

### Step 4: Human Understandable Review

確認:

- technical fields だけで説明していないか
- category / reason / scope / limitation の順で説明できているか
- long explanation が overview に出すぎていないか

### Step 5: Audit Explainability Review

確認:

- auditor が why warning / why priority / why confidence を追えるか
- explanation limitation を隠していないか
- audit package を source of truth の代替にしていないか

### Step 6: No Execution Rationale Review

確認:

- `rationale says rebuild` のような概念がないか
- rationale から correction / rebuild / replay / approval / retry に進んでいないか
- explanation が read-only signal として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B21-01 では、explainability and rationale policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- rationale contract 実装
- explainability visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず explainability / rationale semantics を固定する必要がある
- warning / priority / confidence / uncertainty の理由を human understandable に整理する必要がある
- rationale traceability と explanation limitation を audit 可能にする方針が必要である
- execution rationale を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard explainability and rationale policy は、read-only governance dashboard 上の signal の理由を人間が理解し、監査時に説明できるようにするための設計方針である。

explainability semantics、rationale semantics、why-this-warning / priority / confidence / uncertainty、rationale traceability、explanation limitation、human understandable reasoning、audit explainability を整理し、execution rationale を置かないことで、visibility と mutation の境界を守る。
