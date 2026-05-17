# Inventory Integrity Operational-Decision Semantics Review

Phase B36-09 inventory integrity operational-decision semantics review.

この文書は、Governance Dashboard / Inventory Integrity における operational-decision semantics を整理し、「人間がどう運用判断するか」の意味・境界・読み方を横断で統一するための operational-decision semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、decision engine 実装、auto-decision、execution orchestration、execution workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- operational-decision semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- operational-decision metadata は truth guarantee ではない。
- stale / partial / delayed operational-decision state を前提にする。
- Dashboard / UI は日本語中心 operational-decision 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- operational-decision semantics を execution workflow と混同しない。
- operational-decision semantics は execution authority を持たない。
- operational-decision semantics は rebuild、compare execution、replay、correction、decision engine、auto-decision、execution orchestration、execution workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityOperationalDecisionSemantics

`InventoryIntegrityOperationalDecisionSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される review decision / audit decision / attention decision / manual verification decision / hold decision を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- review decision semantics
- audit decision semantics
- attention decision semantics
- manual verification decision semantics
- hold decision semantics
- operational-decision visibility semantics
- operational-decision readability semantics
- operational-decision limitation semantics
- operational-decision propagation semantics
- operational-decision と interpretation-risk の違い
- operational-decision と priority の違い
- operational-decision と warning の違い
- operational-decision misuse risk
- operational-decision consistency
- Japanese-first operational-decision wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / operational-decision boundary
- non-execution caveat

含まない意味:

- React component
- decision engine
- auto-decision
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

InventoryIntegrityOperationalDecisionSemantics は「人間がどのような運用判断候補として読めるか」を示す review / audit / governance explanation の補助であり、「何を実行してよいか」「判断が確定したか」「自動判断されたか」を示す workflow object ではない。

## Japanese-First Operational-Decision Wording Policy

Dashboard / UI は日本語中心 operational-decision 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- operational-decision は `decision kind + reason + caveat` で表示する。
- decision を command に見せない。
- decision candidate を workflow state に見せない。
- hold decision を shipment hold / operation hold の実行に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `確認判断(review decision): 人が確認する判断候補です。実行指示ではありません。`
- `監査判断(audit decision): 監査観点で確認する候補です。監査開始ではありません。`
- `注意判断(attention decision): 注意して読む候補です。自動割当ではありません。`
- `手動確認判断(manual verification decision): 手動確認を検討する候補です。作業開始ではありません。`
- `保留判断(hold decision): 保留を検討する候補です。出荷停止や作業停止の実行ではありません。`

避ける形式:

- `実行してください`
- `保留しました`
- `作業停止`
- `自動判断済み`
- `対応必須`
- `承認済み`

## Review Decision Semantics

review decision は、人間が差異・制限・根拠を確認するかどうかを読むための判断候補である。

判断材料:

- compare mismatch
- stale / partial / delayed caveat
- evidence gap
- lineage / traceability limitation
- interpretation-risk
- warning / priority / confidence reason
- unresolved review state

意味:

- review decision は human review の候補である。
- review decision は operational comprehension の補助である。
- review decision は reason / caveat / limitation と一緒に読む。

禁止解釈:

- review decision = assignment created
- review decision = workflow started
- review decision = correction required
- review decision = approval pending
- review decision = source truth confirmed

review decision は確認判断の候補であり、execution workflow ではない。

## Audit Decision Semantics

audit decision は、監査・棚卸・内部統制・説明責任の観点で確認すべきかを読むための判断候補である。

判断材料:

- evidence limitation
- traceability gap
- lineage gap
- stale audit context
- repeated unresolved review
- high interpretation-risk
- audit priority
- governance boundary caveat

意味:

- audit decision は audit review の候補である。
- audit decision は audit explanation / governance explanation の補助である。
- audit decision は audit evidence と limitation を一緒に読む。

禁止解釈:

- audit decision = audit started
- audit decision = audit completed
- audit decision = audit assignment created
- audit decision = approval mutation
- audit decision = source of truth verified

audit decision は監査観点の判断候補であり、audit execution ではない。

## Attention Decision Semantics

attention decision は、見落としや誤読を防ぐために注意して読むかどうかを示す判断候補である。

判断材料:

- high / critical warning
- operational priority
- low / unknown confidence
- stale / partial / delayed state
- negative quantity related mismatch
- cross-warehouse / cross-location relation
- interpretation-risk warning

意味:

- attention decision は human attention の候補である。
- attention decision は warning / priority / confidence を総合して読む。
- attention decision は operational review の読み順や見落とし防止を補助する。

禁止解釈:

- attention decision = execute now
- attention decision = task assigned
- attention decision = notification sent
- attention decision = correction required
- attention decision = incident confirmed

attention decision は注意して読む候補であり、action instruction ではない。

## Manual Verification Decision Semantics

manual verification decision は、Dashboard 上の情報だけでは判断しきれない場合に、人間が手動確認を検討するための判断候補である。

判断材料:

- evidence missing / partial
- traceability gap
- lineage limitation
- confidence low / unknown
- compare mismatch with stale snapshot
- ambiguous transaction semantics
- operational interpretation-risk
- affected part / pallet / location context

意味:

- manual verification decision は手動確認の検討候補である。
- manual verification decision は現場確認や事務確認の必要性を確定しない。
- manual verification decision は reason / scope / caveat を読めるようにする。

禁止解釈:

- manual verification decision = worker dispatched
- manual verification decision = task created
- manual verification decision = physical count started
- manual verification decision = source error confirmed
- manual verification decision = correction command

manual verification decision は手動確認の判断候補であり、手動作業の開始ではない。

## Hold Decision Semantics

hold decision は、運用上の保留を検討するかどうかを読むための判断候補である。

判断材料:

- critical review caveat
- unresolved mismatch with high operational impact
- low confidence with high warning
- stale / partial / delayed data that affects comprehension
- audit / manager visibility requirement
- interpretation-risk that could cause unsafe action
- governance boundary limitation

意味:

- hold decision は保留を検討する候補である。
- hold decision は shipment hold / operation hold / system hold を実行しない。
- hold decision は manager / audit / operational review の visibility を補助する。

禁止解釈:

- hold decision = shipment stopped
- hold decision = operation stopped
- hold decision = inventory locked
- hold decision = workflow hold executed
- hold decision = approval denied

hold decision は保留判断の候補であり、保留実行ではない。

## Operational-Decision Visibility Semantics

operational-decision visibility は、人間が判断候補をどの程度見えるようにするかを示す。

visibility 方針:

- decision kind と reason / caveat を一緒に表示する。
- decision candidate と execution state を label で分ける。
- review / audit / attention / manual verification / hold の違いを見えるようにする。
- stale / partial / delayed operational-decision state は limitation として表示する。
- decision gap は hidden state にしない。
- decision candidate と execution control を近接させない。

visibility が意味しないこと:

- decision confirmed
- operation started
- task assigned
- hold executed
- audit started
- execution readiness

operational-decision visibility は判断候補の表示整理であり、execution authority ではない。

## Operational-Decision Readability Semantics

operational-decision readability は、人間が判断候補を短時間で安全に読める状態である。

readability 方針:

- decision は `kind + reason + caveat` で表示する。
- same decision kind は same label で表示する。
- decision と priority / warning / interpretation-risk を label で区別する。
- decision reason と limitation を分ける。
- decision candidate には `実行指示ではありません` の caveat を添える。
- hold / manual verification は特に execution に見えない wording にする。

推奨 wording:

- `確認判断: 人が確認する候補です。作業割当ではありません。`
- `手動確認判断: 手動確認を検討する候補です。現場作業開始ではありません。`
- `保留判断: 保留を検討する候補です。保留実行ではありません。`

operational-decision readability は comprehension を補助する。作業開始や自動判断を促す表示ではない。

## Operational-Decision Limitation Semantics

operational-decision limitation は、判断候補の読み方に制限があることを示す。

limitation 候補:

- source coverage gap
- evidence gap
- lineage / traceability gap
- confidence low / unknown
- freshness stale / delayed
- completeness partial / missing
- warning reason ambiguity
- priority reason ambiguity
- interpretation-risk high
- `inventory_current` cache observation limitation

意味:

- limitation は operational review / audit review / governance explanation の caveat である。
- limitation は判断候補を過信しないための guardrail である。
- limitation は decision quality が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = decision engine command
- limitation = safe to ignore

operational-decision limitation は correction / rebuild / replay / auto-decision の開始条件ではない。

## Operational-Decision Propagation Semantics

operational-decision propagation は、判断候補の意味が projection / graph / review / audit / operational view に伝わるときの読み方を示す。

propagation 方針:

- decision candidate は projection に read-only metadata として伝わる。
- decision reason は priority / warning / interpretation-risk / evidence / confidence / limitation と紐づけて読む。
- decision gap は readability / governance explanation / audit explanation の理由になり得る。
- decision high は correction required ではない。
- graph edge が decision candidate を参照しても execution dependency にはならない。
- propagation で decision engine や execution orchestration を開始しない。

propagation が意味しないこと:

- operation started
- source error confirmed
- correction required
- replay eligibility
- approval granted
- assignment created
- execution orchestration started

operational-decision propagation は判断候補の伝播であり、execution workflow ではない。

## Operational-Decision と Interpretation-Risk の違い

operational-decision と interpretation-risk は同じではない。

- operational-decision: 人間がどの運用判断候補として読むか。
- interpretation-risk: 表示がどう誤読され得るか。

違い:

- operational-decision は review / audit / manual verification / hold の判断候補を整理する。
- interpretation-risk はその判断候補や signal が誤読される可能性を扱う。
- interpretation-risk high は operational-decision required を意味しない。
- operational-decision candidate があることは誤読が発生したことを意味しない。

混同してはいけない解釈:

- interpretation-risk high = decision required
- decision candidate = misinterpretation confirmed
- mitigation = operational decision
- interpretation-risk propagation = workflow handoff

## Operational-Decision と Priority の違い

operational-decision と priority は同じではない。

- operational-decision: どの判断候補として読むか。
- priority: 何を先に確認するとよい可能性があるか。

違い:

- priority は読み順や確認順の参考である。
- operational-decision は review / audit / attention / manual verification / hold の判断候補である。
- high priority は hold decision を意味しない。
- operational-decision candidate は execution ordering ではない。

混同してはいけない解釈:

- priority high = execute first
- priority high = decision confirmed
- hold decision = highest priority
- operational decision = execution order

## Operational-Decision と Warning の違い

operational-decision と warning は同じではない。

- operational-decision: 人間がどの判断候補として読むか。
- warning: 確認制限・注意強度・review / audit attention を示す signal。

違い:

- warning は注意強度や確認制限を示す。
- operational-decision は warning を含む複数材料から判断候補として読む。
- critical warning は hold decision confirmed ではない。
- hold decision candidate は warning engine の出力ではない。

混同してはいけない解釈:

- warning = operational decision
- critical = hold executed
- warning visible = manual verification required
- operational decision = auto-warning

## Operational-Decision Misuse Risk

operational-decision misuse risk は、operational-decision 表示そのものが本来と異なる意味で読まれる risk である。

誤用しやすい例:

- decision candidate を execution command と読む。
- review decision を assignment created と読む。
- audit decision を audit started と読む。
- attention decision を notification sent と読む。
- manual verification decision を現場作業開始と読む。
- hold decision を出荷停止 / 作業停止済みと読む。
- decision high を correction required と読む。
- operational-decision metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく dashboard governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- operational-decision misuse risk から execution affordance を出さない。
- operational-decision は execution remediation を提供しない。

## Operational-Decision Consistency

operational-decision consistency は、review decision、audit decision、attention decision、manual verification decision、hold decision、visibility、readability、limitation、propagation が Dashboard / UI / operational review / audit review / governance explanation / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- decision kind の意味が一貫しているか。
- decision candidate が execution command に見えていないか。
- hold decision が hold executed に見えていないか。
- manual verification decision が worker dispatched に見えていないか。
- priority / warning / interpretation-risk との違いが説明されているか。
- stale / partial / delayed caveat が読めるか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

operational-decision consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- decision engine availability
- auto-decision
- execution permission
- workflow priority

## Raw Source / Adapter / Projection / Graph / Operational-Decision Boundary

raw source / adapter / projection / graph / operational-decision は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> operational-decision semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: priority / warning / interpretation-risk / confidence / evidence / lineage / traceability / review / escalation / operational-decision を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: source node / evidence node / warning relation / priority relation / interpretation-risk relation / operational-decision relation を含む read-only reasoning graph。execution graph ではない。
- operational-decision semantics: review / audit / attention / manual verification / hold の判断候補の意味境界と読み方を揃える read-only review。decision engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-09 は inventory integrity operational-decision semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- decision engine 実装
- auto-decision 実装
- execution orchestration 実装
- execution workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

operational-decision semantics は execution authority ではない。operational-decision semantics は reasoning / review / comprehension のために、review decision、audit decision、attention decision、manual verification decision、hold decision、visibility、readability、limitation、propagation、interpretation-risk との違い、priority との違い、warning との違い、misuse risk、consistency、Japanese-first operational-decision wording、raw source boundary を説明する conceptual review である。
