# Governance Dashboard Meaning Consistency Policy（Phase B27-02）

作成日: 2026-05-12

---

## ■ 目的

このドキュメントは、governance dashboard における meaning consistency / interpretation consistency / semantic expectation consistency / cross-dashboard meaning alignment を継続 review する governance を整理する。

Phase B22 では semantic consistency / glossary alignment を整理し、same term は same meaning で使い、conflicting semantics を warning / limitation として扱う方針を定義した。Phase B27-01 では meaning boundary を整理し、dashboard signal が「何を意味するか」と「何を意味しないか」を明確にし、execution expectation に広がらないようにする方針を定義した。

Phase B27-02 では、meaning boundary を維持したまま、dashboard 全体で meaning が一貫しているかを継続的に review する。目的は、compare / observability / recovery / trace の間で、evidence / timeline / confidence / approval などの meaning が揺れず、review / investigation / audit の判断材料として安全に読めるようにすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

meaning consistency policy は、dashboard signal の意味が screen / component / document / audit context を跨いでも同じ意味で読めるようにするための方針である。

基本方針:

- same concept は same meaning で扱う
- same term は same semantic expectation にする
- meaning / not meaning の組を dashboard 間で揃える
- interpretation consistency を review / investigation / audit の安全条件として扱う
- semantic expectation consistency を glossary と alignment する
- evidence / timeline / confidence / approval の meaning consistency を重点 review する
- cross-dashboard meaning alignment を確認する
- meaning inconsistency は review limitation として扱う
- meaning consistency review は human review を補助する
- execution meaning synchronization を置かない

---

## ■ Meaning Consistency Policy の目的

この policy の目的は、dashboard 上の signal がどこで表示されても同じ意味で解釈され、誤った semantic drift や execution expectation を生まないようにすることである。

答えたい問い:

- `evidence available` はどの dashboard でも同じ意味か
- `trace relation` はどの文脈でも replay eligibility と誤読されていないか
- `confidence high` はどの文脈でも safe to execute に見えていないか
- `approval approved` は lifecycle completed と混同されていないか
- compare / observability / recovery / trace 間で shared badge の意味が揺れていないか
- glossary / tooltip / detail / audit wording が同じ meaning を表しているか
- meaning inconsistency が review / audit limitation として説明されているか
- meaning consistency review が correction / rebuild / replay に進んでいないか

---

## ■ Meaning Consistency Semantics

meaning consistency は、同じ concept / term / signal が dashboard 全体で同じ意味を持ち、異なる concept が同じ意味として混同されない状態である。

対象:

- term
- badge
- warning
- status
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

- meaning は glossary / tooltip / detail / audit wording で揃える
- same label を different meaning に使わない
- different meaning には different caveat を付ける
- meaning inconsistency は semantic / comprehension limitation として扱う
- meaning consistency から execution affordance を出さない

---

## ■ Interpretation Consistency Semantics

interpretation consistency は、user が dashboard signal から読み取ってよい解釈の範囲が、dashboard 間で揃っている状態である。

揃える interpretation:

- review signal
- investigation hint
- audit limitation
- source provenance reference
- evidence reference
- timeline reference
- confidence limitation
- semantic caveat

揃えてはいけない interpretation:

- execution permission
- source of truth correction decision
- replay eligibility
- approval mutation
- assignment mutation
- incident resolution
- automatic sync

方針:

- interpretation は human review / investigation / audit の補助として揃える
- interpretation は cause confirmed ではない
- interpretation は permission ではない
- interpretation inconsistency は comprehension risk として扱う
- interpretation consistency から workflow execution を開始しない

---

## ■ Semantic Expectation Consistency

semantic expectation consistency は、label / tooltip / glossary / rationale から user が期待してよい意味が dashboard 全体で揃っている状態である。

expectation 対象:

- `approved`
- `completed`
- `available`
- `missing`
- `critical`
- `high confidence`
- `lineage complete`
- `trace relation`
- `review completed`
- `retry candidate`

方針:

- expectation は glossary の定義に寄せる
- same term は same expectation にする
- semantic expectation は execution capability を含まない
- expectation が広がりすぎる場合は `not meaning` caveat を表示する
- semantic expectation inconsistency は operator safety risk として扱う

---

## ■ Cross-dashboard Meaning Alignment

cross-dashboard meaning alignment は、compare / observability / recovery / trace 間で shared term / badge / warning / reference の meaning が揃っている状態である。

alignment 対象:

- Compare -> Recovery diff / reason / severity
- Observability -> Recovery health / hotspot / trend
- Recovery -> Trace lifecycle / approval / evidence
- Trace -> Recovery timeline / request chain
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
- cross-dashboard meaning alignment から operation workflow を開始しない

---

## ■ Evidence Meaning Consistency

evidence meaning consistency は、evidence status / evidence package / evidence summary の意味が dashboard 全体で揃っている状態である。

consistent meaning:

- evidence is available for review
- evidence is missing
- evidence is partial
- audit package has linked reference
- post-compare evidence exists / missing

consistent not meaning:

- operation is correct
- incident is resolved
- source of truth is verified
- upload action is required from dashboard
- execution approval exists

方針:

- evidence は audit / review の補助として扱う
- evidence available は correctness guarantee ではない
- evidence missing は upload action ではない
- evidence completeness と audit readiness を分ける
- evidence meaning inconsistency から correction / rebuild / replay を実行しない

---

## ■ Timeline Meaning Consistency

timeline meaning consistency は、timeline event / trace relation / request chain の意味が dashboard 全体で揃っている状態である。

consistent meaning:

- event was recorded / referenced
- lifecycle event is visible
- request_id / trace_id / parent_trace_id relation is visible
- timeline gap may need review
- missing event is an audit warning

consistent not meaning:

- causal proof is established
- replay is eligible
- correction is required
- failed event means retry action is available
- parent_trace_id is approval hierarchy

方針:

- timeline は investigation / audit の補助として扱う
- timeline relation は causal proof ではない
- trace relation は replay permission ではない
- missing event は audit warning として扱う
- timeline meaning inconsistency から replay / correction / rebuild を実行しない

---

## ■ Confidence Meaning Consistency

confidence meaning consistency は、confidence level / confidence reason / confidence limitation の意味が dashboard 全体で揃っている状態である。

consistent meaning:

- review / investigation / audit の判断材料としての有用度
- data / evidence / scope の揃い具合
- limitation の強さ
- human review の必要度

consistent not meaning:

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
- confidence meaning inconsistency から automatic correction / rebuild / replay を行わない

---

## ■ Approval Meaning Consistency

approval meaning consistency は、approval status / lifecycle state / review state の意味が dashboard 全体で揃っている状態である。

consistent meaning:

- approval governance state is visible
- execution approval may exist as state
- lifecycle state is visible
- review state is visible
- approval / lifecycle / review can be audited as references

consistent not meaning:

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
- approval meaning inconsistency から approval mutation を行わない

---

## ■ Glossary Alignment Review

glossary alignment review は、meaning consistency を維持するために glossary / tooltip / screen label / audit wording を照合する。

review 対象:

- glossary definition
- tooltip
- badge label
- section heading
- empty / stale / partial / error wording
- audit note
- evidence wording
- timeline wording
- confidence wording
- approval wording

方針:

- glossary は meaning consistency の anchor とする
- tooltip は glossary の短縮形として扱う
- audit wording は glossary と同じ meaning で使う
- glossary にない用語は meaning / not meaning を明記する
- glossary alignment review から glossary migration execution を行わない

---

## ■ Meaning Inconsistency Degradation Semantics

meaning inconsistency degradation は、same term / same concept が dashboard 間で異なる meaning として扱われ、誤読・誤判断・execution expectation の risk が高まる状態である。

degradation 候補:

- same label が different meaning で使われる
- meaning / not meaning が dashboard 間で異なる
- glossary と tooltip が矛盾する
- evidence meaning が correctness に寄る
- timeline meaning が causal proof に寄る
- confidence meaning が permission に寄る
- approval meaning が completed に寄る
- cross-dashboard handoff で meaning が変わる

方針:

- meaning inconsistency は governance quality degradation として扱う
- degradation は business incident の確定ではない
- degradation は review / investigation / audit limitation として扱う
- repeated degradation は meaning boundary / semantic consistency / glossary review に戻す
- meaning inconsistency から execution synchronization を行わない

---

## ■ Meaning Consistency Heuristics

meaning consistency heuristics は、meaning inconsistency を human review で見つけやすくするための観点である。

検知観点:

- same term が same meaning で使われているか
- meaning / not meaning が dashboard 間で揃っているか
- evidence available がどこでも correctness guarantee に見えていないか
- timeline relation がどこでも causal proof に見えていないか
- confidence high がどこでも safe to execute に見えていないか
- approval approved がどこでも operation completed に見えていないか
- glossary / tooltip / audit wording が alignment しているか
- cross-dashboard link 先でも meaning が維持されているか

方針:

- heuristics は detection support であり automatic synchronization ではない
- high / critical meaning inconsistency は human review recommended とする
- false-positive awareness を持つ
- repeated issue は terminology / semantic / meaning boundary review に戻す
- heuristic result から execution action を出さない

---

## ■ Meaning Consistency Lifecycle

meaning consistency lifecycle は、meaning inconsistency candidate を発見してから整理・確認・記録するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | meaning inconsistency candidate が見つかった |
| reviewing | affected term / concept / dashboard を review 中 |
| classified | inconsistency type を分類した |
| glossary_alignment_needed | glossary / tooltip / audit wording の alignment が必要と判断した |
| limitation_recorded | meaning inconsistency limitation として説明可能にした |
| review_recommended | human review recommended とした |
| meaning_consistency_reaffirmed | meaning consistency が保たれていると確認した |

方針:

- meaning consistency lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- glossary_alignment_needed は glossary migration 実行ではない
- limitation_recorded は safe approval ではない
- lifecycle から assignment mutation を行わない

---

## ■ Meaning Consistency Visualization Policy

meaning consistency visualization は、meaning alignment / inconsistency / limitation / review note を読みやすく表示するための方針である。

表示候補:

- `Meaning consistency`
- `Meaning alignment`
- `Meaning inconsistency`
- `Glossary alignment`
- `Interpretation consistency`
- `Semantic expectation consistency`
- `Meaning limitation`
- `Human review recommended`
- `No execution synchronization`

方針:

- meaning consistency visualization は review note として扱う
- meaning inconsistency warning は action button にしない
- affected term / meaning / not meaning / limitation を短く表示する
- color だけに依存しない
- visualization 自体が overload にならないようにする
- meaning consistency visualization から execution affordance を出さない

例:

```text
[MEANING CONSISTENCY NOTE]
Term: Approval approved
Consistent meaning: execution approval exists as governance state.
Consistent not meaning: operation completed or post-compare verified.
This is a read-only meaning note. No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.
```

---

## ■ Execution Meaning Synchronization を置かない方針

read-only governance dashboard では、execution meaning synchronization を置かない。

置かない概念:

- meaning inconsistency detected, auto sync wording
- glossary mismatch, auto migrate glossary
- evidence meaning mismatch, attach evidence
- timeline meaning mismatch, replay operation
- confidence meaning mismatch, approve operation
- approval meaning mismatch, change lifecycle
- cross-dashboard mismatch, auto block workflow
- meaning consistency review assigns owner

理由:

- meaning consistency review は read-only governance quality review である
- wording / glossary / tooltip / audit wording alignment には別の design / review / implementation process が必要である
- automatic synchronization 自体が mutation / automation になり得る
- meaning inconsistency は source of truth correction の根拠ではない
- source of truth protection / warehouse boundary / blast radius を meaning synchronization だけで保証できない
- execution meaning synchronization を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Meaning consistency`
- `Meaning alignment`
- `Meaning inconsistency`
- `Glossary alignment needed`
- `Human review recommended`
- `No execution synchronization`

---

## ■ 導入段階案

### Step 0: Meaning Consistency Policy の明文化

本ドキュメントで meaning consistency / interpretation consistency / semantic expectation consistency / cross-dashboard meaning alignment の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Meaning / Interpretation Consistency Review

確認:

- same term が same meaning で使われているか
- interpretation が dashboard 間で揺れていないか
- interpretation consistency から execution permission が出ていないか

### Step 2: Evidence / Timeline Meaning Consistency Review

確認:

- evidence available がどこでも correctness guarantee に見えていないか
- evidence missing がどこでも upload action に見えていないか
- timeline relation がどこでも causal proof / replay eligibility に見えていないか

### Step 3: Confidence / Approval Meaning Consistency Review

確認:

- confidence high がどこでも safe to execute に見えていないか
- unknown confidence がどこでも safe と見えていないか
- approval approved / lifecycle completed / review completed が混同されていないか

### Step 4: Cross-dashboard Meaning Alignment Review

確認:

- compare diff が source of truth error として recovery に伝播していないか
- observability health が incident resolved として伝播していないか
- trace relation が replay eligibility として伝播していないか

### Step 5: Glossary / Degradation Review

確認:

- glossary / tooltip / audit wording が alignment しているか
- meaning inconsistency が review / audit limitation として説明されているか
- repeated degradation を meaning boundary / semantic consistency review に戻せるか

### Step 6: No Execution Meaning Synchronization Review

確認:

- `meaning inconsistency, auto sync wording` のような概念がないか
- meaning consistency review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- meaning consistency review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B27-02 では、meaning consistency policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- meaning consistency contract 実装
- meaning consistency visualization 実装
- wording synchronization 実装
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

- まず meaning consistency / semantic expectation consistency semantics を固定する必要がある
- interpretation consistency / cross-dashboard meaning alignment を review 可能にする必要がある
- evidence / timeline / confidence / approval meaning consistency を整理する必要がある
- execution meaning synchronization を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard meaning consistency policy は、read-only governance dashboard の meaning consistency / interpretation consistency / semantic expectation consistency / cross-dashboard meaning alignment を継続的に review し、same term / same concept が dashboard 間で揺れないようにするための方針である。

evidence meaning consistency、timeline meaning consistency、confidence meaning consistency、approval meaning consistency、glossary alignment、meaning inconsistency degradation、meaning consistency heuristics、meaning consistency lifecycle を整理し、execution meaning synchronization を置かないことで、visibility と mutation の境界を守る。
