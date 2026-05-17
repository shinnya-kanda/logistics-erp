# Inventory Integrity Reasoning Graph Visualization Semantics

Phase B33-04 inventory integrity reasoning graph visualization semantics review.

この文書は、inventory integrity / governance visualization / reasoning graph における visualization semantics を整理し、reasoning graph をどのように安全かつ理解しやすく表示するかを明確にするための visualization semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、graph UI 実装、interactive graph 実装、workflow graph 実装、execution graph 実装、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- visualization は reasoning / review / comprehension / audit のための read-only 表示である。
- visualization は truth guarantee ではない。
- stale / partial / delayed visualization を前提にする。
- graph visualization を execution UI と混同しない。
- visualization semantics は execution authority を持たない。
- visualization semantics は rebuild、compare execution、replay、correction、workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityReasoningGraphVisualization

`InventoryIntegrityReasoningGraphVisualization` は、`InventoryIntegrityReasoningGraph` の node / edge / relation / caveat を、人が安全に読み取れる表示意味へ整理する conceptual semantics である。

含むべき意味:

- node visibility semantics
- edge visibility semantics
- attention emphasis semantics
- review emphasis semantics
- confidence visualization semantics
- stale visualization semantics
- partial graph visualization semantics
- cross-projection visualization semantics
- graph readability semantics
- graph comprehension risk
- visualization limitation
- visualization consistency
- raw source / adapter / projection / graph / visualization boundary
- non-execution caveat

含まない意味:

- React component
- graph UI implementation
- interactive graph behavior
- graph database schema
- workflow graph
- execution graph
- executable command
- rebuild plan execution
- correction command
- replay command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityReasoningGraphVisualization は「graph をどう読めばよいか」を示す表示意味であり、「何を実行してよいか」を示す UI ではない。

## Node Visibility Semantics

node visibility は、どの reasoning node を表示し、どの粒度で読むべきかを示す。

表示対象:

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

表示時に必要な caveat:

- node type
- source / derived の区別
- scope
- freshness
- confidence
- limitation
- read-only / no-execution boundary

node visibility が意味しないこと:

- source of truth confirmation
- node の永続性保証
- mutation key
- execution eligibility
- workflow state

node は review / comprehension の単位として表示する。node が見えることは、対応する操作を実行できることではない。

## Edge Visibility Semantics

edge visibility は、node 間の関係をどの程度表示し、どの意味で読むべきかを示す。

表示対象:

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

edge 表示で明示すること:

- relation type
- relation reason
- relation scope
- relation freshness
- relation confidence
- limitation
- not execution dependency

edge visibility が意味しないこと:

- causal proof
- execution dependency
- replay eligibility
- correction requirement
- rebuild requirement
- approval granted

edge は「関係として読める」ことを補助する表示であり、truth guarantee や execution permission ではない。

## Attention Emphasis Semantics

attention emphasis は、見落としや誤読を防ぐために attention signal をどの程度強調するかを示す。

強調対象:

- stale / partial / delayed caveat
- low confidence signal
- negative quantity signal
- cross-projection mismatch signal
- pallet relation signal
- unresolved review signal
- evidence gap signal
- governance boundary warning

強調方針:

- attention は category + reason + caveat で表示する。
- attention は action wording にしない。
- critical / high attention は execute now と読ませない。
- 強調は review priority であり execution priority ではない。

attention emphasis が意味しないこと:

- assignment
- notification
- approval
- correction instruction
- rebuild instruction
- execute now

## Review Emphasis Semantics

review emphasis は、review lifecycle state をどのように表示し、workflow state と混同しないようにするかを示す。

表示対象:

- `detected`
- `observed`
- `reviewing`
- `needs-evidence`
- `pending`
- `stale`
- `resolved`
- `rejected`
- `ignored`

表示方針:

- review state は category + meaning + caveat で表示する。
- `resolved` は truth guarantee ではないことを示す。
- `pending` は assignment queue ではないことを示す。
- `needs-evidence` は evidence fetch command ではないことを示す。
- stale review は rebuild required ではないことを示す。

review emphasis は review / investigation / audit の補助であり、workflow UI ではない。

## Confidence Visualization Semantics

confidence visualization は、graph や relation の読みやすさ・説明可能性を表示する semantics である。

表示対象:

- source coverage confidence
- adapter normalization confidence
- projection scope confidence
- snapshot alignment confidence
- compare consistency confidence
- evidence quality confidence
- lineage completeness confidence
- cross-projection boundary confidence

表示方針:

- confidence は reason と limitation を一緒に表示する。
- high confidence は safe to execute ではない。
- low confidence は wrong data の確定ではない。
- unknown confidence は safe to ignore ではない。
- confidence は correctness guarantee ではない。

confidence visualization は review の読みやすさを補助する。実行許可や修正指示として表示しない。

## Stale Visualization Semantics

stale visualization は、graph / projection / snapshot / evidence / review が古い可能性をどう表示するかを示す。

表示対象:

- source freshness
- adapter normalization freshness
- projection freshness
- snapshot freshness
- compare freshness
- evidence freshness
- review freshness
- escalation freshness
- governance visualization freshness

表示方針:

- stale は limitation として表示する。
- stale は inconsistent と断定しない。
- stale は `inventory_transactions` が誤っていることを意味しない。
- stale は `inventory_current` 更新の許可ではない。
- stale は rebuild / replay / compare execution / correction の開始条件ではない。

推奨 wording:

- graph は生成時点の reasoning 表示です。
- 最新 transaction 反映とは限りません。
- stale は確認制限であり、実行指示ではありません。

## Partial Graph Visualization Semantics

partial graph visualization は、node / edge / evidence / lineage の一部が不足している graph をどう表示するかを示す。

partial の例:

- source coverage が一部のみである。
- snapshot scope が部分的である。
- evidence node が不足している。
- lineage edge が欠けている。
- compare coverage が揃っていない。
- cross-projection relation が一部だけ見えている。
- ADJUST / CANCEL / MOVE semantics が曖昧である。
- pallet relation が部分的である。

表示方針:

- partial は limitation として表示する。
- partial を missing action として表示しない。
- partial graph でも見えている範囲と見えていない範囲を分ける。
- partial graph は automatic remediation ではない。
- partial を no issue や confirmed error と誤読させない。

partial graph visualization は review limitation を明らかにするための表示であり、execution UI ではない。

## Cross-Projection Visualization Semantics

cross-projection visualization は、inventory / pallet / compare / governance など複数 projection の関係やずれをどう表示するかを示す。

表示対象:

- projection scope alignment
- warehouse / project / part / location / pallet / lot boundary alignment
- snapshot as_of_time alignment
- compare coverage alignment
- evidence coverage alignment
- lineage completeness
- cross-projection mismatch
- cross-projection gap

表示方針:

- cross-projection relation は review signal として表示する。
- projection 間のずれを source of truth error と断定しない。
- mismatch は timing gap / boundary mismatch / partial coverage の可能性を持つ。
- cross-projection view でも `inventory_transactions` が truth であることを崩さない。
- `inventory_current` を source of truth として表示しない。

cross-projection visualization は、複数 projection を安全に読むための補助であり、rebuild / replay / correction の実行許可ではない。

## Graph Readability Semantics

graph readability は、user が短時間で「何を見ているか」「何が重要か」「何が制限か」「何を実行しないか」を理解できる状態を示す。

readability 方針:

- read-only / no execution indication を常に読み取れるようにする。
- overview / graph / detail / evidence / limitation の読み順を分ける。
- node / edge は category + value + caveat で表示する。
- long relation text は detail / expansion / reference に分ける。
- critical / stale / partial / low confidence を折りたたみ内に隠しすぎない。
- source / derived / cache / projection / graph を同じ表示カテゴリに混ぜない。
- execution action を scan order に入れない。

readability は cosmetic quality ではなく operator safety quality である。ただし readability high は correctness guarantee でも execution permission でもない。

## Graph Comprehension Risk

graph comprehension risk は、graph 表示が本来の意味と異なる形で理解される risk である。

誤読しやすい例:

- edge relation を causal proof と読む。
- lineage complete を replay eligibility と読む。
- evidence available を operation correct と読む。
- confidence high を safe to execute と読む。
- critical attention を execute now と読む。
- review `resolved` を correction completed と読む。
- stale を inconsistent と読む。
- partial を missing action required と読む。
- cross-projection mismatch を source of truth error と読む。

方針:

- confusing pair は label / glossary / caveat で分ける。
- graph relation は truth guarantee ではないことを明示する。
- attention / confidence / review / escalation は action wording にしない。
- comprehension risk は review limitation として扱う。
- comprehension risk から execution affordance を出さない。

## Visualization Limitation

visualization semantics には limitation がある。

- graph 表示は source coverage の範囲に依存する。
- stale / partial / delayed visualization は通常の前提として扱う必要がある。
- node / edge を表示しても relation が完全とは限らない。
- evidence confidence が low / unknown の場合、graph を過信できない。
- lineage gap がある場合、由来説明は部分的になる。
- attention / review / escalation の強調は execution permission と誤読されやすい。
- cross-projection visualization は boundary mismatch や timing gap を含む可能性がある。
- visualization は source of truth の代替ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Visualization Consistency

visualization consistency は、graph visualization が node / edge / relation / caveat を同じ意味で表示できているかを示す review signal である。

確認観点:

- node type と label が一致しているか。
- edge type と relation caveat が一致しているか。
- source / derived / cache / projection / graph の区別が保たれているか。
- stale / partial / delayed の表示が一貫しているか。
- confidence 表示が correctness guarantee に見えていないか。
- attention / review / escalation が execution expectation を生んでいないか。
- cross-projection relation が source of truth error と断定されていないか。
- governance boundary が常に表示上読めるか。

visualization consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- graph completeness
- rebuild required
- correction required
- execution permission

## Raw Source / Adapter / Projection / Graph / Visualization Boundary

raw source / adapter / projection / graph / visualization は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> graph visualization
  -> UI / compare / governance comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- graph visualization: graph を安全に読むための表示意味。execution UI ではない。
- UI / compare / governance comprehension: user が review / investigation / audit のために理解する表示。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B33-04 は inventory integrity reasoning graph visualization semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- graph UI 実装
- interactive graph 実装
- workflow graph 実装
- execution graph 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

visualization semantics は execution authority ではない。visualization semantics は reasoning / review / comprehension のために、node / edge visibility、attention / review / confidence / stale / partial / cross-projection 表示、readability、comprehension risk、limitation、consistency、raw source boundary を説明する conceptual semantics である。
