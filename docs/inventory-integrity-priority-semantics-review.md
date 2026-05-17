# Inventory Integrity Priority Semantics Review

Phase B35-06 inventory integrity priority semantics review.

この文書は、Governance Dashboard / Inventory Integrity における priority semantics を整理し、「何を先に確認すべきか」の意味・境界・優先度表示を横断で統一するための priority semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、priority engine 実装、execution workflow、auto-priority、execution ordering、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- priority semantics は reasoning / review / comprehension / governance prioritization のための read-only semantics である。
- priority metadata は truth guarantee ではない。
- stale / partial / delayed priority state を前提にする。
- Dashboard / UI は日本語中心 priority 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- priority semantics を execution workflow と混同しない。
- priority semantics は execution authority を持たない。
- priority semantics は rebuild、compare execution、replay、correction、priority engine、execution ordering、execution workflow、auto-priority、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityPrioritySemantics

`InventoryIntegrityPrioritySemantics` は、Governance Dashboard / Inventory Integrity UI で表示される review priority / audit priority / operational priority / attention priority / escalation priority を、同じ意味・同じ表示境界・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- review priority semantics
- audit priority semantics
- operational priority semantics
- attention priority semantics
- escalation priority semantics
- priority visibility semantics
- priority readability semantics
- priority ordering semantics
- priority と severity の違い
- priority と warning の違い
- priority と state の違い
- priority misuse risk
- priority limitation
- priority consistency
- Japanese-first priority wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / priority boundary
- non-execution caveat

含まない意味:

- React component
- priority engine
- automatic priority calculation
- automatic assignment
- automatic notification
- execution ordering
- executable command
- workflow queue
- approval mutation
- rebuild plan execution
- correction command
- replay command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityPrioritySemantics は「どの順に確認して読むとよい可能性があるか」を示す review / audit / operational comprehension の補助であり、「どの順に処理を実行するか」を示す workflow object ではない。

## Japanese-First Priority Wording Policy

Dashboard / UI は日本語中心 priority 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- priority は `priority kind + reason + caveat` で表示する。
- 優先度を action instruction に見せない。
- high / urgent に見える priority には `実行順ではありません` の caveat を添える。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `確認優先(review priority): 先に確認する候補です。実行順ではありません。`
- `監査優先(audit priority): 監査観点で先に読む候補です。監査開始ではありません。`
- `運用優先(operational priority): 運用上見落とさない候補です。作業指示ではありません。`
- `注意優先(attention priority): 注意して読む順序の参考です。自動割当ではありません。`
- `管理優先(escalation priority): 管理上の確認候補です。通知済みではありません。`

避ける形式:

- `先に実行`
- `今すぐ対応`
- `作業順`
- `処理優先`
- `自動割当済み`
- `対応必須`

## Review Priority Semantics

review priority は、人による確認でどれを先に読むとよい可能性があるかを示す。

推奨表現:

- `確認優先(review priority)`
- `優先確認の候補`
- `先に確認する候補`
- `確認順の参考`

意味:

- difference / stale / partial / evidence gap / lineage gap / low confidence などをもとに、確認順の参考を示す。
- review / investigation の見落としを防ぐための signal である。
- human review の読み順を補助する。

禁止解釈:

- assignment created
- workflow queue
- reviewer decided
- correction required
- approval pending
- execute first

review priority は確認順の参考であり、execution ordering ではない。

## Audit Priority Semantics

audit priority は、監査・棚卸・内部統制・説明責任の観点でどれを先に読むとよい可能性があるかを示す。

推奨表現:

- `監査優先(audit priority)`
- `監査観点の優先確認`
- `証跡確認の優先候補`
- `説明責任上の確認候補`

意味:

- evidence gap / traceability gap / lineage gap / stale audit state / repeated unresolved review などを見落とさないための signal である。
- audit review の読み順を補助する。
- audit visibility を上げる。

禁止解釈:

- audit started
- audit completed
- audit assignment created
- audit approval mutation
- source of truth verified
- correction required

audit priority は audit visibility の補助であり、audit execution ではない。

## Operational Priority Semantics

operational priority は、所長・事務・現場・監査が運用上どれを先に確認するとよい可能性があるかを示す。

推奨表現:

- `運用優先(operational priority)`
- `運用上の優先確認`
- `見落とし防止の確認候補`
- `現場・事務・管理確認の候補`

意味:

- affected warehouse / location / project / part / pallet / lot、large difference、negative quantity related mismatch、cross-location relation などをもとに確認順の参考を示す。
- operational comprehension の補助である。
- manager / office / worker / audit が同じ意味で読める visibility を作る。

禁止解釈:

- operation started
- task assigned
- notification sent
- execute first
- incident confirmed
- correction required

operational priority は運用上の読み順の参考であり、operational workflow ではない。

## Attention Priority Semantics

attention priority は、見落としや誤読を防ぐために、どの signal に先に注意して読むかを示す。

推奨表現:

- `注意優先(attention priority)`
- `注意して読む候補`
- `見落とし注意の優先候補`
- `注意順の参考`

意味:

- warning / severity / state / evidence / lineage / confidence などの attention signal を読む順序の参考である。
- human review priority を補助する。
- high attention でも execution priority ではない。

禁止解釈:

- execute now
- execution priority
- automatic warning
- assignment
- notification
- approval

attention priority は注意の読み順であり、実行優先度ではない。

## Escalation Priority Semantics

escalation priority は、管理者・監査・所長など、どの関係者が先に状況把握した方がよい可能性があるかを示す。

推奨表現:

- `管理優先(escalation priority)`
- `管理上の優先確認`
- `管理者確認の優先候補`
- `監査・管理の確認候補`

意味:

- manager-review / audit-review / critical-review に近い management attention priority を示す。
- who should pay attention の参考である。
- unresolved / stale / cross-warehouse / evidence gap / lineage gap を見落とさないための表示である。

禁止解釈:

- escalation executed
- assignment created
- notification sent
- approval required
- execute first
- audit started

escalation priority は management attention visibility であり、auto-escalation や execution authority ではない。

## Priority Visibility Semantics

priority visibility は、確認優先度をどの程度見えるようにするかを示す。

visibility 方針:

- priority kind と reason を一緒に表示する。
- high priority に見える signal には no-execution caveat を添える。
- stale / partial / delayed priority state は limitation として見えるようにする。
- color だけで priority を伝えない。
- priority と severity / warning / state / escalation を label で区別する。
- priority と execution control を近接させない。

visibility が意味しないこと:

- action priority
- workflow priority
- mutation permission
- incident confirmation
- execution readiness

priority visibility は governance prioritization のための表示整理である。

## Priority Readability Semantics

priority readability は、確認優先度を短時間で安全に読める状態である。

readability 方針:

- priority は `kind + reason + caveat` で表示する。
- same priority kind は same label で表示する。
- priority と severity / warning / state を混同しない。
- high priority は action wording を避ける。
- low priority は safe guarantee に見えないようにする。
- reason / scope / limitation を分ける。

推奨 wording:

- `確認優先(review priority): 証跡不足があるため先に確認する候補です。実行順ではありません。`
- `監査優先(audit priority): 由来関係に gap があるため監査観点で先に読む候補です。監査開始ではありません。`
- `運用優先(operational priority): 影響範囲が大きく見えるため見落とし注意です。作業指示ではありません。`

priority readability は correctness guarantee でも execution permission でもない。

## Priority Ordering Semantics

priority ordering は、複数の signal をどの順に読むとよいかの参考順序である。

基本方針:

- ordering は human review order の参考であり、execution order ではない。
- ordering は assignment / notification / approval を生成しない。
- ordering は source error confirmation ではない。
- ordering は stale / partial / delayed context によって変わり得る。
- ordering は evidence / lineage / confidence / freshness / impact / severity と一緒に読む。

ordering が意味しないこと:

- execute first
- fix first
- rebuild first
- workflow queue
- SLA guarantee
- auto-priority result

priority ordering は governance prioritization の参考であり、execution ordering 実装ではない。

## Priority と Severity の違い

priority と severity は関連するが同じではない。

- priority: 何を先に確認して読むかの順序・優先度。
- severity: どれだけ重大に注意して読むべきかの強度。

違い:

- severity high は priority high の判断材料になり得るが、同義ではない。
- priority high は severity critical を意味しない。
- severity low でも stale / audit context により priority が上がる場合がある。
- priority は ordering / review order に近い。
- severity は importance / impact / intensity に近い。

混同してはいけない解釈:

- priority high = severity critical
- severity critical = execute first
- priority high = auto-priority executed
- severity low = safe to ignore

## Priority と Warning の違い

priority と warning は同じではない。

- priority: どれを先に確認して読むかの参考。
- warning: 誤読 risk、確認制限、attention を目立たせる display signal。

違い:

- warning は reading limitation / attention display を示す。
- priority は ordering / review sequence の参考を示す。
- warning があっても priority が常に high とは限らない。
- priority high でも warning 表示が必須とは限らない。
- warning critical でも execution trigger ではない。

混同してはいけない解釈:

- warning visible = priority first
- priority high = warning engine executed
- warning critical = execute now
- priority high = incident confirmed

## Priority と State の違い

priority と state は同じではない。

- priority: 確認順の参考。
- state: ready / stale / partial / degraded / reviewing / escalated / resolved / ignored など、表示上の状態。

違い:

- stale state は priority を上げる要因になり得るが、同義ではない。
- resolved state は priority zero ではない。
- ignored state は permanent low priority ではない。
- escalated state は priority high と関連し得るが、execution priority ではない。
- reviewing state は workflow queue ではない。

混同してはいけない解釈:

- state stale = rebuild first
- state resolved = no priority
- state ignored = safe to ignore
- priority high = state transition required

## Priority Misuse Risk

priority misuse risk は、優先度表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- review priority を assignment queue と読む。
- audit priority を audit started と読む。
- operational priority を task assigned と読む。
- attention priority を execute now と読む。
- escalation priority を notification sent と読む。
- priority high を execute first と読む。
- priority ordering を execution ordering と読む。
- priority と severity を同一視する。
- priority と warning を同一視する。
- priority と state を同一視する。
- priority metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく priority governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- priority misuse risk から execution affordance を出さない。
- priority は execution remediation を提供しない。

## Priority Limitation

priority semantics には limitation がある。

- priority は確認順を揃えるが、source completeness を保証しない。
- priority metadata は truth guarantee ではない。
- stale / partial / delayed priority state を前提にする必要がある。
- priority が high でも source error の確定ではない。
- priority が low でも safe guarantee ではない。
- priority ordering は execution order ではない。
- priority と severity / warning / state / escalation は関連するが同義ではない。
- Japanese-first wording でも technical ambiguity は残る可能性がある。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Priority Consistency

priority consistency は、review priority / audit priority / operational priority / attention priority / escalation priority が Dashboard / UI / audit review / operational review / governance prioritization / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- priority kind の意味が一貫しているか。
- priority label が action instruction に見えていないか。
- high priority が execute first に見えていないか。
- low priority が safe guarantee に見えていないか。
- priority と severity の違いが説明されているか。
- priority と warning の違いが説明されているか。
- priority と state の違いが説明されているか。
- priority ordering が workflow queue に見えていないか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_current` を truth として扱っていないか。

priority consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- priority engine availability
- execution permission
- workflow priority
- execution ordering

## Raw Source / Adapter / Projection / Graph / Priority Boundary

raw source / adapter / projection / graph / priority は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> priority semantics
  -> UI / governance / audit / operational prioritization
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation / state / severity / priority を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- priority semantics: review / audit / operational / attention / escalation priority の意味境界と確認順を揃える read-only review。priority engine ではない。
- UI / governance / audit / operational prioritization: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B35-06 は inventory integrity priority semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- priority engine 実装
- execution ordering 実装
- execution workflow 実装
- auto-priority 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

priority semantics は execution authority ではない。priority semantics は reasoning / review / comprehension のために、review priority / audit priority / operational priority / attention priority / escalation priority、visibility、readability、ordering、severity との違い、warning との違い、state との違い、misuse risk、limitation、consistency、Japanese-first priority wording、raw source boundary を説明する conceptual review である。
