# Governance Dashboard Integrity Degradation Review Policy（Phase B24-02）

作成日: 2026-05-11

---

## ■ 目的

このドキュメントは、governance dashboard の integrity degradation / governance quality degradation / explainability degradation / auditability degradation を継続 review する governance を整理する。

Phase B24-01 では、governance dashboard 全体の integrity / governance quality / read-only integrity / audit integrity を継続 review する方針を整理した。そこでは、integrity は correctness guarantee や execution permission ではなく、read-only visibility / review / investigation / audit の品質として扱うことを明確にした。

Phase B24-02 では、integrity がどのように劣化するかをより細かく整理し、explainability / auditability / visibility / reasoning / lineage / semantic の劣化を早期に認識するための review 方針を定義する。目的は、governance quality の低下を business incident や execution trigger と混同せず、review / investigation / audit limitation として説明できるようにすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

integrity degradation review policy は、dashboard の governance quality が低下している兆候を分類し、review / investigation / audit の制限として扱うための方針である。

基本方針:

- degradation は governance quality risk として扱う
- degradation は business incident の確定ではない
- degradation は execution permission ではない
- degradation は review / investigation / audit limitation として表示する
- explainability / auditability / visibility / reasoning / lineage / semantic degradation を分ける
- degradation severity は review attention の補助である
- degradation review は remediation execution ではない
- repeated degradation は boundary / semantic / freshness review に戻す
- degradation signal は human review を補助する
- execution degradation remediation を置かない

---

## ■ Integrity Degradation Review Policy の目的

この policy の目的は、dashboard の integrity が低下した時に、どの品質がどの範囲で落ちているのかを説明できるようにすることである。

答えたい問い:

- degradation はどの integrity area で起きているか
- governance quality のどの要素が低下しているか
- explanation / rationale は十分に説明できるか
- audit evidence / lineage / wording history は監査可能か
- generated_at / source / limitation が隠れていないか
- semantic drift や boundary drift が degradation になっていないか
- degradation severity はどの程度か
- degradation が business incident や execution trigger と誤読されていないか
- degradation review が correction / rebuild / replay に進んでいないか

---

## ■ Integrity Degradation Semantics

integrity degradation は、dashboard が安全に表示・説明・監査できる品質を一部失い、誤読・説明不能・境界違反の risk が高まる状態である。

degradation 対象:

- read-only integrity
- audit integrity
- visibility integrity
- reasoning integrity
- lineage integrity
- semantic integrity
- cross-dashboard integrity
- boundary integrity

方針:

- degradation は integrity gap / limitation として扱う
- degradation は data correctness error と断定しない
- degradation は source of truth の変更根拠ではない
- degradation が critical でも automatic recovery は行わない
- degradation から execution affordance を出さない

---

## ■ Governance Quality Degradation

governance quality degradation は、dashboard が governance 判断材料として安全・一貫・監査可能に使いにくくなる状態である。

degradation 候補:

- completeness が低下する
- consistency が低下する
- explainability が低下する
- traceability が低下する
- auditability が低下する
- boundary clarity が低下する
- semantic clarity が低下する
- freshness clarity が低下する
- limitation visibility が低下する
- operator safety が低下する

方針:

- governance quality degradation は operation correctness degradation ではない
- quality degradation は human review recommended として扱う候補にする
- quality unknown は safe ではない
- quality degradation が repeated の場合は root policy area を見直す
- governance quality degradation から correction / rebuild / replay を実行しない

---

## ■ Explainability Degradation

explainability degradation は、dashboard signal の理由を人間が理解しにくくなる状態である。

degradation 候補:

- why-this-warning が欠落する
- why-this-priority が説明不足になる
- confidence reason が欠落する
- uncertainty reason が欠落する
- rationale が technical field だけになる
- explanation limitation が隠れる
- suggested review が action instruction に近づく

方針:

- explainability degradation は review / investigation limitation として扱う
- explanation が欠落しても cause confirmed とは扱わない
- rationale gap は audit limitation に接続する
- explanation degradation から execution instruction を出さない
- repeated degradation は explainability / rationale policy に戻す

---

## ■ Auditability Degradation

auditability degradation は、dashboard signal / evidence / rationale / lineage / wording を後から説明しにくくなる状態である。

degradation 候補:

- evidence package reference が欠落する
- post-compare evidence が欠落する
- trace reference が欠落する
- generated_at が欠落する
- source provenance が不明になる
- audit wording history が不明になる
- approval / lifecycle state の意味が曖昧になる
- limitation が audit note として残せない

方針:

- auditability degradation は audit limitation として扱う
- auditability degradation は operation failure の確定ではない
- evidence missing は upload action ではない
- audit trail gap は correction / replay trigger ではない
- auditability degradation から operation execution を行わない

---

## ■ Visibility Degradation

visibility degradation は、dashboard が見せるべき状態・根拠・制限を十分に表示できていない状態である。

degradation 候補:

- stale / partial / unknown が隠れる
- critical / cross-warehouse が埋もれる
- generated_at が見えない
- affected scope が見えない
- warehouse_code boundary が見えない
- confidence limitation が見えない
- evidence completeness が見えない
- read-only indication が弱い

方針:

- visibility degradation は operator safety risk として扱う
- hidden limitation は safe と見せない
- visibility degradation は mutation permission ではない
- visibility gap は short summary + detail reference として扱う
- visibility degradation から execution affordance を出さない

---

## ■ Reasoning Degradation

reasoning degradation は、rationale / heuristic / explanation の一貫性や理解可能性が低下する状態である。

degradation 候補:

- rationale pattern が揺れる
- category / reason / scope / limitation の順序が崩れる
- reason_code と plain language が対応しない
- confidence reason と uncertainty reason が混同される
- heuristic が execution instruction に近づく
- false-positive awareness が欠落する

方針:

- reasoning degradation は review limitation として扱う
- reasoning degradation は cause confirmed ではない
- suggested review を required action にしない
- reasoning gap から approval / execution に進まない
- repeated degradation は review / investigation heuristics policy に戻す

---

## ■ Lineage Degradation

lineage degradation は、source / snapshot / compare / evidence / trace からの derived-from relationship を説明しにくくなる状態である。

degradation 候補:

- source provenance unknown
- derived-from chain incomplete
- snapshot lineage stale
- compare lineage missing
- evidence lineage partial
- trace relation missing
- query version unknown
- contract version unknown
- warehouse boundary evidence missing

方針:

- lineage degradation は audit limitation として扱う
- lineage gap は causal proof の欠落であり、permission の欠落ではない
- lineage complete を safe と見せない
- trace relation missing を replay trigger にしない
- lineage degradation から correction / rebuild / replay を実行しない

---

## ■ Semantic Degradation

semantic degradation は、terminology / glossary / tooltip / rationale / lineage wording の一貫性が低下する状態である。

degradation 候補:

- same term が different meaning で使われる
- deprecated wording が説明なしに残る
- warning wording が action-like になる
- confidence wording が execution permission に近づく
- uncertainty wording が safe に見える
- lineage wording が permission に見える
- glossary と tooltip が矛盾する
- semantic version が capability version に見える

方針:

- semantic degradation は governance quality degradation として扱う
- semantic drift は operator safety risk として扱う
- deprecated wording は historical term として説明する
- semantic degradation から automation を起動しない
- repeated degradation は semantic consistency / semantic evolution review に戻す

---

## ■ Cross-dashboard Degradation Review

cross-dashboard degradation review は、compare / observability / recovery / trace 間で integrity degradation が起きていないかを確認する。

review 対象:

- shared navigation label
- shared badge / tooltip
- shared filter / search context
- related reference link
- generated_at / freshness wording
- warehouse_code / trace_id / request_id label
- evidence / timeline link
- read-only indication
- empty / stale / partial / error wording

方針:

- compare degradation は diff visibility limitation として扱う
- observability degradation は operational quality visibility limitation として扱う
- recovery degradation は governance visibility limitation として扱う
- trace degradation は request chain / timeline visibility limitation として扱う
- dashboard 間 link は read-only reference として維持する
- cross-dashboard degradation から operation workflow を開始しない

---

## ■ Degradation Severity Semantics

degradation severity は、integrity degradation の review attention を整理するための分類である。

severity 候補:

| Severity | 意味 |
| --- | --- |
| low | 軽微な wording / display limitation |
| medium | review / investigation に影響する limitation |
| high | auditability / boundary clarity / operator safety に影響する limitation |
| critical | execution leakage / cross-warehouse誤読 / source of truth 誤認につながる重大 limitation |

方針:

- degradation severity は execution priority ではない
- critical degradation でも automatic remediation は行わない
- severity は affected scope / limitation / recurrence と一緒に扱う
- severity unknown は safe ではない
- severity classification gap は review limitation とする

---

## ■ Degradation Review Heuristics

degradation review heuristics は、integrity degradation を human review で見つけやすくするための観点である。

検知観点:

- explanation / rationale が欠落していないか
- audit reference / generated_at / source provenance が見えるか
- stale / partial / unknown / conflicting が隠れていないか
- evidence available が correctness guarantee に見えていないか
- lineage complete が permission に見えていないか
- glossary / tooltip / badge wording が矛盾していないか
- action affordance drift / execution leakage が混入していないか
- cross-dashboard link が workflow start に見えていないか

方針:

- heuristics は detection support であり automatic remediation ではない
- high / critical degradation は human review recommended とする
- repeated degradation は root policy area に戻す
- false-positive awareness を持つ
- heuristic result から execution action を出さない

---

## ■ Degradation Review Lifecycle

degradation review lifecycle は、degradation candidate を発見してから整理・確認・記録するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | degradation candidate が見つかった |
| reviewing | affected area / scope / severity を review 中 |
| classified | degradation type を分類した |
| severity_assigned | degradation severity を付与した |
| limitation_recorded | limitation として説明可能にした |
| review_recommended | human review recommended とした |
| degradation_reassessed | degradation の継続 / 解消候補を再確認した |

方針:

- degradation lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- severity_assigned は execution priority ではない
- limitation_recorded は safe approval ではない
- lifecycle から assignment mutation を行わない

---

## ■ Degradation Visualization Policy

degradation visualization は、degradation status / severity / limitation / review note を読みやすく表示するための方針である。

表示候補:

- `Integrity degradation`
- `Governance quality degradation`
- `Explainability degradation`
- `Auditability degradation`
- `Visibility degradation`
- `Reasoning degradation`
- `Lineage degradation`
- `Semantic degradation`
- `Degradation severity`
- `Human review recommended`
- `No execution remediation`

方針:

- degradation visualization は review note として扱う
- degradation warning は action button にしない
- degradation type / severity / affected scope / limitation を短く表示する
- critical degradation を execution trigger に見せない
- color だけに依存しない
- degradation visualization から execution affordance を出さない

例:

```text
[DEGRADATION REVIEW NOTE]
Type: auditability degradation
Severity: high
Scope: operation evidence summary
Reason: generated_at and post-compare evidence are missing.
Review: verify evidence package reference and trace timeline.
No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.
```

---

## ■ Execution Degradation Remediation を置かない方針

read-only governance dashboard では、execution degradation remediation を置かない。

置かない概念:

- degradation detected, execute correction
- degradation high, run rebuild
- auditability degradation triggers replay
- visibility degradation triggers sync
- explainability degradation triggers approval
- lineage degradation triggers retry
- semantic degradation auto migrates wording
- degradation review assigns owner

理由:

- degradation review は read-only governance quality review である
- remediation には別の design / review / implementation process が必要である
- automatic remediation 自体が mutation / automation になり得る
- source of truth protection / warehouse boundary / blast radius を degradation remediation だけで保証できない
- execution degradation remediation を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Degradation review note`
- `Governance quality limitation`
- `Human review recommended`
- `Boundary review recommended`
- `Audit limitation`
- `No execution remediation`

---

## ■ 導入段階案

### Step 0: Integrity Degradation Review Policy の明文化

本ドキュメントで integrity degradation / governance quality degradation / explainability degradation / auditability degradation の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Degradation Semantics Review

確認:

- degradation が business incident として扱われていないか
- degradation が execution permission に見えていないか
- degradation を review / audit limitation として扱えているか

### Step 2: Explainability / Auditability Degradation Review

確認:

- why-this / rationale / explanation limitation が説明できるか
- evidence / generated_at / source provenance / wording history が監査可能か
- auditability gap が operation failure と断定されていないか

### Step 3: Visibility / Reasoning / Lineage Degradation Review

確認:

- stale / partial / unknown / conflicting が隠れていないか
- rationale pattern が一貫しているか
- lineage gap が permission と混同されていないか

### Step 4: Semantic / Cross-dashboard Degradation Review

確認:

- glossary / tooltip / badge wording が揃っているか
- compare / observability / recovery / trace の role が分かれているか
- dashboard 間 link が read-only reference として扱われているか

### Step 5: Severity / Lifecycle Review

確認:

- severity が execution priority に見えていないか
- high / critical degradation でも automatic remediation を示唆していないか
- degradation lifecycle が execution lifecycle と混同されていないか

### Step 6: No Execution Degradation Remediation Review

確認:

- `degradation high, run rebuild` のような概念がないか
- degradation review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- degradation review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B24-02 では、integrity degradation review policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- degradation review contract 実装
- degradation visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず integrity degradation / governance quality degradation semantics を固定する必要がある
- explainability / auditability / visibility / reasoning / lineage / semantic degradation を review 可能にする必要がある
- degradation severity と degradation review lifecycle を明確にする必要がある
- execution degradation remediation を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard integrity degradation review policy は、read-only governance dashboard の integrity degradation / governance quality degradation / explainability degradation / auditability degradation を継続的に review し、品質劣化を review / audit limitation として説明可能にするための方針である。

visibility degradation、reasoning degradation、lineage degradation、semantic degradation、cross-dashboard degradation、degradation severity、degradation review heuristics、degradation review lifecycle を整理し、execution degradation remediation を置かないことで、visibility と mutation の境界を守る。
