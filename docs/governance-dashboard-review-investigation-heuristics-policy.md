# Governance Dashboard Review and Investigation Heuristics Policy（Phase B20-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の review heuristics / investigation heuristics / evidence review heuristics / audit heuristics を整理する。

Phase B16 から B19 では、information density、navigation workflow、freshness、consistency、trust / confidence、ambiguity / uncertainty、prioritization / attention、escalation / coordination の semantics を整理した。そこでは、dashboard 上の signal は review / investigation / audit を支援するものであり、assignment mutation や execution trigger ではないことを明確にした。

Phase B20-01 では、それらの signal を人間がどう読むか、どの順序で確認するか、どの evidence を優先して見るか、false-positive や limitation をどう意識するかを heuristics として整理する。目的は実行判断を自動化することではなく、read-only dashboard 上で調査・監査の見立てを支えることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

review and investigation heuristics policy は、read-only dashboard の signal を人間が安全に読み解くための方針である。

基本方針:

- heuristics は review / investigation / audit の補助である
- heuristics は correctness guarantee ではない
- heuristics は assignment mutation ではない
- heuristics は approval / execution permission ではない
- high confidence / critical / escalation があっても automatic execution しない
- false-positive / false-negative の可能性を意識する
- evidence / timeline / compare / observability を分けて確認する
- compare / observability / recovery の investigation semantics を分ける
- limitation を audit note として説明できるようにする
- execution heuristics を置かない

---

## ■ Review and Investigation Heuristics Policy の目的

この policy の目的は、operator / reviewer / domain owner / auditor が、dashboard 上の signal を過信せず、必要な順序で確認できるようにすることである。

答えたい問い:

- review は何から見始めるべきか
- investigation はどの evidence / timeline / compare を辿るべきか
- hotspot や aging をどう見立てるべきか
- uncertainty / conflicting evidence がある場合に何を確認すべきか
- cross-warehouse risk では何を最優先に見るべきか
- audit 時にどの limitation を残すべきか
- false-positive / false-negative をどう意識するか
- heuristics が execution instruction に見えていないか

---

## ■ Review Heuristics

review heuristics は、reviewer が read-only dashboard 上で差異・状態・根拠を確認する順序の目安である。

初期確認順:

1. read-only / no execution indication
2. severity / risk / attention level
3. warehouse_code / affected warehouse list
4. reason_code / reason_text
5. stale / partial / consistency / confidence / uncertainty warning
6. related incident / operation
7. evidence completeness
8. timeline / trace reference

方針:

- review は approval mutation ではない
- review heuristics は reviewer の判断補助である
- reason_code だけで原因を確定しない
- high / critical scope では evidence と warehouse boundary を優先確認する
- review result を local UI state で operation_state に反映しない
- review から approve / reject / execute button を出さない

表示候補:

- `Suggested review path`
- `Review checklist candidate`
- `Review limitation`
- `Human review recommended`

---

## ■ Investigation Heuristics

investigation heuristics は、差異や incident の原因を調査する際の確認順である。

確認順:

```text
Signal
  -> Scope / warehouse boundary
  -> Compare context
  -> Source history / projection context
  -> Evidence package
  -> Timeline / trace reference
  -> Confidence / uncertainty limitation
```

方針:

- investigation は correction / rebuild / replay の実行ではない
- compare result は source of truth error と断定しない
- projection delay / stale / partial / unknown を分けて確認する
- conflicting evidence がある場合は片方を自動採用しない
- investigation limitation を audit note として残せるようにする

調査観点:

- source of truth に対応履歴があるか
- projection / read model が遅延・欠落していないか
- warehouse_code boundary が明確か
- timeline event が欠落・競合していないか
- evidence は source of truth の代替になっていないか

---

## ■ Evidence Review Heuristics

evidence review heuristics は、evidence package / evidence item を確認する際の見立てである。

確認対象:

- compare summary
- before / after summary
- dry-run result
- approval evidence
- execution evidence
- post-compare evidence
- trace timeline
- hotspot / trend snapshot
- warehouse boundary evidence
- attachment reference

確認順:

1. evidence completeness
2. warehouse boundary evidence
3. before / after consistency
4. dry-run / post-compare presence
5. trace / timeline reference
6. stale / partial / conflicting evidence warning
7. attachment reference quality

方針:

- evidence available は operation correctness の保証ではない
- evidence missing は attach action ではなく audit warning とする
- stale evidence と missing evidence を分ける
- conflicting evidence は human investigation candidate とする
- evidence review から attach / edit / approve / execute button を出さない

---

## ■ Timeline Review Heuristics

timeline review heuristics は、incident / operation / evidence / trace の時系列を読むための見立てである。

確認対象:

- incident timeline
- operation lifecycle timeline
- evidence timeline
- trace timeline reference
- request_id grouping
- trace_id / parent_trace_id relationship

確認順:

1. timeline type
2. generated_at / event range
3. latest key event
4. missing lifecycle event
5. event order gap
6. related ID consistency
7. conflicting timeline warning

方針:

- timeline は source of truth の代替ではない
- timeline generated_at と event timestamp を分ける
- missing event は business failure と断定しない
- operation lifecycle timeline と trace timeline を混同しない
- timeline review から replay / correction / rebuild を実行しない

---

## ■ Hotspot Heuristics

hotspot heuristics は、繰り返し発生する location / part / project / warehouse の signal を読むための見立てである。

確認対象:

- recurring location_code
- recurring warehouse_code
- recurring part_no
- recurring project_no
- recurring reason_code
- repeated failed operation
- recurring evidence missing

方針:

- hotspot は recurring issue の入口である
- hotspot は incident 確定ではない
- hotspot は execution trigger ではない
- top hotspot は overview で絞って表示する
- detail では related incident / operation / evidence context を見る
- hotspot が recurring でも source of truth error と断定しない

確認観点:

- 同じ scope で再発しているか
- reason_code が同じか
- projection / read model 側の偏りか
- operation / input process 側の偏りか
- warehouse boundary に関係するか

---

## ■ Uncertainty Investigation Heuristics

uncertainty investigation heuristics は、不明・曖昧・競合がある signal を調査するための見立てである。

対象:

- unknown state
- ambiguous cause
- conflicting evidence
- conflicting timeline
- conflicting compare result
- confidence unknown / low
- trust boundary unknown

方針:

- unknown は safe ではない
- ambiguous cause は複数解釈を保持する
- conflicting evidence は片方を自動採用しない
- uncertainty reason と confidence reason を分ける
- high / critical scope の uncertainty は強調する
- uncertainty investigation から correction / rebuild / replay を実行しない

確認観点:

- 何が unknown か
- どの evidence が conflict しているか
- checked scope / unchecked scope はどこか
- generated_at / source query version はあるか
- warehouse boundary は明確か

---

## ■ Cross-warehouse Investigation Heuristics

cross-warehouse investigation heuristics は、warehouse_code boundary に関わる signal を調査するための見立てである。

対象:

- cross-warehouse risk
- warehouse_code mismatch
- affected warehouse list が multiple
- warehouse boundary evidence missing
- unknown warehouse scope
- trace timeline warehouse mismatch

確認順:

1. primary warehouse_code
2. affected warehouse list
3. source rows warehouse_code
4. projection rows warehouse_code
5. trace timeline warehouse_code
6. evidence warehouse_code
7. warehouse boundary evidence

方針:

- cross-warehouse は critical risk として扱う
- unknown warehouse scope は safe ではない
- domain owner attention を候補にする
- warehouse boundary evidence を優先確認する
- cross-warehouse investigation から execution button を出さない
- warehouse_code ごとに scope を分けて見られるかを確認する

---

## ■ Audit Heuristics

audit heuristics は、後から incident / operation / evidence / timeline を説明するための確認目安である。

確認対象:

- incident_id
- operation_id
- evidence_package_id
- warehouse_code / affected warehouse list
- severity / risk / attention reason
- lifecycle state
- approval status
- evidence completeness
- generated_at / snapshot date
- trace_id / request_id / parent_trace_id
- stale / partial / consistency / confidence / uncertainty limitation

方針:

- audit は source of truth と evidence package の責務を分ける
- audit package は source of truth の代替ではない
- limitation を隠さない
- false-positive / false-negative の可能性を説明できるようにする
- audit heuristics から correction / rebuild / replay を実行しない

---

## ■ False-positive Awareness

false-positive awareness は、dashboard signal が実際の問題ではない可能性を意識するための方針である。

false-positive 候補:

- stale projection による一時的 mismatch
- delayed snapshot による trend discrepancy
- filter context の違いによる count mismatch
- timeline aggregation delay
- attachment reference の古い情報
- project_no / inventory_type の粒度差

方針:

- false-positive 可能性を理由に signal を無視しない
- false-positive 可能性は investigation limitation として扱う
- generated_at / filter / query version / scope を確認する
- false-positive と確認できるまでは review candidate とする
- false-positive awareness から automatic resolution を行わない

---

## ■ Review Limitation Awareness

review limitation awareness は、人間の review にも限界があることを明示するための方針である。

limitation 候補:

- evidence incomplete
- stale data
- partial consistency
- unknown confidence
- ambiguous cause
- conflicting timeline
- missing warehouse boundary evidence
- unknown owner / role context
- unchecked scope

方針:

- limitation は audit note として説明できるようにする
- limitation がある場合は resolved と断定しない
- limitation を confidence / uncertainty と関連付ける
- high / critical scope の limitation は強調する
- limitation から execution を促さない

---

## ■ Compare / Observability / Recovery Investigation Separation

compare / observability / recovery は、investigation heuristics の意味が異なる。

| Area | Investigation focus | 誤解しないこと |
| --- | --- | --- |
| Compare | row-level diff / reason / projection mismatch | source of truth error と断定しない |
| Observability | backlog / hotspot / trend / health の背景 | incident resolution と同一視しない |
| Recovery | incident / operation / approval / evidence / lifecycle の governance context | correction executed と同一視しない |
| Trace | timeline / request chain / relation の確認 | replay permission と同一視しない |

方針:

- compare investigation と recovery approval を混同しない
- observability investigation と incident resolution を混同しない
- recovery investigation と execution priority を混同しない
- trace investigation と replay eligibility を混同しない
- dashboard 間 link から execution しない

---

## ■ Heuristic Visualization Policy

heuristic visualization は、review / investigation の見立てを分かりやすく表示するための方針である。

表示候補:

- `Suggested review path`
- `Investigation hint`
- `Evidence review hint`
- `Timeline review hint`
- `False-positive candidate`
- `Review limitation`
- `Audit note candidate`
- `Human investigation recommended`

方針:

- heuristics は label / text / tooltip として表示する
- heuristics を button にしない
- heuristic reason を detail で確認できるようにする
- color だけに依存しない
- high / critical scope の heuristics は attention と関連付ける
- heuristic visualization から execution affordance を出さない

例:

```text
[INVESTIGATION HINT]
Reason: stale compare result and missing post-compare evidence.
Suggested review: verify generated_at, compare scope, and evidence package.
This is a read-only heuristic. No execution action is available here.
```

---

## ■ Execution Heuristics を置かない方針

read-only governance dashboard では、execution heuristics を置かない。

置かない概念:

- heuristic says rebuild
- heuristic says replay
- heuristic says approve
- false-positive means resolve
- hotspot means auto sync
- cross-warehouse means execute split
- confidence high means execute
- attention high means execute first

理由:

- heuristics は read-only review / investigation / audit のための見立てである
- heuristics は原因分類を確定しない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を heuristics だけで保証できない
- heuristics を execution trigger にすると監査性が弱くなる

代替表現:

- `Suggested review`
- `Investigation hint`
- `Human review recommended`
- `Evidence review recommended`
- `Recheck recommended`
- `Read-only heuristic`

---

## ■ 導入段階案

### Step 0: Review and Investigation Heuristics Policy の明文化

本ドキュメントで review heuristics / investigation heuristics / evidence review heuristics / audit heuristics を整理する。

この段階では実装しない。

### Step 1: Review Heuristics Review

確認:

- review path が approval mutation に見えていないか
- reason_code だけで原因を確定していないか
- high / critical scope で evidence / warehouse boundary を優先しているか

### Step 2: Evidence / Timeline Heuristics Review

確認:

- evidence available を correctness guarantee として扱っていないか
- missing / stale / conflicting evidence を limitation として扱っているか
- timeline review から replay / correction / rebuild に進んでいないか

### Step 3: Hotspot / Uncertainty Heuristics Review

確認:

- hotspot を incident / execution trigger と断定していないか
- unknown / conflicting evidence を human investigation candidate として扱っているか
- uncertainty reason と confidence reason を分けているか

### Step 4: Cross-warehouse Heuristics Review

確認:

- affected warehouse list / boundary evidence が確認対象になっているか
- unknown warehouse scope を safe と見せていないか
- cross-warehouse investigation から execution していないか

### Step 5: Audit / Limitation Review

確認:

- limitation を audit note として残せるか
- false-positive / false-negative awareness があるか
- audit package を source of truth の代替にしていないか

### Step 6: No Execution Heuristics Review

確認:

- `heuristic says rebuild` のような概念がないか
- heuristics から correction / rebuild / replay / approval / retry に進んでいないか
- heuristic warning が read-only signal として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B20-01 では、review and investigation heuristics policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- heuristic contract 実装
- heuristic visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず review / investigation heuristics を固定する必要がある
- heuristics と execution decision を分ける必要がある
- false-positive / limitation awareness を review / audit に組み込む必要がある
- execution heuristics を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard review and investigation heuristics policy は、read-only governance dashboard 上の signal を人間が安全に読み解くための設計方針である。

review heuristics、investigation heuristics、evidence / timeline review heuristics、hotspot / uncertainty / cross-warehouse investigation heuristics、audit heuristics、false-positive / review limitation awareness を整理し、execution heuristics を置かないことで、visibility と mutation の境界を守る。
