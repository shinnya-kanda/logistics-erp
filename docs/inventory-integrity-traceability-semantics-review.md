# Inventory Integrity Traceability Semantics Review

Phase B36-05 inventory integrity traceability semantics review.

この文書は、Governance Dashboard / Inventory Integrity における traceability semantics を整理し、「どこから来た情報なのか」「どう追跡できるか」の意味・境界・読み方を横断で統一するための traceability semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、trace engine 実装、live trace、execution trace、execution workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- traceability semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- traceability metadata は truth guarantee ではない。
- stale / partial / delayed traceability state を前提にする。
- Dashboard / UI は日本語中心 traceability 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- traceability semantics を execution workflow と混同しない。
- traceability semantics は execution authority を持たない。
- traceability semantics は rebuild、compare execution、replay、correction、trace engine、live trace、execution trace、execution workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityTraceabilitySemantics

`InventoryIntegrityTraceabilitySemantics` は、Governance Dashboard / Inventory Integrity UI で表示される source lineage / source chain / projection traceability / cross-projection traceability / audit traceability を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- source lineage semantics
- source chain semantics
- projection traceability semantics
- cross-projection traceability semantics
- audit traceability semantics
- traceability visibility semantics
- traceability readability semantics
- traceability limitation semantics
- traceability propagation semantics
- traceability と evidence の違い
- traceability と confidence の違い
- traceability と completeness の違い
- traceability misuse risk
- traceability consistency
- Japanese-first traceability wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / traceability boundary
- non-execution caveat

含まない意味:

- React component
- trace engine
- live trace
- execution trace
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

InventoryIntegrityTraceabilitySemantics は「どの情報がどの source / projection / evidence / graph relation に由来して見えるか」を示す review / audit / governance explanation の補助であり、「どの処理を再実行・修正・承認できるか」を示す workflow object ではない。

## Japanese-First Traceability Wording Policy

Dashboard / UI は日本語中心 traceability 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- traceability は `trace kind + relation + caveat` で表示する。
- trace relation を causal proof に見せない。
- lineage complete を permission granted に見せない。
- trace gap を correction required に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `由来追跡(traceability): どの情報に由来するかを示します。実行依存ではありません。`
- `由来関係(lineage): 表示モデルの由来を示します。正しさ保証ではありません。`
- `追跡 chain(source chain): 関係を追って読めます。replay 許可ではありません。`
- `由来不足(traceability gap): 追跡関係に制限があります。修正指示ではありません。`

避ける形式:

- `再実行可能`
- `原因確定`
- `修正対象`
- `承認関係`
- `実行依存`
- `live trace 実行中`

## Source Lineage Semantics

source lineage は、projection / review / evidence / escalation / priority がどの source data に由来して読めるかを示す。

lineage 対象:

- `inventory_transactions`
- source transaction range
- signed quantity effect
- transaction type relation
- warehouse / location / project / part / pallet / lot relation
- snapshot reference
- compare reference
- evidence reference
- trace id / request id / parent trace id

意味:

- source lineage は由来関係を説明する read-only relation である。
- `inventory_transactions` は inventory integrity の truth である。
- `inventory_current` は cache observation / compare target として扱い、source of truth にはしない。
- lineage が見えることは completeness や correctness を保証しない。

禁止解釈:

- lineage complete = permission granted
- lineage visible = correct
- trace relation = replay eligibility
- source relation = causal proof
- `inventory_current` observation = truth

source lineage は「何に由来して読めるか」の説明であり、execution dependency ではない。

## Source Chain Semantics

source chain は、raw source から projection / graph / UI 表示までの関係を chain として追って読める状態を示す。

chain 候補:

- raw transaction -> aggregation effect
- raw transaction -> snapshot
- snapshot -> compare projection
- compare projection -> review state
- evidence -> audit explanation
- lineage -> reasoning graph edge
- attention / warning -> review priority
- escalation -> audit / manager visibility

意味:

- source chain は、複数の relation を順に追って読める reasoning chain である。
- chain は explanation / audit / operational handoff の補助である。
- chain freshness / completeness / confidence の caveat と一緒に読む。

禁止解釈:

- chain = execution chain
- chain = workflow graph
- chain = causal proof
- chain = replay path
- chain = correction plan

source chain は追跡可能な読み方であり、実行順序や処理依存ではない。

## Projection Traceability Semantics

projection traceability は、InventoryIntegrityProjection がどの source / adapter / snapshot / compare / evidence / lineage から構成されたかを追える状態を示す。

確認観点:

- projection id / projection type
- source transaction reference
- adapter normalization reference
- snapshot id / as_of_time
- compare id / compared_at
- evidence reference
- lineage reference
- confidence / freshness / completeness caveat
- generated_at / observed_at

意味:

- projection traceability は projection の由来説明である。
- projection metadata は source of truth ではない。
- projection traceability は review / audit / governance explanation の補助である。

禁止解釈:

- projection traceability = mutation key
- projection traceability = executable command
- projection traceability = adapter execution
- projection traceability = source verified
- projection traceability = correction authority

projection traceability は read-only metadata の追跡であり、mutation authority ではない。

## Cross-Projection Traceability Semantics

cross-projection traceability は、複数の projection / graph node / dashboard context 間で、同じ source や relation をどう追えるかを示す。

対象:

- compare projection -> integrity projection
- integrity projection -> audit projection
- operational projection -> governance projection
- evidence node -> review node
- lineage node -> escalation node
- source node -> multiple derived projections
- same-scope-as / derived-from / explains relation

意味:

- cross-projection traceability は、複数の表示モデル間の related reference を安全に読むための relation である。
- dashboard 間 link / reference は read-only reference として扱う。
- relation freshness / completeness / confidence の caveat と一緒に読む。

禁止解釈:

- cross-projection relation = causal proof
- cross-projection relation = workflow handoff
- cross-projection link = execution affordance
- relation complete = permission granted
- relation gap = correction required

cross-projection traceability は reasoning relation であり、execution workflow ではない。

## Audit Traceability Semantics

audit traceability は、監査・棚卸・内部統制・説明責任のために、source / projection / graph / review / evidence のつながりを追える状態を示す。

audit traceability 対象:

- `inventory_transactions` reference
- transaction event time / recorded_at
- aggregation effect reference
- snapshot id / as_of_time
- compare id / compared_at
- evidence reference
- trace id / request id / parent trace id
- pallet / lot / location / project relation
- review state reference
- escalation reference

意味:

- audit traceability は説明責任と追跡可能性を補助する read-only relation である。
- audit traceability は evidence / lineage / completeness / confidence と一緒に読む。
- traceability gap は audit limitation として表示する。

禁止解釈:

- traceability complete = operation correct
- trace relation = causal proof
- parent_trace_id = approval hierarchy
- trace gap = correction required
- traceability = replay permission

audit traceability は audit execution ではなく、監査観点の読み方である。

## Traceability Visibility Semantics

traceability visibility は、由来関係と追跡 chain をどの程度見えるようにするかを示す。

visibility 方針:

- trace kind と relation reason を一緒に表示する。
- `inventory_transactions` 由来と `inventory_current` cache observation を区別する。
- source / projection / graph / evidence / audit relation を同じ context で読めるようにする。
- traceability gap は hidden state にしない。
- stale / partial / delayed traceability state は limitation として表示する。
- traceability と evidence / confidence / completeness を label で区別する。
- traceability と execution control を近接させない。

visibility が意味しないこと:

- correctness confirmation
- operation completion
- audit completion
- mutation permission
- replay permission

traceability visibility は governance explanation のための表示整理である。

## Traceability Readability Semantics

traceability readability は、由来関係と追跡 chain を短時間で安全に読める状態である。

readability 方針:

- traceability は `trace kind + relation + caveat` で表示する。
- same trace kind は same label で表示する。
- source / chain / projection / cross-projection / audit traceability を混同しない。
- complete trace には correctness guarantee ではない caveat を添える。
- trace gap には correction required ではない caveat を添える。
- traceability と evidence / confidence / completeness を混同しない。

推奨 wording:

- `由来追跡(traceability): source から表示モデルまでの関係を読めます。正しさ保証ではありません。`
- `由来不足(traceability gap): 追跡関係に制限があります。修正指示ではありません。`
- `関連表示モデル(cross-projection trace): 別表示との関連です。実行 handoff ではありません。`

traceability readability は correctness guarantee でも execution permission でもない。

## Traceability Limitation Semantics

traceability limitation は、由来関係や追跡 chain の読み方に制限があることを示す。

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
- traceability を過信しないための guardrail である。
- traceability completeness / confidence / freshness が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = replay required
- limitation = safe to ignore

traceability limitation は correction / rebuild / replay / live trace の開始条件ではない。

## Traceability Propagation Semantics

traceability propagation は、traceability の意味が projection / graph / review / audit / evidence / confidence / completeness に伝わるときの読み方を示す。

propagation 方針:

- traceability relation は projection に read-only metadata として伝わる。
- traceability reason は source / evidence / lineage / freshness / completeness と紐づけて読む。
- traceability gap は confidence / warning / priority / audit escalation の理由になり得る。
- traceability complete は confidence を上げる要因になり得るが、truth guarantee ではない。
- graph edge が traceability を参照しても execution dependency にはならない。
- propagation で live trace や execution trace を開始しない。

propagation が意味しないこと:

- cause confirmed
- source verified
- correction required
- replay eligibility
- approval granted
- assignment created
- live trace started

traceability propagation は reasoning relation の伝播であり、trace engine 実装ではない。

## Traceability と Evidence の違い

traceability と evidence は同じではない。

- traceability: どこから来た情報か、どう追跡できるか。
- evidence: 何を根拠として読めるか。

違い:

- traceability は relation / path / chain を示す。
- evidence は explanation material を示す。
- evidence があっても traceability が complete とは限らない。
- traceability complete でも evidence が truth guarantee になるわけではない。
- traceability gap は evidence limitation の理由になり得る。

混同してはいけない解釈:

- evidence available = traceability complete
- traceability complete = evidence proof
- evidence missing = trace gap confirmed
- traceability relation = causal proof

## Traceability と Confidence の違い

traceability と confidence は同じではない。

- traceability: どこから来た情報か、どう追えるか。
- confidence: 根拠・範囲・鮮度・制限からどの程度説明可能に読めるか。

違い:

- traceability は relation の追跡可能性を示す。
- confidence は explanation quality / reliability of reading を示す。
- traceability gap は confidence を下げる要因になり得るが、同義ではない。
- high confidence でも traceability が complete とは限らない。
- traceability complete でも high confidence とは限らない。

混同してはいけない解釈:

- traceability complete = high confidence
- high confidence = traceability complete
- traceability gap = low confidence confirmed
- confidence high = source verified

## Traceability と Completeness の違い

traceability と completeness は同じではない。

- traceability: どこから来た情報か、どう追えるか。
- completeness: 情報や根拠がどの程度揃っているか。

違い:

- traceability は relation / path の追跡可能性を示す。
- completeness は source / evidence / lineage / graph relation の揃い具合を示す。
- completeness complete でも traceability が complete とは限らない。
- traceability complete でも source coverage が complete とは限らない。
- traceability gap は completeness limitation の理由になり得る。

混同してはいけない解釈:

- complete = traceability complete
- traceability complete = completeness complete
- trace gap = missing confirmed
- completeness missing = replay required

## Traceability Misuse Risk

traceability misuse risk は、由来関係や追跡表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- trace relation を causal proof と読む。
- lineage complete を permission granted と読む。
- parent_trace_id を approval hierarchy と読む。
- trace gap を correction required と読む。
- traceability complete を operation correct と読む。
- traceability relation を replay eligibility と読む。
- cross-projection relation を workflow handoff と読む。
- traceability propagation を execution dependency と読む。
- traceability と evidence / confidence / completeness を同一視する。
- traceability metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく traceability governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- traceability misuse risk から execution affordance を出さない。
- traceability は execution remediation を提供しない。

## Traceability Consistency

traceability consistency は、source lineage / source chain / projection traceability / cross-projection traceability / audit traceability、readability、limitation、propagation が Dashboard / UI / audit review / operational review / governance explanation / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- source lineage / source chain / projection traceability / cross-projection traceability の意味が一貫しているか。
- trace relation が causal proof に見えていないか。
- lineage complete が permission granted に見えていないか。
- traceability limitation が correction / rebuild / replay trigger に見えていないか。
- traceability propagation が execution dependency に見えていないか。
- traceability と evidence / confidence / completeness の違いが説明されているか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

traceability consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- trace engine availability
- execution permission
- workflow priority
- execution trace

## Raw Source / Adapter / Projection / Graph / Traceability Boundary

raw source / adapter / projection / graph / traceability は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> traceability semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / traceability / confidence / freshness / completeness / attention / review / escalation / state / severity / priority を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: source node / evidence node / lineage edge / trace relation を含む read-only reasoning graph。execution graph ではない。
- traceability semantics: source lineage / source chain / projection traceability / cross-projection traceability / audit traceability の意味境界と読み方を揃える read-only review。trace engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-05 は inventory integrity traceability semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- trace engine 実装
- live trace 実装
- execution trace 実装
- execution workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

traceability semantics は execution authority ではない。traceability semantics は reasoning / review / comprehension のために、source lineage / source chain / projection traceability / cross-projection traceability / audit traceability、visibility、readability、limitation、propagation、evidence との違い、confidence との違い、completeness との違い、misuse risk、consistency、Japanese-first traceability wording、raw source boundary を説明する conceptual review である。
