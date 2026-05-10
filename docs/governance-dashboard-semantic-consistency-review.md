# Governance Dashboard Semantic Consistency Review（Phase B22-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、governance dashboard 全体の semantics consistency / terminology consistency / rationale consistency / semantic drift prevention を整理する。

Phase B15 から B21 では、read-only governance dashboard の terminology / glossary、freshness、consistency、trust / confidence、ambiguity / uncertainty、prioritization / attention、escalation / coordination、review / investigation heuristics、cognitive load / operator safety、explainability / rationale、provenance / lineage を整理した。

Phase B22-01 では、それらの意味体系が dashboard 間で矛盾しないように、semantic consistency review の観点を定義する。目的は、operator / reviewer / domain owner / auditor が同じ label / warning / rationale / lineage を同じ意味で読み取れるようにし、semantic drift による誤読や execution への誤誘導を防ぐことである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

semantic consistency review は、dashboard 上の用語・説明・警告・根拠・lineage が一貫した意味で使われているかを確認するための review 方針である。

基本方針:

- same term は same meaning で使う
- different concept には different term を使う
- warning / confidence / uncertainty / lineage の wording を揃える
- rationale は read-only explanation として揃える
- glossary と tooltip を alignment する
- compare / observability / recovery の semantic separation を維持する
- conflicting semantics を隠さない
- semantic drift を継続的に review する
- semantic review は UI execution review ではない
- execution semantics を置かない

---

## ■ Semantic Consistency Review の目的

この review の目的は、governance dashboard が扱う signal の意味が、screen / component / document / audit context を跨いでも変わらないようにすることである。

答えたい問い:

- `critical` は compare / observability / recovery で同じ意味に見えているか
- `approved` と `completed` が混同されていないか
- `evidence available` が correctness guarantee に見えていないか
- `confidence high` が execution permission に見えていないか
- `uncertainty` が safe と誤読されていないか
- `lineage` が causal proof と誤読されていないか
- `suggested review` が action instruction に見えていないか
- tooltip / badge / detail の説明が互いに矛盾していないか
- semantic drift により古い用語が別の意味で残っていないか

---

## ■ Terminology Consistency Review

terminology consistency review は、dashboard 全体で用語が同じ意味で使われているかを確認する。

review 対象:

- severity
- lifecycle
- approval
- evidence
- risk
- escalation
- stale / partial / error
- confidence
- uncertainty
- attention
- rationale
- provenance / lineage
- read-only / no execution

方針:

- glossary の定義と screen wording を照合する
- badge label と tooltip の意味を揃える
- 同じ label が異なる概念に使われていないか確認する
- domain 固有の用語と governance 用語を混同しない
- execution wording が混入していないか確認する

避ける semantic conflict:

- `approved` = `completed`
- `reviewed` = `resolved`
- `evidence available` = `correct`
- `health stable` = `incident closed`
- `lineage complete` = `safe to execute`

---

## ■ Rationale Consistency Review

rationale consistency review は、warning / priority / confidence / uncertainty の理由説明が一貫しているかを確認する。

review 対象:

- `Why this warning`
- `Why this priority`
- `Why this confidence`
- `Why this uncertainty`
- `Rationale`
- `Suggested review`
- `Explanation limitation`
- `Evidence reference`
- `Related timeline`

方針:

- rationale は category / reason / scope / limitation の順で説明する
- same signal には same rationale pattern を使う
- rationale と lineage を混同しない
- rationale と execution instruction を混同しない
- rationale limitation を隠さない

確認例:

```text
Category: Evidence
Reason: Post-compare evidence is missing.
Scope: Operation OP-001, Warehouse WH-A
Limitation: Audit verification is incomplete.
Suggested review: Open evidence package reference.
```

---

## ■ Warning Wording Consistency

warning wording consistency は、warning の表現が dashboard 間で同じ意味を持つようにする方針である。

warning 候補:

- stale data
- partial data
- consistency warning
- evidence missing
- timeline gap
- cross-warehouse risk
- confidence low / unknown
- uncertainty / conflict
- lineage limitation

方針:

- warning は business failure と断定しない
- warning は review / investigation / audit signal として表現する
- warning reason と affected scope を併記する
- warning と escalation を混同しない
- warning から correction / rebuild / replay を促さない

避ける wording:

- `Fix required now`
- `Run recovery`
- `Safe to ignore`
- `System confirmed failure`
- `Execute suggested correction`

---

## ■ Confidence Wording Consistency

confidence wording consistency は、confidence の意味が dashboard 間で揺れないようにする方針である。

confidence 用語:

- `Confidence: high`
- `Confidence: medium`
- `Confidence: low`
- `Confidence: unknown`
- `Partial confidence`
- `Confidence limitation`

方針:

- confidence は correctness guarantee ではない
- high confidence でも execution permission にしない
- low / unknown confidence は limitation として説明する
- confidence reason と uncertainty reason を分ける
- confidence wording は review support として揃える

避ける wording:

- `Safe to execute`
- `Confidence approved`
- `Auto recover due to confidence`
- `Low confidence means replay`

---

## ■ Uncertainty Wording Consistency

uncertainty wording consistency は、unknown / ambiguous / conflicting を一貫して表現するための方針である。

uncertainty 用語:

- `Unknown state`
- `Ambiguous cause`
- `Conflicting evidence`
- `Conflicting timeline`
- `Conflicting compare result`
- `Uncertainty limitation`
- `Human investigation recommended`

方針:

- uncertainty は safe ではない
- uncertainty は business failure の確定でもない
- unknown field / conflicting pair / unchecked scope を説明する
- confidence と uncertainty を混同しない
- uncertainty wording から automatic resolution を示唆しない

避ける wording:

- `No issue because unknown`
- `Conflict resolved automatically`
- `Unknown means ignore`
- `Auto choose latest evidence`

---

## ■ Lineage Wording Consistency

lineage wording consistency は、provenance / lineage / derived-from relationship の表現を揃えるための方針である。

lineage 用語:

- `Source provenance`
- `Derived from`
- `Lineage`
- `Lineage limitation`
- `Related snapshot`
- `Related compare result`
- `Related evidence`
- `Related trace`
- `Generated at`
- `Query version`

方針:

- lineage は causal proof ではない
- provenance complete を correctness guarantee と見せない
- derived-from chain を execution workflow と見せない
- lineage limitation を audit limitation として表現する
- lineage reference は read-only navigation として揃える

避ける wording:

- `Lineage says rebuild`
- `Trace lineage means replay eligible`
- `Evidence lineage proves correct`
- `Derived chain ready to execute`

---

## ■ Cross-dashboard Semantic Consistency

cross-dashboard semantic consistency は、compare / observability / recovery / trace の間で同じ概念が同じ意味で表示されることを確認する。

review 対象:

- top-level navigation label
- tab label
- summary card label
- badge label
- tooltip
- empty / stale / error text
- detail panel heading
- evidence / timeline reference
- audit note wording

方針:

- compare は difference visibility として表現する
- observability は operational quality visibility として表現する
- recovery は governance / incident / operation visibility として表現する
- trace は timeline / request chain visibility として表現する
- dashboard 間 link は reference navigation として表現する
- cross-dashboard navigation から execution を示唆しない

---

## ■ Glossary Alignment

glossary alignment は、document / tooltip / UI wording / audit wording の意味を揃えるための方針である。

alignment 対象:

- terminology glossary
- rendering model
- accessibility / usability wording
- information density wording
- freshness / consistency wording
- trust / confidence wording
- ambiguity / uncertainty wording
- prioritization / attention wording
- escalation / coordination wording
- explainability / rationale wording
- provenance / lineage wording

方針:

- 新しい用語を追加する前に既存 glossary と照合する
- glossary にない用語は意味と禁止される誤解を明記する
- tooltip は glossary の短縮形として扱う
- audit wording は glossary と同じ意味で使う
- execution wording は glossary に入れない

---

## ■ Conflicting Semantics Review

conflicting semantics review は、同じ label / signal / tooltip が異なる意味で使われていないかを確認する。

conflict 候補:

- severity と priority の混同
- risk と confidence の混同
- stale と inconsistent の混同
- partial と missing の混同
- approved と completed の混同
- reviewed と resolved の混同
- evidence available と verified の混同
- lineage complete と source truth confirmed の混同

方針:

- conflict は warning / limitation として扱う
- conflict がある用語は glossary で分離する
- confusing pair は tooltip で明示的に区別する
- conflict を execution trigger にしない
- conflict が残る場合は human review recommended とする

---

## ■ Semantic Drift Prevention

semantic drift prevention は、時間経過や機能追加により用語の意味がずれることを防ぐ方針である。

drift の例:

- `reviewed` がいつの間にか `resolved` として使われる
- `critical attention` が `execute now` に近い意味になる
- `confidence high` が correctness guarantee として扱われる
- `lineage complete` が execution permission として扱われる
- `health stable` が recovery completed として扱われる

方針:

- 新しい dashboard section 追加時に semantic review を行う
- 新しい badge / tooltip / glossary term 追加時に既存用語と照合する
- repeated wording を template 化する候補にする
- deprecated wording を残す場合は migration note ではなく glossary note として扱う
- semantic drift は operator safety risk として扱う

---

## ■ Compare / Observability / Recovery Semantic Separation Review

compare / observability / recovery は、同じ governance dashboard 内でも semantics が異なる。

| Area | Semantic focus | 誤解しないこと |
| --- | --- | --- |
| Compare | diff / severity / reason / scope の visibility | cause confirmed ではない |
| Observability | backlog / hotspot / trend / health の visibility | incident resolved ではない |
| Recovery | incident / operation / approval / evidence / lifecycle の visibility | correction executed ではない |
| Trace | request / trace / parent chain の visibility | replay permission ではない |

review 方針:

- compare reason と recovery rationale を混同しない
- observability health と recovery lifecycle completed を混同しない
- trace relation と replay eligibility を混同しない
- evidence lineage と correctness guarantee を混同しない
- dashboard 間 link は read-only reference として扱う

---

## ■ Semantic Review Visualization Policy

semantic review visualization は、semantic consistency の確認結果や注意点を読みやすく表示するための方針である。

表示候補:

- `Semantic review note`
- `Terminology aligned`
- `Terminology limitation`
- `Conflicting semantics`
- `Glossary reference`
- `Wording review recommended`
- `Read-only semantics`

方針:

- semantic review result は review note として扱う
- semantic warning は action button にしない
- terminology limitation は tooltip / detail に分ける
- conflicting semantics は human review recommended として表示する
- color だけに依存しない
- semantic review visualization から execution affordance を出さない

例:

```text
[SEMANTIC REVIEW NOTE]
Term: completed
Meaning: operation lifecycle completed, not post-compare verified.
Limitation: post-compare evidence is missing.
This is a read-only semantic note. No execution action is available here.
```

---

## ■ Execution Semantics を置かない方針

read-only governance dashboard では、execution semantics を置かない。

置かない概念:

- warning means execute
- priority means execute first
- confidence means safe to execute
- uncertainty means auto resolve
- lineage means replay eligible
- escalation means assign owner
- semantic review means mutate wording state
- glossary alignment means enable action

理由:

- semantics review は read-only review / investigation / audit のための品質管理である
- semantics は execution permission ではない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を semantics だけで保証できない
- execution semantics を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Read-only semantics`
- `Semantic review note`
- `Terminology limitation`
- `Human review recommended`
- `Glossary reference`
- `Wording review recommended`

---

## ■ 導入段階案

### Step 0: Semantic Consistency Review の明文化

本ドキュメントで semantics consistency / terminology consistency / rationale consistency / semantic drift prevention を整理する。

この段階では実装しない。

### Step 1: Terminology Review

確認:

- same term が same meaning で使われているか
- confusing pair が glossary / tooltip で分離されているか
- execution wording が混入していないか

### Step 2: Rationale / Warning / Confidence / Uncertainty Review

確認:

- rationale pattern が category / reason / scope / limitation で揃っているか
- warning が business failure と断定されていないか
- confidence / uncertainty が execution permission に見えていないか

### Step 3: Lineage Wording Review

確認:

- provenance / lineage / derived-from の意味が揃っているか
- lineage complete が correctness guarantee に見えていないか
- lineage reference が read-only navigation として扱われているか

### Step 4: Cross-dashboard Semantic Review

確認:

- compare / observability / recovery / trace の role が分かれているか
- dashboard 間 link が reference navigation として表現されているか
- observability health と recovery lifecycle が混同されていないか

### Step 5: Semantic Drift Review

確認:

- 新しい badge / tooltip / section が既存 glossary と矛盾していないか
- 古い wording が別の意味で残っていないか
- repeated wording を template 化する余地があるか

### Step 6: No Execution Semantics Review

確認:

- `warning means execute` のような概念がないか
- semantic review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や execution button を示唆していないか
- semantic review が read-only quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B22-01 では、semantic consistency review ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- semantic review contract 実装
- semantic review visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず semantics consistency / terminology consistency / rationale consistency を固定する必要がある
- warning / confidence / uncertainty / lineage wording の drift を防ぐ方針が必要である
- compare / observability / recovery の semantic separation を review 可能にする必要がある
- execution semantics を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard semantic consistency review は、read-only governance dashboard 全体で terminology / rationale / warning / confidence / uncertainty / lineage の意味を揃え、semantic drift による誤読や execution への誤誘導を防ぐための review 方針である。

semantic consistency、terminology consistency、rationale consistency、warning / confidence / uncertainty / lineage wording consistency、glossary alignment、conflicting semantics review、semantic drift prevention を整理し、execution semantics を置かないことで、visibility と mutation の境界を守る。
