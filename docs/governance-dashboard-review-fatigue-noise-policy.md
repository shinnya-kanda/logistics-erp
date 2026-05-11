# Governance Dashboard Review Fatigue and Noise Policy（Phase B25-02）

作成日: 2026-05-11

---

## ■ 目的

このドキュメントは、governance dashboard の review fatigue / alert fatigue / signal noise / review overload を継続 review する governance を整理する。

Phase B20-02 では、cognitive load / review fatigue / alert fatigue / operator safety を整理し、warning / badge / attention の過剰表示を避け、critical / cross-warehouse を埋もれさせない方針を定義した。Phase B25-01 では、review attention quality / review signal quality / attention routing quality を整理し、noise / false-positive を attention quality degradation として扱う方針を定義した。

Phase B25-02 では、それらを fatigue / noise governance として継続的に review する。目的は、重要 signal の見落とし、review fatigue、alert fatigue、low-value signal の過剰表示、false-positive の誤読、escalation overload を防ぎながら、attention / warning / review guidance を execution remediation に接続しないことである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

review fatigue and noise policy は、dashboard 上の signal が多すぎる・重複する・誤検知を含むことにより、review / investigation / audit の品質が低下しないようにするための方針である。

基本方針:

- fatigue / noise は governance quality risk として扱う
- review fatigue は operator safety risk として扱う
- alert fatigue は critical signal の見落とし risk として扱う
- signal noise は attention quality degradation として扱う
- duplicate / low-value signal は grouping / collapse 候補にする
- false-positive candidate は resolved ではない
- escalation overload を防ぐ
- cross-dashboard noise を確認する
- fatigue review は human review を補助する
- execution fatigue remediation を置かない

---

## ■ Review Fatigue and Noise Policy の目的

この policy の目的は、operator / reviewer / domain owner / auditor が、過剰な signal による疲労や誤読を避けつつ、重要な review signal を見落とさないようにすることである。

答えたい問い:

- warning / attention / escalation が多すぎないか
- duplicate signal が review queue を圧迫していないか
- low-value attention が critical / cross-warehouse を埋もれさせていないか
- false-positive candidate を resolved と見せていないか
- escalation candidate が多すぎて coordination gap が見えなくなっていないか
- cross-dashboard link で同じ noise が増幅されていないか
- fatigue / noise が review limitation として説明されているか
- fatigue review が signal suppression automation や execution remediation に見えていないか

---

## ■ Review Fatigue Semantics

review fatigue は、reviewer が多くの review signal / warning / attention を処理することで判断疲れを起こし、重要 signal の見落としや誤判断の risk が高まる状態である。

fatigue 要因:

- review_required が多すぎる
- same reason の signal が重複する
- low-value signal が上位に出続ける
- suggested review が長すぎる
- limitation が過剰に並ぶ
- review status / approval status が混同される
- cross-dashboard で同じ signal が繰り返し見える

方針:

- review fatigue は governance quality degradation として扱う
- fatigue は reviewer の責任ではなく dashboard design risk として扱う
- critical / high / unresolved は埋もれさせない
- duplicate / recurring reason は grouping 候補にする
- review fatigue から execution remediation を行わない

---

## ■ Alert Fatigue Semantics

alert fatigue は、warning / attention / escalation が多すぎて、user が重要 alert を無視または過小評価しやすくなる状態である。

alert fatigue 要因:

- every row warning
- duplicate critical badge
- stale warning repeated
- escalation candidate repeated
- low / unknown confidence alert repeated
- uncertainty alert without reason
- hotspot alert over-labeling

方針:

- alert category を分ける
- critical / cross-warehouse を最上位に置く
- duplicate alert をまとめる候補にする
- alert count と representative examples を分ける
- alert reason を短く表示する
- alert から action area を作らない

---

## ■ Signal Noise Semantics

signal noise は、review / investigation / audit に対して価値が低い、重複している、または誤検知の可能性が高い signal が多く表示される状態である。

noise 候補:

- duplicate warning
- repeated same reason
- stale snapshot alert repeated
- low-value attention
- redundant escalation candidate
- hotspot false-positive
- confidence warning without reason
- uncertainty over-labeling
- cross-dashboard duplicate reference

方針:

- signal noise は attention quality degradation として扱う
- noise は重要 signal の見落とし risk を高める
- noise candidate は resolved ではない
- noise は grouping / collapse / representative examples の候補にする
- signal noise から automatic suppression を実行しない

---

## ■ Review Overload Semantics

review overload は、operator / reviewer が一度に処理すべき情報量・件数・文脈が多すぎる状態である。

overload 要因:

- overview に full evidence を表示する
- list row に timeline / rationale / lineage を出しすぎる
- filter / sort / search の組み合わせが複雑すぎる
- incident / operation / evidence / timeline が同時に多すぎる
- attention route が複数 role に広がりすぎる
- cross-dashboard context が多すぎる

方針:

- overview は key signal に絞る
- detail / expansion / reference で深掘りする
- long text は detail に逃がす
- attention route は reason / role / scope で整理する
- overload から assignment / execution action を出さない

---

## ■ Duplicate Signal Handling

duplicate signal handling は、同じ意味の signal が複数箇所に出る場合の扱いを整理する。

duplicate 候補:

- same reason_code
- same warehouse_code + part_no + project_no
- same evidence missing
- same stale snapshot
- same trace gap
- same escalation reason
- same hotspot reason

方針:

- duplicate signal は grouping 候補にする
- count と representative examples を分ける
- duplicate を完全に隠さず detail で辿れる余地を残す
- duplicate count は execution priority ではない
- duplicate handling から automatic remediation を行わない

表示候補:

- `Grouped by reason`
- `Duplicate signal candidate`
- `Representative examples`
- `Related signals`
- `Noise review recommended`

---

## ■ Low-value Attention Handling

low-value attention handling は、review value が低い attention signal が重要 signal を埋もれさせないようにする方針である。

low-value 候補:

- reason がない attention
- stale だが影響範囲が不明な repeated signal
- already represented by higher-level summary
- low severity repeated warning
- hotspot candidate with weak evidence
- confidence warning without limitation detail

方針:

- low-value attention は collapse / detail 表示候補にする
- low-value でも safe と断定しない
- low-value reason を明示する
- low-value signal が critical / cross-warehouse より強く見えないようにする
- low-value attention から automatic suppression / execution を行わない

---

## ■ False-positive Handling

false-positive handling は、誤検知候補を review / investigation の注意点として扱う方針である。

false-positive 候補:

- stale snapshot due to delayed generation
- projection delay mistaken as inconsistency
- hotspot from temporary burst
- duplicate trace relation
- missing evidence due to delayed collection
- low confidence due to incomplete metadata
- cross-dashboard duplicate warning

方針:

- false-positive candidate は resolved ではない
- false-positive possibility を detail / note で表示する
- false-positive awareness は human review を補助する
- false-positive を根拠に automatic ignore しない
- false-positive handling から correction / rebuild / replay を実行しない

---

## ■ Escalation Overload Handling

escalation overload handling は、escalation candidate が多すぎて、本当に重要な escalation が埋もれないようにする方針である。

overload 候補:

- unresolved escalation repeated
- role attention repeated
- cross-warehouse escalation repeated
- evidence escalation repeated
- coordination gap repeated
- escalation without reason / scope
- escalation candidate duplicated across dashboards

方針:

- escalation candidate を reason / role / scope で grouping する
- cross-warehouse / critical を最上位に置く
- unresolved escalation は aging と一緒に表示する
- role attention を重複表示しすぎない
- escalation limitation を detail に分ける
- escalation overload から assignment / approval / execution を行わない

---

## ■ Cross-dashboard Noise Review

cross-dashboard noise review は、compare / observability / recovery / trace 間で signal noise が増幅していないかを確認する。

review 対象:

- Compare -> Recovery duplicate attention
- Observability -> Recovery hotspot duplication
- Recovery -> Trace repeated timeline warning
- Trace -> Recovery repeated incident attention
- shared badge / tooltip
- shared warehouse_code / trace_id / request_id label
- related reference link
- empty / stale / partial / error wording

方針:

- dashboard 間 link は read-only reference とする
- cross-dashboard duplicate は grouping / representative examples の候補にする
- same signal が違う意味に見えないようにする
- cross-dashboard noise は semantic / attention quality review と連携する
- cross-dashboard noise から operation workflow を開始しない

---

## ■ Fatigue Degradation Semantics

fatigue degradation は、review fatigue / alert fatigue / signal noise / overload により governance quality が低下する状態である。

degradation 候補:

- critical signal が埋もれる
- duplicate signal が増える
- low-value attention が多すぎる
- false-positive candidate が resolved に見える
- escalation overload が発生する
- attention reason が読まれなくなる
- review queue が scan しにくくなる
- cross-dashboard noise が増える

方針:

- fatigue degradation は governance quality degradation として扱う
- fatigue degradation は business incident の確定ではない
- fatigue degradation は review / investigation / audit limitation として扱う
- repeated fatigue degradation は attention / density / cognitive load review に戻す
- fatigue degradation から execution remediation を行わない

---

## ■ Fatigue Review Heuristics

fatigue review heuristics は、review fatigue / alert fatigue / noise / overload を human review で見つけやすくするための観点である。

検知観点:

- critical / cross-warehouse が overview / list / detail で見えるか
- duplicate warning が多すぎないか
- low-value attention が critical signal と同じ強さで出ていないか
- false-positive candidate が resolved と見えていないか
- escalation candidate が reason / role / scope で grouping されているか
- review queue が severity / aging / confidence / uncertainty で整理されているか
- cross-dashboard link で同じ noise が増幅されていないか
- fatigue note が execution remediation に見えていないか

方針:

- heuristics は detection support であり automatic remediation ではない
- high / critical fatigue issue は human review recommended とする
- false-positive awareness を持つ
- repeated issue は attention / density / boundary review に戻す
- heuristic result から execution action を出さない

---

## ■ Fatigue Review Lifecycle

fatigue review lifecycle は、fatigue / noise issue candidate を発見してから整理・確認・記録するまでの review 状態である。

state 候補:

| State | 意味 |
| --- | --- |
| detected | fatigue / noise issue candidate が見つかった |
| reviewing | affected signal / scope / dashboard を review 中 |
| classified | issue type を分類した |
| grouped_candidate | grouping / representative examples 候補にした |
| noise_limitation_recorded | noise limitation として説明可能にした |
| review_recommended | human review recommended とした |
| fatigue_risk_reassessed | fatigue risk の継続 / 解消候補を再確認した |

方針:

- fatigue review lifecycle は execution lifecycle ではない
- classified は correction / rebuild / replay の分類ではない
- grouped_candidate は automatic suppression ではない
- noise_limitation_recorded は safe approval ではない
- lifecycle から assignment mutation を行わない

---

## ■ Fatigue Visualization Policy

fatigue visualization は、fatigue / noise / overload / limitation を読みやすく表示するための方針である。

表示候補:

- `Review fatigue risk`
- `Alert fatigue risk`
- `Signal noise`
- `Duplicate signal candidate`
- `Low-value attention`
- `False-positive candidate`
- `Escalation overload`
- `Noise limitation`
- `Human review recommended`
- `No execution remediation`

方針:

- fatigue visualization は review note として扱う
- fatigue warning は action button にしない
- fatigue type / affected scope / limitation を短く表示する
- critical / cross-warehouse と fatigue note を両方見えるようにする
- color だけに依存しない
- fatigue visualization から execution affordance を出さない

例:

```text
[REVIEW FATIGUE NOTE]
Type: duplicate signal noise
Scope: evidence missing attention
Review: repeated evidence warnings are grouped by reason with representative examples.
This is a read-only fatigue note. No assignment, approval, retry, correction, rebuild, replay, suppression, or sync is executed here.
```

---

## ■ Execution Fatigue Remediation を置かない方針

read-only governance dashboard では、execution fatigue remediation を置かない。

置かない概念:

- fatigue detected, auto suppress signal
- alert noise detected, remove warning
- false-positive candidate, auto resolve
- overload detected, assign owner
- escalation overload, auto approve
- duplicate signal, execute correction
- low-value attention, auto sync
- fatigue review triggers retry

理由:

- fatigue review は read-only governance quality review である
- signal suppression / grouping / wording adjustment には別の design / review / implementation process が必要である
- automatic remediation 自体が mutation / automation になり得る
- false-positive candidate は resolved ではない
- source of truth protection / warehouse boundary / blast radius を fatigue remediation だけで保証できない
- execution fatigue remediation を置くと dashboard の read-only boundary が曖昧になる

代替表現:

- `Review fatigue risk`
- `Signal noise`
- `Noise limitation`
- `False-positive candidate`
- `Human review recommended`
- `No execution remediation`

---

## ■ 導入段階案

### Step 0: Review Fatigue and Noise Policy の明文化

本ドキュメントで review fatigue / alert fatigue / signal noise / review overload の継続 review 方針を整理する。

この段階では実装しない。

### Step 1: Fatigue / Noise Semantics Review

確認:

- fatigue / noise が governance quality risk として扱われているか
- fatigue / noise が business incident として扱われていないか
- fatigue / noise から execution remediation に進んでいないか

### Step 2: Duplicate / Low-value Signal Review

確認:

- duplicate signal が grouping / representative examples 候補として扱われているか
- low-value attention が critical / cross-warehouse を埋もれさせていないか
- duplicate / low-value signal が automatic suppression に見えていないか

### Step 3: False-positive Review

確認:

- false-positive candidate が resolved と見えていないか
- false-positive possibility が human review を補助しているか
- false-positive handling から automatic ignore / correction に進んでいないか

### Step 4: Escalation / Overload Review

確認:

- escalation candidate が reason / role / scope で整理されているか
- escalation overload が assignment / approval / execution に見えていないか
- review queue が scan しやすいか

### Step 5: Cross-dashboard Noise Review

確認:

- compare / observability / recovery / trace の noise が増幅されていないか
- dashboard 間 link が read-only reference として扱われているか
- shared wording が semantic drift を起こしていないか

### Step 6: No Execution Fatigue Remediation Review

確認:

- `fatigue detected, auto suppress signal` のような概念がないか
- fatigue review から correction / rebuild / replay / approval / retry に進んでいないか
- assignment mutation や auto sync を示唆していないか
- fatigue review が read-only governance quality review として扱われているか

---

## ■ 今回は実装しない判断

Phase B25-02 では、review fatigue and noise policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- fatigue review contract 実装
- fatigue visualization 実装
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

- まず review fatigue / alert fatigue / signal noise semantics を固定する必要がある
- duplicate / low-value attention / false-positive / escalation overload を review 可能にする必要がある
- fatigue degradation と fatigue review lifecycle を明確にする必要がある
- execution fatigue remediation を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard review fatigue and noise policy は、read-only governance dashboard の review fatigue / alert fatigue / signal noise / review overload を継続的に review し、重要 signal の見落とし・誤読・attention fatigue を防ぐための方針である。

duplicate signal、low-value attention、false-positive、escalation overload、cross-dashboard noise、fatigue degradation、fatigue review heuristics、fatigue review lifecycle を整理し、execution fatigue remediation を置かないことで、visibility と mutation の境界を守る。
