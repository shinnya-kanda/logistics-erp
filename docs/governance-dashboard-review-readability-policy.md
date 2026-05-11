# Governance Dashboard Review Readability Policy（Phase B26-01）

作成日: 2026-05-11

---

## ■ 目的

このドキュメントは、governance dashboard の review readability / scanability / comprehension quality / review comprehension safety を継続 review する governance を整理する。

Phase B15 から B16 では、accessibility / usability、information density、progressive disclosure、scanability、dashboard layering を整理した。Phase B20-02 では cognitive load / operator safety を整理し、読みやすさ自体を安全要件として扱った。Phase B25-02 では review fatigue / alert fatigue / signal noise / review overload を整理し、重要 signal が情報量や noise に埋もれない方針を定義した。

Phase B26-01 では、それらを review readability governance として継続的に確認する。目的は、operator / reviewer / domain owner / auditor が dashboard を短時間で読み取り、重要な signal、根拠、制限、read-only boundary を誤読しないようにすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

review readability policy は、dashboard の情報が読みやすく、scan しやすく、理解しやすく、安全に review / investigation / audit できるかを継続的に確認するための方針である。

基本方針:

- readability は governance quality の一部として扱う
- scanability は operator safety の一部として扱う
- comprehension quality は誤読防止の品質として扱う
- read-only / no execution indication を常に読み取れるようにする
- overview / list / detail / evidence / timeline の読み方を分ける
- badge / warning は category + value + caveat で読み取れるようにする
- long text は detail / expansion / reference に分ける
- cross-dashboard readability を確認する
- readability degradation を隠さない
- execution readability remediation を置かない

---

## ■ Review Readability Policy の目的

この policy の目的は、dashboard が情報量を増やしても、user が「何を見ているか」「何が重要か」「何が制限か」「何を実行しないか」を安全に理解できるようにすることである。

答えたい問い:

- overview で最重要 signal を短時間に読み取れるか
- list row で比較に必要な項目だけを scan できるか
- detail で reason / evidence / timeline / limitation を辿れるか
- badge / warning の category と意味が分かるか
- timeline が時系列として読みやすいか
- evidence が source of truth や correctness guarantee と誤読されないか
- cross-dashboard navigation 後も同じ意味で読めるか
- readability degradation が review limitation として扱われているか
- readability review が UI mutation や execution remediation に見えていないか

---

## ■ Review Readability Semantics

review readability は、dashboard 上の governance signal を人間が読み取りやすく、誤読しにくい状態を示す。

readability 対象:

- page title / section title
- read-only indication
- summary card
- list row
- detail panel
- badge / warning
- rationale / explanation
- evidence summary
- timeline
- reference link
- limitation note

方針:

- readability は cosmetic quality ではなく operator safety quality として扱う
- readability は correctness guarantee ではない
- readability high は execution permission ではない
- readability gap は review limitation として扱う
- readability から correction / rebuild / replay を実行しない

---

## ■ Scanability Semantics

scanability は、user が短時間で重要 signal と次に確認すべき context を見つけられる性質である。

scan order:

1. `READ ONLY` / `NO EXECUTION`
2. critical / cross-warehouse
3. warehouse_code / affected scope
4. severity / risk / attention
5. lifecycle / approval
6. evidence / post-compare
7. stale / partial / unknown / confidence limitation
8. related reference

方針:

- scan order を screen 間で揃える
- important ID / warehouse_code / severity / risk を同じ位置に置く
- critical / cross-warehouse を折りたたみ内に隠しすぎない
- long text は scan 対象から外し detail に置く
- execution action を scan order に入れない

---

## ■ Comprehension Quality Semantics

comprehension quality は、dashboard の表示が user に正しい意味で伝わる品質である。

quality 観点:

- label clarity
- concept separation
- caveat visibility
- limitation visibility
- source / derived distinction
- confidence / uncertainty distinction
- review / approval distinction
- evidence / correctness distinction
- lineage / permission distinction

方針:

- same concept は same label で表示する
- confusing pair は tooltip / glossary / caveat で分ける
- `approved` と `completed` を混同させない
- `evidence available` を correctness guarantee と見せない
- `lineage complete` を permission と見せない
- comprehension gap は misinterpretation risk として扱う

---

## ■ Review Comprehension Safety

review comprehension safety は、dashboard を読んだ user が誤った判断や誤実行に進まないようにする安全方針である。

safety risk:

- critical attention を execute now と読む
- suggested review を action instruction と読む
- approval status を approval control と読む
- retry candidate を retry action と読む
- stale data を inconsistent と読む
- empty result を no issue と読む
- evidence available を correct と読む

方針:

- review comprehension は read-only framing と一緒に設計する
- suggested review は短く、action wording にしない
- disabled execution button で safety を表現しない
- misunderstanding-prone term には caveat を付ける
- comprehension safety から execution affordance を出さない

---

## ■ Overview Readability

overview readability は、dashboard 全体の状態と優先確認 signal を短時間で把握できる状態である。

overview に出す候補:

- critical / high count
- cross-warehouse risk count
- review_required / unresolved count
- stale / partial summary
- evidence missing count
- failed operation count
- top hotspot
- generated_at

方針:

- overview は full evidence / full timeline を表示しない
- summary card は key metric に絞る
- critical / cross-warehouse は最上位に置く
- count と representative examples を分ける
- overview から execution button を出さない

---

## ■ Detail Readability

detail readability は、選択した incident / operation / evidence / trace の根拠と制限を安全に読める状態である。

detail に出す候補:

- reason / rationale
- affected scope
- warehouse boundary
- lifecycle / approval status
- evidence completeness
- generated_at / freshness
- confidence / uncertainty limitation
- related timeline / trace
- source provenance / lineage

方針:

- detail は section を分けて読む順序を作る
- reason / scope / limitation をまとめて表示する
- long text は paragraph / list / expansion に分ける
- evidence / timeline / lineage の責務を混同しない
- detail から correction / rebuild / replay / approval / retry を実行しない

---

## ■ Badge / Warning Readability

badge / warning readability は、短い表示でも category と意味を誤読しない状態である。

badge / warning 対象:

- severity
- risk
- lifecycle
- approval
- evidence
- stale / partial / error
- confidence
- uncertainty
- attention
- lineage limitation

方針:

- badge は category + value で表示する
- color だけに依存しない
- same color でも category label を表示する
- warning は business failure と断定しない
- warning reason / affected scope / limitation を detail で確認できるようにする
- badge / warning を action button に見せない

---

## ■ Timeline Readability

timeline readability は、incident / operation / evidence / trace の時系列を安全に追える状態である。

timeline に含める候補:

- timestamp
- event type
- lifecycle state
- actor / source
- related ID
- request_id / trace_id / parent_trace_id
- evidence status
- missing event warning
- conflicting timeline warning

方針:

- timeline type を明示する
- timestamp / event / actor / related ID を分けて表示する
- missing event は audit warning として表示する
- timeline event は mutation control にしない
- timeline から replay / correction / rebuild を実行しない

---

## ■ Evidence Readability

evidence readability は、audit evidence / evidence package / evidence summary を source of truth や correctness guarantee と誤読せず読める状態である。

evidence に含める候補:

- evidence status
- evidence_package_id
- before / after summary
- dry-run result reference
- post-compare evidence
- warehouse boundary evidence
- trace timeline reference
- attachment reference
- evidence limitation

方針:

- evidence available は operation correct ではない
- evidence missing は upload action ではない
- evidence completeness と audit readiness を分けて表示する
- stale / partial / conflicting evidence を明示する
- evidence view から attach / approve / execute button を出さない

---

## ■ Cross-dashboard Readability Review

cross-dashboard readability review は、compare / observability / recovery / trace を移動しても、表示の意味と読み方が一貫しているかを確認する。

review 対象:

- navigation label
- dashboard title
- tab structure
- summary card
- badge / warning
- generated_at / freshness
- warehouse_code / trace_id / request_id label
- related reference link
- empty / stale / partial / error wording

方針:

- compare は diff readability として確認する
- observability は trend / hotspot readability として確認する
- recovery は lifecycle / evidence / incident readability として確認する
- trace は timeline / request chain readability として確認する
- dashboard 間 link は read-only reference として表示する
- cross-dashboard readability gap から operation workflow を開始しない

---

## ■ Readability Degradation Semantics

readability degradation は、dashboard が読みづらくなり、重要 signal の見落とし、誤読、review fatigue、audit limitation の risk が高まる状態である。

degradation 候補:

- scan order が screen 間で揺れる
- critical / cross-warehouse が埋もれる
- badge category が不明になる
- warning reason が見えない
- long text が overview / list に出すぎる
- timeline event が多すぎて流れが読めない
- evidence と correctness が混同される
- read-only indication が弱い
- cross-dashboard label が揺れる

方針:

- readability degradation は governance quality degradation として扱う
- degradation は business incident の確定ではない
- degradation は review / investigation / audit limitation として扱う
- repeated degradation は information density / fatigue / semantic review に戻す
- readability degradation から execution remediation を行わない

---

## ■ Readability Review Heuristics

readability review heuristics は、readability degradation を human review で見つけやすくするための観点である。

検知観点:

- read-only / no execution が最初に分かるか
- critical / cross-warehouse が見えるか
- warehouse_code / affected scope が同じ位置で読めるか
- badge が category + value で読めるか
- warning reason / limitation が辿れるか
- overview に detail が出すぎていないか
- timeline の event order が分かるか
- evidence available が correct と見えていないか
- cross-dashboard link 先でも意味が維持されているか

方針:

- heuristics は detection support であり automatic remediation ではない
- high / critical readability issue は human review recommended とする
- false-positive awareness を持つ
- repeated issue は density / fatigue / accessibility review に戻す
- heuristic result から execution action を出さない

---

## ■ Readability Review Lifecycle

readability review lifecycle は、readability issue candidate を発見してから整理・確認・記録するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | readability issue candidate が見つかった |
| reviewing | affected screen / section / scope を review 中 |
| classified | readability issue type を分類した |
| limitation_recorded | readability limitation として説明可能にした |
| review_recommended | human review recommended とした |
| readability_reaffirmed | readability が保たれていると確認した |

方針:

- readability review lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- limitation_recorded は safe approval ではない
- readability_reaffirmed は correctness guarantee ではない
- lifecycle から assignment mutation を行わない

---

## ■ Readability Visualization Policy

readability visualization は、readability status / limitation / review note を読みやすく表示するための方針である。

表示候補:

- `Readability review note`
- `Scanability limitation`
- `Comprehension limitation`
- `Badge readability issue`
- `Timeline readability issue`
- `Evidence readability issue`
- `Cross-dashboard readability issue`
- `Human review recommended`
- `No execution remediation`

方針:

- readability visualization は review note として扱う
- readability warning は action button にしない
- issue type / affected scope / limitation を短く表示する
- color だけに依存しない
- readability note も overload にならないようにする
- readability visualization から execution affordance を出さない

例:

```text
[READABILITY REVIEW NOTE]
Type: timeline readability issue
Scope: operation lifecycle timeline
Reason: missing event and post-compare warning are not visually separated.
Review: verify event order and evidence references.
This is a read-only readability note. No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.
```

---

## ■ Execution Readability Remediation を置かない方針

read-only governance dashboard では、execution readability remediation を置かない。

置かない概念:

- readability issue, auto rewrite wording
- scanability issue, auto suppress signal
- comprehension issue, execute correction
- timeline unreadable, replay operation
- evidence unreadable, attach evidence
- badge confusing, approve operation
- readability review assigns owner
- readability issue triggers sync

理由:

- readability review は read-only governance quality review である
- wording / grouping / layout adjustment には別の design / review / implementation process が必要である
- automatic remediation 自体が mutation / automation になり得る
- readability gap は source of truth correction の根拠ではない
- source of truth protection / warehouse boundary / blast radius を readability remediation だけで保証できない
- execution readability remediation を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Readability review note`
- `Scanability limitation`
- `Comprehension limitation`
- `Human review recommended`
- `Design review recommended`
- `No execution remediation`

---

## ■ 導入段階案

### Step 0: Review Readability Policy の明文化

本ドキュメントで review readability / scanability / comprehension quality / review comprehension safety の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Readability / Scanability Semantics Review

確認:

- readability が governance quality として扱われているか
- scan order が screen 間で揃っているか
- readability から execution permission が出ていないか

### Step 2: Overview / Detail Readability Review

確認:

- overview が key signal に絞られているか
- detail で reason / scope / evidence / limitation を辿れるか
- long text が overview / list に出すぎていないか

### Step 3: Badge / Warning / Timeline Review

確認:

- badge が category + value で読めるか
- warning reason と limitation が分かるか
- timeline event が timestamp / event / actor / related ID で追えるか

### Step 4: Evidence / Comprehension Safety Review

確認:

- evidence available が correctness guarantee に見えていないか
- suggested review が action instruction に見えていないか
- confusing pair が caveat / tooltip / glossary で分かれているか

### Step 5: Cross-dashboard Readability Review

確認:

- compare / observability / recovery / trace の読み方が分かれているか
- dashboard 間 link が read-only reference として扱われているか
- link 先で badge / warning / label の意味が維持されているか

### Step 6: No Execution Readability Remediation Review

確認:

- `readability issue, execute correction` のような概念がないか
- readability review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- readability review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B26-01 では、review readability policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- readability review contract 実装
- readability visualization 実装
- layout remediation 実装
- signal suppression 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず review readability / scanability / comprehension quality semantics を固定する必要がある
- overview / detail / badge / warning / timeline / evidence readability を review 可能にする必要がある
- readability degradation と readability review lifecycle を明確にする必要がある
- execution readability remediation を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard review readability policy は、read-only governance dashboard の review readability / scanability / comprehension quality / review comprehension safety を継続的に review し、重要 signal の見落とし・誤読・監査不能・read-only boundary の弱体化を防ぐための方針である。

overview readability、detail readability、badge / warning readability、timeline readability、evidence readability、cross-dashboard readability、readability degradation、readability review heuristics、readability review lifecycle を整理し、execution readability remediation を置かないことで、visibility と mutation の境界を守る。
