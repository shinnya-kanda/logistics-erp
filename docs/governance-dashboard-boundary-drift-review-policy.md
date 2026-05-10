# Governance Dashboard Boundary Drift Review Policy（Phase B23-02）

作成日: 2026-05-11

---

## ■ 目的

このドキュメントは、read-only governance dashboard の boundary drift / action affordance drift / execution leakage を継続的に review する governance を整理する。

Phase B23-01 では、policy boundary / responsibility boundary / visibility boundary / mutation boundary を整理し、visibility / reasoning / lineage / semantics / review / audit が mutation / approval execution / workflow execution に滲み出さない方針を明確にした。

Phase B23-02 では、その boundary が時間経過や機能追加により弱くならないように、boundary drift の意味、検知観点、review lifecycle、cross-dashboard review、可視化方針を整理する。目的は、read-only governance dashboard に action affordance や execution leakage が混入する前に発見し、review / investigation / audit の責務境界を守ることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

boundary drift review policy は、read-only governance dashboard の責務境界が時間経過で崩れていないかを継続的に確認するための方針である。

基本方針:

- boundary drift は operator safety risk として扱う
- action affordance drift を早期に検知する
- execution leakage を許容しない
- visibility / reasoning / lineage / semantics / review / audit の境界を守る
- drift は limitation / review note として扱う
- drift review は remediation execution ではない
- cross-dashboard navigation でも drift を確認する
- disabled execution button で drift を隠さない
- drift detection は human review を補助する
- execution drift remediation を置かない

---

## ■ Boundary Drift Review Policy の目的

この policy の目的は、dashboard の read-only boundary が少しずつ action / workflow / mutation に寄っていくことを防ぐことである。

答えたい問い:

- `candidate` が action button に近づいていないか
- `suggested review` が execution instruction に見えていないか
- `approval status` が approval mutation control に見えていないか
- lineage / provenance が permission / eligibility に見えていないか
- semantic review が automation trigger に見えていないか
- audit evidence が operation execution の代替に見えていないか
- reference navigation が workflow start に見えていないか
- cross-dashboard link により execution leakage が発生していないか
- drift が残る場合に limitation として説明されているか

---

## ■ Boundary Drift Semantics

boundary drift は、本来 read-only visibility / review / investigation / audit のための表示が、徐々に mutation / workflow / execution に見えるようになる状態である。

drift の例:

- label が action-like になる
- link が button-like になる
- suggestion が instruction-like になる
- candidate が executable-like になる
- status が control-like になる
- reference が workflow start-like になる
- explanation が decision-like になる
- lineage が permission-like になる

方針:

- drift は小さな wording / layout / interaction の変化から発生する
- drift は bug ではなく governance risk として review する
- drift は user 誤読と audit 説明不能の原因になる
- drift は read-only indication だけでは解消しない
- drift から execution remediation を行わない

---

## ■ Action Affordance Drift

action affordance drift は、read-only UI 要素が action できるように見える状態である。

drift 候補:

- badge が button に見える
- reference link が action button に見える
- card click が operation start に見える
- disabled button が future action を示唆する
- tooltip が action permission を暗示する
- icon が run / execute / approve を連想させる
- empty state が next action を促す

方針:

- action-like label / icon / layout を避ける
- reference link は read-only reference と明示する
- disabled execution button を置かない
- card click は navigation / filter / drilldown に限定する
- action affordance drift は boundary limitation として review する

避ける wording:

- `Run`
- `Execute`
- `Approve`
- `Retry`
- `Resolve`
- `Fix`
- `Apply`
- `Sync`

---

## ■ Execution Leakage Semantics

execution leakage は、read-only dashboard の中に execution action / execution permission / execution workflow を暗示する要素が漏れ込む状態である。

leakage 候補:

- execution button
- approval / rejection control
- retry control
- correction / rebuild / replay start
- assignment control
- evidence upload
- lifecycle transition
- auto sync indication
- API mutation hook
- workflow start link

方針:

- execution leakage は read-only boundary violation として扱う
- leakage は UI 要素だけでなく wording / tooltip / navigation でも発生する
- leakage candidate は semantic / boundary review に戻す
- leakage を disabled state で残さない
- leakage から automatic remediation を実行しない

---

## ■ Visibility-to-Mutation Drift

visibility-to-mutation drift は、表示情報が mutation permission や mutation trigger に見える状態である。

drift 例:

- `Visible issue` が `fixable now` に見える
- `Evidence missing` が upload action に見える
- `Approval pending` が approve button に見える
- `Failed operation` が retry action に見える
- `Critical count` が automatic escalation に見える

方針:

- visibility は事実・状態・根拠・制限の表示に限定する
- missing / failed / critical でも mutation UI を出さない
- mutation candidate は `candidate` / `reference` / `suggested review` として表現する
- visibility-to-mutation drift は operator safety risk として扱う
- visibility から correction / rebuild / replay を実行しない

---

## ■ Reasoning-to-Execution Drift

reasoning-to-execution drift は、rationale / heuristic / explanation が execution instruction に見える状態である。

drift 例:

- `Why this warning` が `what to execute` に見える
- `Suggested review` が `execute suggested fix` に見える
- `Investigation hint` が `run rebuild` に近づく
- `High confidence` が `safe to execute` に見える
- `False-positive candidate` が `resolve now` に見える

方針:

- reasoning は human review / investigation / audit の補助に限定する
- suggested review は action instruction にしない
- rationale は cause confirmed ではない
- confidence / priority / heuristic を execution trigger にしない
- reasoning drift から execution remediation を行わない

---

## ■ Lineage-to-Permission Drift

lineage-to-permission drift は、provenance / lineage / derived-from relationship が permission / eligibility に見える状態である。

drift 例:

- `Lineage complete` が `safe to execute` に見える
- `Trace relation` が `replay eligible` に見える
- `Evidence lineage` が `operation correct` に見える
- `Derived from snapshot` が `auto sync available` に見える
- `Source provenance available` が `approval ready` に見える

方針:

- lineage は source / derivation / limitation の説明である
- lineage は causal proof ではない
- lineage complete は permission ではない
- trace relation は replay eligibility ではない
- lineage-to-permission drift は audit limitation として扱う

---

## ■ Semantics-to-Automation Drift

semantics-to-automation drift は、terminology / glossary / semantic review / semantic evolution が automation trigger に見える状態である。

drift 例:

- `Semantic version` が capability version に見える
- `Glossary migration` が DB migration に見える
- `Semantic diff` が automatic wording migration に見える
- `Deprecated wording` が automatic correction trigger に見える
- `Semantic governance lifecycle` が assignment workflow に見える

方針:

- semantics は wording / meaning / audit explainability の governance である
- semantic review は automation review ではない
- semantic lifecycle は execution lifecycle ではない
- terminology limitation は action cue にしない
- semantics-to-automation drift から execution remediation を行わない

---

## ■ Review-to-Approval Drift

review-to-approval drift は、review signal / review workflow が approval mutation や execution approval に見える状態である。

drift 例:

- `Review completed` が `Approval approved` に見える
- `Reviewer attention` が approve action に見える
- `Human review recommended` が approval request に見える
- `Evidence review` が execution approval に見える
- `Semantic review note` が governance approval に見える

方針:

- review は確認・調査・監査の補助である
- approval は controlled execution workflow の governance state である
- review completed は approval approved ではない
- approval status は read-only 表示に限定する
- review-to-approval drift から approval mutation を行わない

---

## ■ Dashboard-to-Workflow Drift

dashboard-to-workflow drift は、navigation / drilldown / filter / reference link が workflow execution に見える状態である。

drift 例:

- cross-dashboard link が workflow start に見える
- drilldown が operation preparation に見える
- filter handoff が mutation scope selection に見える
- timeline navigation が replay preparation に見える
- evidence navigation が upload workflow に見える

方針:

- dashboard は navigation / reference / drilldown を提供する
- workflow execution は dashboard の責務外とする
- filter / search / selection は UI state として扱う
- workflow hint は suggested review として扱う
- dashboard-to-workflow drift から workflow remediation を実行しない

---

## ■ Audit-to-Operation Drift

audit-to-operation drift は、audit evidence / audit note / audit lineage が operation execution や operation correctness に見える状態である。

drift 例:

- `Audit evidence available` が `operation correct` に見える
- `Post-compare evidence` が `resolved` に見える
- `Audit lineage` が operation permission に見える
- `Audit wording history` が execution history に見える
- `Evidence package complete` が correction completed に見える

方針:

- audit は説明可能性と根拠確認の visibility である
- evidence available は correctness guarantee ではない
- audit lineage は permission ではない
- audit wording history は execution history ではない
- audit-to-operation drift から operation remediation を行わない

---

## ■ Drift Detection Heuristics

drift detection heuristics は、boundary drift の兆候を human review で見つけやすくするための観点である。

検知観点:

- action verb が混入していないか
- button-like style が read-only element に使われていないか
- `candidate` が `ready` に近い表現になっていないか
- `suggested` が `required` に近い表現になっていないか
- `reference` が `start` に近い表現になっていないか
- `confidence high` が `safe` に近い表現になっていないか
- `lineage complete` が `permission` に近い表現になっていないか
- `review completed` が `approval approved` と混同されていないか

方針:

- heuristics は detection support であり automatic remediation ではない
- high-risk drift は human review recommended とする
- repeated drift は terminology / boundary review に戻す
- false-positive awareness を持つ
- heuristic result から execution action を出さない

---

## ■ Drift Review Lifecycle

drift review lifecycle は、drift candidate を発見してから整理・記録・確認するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | drift candidate が見つかった |
| reviewing | wording / layout / navigation の影響を review 中 |
| classified | drift type を分類した |
| accepted_as_limitation | 残す場合に limitation として説明する |
| wording_adjustment_candidate | wording 調整候補にした |
| boundary_reaffirmed | read-only boundary を再確認した |

方針:

- drift review lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- wording adjustment candidate は UI 実装指示ではない
- accepted_as_limitation は safe approval ではない
- lifecycle から assignment mutation を行わない

---

## ■ Cross-dashboard Drift Review

cross-dashboard drift review は、compare / observability / recovery / trace 間の link や wording により boundary drift が起きていないかを確認する。

review 対象:

- Compare -> Recovery reference
- Recovery -> Trace reference
- Observability -> Recovery reference
- Trace -> Recovery reference
- shared badge / tooltip
- shared filter / search context
- warehouse_code / trace_id / request_id label
- empty / stale / partial / error wording

方針:

- dashboard 間 link は reference navigation とする
- context handoff は mutation handoff ではない
- cross-dashboard wording は semantic consistency review と連携する
- link 先でも execution affordance がないことを確認する
- cross-dashboard drift から operation workflow を開始しない

---

## ■ Drift Visualization Policy

drift visualization は、boundary drift candidate や drift limitation を読みやすく表示するための方針である。

表示候補:

- `Boundary drift candidate`
- `Action affordance risk`
- `Execution leakage risk`
- `Boundary limitation`
- `Wording review recommended`
- `Read-only boundary reaffirmed`
- `No execution remediation`

方針:

- drift visualization は review note として扱う
- drift warning は action button にしない
- drift type / affected scope / limitation を短く表示する
- color だけに依存しない
- drift visualization から execution affordance を出さない

例:

```text
[BOUNDARY DRIFT REVIEW NOTE]
Type: action affordance drift
Signal: "Retry candidate" is displayed near failed operation detail.
Review: ensure this remains a read-only candidate, not a retry action.
No correction, rebuild, replay, approval, retry, assignment, or sync is executed here.
```

---

## ■ Execution Drift Remediation を置かない方針

read-only governance dashboard では、execution drift remediation を置かない。

置かない概念:

- drift detected, auto remove button
- drift detected, auto disable workflow
- drift detected, execute correction
- execution leakage triggers rollback
- action affordance triggers UI mutation
- boundary drift triggers assignment
- drift review triggers approval
- leakage risk triggers rebuild / replay

理由:

- drift review は read-only governance quality review である
- remediation には別の design / review / implementation process が必要である
- automatic remediation 自体が mutation / automation になり得る
- source of truth protection / warehouse boundary / blast radius を drift remediation だけで保証できない
- execution drift remediation を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Boundary drift candidate`
- `Wording review recommended`
- `Human review recommended`
- `Boundary limitation`
- `Read-only boundary reaffirmed`
- `No execution remediation`

---

## ■ 導入段階案

### Step 0: Boundary Drift Review Policy の明文化

本ドキュメントで boundary drift / action affordance drift / execution leakage の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Drift Semantics Review

確認:

- boundary drift と execution leakage の意味が分かれているか
- drift を bug ではなく governance risk として扱えているか
- drift から execution remediation に進んでいないか

### Step 2: Action Affordance / Visibility Drift Review

確認:

- read-only element が button-like に見えていないか
- visibility が mutation permission に見えていないか
- disabled execution button で boundary を表現していないか

### Step 3: Reasoning / Lineage / Semantics Drift Review

確認:

- rationale が execution instruction に見えていないか
- lineage が permission / eligibility に見えていないか
- semantic governance が automation trigger に見えていないか

### Step 4: Review / Dashboard / Audit Drift Review

確認:

- review signal が approval mutation に見えていないか
- dashboard navigation が workflow start に見えていないか
- audit evidence が operation correctness に見えていないか

### Step 5: Cross-dashboard Drift Review

確認:

- dashboard 間 link が reference navigation として扱われているか
- link 先でも execution affordance がないか
- shared wording が semantic drift を起こしていないか

### Step 6: No Execution Drift Remediation Review

確認:

- `drift detected, execute remediation` のような概念がないか
- drift review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- drift review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B23-02 では、boundary drift review policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- drift review contract 実装
- drift visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず boundary drift / action affordance drift / execution leakage semantics を固定する必要がある
- visibility / reasoning / lineage / semantics / review / dashboard / audit の drift を review 可能にする必要がある
- drift detection heuristics と drift review lifecycle を明確にする必要がある
- execution drift remediation を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard boundary drift review policy は、read-only governance dashboard の boundary drift / action affordance drift / execution leakage を継続的に review し、read-only boundary を守るための governance 方針である。

visibility-to-mutation、reasoning-to-execution、lineage-to-permission、semantics-to-automation、review-to-approval、dashboard-to-workflow、audit-to-operation の drift を整理し、execution drift remediation を置かないことで、visibility と mutation の境界を守る。
