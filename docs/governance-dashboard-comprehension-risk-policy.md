# Governance Dashboard Comprehension Risk Policy（Phase B26-02）

作成日: 2026-05-11

---

## ■ 目的

このドキュメントは、governance dashboard の comprehension risk / misinterpretation risk / misunderstanding propagation / comprehension limitation を継続 review する governance を整理する。

Phase B20-02 では、misinterpretation prevention / human error prevention / operator safety を整理し、`approved` と `completed`、`evidence available` と correctness、`critical attention` と execution を混同しない方針を定義した。Phase B26-01 では、review readability / scanability / comprehension quality / review comprehension safety を整理し、user が「何を見ているか」「何が重要か」「何が制限か」「何を実行しないか」を安全に理解できることを品質として扱った。

Phase B26-02 では、それらを comprehension risk governance として継続的に review する。目的は、誤解が単一画面内に留まらず、compare / observability / recovery / trace 間で伝播して、誤った review / audit / execution expectation に繋がらないようにすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

comprehension risk policy は、dashboard の表示が user に誤った意味で伝わる risk を継続的に確認するための方針である。

基本方針:

- comprehension risk は governance quality risk として扱う
- misinterpretation risk は operator safety risk として扱う
- misunderstanding propagation を cross-dashboard risk として扱う
- comprehension limitation を隠さない
- evidence / timeline / confidence / approval の誤解を重点的に review する
- confusing pair は glossary / tooltip / caveat で分ける
- misunderstanding は execution permission ではない
- comprehension review は human review を補助する
- comprehension degradation を review limitation として扱う
- execution comprehension remediation を置かない

---

## ■ Comprehension Risk Policy の目的

この policy の目的は、operator / reviewer / domain owner / auditor が dashboard signal を誤読しないようにし、誤解が別 dashboard や audit context に伝播しないようにすることである。

答えたい問い:

- 表示された状態が正しい意味で理解されているか
- `approved` が `completed` や `safe` と誤読されていないか
- `evidence available` が operation correctness と誤読されていないか
- confidence が execution permission と誤読されていないか
- timeline relation が causal proof / replay eligibility と誤読されていないか
- cross-dashboard navigation 後に同じ signal の意味が変わっていないか
- comprehension limitation が review / audit limitation として説明されているか
- comprehension review が correction / rebuild / replay に進んでいないか

---

## ■ Comprehension Risk Semantics

comprehension risk は、dashboard の label / badge / warning / rationale / evidence / timeline / lineage が、本来の意味と異なる形で理解される risk である。

risk 対象:

- terminology
- badge / warning
- confidence
- uncertainty
- evidence
- timeline
- lineage
- approval / lifecycle
- attention / escalation
- read-only indication

方針:

- comprehension risk は user blame ではなく dashboard governance risk として扱う
- risk は correctness error の確定ではない
- risk は source of truth の変更根拠ではない
- risk が高くても automatic remediation は行わない
- comprehension risk から execution affordance を出さない

---

## ■ Misinterpretation Risk Semantics

misinterpretation risk は、user が dashboard signal を誤ったカテゴリや意味として読む可能性である。

誤読しやすい例:

- `approved` を `completed` と読む
- `completed` を `post-compare verified` と読む
- `empty result` を `no issue` と読む
- `stale` を `inconsistent` と読む
- `partial` を `missing` と読む
- `evidence available` を `operation correct` と読む
- `confidence high` を `safe to execute` と読む
- `critical attention` を `execute now` と読む
- `retry candidate` を `retry action` と読む

方針:

- confusing pair は label / tooltip / glossary / caveat で分ける
- badge は category + value で表示する
- empty / stale / partial / unknown の意味を短く説明する
- suggested review は action wording にしない
- misinterpretation risk から execution remediation を行わない

---

## ■ Misunderstanding Propagation Semantics

misunderstanding propagation は、ある screen / badge / reference で生じた誤解が、cross-dashboard navigation や audit note を通じて他の context へ広がる状態である。

propagation 候補:

- compare diff を source of truth error として recovery に持ち込む
- observability health stable を incident resolved として扱う
- recovery approval approved を operation completed として trace に持ち込む
- trace relation を replay eligibility として recovery に持ち込む
- evidence available を correctness guarantee として audit に持ち込む
- confidence high を execution permission として review に持ち込む

方針:

- dashboard 間 link は read-only reference とする
- link handoff では source dashboard / target dashboard の meaning を分ける
- propagated misunderstanding は cross-dashboard comprehension limitation として扱う
- propagation risk は semantic / boundary / readability review と連携する
- misunderstanding propagation から operation workflow を開始しない

---

## ■ Comprehension Limitation Semantics

comprehension limitation は、dashboard の表示だけでは意味・根拠・制限を十分に理解しにくい状態である。

limitation 候補:

- tooltip / glossary が不足している
- caveat が表示されていない
- reason / scope / limitation が欠落している
- source / derived の区別が弱い
- confidence / uncertainty の理由が不足している
- evidence / correctness の区別が弱い
- approval / lifecycle の区別が弱い
- cross-dashboard context が不足している

方針:

- comprehension limitation を隠さない
- limitation は review / investigation / audit limitation として扱う
- limitation がある signal を verified / resolved と断定しない
- limitation は human review recommended の候補にする
- comprehension limitation から execution を促さない

---

## ■ Evidence Misunderstanding Risk

evidence misunderstanding risk は、evidence package / evidence summary / evidence status が source of truth や correctness guarantee と誤読される risk である。

risk 候補:

- evidence available = operation correct
- evidence missing = upload action required
- post-compare evidence available = incident resolved
- dry-run result available = execution approved
- attachment reference = source of truth
- evidence completeness = audit completed

方針:

- evidence は audit / review の補助であり source of truth ではない
- evidence available は correctness guarantee ではない
- evidence missing は attachment action ではない
- evidence completeness と audit readiness を分ける
- evidence misunderstanding から correction / rebuild / replay を実行しない

---

## ■ Timeline Misunderstanding Risk

timeline misunderstanding risk は、timeline / trace relation / event order が causal proof や execution eligibility と誤読される risk である。

risk 候補:

- timeline relation = causal proof
- missing event = operation failed
- trace relation = replay eligible
- parent_trace_id = approval hierarchy
- completed event = post-compare verified
- failed event = retry action
- timeline gap = correction required

方針:

- timeline は investigation / audit の補助である
- timeline relation は causal proof ではない
- missing event は audit warning として扱う
- trace relation は replay permission ではない
- timeline から replay / correction / rebuild を実行しない

---

## ■ Confidence Misunderstanding Risk

confidence misunderstanding risk は、confidence level が correctness guarantee や execution permission と誤読される risk である。

risk 候補:

- high confidence = safe to execute
- medium confidence = approval ready
- low confidence = wrong data
- unknown confidence = safe to ignore
- confidence reason = cause confirmed
- confidence high = audit complete

方針:

- confidence は review / investigation / audit の判断材料としての有用度である
- confidence は correctness guarantee ではない
- high confidence は execute now を意味しない
- low confidence は wrong data と断定しない
- unknown confidence は safe ではない
- confidence misunderstanding から automatic correction / rebuild / replay を行わない

---

## ■ Approval Misunderstanding Risk

approval misunderstanding risk は、approval status / lifecycle state / review state が混同される risk である。

risk 候補:

- approval approved = operation completed
- approval pending = review required only
- review completed = approval approved
- lifecycle completed = post-compare verified
- failed = retry action available
- scheduled = executing
- dry_run completed = execution ready

方針:

- approval は execution approval governance state である
- approval は lifecycle completed ではない
- review completed は approval approved ではない
- lifecycle completed は post-compare verified ではない
- approval wording から approve / reject / execute button を連想させない
- approval misunderstanding から approval mutation を行わない

---

## ■ Cross-dashboard Misunderstanding Propagation Review

cross-dashboard misunderstanding propagation review は、compare / observability / recovery / trace 間で誤解が伝播していないかを確認する。

review 対象:

- Compare -> Recovery reason / severity handoff
- Observability -> Recovery health / hotspot handoff
- Recovery -> Trace lifecycle / evidence handoff
- Trace -> Recovery request chain / trace relation handoff
- shared badge / warning
- shared tooltip / glossary
- related reference link
- generated_at / freshness wording

方針:

- compare は diff visibility であり cause confirmed ではない
- observability health は incident resolved ではない
- recovery lifecycle は trace causality proof ではない
- trace relation は replay eligibility ではない
- dashboard 間 link は read-only reference とする
- propagation review から operation workflow を開始しない

---

## ■ Comprehension Degradation Semantics

comprehension degradation は、dashboard の意味理解品質が低下し、誤読・誤判断・誤った workflow expectation の risk が高まる状態である。

degradation 候補:

- confusing pair が caveat なしで表示される
- evidence / correctness が混同される
- timeline / causality が混同される
- confidence / permission が混同される
- approval / lifecycle / review が混同される
- stale / inconsistent / unknown が混同される
- cross-dashboard context で意味が変わる
- read-only indication が弱くなる

方針:

- comprehension degradation は governance quality degradation として扱う
- degradation は business incident の確定ではない
- degradation は review / investigation / audit limitation として扱う
- repeated degradation は readability / semantic / boundary review に戻す
- comprehension degradation から execution remediation を行わない

---

## ■ Comprehension Review Heuristics

comprehension review heuristics は、comprehension risk / misinterpretation risk を human review で見つけやすくするための観点である。

検知観点:

- badge が category + value + caveat で読めるか
- evidence available が correct と見えていないか
- timeline relation が causal proof と見えていないか
- confidence high が safe to execute と見えていないか
- approval approved が completed と混同されていないか
- review completed が approval approved と混同されていないか
- empty / stale / partial / unknown の意味が分かるか
- cross-dashboard link 先でも意味が維持されているか

方針:

- heuristics は detection support であり automatic remediation ではない
- high / critical comprehension risk は human review recommended とする
- false-positive awareness を持つ
- repeated issue は readability / terminology / semantic review に戻す
- heuristic result から execution action を出さない

---

## ■ Comprehension Review Lifecycle

comprehension review lifecycle は、comprehension risk candidate を発見してから整理・確認・記録するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | comprehension risk candidate が見つかった |
| reviewing | affected concept / screen / scope を review 中 |
| classified | misunderstanding type を分類した |
| limitation_recorded | comprehension limitation として説明可能にした |
| review_recommended | human review recommended とした |
| comprehension_reaffirmed | comprehension safety が保たれていると確認した |

方針:

- comprehension review lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- limitation_recorded は safe approval ではない
- comprehension_reaffirmed は correctness guarantee ではない
- lifecycle から assignment mutation を行わない

---

## ■ Comprehension Visualization Policy

comprehension visualization は、comprehension risk / limitation / review note を読みやすく表示するための方針である。

表示候補:

- `Comprehension risk`
- `Misinterpretation risk`
- `Comprehension limitation`
- `Meaning caveat`
- `Evidence caveat`
- `Timeline caveat`
- `Confidence caveat`
- `Approval caveat`
- `Human review recommended`
- `No execution remediation`

方針:

- comprehension visualization は review note として扱う
- comprehension warning は action button にしない
- risk type / affected concept / limitation を短く表示する
- caveat は category + meaning + not-meaning を意識する
- color だけに依存しない
- comprehension visualization から execution affordance を出さない

例:

```text
[COMPREHENSION RISK NOTE]
Type: evidence misunderstanding risk
Concept: Evidence available
Meaning: evidence is linked for review.
Not meaning: operation correctness is guaranteed.
This is a read-only comprehension note. No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.
```

---

## ■ Execution Comprehension Remediation を置かない方針

read-only governance dashboard では、execution comprehension remediation を置かない。

置かない概念:

- misunderstanding detected, auto rewrite wording
- comprehension risk, execute correction
- evidence misunderstanding, attach evidence
- timeline misunderstanding, replay operation
- confidence misunderstanding, approve operation
- approval misunderstanding, change lifecycle
- propagation risk, auto block workflow
- comprehension review assigns owner

理由:

- comprehension review は read-only governance quality review である
- wording / glossary / layout adjustment には別の design / review / implementation process が必要である
- automatic remediation 自体が mutation / automation になり得る
- comprehension gap は source of truth correction の根拠ではない
- source of truth protection / warehouse boundary / blast radius を comprehension remediation だけで保証できない
- execution comprehension remediation を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Comprehension risk`
- `Misinterpretation risk`
- `Meaning caveat`
- `Comprehension limitation`
- `Human review recommended`
- `No execution remediation`

---

## ■ 導入段階案

### Step 0: Comprehension Risk Policy の明文化

本ドキュメントで comprehension risk / misinterpretation risk / misunderstanding propagation / comprehension limitation の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Comprehension / Misinterpretation Semantics Review

確認:

- comprehension risk が governance quality risk として扱われているか
- misinterpretation risk が user blame ではなく design risk として扱われているか
- comprehension risk から execution permission が出ていないか

### Step 2: Evidence / Timeline Risk Review

確認:

- evidence available が correctness guarantee に見えていないか
- evidence missing が upload action に見えていないか
- timeline relation が causal proof / replay eligibility に見えていないか

### Step 3: Confidence / Approval Risk Review

確認:

- confidence high が safe to execute に見えていないか
- unknown confidence が safe to ignore に見えていないか
- approval approved / lifecycle completed / review completed が混同されていないか

### Step 4: Cross-dashboard Propagation Review

確認:

- compare diff が source of truth error として recovery に伝播していないか
- observability health が incident resolved として伝播していないか
- trace relation が replay eligibility として伝播していないか

### Step 5: Comprehension Degradation Review

確認:

- confusing pair に caveat / tooltip / glossary があるか
- comprehension limitation が review / audit limitation として説明されているか
- repeated degradation を readability / semantic / boundary review に戻せるか

### Step 6: No Execution Comprehension Remediation Review

確認:

- `comprehension risk, execute correction` のような概念がないか
- comprehension review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- comprehension review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B26-02 では、comprehension risk policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- comprehension review contract 実装
- comprehension visualization 実装
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

- まず comprehension risk / misinterpretation risk semantics を固定する必要がある
- misunderstanding propagation / comprehension limitation を review 可能にする必要がある
- evidence / timeline / confidence / approval misunderstanding risk を整理する必要がある
- execution comprehension remediation を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard comprehension risk policy は、read-only governance dashboard の comprehension risk / misinterpretation risk / misunderstanding propagation / comprehension limitation を継続的に review し、誤読・誤判断・誤った execution expectation を防ぐための方針である。

evidence misunderstanding risk、timeline misunderstanding risk、confidence misunderstanding risk、approval misunderstanding risk、cross-dashboard misunderstanding propagation、comprehension degradation、comprehension review heuristics、comprehension review lifecycle を整理し、execution comprehension remediation を置かないことで、visibility と mutation の境界を守る。
