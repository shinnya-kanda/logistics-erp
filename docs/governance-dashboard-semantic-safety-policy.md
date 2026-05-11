# Governance Dashboard Semantic Safety Policy（Phase B28-01）

作成日: 2026-05-12

---

## ■ 目的

このドキュメントは、governance dashboard における semantic safety / interpretation safety / expectation safety / execution misunderstanding prevention を継続 review する governance を整理する。

Phase B26 では comprehension risk / misunderstanding propagation を整理し、dashboard signal の誤読が cross-dashboard context や audit context に伝播しないようにする方針を定義した。Phase B27 では meaning boundary / meaning consistency を整理し、dashboard signal が「何を意味するか」「何を意味しないか」を明確にし、same term / same concept が dashboard 間で揺れないようにする方針を定義した。

Phase B28-01 では、それらを semantic safety governance として継続的に review する。目的は、evidence / timeline / confidence / approval などの signal が、review / investigation / audit の安全な判断材料として読まれ、execution permission / correction decision / replay eligibility / approval mutation と誤解されないようにすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

semantic safety policy は、dashboard 上の意味・解釈・期待が安全な範囲で読まれ、誤った実行期待に繋がらないようにするための方針である。

基本方針:

- semantic safety は governance quality / operator safety の一部として扱う
- interpretation safety は review / investigation / audit の安全条件として扱う
- expectation safety は semantic expectation boundary と alignment する
- execution misunderstanding prevention を明示する
- evidence / timeline / confidence / approval の semantic safety を重点 review する
- cross-dashboard semantic safety を確認する
- semantic safety degradation を review limitation として扱う
- semantic safety review は human review を補助する
- safety wording を execution instruction にしない
- execution semantic remediation を置かない

---

## ■ Semantic Safety Policy の目的

この policy の目的は、operator / reviewer / domain owner / auditor が dashboard signal を安全に解釈できるようにし、誤った semantic expectation や execution misunderstanding に進まないようにすることである。

答えたい問い:

- signal の意味は安全に限定されているか
- user が signal から execution permission を読み取っていないか
- `evidence available` が correctness guarantee に見えていないか
- `timeline relation` が causal proof / replay eligibility に見えていないか
- `confidence high` が safe to execute に見えていないか
- `approval approved` が operation completed に見えていないか
- cross-dashboard handoff で unsafe interpretation が発生していないか
- semantic safety review が correction / rebuild / replay に進んでいないか

---

## ■ Semantic Safety Semantics

semantic safety は、dashboard signal の意味が user にとって安全に理解でき、誤った実行・誤判断・誤連携を誘発しない状態である。

対象:

- term
- badge
- warning
- status
- rationale
- confidence
- uncertainty
- evidence
- timeline
- lineage
- approval
- lifecycle
- attention
- audit note

方針:

- semantic safety は meaning boundary / meaning consistency の上に置く
- safety は correctness guarantee ではない
- safety は source of truth confirmation ではない
- safety は execution permission ではない
- unsafe semantic は review / audit limitation として扱う
- semantic safety から execution affordance を出さない

---

## ■ Interpretation Safety Semantics

interpretation safety は、user が dashboard signal を読み取るときに、解釈が許容範囲を越えて operation / approval / mutation に広がらない状態である。

安全な interpretation:

- review signal
- investigation hint
- audit limitation
- evidence reference
- timeline reference
- source provenance reference
- confidence limitation
- semantic caveat

unsafe interpretation:

- execution permission
- source of truth correction decision
- rebuild requirement
- replay eligibility
- approval mutation
- assignment mutation
- incident resolution
- automatic sync

方針:

- interpretation は human review / investigation / audit の補助である
- interpretation は cause confirmed ではない
- interpretation は permission ではない
- unsafe interpretation は comprehension / semantic safety risk として扱う
- interpretation safety から workflow execution を開始しない

---

## ■ Expectation Safety Semantics

expectation safety は、label / tooltip / glossary / rationale から user が期待する意味が安全な範囲に収まっている状態である。

expectation risk が高い用語:

- `approved`
- `completed`
- `resolved`
- `verified`
- `available`
- `missing`
- `critical`
- `high confidence`
- `lineage complete`
- `retry candidate`

方針:

- expectation は glossary / meaning boundary に寄せる
- same term は same safe expectation にする
- expectation は execution capability を含まない
- expectation が広がりすぎる場合は `not meaning` caveat を付ける
- unsafe expectation は operator safety risk として扱う

---

## ■ Execution Misunderstanding Prevention

execution misunderstanding prevention は、dashboard signal が execution / mutation / automation と誤解されないようにする方針である。

防ぐ誤解:

- warning = fix required now
- priority = execution priority
- confidence high = safe to execute
- evidence available = operation correct
- timeline relation = replay eligible
- approval approved = operation completed
- review recommended = assignment created
- stale / partial / unknown = safe to ignore

方針:

- review wording と execution wording を分ける
- suggested review は action instruction にしない
- read-only note を必要な context に置く
- disabled execution button で safety を表現しない
- execution misunderstanding から correction / rebuild / replay を開始しない

---

## ■ Evidence Semantic Safety

evidence semantic safety は、evidence status / evidence package / evidence summary が source of truth や correctness guarantee と誤解されない状態である。

safe meaning:

- evidence is available for review
- evidence is missing
- evidence is partial
- audit package has linked reference
- post-compare evidence exists / missing

unsafe meaning:

- operation is correct
- incident is resolved
- source of truth is verified
- upload action is required from dashboard
- execution approval exists

方針:

- evidence は audit / review の補助である
- evidence available は correctness guarantee ではない
- evidence missing は upload action ではない
- evidence completeness と audit readiness を分ける
- evidence semantic safety issue から correction / rebuild / replay を実行しない

---

## ■ Timeline Semantic Safety

timeline semantic safety は、timeline event / trace relation / request chain が causal proof や replay permission と誤解されない状態である。

safe meaning:

- event was recorded / referenced
- lifecycle event is visible
- request_id / trace_id / parent_trace_id relation is visible
- timeline gap may need review
- missing event is an audit warning

unsafe meaning:

- causal proof is established
- replay is eligible
- correction is required
- failed event means retry action is available
- parent_trace_id is approval hierarchy

方針:

- timeline は investigation / audit の補助である
- timeline relation は causal proof ではない
- trace relation は replay permission ではない
- missing event は audit warning として扱う
- timeline semantic safety issue から replay / correction / rebuild を実行しない

---

## ■ Confidence Semantic Safety

confidence semantic safety は、confidence level / confidence reason / confidence limitation が correctness guarantee や execution permission と誤解されない状態である。

safe meaning:

- review / investigation / audit の判断材料としての有用度
- data / evidence / scope の揃い具合
- limitation の強さ
- human review の必要度

unsafe meaning:

- correctness guarantee
- safe to execute
- approval ready
- cause confirmed
- audit completed
- automatic recovery candidate

方針:

- confidence は correctness guarantee ではない
- high confidence は execute now を意味しない
- low confidence は wrong data と断定しない
- unknown confidence は safe ではない
- confidence semantic safety issue から automatic correction / rebuild / replay を行わない

---

## ■ Approval Semantic Safety

approval semantic safety は、approval status / lifecycle state / review state が execution button や completed state と誤解されない状態である。

safe meaning:

- approval governance state is visible
- execution approval may exist as state
- lifecycle state is visible
- review state is visible
- approval / lifecycle / review can be audited as references

unsafe meaning:

- operation is completed
- post-compare is verified
- approval button is available
- execution starts from dashboard
- review completed means approved
- failed means retry action exists

方針:

- approval は execution approval governance state である
- approval は lifecycle completed ではない
- lifecycle completed は post-compare verified ではない
- review completed は approval approved ではない
- approval wording から approve / reject / execute button を連想させない
- approval semantic safety issue から approval mutation を行わない

---

## ■ Cross-dashboard Semantic Safety Review

cross-dashboard semantic safety review は、compare / observability / recovery / trace 間で unsafe interpretation が伝播していないかを確認する。

review 対象:

- Compare -> Recovery diff / reason / severity handoff
- Observability -> Recovery health / hotspot / trend handoff
- Recovery -> Trace lifecycle / approval / evidence handoff
- Trace -> Recovery timeline / request chain handoff
- shared badge / warning
- shared tooltip / glossary
- related reference link
- generated_at / freshness wording

方針:

- compare diff は source of truth error confirmed ではない
- observability health stable は incident resolved ではない
- recovery approval approved は operation completed ではない
- trace relation は replay eligibility ではない
- dashboard 間 link は read-only reference とする
- cross-dashboard semantic safety review から operation workflow を開始しない

---

## ■ Semantic Safety Degradation Semantics

semantic safety degradation は、dashboard signal の意味・解釈・期待が unsafe に広がり、誤読・誤判断・execution misunderstanding の risk が高まる状態である。

degradation 候補:

- safe meaning / unsafe meaning が分からない
- glossary / tooltip / caveat が不足する
- evidence meaning が correctness に寄る
- timeline meaning が causal proof に寄る
- confidence meaning が permission に寄る
- approval meaning が completed に寄る
- priority / warning が execution instruction に寄る
- cross-dashboard handoff で unsafe interpretation が伝播する

方針:

- semantic safety degradation は governance quality degradation として扱う
- degradation は business incident の確定ではない
- degradation は review / investigation / audit limitation として扱う
- repeated degradation は comprehension / meaning / semantic review に戻す
- semantic safety degradation から execution remediation を行わない

---

## ■ Semantic Safety Heuristics

semantic safety heuristics は、semantic safety issue を human review で見つけやすくするための観点である。

検知観点:

- signal の safe meaning / unsafe meaning が説明できるか
- evidence available が correctness guarantee に見えていないか
- timeline relation が causal proof に見えていないか
- confidence high が safe to execute に見えていないか
- approval approved が operation completed に見えていないか
- critical / priority が execute now に見えていないか
- suggested review が action instruction に見えていないか
- cross-dashboard link 先でも semantic safety が維持されているか

方針:

- heuristics は detection support であり automatic remediation ではない
- high / critical semantic safety issue は human review recommended とする
- false-positive awareness を持つ
- repeated issue は comprehension / terminology / meaning boundary review に戻す
- heuristic result から execution action を出さない

---

## ■ Semantic Safety Lifecycle

semantic safety lifecycle は、semantic safety issue candidate を発見してから整理・確認・記録するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | semantic safety issue candidate が見つかった |
| reviewing | affected signal / term / dashboard / scope を review 中 |
| classified | safety issue type を分類した |
| caveat_required | safe meaning / unsafe meaning caveat が必要と判断した |
| limitation_recorded | semantic safety limitation として説明可能にした |
| review_recommended | human review recommended とした |
| semantic_safety_reaffirmed | semantic safety が保たれていると確認した |

方針:

- semantic safety lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- caveat_required は UI 実装指示ではない
- limitation_recorded は safe approval ではない
- lifecycle から assignment mutation を行わない

---

## ■ Semantic Safety Visualization Policy

semantic safety visualization は、semantic safety / unsafe interpretation / expectation limitation / review note を読みやすく表示するための方針である。

表示候補:

- `Semantic safety`
- `Interpretation safety`
- `Expectation safety`
- `Unsafe interpretation`
- `Execution misunderstanding risk`
- `Semantic safety limitation`
- `Human review recommended`
- `No execution remediation`

方針:

- semantic safety visualization は review note として扱う
- semantic safety warning は action button にしない
- affected signal / safe meaning / unsafe meaning / limitation を短く表示する
- caveat は category + safe meaning + unsafe meaning を意識する
- color だけに依存しない
- semantic safety visualization から execution affordance を出さない

例:

```text
[SEMANTIC SAFETY NOTE]
Signal: Confidence high
Safe meaning: evidence and scope are relatively sufficient for review.
Unsafe meaning: safe to execute or approval ready.
This is a read-only semantic safety note. No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.
```

---

## ■ Execution Semantic Remediation を置かない方針

read-only governance dashboard では、execution semantic remediation を置かない。

置かない概念:

- semantic safety issue detected, auto rewrite wording
- unsafe interpretation detected, execute correction
- evidence semantic issue, attach evidence
- timeline semantic issue, replay operation
- confidence semantic issue, approve operation
- approval semantic issue, change lifecycle
- execution misunderstanding, auto block workflow
- semantic safety review assigns owner

理由:

- semantic safety review は read-only governance quality review である
- wording / glossary / layout adjustment には別の design / review / implementation process が必要である
- automatic remediation 自体が mutation / automation になり得る
- semantic safety issue は source of truth correction の根拠ではない
- source of truth protection / warehouse boundary / blast radius を semantic remediation だけで保証できない
- execution semantic remediation を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Semantic safety`
- `Interpretation safety`
- `Expectation safety`
- `Semantic safety limitation`
- `Human review recommended`
- `No execution remediation`

---

## ■ 導入段階案

### Step 0: Semantic Safety Policy の明文化

本ドキュメントで semantic safety / interpretation safety / expectation safety / execution misunderstanding prevention の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Semantic / Interpretation Safety Review

確認:

- signal の safe meaning / unsafe meaning が説明できるか
- interpretation が cause confirmed / permission に広がっていないか
- interpretation safety から execution expectation が出ていないか

### Step 2: Evidence / Timeline Semantic Safety Review

確認:

- evidence available が correctness guarantee に見えていないか
- evidence missing が upload action に見えていないか
- timeline relation が causal proof / replay eligibility に見えていないか

### Step 3: Confidence / Approval Semantic Safety Review

確認:

- confidence high が safe to execute に見えていないか
- unknown confidence が safe と見えていないか
- approval approved / lifecycle completed / review completed が混同されていないか

### Step 4: Cross-dashboard Semantic Safety Review

確認:

- compare diff が source of truth error として recovery に伝播していないか
- observability health が incident resolved として伝播していないか
- trace relation が replay eligibility として伝播していないか

### Step 5: Semantic Safety Degradation Review

確認:

- safe meaning / unsafe meaning caveat が必要な場所で表示されているか
- semantic safety limitation が review / audit limitation として説明されているか
- repeated degradation を comprehension / meaning / semantic review に戻せるか

### Step 6: No Execution Semantic Remediation Review

確認:

- `semantic safety issue, execute correction` のような概念がないか
- semantic safety review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- semantic safety review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B28-01 では、semantic safety policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- semantic safety contract 実装
- semantic safety visualization 実装
- wording remediation 実装
- glossary migration 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず semantic safety / interpretation safety semantics を固定する必要がある
- expectation safety / execution misunderstanding prevention を review 可能にする必要がある
- evidence / timeline / confidence / approval semantic safety を整理する必要がある
- execution semantic remediation を置かない方針を明確にする必要がある

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
- `docs/governance-dashboard-review-attention-quality-policy.md`
- `docs/governance-dashboard-review-fatigue-noise-policy.md`
- `docs/governance-dashboard-review-readability-policy.md`
- `docs/governance-dashboard-comprehension-risk-policy.md`
- `docs/governance-dashboard-meaning-boundary-policy.md`
- `docs/governance-dashboard-meaning-consistency-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard semantic safety policy は、read-only governance dashboard の semantic safety / interpretation safety / expectation safety / execution misunderstanding prevention を継続的に review し、dashboard signal が execution permission / correction decision / replay eligibility / approval mutation と誤解されないようにするための方針である。

evidence semantic safety、timeline semantic safety、confidence semantic safety、approval semantic safety、cross-dashboard semantic safety review、semantic safety degradation、semantic safety heuristics、semantic safety lifecycle を整理し、execution semantic remediation を置かないことで、visibility と mutation の境界を守る。
