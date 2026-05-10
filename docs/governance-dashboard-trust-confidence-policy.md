# Governance Dashboard Trust and Confidence Policy（Phase B18-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の trust semantics / confidence semantics / evidence confidence / review confidence を整理する。

Phase B9 以降では、inventory / pallet consistency を compare-only で可視化し、source of truth、projection / read model、snapshot / observability、recovery governance、evidence、freshness、consistency の責務を分けてきた。Phase B17 では freshness / staleness semantics と consistency semantics を整理し、stale / inconsistent / partial / unknown は execution trigger ではなく visibility / review / audit の signal として扱うことを明確にした。

Phase B18-01 では、それらの前提を trust / confidence の観点で補強し、dashboard の表示・比較結果・snapshot・evidence・review 状態を「どの程度信頼してよいか」「どこに limitation があるか」「human review が必要か」を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

trust and confidence policy は、dashboard 上の情報を過信せず、適切な review / investigation / audit に接続するための方針である。

基本方針:

- trust / confidence は read-only interpretation signal として扱う
- confidence は execution permission ではない
- high confidence は automatic correction / rebuild / replay を意味しない
- low confidence は business incident そのものではない
- unknown confidence は safe と見なさない
- evidence confidence と source of truth correctness を混同しない
- compare / observability / recovery の confidence semantics を分ける
- confidence limitation は audit limitation として説明できるようにする
- human review を confidence interpretation の中心に置く
- execution confidence を置かない

---

## ■ Trust and Confidence Policy の目的

この policy の目的は、operator / reviewer / auditor が dashboard の signal を過信せず、適切な注意度で読み取れるようにすることである。

答えたい問い:

- compare result はどの程度信頼できるか
- observability health は current business state として扱えるか
- evidence package が揃っていると operation は正しいと言えるか
- stale / partial / inconsistent data が confidence にどう影響するか
- unknown confidence を safe と誤認していないか
- high confidence から execution workflow が出ていないか
- human review をどこで強調すべきか
- audit 時に confidence limitation を説明できるか

---

## ■ Trust Semantics

trust は、dashboard の情報をどの範囲で信頼してよいかを示す概念である。

trust 対象:

- source of truth transaction / history
- projection / read model
- compare result
- observability snapshot
- recovery governance state
- evidence package
- timeline reference
- warehouse boundary evidence

方針:

- source of truth と dashboard visualization の trust level を分ける
- projection / read model は高速確認のための表示であり、source of truth ではない
- evidence package は audit / review の補助であり、source of truth の代替ではない
- trust boundary は warehouse_code / operation_scope / generated_at / source query version と一緒に考える
- trust が高い表示でも execution permission にはしない

---

## ■ Confidence Semantics

confidence は、dashboard signal が review / investigation / audit の判断材料としてどの程度有用かを示す。

confidence 候補:

| Confidence | 意味 |
| --- | --- |
| high | data / evidence / scope が揃い、判断材料として強い |
| medium | 主要情報はあるが、一部確認が必要 |
| low | stale / partial / missing / inconsistent など制約がある |
| unknown | confidence 判断に必要な情報が不足 |

方針:

- confidence は correctness guarantee ではない
- high confidence は `execute now` を意味しない
- low confidence は `wrong data` と断定しない
- unknown confidence は safe ではなく review candidate として扱う
- confidence reason を表示できるようにする

---

## ■ Compare Confidence

compare confidence は、compare result を review / investigation の入口としてどの程度信頼できるかを示す。

影響要素:

- compare generated_at
- source projection freshness
- stale / partial warning
- reason_code completeness
- warehouse_code boundary
- compared row count
- missing data / unknown scope
- severity classification completeness

confidence 例:

| 状態 | Confidence |
| --- | --- |
| generated_at が新しく、対象 projection が揃っている | high |
| compare はあるが reason_code が一部 unknown | medium |
| stale data または partial contract がある | low |
| generated_at / scope が不明 | unknown |

方針:

- compare confidence は source of truth correctness ではない
- compare confidence は correction / rebuild / replay 判定ではない
- low confidence compare は recheck / human review の signal とする
- critical diff でも confidence が低い場合は limitation を明示する

---

## ■ Observability Confidence

observability confidence は、backlog / aging / hotspot / trend / health を運用品質 signal としてどの程度信頼できるかを示す。

影響要素:

- snapshot date
- generated_at
- metric window
- source query version
- health rule version
- missing snapshot
- stale snapshot
- partial metric

方針:

- observability confidence は trend interpretation の信頼度である
- health confidence は incident resolved を意味しない
- hotspot confidence は incident 確定を意味しない
- trend confidence が低い場合は decision limitation として表示する
- observability confidence から automatic recovery を行わない

表示候補:

- `Trend confidence: medium`
- `Health confidence: low due to stale snapshot`
- `Hotspot confidence: unknown, missing source query version`

---

## ■ Evidence Confidence

evidence confidence は、audit package / evidence item が判断材料としてどの程度信頼できるかを示す。

影響要素:

- compare summary available
- dry-run result available
- before / after summary available
- approval evidence available
- post-compare evidence available
- trace timeline available
- warehouse boundary evidence available
- attachment reference quality
- stale / partial evidence warning

方針:

- evidence available は operation correctness の保証ではない
- evidence missing は attach action ではなく audit warning とする
- stale evidence と missing evidence を分ける
- attachment は補助 evidence であり source of truth ではない
- evidence confidence が高くても execution permission にはしない

confidence 例:

| 状態 | Confidence |
| --- | --- |
| compare / dry-run / approval / post-compare / warehouse evidence が揃っている | high |
| 主要 evidence はあるが attachment reference のみ | medium |
| post-compare missing / warehouse boundary evidence missing | low |
| evidence package 自体が取得できない | unknown |

---

## ■ Review Confidence

review confidence は、人間の review / investigation / audit がどの程度十分な根拠に基づいているかを示す。

影響要素:

- reviewer / owner / domain owner の確認状態
- reason_code / reason_text の明確さ
- evidence completeness
- warehouse boundary evidence
- timeline completeness
- stale / partial / consistency warning
- unresolved aging
- recurring hotspot context

方針:

- review confidence は approval status ではない
- review confidence は operation_state ではない
- review confidence は human review を補助する signal である
- low review confidence は追加確認候補として表示する
- review confidence から approve / reject button を出さない

---

## ■ Partial Confidence

partial confidence は、一部の判断材料には confidence があるが、全体判断には不足がある状態を示す。

例:

- compare confidence は high だが evidence confidence は low
- observability confidence は medium だが current compare が stale
- evidence はあるが warehouse boundary evidence が missing
- timeline はあるが trace reference が unavailable

方針:

- partial confidence を overall high と見せない
- confidence を area / evidence type / scope ごとに分ける
- partial confidence は audit limitation として扱う
- partial confidence から execution を促さない
- checked scope / unchecked scope を表示する

表示候補:

- `Partial confidence`
- `High compare confidence, low evidence confidence`
- `Warehouse boundary confidence: unknown`
- `Timeline confidence: partial`

---

## ■ Unknown Confidence

unknown confidence は、confidence を判断するための情報が不足している状態である。

unknown 例:

- generated_at がない
- source query version がない
- warehouse_code scope が不明
- evidence package が取得できない
- timeline range が不明
- reason_code が unknown
- snapshot rule version が不明

方針:

- unknown confidence は safe ではない
- unknown confidence は false / incorrect とも断定しない
- unknown は review / investigation candidate として扱う
- high / critical scope で unknown confidence の場合は強調する
- unknown confidence から automatic execution を行わない

---

## ■ Low-confidence Wording

low-confidence wording は、判断材料として弱い状態を誤解なく伝えるための文言である。

推奨 wording:

- `Low confidence: evidence is incomplete.`
- `Low confidence: data is stale.`
- `Low confidence: warehouse boundary evidence is missing.`
- `Unknown confidence: generated_at is unavailable.`
- `Additional human review is recommended.`

避ける wording:

- `Cannot trust this data`
- `Invalid data`
- `Execute rebuild`
- `Replay required`
- `Safe to ignore`
- `Approved to proceed`

方針:

- low confidence は review priority を示す
- low confidence は business failure と断定しない
- low confidence は execution trigger ではない
- wording は limitation と next review を短く伝える

---

## ■ Trust Boundary

trust boundary は、どの範囲まで dashboard の表示を信頼できるかを示す境界である。

boundary 候補:

- warehouse_code
- operation_scope
- affected warehouse list
- source query version
- snapshot date
- generated_at
- timeline range
- evidence package scope
- approval scope
- data contract version

方針:

- trust boundary は list / detail / evidence / timeline で確認できるようにする
- warehouse_code boundary は最重要 boundary として扱う
- boundary unknown は confidence unknown / warning 候補とする
- cross-warehouse は critical risk として表示する
- trust boundary から execution permission を推論しない

---

## ■ Audit Confidence Limitation

audit confidence limitation は、監査時に confidence の限界を説明するための考え方である。

audit に残したい context:

- confidence level
- confidence reason
- generated_at
- snapshot date
- source query version
- evidence completeness
- checked scope / unchecked scope
- warehouse boundary evidence
- stale / partial / consistency warning
- missing timeline range
- unknown fields

方針:

- audit package は source of truth の代替ではない
- confidence limitation は audit note として説明できるようにする
- high confidence でも correctness guarantee と表現しない
- unknown / low confidence を隠さない
- audit confidence limitation は correction / rebuild / replay の automatic trigger ではない

---

## ■ Human Review Emphasis

human review emphasis は、confidence signal を人間の確認へ接続するための方針である。

方針:

- confidence は human review の優先順位付けに使う
- high risk / critical / cross-warehouse では human review を強調する
- low / unknown confidence では additional review を示す
- review_required は approval_status ではない
- suggested next review は execution instruction ではない
- human review から approve / reject mutation を直接出さない

表示候補:

- `Human review recommended`
- `Additional review required due to low confidence`
- `Domain owner attention recommended`
- `Review confidence is partial`

---

## ■ Compare / Observability / Recovery Confidence Separation

compare / observability / recovery は、confidence の意味が異なる。

| Area | Confidence meaning | 誤解しないこと |
| --- | --- | --- |
| Compare | read model / projection compare を調査入口として信頼できる度合い | source of truth correctness ではない |
| Observability | aggregate / trend / health を運用品質 signal として信頼できる度合い | incident resolution ではない |
| Recovery | incident / operation / approval / evidence / lifecycle visibility を信頼できる度合い | correction executed ではない |
| Trace | timeline / request chain / history reference を信頼できる度合い | replay permission ではない |

方針:

- compare confidence と recovery approval を混同しない
- observability confidence と consistency health を混同しない
- evidence confidence と source of truth correctness を混同しない
- trace confidence と replay eligibility を混同しない
- dashboard 間 link から execution しない

---

## ■ Confidence Visualization Policy

confidence visualization は、confidence level / reason / limitation を分かりやすく表示するための方針である。

表示候補:

- `Confidence: high`
- `Confidence: medium`
- `Confidence: low`
- `Confidence: unknown`
- `Partial confidence`
- `Confidence limitation`
- `Human review recommended`

方針:

- confidence は badge + reason で表示する
- color だけに依存しない
- high confidence を green action に見せない
- low / unknown confidence は warning として表示する
- confidence reason を detail / tooltip で確認できるようにする
- confidence visualization から execution affordance を出さない

例:

```text
[CONFIDENCE: LOW]
Reason: post-compare evidence is missing.
Suggested next review: verify evidence package and timeline references.
This is a read-only confidence signal. No execution action is available here.
```

---

## ■ Execution Confidence を置かない方針

read-only governance dashboard では、execution confidence を置かない。

置かない概念:

- confident enough to execute
- high confidence means approve
- high confidence means rebuild now
- low confidence means replay now
- confidence-based auto correction
- confidence-based auto sync
- confidence-based lifecycle transition

理由:

- confidence は read-only interpretation / review / audit のための signal である
- confidence は correctness guarantee ではない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を confidence だけで保証できない
- confidence を execution trigger にすると監査性が弱くなる

代替表現:

- `Confidence signal`
- `Review confidence`
- `Evidence confidence`
- `Human review recommended`
- `Suggested next review`
- `Read-only confidence signal`

---

## ■ 導入段階案

### Step 0: Trust and Confidence Policy の明文化

本ドキュメントで trust semantics / confidence semantics / evidence confidence / review confidence を整理する。

この段階では実装しない。

### Step 1: Trust Boundary Review

確認:

- source of truth / projection / evidence / dashboard visualization の trust boundary が分かれているか
- warehouse_code / operation_scope / generated_at / query version が確認できるか
- boundary unknown を safe と見せていないか

### Step 2: Confidence Level Review

確認:

- high / medium / low / unknown の意味が明確か
- confidence reason が表示できるか
- confidence を correctness guarantee として扱っていないか

### Step 3: Compare / Observability / Recovery Confidence Review

確認:

- compare confidence と source of truth correctness を混同していないか
- observability confidence と incident resolution を混同していないか
- recovery confidence と execution completion を混同していないか

### Step 4: Evidence / Review Confidence Review

確認:

- evidence available を operation correctness と表現していないか
- evidence missing / stale / partial を confidence limitation として表示できるか
- review confidence を approval status と混同していないか

### Step 5: Low / Unknown Confidence Review

確認:

- low confidence wording が execution を促していないか
- unknown confidence を safe と表示していないか
- high / critical scope の unknown confidence が見落とされないか

### Step 6: No Execution Confidence Review

確認:

- `confident enough to execute` のような概念がないか
- confidence から correction / rebuild / replay / approval / retry に進んでいないか
- confidence warning が read-only signal として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B18-01 では、trust and confidence policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- confidence contract 実装
- confidence visualization 実装
- trust scoring 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず trust / confidence semantics を固定する必要がある
- compare / observability / recovery / trace の confidence meaning を混同しないための方針が必要である
- evidence confidence と source of truth correctness を分ける必要がある
- execution confidence を置かない方針を明確にする必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard trust and confidence policy は、read-only governance dashboard 上の trust / confidence signal を正しく解釈するための設計方針である。

trust semantics、confidence semantics、compare / observability / evidence / review confidence、partial / unknown confidence、trust boundary、audit confidence limitation、human review emphasis を整理し、execution confidence を置かないことで、visibility と mutation の境界を守る。
