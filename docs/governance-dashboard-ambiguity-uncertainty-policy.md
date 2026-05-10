# Governance Dashboard Ambiguity and Uncertainty Policy（Phase B18-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の ambiguity semantics / uncertainty semantics / unknown state handling / conflicting evidence handling を整理する。

Phase B17 では freshness / staleness semantics と consistency semantics を整理し、stale / inconsistent / partial / unknown は execution trigger ではなく visibility / review / audit の signal として扱うことを明確にした。Phase B18-01 では trust / confidence semantics を整理し、confidence は correctness guarantee でも execution permission でもなく、human review / audit の判断補助であることを明確にした。

Phase B18-02 では、それらの前提を ambiguity / uncertainty の観点で補強し、情報が曖昧な場合、未知な場合、証拠が競合する場合、timeline や compare result が矛盾する場合に、dashboard がどのように read-only signal として扱うかを整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

ambiguity and uncertainty policy は、dashboard 上の曖昧さ・未知・証拠の競合を過信せず、human investigation / audit limitation に接続するための方針である。

基本方針:

- ambiguity / uncertainty は read-only interpretation signal として扱う
- unknown は safe ではない
- unknown は false / incorrect とも断定しない
- conflicting evidence は automatic resolution しない
- conflicting timeline は replay trigger ではない
- conflicting compare result は correction / rebuild trigger ではない
- unresolved ambiguity は audit limitation として残す
- uncertainty は confidence と関連するが同一概念ではない
- human investigation を中心に置く
- execution uncertainty を置かない

---

## ■ Ambiguity and Uncertainty Policy の目的

この policy の目的は、operator / reviewer / auditor が「何が曖昧なのか」「何が未知なのか」「どの evidence が競合しているのか」を明確に理解し、誤った断定や誤実行を避けられるようにすることである。

答えたい問い:

- ambiguity と uncertainty はどう違うのか
- unknown state を stable / safe と誤認していないか
- conflicting evidence がある場合に、どちらを正として見せていないか
- conflicting timeline がある場合に、operation failure と断定していないか
- conflicting compare result がある場合に、automatic correction を促していないか
- unresolved ambiguity を audit limitation として残せるか
- uncertainty と confidence の関係を説明できるか
- uncertainty signal から execution workflow が出ていないか

---

## ■ Ambiguity Semantics

ambiguity は、複数の解釈が成立し得る状態を示す。

例:

- quantity mismatch の原因が projection delay か source error か判断できない
- location mismatch が pallet movement 由来か inventory movement 由来か判断できない
- reason_code が複数候補に分かれる
- evidence はあるが、どの operation に紐づくか明確でない
- timeline event の順序から複数の業務解釈が成立する

方針:

- ambiguity は automatic decision しない
- ambiguity は human investigation candidate として表示する
- ambiguity reason / candidate interpretation を分けて表示する
- ambiguity がある状態を `resolved` と見せない
- ambiguity から correction / rebuild / replay を実行しない

表示候補:

- `Ambiguous cause`
- `Multiple interpretations`
- `Reason requires review`
- `Ambiguous evidence linkage`
- `Human investigation recommended`

---

## ■ Uncertainty Semantics

uncertainty は、判断に必要な情報が不足している状態を示す。

例:

- generated_at がない
- source query version がない
- warehouse_code scope が不明
- timeline range が不明
- evidence package が取得できない
- reason_code が unknown
- snapshot rule version が不明

方針:

- uncertainty は information gap として扱う
- uncertainty は safe ではない
- uncertainty は business incident とも断定しない
- uncertainty は confidence を下げる要因になり得る
- high / critical scope の uncertainty は強調する
- uncertainty から automatic execution を行わない

表示候補:

- `Uncertainty`
- `Unknown state`
- `Insufficient information`
- `Scope unknown`
- `Confidence unknown`
- `Additional review recommended`

---

## ■ Unknown State Handling

unknown state は、状態値・範囲・根拠・時刻などが不明な状態である。

unknown 候補:

- unknown severity
- unknown risk
- unknown warehouse_code
- unknown operation_state
- unknown approval_status
- unknown evidence_status
- unknown generated_at
- unknown timeline range
- unknown reason_code

方針:

- unknown を empty / stable / not_required と混同しない
- unknown を `no issue` と表示しない
- unknown は warning / review candidate として扱う
- unknown が warehouse boundary に関係する場合は high / critical risk 候補とする
- unknown state から default action を推論しない

表示候補:

- `Unknown`
- `Not available`
- `Not checked`
- `Scope unknown`
- `Status unknown`
- `Review required due to unknown state`

---

## ■ Conflicting Evidence Handling

conflicting evidence は、複数の evidence が互いに異なる説明を示す状態である。

例:

- compare summary は mismatch だが post-compare evidence は resolved を示す
- warehouse boundary evidence と trace timeline の warehouse_code が異なる
- attachment reference の現場情報と projection compare が一致しない
- approval evidence の scope と execution evidence の affected scope が異なる
- before / after summary と source transaction history が一致しない

方針:

- conflicting evidence は片方を自動採用しない
- conflicting evidence は audit limitation として明示する
- conflict pair / affected scope / timestamp を表示する
- source of truth と補助 evidence の責務を分ける
- conflicting evidence から automatic correction / rebuild / replay を行わない

表示候補:

- `Conflicting evidence`
- `Evidence conflict requires review`
- `Scope conflict`
- `Warehouse boundary conflict`
- `Evidence interpretation ambiguous`

---

## ■ Conflicting Timeline Handling

conflicting timeline は、timeline event の順序・範囲・関連 ID が期待と異なる、または複数解釈を生む状態である。

例:

- operation lifecycle timeline と trace timeline の順序が合わない
- approval event より前に execution event が見える
- request_id grouping と trace_id relation が一致しない
- expected event が欠落している
- replay trace と original trace の分離が不明

方針:

- conflicting timeline は immediate business failure と断定しない
- missing event / event order gap / relation conflict を分ける
- timeline generated_at と event timestamp を分ける
- conflicting timeline は human investigation candidate とする
- conflicting timeline から replay / correction / rebuild を実行しない

表示候補:

- `Timeline conflict`
- `Event order requires review`
- `Missing lifecycle event`
- `Trace relation conflict`
- `Timeline ambiguity`

---

## ■ Conflicting Compare Result Handling

conflicting compare result は、複数の compare result / snapshot / filter 条件で異なる差異状態が見える状態である。

例:

- current compare と daily snapshot の severity count が合わない
- filter 条件により review_required count が大きく変わる
- stale compare と fresh compare が異なる
- compare result と evidence package の before / after summary が一致しない
- observability health と current compare の状態が一致しない

方針:

- conflicting compare result は calculation context を分けて表示する
- snapshot date / generated_at / filter / query version を明示する
- current compare と historical snapshot を混同しない
- conflict を automatic rebuild trigger として扱わない
- human investigation / recheck recommended として表示する

表示候補:

- `Compare result conflict`
- `Different calculation context`
- `Snapshot differs from current compare`
- `Filter context differs`
- `Recheck recommended`

---

## ■ Unresolved Ambiguity Handling

unresolved ambiguity は、review / investigation 後も解釈が確定していない状態である。

例:

- root cause が projection drift か operator input error か不明
- evidence conflict が解消されていない
- timeline gap の理由が不明
- warehouse boundary evidence が不足している
- reason_code が unknown のまま残っている

方針:

- unresolved ambiguity を resolved と表示しない
- unresolved ambiguity は audit limitation として残す
- high / critical scope では domain owner attention 候補とする
- unresolved ambiguity は confidence low / unknown と関連付ける
- unresolved ambiguity から execution を促さない

表示候補:

- `Unresolved ambiguity`
- `Root cause unknown`
- `Evidence conflict unresolved`
- `Additional investigation required`
- `Audit limitation`

---

## ■ Uncertainty Wording

uncertainty wording は、不明・曖昧・競合を誤解なく伝えるための文言である。

推奨 wording:

- `Unknown state: generated_at is unavailable.`
- `Ambiguous cause: multiple interpretations are possible.`
- `Conflicting evidence: compare summary and post-compare evidence differ.`
- `Timeline conflict: event order requires review.`
- `Additional human investigation is recommended.`
- `This is a read-only uncertainty signal.`

避ける wording:

- `Safe`
- `No issue`
- `Invalid`
- `Wrong data`
- `Execute rebuild`
- `Replay required`
- `Auto fix`
- `Approved to proceed`

方針:

- uncertainty wording は断定しすぎない
- unknown を safe と表現しない
- conflicting を automatic decision にしない
- wording は limitation と next review を短く伝える
- execution wording を含めない

---

## ■ Uncertainty Visualization Policy

uncertainty visualization は、不明・曖昧・競合を operator / auditor が見落とさないように表示する方針である。

表示候補:

- `Uncertainty`
- `Ambiguous`
- `Unknown`
- `Conflicting evidence`
- `Timeline conflict`
- `Compare conflict`
- `Unresolved ambiguity`
- `Audit limitation`

方針:

- uncertainty は badge + reason で表示する
- color だけに依存しない
- high / critical scope の uncertainty は強調する
- uncertainty reason を detail / tooltip で確認できるようにする
- stale / consistency / confidence warning と区別する
- uncertainty visualization から execution affordance を出さない

例:

```text
[UNCERTAINTY]
Reason: warehouse boundary evidence is unavailable.
Suggested next review: verify warehouse scope and related trace timeline.
This is a read-only uncertainty signal. No execution action is available here.
```

---

## ■ Human Investigation Emphasis

human investigation emphasis は、ambiguity / uncertainty を人間の調査へ接続するための方針である。

方針:

- ambiguity / uncertainty は human investigation の優先順位付けに使う
- high risk / critical / cross-warehouse では human investigation を強調する
- unknown / conflicting evidence では追加確認を示す
- investigation は approval mutation ではない
- suggested next review は execution instruction ではない
- human investigation から approve / retry / rebuild / replay を直接出さない

表示候補:

- `Human investigation recommended`
- `Additional review required due to uncertainty`
- `Domain owner attention recommended`
- `Evidence conflict requires review`
- `Trace relation requires review`

---

## ■ Audit Uncertainty Limitation

audit uncertainty limitation は、監査時に ambiguity / uncertainty の限界を説明するための考え方である。

audit に残したい context:

- ambiguity type
- uncertainty reason
- unknown fields
- conflicting evidence pair
- conflicting timeline events
- conflicting compare context
- checked scope / unchecked scope
- generated_at / snapshot date
- confidence level
- human review note

方針:

- uncertainty limitation は audit note として説明できるようにする
- unresolved ambiguity を隠さない
- conflicting evidence を片方に上書きしない
- audit package は source of truth の代替ではない
- audit uncertainty limitation は correction / rebuild / replay の automatic trigger ではない

---

## ■ Compare / Observability / Recovery Uncertainty Separation

compare / observability / recovery は、uncertainty の意味が異なる。

| Area | Uncertainty meaning | 誤解しないこと |
| --- | --- | --- |
| Compare | diff / reason / scope / projection 状態が不明または競合 | source of truth error と断定しない |
| Observability | snapshot / trend / health の解釈に不明点がある | incident resolution と同一視しない |
| Recovery | incident / operation / approval / evidence / lifecycle visibility に不明点がある | correction executed と同一視しない |
| Trace | timeline / request chain / parent relation に不明点がある | replay permission と同一視しない |

方針:

- compare uncertainty と recovery approval を混同しない
- observability uncertainty と consistency health を混同しない
- evidence uncertainty と source of truth correctness を混同しない
- trace uncertainty と replay eligibility を混同しない
- dashboard 間 link から execution しない

---

## ■ Uncertainty Confidence Relationship

uncertainty と confidence は関連するが同じではない。

関係:

- uncertainty が高いと confidence は下がる傾向がある
- unknown state は confidence unknown / low の候補になる
- conflicting evidence は evidence confidence を下げる
- conflicting timeline は trace confidence を下げる
- unresolved ambiguity は review confidence を下げる

方針:

- uncertainty を confidence score として単純変換しない
- uncertainty reason と confidence reason を分けて表示する
- high confidence と uncertainty が同時にある場合は scope を分ける
- confidence は correctness guarantee ではない
- uncertainty / confidence のどちらも execution trigger ではない

例:

```text
Compare confidence: high
Evidence confidence: low
Uncertainty: warehouse boundary evidence missing
Interpretation: compare result is usable for review, but audit evidence is incomplete.
```

---

## ■ Execution Uncertainty を置かない方針

read-only governance dashboard では、execution uncertainty を置かない。

置かない概念:

- uncertainty means rebuild now
- ambiguity means replay now
- conflicting evidence means execute correction
- unknown state means approve retry
- uncertainty-based auto correction
- uncertainty-based auto sync
- uncertainty-based lifecycle transition

理由:

- ambiguity / uncertainty は read-only interpretation / review / audit のための signal である
- conflicting evidence は原因分類を確定しない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を uncertainty だけで保証できない
- uncertainty を execution trigger にすると監査性が弱くなる

代替表現:

- `Uncertainty signal`
- `Ambiguous cause`
- `Conflicting evidence`
- `Human investigation recommended`
- `Suggested next review`
- `Read-only uncertainty signal`

---

## ■ 導入段階案

### Step 0: Ambiguity and Uncertainty Policy の明文化

本ドキュメントで ambiguity semantics / uncertainty semantics / unknown state handling / conflicting evidence handling を整理する。

この段階では実装しない。

### Step 1: Unknown State Review

確認:

- unknown を empty / stable / not_required と混同していないか
- unknown を safe と表示していないか
- high / critical scope の unknown が強調されるか

### Step 2: Conflicting Evidence Review

確認:

- conflicting evidence を片方に自動採用していないか
- conflict pair / affected scope / timestamp を説明できるか
- evidence conflict から correction / rebuild / replay に進んでいないか

### Step 3: Timeline / Compare Conflict Review

確認:

- timeline conflict と business failure を混同していないか
- current compare と snapshot / filter / query version の差を説明できるか
- conflict が read-only investigation signal として扱われているか

### Step 4: Audit Uncertainty Review

確認:

- unresolved ambiguity を audit limitation として残せるか
- unknown fields / checked scope / unchecked scope を説明できるか
- audit package を source of truth の代替にしていないか

### Step 5: Confidence Relationship Review

確認:

- uncertainty と confidence を同一視していないか
- uncertainty reason と confidence reason が分かれているか
- low / unknown confidence が execution trigger になっていないか

### Step 6: No Execution Uncertainty Review

確認:

- `uncertainty means rebuild now` のような概念がないか
- ambiguity / conflict から correction / rebuild / replay / approval / retry に進んでいないか
- uncertainty warning が read-only signal として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B18-02 では、ambiguity and uncertainty policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- uncertainty contract 実装
- uncertainty visualization 実装
- conflict resolution 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず ambiguity / uncertainty semantics を固定する必要がある
- unknown / conflicting / unresolved ambiguity の意味を分ける必要がある
- compare / observability / recovery / trace の uncertainty meaning を混同しないための方針が必要である
- execution uncertainty を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard ambiguity and uncertainty policy は、read-only governance dashboard 上の ambiguity / uncertainty signal を正しく解釈するための設計方針である。

ambiguity semantics、uncertainty semantics、unknown state handling、conflicting evidence / timeline / compare result handling、unresolved ambiguity、audit uncertainty limitation、human investigation emphasis、uncertainty confidence relationship を整理し、execution uncertainty を置かないことで、visibility と mutation の境界を守る。
