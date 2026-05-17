# Inventory Integrity Governance-Review Semantics

Phase B36-10 inventory integrity governance-review semantics review.

この文書は、Governance Dashboard / Inventory Integrity における governance-review semantics を整理し、「人間がどう governance review を行うか」の意味・境界・読み方を横断で統一するための governance-review semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、governance-review engine 実装、auto-review、execution orchestration、execution workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- governance-review semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- governance-review metadata は truth guarantee ではない。
- stale / partial / delayed governance-review state を前提にする。
- Dashboard / UI は日本語中心 governance-review 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- governance-review semantics を execution workflow と混同しない。
- governance-review semantics は execution authority を持たない。
- governance-review semantics は rebuild、compare execution、replay、correction、governance-review engine、auto-review、execution orchestration、execution workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityGovernanceReviewSemantics

`InventoryIntegrityGovernanceReviewSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される governance review / audit review / operational review / escalation review / integrity review を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- governance review semantics
- audit review semantics
- operational review semantics
- escalation review semantics
- integrity review semantics
- governance-review visibility semantics
- governance-review readability semantics
- governance-review limitation semantics
- governance-review propagation semantics
- governance-review と operational-decision の違い
- governance-review と interpretation-risk の違い
- governance-review と priority の違い
- governance-review misuse risk
- governance-review consistency
- Japanese-first governance-review wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / governance-review boundary
- non-execution caveat

含まない意味:

- React component
- governance-review engine
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

InventoryIntegrityGovernanceReviewSemantics は「人間がどの governance review 観点で確認すべきか」を示す review / audit / operational comprehension の補助であり、「何を実行してよいか」「review が完了したか」「自動 review されたか」を示す workflow object ではない。

## Japanese-First Governance-Review Wording Policy

Dashboard / UI は日本語中心 governance-review 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- governance-review は `review kind + reason + caveat` で表示する。
- review を command に見せない。
- review candidate を workflow state に見せない。
- review complete を truth guarantee に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `ガバナンス確認(governance review): 管理上の確認観点です。実行指示ではありません。`
- `監査確認(audit review): 監査観点で読む候補です。監査開始ではありません。`
- `運用確認(operational review): 運用上の確認観点です。作業開始ではありません。`
- `エスカレーション確認(escalation review): 管理者・監査側が注意して読む候補です。通知済みではありません。`
- `整合性確認(integrity review): 整合性を確認する観点です。正しさ保証ではありません。`

避ける形式:

- `実行してください`
- `確認完了`
- `監査開始`
- `自動レビュー済み`
- `修正してください`
- `承認済み`

## Governance Review Semantics

governance review は、inventory integrity information を管理・統制・説明責任の観点で確認する review semantics である。

review 対象:

- governance boundary caveat
- compare / snapshot / projection limitation
- evidence / lineage / traceability visibility
- interpretation-risk
- operational-decision candidate
- priority / warning / escalation reason
- stale / partial / delayed caveat

意味:

- governance review は management visibility と governance explanation の補助である。
- governance review は signal を safe interpretation の範囲で読むための観点である。
- governance review は execution / mutation / approval と分離して読む。

禁止解釈:

- governance review = approval mutation
- governance review = workflow started
- governance review = correction required
- governance review = source truth confirmed
- governance review = governance-review engine result

governance review は管理上の確認観点であり、execution authority ではない。

## Audit Review Semantics

audit review は、監査・棚卸・内部統制・説明責任の観点で integrity information を確認する review semantics である。

review 対象:

- audit evidence
- traceability / lineage gap
- confidence / completeness / freshness limitation
- unresolved review state
- repeated warning / escalation signal
- audit decision candidate
- governance boundary caveat

意味:

- audit review は audit explanation と evidence readability の補助である。
- audit review は audit trail を人間が確認する観点である。
- audit review は truth guarantee や audit completion ではない。

禁止解釈:

- audit review = audit started
- audit review = audit completed
- audit review = audit assignment created
- audit review = source of truth verified
- audit review = correction authority

audit review は監査観点の確認であり、audit execution ではない。

## Operational Review Semantics

operational review は、所長・事務・現場・監査が運用上どう確認すべきかを読むための review semantics である。

review 対象:

- affected warehouse / location / project
- affected part / pallet / lot
- operational decision candidate
- manual verification decision candidate
- hold decision candidate
- operational priority / attention reason
- stale / partial / delayed operational context

意味:

- operational review は operational comprehension の補助である。
- operational review は現場・事務・所長・監査が同じ意味で読める確認観点である。
- operational review は operational workflow state ではない。

禁止解釈:

- operational review = operation started
- operational review = task assigned
- operational review = notification sent
- operational review = physical work instruction
- operational review = incident confirmed

operational review は運用上の確認観点であり、作業開始ではない。

## Escalation Review Semantics

escalation review は、manager / audit / governance side が注意して読むべきかを整理する review semantics である。

review 対象:

- escalation required signal
- manager-review / audit-review visibility
- critical / high warning
- unresolved high impact mismatch
- repeated stale / partial / delayed caveat
- interpretation-risk high
- governance boundary limitation

意味:

- escalation review は attention / visibility を上げる確認観点である。
- escalation review は management / audit readability の補助である。
- escalation review は escalation execution ではない。

禁止解釈:

- escalation review = notification sent
- escalation review = manager assigned
- escalation review = audit workflow started
- escalation review = execute now
- escalation review = incident confirmed

escalation review はエスカレーション観点の確認であり、通知・割当・workflow 開始ではない。

## Integrity Review Semantics

integrity review は、`inventory_transactions` を truth とし、projection / compare / cache observation / evidence / lineage / traceability の整合性を確認する review semantics である。

review 対象:

- source transaction coverage
- signed quantity semantics
- snapshot / compare consistency
- `inventory_current` cache observation
- evidence / confidence / freshness / completeness caveat
- lineage / traceability relation
- unresolved mismatch / stale compare

意味:

- integrity review は inventory integrity reasoning の確認観点である。
- integrity review は `inventory_current` を source of truth にしない。
- integrity review は compare mismatch や match を truth guarantee にしない。

禁止解釈:

- integrity review = source corrected
- integrity review = `inventory_current` truth confirmed
- integrity review = compare execution completed
- integrity review = rebuild required
- integrity review = correction authority

integrity review は整合性を読む観点であり、rebuild / correction / compare execution の開始ではない。

## Governance-Review Visibility Semantics

governance-review visibility は、人間が review 観点をどの程度見えるようにするかを示す。

visibility 方針:

- review kind と reason / caveat を一緒に表示する。
- governance / audit / operational / escalation / integrity review の違いを見えるようにする。
- review candidate と workflow state を label で分ける。
- stale / partial / delayed governance-review state は limitation として表示する。
- review gap は hidden state にしない。
- review signal と execution control を近接させない。

visibility が意味しないこと:

- review completed
- audit started
- operation started
- task assigned
- approval granted
- execution readiness

governance-review visibility は review 観点の表示整理であり、execution authority ではない。

## Governance-Review Readability Semantics

governance-review readability は、人間が review 観点を短時間で安全に読める状態である。

readability 方針:

- review は `kind + reason + caveat` で表示する。
- same review kind は same label で表示する。
- review と operational-decision / interpretation-risk / priority を label で区別する。
- review reason と limitation を分ける。
- review candidate には `実行指示ではありません` の caveat を添える。
- audit / escalation / integrity review は特に execution に見えない wording にする。

推奨 wording:

- `ガバナンス確認: 管理上の確認観点です。承認や実行ではありません。`
- `監査確認: 監査観点で読む候補です。監査開始ではありません。`
- `整合性確認: source / projection / compare の読み方です。正しさ保証ではありません。`

governance-review readability は comprehension を補助する。作業開始や自動 review を促す表示ではない。

## Governance-Review Limitation Semantics

governance-review limitation は、review 観点の読み方に制限があることを示す。

limitation 候補:

- source coverage gap
- evidence gap
- lineage / traceability gap
- confidence low / unknown
- freshness stale / delayed
- completeness partial / missing
- interpretation-risk high
- operational-decision caveat
- priority / warning reason ambiguity
- `inventory_current` cache observation limitation

意味:

- limitation は governance review / audit review / operational review の caveat である。
- limitation は review 観点を過信しないための guardrail である。
- limitation は review quality が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = governance-review engine command
- limitation = safe to ignore

governance-review limitation は correction / rebuild / replay / auto-review の開始条件ではない。

## Governance-Review Propagation Semantics

governance-review propagation は、review 観点の意味が projection / graph / audit / operational view に伝わるときの読み方を示す。

propagation 方針:

- review signal は projection に read-only metadata として伝わる。
- review reason は operational-decision / interpretation-risk / priority / warning / evidence / confidence / limitation と紐づけて読む。
- review gap は readability / governance explanation / audit explanation の理由になり得る。
- review high は correction required ではない。
- graph edge が review signal を参照しても execution dependency にはならない。
- propagation で governance-review engine や execution orchestration を開始しない。

propagation が意味しないこと:

- review completed
- source error confirmed
- correction required
- replay eligibility
- approval granted
- assignment created
- execution orchestration started

governance-review propagation は review 観点の伝播であり、execution workflow ではない。

## Governance-Review と Operational-Decision の違い

governance-review と operational-decision は同じではない。

- governance-review: 人間がどの review 観点で確認するか。
- operational-decision: 人間がどの運用判断候補として読むか。

違い:

- governance-review は review / audit / operational / escalation / integrity の確認観点を整理する。
- operational-decision は review decision / audit decision / manual verification / hold などの判断候補を整理する。
- governance-review があることは operational-decision confirmed を意味しない。
- operational-decision candidate があることは governance review completed を意味しない。

混同してはいけない解釈:

- governance review = decision confirmed
- operational decision = governance approval
- hold decision = governance review completed
- review propagation = workflow handoff

## Governance-Review と Interpretation-Risk の違い

governance-review と interpretation-risk は同じではない。

- governance-review: 人間がどの review 観点で確認するか。
- interpretation-risk: 表示がどう誤読され得るか。

違い:

- governance-review は確認観点を整理する。
- interpretation-risk は review signal や label が誤読される可能性を扱う。
- interpretation-risk high は governance-review required を意味しない。
- governance-review candidate は誤読発生を意味しない。

混同してはいけない解釈:

- interpretation-risk high = governance review required
- governance review = misinterpretation confirmed
- risk mitigation = review execution
- interpretation-risk propagation = review workflow

## Governance-Review と Priority の違い

governance-review と priority は同じではない。

- governance-review: どの review 観点で確認するか。
- priority: 何を先に確認するとよい可能性があるか。

違い:

- priority は読み順や確認順の参考である。
- governance-review は governance / audit / operational / escalation / integrity の確認観点である。
- high priority は governance review completion を意味しない。
- governance-review candidate は execution ordering ではない。

混同してはいけない解釈:

- priority high = execute first
- priority high = review completed
- audit priority = audit review started
- governance review = execution order

## Governance-Review Misuse Risk

governance-review misuse risk は、governance-review 表示そのものが本来と異なる意味で読まれる risk である。

誤用しやすい例:

- governance review を approval と読む。
- audit review を audit started と読む。
- operational review を task assigned と読む。
- escalation review を notification sent と読む。
- integrity review を source truth confirmed と読む。
- review complete を truth guarantee と読む。
- review high を correction required と読む。
- governance-review metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく dashboard governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- governance-review misuse risk から execution affordance を出さない。
- governance-review は execution remediation を提供しない。

## Governance-Review Consistency

governance-review consistency は、governance review、audit review、operational review、escalation review、integrity review、visibility、readability、limitation、propagation が Dashboard / UI / governance review / audit review / operational review / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- review kind の意味が一貫しているか。
- review candidate が execution command に見えていないか。
- audit review が audit started に見えていないか。
- escalation review が notification sent に見えていないか。
- integrity review が truth guarantee に見えていないか。
- operational-decision / interpretation-risk / priority との違いが説明されているか。
- stale / partial / delayed caveat が読めるか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

governance-review consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- governance-review engine availability
- auto-review
- execution permission
- workflow priority

## Raw Source / Adapter / Projection / Graph / Governance-Review Boundary

raw source / adapter / projection / graph / governance-review は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> governance-review semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: governance-review / operational-decision / interpretation-risk / priority / warning / confidence / evidence / lineage / traceability / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: source node / evidence node / review relation / interpretation-risk relation / operational-decision relation / governance-review relation を含む read-only reasoning graph。execution graph ではない。
- governance-review semantics: governance / audit / operational / escalation / integrity review の確認観点の意味境界と読み方を揃える read-only review。governance-review engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-10 は inventory integrity governance-review semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- governance-review engine 実装
- auto-review 実装
- execution orchestration 実装
- execution workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

governance-review semantics は execution authority ではない。governance-review semantics は reasoning / review / comprehension のために、governance review、audit review、operational review、escalation review、integrity review、visibility、readability、limitation、propagation、operational-decision との違い、interpretation-risk との違い、priority との違い、misuse risk、consistency、Japanese-first governance-review wording、raw source boundary を説明する conceptual review である。
