# Inventory Integrity Reasoning Graph Contract Review

Phase B33-03 inventory integrity reasoning graph contract review.

この文書は、inventory integrity / governance visualization / compare reasoning における reasoning graph contract を整理し、evidence / lineage / attention / review / escalation の相互接続構造を明確にするための reasoning graph contract review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、graph 実装、workflow graph 実装、execution graph 実装、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- reasoning graph は reasoning / review / audit / visualization 用の conceptual contract である。
- graph relation は truth guarantee ではない。
- stale / partial / delayed graph を前提にする。
- graph を execution graph と混同しない。
- reasoning graph は execution authority を持たない。
- reasoning graph は rebuild、compare execution、replay、correction、workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityReasoningGraph

`InventoryIntegrityReasoningGraph` は、inventory integrity projection に含まれる evidence / lineage / attention / review / escalation / governance boundary を、node と edge の関係として読めるように整理する conceptual graph contract である。

含むべき意味:

- reasoning node
- reasoning edge
- evidence relation
- lineage relation
- attention relation
- review relation
- escalation relation
- cross-projection relation
- graph freshness
- graph confidence
- graph consistency
- graph limitation
- propagation semantics
- raw source / adapter / projection / graph boundary
- non-execution caveat

含まない意味:

- graph database schema
- graph query execution
- workflow graph
- execution graph
- dependency execution plan
- rebuild plan execution
- correction command
- replay command
- approval mutation
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityReasoningGraph は「どの情報がどの根拠・由来・注意・確認状態・エスカレーションにつながって見えるか」を示す read-only reasoning graph であり、「どの処理を実行してよいか」を示す graph ではない。

## Reasoning Node

reasoning node は、graph 上で個別に参照される reasoning object である。

node の候補:

- source node
- projection node
- snapshot node
- compare node
- evidence node
- lineage node
- attention node
- review node
- escalation node
- governance boundary node
- limitation node

node が持つべき metadata:

- node id
- node type
- source reference
- projection reference
- scope
- as_of_time / generated_at / observed_at
- freshness state
- confidence state
- limitation
- non-execution caveat

node が意味しないこと:

- executable command
- source of truth confirmation
- persistence guarantee
- update permission
- workflow state

node は reasoning の単位であり、mutation key ではない。

## Reasoning Edge

reasoning edge は、node 間の関係を示す read-only relation である。

edge の候補:

- derived-from
- explains
- supports
- contradicts
- limits
- observes
- compares-with
- escalates-from
- reviews
- warns-about
- same-scope-as
- stale-relative-to
- partial-relative-to

edge が持つべき metadata:

- edge id
- edge type
- from node
- to node
- relation reason
- relation scope
- relation freshness
- relation confidence
- limitation
- non-execution caveat

edge が意味しないこと:

- execution dependency
- replay eligibility
- correction requirement
- rebuild requirement
- approval granted
- assignment created

edge は「関係として読める」ことを示すだけで、truth guarantee や execution permission ではない。

## Evidence Relation

evidence relation は、projection / compare / review / escalation がどの証跡を根拠として読めるかを示す。

関係する node:

- evidence node
- source node
- snapshot node
- compare node
- review node
- escalation node
- limitation node

整理する観点:

- source transaction evidence
- compare evidence
- snapshot evidence
- signed quantity evidence
- cache observation evidence
- trace / request id evidence
- pallet relation evidence
- evidence gap
- evidence confidence

evidence relation が意味しないこと:

- correctness guarantee
- operation correct
- evidence fetch execution
- correction command

evidence relation は review / investigation / audit の説明材料である。

## Lineage Relation

lineage relation は、projection や review signal がどの source / snapshot / compare / evidence に由来するかを示す。

関係する node:

- source node
- projection node
- snapshot node
- compare node
- evidence node
- review node
- escalation node

整理する観点:

- source transaction relation
- aggregation effect relation
- snapshot relation
- compare relation
- evidence relation
- parent / child projection relation
- trace id / request id / parent trace id
- dependency caveat

lineage relation の注意点:

- lineage complete は permission granted ではない。
- trace relation は replay eligibility ではない。
- dependency は execution dependency ではない。
- lineage gap は correction command ではない。

## Attention Relation

attention relation は、見落としや誤読を防ぐために、どの node や edge を注意して読むべきかを示す。

関係する node:

- attention node
- compare node
- evidence node
- lineage node
- review node
- escalation node
- limitation node

attention の例:

- stale / partial / delayed caveat
- low confidence signal
- negative quantity signal
- cross-projection mismatch signal
- pallet relation signal
- unresolved review signal
- evidence gap signal

attention relation が意味しないこと:

- assignment
- notification
- approval
- execution priority
- execute now

attention は human review の補助であり、workflow ではない。

## Review Relation

review relation は、compare / evidence / lineage / attention がどの review lifecycle state と結び付いているかを示す。

関係する node:

- review node
- compare node
- snapshot node
- evidence node
- lineage node
- attention node
- limitation node

review relation で扱う state:

- `detected`
- `observed`
- `reviewing`
- `needs-evidence`
- `pending`
- `stale`
- `resolved`
- `rejected`
- `ignored`

review relation の注意点:

- review state は mutation authority ではない。
- `resolved` は truth guarantee ではない。
- `pending` は assignment queue ではない。
- `needs-evidence` は evidence fetch command ではない。
- stale review は rebuild required ではない。

## Escalation Relation

escalation relation は、compare / evidence / lineage / attention / review の状態が、管理上どの注意優先度として読めるかを示す。

関係する node:

- escalation node
- compare node
- review node
- evidence node
- lineage node
- attention node
- limitation node

escalation level:

- `reference`
- `watch`
- `review`
- `manager-review`
- `audit-review`
- `critical-review`

escalation relation の注意点:

- escalation は execution authority ではない。
- escalation は異常確定ではない。
- manager-review は assignment created ではない。
- audit-review は audit started ではない。
- critical escalation は execute now ではない。

## Cross-Projection Relation

cross-projection relation は、inventory / pallet / compare / governance など複数 projection の間に見える関係やずれを示す。

関係する node:

- inventory projection node
- pallet projection node
- compare projection node
- governance projection node
- snapshot node
- evidence node
- lineage node
- limitation node

整理する観点:

- projection scope alignment
- warehouse / project / part / location / pallet / lot boundary alignment
- snapshot as_of_time alignment
- compare coverage alignment
- evidence coverage alignment
- lineage completeness
- cross-projection mismatch
- cross-projection gap

cross-projection relation が意味しないこと:

- 片方の projection が必ず誤っていること
- source of truth error の確定
- `inventory_current` が正しいまたは誤りである確定
- rebuild / replay / correction の実行許可

cross-projection relation は、複数 projection を安全に読むための review signal である。

## Graph Consistency

graph consistency は、reasoning graph 内の node / edge / relation が同じ scope / time / source / limitation で読めるかを示す review signal である。

確認観点:

- source node と projection node の scope が説明できるか。
- adapter 由来の normalized scope と graph node scope が対応しているか。
- snapshot node と compare node の as_of_time が説明できるか。
- evidence relation と lineage relation が同じ source range を参照しているか。
- attention relation と limitation node が対応しているか。
- review relation と escalation relation が同じ caveat を持つか。
- cross-projection relation が projection boundary を越えて過剰な断定をしていないか。
- governance boundary node が execution expectation を遮断しているか。

graph consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- correction required
- rebuild required
- graph execution success
- execution permission

## Graph Limitation

reasoning graph には limitation がある。

- source coverage が partial の場合、graph relation を確定できない。
- stale / delayed source は graph freshness に影響する。
- snapshot / compare / evidence の scope がずれる可能性がある。
- lineage gap がある場合、edge の説明が部分的になる。
- evidence confidence が low / unknown の場合、graph relation を過信できない。
- review state / escalation / attention は execution permission と誤読されやすい。
- cross-projection relation は boundary mismatch や timing gap を含む可能性がある。
- graph relation は truth guarantee ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Graph Freshness

graph freshness は、reasoning graph がどの鮮度状態で読まれるべきかを示す。

分けるべき freshness:

- source freshness
- adapter normalization freshness
- projection freshness
- snapshot freshness
- compare freshness
- evidence freshness
- review freshness
- escalation freshness
- governance graph freshness

freshness の注意点:

- freshness high は correctness guarantee ではない。
- freshness low は source error の確定ではない。
- stale / delayed graph は limitation として表示する。
- graph freshness は execution permission ではない。

## Graph Confidence

graph confidence は、reasoning graph の読みやすさ・説明可能性を示す。

confidence に影響する要素:

- source coverage
- adapter normalization clarity
- projection scope alignment
- snapshot alignment
- compare consistency
- evidence quality
- lineage completeness
- attention clarity
- review freshness
- escalation limitation
- cross-projection boundary clarity

confidence high:

- review に必要な関係が比較的そろっていることを示す。
- safe to execute ではない。
- truth guarantee ではない。

confidence low / unknown:

- graph の読み方に limitation があることを示す。
- automatic correction の指示ではない。

## Graph Propagation Semantics

graph propagation semantics は、raw source / adapter / projection から graph node / edge へ metadata がどのように伝わるかを整理する。

伝播する metadata:

- source reference
- projection identity
- snapshot metadata
- compare metadata
- freshness metadata
- confidence metadata
- evidence metadata
- lineage metadata
- attention metadata
- review state metadata
- escalation metadata
- governance boundary metadata
- limitation
- non-execution caveat

propagation の注意点:

- metadata propagation は truth guarantee ではない。
- relation propagation は execution dependency ではない。
- missing metadata は graph limitation として残す。
- stale / partial / delayed propagation を前提にする。
- propagation は workflow transition を意味しない。

## Raw Source / Adapter / Projection / Graph Boundary

raw source / adapter / projection / graph は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> UI / compare / governance visualization
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- visualization: UI / compare / governance の表示。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B33-03 は inventory integrity reasoning graph contract review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- graph 実装
- workflow graph 実装
- execution graph 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

reasoning graph は execution authority ではない。reasoning graph は reasoning / visualization のために、node / edge / relation semantics / propagation / limitation / freshness / confidence / consistency / raw source boundary を説明する conceptual contract である。
