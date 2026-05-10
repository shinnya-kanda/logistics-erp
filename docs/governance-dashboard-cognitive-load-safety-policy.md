# Governance Dashboard Cognitive Load and Operator Safety Policy（Phase B20-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の cognitive load / review fatigue / alert fatigue / operator safety semantics を整理する。

Phase B15 から B20-01 では、accessibility / usability、terminology、information density、navigation workflow、freshness、consistency、trust / confidence、ambiguity / uncertainty、prioritization / attention、escalation / coordination、review / investigation heuristics を整理した。そこでは、dashboard 上の signal は read-only review / investigation / audit のための補助であり、assignment mutation や execution trigger ではないことを明確にした。

Phase B20-02 では、それらの前提を cognitive load / operator safety の観点で補強し、operator が重要 signal を見落とさず、疲労や誤読により危険な判断をしないようにするための方針を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

cognitive load and operator safety policy は、read-only dashboard を安全に読み、調査し、監査するための認知負荷・疲労・誤読防止の方針である。

基本方針:

- cognitive load は operator safety の一部として扱う
- warning / badge / attention を過剰表示しない
- critical / cross-warehouse / high risk は埋もれさせない
- scan order を一貫させる
- same concept は same label / same position で表示する
- review fatigue / alert fatigue を避ける
- unknown / stale / partial / conflicting を safe と見せない
- suggested review は execution instruction にしない
- action area を置かず、read-only review に集中させる
- execution safety automation を置かない

---

## ■ Cognitive Load and Operator Safety Policy の目的

この policy の目的は、operator / reviewer / domain owner / auditor が、情報量の多い governance dashboard を安全に読み解けるようにすることである。

答えたい問い:

- 重要 signal が多すぎて見落とされていないか
- badge / warning が多すぎて fatigue を起こしていないか
- stale / partial / unknown / conflict が safe と誤読されていないか
- approved / completed / resolved が混同されていないか
- suggested next review が execution instruction に見えていないか
- investigation interruption 後に context を失わないか
- escalation が多すぎて critical signal が埋もれていないか
- safety automation と称した execution trigger が混入していないか

---

## ■ Cognitive Load Semantics

cognitive load は、operator が dashboard 上の signal を理解・比較・判断するために必要な認知負荷である。

負荷が高まる要因:

- badge が多すぎる
- warning が重複している
- 同じ色で異なる意味を表している
- critical / cross-warehouse が他の warning に埋もれる
- compare / observability / recovery の意味が混ざる
- stale / inconsistent / uncertain / low confidence が区別されない
- long reason_text / evidence / timeline が一覧に出すぎる
- action に見える UI が read-only view に混ざる

方針:

- signal は category / reason / scope に分けて表示する
- overview は key signal に絞る
- detail は必要に応じて展開する
- long text は expansion / detail / reference に置く
- cognitive load を下げるために execution button を置かない

---

## ■ Operator Overload Prevention

operator overload prevention は、operator が一度に処理すべき情報量を制限するための方針である。

方針:

- overview は critical / cross-warehouse / unresolved / evidence missing など key metric に絞る
- list row は scan に必要な項目に絞る
- detail で evidence / timeline / reason を辿る
- high density section は category label を明確にする
- low priority signal は grouping / collapse を検討する
- same reason の warning を重複表示しすぎない
- operator に execution decision を迫る表示を置かない

避けること:

- overview に full evidence を表示する
- list row に全 timeline を表示する
- warning を無制限に並べる
- critical と low priority を同じ強さで表示する
- action toolbar を置く

---

## ■ Review Fatigue Prevention

review fatigue prevention は、reviewer が多くの review signal により判断疲れを起こすことを避けるための方針である。

方針:

- review_required を severity / aging / confidence / uncertainty で整理する
- review queue は critical / high / unresolved を優先表示する
- reviewed / pending / on_hold などの status を混同しない
- recurring reason は grouping する候補にする
- suggested review は短く、具体的にする
- review limitation を隠さない
- review から approve / reject / execute button を出さない

表示候補:

- `Review priority`
- `Review limitation`
- `Suggested review path`
- `Human review recommended`
- `Review fatigue prevention: grouped by reason`

---

## ■ Alert Fatigue Prevention

alert fatigue prevention は、warning / attention / escalation が多すぎて重要 alert が無視されることを避けるための方針である。

方針:

- critical / cross-warehouse を最上位に置く
- alert category を分ける
- duplicate alert をまとめる
- low priority alert は collapse / grouping を検討する
- alert reason を短く表示する
- alert count と representative examples を分ける
- alert から action area を作らない

alert category 候補:

- critical attention
- cross-warehouse attention
- evidence missing
- stale / partial
- uncertainty / conflict
- aging / unresolved
- hotspot / recurring

---

## ■ Misinterpretation Prevention

misinterpretation prevention は、operator が dashboard signal を誤って解釈することを避けるための方針である。

誤読しやすい例:

- `approved` を `completed` と読む
- `completed` を `post-compare verified` と読む
- `empty result` を `no issue` と読む
- `stale` を `inconsistent` と読む
- `evidence available` を `operation correct` と読む
- `critical attention` を `execute now` と読む
- `hotspot` を `incident confirmed` と読む

方針:

- confusing pair は label / tooltip / glossary で分ける
- badge は category + value で表示する
- empty / stale / partial / unknown の意味を短く説明する
- suggested next review は action wording にしない
- disabled execution button で safety を表現しない

---

## ■ Operator Safety Semantics

operator safety は、operator が dashboard を見た結果として誤った実行・誤判断・誤連携に進まないようにする考え方である。

safety signal:

- read-only indication
- no execution indication
- critical / cross-warehouse visibility
- evidence limitation
- stale / partial / unknown warning
- confidence limitation
- uncertainty / conflict warning
- audit limitation

方針:

- safety は visibility / review / audit の品質として扱う
- safety は automatic correction / rebuild / replay ではない
- safety signal から action button を出さない
- operator に mutation を期待させる wording を避ける
- safety limitation を隠さない

---

## ■ Human Error Prevention

human error prevention は、operator / reviewer が UI から誤った判断をしにくくする方針である。

方針:

- source of truth / projection / evidence / snapshot の責務を分けて表示する
- same label を同じ意味で使う
- critical / cross-warehouse / unknown warehouse scope を見落とさない
- reason_code だけで原因確定しないようにする
- confidence high を correctness guarantee と見せない
- heuristics を execution instruction と見せない
- local UI state で server lifecycle / approval state を変えない

避ける UI / wording:

- `Fix now`
- `Run suggested rebuild`
- `Approve from review`
- `Safe to ignore`
- `Resolved because empty`
- `Auto recover`

---

## ■ Investigation Interruption Safety

investigation interruption safety は、調査の途中で画面遷移・中断・再開があっても context を失いにくくする方針である。

保持したい context:

- selected dashboard
- selected tab
- filter / sort / search
- selected incident / operation / evidence
- expansion state
- generated_at / stale warning
- active limitation
- related trace / timeline reference

方針:

- back navigation で context を壊さない設計余地を残す
- selected context を header / breadcrumb / panel に表示する候補にする
- interruption 後も critical / stale / limitation が見えるようにする
- partial investigation を completed と見せない
- interrupted investigation から execution action を出さない

---

## ■ Escalation Overload Prevention

escalation overload prevention は、escalation candidate が多すぎて本当に重要な escalation が埋もれることを避ける方針である。

方針:

- escalation candidate を reason / role / scope で grouping する
- cross-warehouse / critical を最上位に置く
- unresolved escalation は aging と一緒に表示する
- role attention を重複表示しすぎない
- escalation limitation を detail に分ける
- escalation は assignment / approval / execution mutation にしない
- escalation overload から automatic prioritization execution を行わない

表示候補:

- `Critical escalation`
- `Domain owner attention`
- `Unresolved escalation`
- `Escalation grouped by reason`
- `Coordination gap`

---

## ■ Dashboard Readability Safety

dashboard readability safety は、読みやすさ自体を安全要件として扱う方針である。

方針:

- scan order を screen 間で揃える
- important ID / warehouse_code / severity / risk を同じ位置に置く
- long timeline / evidence / reason は detail に逃がす
- badge category を明示する
- color だけに依存しない
- mobile / tablet でも critical / cross-warehouse を隠しすぎない
- read-only indication を常に維持する

scan order:

1. `READ ONLY` / `NO EXECUTION`
2. critical / cross-warehouse
3. warehouse_code / affected scope
4. lifecycle / approval
5. evidence / post-compare
6. stale / partial / unknown / confidence limitation
7. related reference

---

## ■ Compare / Observability / Recovery Safety Separation

compare / observability / recovery は、安全上の誤読ポイントが異なる。

| Area | Safety focus | 誤解しないこと |
| --- | --- | --- |
| Compare | diff / reason / severity の読み間違い防止 | source of truth error と断定しない |
| Observability | backlog / aging / hotspot / trend の過信防止 | incident resolution と同一視しない |
| Recovery | incident / operation / approval / evidence / lifecycle の混同防止 | correction executed と同一視しない |
| Trace | timeline / request chain / relation の過信防止 | replay permission と同一視しない |

方針:

- compare safety と recovery execution safety を混同しない
- observability health と recovery resolved を混同しない
- recovery approval と operation completed を混同しない
- trace relation と replay eligibility を混同しない
- dashboard 間 link から execution しない

---

## ■ Safety Visualization Policy

safety visualization は、operator が安全に読むための注意点・制限・read-only 性を明確にする表示方針である。

表示候補:

- `READ ONLY`
- `NO EXECUTION`
- `Operator safety note`
- `Review limitation`
- `Audit limitation`
- `Misinterpretation warning`
- `Human review recommended`
- `No execution action is available here`

方針:

- safety visualization は badge + short text とする
- safety reason を detail / tooltip で確認できるようにする
- safety warning を action button にしない
- critical / cross-warehouse と safety note を両方見えるようにする
- safety visualization から execution affordance を出さない

例:

```text
[OPERATOR SAFETY NOTE]
This compare result is a read-only review signal.
Verify warehouse boundary and evidence before drawing conclusions.
No correction, rebuild, replay, approval, or retry is executed from this dashboard.
```

---

## ■ Execution Safety Automation を置かない方針

read-only governance dashboard では、execution safety automation を置かない。

置かない概念:

- safety automation executes rebuild
- safety automation retries failed operation
- safety automation approves low risk operation
- safety automation resolves empty incident
- safety automation syncs stale projection
- safety automation assigns owner
- safety automation changes lifecycle

理由:

- operator safety は read-only visibility / review / audit のための safety である
- automation は誤読・誤実行を防ぐ前に、source of truth / approval / audit boundary の設計が必要である
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を dashboard safety automation だけで保証できない
- safety automation を置くと read-only dashboard の責務が曖昧になる

代替表現:

- `Safety note`
- `Review limitation`
- `Human review recommended`
- `Investigation hint`
- `Read-only safety signal`
- `Suggested next review`

---

## ■ 導入段階案

### Step 0: Cognitive Load and Operator Safety Policy の明文化

本ドキュメントで cognitive load / review fatigue / alert fatigue / operator safety semantics を整理する。

この段階では実装しない。

### Step 1: Cognitive Load Review

確認:

- overview / list / detail の情報量が分かれているか
- badge / warning が多すぎないか
- critical / cross-warehouse が埋もれていないか

### Step 2: Fatigue Prevention Review

確認:

- review signal / alert signal が grouping されているか
- duplicate warning が抑制されているか
- low priority signal が critical signal と同じ強さで表示されていないか

### Step 3: Misinterpretation Review

確認:

- approved / completed / resolved が混同されていないか
- stale / inconsistent / unknown / low confidence が分かれているか
- suggested review が execution instruction に見えていないか

### Step 4: Investigation Safety Review

確認:

- investigation interruption 後も context が分かるか
- partial investigation を completed と見せていないか
- timeline / evidence / compare context が安全に辿れるか

### Step 5: Dashboard Readability Safety Review

確認:

- scan order が一貫しているか
- mobile / tablet でも critical / cross-warehouse が見えるか
- color だけに依存していないか

### Step 6: No Execution Safety Automation Review

確認:

- safety automation が correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation がないか
- execution button / disabled execution button がないか
- safety note が read-only signal として扱われているか

---

## ■ 今回は実装しない判断

Phase B20-02 では、cognitive load and operator safety policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- safety contract 実装
- safety visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず cognitive load / operator safety semantics を固定する必要がある
- review fatigue / alert fatigue / misinterpretation prevention を read-only 方針に組み込む必要がある
- operator safety と execution automation を分ける必要がある
- execution safety automation を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard cognitive load and operator safety policy は、read-only governance dashboard を安全に読み、調査し、監査するための設計方針である。

cognitive load、operator overload、review fatigue、alert fatigue、misinterpretation prevention、operator safety、human error prevention、investigation interruption safety、escalation overload prevention、dashboard readability safety を整理し、execution safety automation を置かないことで、visibility と mutation の境界を守る。
