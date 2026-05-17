# Inventory Integrity Review-Readiness Semantics

Phase B36-11 inventory integrity review-readiness semantics review.

この文書は、Governance Dashboard / Inventory Integrity における review-readiness semantics を整理し、「レビュー可能状態かどうか」の意味・境界・読み方を横断で統一するための review-readiness semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、readiness engine 実装、auto-review、execution orchestration、execution workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- review-readiness semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- review-readiness metadata は truth guarantee ではない。
- stale / partial / delayed review-readiness state を前提にする。
- Dashboard / UI は日本語中心 review-readiness 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- review-readiness semantics を execution workflow と混同しない。
- review-readiness semantics は execution authority を持たない。
- review-readiness semantics は rebuild、compare execution、replay、correction、readiness engine、auto-review、execution orchestration、execution workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityReviewReadinessSemantics

`InventoryIntegrityReviewReadinessSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される review-ready / partially-ready / not-ready / blocked review を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- review-ready semantics
- partially-ready semantics
- not-ready semantics
- blocked review semantics
- review-readiness visibility semantics
- review-readiness readability semantics
- review-readiness limitation semantics
- review-readiness propagation semantics
- review-readiness と governance-review の違い
- review-readiness と completeness の違い
- review-readiness と confidence の違い
- review-readiness misuse risk
- review-readiness consistency
- Japanese-first review-readiness wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / review-readiness boundary
- non-execution caveat

含まない意味:

- React component
- readiness engine
- auto-review
- execution orchestration
- executable command
- workflow state
- approval mutation
- assignment creation
- notification sending
- rebuild plan execution
- correction command
- replay command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityReviewReadinessSemantics は「レビューを開始して読める材料がどの程度揃っているか」を示す review / audit / operational comprehension の補助であり、「review が実行されたか」「review が完了したか」「自動 review してよいか」を示す workflow object ではない。

## Japanese-First Review-Readiness Wording Policy

Dashboard / UI は日本語中心 review-readiness 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- review-readiness は `readiness level + scope + caveat` で表示する。
- review-ready を approval ready に見せない。
- partially-ready を incomplete action に見せない。
- not-ready / blocked を correction required に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `レビュー可能(review-ready): 確認材料が比較的そろっています。正しさ保証ではありません。`
- `一部レビュー可能(partially-ready): 一部範囲は確認できます。補完指示ではありません。`
- `レビュー未準備(not-ready): 確認材料に不足があります。修正指示ではありません。`
- `レビュー保留(blocked review): 制限が強く確認を進めにくい状態です。workflow 停止ではありません。`

避ける形式:

- `承認可能`
- `実行可能`
- `レビュー完了`
- `自動レビュー開始`
- `修正必須`
- `安全`

## Review-Ready Semantics

review-ready は、対象 scope で human review を始めて読める材料が比較的そろっている状態を示す。

readiness 材料:

- source transaction coverage
- evidence reference
- confidence reason
- completeness scope
- freshness caveat
- lineage / traceability relation
- governance-review context
- priority / warning reason

意味:

- review-ready は review / audit / operational comprehension で確認しやすい状態である。
- review-ready は review を開始して読める可能性を示す。
- review-ready は reason / scope / caveat と一緒に読む。

禁止解釈:

- review-ready = truth guarantee
- review-ready = approval ready
- review-ready = safe to execute
- review-ready = review completed
- review-ready = auto-review allowed

review-ready はレビュー可能性の表示であり、execution authority ではない。

## Partially-Ready Semantics

partially-ready は、対象 scope の一部では review 可能だが、制限や不足が残る状態を示す。

readiness 材料:

- partial source coverage
- evidence gap
- lineage / traceability gap
- confidence medium / low
- freshness stale / delayed
- completeness partial
- partial governance-review context
- interpretation caveat

意味:

- partially-ready は一部の範囲なら review できる可能性を示す。
- partially-ready は limitation と visible scope を分けて読む。
- partially-ready は review / audit / operational comprehension の caveat である。

禁止解釈:

- partially-ready = missing data fetch required
- partially-ready = correction required
- partially-ready = auto-complete required
- partially-ready = no issue
- partially-ready = safe to ignore

partially-ready は部分的なレビュー可能性であり、補完や修正の指示ではない。

## Not-Ready Semantics

not-ready は、対象 scope で review を安全に進めるための材料が不足している状態を示す。

readiness 不足:

- source reference missing
- evidence missing
- confidence unknown
- completeness missing / unknown
- freshness expired / unknown
- lineage / traceability unknown
- governance-review context missing
- warning / priority reason missing

意味:

- not-ready は review limitation である。
- not-ready は現時点の表示だけでは review しにくいことを示す。
- not-ready は reason / missing scope / caveat と一緒に読む。

禁止解釈:

- not-ready = source error confirmed
- not-ready = correction required
- not-ready = rebuild required
- not-ready = review impossible forever
- not-ready = safe to ignore

not-ready はレビュー未準備の表示であり、rebuild / correction / replay の開始条件ではない。

## Blocked Review Semantics

blocked review は、制限が強く、現時点では governance / audit / operational review を進めにくい状態を示す。

blocked 要因:

- source scope cannot be identified
- evidence absent and confidence unknown
- freshness expired with high interpretation-risk
- completeness missing with governance boundary caveat
- lineage / traceability relation unavailable
- conflicting projection context
- severe stale / partial / delayed state
- review-readiness reason cannot be explained

意味:

- blocked review は review を進めにくい制限を示す。
- blocked review は human review の caveat である。
- blocked review は workflow hold や operation stop ではない。

禁止解釈:

- blocked review = workflow blocked
- blocked review = operation stopped
- blocked review = task assigned
- blocked review = correction required
- blocked review = source of truth failed

blocked review は review の読み方に強い制限がある状態であり、execution block ではない。

## Review-Readiness Visibility Semantics

review-readiness visibility は、レビュー可能性をどの程度見えるようにするかを示す。

visibility 方針:

- readiness level と reason / scope / caveat を一緒に表示する。
- review-ready / partially-ready / not-ready / blocked review の違いを見えるようにする。
- readiness と governance-review / completeness / confidence を label で分ける。
- stale / partial / delayed review-readiness state は limitation として表示する。
- readiness gap は hidden state にしない。
- readiness signal と execution control を近接させない。

visibility が意味しないこと:

- review completed
- approval ready
- operation started
- task assigned
- auto-review started
- execution readiness

review-readiness visibility はレビュー可能性の表示整理であり、execution authority ではない。

## Review-Readiness Readability Semantics

review-readiness readability は、人間がレビュー可能性を短時間で安全に読める状態である。

readability 方針:

- readiness は `level + reason + caveat` で表示する。
- same readiness level は same label で表示する。
- readiness と governance-review / completeness / confidence を label で区別する。
- readiness reason と limitation を分ける。
- ready には `正しさ保証ではありません` の caveat を添える。
- not-ready / blocked には `修正指示ではありません` の caveat を添える。

推奨 wording:

- `レビュー可能: 確認材料が比較的そろっています。承認可能ではありません。`
- `一部レビュー可能: 見えている範囲で確認できます。補完指示ではありません。`
- `レビュー保留: 制限が強い状態です。作業停止ではありません。`

review-readiness readability は comprehension を補助する。review 実行や自動 review を促す表示ではない。

## Review-Readiness Limitation Semantics

review-readiness limitation は、レビュー可能性の読み方に制限があることを示す。

limitation 候補:

- source coverage gap
- evidence gap
- lineage / traceability gap
- confidence low / unknown
- freshness stale / delayed / expired
- completeness partial / missing / unknown
- governance-review context missing
- priority / warning reason ambiguity
- interpretation-risk high
- `inventory_current` cache observation limitation

意味:

- limitation は governance review / audit review / operational review の caveat である。
- limitation は review-ready を過信しないための guardrail である。
- limitation は review-readiness quality が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = readiness engine command
- limitation = safe to ignore

review-readiness limitation は correction / rebuild / replay / auto-review の開始条件ではない。

## Review-Readiness Propagation Semantics

review-readiness propagation は、レビュー可能性の意味が projection / graph / governance review / audit review / operational review に伝わるときの読み方を示す。

propagation 方針:

- readiness signal は projection に read-only metadata として伝わる。
- readiness reason は governance-review / completeness / confidence / evidence / priority / warning / limitation と紐づけて読む。
- readiness gap は readability / governance explanation / audit explanation の理由になり得る。
- review-ready は review completed ではない。
- graph edge が readiness signal を参照しても execution dependency にはならない。
- propagation で readiness engine や execution orchestration を開始しない。

propagation が意味しないこと:

- review completed
- source error confirmed
- correction required
- replay eligibility
- approval granted
- assignment created
- execution orchestration started

review-readiness propagation はレビュー可能性の伝播であり、execution workflow ではない。

## Review-Readiness と Governance-Review の違い

review-readiness と governance-review は同じではない。

- review-readiness: review 可能状態かどうか。
- governance-review: 人間がどの review 観点で確認するか。

違い:

- review-readiness は review を始めて読める材料の状態を示す。
- governance-review は governance / audit / operational / escalation / integrity の確認観点を示す。
- review-ready でも governance review が完了したわけではない。
- governance-review candidate があることは review-ready を意味しない。

混同してはいけない解釈:

- review-ready = governance review completed
- governance review = readiness confirmed
- blocked review = governance workflow blocked
- review-readiness propagation = review workflow

## Review-Readiness と Completeness の違い

review-readiness と completeness は同じではない。

- review-readiness: review 可能状態かどうか。
- completeness: 情報がどれくらい揃っているか。

違い:

- completeness は情報の揃い具合を示す。
- review-readiness は completeness に加え、confidence / freshness / evidence / governance context / interpretation caveat を含めて review しやすいかを読む。
- complete でも review-ready とは限らない。
- partially-ready は completeness partial と同義ではない。

混同してはいけない解釈:

- complete = review-ready
- missing = blocked review
- partially-ready = partial completeness
- review-ready = automatic completeness confirmation

## Review-Readiness と Confidence の違い

review-readiness と confidence は同じではない。

- review-readiness: review 可能状態かどうか。
- confidence: 根拠・範囲・鮮度・制限からどの程度説明可能に読めるか。

違い:

- confidence は説明可能性の水準を示す。
- review-readiness は confidence を材料の一つとして review 可能性を読む。
- high confidence でも review-ready とは限らない。
- low confidence は not-ready の確定ではない。

混同してはいけない解釈:

- high confidence = review-ready
- low confidence = blocked review
- review-ready = high confidence
- unknown confidence = safe to ignore

## Review-Readiness Misuse Risk

review-readiness misuse risk は、review-readiness 表示そのものが本来と異なる意味で読まれる risk である。

誤用しやすい例:

- review-ready を approval ready と読む。
- review-ready を review completed と読む。
- partially-ready を auto-complete required と読む。
- not-ready を correction required と読む。
- blocked review を workflow blocked と読む。
- readiness high を safe to execute と読む。
- readiness gap を source error confirmed と読む。
- review-readiness metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく dashboard governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- review-readiness misuse risk から execution affordance を出さない。
- review-readiness は execution remediation を提供しない。

## Review-Readiness Consistency

review-readiness consistency は、review-ready、partially-ready、not-ready、blocked review、visibility、readability、limitation、propagation が Dashboard / UI / governance review / audit review / operational review / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- readiness level の意味が一貫しているか。
- review-ready が approval ready に見えていないか。
- not-ready / blocked が correction required に見えていないか。
- readiness と governance-review / completeness / confidence の違いが説明されているか。
- stale / partial / delayed caveat が読めるか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

review-readiness consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- readiness engine availability
- auto-review
- execution permission
- workflow priority

## Raw Source / Adapter / Projection / Graph / Review-Readiness Boundary

raw source / adapter / projection / graph / review-readiness は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> review-readiness semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: review-readiness / governance-review / operational-decision / priority / warning / confidence / completeness / evidence / lineage / traceability / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: source node / evidence node / completeness relation / confidence caveat / governance-review relation / review-readiness relation を含む read-only reasoning graph。execution graph ではない。
- review-readiness semantics: review-ready / partially-ready / not-ready / blocked review のレビュー可能状態の意味境界と読み方を揃える read-only review。readiness engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-11 は inventory integrity review-readiness semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- readiness engine 実装
- auto-review 実装
- execution orchestration 実装
- execution workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

review-readiness semantics は execution authority ではない。review-readiness semantics は reasoning / review / comprehension のために、review-ready、partially-ready、not-ready、blocked review、visibility、readability、limitation、propagation、governance-review との違い、completeness との違い、confidence との違い、misuse risk、consistency、Japanese-first review-readiness wording、raw source boundary を説明する conceptual review である。
