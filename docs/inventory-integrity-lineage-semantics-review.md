# Inventory Integrity Lineage Semantics Review

Phase B36-06 inventory integrity lineage semantics review.

この文書は、Governance Dashboard / Inventory Integrity における lineage semantics を整理し、「どの推論・projection・source から導かれたか」の意味・境界・読み方を横断で統一するための lineage semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、lineage engine 実装、live lineage、execution lineage、execution workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- lineage semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- lineage metadata は truth guarantee ではない。
- stale / partial / delayed lineage state を前提にする。
- Dashboard / UI は日本語中心 lineage 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- lineage semantics を execution workflow と混同しない。
- lineage semantics は execution authority を持たない。
- lineage semantics は rebuild、compare execution、replay、correction、lineage engine、live lineage、execution lineage、execution workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityLineageSemantics

`InventoryIntegrityLineageSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される projection lineage / reasoning lineage / cross-projection lineage / derived-from relation を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- projection lineage semantics
- reasoning lineage semantics
- cross-projection lineage semantics
- derived-from semantics
- lineage visibility semantics
- lineage readability semantics
- lineage limitation semantics
- lineage propagation semantics
- lineage と traceability の違い
- lineage と evidence の違い
- lineage と reasoning の違い
- lineage misuse risk
- lineage consistency
- Japanese-first lineage wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / lineage boundary
- non-execution caveat

含まない意味:

- React component
- lineage engine
- live lineage
- execution lineage
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

InventoryIntegrityLineageSemantics は「どの source / snapshot / compare / evidence / projection / reasoning relation から導かれて見えるか」を示す review / audit / governance explanation の補助であり、「どの処理を再実行・修正・承認できるか」を示す workflow object ではない。

## Japanese-First Lineage Wording Policy

Dashboard / UI は日本語中心 lineage 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- lineage は `lineage kind + relation + caveat` で表示する。
- derived-from relation を causal proof に見せない。
- lineage complete を permission granted に見せない。
- lineage gap を correction required に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `由来関係(lineage): どの情報から導かれたかを示します。実行依存ではありません。`
- `表示モデル由来(projection lineage): projection の由来を示します。正しさ保証ではありません。`
- `理由づけ由来(reasoning lineage): reasoning relation の由来です。原因確定ではありません。`
- `由来不足(lineage gap): 由来関係に制限があります。修正指示ではありません。`

避ける形式:

- `再実行可能`
- `原因確定`
- `修正対象`
- `承認関係`
- `実行依存`
- `live lineage 実行中`

## Projection Lineage Semantics

projection lineage は、InventoryIntegrityProjection がどの raw source / adapter / snapshot / compare / evidence から構成されたかを示す。

lineage 対象:

- projection id / projection type
- source transaction reference
- adapter normalization reference
- snapshot id / as_of_time
- compare id / compared_at
- evidence reference
- parent projection reference
- generated_at / observed_at
- confidence / freshness / completeness caveat

意味:

- projection lineage は projection の由来説明である。
- projection metadata は source of truth ではない。
- projection lineage は review / audit / governance explanation の補助である。
- `inventory_current` は cache observation / compare target として扱い、source of truth にはしない。

禁止解釈:

- projection lineage = mutation key
- projection lineage = executable command
- projection lineage = adapter execution
- projection lineage = source verified
- projection lineage = correction authority

projection lineage は read-only metadata の由来関係であり、mutation authority ではない。

## Reasoning Lineage Semantics

reasoning lineage は、reasoning graph 上の node / edge / relation がどの source / evidence / projection / limitation から導かれているかを示す。

lineage 対象:

- source node
- projection node
- snapshot node
- compare node
- evidence node
- review node
- attention node
- escalation node
- limitation node
- derived-from / explains / supports / limits relation

意味:

- reasoning lineage は、reasoning relation の由来を読めるようにする。
- graph relation が何に基づくかを説明する。
- reasoning lineage は review / audit / visualization の補助である。

禁止解釈:

- reasoning lineage = cause confirmed
- reasoning lineage = execution reasoning
- graph edge = execution dependency
- lineage edge = replay eligibility
- reasoning lineage complete = approval ready

reasoning lineage は reasoning relation の由来であり、execution graph ではない。

## Cross-Projection Lineage Semantics

cross-projection lineage は、複数の projection 間で、どの relation により関連して見えるかを示す。

対象:

- compare projection -> integrity projection
- integrity projection -> audit projection
- operational projection -> governance projection
- source projection -> derived projection
- parent projection -> child projection
- same-scope-as / derived-from / explains relation

意味:

- cross-projection lineage は、複数の表示モデル間の derived relation を安全に読むための relation である。
- dashboard 間 link / reference は read-only reference として扱う。
- relation freshness / completeness / confidence の caveat と一緒に読む。

禁止解釈:

- cross-projection lineage = workflow handoff
- cross-projection lineage = causal proof
- cross-projection link = execution affordance
- relation complete = permission granted
- relation gap = correction required

cross-projection lineage は reasoning relation であり、execution workflow ではない。

## Derived-From Semantics

derived-from は、ある projection / graph node / review signal が、別の source / projection / evidence / limitation に由来していると読める relation である。

derived-from の読み方:

- source から projection が導かれている。
- snapshot から compare projection が導かれている。
- evidence から review signal が補助されている。
- lineage gap から warning / priority が導かれている。
- limitation から confidence caveat が導かれている。

意味:

- derived-from は relation reason を説明する。
- derived-from は reasoning / review / audit の読み方を助ける。
- derived-from には scope / freshness / confidence / completeness caveat が必要である。

禁止解釈:

- derived-from = causal proof
- derived-from = execution dependency
- derived-from = replay path
- derived-from = correction plan
- derived-from = approval hierarchy

derived-from は由来関係であり、実行依存や因果確定ではない。

## Lineage Visibility Semantics

lineage visibility は、由来関係をどの程度見えるようにするかを示す。

visibility 方針:

- lineage kind と relation reason を一緒に表示する。
- `inventory_transactions` 由来と `inventory_current` cache observation を区別する。
- source / adapter / projection / graph / evidence relation を同じ context で読めるようにする。
- lineage gap は hidden state にしない。
- stale / partial / delayed lineage state は limitation として表示する。
- lineage と traceability / evidence / reasoning を label で区別する。
- lineage と execution control を近接させない。

visibility が意味しないこと:

- correctness confirmation
- operation completion
- audit completion
- mutation permission
- replay permission

lineage visibility は governance explanation のための表示整理である。

## Lineage Readability Semantics

lineage readability は、由来関係を短時間で安全に読める状態である。

readability 方針:

- lineage は `lineage kind + relation + caveat` で表示する。
- same lineage kind は same label で表示する。
- projection lineage / reasoning lineage / cross-projection lineage / derived-from を混同しない。
- complete lineage には correctness guarantee ではない caveat を添える。
- lineage gap には correction required ではない caveat を添える。
- lineage と traceability / evidence / reasoning を混同しない。

推奨 wording:

- `表示モデル由来(projection lineage): source から projection への由来を読めます。正しさ保証ではありません。`
- `由来不足(lineage gap): 由来関係に制限があります。修正指示ではありません。`
- `derived-from: 由来として読める関係です。因果確定ではありません。`

lineage readability は correctness guarantee でも execution permission でもない。

## Lineage Limitation Semantics

lineage limitation は、由来関係の読み方に制限があることを示す。

limitation 候補:

- source coverage gap
- missing transaction range
- missing trace id / request id / parent trace id
- evidence gap
- lineage gap
- cross-projection scope mismatch
- snapshot / compare scope mismatch
- graph relation gap
- stale / partial / delayed context
- `inventory_current` cache observation limitation

意味:

- limitation は review / audit / operational comprehension の caveat である。
- lineage を過信しないための guardrail である。
- lineage completeness / confidence / freshness が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = replay required
- limitation = safe to ignore

lineage limitation は correction / rebuild / replay / live lineage の開始条件ではない。

## Lineage Propagation Semantics

lineage propagation は、lineage の意味が projection / graph / review / audit / evidence / confidence / completeness に伝わるときの読み方を示す。

propagation 方針:

- lineage relation は projection に read-only metadata として伝わる。
- lineage reason は source / evidence / traceability / freshness / completeness と紐づけて読む。
- lineage gap は confidence / warning / priority / audit escalation の理由になり得る。
- lineage complete は confidence を上げる要因になり得るが、truth guarantee ではない。
- graph edge が lineage を参照しても execution dependency にはならない。
- propagation で live lineage や execution lineage を開始しない。

propagation が意味しないこと:

- cause confirmed
- source verified
- correction required
- replay eligibility
- approval granted
- assignment created
- live lineage started

lineage propagation は reasoning relation の伝播であり、lineage engine 実装ではない。

## Lineage と Traceability の違い

lineage と traceability は近いが同じではない。

- lineage: どの source / projection / reasoning relation から導かれたか。
- traceability: どこから来た情報か、どう追跡できるか。

違い:

- lineage は derived relation / parent-child relation に焦点を置く。
- traceability は追跡可能性や chain の読み方に焦点を置く。
- traceability complete でも lineage が完全とは限らない。
- lineage complete でも trace chain が audit 上十分とは限らない。

混同してはいけない解釈:

- traceability complete = lineage complete
- lineage complete = traceability complete
- lineage gap = replay required
- trace relation = derived-from causal proof

## Lineage と Evidence の違い

lineage と evidence は同じではない。

- lineage: どの情報から導かれたか。
- evidence: 何を根拠として読めるか。

違い:

- lineage は relation / derivation を示す。
- evidence は explanation material を示す。
- evidence available でも lineage が complete とは限らない。
- lineage complete でも evidence が truth guarantee になるわけではない。
- lineage gap は evidence limitation の理由になり得る。

混同してはいけない解釈:

- evidence available = lineage complete
- lineage complete = evidence proof
- evidence missing = lineage gap confirmed
- lineage relation = causal proof

## Lineage と Reasoning の違い

lineage と reasoning は同じではない。

- lineage: どの情報や projection から導かれたかの由来関係。
- reasoning: source / evidence / limitation から「どう読めるか」を説明する理由づけ。

違い:

- lineage は relation origin を示す。
- reasoning は interpretation / explanation を示す。
- lineage は reasoning の材料になり得るが、reasoning そのものではない。
- reasoning graph relation に lineage が含まれても、execution reasoning ではない。

混同してはいけない解釈:

- lineage = cause confirmed
- reasoning = execution plan
- lineage relation = reasoning truth guarantee
- reasoning graph = workflow graph

## Lineage Misuse Risk

lineage misuse risk は、由来関係や derived-from 表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- derived-from を causal proof と読む。
- lineage complete を permission granted と読む。
- parent projection を approval hierarchy と読む。
- lineage gap を correction required と読む。
- lineage complete を operation correct と読む。
- lineage relation を replay eligibility と読む。
- cross-projection lineage を workflow handoff と読む。
- lineage propagation を execution dependency と読む。
- lineage と traceability / evidence / reasoning を同一視する。
- lineage metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく lineage governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- lineage misuse risk から execution affordance を出さない。
- lineage は execution remediation を提供しない。

## Lineage Consistency

lineage consistency は、projection lineage / reasoning lineage / cross-projection lineage / derived-from、readability、limitation、propagation が Dashboard / UI / reasoning graph / audit review / governance explanation で同じ意味に読めるかを示す review signal である。

確認観点:

- projection lineage / reasoning lineage / cross-projection lineage / derived-from の意味が一貫しているか。
- derived-from relation が causal proof に見えていないか。
- lineage complete が permission granted に見えていないか。
- lineage limitation が correction / rebuild / replay trigger に見えていないか。
- lineage propagation が execution dependency に見えていないか。
- lineage と traceability / evidence / reasoning の違いが説明されているか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

lineage consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- lineage engine availability
- execution permission
- workflow priority
- execution lineage

## Raw Source / Adapter / Projection / Graph / Lineage Boundary

raw source / adapter / projection / graph / lineage は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> lineage semantics
  -> UI / governance / audit / reasoning explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / traceability / confidence / freshness / completeness / attention / review / escalation / state / severity / priority を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: source node / evidence node / lineage edge / derived-from relation を含む read-only reasoning graph。execution graph ではない。
- lineage semantics: projection lineage / reasoning lineage / cross-projection lineage / derived-from の意味境界と読み方を揃える read-only review。lineage engine ではない。
- UI / governance / audit / reasoning explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-06 は inventory integrity lineage semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- lineage engine 実装
- live lineage 実装
- execution lineage 実装
- execution workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

lineage semantics は execution authority ではない。lineage semantics は reasoning / review / comprehension のために、projection lineage / reasoning lineage / cross-projection lineage / derived-from、visibility、readability、limitation、propagation、traceability との違い、evidence との違い、reasoning との違い、misuse risk、consistency、Japanese-first lineage wording、raw source boundary を説明する conceptual review である。
