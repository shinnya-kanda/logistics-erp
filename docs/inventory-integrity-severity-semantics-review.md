# Inventory Integrity Severity Semantics Review

Phase B35-05 inventory integrity severity semantics review.

この文書は、Governance Dashboard / Inventory Integrity における severity semantics を整理し、重大度(severity)の意味・優先度・表示境界を横断で統一するための severity semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、severity engine 実装、execution workflow、auto-priority、auto-severity、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- severity semantics は reasoning / review / comprehension / governance prioritization のための read-only semantics である。
- severity metadata は truth guarantee ではない。
- stale / partial / delayed severity state を前提にする。
- Dashboard / UI は日本語中心 severity 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- severity semantics を execution workflow と混同しない。
- severity semantics は execution authority を持たない。
- severity semantics は rebuild、compare execution、replay、correction、severity engine、execution workflow、auto-priority、auto-severity、auto-fix、mutation を開始しない。

## Concept: InventoryIntegritySeveritySemantics

`InventoryIntegritySeveritySemantics` は、Governance Dashboard / Inventory Integrity UI で表示される informational / low / medium / high / critical などの重大度を、同じ意味・同じ優先度境界・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- informational semantics
- low semantics
- medium semantics
- high semantics
- critical semantics
- severity visibility semantics
- severity readability semantics
- severity priority semantics
- severity と warning の違い
- severity と state の違い
- review priority semantics
- audit priority semantics
- operational priority semantics
- severity misuse risk
- severity limitation
- severity consistency
- Japanese-first severity wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / severity boundary
- non-execution caveat

含まない意味:

- React component
- severity engine
- automatic priority calculation
- automatic severity assignment
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

InventoryIntegritySeveritySemantics は「どれだけ注意して読むべきか」を示す review / audit / operational priority の補助であり、「何を実行するか」「どの処理を先に行うか」を示す workflow object ではない。

## Japanese-First Severity Wording Policy

Dashboard / UI は日本語中心 severity 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- severity は `level + reason + caveat` で表示する。
- 重大度を action instruction に見せない。
- high / critical には `実行指示ではありません` の caveat を添える。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `参考(informational): 確認補助です。正しさ保証ではありません。`
- `低(low): 通常確認で読める候補です。安全保証ではありません。`
- `中(medium): 注意して確認する候補です。実行指示ではありません。`
- `高(high): 優先確認の候補です。自動割当ではありません。`
- `重大(critical): 強い注意表示です。緊急実行指示ではありません。`

避ける形式:

- `今すぐ対応`
- `最優先で実行`
- `異常確定`
- `修正必須`
- `自動エスカレーション済み`
- `安全`

## Informational Semantics

informational は、通常の説明・参照・補足として読める最も低い重大度である。

推奨表現:

- `参考(informational)`
- `参考表示`
- `確認補助`
- `通常説明`

意味:

- review / audit / operational comprehension の補足である。
- source / projection / state / warning の読み方を助ける。
- urgent attention や優先確認を意味しない。

禁止解釈:

- correctness guarantee
- safe guarantee
- no issue
- source of truth confirmation
- execution permission

informational は参考表示であり、正しさ保証でも安全保証でもない。

## Low Semantics

low は、通常確認の範囲で読める低い重大度を示す。

推奨表現:

- `低(low)`
- `低い注意`
- `通常確認`
- `軽い確認候補`

意味:

- 見落とさない方がよいが、強い優先確認までは示さない。
- limitation / caveat が軽い、または impact が限定的に見える。
- review backlog や audit note の補助として読める。

禁止解釈:

- safe to ignore
- issue absent
- no audit relevance
- correction unnecessary guaranteed
- source complete

low は低い注意優先度であり、安全保証ではない。

## Medium Semantics

medium は、通常より注意して確認する候補を示す中程度の重大度である。

推奨表現:

- `中(medium)`
- `注意確認`
- `確認優先の候補`
- `中程度の注意`

意味:

- difference / stale / partial / evidence gap / lineage gap などを注意して読む候補である。
- review / operational / audit context で reason を確認する価値がある。
- high / critical ほど強い visibility ではない。

禁止解釈:

- assignment created
- action required
- correction required
- incident confirmed
- workflow started

medium は注意して読む優先度であり、実行指示ではない。

## High Semantics

high は、優先的に確認した方がよい可能性が高い重大度を示す。

推奨表現:

- `高(high)`
- `優先確認`
- `高い注意`
- `管理上の確認候補`

意味:

- 数量差異、freshness gap、evidence gap、lineage gap、cross-location relation などが強めに見える。
- manager / office / audit が見落とさない方がよい候補である。
- review priority / audit priority / operational priority の visibility を上げる。

禁止解釈:

- execute first
- automatic assignment
- notification sent
- correction required
- source error confirmed
- approval required

high は human review priority であり、execution priority ではない。

## Critical Semantics

critical は、強い注意表示が必要な最上位の重大度を示す。ただし execution trigger ではない。

推奨表現:

- `重大(critical)`
- `強い注意`
- `最優先確認の候補`
- `監査・管理上の強い確認候補`

意味:

- negative quantity related mismatch、large difference、cross-warehouse boundary、audit risk、low confidence with high impact などを強く見落とさないようにする。
- manager / audit / operational review で優先的に読む候補である。
- governance prioritization のために visibility を最大化する。

禁止解釈:

- emergency operation
- execute now
- automatic escalation
- incident confirmed
- rebuild required
- correction required
- audit started

critical は強い human attention priority であり、緊急実行や自動対応ではない。

## Severity Visibility Semantics

severity visibility は、重大度をどの程度目立たせるかを示す。

visibility 方針:

- severity level と reason を一緒に表示する。
- high / critical は caveat と一緒に表示する。
- stale / partial / delayed severity state は limitation として見えるようにする。
- color だけで severity を伝えない。
- severity と warning / state / escalation を label で区別する。
- severity と execution control を近接させない。

visibility が意味しないこと:

- action priority
- workflow priority
- mutation permission
- incident confirmation
- execution readiness

severity visibility は governance prioritization のための表示整理である。

## Severity Readability Semantics

severity readability は、重大度を短時間で安全に読める状態である。

readability 方針:

- severity は `level + reason + caveat` で表示する。
- same level は same label で表示する。
- severity level と warning label を混同しない。
- severity level と state label を混同しない。
- high / critical は action wording を避ける。
- informational / low は safe guarantee に見えないようにする。
- reason / scope / limitation を分ける。

推奨 wording:

- `高(high): 差異量が大きく見えるため優先確認の候補です。実行指示ではありません。`
- `重大(critical): 監査・管理上の強い注意候補です。自動エスカレーションではありません。`
- `低(low): 通常確認で読める候補です。安全保証ではありません。`

severity readability は correctness guarantee でも execution permission でもない。

## Severity Priority Semantics

severity priority は、review / audit / operational context でどれを先に読むべきかの参考優先度である。

基本方針:

- priority は human review order の参考であり、execution order ではない。
- priority は assignment / notification / approval を生成しない。
- priority は source error confirmation ではない。
- priority は stale / partial / delayed context によって変わり得る。
- priority は evidence / lineage / confidence / freshness / impact と一緒に読む。

priority が意味しないこと:

- execute first
- fix first
- rebuild first
- workflow queue
- SLA guarantee

severity priority は governance prioritization の参考であり、auto-priority 実装ではない。

## Severity と Warning の違い

severity と warning は近いが同じではない。

- severity: 重大度。どれだけ強く注意して読むべきかの priority signal。
- warning: 警告表示。誤読 risk、確認制限、attention を目立たせる display signal。

違い:

- severity は priority level を示す。
- warning は reading limitation / attention display を示す。
- high severity は必ずしも warning text を意味しない。
- warning があっても severity が high / critical とは限らない。
- critical warning でも execution trigger ではない。

混同してはいけない解釈:

- warning = severity confirmed
- severity high = warning engine executed
- warning visible = incident confirmed
- severity critical = execute now

## Severity と State の違い

severity と state は同じではない。

- severity: 重大度や確認優先度を示す。
- state: ready / stale / partial / degraded / reviewing / escalated / resolved / ignored など、表示上の状態を示す。

違い:

- severity は priority を読む。
- state は condition / review context / limitation を読む。
- stale state は severity level そのものではない。
- resolved state は severity zero ではない。
- ignored state は severity absence ではない。
- escalated state は severity high と関連し得るが、同義ではない。

混同してはいけない解釈:

- state resolved = severity safe
- state ignored = no severity
- state stale = high severity required
- severity critical = state transition required

## Review Priority Semantics

review priority は、人による確認の読み順を考えるための severity semantics である。

確認観点:

- difference quantity / value impact
- stale / partial / delayed caveat
- evidence gap
- lineage gap
- compare confidence
- unresolved / reviewing state
- high / critical warning
- operational impact

review priority が意味しないこと:

- assignment created
- workflow started
- reviewer decided
- correction required
- approval pending

review priority は人が確認しやすくするための read-only signal である。

## Audit Priority Semantics

audit priority は、監査・棚卸・内部統制・説明責任の観点でどれを優先して確認するかを読むための severity semantics である。

確認観点:

- audit evidence gap
- traceability gap
- lineage gap
- confidence low / unknown
- stale / partial / delayed audit state
- cross-warehouse / cross-location impact
- negative quantity related mismatch
- repeated unresolved review

audit priority が意味しないこと:

- audit started
- audit completed
- audit assignment created
- audit approval mutation
- source of truth verified

audit priority は audit visibility の補助であり、audit execution ではない。

## Operational Priority Semantics

operational priority は、所長・事務・現場・監査が運用上どれを見落とさない方がよいかを読むための severity semantics である。

確認観点:

- affected warehouse / location / project
- affected part / pallet / lot
- high difference quantity
- negative quantity related mismatch
- cross-location relation
- operational visibility gap
- review unresolved / stale / partial
- manager-review / audit-review relation

operational priority が意味しないこと:

- operation started
- task assigned
- notification sent
- execute first
- incident confirmed
- correction required

operational priority は operational comprehension の補助であり、operational workflow ではない。

## Severity Misuse Risk

severity misuse risk は、重大度表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- informational を safe guarantee と読む。
- low を no issue と読む。
- medium を action required と読む。
- high を execute first と読む。
- critical を emergency operation と読む。
- severity high を source error confirmed と読む。
- severity critical を incident confirmed と読む。
- severity priority を workflow queue と読む。
- severity と warning を同一視する。
- severity と state を同一視する。
- severity metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく severity governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- severity misuse risk から execution affordance を出さない。
- severity は execution remediation を提供しない。

## Severity Limitation

severity semantics には limitation がある。

- severity は読み方と優先度を揃えるが、source completeness を保証しない。
- severity metadata は truth guarantee ではない。
- stale / partial / delayed severity state を前提にする必要がある。
- severity が critical でも source error の確定ではない。
- severity が low でも safe guarantee ではない。
- severity priority は execution order ではない。
- severity と warning / state / escalation は関連するが同義ではない。
- Japanese-first wording でも technical ambiguity は残る可能性がある。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Severity Consistency

severity consistency は、severity meaning / readability / priority が Dashboard / UI / audit review / operational review / reasoning visualization / governance prioritization で同じ意味に読めるかを示す review signal である。

確認観点:

- informational / low / medium / high / critical の意味が一貫しているか。
- severity label が action instruction に見えていないか。
- high / critical が execute now に見えていないか。
- informational / low が safe guarantee に見えていないか。
- severity と warning の違いが説明されているか。
- severity と state の違いが説明されているか。
- review / audit / operational priority が workflow queue に見えていないか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_current` を truth として扱っていないか。

severity consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- severity engine availability
- execution permission
- workflow priority

## Raw Source / Adapter / Projection / Graph / Severity Boundary

raw source / adapter / projection / graph / severity は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> severity semantics
  -> UI / governance / audit / operational prioritization
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation / state / severity を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- severity semantics: informational / low / medium / high / critical の意味境界と優先度を揃える read-only review。severity engine ではない。
- UI / governance / audit / operational prioritization: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B35-05 は inventory integrity severity semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- severity engine 実装
- execution workflow 実装
- auto-priority 実装
- auto-severity 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

severity semantics は execution authority ではない。severity semantics は reasoning / review / comprehension のために、informational / low / medium / high / critical、visibility、readability、priority、warning との違い、state との違い、review / audit / operational priority、misuse risk、limitation、consistency、Japanese-first severity wording、raw source boundary を説明する conceptual review である。
