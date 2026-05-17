# Inventory Integrity Confidence Semantics Review

Phase B36-02 inventory integrity confidence semantics review.

この文書は、Governance Dashboard / Inventory Integrity における confidence semantics を整理し、「どれくらい信頼できるのか」の意味・境界・読み方を横断で統一するための confidence semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、confidence engine 実装、execution confidence、execution workflow、auto-confidence、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- confidence semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- confidence metadata は truth guarantee ではない。
- stale / partial / delayed confidence state を前提にする。
- Dashboard / UI は日本語中心 confidence 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- confidence semantics を execution workflow と混同しない。
- confidence semantics は execution authority を持たない。
- confidence semantics は rebuild、compare execution、replay、correction、confidence engine、execution confidence、execution workflow、auto-confidence、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityConfidenceSemantics

`InventoryIntegrityConfidenceSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される high / medium / low / unknown confidence を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- high confidence semantics
- medium confidence semantics
- low confidence semantics
- unknown confidence semantics
- confidence visibility semantics
- confidence readability semantics
- confidence limitation semantics
- confidence propagation semantics
- confidence と evidence の違い
- confidence と severity の違い
- confidence と priority の違い
- confidence misuse risk
- confidence consistency
- Japanese-first confidence wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / confidence boundary
- non-execution caveat

含まない意味:

- React component
- confidence engine
- automatic confidence calculation
- automatic approval
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

InventoryIntegrityConfidenceSemantics は「根拠・範囲・鮮度・制限からどの程度説明可能に読めるか」を示す review / audit / governance explanation の補助であり、「正しい」「実行してよい」「承認してよい」を示す workflow object ではない。

## Japanese-First Confidence Wording Policy

Dashboard / UI は日本語中心 confidence 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- confidence は `level + reason + caveat` で表示する。
- high confidence を correctness guarantee に見せない。
- low confidence を wrong data confirmed に見せない。
- unknown confidence を safe to ignore に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `高い説明可能性(high confidence): 根拠が比較的そろっています。正しさ保証ではありません。`
- `中程度の説明可能性(medium confidence): 一部 caveat があります。実行判断ではありません。`
- `低い説明可能性(low confidence): 根拠や範囲に制限があります。誤り確定ではありません。`
- `不明(unknown confidence): 判断材料が不足しています。安全保証ではありません。`

避ける形式:

- `正しい`
- `実行可能`
- `承認可能`
- `誤り確定`
- `安全`
- `監査完了`

## High Confidence Semantics

high confidence は、source / evidence / scope / freshness / lineage / limitation が比較的そろい、説明可能性が高く見える状態を示す。

推奨表現:

- `高い説明可能性(high confidence)`
- `根拠が比較的そろっています`
- `説明しやすい状態`
- `確認材料がそろっている可能性`

意味:

- review / investigation / audit で説明材料として使いやすい。
- evidence / source coverage / lineage / freshness が比較的そろっている可能性がある。
- confidence reason と limitation を一緒に読むべき状態である。

禁止解釈:

- truth guarantee
- safe to execute
- approval ready
- audit completed
- cause confirmed
- correction unnecessary guaranteed

high confidence は説明可能性の高さであり、正しさ保証ではない。

## Medium Confidence Semantics

medium confidence は、一定の説明材料はあるが、確認制限や caveat も残る状態を示す。

推奨表現:

- `中程度の説明可能性(medium confidence)`
- `一部 caveat あり`
- `確認材料は一部そろっています`
- `追加確認の余地があります`

意味:

- review / audit / operational comprehension の判断材料として使えるが、過信しない。
- evidence / freshness / completeness / lineage の一部に制限がある可能性を示す。
- reason / scope / limitation を確認して読む必要がある。

禁止解釈:

- approval ready
- execution ready
- mostly correct
- correction optional
- issue resolved

medium confidence は中程度の説明可能性であり、実行判断ではない。

## Low Confidence Semantics

low confidence は、根拠・範囲・鮮度・由来・説明可能性に強い制限がある状態を示す。

推奨表現:

- `低い説明可能性(low confidence)`
- `根拠に制限あり`
- `説明材料が不足しています`
- `確認制限が強い状態`

意味:

- review / audit / operational comprehension で注意して読む必要がある。
- evidence gap / lineage gap / stale / partial / delayed / ambiguous semantics が影響している可能性がある。
- priority / warning / escalation の理由になり得る。

禁止解釈:

- wrong data confirmed
- source error confirmed
- correction required
- rebuild required
- automatic remediation
- safe to ignore

low confidence は説明制限であり、誤り確定ではない。

## Unknown Confidence Semantics

unknown confidence は、confidence を判断するための材料が不足している、または評価不能な状態を示す。

推奨表現:

- `不明(unknown confidence)`
- `説明可能性不明`
- `判断材料不足`
- `確認材料が不足しています`

意味:

- confidence level を安全に判断できない。
- source / evidence / freshness / lineage / scope のいずれかが不足または未評価である可能性がある。
- review limitation として表示する。

禁止解釈:

- safe to ignore
- no issue
- wrong data confirmed
- automatic correction required
- evidence fetch command

unknown confidence は不明であることの表示であり、安全保証ではない。

## Confidence Visibility Semantics

confidence visibility は、confidence level と理由・制限をどの程度見えるようにするかを示す。

visibility 方針:

- confidence level と confidence reason を一緒に表示する。
- stale / partial / delayed confidence state は limitation として見えるようにする。
- high confidence には truth guarantee ではない caveat を添える。
- low / unknown confidence には wrong data confirmed ではない caveat を添える。
- color だけで confidence を伝えない。
- confidence と evidence / severity / priority を label で区別する。
- confidence と execution control を近接させない。

visibility が意味しないこと:

- correctness confirmation
- operation completion
- audit completion
- mutation permission
- execution readiness

confidence visibility は governance explanation のための表示整理である。

## Confidence Readability Semantics

confidence readability は、confidence level を短時間で安全に読める状態である。

readability 方針:

- confidence は `level + reason + caveat` で表示する。
- same confidence level は same label で表示する。
- confidence level / reason / limitation を混同しない。
- high confidence には correctness guarantee ではない caveat を添える。
- low / unknown confidence には automatic correction ではない caveat を添える。
- confidence と evidence / severity / priority を混同しない。

推奨 wording:

- `高い説明可能性(high confidence): 根拠と由来が比較的そろっています。正しさ保証ではありません。`
- `低い説明可能性(low confidence): 根拠または鮮度に制限があります。誤り確定ではありません。`
- `不明(unknown confidence): 判断材料が不足しています。安全保証ではありません。`

confidence readability は correctness guarantee でも execution permission でもない。

## Confidence Limitation Semantics

confidence limitation は、confidence の読み方に制限があることを示す。

limitation 候補:

- source coverage gap
- evidence gap
- evidence quality limitation
- freshness limitation
- completeness limitation
- lineage gap
- traceability gap
- snapshot / compare scope mismatch
- stale / partial / delayed state
- ambiguous transaction semantics
- `inventory_current` cache observation limitation

意味:

- limitation は review / audit / operational comprehension の caveat である。
- confidence を過信しないための guardrail である。
- confidence level が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = evidence fetch command
- limitation = safe to ignore

confidence limitation は correction / rebuild / replay の開始条件ではない。

## Confidence Propagation Semantics

confidence propagation は、confidence の意味が projection / graph / review / audit / priority / warning に伝わるときの読み方を示す。

propagation 方針:

- confidence level は projection に read-only metadata として伝わる。
- confidence reason は evidence / lineage / freshness / completeness と紐づけて読む。
- low / unknown confidence は warning / priority / escalation の理由になり得る。
- high confidence は severity や priority を下げる場合があるが、安全保証ではない。
- graph edge が confidence を参照しても truth guarantee にはならない。
- propagation で execution dependency を作らない。

propagation が意味しないこと:

- cause confirmed
- source verified
- correction required
- replay eligibility
- approval granted
- assignment created

confidence propagation は reasoning relation の伝播であり、execution confidence 実装ではない。

## Confidence と Evidence の違い

confidence と evidence は同じではない。

- evidence: 何を根拠として読めるか。
- confidence: その根拠・範囲・鮮度・制限から、どの程度説明可能に読めるか。

違い:

- evidence は explanation material を示す。
- confidence は explanation material の揃い具合や読みやすさを示す。
- evidence available でも confidence が high とは限らない。
- confidence high でも evidence が truth guarantee になるわけではない。
- evidence gap は confidence を下げる要因になり得る。

混同してはいけない解釈:

- evidence available = high confidence
- high confidence = evidence complete
- evidence missing = low confidence confirmed
- confidence high = source verified

## Confidence と Severity の違い

confidence と severity は同じではない。

- confidence: どの程度説明可能に読めるか。
- severity: どれだけ重大に注意して読むべきか。

違い:

- confidence は explanation quality / reliability of reading を示す。
- severity は impact / attention intensity を示す。
- low confidence は severity を上げる要因になり得るが、同義ではない。
- high severity でも confidence が high とは限らない。
- high confidence でも severity が low とは限らない。

混同してはいけない解釈:

- low confidence = critical severity confirmed
- high confidence = low severity
- high severity = low confidence
- confidence high = safe

## Confidence と Priority の違い

confidence と priority は同じではない。

- confidence: どの程度説明可能に読めるか。
- priority: どれを先に確認して読むかの参考。

違い:

- low / unknown confidence は priority を上げる要因になり得る。
- priority high は confidence low を意味しない。
- confidence high は priority low を意味しない。
- priority ordering は confidence とともに読むが、execution order ではない。

混同してはいけない解釈:

- low confidence = priority executed
- priority high = confidence low
- confidence high = no review priority
- priority low = confidence sufficient

## Confidence Misuse Risk

confidence misuse risk は、confidence 表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- high confidence を correctness guarantee と読む。
- high confidence を safe to execute と読む。
- medium confidence を approval ready と読む。
- low confidence を wrong data confirmed と読む。
- unknown confidence を safe to ignore と読む。
- confidence reason を cause confirmed と読む。
- confidence propagation を execution dependency と読む。
- confidence と evidence / severity / priority を同一視する。
- confidence metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく confidence governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- confidence misuse risk から execution affordance を出さない。
- confidence は execution remediation を提供しない。

## Confidence Consistency

confidence consistency は、confidence level / readability / limitation / propagation が Dashboard / UI / audit review / operational review / governance explanation / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- high / medium / low / unknown の意味が一貫しているか。
- confidence level が correctness guarantee に見えていないか。
- confidence reason が cause confirmed に見えていないか。
- confidence limitation が correction / rebuild trigger に見えていないか。
- confidence propagation が execution dependency に見えていないか。
- confidence と evidence / severity / priority の違いが説明されているか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

confidence consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- confidence engine availability
- execution permission
- workflow priority
- execution confidence

## Raw Source / Adapter / Projection / Graph / Confidence Boundary

raw source / adapter / projection / graph / confidence は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> confidence semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / confidence / attention / review / escalation / state / severity / priority を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: confidence metadata や confidence relation を含む read-only reasoning graph。execution graph ではない。
- confidence semantics: high / medium / low / unknown、readability、limitation、propagation の意味境界と読み方を揃える read-only review。confidence engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-02 は inventory integrity confidence semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- confidence engine 実装
- execution confidence 実装
- execution workflow 実装
- auto-confidence 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

confidence semantics は execution authority ではない。confidence semantics は reasoning / review / comprehension のために、high / medium / low / unknown confidence、visibility、readability、limitation、propagation、evidence との違い、severity との違い、priority との違い、misuse risk、consistency、Japanese-first confidence wording、raw source boundary を説明する conceptual review である。
