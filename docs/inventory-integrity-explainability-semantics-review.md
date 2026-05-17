# Inventory Integrity Explainability Semantics Review

Phase B36-07 inventory integrity explainability semantics review.

この文書は、Governance Dashboard / Inventory Integrity における explainability semantics を整理し、「人間へどう説明するか」の意味・境界・読み方を横断で統一するための explainability semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、explanation engine 実装、LLM auto explanation、live explanation、execution workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- explainability semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- explainability metadata は truth guarantee ではない。
- stale / partial / delayed explainability state を前提にする。
- Dashboard / UI は日本語中心 explainability 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- explainability semantics を execution workflow と混同しない。
- explainability semantics は execution authority を持たない。
- explainability semantics は rebuild、compare execution、replay、correction、explanation engine、LLM auto explanation、live explanation、execution workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityExplainabilitySemantics

`InventoryIntegrityExplainabilitySemantics` は、Governance Dashboard / Inventory Integrity UI で表示される human-readable explanation / governance explanation / operational explanation / audit explanation / reasoning explanation を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- human-readable explanation semantics
- governance explanation semantics
- operational explanation semantics
- audit explanation semantics
- reasoning explanation semantics
- explainability visibility semantics
- explainability readability semantics
- explainability limitation semantics
- explainability propagation semantics
- explainability と lineage の違い
- explainability と traceability の違い
- explainability と evidence の違い
- explainability misuse risk
- explainability consistency
- Japanese-first explainability wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / explainability boundary
- non-execution caveat

含まない意味:

- React component
- explanation engine
- LLM auto explanation
- live explanation
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

InventoryIntegrityExplainabilitySemantics は「人間がどう読めばよいか」を示す review / audit / governance explanation の補助であり、「何を実行してよいか」「原因が確定したか」「自動説明が生成されたか」を示す workflow object ではない。

## Japanese-First Explainability Wording Policy

Dashboard / UI は日本語中心 explainability 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- explanation は `explanation kind + reason + caveat` で表示する。
- explanation を truth guarantee に見せない。
- explanation を cause confirmed に見せない。
- explanation gap を correction required に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `説明(explanation): 人が理解するための補助です。正しさ保証ではありません。`
- `管理説明(governance explanation): 管理上の読み方です。実行判断ではありません。`
- `運用説明(operational explanation): 運用上の理解補助です。作業指示ではありません。`
- `監査説明(audit explanation): 監査観点の説明材料です。監査完了ではありません。`
- `説明制限(explanation limitation): 説明に制限があります。修正指示ではありません。`

避ける形式:

- `原因確定`
- `修正してください`
- `実行してください`
- `自動説明済み`
- `監査完了`
- `安全`

## Human-Readable Explanation Semantics

human-readable explanation は、現場・事務・所長・監査が短時間で意味を理解できる説明を示す。

含む観点:

- 何が見えているか。
- どの source / projection / graph に基づくか。
- どの caveat があるか。
- どの範囲で読めるか。
- 何を意味しないか。

意味:

- human-readable explanation は comprehension の補助である。
- explanation は source / evidence / lineage / traceability / confidence / freshness / completeness を人間向けに整理する。
- explanation は ambiguous term を減らし、誤読を防ぐ。

禁止解釈:

- explanation = truth guarantee
- explanation = cause confirmed
- explanation = execution instruction
- explanation = correction plan
- explanation = approval ready

human-readable explanation は人間が安全に読むための説明であり、実行指示ではない。

## Governance Explanation Semantics

governance explanation は、管理・統制・ガバナンス観点で「なぜこの表示を注意して読むのか」を説明する。

含む観点:

- governance boundary
- warning / severity / priority reason
- stale / partial / delayed caveat
- evidence / lineage / traceability limitation
- review / escalation context
- non-execution caveat

意味:

- governance explanation は management visibility と review governance の補助である。
- governance explanation は dashboard signal の safe interpretation を支える。
- governance explanation は cross-dashboard misunderstanding を抑える。

禁止解釈:

- governance explanation = approval mutation
- governance explanation = workflow decision
- governance explanation = execute now
- governance explanation = incident confirmed
- governance explanation = source verified

governance explanation は governance readability であり、execution authority ではない。

## Operational Explanation Semantics

operational explanation は、所長・事務・現場・監査が運用上どう読めばよいかを説明する。

含む観点:

- affected warehouse / location / project / part / pallet / lot
- operational priority / attention reason
- review state caveat
- stale / partial / delayed operational context
- evidence / lineage / traceability reference
- what not to execute from dashboard

意味:

- operational explanation は operational comprehension の補助である。
- operational explanation は「見落とさない方がよい」理由を説明する。
- operational explanation は operational handoff の文脈を安全に読むために使う。

禁止解釈:

- operational explanation = task assigned
- operational explanation = operation started
- operational explanation = notification sent
- operational explanation = correction required
- operational explanation = physical action instruction

operational explanation は運用上の読み方であり、作業指示ではない。

## Audit Explanation Semantics

audit explanation は、監査・棚卸・内部統制・説明責任の観点でどう説明できるかを示す。

含む観点:

- source transaction reference
- evidence reference
- lineage / traceability relation
- confidence / completeness / freshness limitation
- review / escalation history
- audit caveat

意味:

- audit explanation は audit review / explanation responsibility の補助である。
- audit explanation は evidence available / complete を audit completed と誤読させない。
- audit explanation は trace relation を causal proof と誤読させない。

禁止解釈:

- audit explanation = audit started
- audit explanation = audit completed
- audit explanation = source verified
- audit explanation = operation correct
- audit explanation = correction authority

audit explanation は監査観点の説明材料であり、audit execution ではない。

## Reasoning Explanation Semantics

reasoning explanation は、source / evidence / lineage / traceability / limitation から「どう読めるか」を説明する。

含む観点:

- derived-from relation
- explains / supports / limits relation
- evidence reason
- lineage reason
- confidence reason
- limitation reason
- graph readability caveat

意味:

- reasoning explanation は reasoning graph や projection relation の読み方を説明する。
- reasoning explanation は cause confirmed ではない。
- reasoning explanation は graph relation を execution dependency にしない。

禁止解釈:

- reasoning explanation = cause confirmed
- reasoning explanation = execution reasoning
- reasoning graph = workflow graph
- explanation chain = execution chain
- reasoning complete = safe to execute

reasoning explanation は理由づけの読み方であり、execution plan ではない。

## Explainability Visibility Semantics

explainability visibility は、説明をどの程度見えるようにするかを示す。

visibility 方針:

- explanation kind と reason / caveat を一緒に表示する。
- source / evidence / lineage / traceability / confidence / limitation を同じ context で読めるようにする。
- explanation gap は hidden state にしない。
- stale / partial / delayed explainability state は limitation として表示する。
- explanation と lineage / traceability / evidence を label で区別する。
- explanation と execution control を近接させない。

visibility が意味しないこと:

- correctness confirmation
- cause confirmation
- operation completion
- audit completion
- execution readiness

explainability visibility は governance explanation のための表示整理である。

## Explainability Readability Semantics

explainability readability は、説明を短時間で安全に読める状態である。

readability 方針:

- explanation は `kind + reason + caveat` で表示する。
- same explanation kind は same label で表示する。
- long explanation は summary / detail / limitation に分ける。
- explanation には truth guarantee ではない caveat を添える。
- explanation gap には correction required ではない caveat を添える。
- explanation と lineage / traceability / evidence を混同しない。

推奨 wording:

- `説明(explanation): 由来・根拠・制限からの読み方です。原因確定ではありません。`
- `説明制限(explanation limitation): 説明材料に不足があります。修正指示ではありません。`
- `監査説明(audit explanation): 監査観点の説明材料です。監査完了ではありません。`

explainability readability は correctness guarantee でも execution permission でもない。

## Explainability Limitation Semantics

explainability limitation は、説明の読み方に制限があることを示す。

limitation 候補:

- source coverage gap
- evidence gap
- lineage gap
- traceability gap
- confidence low / unknown
- freshness stale / delayed
- completeness partial / missing
- graph relation gap
- ambiguous transaction semantics
- `inventory_current` cache observation limitation

意味:

- limitation は review / audit / operational comprehension の caveat である。
- explainability を過信しないための guardrail である。
- explanation quality が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = explanation generation command
- limitation = safe to ignore

explainability limitation は correction / rebuild / replay / live explanation の開始条件ではない。

## Explainability Propagation Semantics

explainability propagation は、説明の意味が projection / graph / review / audit / operational view に伝わるときの読み方を示す。

propagation 方針:

- explanation relation は projection に read-only metadata として伝わる。
- explanation reason は source / evidence / lineage / traceability / limitation と紐づけて読む。
- explanation gap は confidence / warning / priority / audit escalation の理由になり得る。
- explanation complete は comprehension を補助するが、truth guarantee ではない。
- graph edge が explanation を参照しても execution dependency にはならない。
- propagation で LLM auto explanation や live explanation を開始しない。

propagation が意味しないこと:

- cause confirmed
- source verified
- correction required
- replay eligibility
- approval granted
- assignment created
- live explanation started

explainability propagation は reasoning relation の伝播であり、explanation engine 実装ではない。

## Explainability と Lineage の違い

explainability と lineage は同じではない。

- explainability: 人間へどう説明して読めるか。
- lineage: どの source / projection / reasoning relation から導かれたか。

違い:

- lineage は derived relation / origin を示す。
- explainability は relation を人が理解できる説明へ変換する。
- lineage complete でも explanation が十分とは限らない。
- explanation があることは lineage complete を意味しない。

混同してはいけない解釈:

- lineage complete = explanation complete
- explanation available = lineage proof
- lineage gap = explanation impossible
- explanation = derived-from causal proof

## Explainability と Traceability の違い

explainability と traceability は同じではない。

- explainability: 人間へどう説明して読めるか。
- traceability: どこから来た情報か、どう追跡できるか。

違い:

- traceability は path / chain / relation を追う。
- explainability はその path を人間が理解できる説明として読む。
- traceability complete でも explanation が分かりやすいとは限らない。
- explanation があることは traceability complete を意味しない。

混同してはいけない解釈:

- traceability complete = explanation sufficient
- explanation available = causal proof
- trace gap = explanation command required
- explanation chain = execution chain

## Explainability と Evidence の違い

explainability と evidence は同じではない。

- explainability: 人間へどう説明して読めるか。
- evidence: 何を根拠として読めるか。

違い:

- evidence は explanation material を示す。
- explainability は evidence / lineage / traceability / limitation を人間向けに説明する。
- evidence available でも explanation が十分とは限らない。
- explanation available でも evidence が truth guarantee になるわけではない。

混同してはいけない解釈:

- evidence available = explanation complete
- explanation available = evidence proof
- evidence missing = explanation impossible
- explanation = operation correct

## Explainability Misuse Risk

explainability misuse risk は、説明表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- explanation を correctness guarantee と読む。
- explanation を cause confirmed と読む。
- explanation available を operation correct と読む。
- governance explanation を workflow decision と読む。
- operational explanation を task assigned と読む。
- audit explanation を audit completed と読む。
- reasoning explanation を execution plan と読む。
- explanation propagation を execution dependency と読む。
- explanation と lineage / traceability / evidence を同一視する。
- explainability metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく explainability governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- explainability misuse risk から execution affordance を出さない。
- explainability は execution remediation を提供しない。

## Explainability Consistency

explainability consistency は、human-readable / governance / operational / audit / reasoning explanation、readability、limitation、propagation が Dashboard / UI / governance explanation / operational explanation / audit explanation / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- explanation kind の意味が一貫しているか。
- explanation が truth guarantee に見えていないか。
- explanation reason が cause confirmed に見えていないか。
- explanation limitation が correction / rebuild / replay trigger に見えていないか。
- explanation propagation が execution dependency に見えていないか。
- explainability と lineage / traceability / evidence の違いが説明されているか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

explainability consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- explanation engine availability
- execution permission
- workflow priority
- LLM auto explanation

## Raw Source / Adapter / Projection / Graph / Explainability Boundary

raw source / adapter / projection / graph / explainability は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> explainability semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / traceability / confidence / freshness / completeness / explainability / attention / review / escalation / state / severity / priority を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: source node / evidence node / lineage edge / explanation relation を含む read-only reasoning graph。execution graph ではない。
- explainability semantics: human-readable / governance / operational / audit / reasoning explanation の意味境界と読み方を揃える read-only review。explanation engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-07 は inventory integrity explainability semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- explanation engine 実装
- LLM auto explanation 実装
- live explanation 実装
- execution workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

explainability semantics は execution authority ではない。explainability semantics は reasoning / review / comprehension のために、human-readable / governance / operational / audit / reasoning explanation、visibility、readability、limitation、propagation、lineage との違い、traceability との違い、evidence との違い、misuse risk、consistency、Japanese-first explainability wording、raw source boundary を説明する conceptual review である。
