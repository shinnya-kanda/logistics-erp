# Inventory Integrity State Semantics Review

Phase B35-04 inventory integrity state semantics review.

この文書は、Governance Dashboard / Inventory Integrity における state semantics を整理し、state meaning / state transition / state readability を横断で統一するための state semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、state machine 実装、execution workflow、auto-state-transition、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- state semantics は reasoning / review / comprehension / governance readability のための read-only semantics である。
- state metadata は truth guarantee ではない。
- stale / partial / delayed state を前提にする。
- Dashboard / UI は日本語中心 state 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- state semantics を execution workflow と混同しない。
- state semantics は execution authority を持たない。
- state semantics は rebuild、compare execution、replay、correction、state machine、execution workflow、auto-state-transition、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityStateSemantics

`InventoryIntegrityStateSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される ready / stale / partial / degraded / reviewing / escalated / resolved / ignored などの状態を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- ready semantics
- stale semantics
- partial semantics
- degraded semantics
- reviewing semantics
- escalated semantics
- resolved semantics
- ignored semantics
- state visibility semantics
- state readability semantics
- state transition semantics
- state misuse risk
- state limitation
- state consistency
- Japanese-first state wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / state boundary
- non-execution caveat

含まない意味:

- React component
- state machine
- automatic state transition
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

InventoryIntegrityStateSemantics は「状態をどう読めるか」を示す review / comprehension 補助であり、「どの処理が進んだか」「次に何を実行するか」を示す workflow object ではない。

## Japanese-First State Wording Policy

Dashboard / UI は日本語中心 state 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- state は `state label + meaning + caveat` で表示する。
- action instruction に見える文言を避ける。
- state transition に見える表示には no-execution caveat を添える。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `確認可能(ready): 表示上は確認できます。実行可能を意味しません。`
- `古い可能性(stale): 最新反映とは限りません。再構築指示ではありません。`
- `一部のみ(partial): 表示範囲に制限があります。欠落修正指示ではありません。`
- `確認中(reviewing): 確認文脈の表示です。担当割当ではありません。`

避ける形式:

- `実行可能`
- `処理中`
- `完了`
- `対応済み`
- `安全`
- `修正してください`

## Ready Semantics

ready は、表示上の情報が review / comprehension の入口として読める状態である。

推奨表現:

- `確認可能(ready)`
- `表示確認可能`
- `参照可能`
- `確認用に表示可能`

意味:

- projection / snapshot / compare / evidence / warning を人が確認できる状態である。
- review / investigation / audit の入口として読める。
- data shape や表示条件が最低限そろっている可能性を示す。

禁止解釈:

- executable ready
- safe to execute
- correctness guaranteed
- source complete
- workflow ready
- approval ready

ready は確認可能性であり、実行可能性ではない。

## Stale Semantics

stale は、state / projection / snapshot / compare / evidence / review が最新 context を反映していない可能性を示す。

推奨表現:

- `古い可能性(stale)`
- `最新反映とは限りません`
- `過去時点の表示`
- `確認時点に制限あり`

意味:

- source / adapter / projection / graph / UI state の freshness に制限がある。
- review / operational / audit で caveat として読む。
- delayed update や snapshot 時点の違いを見落とさないための state である。

禁止解釈:

- source of truth failed
- `inventory_current` is wrong confirmed
- rebuild required
- correction required
- compare execution required
- safe to ignore

stale は確認制限であり、execution trigger ではない。

## Partial Semantics

partial は、state を説明する source / evidence / lineage / projection / graph の一部だけが見えている、または不足している状態を示す。

推奨表現:

- `一部のみ(partial)`
- `表示範囲に制限あり`
- `一部情報のみ`
- `根拠または由来が部分的`

意味:

- source coverage / evidence / lineage / graph relation / compare scope が完全ではない可能性を示す。
- review / audit / operational comprehension の制限として読む。
- additional context が必要そうに見える候補である。

禁止解釈:

- missing action required
- source error confirmed
- upload required
- automatic remediation
- no issue

partial は limitation state であり、修正指示ではない。

## Degraded Semantics

degraded は、state の読みやすさ、信頼して読める範囲、または説明可能性が通常より低下している状態を示す。

推奨表現:

- `説明制限あり(degraded)`
- `読み取り制限あり`
- `説明可能性が低い`
- `状態の信頼度に制限あり`

意味:

- confidence / freshness / evidence / lineage / graph completeness の不足により、state を過信しない方がよい。
- comprehension risk や governance readability の低下を示す。
- review / investigation / audit で理由を確認する候補である。

禁止解釈:

- system failure confirmed
- data wrong confirmed
- immediate operation required
- automatic fallback required
- execution blocked

degraded は reasoning quality の制限であり、system execution state ではない。

## Reviewing Semantics

reviewing は、差異・証跡・由来・制限を人が確認している、または確認文脈に置かれていることを示す。

推奨表現:

- `確認中(reviewing)`
- `確認文脈`
- `人による確認中の表示`
- `確認対象として表示`

意味:

- review / investigation / audit の文脈で読まれている状態である。
- evidence / lineage / compare / warning を確認する入口である。
- operational review の補助である。

禁止解釈:

- workflow in progress
- assignment created
- notification sent
- correction in progress
- approval pending

reviewing は review context であり、execution workflow state ではない。

## Escalated Semantics

escalated は、管理上・監査上の注意優先度が高く見える状態を示す。

推奨表現:

- `注意優先度あり(escalated)`
- `管理上の確認候補`
- `監査観点の確認候補`
- `強い注意表示の対象`

意味:

- manager / audit / operational review で見落とさない方がよい候補である。
- escalation level / warning level / review required が強く見える状態を示す。
- who should pay attention の補助である。

禁止解釈:

- escalation executed
- assignment created
- notification sent
- audit started
- execute first
- incident confirmed

escalated は attention visibility であり、auto-escalation や execution authority ではない。

## Resolved Semantics

resolved は、review 上は一旦説明可能または確認済みとして読める状態を示す。

推奨表現:

- `確認上は説明済み(resolved)`
- `確認上は整理済み`
- `一旦説明可能`
- `確認済みとして表示`

意味:

- review context では差異や warning の説明が一旦整理されている。
- evidence / lineage / note により、現時点の review では説明可能と読める。
- future audit / operational explanation の reference になり得る。

禁止解釈:

- truth guarantee
- correction completed
- source error absent
- operation completed
- audit completed
- safe guarantee

resolved は review 上の説明状態であり、正しさや処理完了の保証ではない。

## Ignored Semantics

ignored は、現時点では確認対象から外している、または review 上の優先度を下げている状態を示す。

推奨表現:

- `現時点では対象外(ignored)`
- `確認対象外として表示`
- `優先確認から除外`
- `一時的に対象外`

意味:

- review scope / threshold / business context により、現時点では優先確認しない。
- warning / attention を完全に消すのではなく、なぜ対象外に見えるかを caveat と一緒に読む。
- future context で再確認対象になる可能性がある。

禁止解釈:

- safe guarantee
- permanent suppression
- issue absent
- source correct confirmed
- deletion permission
- no audit relevance

ignored は review scope の表示であり、安全保証や恒久的な除外ではない。

## State Visibility Semantics

state visibility は、どの state をどの程度見えるようにするかを示す。

visibility 方針:

- ready / stale / partial / degraded / reviewing / escalated / resolved / ignored を同じ category と caveat で表示する。
- stale / partial / degraded は limitation として隠さない。
- resolved / ignored は safe guarantee に見えないように caveat を添える。
- escalated / reviewing は workflow state に見えないように説明を添える。
- color だけで state meaning を伝えない。
- state と execution control を近接させない。

visibility が意味しないこと:

- action priority
- workflow priority
- mutation permission
- incident confirmation
- execution readiness

state visibility は governance readability のための表示整理である。

## State Readability Semantics

state readability は、state を短時間で安全に読める状態である。

readability 方針:

- state は `状態名 + 意味 + 制限` で表示する。
- same state は same label で表示する。
- state label と warning label を混同しない。
- ready / resolved / ignored には safe guarantee ではない caveat を添える。
- stale / partial / degraded には limitation reason を添える。
- reviewing / escalated には workflow / assignment ではない caveat を添える。
- action wording を避ける。

推奨 wording:

- `確認可能(ready): 表示上の確認入口です。実行可能を意味しません。`
- `説明制限あり(degraded): 根拠または由来に制限があります。修正指示ではありません。`
- `確認上は説明済み(resolved): 正しさ保証ではありません。`

state readability は correctness guarantee でも execution permission でもない。

## State Transition Semantics

state transition semantics は、state が変わって見えるときの読み方を整理する。

基本方針:

- state transition は UI / projection / review context の読み替わりであり、execution workflow transition ではない。
- `ready -> reviewing` は確認文脈に入った表示であり、assignment created ではない。
- `reviewing -> escalated` は注意優先度が高く見える表示であり、notification sent ではない。
- `reviewing -> resolved` は review 上の説明が整理された表示であり、correction completed ではない。
- `resolved -> stale` は review context が古くなった可能性であり、source error confirmed ではない。
- `ignored -> reviewing` は review scope に戻った可能性であり、workflow reopen ではない。
- `partial -> degraded` は説明制限が強く見える状態であり、system failure ではない。

transition が意味しないこと:

- mutation completed
- workflow state changed
- approval changed
- assignment changed
- `inventory_current` updated
- rebuild / replay / correction started

state transition は reasoning / review / comprehension 上の state reading change であり、auto-state-transition 実装ではない。

## State Misuse Risk

state misuse risk は、state 表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- ready を executable ready と読む。
- stale を rebuild required と読む。
- partial を missing action required と読む。
- degraded を system failure と読む。
- reviewing を assignment in progress と読む。
- escalated を notification sent と読む。
- resolved を correction completed と読む。
- ignored を safe to ignore / no issue と読む。
- state transition を workflow transition と読む。
- state metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく state governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- state misuse risk から execution affordance を出さない。
- state は execution remediation を提供しない。

## State Limitation

state semantics には limitation がある。

- state は読み方を揃えるが、source completeness を保証しない。
- state metadata は truth guarantee ではない。
- stale / partial / delayed state を前提にする必要がある。
- state が ready でも safe to execute ではない。
- state が resolved でも truth guarantee ではない。
- state が ignored でも safe guarantee ではない。
- state transition に見える変化は execution workflow transition ではない。
- Japanese-first wording でも technical ambiguity は残る可能性がある。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## State Consistency

state consistency は、state meaning / transition / readability が Dashboard / UI / operational review / audit review / reasoning visualization / governance readability で同じ意味に読めるかを示す review signal である。

確認観点:

- ready / stale / partial / degraded / reviewing / escalated / resolved / ignored の意味が一貫しているか。
- state label が workflow state に見えていないか。
- state transition が execution workflow transition に見えていないか。
- resolved / ignored が safe guarantee に見えていないか。
- stale / partial / degraded が limitation として読めるか。
- reviewing / escalated が assignment / notification に見えていないか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_current` を truth として扱っていないか。

state consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- state machine availability
- execution permission
- workflow transition

## Raw Source / Adapter / Projection / Graph / State Boundary

raw source / adapter / projection / graph / state は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> state semantics
  -> UI / governance / operational / audit comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation / state を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- state semantics: ready / stale / partial / degraded / reviewing / escalated / resolved / ignored の意味境界と読み方を揃える read-only review。state machine ではない。
- UI / governance / operational / audit comprehension: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B35-04 は inventory integrity state semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- state machine 実装
- execution workflow 実装
- auto-state-transition 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

state semantics は execution authority ではない。state semantics は reasoning / review / comprehension のために、ready / stale / partial / degraded / reviewing / escalated / resolved / ignored、visibility、readability、transition、misuse risk、limitation、consistency、Japanese-first state wording、raw source boundary を説明する conceptual review である。
