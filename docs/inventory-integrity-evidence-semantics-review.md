# Inventory Integrity Evidence Semantics Review

Phase B36-01 inventory integrity evidence semantics review.

この文書は、Governance Dashboard / Inventory Integrity における evidence semantics を整理し、「何を根拠として表示・判断しているか」の意味・境界・読み方を横断で統一するための evidence semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、evidence engine 実装、execution reasoning、execution workflow、auto-evidence、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- evidence semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- evidence metadata は truth guarantee ではない。
- stale / partial / delayed evidence state を前提にする。
- Dashboard / UI は日本語中心 evidence 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- evidence semantics を execution workflow と混同しない。
- evidence semantics は execution authority を持たない。
- evidence semantics は rebuild、compare execution、replay、correction、evidence engine、execution reasoning、execution workflow、auto-evidence、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityEvidenceSemantics

`InventoryIntegrityEvidenceSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される source / confidence / freshness / completeness / limitation / visibility / propagation などの evidence を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- evidence source semantics
- evidence confidence semantics
- evidence freshness semantics
- evidence completeness semantics
- evidence limitation semantics
- evidence visibility semantics
- evidence readability semantics
- evidence propagation semantics
- evidence と severity の違い
- evidence と warning の違い
- evidence と priority の違い
- evidence misuse risk
- evidence consistency
- Japanese-first evidence wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / evidence boundary
- non-execution caveat

含まない意味:

- React component
- evidence engine
- automatic evidence collection
- evidence upload action
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

InventoryIntegrityEvidenceSemantics は「何を根拠として読めるか」を示す review / audit / governance explanation の補助であり、「何を実行するか」「どの根拠で修正するか」を示す workflow object ではない。

## Japanese-First Evidence Wording Policy

Dashboard / UI は日本語中心 evidence 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- evidence は `evidence kind + source + caveat` で表示する。
- evidence available を correctness guarantee に見せない。
- evidence missing を upload / fetch action に見せない。
- completeness には audit completed ではない caveat を添える。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `根拠・証跡(evidence): 確認用の説明材料です。正しさ保証ではありません。`
- `由来元(source): inventory_transactions 由来の範囲を示します。実行指示ではありません。`
- `根拠不足(evidence gap): 追加確認の候補です。証跡取得指示ではありません。`
- `一部のみ(partial evidence): 根拠範囲に制限があります。欠落修正指示ではありません。`

避ける形式:

- `正しいことを確認済み`
- `根拠があるので実行可能`
- `証跡を追加してください`
- `監査完了`
- `修正根拠確定`

## Evidence Source Semantics

evidence source は、projection / compare / review / audit / priority がどの情報を根拠として読めるかを示す。

source 候補:

- `inventory_transactions`
- source transaction range
- signed quantity effect
- snapshot reference
- compare result
- `inventory_current` observation as cache / compare target
- trace id / request id / parent trace id
- pallet / lot / location / project relation
- review note
- escalation reference
- limitation reference

意味:

- evidence source は reasoning / review / audit の説明材料である。
- `inventory_transactions` は inventory integrity の truth である。
- `inventory_current` は cache observation / compare target として扱い、source of truth にはしない。
- source が見えることは completeness や correctness を保証しない。

禁止解釈:

- source visible = correct
- evidence source = mutation authority
- `inventory_current` observation = truth
- trace relation = replay permission
- source relation = causal proof

evidence source は「何に由来して読めるか」の説明であり、execution dependency ではない。

## Evidence Confidence Semantics

evidence confidence は、根拠がどの程度そろい、どの程度説明に使いやすいかを示す。

confidence に影響する観点:

- source coverage
- transaction completeness
- signed quantity clarity
- snapshot alignment
- compare consistency
- evidence quality
- lineage completeness
- traceability completeness
- stale / partial / delayed caveat
- ADJUST / CANCEL / MOVE semantics clarity
- pallet / lot / location / project boundary clarity

意味:

- confidence は review / investigation / audit の判断材料としての有用度である。
- high confidence は説明材料が比較的そろっていることを示す。
- low / unknown confidence は説明に制限があることを示す。

禁止解釈:

- high confidence = truth guarantee
- high confidence = safe to execute
- low confidence = wrong data confirmed
- unknown confidence = safe to ignore
- confidence reason = cause confirmed

evidence confidence は evidence の読みやすさであり、execution authority ではない。

## Evidence Freshness Semantics

evidence freshness は、根拠がどの時点・範囲・条件の情報として読めるかを示す。

freshness 対象:

- source transaction freshness
- snapshot freshness
- compare freshness
- cache observation freshness
- review note freshness
- audit evidence freshness
- graph relation freshness
- projection generated_at / observed_at / as_of_time

意味:

- freshness は evidence の時点制限を示す。
- stale evidence は最新 context を反映していない可能性を示す。
- delayed evidence は反映遅延を caveat として読む。

禁止解釈:

- fresh = correct
- stale = source error confirmed
- stale = rebuild required
- delayed = correction required
- freshness high = safe to execute

evidence freshness は確認制限であり、実行指示ではない。

## Evidence Completeness Semantics

evidence completeness は、根拠として必要な source / snapshot / compare / lineage / trace / limitation がどの程度そろって見えるかを示す。

completeness 観点:

- source transaction coverage
- signed quantity coverage
- snapshot coverage
- compare coverage
- traceability coverage
- lineage coverage
- audit evidence coverage
- limitation explanation coverage

意味:

- completeness は evidence の揃い具合を示す。
- complete に見える evidence は audit / review explanation に使いやすい。
- partial / missing evidence は review limitation として読む。

禁止解釈:

- complete = audit completed
- complete = operation correct
- complete = source of truth verified
- missing = upload action required
- partial = automatic remediation required

evidence completeness は説明材料の揃い具合であり、truth guarantee ではない。

## Evidence Limitation Semantics

evidence limitation は、根拠の読み方に制限があることを示す。

limitation 候補:

- source coverage gap
- transaction type ambiguity
- snapshot scope mismatch
- compare scope mismatch
- trace relation gap
- lineage gap
- evidence stale / partial / delayed
- confidence low / unknown
- pallet / lot / location / project boundary mismatch
- `inventory_current` cache observation limitation

意味:

- limitation は review / audit / operational comprehension の caveat である。
- limitation を隠さず、説明材料の制限として表示する。
- limitation は evidence を過信しないための guardrail である。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = missing action required
- limitation = safe to ignore

evidence limitation は correction / rebuild / replay の開始条件ではない。

## Evidence Visibility Semantics

evidence visibility は、根拠をどの程度見えるようにするかを示す。

visibility 方針:

- evidence source と caveat を一緒に表示する。
- `inventory_transactions` 由来と `inventory_current` observation を区別する。
- evidence confidence / freshness / completeness / limitation を同じ context で読めるようにする。
- evidence gap は hidden state にしない。
- evidence と severity / warning / priority を label で区別する。
- evidence と execution control を近接させない。

visibility が意味しないこと:

- correctness confirmation
- operation completion
- audit completion
- mutation permission
- execution readiness

evidence visibility は governance explanation のための表示整理である。

## Evidence Readability Semantics

evidence readability は、根拠を短時間で安全に読める状態である。

readability 方針:

- evidence は `kind + source + caveat` で表示する。
- same evidence kind は same label で表示する。
- source / confidence / freshness / completeness / limitation を混同しない。
- evidence available には correctness guarantee ではない caveat を添える。
- evidence missing には upload / fetch action ではない caveat を添える。
- evidence と severity / warning / priority を混同しない。

推奨 wording:

- `根拠あり(evidence available): 確認用の説明材料があります。正しさ保証ではありません。`
- `根拠不足(evidence gap): 説明材料に制限があります。追加取得指示ではありません。`
- `古い可能性(stale evidence): 根拠の時点に制限があります。再構築指示ではありません。`

evidence readability は correctness guarantee でも execution permission でもない。

## Evidence Propagation Semantics

evidence propagation は、根拠の意味が projection / graph / review / audit / priority に伝わるときの読み方を示す。

propagation 方針:

- evidence source は projection に read-only metadata として伝わる。
- evidence confidence は review / audit / priority の読みやすさに影響し得る。
- evidence freshness は stale / delayed caveat として伝わる。
- evidence completeness は partial / gap / limitation として伝わる。
- graph edge が evidence を参照しても truth guarantee にはならない。
- propagation で execution dependency を作らない。

propagation が意味しないこと:

- cause confirmed
- source verified
- correction required
- replay eligibility
- approval granted
- assignment created

evidence propagation は reasoning relation の伝播であり、execution reasoning 実装ではない。

## Evidence と Severity の違い

evidence と severity は同じではない。

- evidence: 何を根拠として読めるか。
- severity: どれだけ重大に注意して読むべきか。

違い:

- evidence は explanation material を示す。
- severity は attention intensity / impact を示す。
- evidence gap は severity を上げる要因になり得るが、同義ではない。
- high severity でも evidence が十分とは限らない。
- evidence complete でも severity が低いとは限らない。

混同してはいけない解釈:

- evidence available = severity resolved
- evidence gap = critical confirmed
- high severity = evidence sufficient
- evidence complete = safe

## Evidence と Warning の違い

evidence と warning は同じではない。

- evidence: 根拠や説明材料。
- warning: 誤読 risk、確認制限、attention を目立たせる display signal。

違い:

- evidence は explanation / support を示す。
- warning は limitation / attention display を示す。
- evidence missing は warning の理由になり得るが、warning そのものではない。
- warning visible でも evidence が完全とは限らない。
- evidence available でも warning が不要とは限らない。

混同してはいけない解釈:

- warning visible = evidence confirmed
- evidence missing = upload required
- evidence available = warning resolved
- warning critical = evidence proof

## Evidence と Priority の違い

evidence と priority は同じではない。

- evidence: 何を根拠として読めるか。
- priority: どれを先に確認して読むかの参考。

違い:

- evidence gap は priority を上げる要因になり得る。
- priority high は evidence complete を意味しない。
- evidence complete は priority low を意味しない。
- priority ordering は evidence quality とともに読むが、execution order ではない。

混同してはいけない解釈:

- evidence gap = priority executed
- priority high = evidence sufficient
- evidence complete = no review priority
- priority low = evidence irrelevant

## Evidence Misuse Risk

evidence misuse risk は、根拠表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- evidence available を operation correct と読む。
- evidence missing を upload action required と読む。
- evidence completeness を audit completed と読む。
- evidence confidence high を safe to execute と読む。
- evidence confidence low を wrong data confirmed と読む。
- evidence freshness high を source verified と読む。
- evidence source relation を causal proof と読む。
- evidence propagation を execution dependency と読む。
- evidence と severity / warning / priority を同一視する。
- evidence metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく evidence governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- evidence misuse risk から execution affordance を出さない。
- evidence は execution remediation を提供しない。

## Evidence Consistency

evidence consistency は、evidence source / confidence / freshness / completeness / limitation / visibility / propagation が Dashboard / UI / audit review / operational review / governance explanation / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- evidence source が `inventory_transactions` truth と `inventory_current` cache observation を分けているか。
- evidence confidence が correctness guarantee に見えていないか。
- evidence freshness が execution readiness に見えていないか。
- evidence completeness が audit completed に見えていないか。
- evidence limitation が correction / rebuild trigger に見えていないか。
- evidence propagation が execution dependency に見えていないか。
- evidence と severity / warning / priority の違いが説明されているか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_current` を truth として扱っていないか。

evidence consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- evidence engine availability
- execution permission
- workflow priority
- execution reasoning

## Raw Source / Adapter / Projection / Graph / Evidence Boundary

raw source / adapter / projection / graph / evidence は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> evidence semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation / state / severity / priority を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: evidence node / edge / relation を含む read-only reasoning graph。execution graph ではない。
- evidence semantics: source / confidence / freshness / completeness / limitation / propagation の意味境界と読み方を揃える read-only review。evidence engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-01 は inventory integrity evidence semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- evidence engine 実装
- execution reasoning 実装
- execution workflow 実装
- auto-evidence 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

evidence semantics は execution authority ではない。evidence semantics は reasoning / review / comprehension のために、evidence source / confidence / freshness / completeness / limitation / visibility / readability / propagation、severity との違い、warning との違い、priority との違い、misuse risk、consistency、Japanese-first evidence wording、raw source boundary を説明する conceptual review である。
