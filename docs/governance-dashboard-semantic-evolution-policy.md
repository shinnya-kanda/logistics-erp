# Governance Dashboard Semantic Evolution Policy（Phase B22-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、governance dashboard の semantic versioning / terminology evolution / glossary migration / semantic change governance を整理する。

Phase B22-01 では、governance dashboard 全体の semantics consistency / terminology consistency / rationale consistency / semantic drift prevention を整理した。そこでは、same term は same meaning で使い、warning / confidence / uncertainty / lineage の wording を揃え、execution semantics を置かないことを明確にした。

Phase B22-02 では、semantic consistency を維持したまま、用語・tooltip・glossary・audit wording を段階的に進化させるための governance を整理する。目的は、semantic change が operator / reviewer / domain owner / auditor の誤読を生まないようにし、過去の audit wording と将来の wording を説明可能にすることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

semantic evolution policy は、dashboard の用語・意味・説明文を安全に変更するための方針である。

基本方針:

- semantic evolution は read-only governance wording の変更管理である
- semantic versioning は意味変更の説明単位として扱う
- terminology evolution は glossary と整合させる
- glossary migration は audit wording history を壊さない
- backward semantic compatibility を考慮する
- deprecated wording は残す場合も意味を明記する
- semantic change は review してから採用する
- compare / observability / recovery の semantic separation を維持する
- semantic evolution limitation を隠さない
- execution semantics evolution を置かない

---

## ■ Semantic Evolution Policy の目的

この policy の目的は、governance dashboard の意味体系を時間経過で安全に更新できるようにすることである。

答えたい問い:

- 用語変更が既存 audit wording と矛盾しないか
- `reviewed` や `resolved` のような用語が途中で意味を変えていないか
- warning / confidence / uncertainty / lineage の意味変更を説明できるか
- glossary の migration が operator の誤読を生まないか
- old wording をいつまで表示・説明対象にするか
- semantic diff を review できるか
- compare / observability / recovery の意味分離が維持されているか
- semantic evolution が execution permission に見えていないか

---

## ■ Semantic Versioning

semantic versioning は、dashboard wording / glossary / tooltip / rationale pattern の意味変更を説明するための versioning 方針である。

versioning 対象候補:

- glossary version
- terminology set version
- tooltip pattern version
- rationale pattern version
- warning wording version
- confidence wording version
- uncertainty wording version
- lineage wording version
- audit wording version

version 区分候補:

| Change type | 意味 |
| --- | --- |
| patch | 誤字修正・表現改善。意味は変えない |
| minor | 補足説明・tooltip 追加。既存意味を維持する |
| major | 用語の意味・分類・誤解防止 caveat を変更する |

方針:

- version は execution capability の version ではない
- semantic version は operator / auditor に説明できる単位にする
- major change は semantic change review を必須候補にする
- version 未記録の wording は limitation として扱う
- semantic version から correction / rebuild / replay を実行しない

---

## ■ Terminology Evolution

terminology evolution は、用語を追加・変更・統合・廃止するための方針である。

変更候補:

- new term addition
- term rename
- term split
- term merge
- tooltip update
- caveat update
- deprecated wording replacement
- audit wording clarification

方針:

- 新しい用語は既存 glossary と照合する
- confusing pair は分離したまま維持する
- term rename は old term と new term の関係を説明する
- term split は旧意味がどちらへ分かれたかを説明する
- term merge は失われる nuance を limitation として説明する
- terminology evolution から action wording を導入しない

---

## ■ Glossary Migration

glossary migration は、glossary の用語・定義・tooltip を新しい意味体系へ移すための方針である。

migration 対象:

- term definition
- tooltip text
- caveat
- synonym
- deprecated wording
- audit wording
- screen label
- documentation reference

方針:

- glossary migration は DB migration ではない
- old term / new term / reason / effective scope を説明する
- audit wording で old term が残る場合は glossary note を付ける
- migration 後も過去 snapshot / evidence / audit package の wording を説明できるようにする
- glossary migration から execution workflow を出さない

例:

```text
Glossary migration:
Old wording: reviewed
New wording: review completed
Reason: avoid confusion with resolved.
Caveat: review completed does not mean correction completed.
```

---

## ■ Backward Semantic Compatibility

backward semantic compatibility は、過去の dashboard output / audit wording / snapshot wording を、新しい glossary でも説明できるようにする考え方である。

互換性対象:

- historical snapshot label
- audit package wording
- evidence summary wording
- incident timeline wording
- operation lifecycle wording
- exported report wording
- screenshot / attachment reference wording

方針:

- 過去 wording を現在の意味で上書き解釈しない
- old glossary version の意味を参照できる余地を残す
- semantic change は past audit record を無効化しない
- backward compatibility が不十分な場合は audit limitation とする
- compatibility のために execution semantics を追加しない

---

## ■ Deprecated Wording Policy

deprecated wording policy は、使わなくなる用語や誤解を招きやすい表現の扱いを整理する。

deprecated 候補:

- action に見える wording
- correctness guarantee に見える wording
- lifecycle / approval / evidence を混同する wording
- confidence / uncertainty を混同する wording
- lineage を causal proof に見せる wording
- observability health を recovery resolved と見せる wording

方針:

- deprecated wording は新規 screen / tooltip で使わない
- 過去 audit wording では historical term として説明する
- replacement wording と caveat を明記する
- deprecated だからといって過去 record を書き換えない
- deprecated wording から execution action を連想させない

例:

| Deprecated | Replacement | Caveat |
| --- | --- | --- |
| `Fix now` | `Suggested review` | review signal only |
| `Retry` | `Retry candidate` | no retry action in this view |
| `Resolved` | `Resolution evidence available` | not correction guarantee |
| `Safe` | `Low risk` | not execution permission |

---

## ■ Semantic Change Review

semantic change review は、用語・説明・tooltip・rationale pattern の変更が dashboard 全体に与える影響を確認する。

review 対象:

- changed term
- old meaning
- new meaning
- affected dashboard area
- affected tooltip
- affected audit wording
- affected glossary entry
- deprecated wording
- compatibility limitation
- execution wording risk

方針:

- major semantic change は review note を残す候補にする
- compare / observability / recovery / trace の影響を分けて確認する
- operator safety / cognitive load への影響を確認する
- semantic change を execution trigger にしない
- unresolved semantic concern は limitation として扱う

---

## ■ Audit Wording History

audit wording history は、過去に使われた用語・tooltip・audit note を後から説明できるようにする考え方である。

history 対象:

- audit note wording
- evidence package label
- lifecycle label
- approval label
- severity label
- confidence label
- uncertainty label
- lineage label
- snapshot label

方針:

- audit wording は当時の glossary version で説明する
- old wording と current wording の対応を残す候補にする
- wording history は source of truth の代替ではない
- wording history gap は audit limitation として扱う
- audit wording history から correction / rebuild / replay を実行しない

---

## ■ Semantic Diff Review

semantic diff review は、semantic change の before / after を比較し、意味の変化を明示する。

diff 観点:

- label diff
- tooltip diff
- caveat diff
- glossary definition diff
- rationale pattern diff
- lineage wording diff
- audit wording diff
- forbidden wording diff

方針:

- textual diff だけでなく meaning diff を確認する
- action affordance が増えていないか確認する
- old / new の誤解しやすい点を明記する
- semantic diff は review / audit のための visibility とする
- semantic diff から automatic wording migration を実行しない

例:

```text
Semantic diff:
Old: Evidence available
New: Evidence linked for review
Meaning change: reduce correctness guarantee impression.
Execution impact: none. This remains read-only wording.
```

---

## ■ Cross-dashboard Semantic Evolution

cross-dashboard semantic evolution は、compare / observability / recovery / trace の用語変更を横断的に管理する方針である。

方針:

- shared term は dashboard 全体で同時に review する
- area-specific term は対象 area を明記する
- compare term を recovery term として流用しない
- observability health term を incident lifecycle term として流用しない
- trace relation term を replay permission term として流用しない
- cross-dashboard semantic evolution から navigation / execution action を追加しない

確認対象:

- navigation label
- tab label
- summary card label
- badge label
- tooltip
- detail heading
- audit note
- empty / stale / error text

---

## ■ Semantic Evolution Limitation

semantic evolution limitation は、semantic change の影響や互換性を十分に説明できない状態である。

limitation 候補:

- old meaning unknown
- glossary version unknown
- audit wording history missing
- deprecated wording still visible
- tooltip mismatch
- cross-dashboard wording mismatch
- semantic diff incomplete
- translation mismatch
- mixed local language / English term ambiguity

方針:

- semantic evolution limitation を隠さない
- limitation は semantic review note として扱う
- limitation がある wording を stable と断定しない
- limitation は operator safety risk として確認する
- semantic evolution limitation から execution を促さない

表示候補:

- `Semantic evolution limitation`
- `Glossary version unknown`
- `Deprecated wording visible`
- `Semantic diff incomplete`
- `Wording review recommended`

---

## ■ Semantic Governance Lifecycle

semantic governance lifecycle は、semantic change を提案から採用・廃止まで管理する考え方である。

state 候補:

| State | 意味 |
| --- | --- |
| proposed | semantic change が提案された |
| reviewing | glossary / dashboard 影響を review 中 |
| accepted | 採用方針が決まった |
| deprecated | 旧 wording を非推奨にした |
| replaced | 新 wording へ置き換えた |
| documented | audit / glossary で説明可能になった |

方針:

- lifecycle は semantic governance の状態であり execution lifecycle ではない
- accepted は UI 実装完了を意味しない
- replaced は過去 audit wording の削除を意味しない
- documented は correctness guarantee ではない
- semantic governance lifecycle から assignment mutation を行わない

---

## ■ Compare / Observability / Recovery Semantic Evolution Separation

compare / observability / recovery は、semantic evolution の対象と影響が異なる。

| Area | Evolution focus | 誤解しないこと |
| --- | --- | --- |
| Compare | diff / severity / reason / scope wording の変化 | cause confirmed に近づけない |
| Observability | backlog / hotspot / trend / health wording の変化 | recovery completed に近づけない |
| Recovery | incident / operation / approval / evidence / lifecycle wording の変化 | execution permission に近づけない |
| Trace | request / trace / parent chain wording の変化 | replay eligibility に近づけない |

方針:

- compare semantic evolution は correction wording を導入しない
- observability semantic evolution は incident resolution wording を導入しない
- recovery semantic evolution は execution button wording を導入しない
- trace semantic evolution は replay execution wording を導入しない
- area 間の wording 移植は semantic change review を通す

---

## ■ Semantic Evolution Visualization Policy

semantic evolution visualization は、用語変更・deprecated wording・semantic diff を読みやすく表示するための方針である。

表示候補:

- `Semantic version`
- `Glossary version`
- `Deprecated wording`
- `Replacement wording`
- `Semantic diff`
- `Wording history`
- `Semantic evolution limitation`
- `Read-only semantic change`

方針:

- semantic evolution は review note / detail / glossary reference として表示する
- semantic version は execution capability version として見せない
- deprecated wording は action warning ではなく wording warning として表示する
- semantic diff は short summary + detail reference とする
- semantic evolution visualization から execution affordance を出さない

例:

```text
[SEMANTIC EVOLUTION NOTE]
Glossary version: 2.1
Deprecated wording: Resolved
Replacement: Resolution evidence available
Reason: avoid implying correction completed.
This is a read-only semantic change. No execution action is available here.
```

---

## ■ Execution Semantics Evolution を置かない方針

read-only governance dashboard では、execution semantics evolution を置かない。

置かない概念:

- semantic version enables execution
- glossary migration enables action
- deprecated wording triggers correction
- semantic diff triggers rebuild
- wording history permits replay
- semantic governance lifecycle assigns owner
- accepted semantic change means UI action available
- replacement wording means operation resolved

理由:

- semantic evolution は read-only wording / interpretation / audit explainability の変更管理である
- semantic version は execution capability を示さない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を semantic evolution だけで保証できない
- execution semantics evolution を置くと read-only dashboard の責務が曖昧になる

代替表現:

- `Semantic version`
- `Glossary migration`
- `Wording history`
- `Semantic diff`
- `Wording review recommended`
- `Read-only semantic evolution`

---

## ■ 導入段階案

### Step 0: Semantic Evolution Policy の明文化

本ドキュメントで semantic versioning / terminology evolution / glossary migration / semantic change governance を整理する。

この段階では実装しない。

### Step 1: Semantic Versioning Review

確認:

- semantic version が execution capability に見えていないか
- patch / minor / major の意味変更範囲が説明されているか
- version unknown を limitation として扱えるか

### Step 2: Terminology / Glossary Migration Review

確認:

- old term / new term / reason / caveat が説明されているか
- deprecated wording の replacement が明確か
- glossary migration が DB migration と混同されていないか

### Step 3: Compatibility / Audit Wording Review

確認:

- past audit wording を当時の意味で説明できるか
- old wording を current wording で上書き解釈していないか
- audit wording history gap を limitation として扱っているか

### Step 4: Semantic Diff Review

確認:

- textual diff だけでなく meaning diff を確認しているか
- action affordance が増えていないか
- forbidden wording が再導入されていないか

### Step 5: Cross-dashboard Evolution Review

確認:

- compare / observability / recovery / trace の semantic separation が維持されているか
- shared term と area-specific term が分かれているか
- area 間の wording 移植が semantic drift を起こしていないか

### Step 6: No Execution Semantics Evolution Review

確認:

- `semantic version enables execution` のような概念がないか
- glossary migration から correction / rebuild / replay / approval / retry に進んでいないか
- semantic governance lifecycle が assignment mutation に見えていないか
- semantic evolution が read-only wording governance として扱われているか

---

## ■ 今回は実装しない判断

Phase B22-02 では、semantic evolution policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- semantic versioning contract 実装
- glossary migration 実装
- semantic evolution visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず semantic evolution governance を固定する必要がある
- terminology evolution / glossary migration / semantic diff の意味を整理する必要がある
- audit wording history と backward semantic compatibility を明確にする必要がある
- execution semantics evolution を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard semantic evolution policy は、read-only governance dashboard の terminology / glossary / tooltip / audit wording を安全に進化させるための governance 方針である。

semantic versioning、terminology evolution、glossary migration、backward semantic compatibility、deprecated wording、semantic change review、audit wording history、semantic diff review、semantic governance lifecycle を整理し、execution semantics evolution を置かないことで、visibility と mutation の境界を守る。
