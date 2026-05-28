# Governance Semantic Graph Interaction Boundary Design

Phase B77-06 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design を前提に、将来 graph visualization で使う interaction boundary を整理するための design document である。

今回は visualization architecture documentation phase であり、graph rendering implementation、React implementation、Cytoscape / D3 / Mermaid implementation、API implementation、DB implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI、action button implementation は扱わない。

## 1. このドキュメントの目的

governance semantic graph interaction boundary design の目的は、graph interaction を read-only observability として定義し、node / edge / layer / view mode interaction が execution workflow や mutation に見えないように境界を固定することである。

この design が整理するもの:

- graph interaction boundary
- node hover / click の意味
- edge hover / click の意味
- layer switch / view mode switch / filter toggle の意味
- expand / collapse / path highlight の意味
- detail panel / inspector model
- interaction wording policy
- safety-first interaction policy
- local visualization state と workflow state の分離

この design が整理しないもの:

- execution workflow interaction
- workflow transition interaction
- mutation trigger
- action button behavior
- graph rendering implementation

graph interaction は semantic interpretation support interaction である。interaction は「何を表示・確認・参照するか」を変えるためのものであり、「何を実行するか」を変えるものではない。

## 2. Interaction Boundary

graph interaction は次の性質を持つ。

- read-only
- observability only
- semantic interpretation support
- governance metadata inspection
- local visualization state control

graph interaction は次を実行しない。

- correction
- rebuild
- replay
- sync
- mutation
- POST
- Supabase mutation
- execution workflow
- approval workflow
- retry
- repair
- orchestration

追加 boundary:

- node click は execution trigger ではない。
- edge click は propagation execution ではない。
- view switch は workflow transition ではない。
- filter は routing ではない。
- expand / collapse は execution state change ではない。
- hover は metadata inspection のみである。
- compare endpoint は `GET` only として維持する。
- graph interaction は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

node、edge、view、layer、filter、hover、expand、highlight は、すべて read-only governance metadata の見え方を変える local interaction である。

## 3. Interaction Type Taxonomy

将来 visualization する場合、interaction type は以下のように整理できる。

- node hover: node の semantics value、text、reason、source、signals を軽量に確認する。
- node click: node detail panel / metadata panel を開く。
- edge hover: edge の semantic dependency、propagation reason、upstream / downstream relationship、edge category を確認する。
- edge click: dependency detail を表示する。
- layer switch: graph density control と semantic layer filtering を行う。
- view mode switch: operational / governance / lifecycle / collapse / convergence などの observability view を切り替える。
- filter toggle: semantic visibility control を行う。
- collapse / expand: cluster や node group の表示密度を調整する。
- path highlight: collapse / convergence / survivability / support dependency path を強調表示する。
- reason/source/signals inspect: semantic metadata の根拠を読む。
- legend inspect: color、severity、layer、edge category の意味を読む。

これらはすべて read-only observability interaction であり、execution routing、workflow transition、mutation trigger ではない。

## 4. Node Interaction Boundary

node interaction は node metadata を表示・確認するための操作である。

node hover で表示する候補:

- semantics value
- text
- reason
- source
- signals
- severity / confidence summary
- read-only caveat

node hover は metadata preview であり、DB access、network request、mutation、approval、execution を行わない。

node click の意味:

- detail panel / metadata panel を開くだけ。
- semantics type、semantics value、reason、source、signals、upstream / downstream semantics を表示する。
- execution しない。
- mutation しない。
- approval しない。
- correction / rebuild / replay しない。

node selected state:

- local UI state である。
- workflow state ではない。
- business review state ではない。
- DB に保存しない前提で扱う。
- selected であっても action target ではない。

## 5. Edge Interaction Boundary

edge interaction は semantic relationship を表示・確認するための操作である。

edge hover で表示する候補:

- semantic dependency
- propagation reason
- upstream / downstream relationship
- edge category
- edge severity / importance
- read-only caveat

edge hover は relation preview であり、edge traversal や propagation execution を行わない。

edge click の意味:

- dependency detail を表示するだけ。
- upstream semantics、downstream semantics、edge category、reason、source、signals を表示する。
- edge traversal execution ではない。
- propagation execution ではない。
- workflow transition ではない。
- retry、repair、sync、orchestration を開始しない。

edge highlight:

- semantic interpretation path highlight である。
- execution path ではない。
- workflow path ではない。
- action plan ではない。

## 6. Layer / View Mode Interaction Boundary

layer / view mode interaction は graph density と semantic visibility を調整するための local display operation である。

layer switch:

- graph density control のために使う。
- semantic layer filtering のために使う。
- local display state として扱う。
- workflow transition ではない。
- execution routing ではない。

view mode switch:

- observability filtering のために使う。
- operational / governance / lifecycle / collapse / convergence view を切り替える。
- local display state として扱う。
- workflow transition ではない。
- POST しない。
- mutation しない。

filter toggle:

- semantic visibility control のために使う。
- execution routing ではない。
- operation queue selection ではない。

collapse / expand:

- display density control のために使う。
- semantic grouping visibility を変える。
- execution state change ではない。
- workflow state change ではない。

## 7. Path Highlight Interaction

path highlight は、semantic relationship の流れを見やすくするための表示補助である。

highlight 対象候補:

- collapse propagation path
- convergence propagation path
- survivability propagation path
- sustainability / maintainability / evolvability propagation path
- support dependency path
- audit / explainability support path
- confidence / evidence support path

重要な boundary:

- path highlight は remediation workflow ではない。
- path traversal は execution traversal ではない。
- highlighted path は action plan ではない。
- highlighted path は semantic explanation aid である。
- collapse path を表示しても correction / rebuild / replay / sync を開始しない。
- convergence path を表示しても auto-fix / recovery execution を開始しない。

path highlight は「どう影響して読めるか」を説明するための視覚補助である。

## 8. Detail Panel / Inspector Model

将来 UI 実装する場合、detail panel / inspector は command panel ではなく metadata inspection panel として扱う。

表示候補:

- semantics type
- semantics value
- text
- reason
- source
- signals
- upstream semantics
- downstream semantics
- edge category / node category
- severity / confidence / freshness summary
- read-only boundary
- noExecutionMeaning

重要な boundary:

- detail panel は command panel ではない。
- action button を置かない。
- mutation を起こさない。
- approval、correction、rebuild、replay、sync を開始しない。
- reason / source / signals は evidence reference であり、execution input ではない。

detail panel は B76-22 readability refinement の補助表示として、主表示と supporting metadata を分ける。

## 9. Interaction Wording Policy

interaction wording は、表示操作が execution instruction に見えないように制御する。

避ける表現:

- 実行
- 修正
- 再構築
- 再実行
- 承認
- 反映
- 同期
- 解決
- 実施
- 開始
- 適用

推奨表現:

- 表示
- 確認
- 参照
- 観測
- 補足
- 理由
- source
- signals
- read-only
- observability
- metadata
- detail
- preview

例:

- `node details を表示`
- `edge dependency を確認`
- `reason / source / signals を参照`
- `collapse path を観測`
- `read-only metadata を表示`

「実行してください」「修正してください」「再構築してください」のような wording は使わない。

## 10. Safety-First Interaction Policy

interaction は safety-first の表示方針を維持する。

方針:

- unavailable / broken / collapsed を優先表示する。
- optimistic semantics を過度強調しない。
- collapse path を優先表示する。
- positive path は補足表示にする。
- node click で stable を強調しすぎない。
- warning / critical semantics を見落とさない。
- critical / warning signal は color だけに依存しない。
- read-only / no-execution caveat を常に確認できるようにする。

stable、maintainable、evolvable などの positive semantics は、実行可能、承認済み、安全保証として見せない。

## 11. Interaction State Model

将来 UI で持つ可能性のある state は、local visualization state として扱う。

local state 候補:

- selectedNodeId
- selectedEdgeId
- activeViewMode
- activeLayer
- activeFilter
- highlightedPath
- expandedClusterIds
- hoveredNodeId
- hoveredEdgeId
- inspectorOpen

重要な boundary:

- これらは local visualization state である。
- business workflow state ではない。
- review lifecycle state ではない。
- approval state ではない。
- DB に保存しない前提で扱う。
- mutation しない。
- network write を行わない。
- compare endpoint を POST 化しない。

local state は UI 表示のためだけに使い、業務状態の永続更新には使わない。

## 12. Accessibility / Readability Considerations

interaction design は accessibility と readability を前提にする。

方針:

- hover だけに依存しない。
- detail panel でも同じ情報を確認できる。
- collapsed / unavailable を色だけで表現しない。
- reason / source / signals は読みやすく表示する。
- graph density を抑える。
- keyboard navigation は表示切替のみとする。
- keyboard operation で execution しない。
- focus state は local UI state として扱う。
- screen reader 向けにも read-only / no-execution caveat を含める。
- critical / warning / stable を label と text でも区別する。

readability は cosmetic quality ではなく operator safety quality として扱う。

## 13. 将来 Visualization Implementation に進む前提条件

将来 graph visualization implementation に進む場合は、次の前提を満たす必要がある。

- graph visualization architecture が安定していること。
- node taxonomy / edge taxonomy / layering / view mode が固定されていること。
- interaction boundary が固定されていること。
- graph implementation は別 phase とすること。
- interaction は read-only local UI state に限定すること。
- graph interaction を execution workflow にしないこと。
- graph interaction から mutation しないこと。
- compare endpoint を mutation 化しないこと。
- compare endpoint は `GET` only として維持すること。
- execution layer が必要な場合は別 endpoint / 別 workflow として設計すること。

interaction boundary design は visualization implementation の前提整理であり、implementation approval ではない。

## 14. 今回の範囲外

Phase B77-06 では次を扱わない。

- graph rendering implementation
- React implementation
- Cytoscape / D3 / Mermaid implementation
- API implementation
- DB implementation
- mutation
- workflow execution
- rebuild / replay / correction / sync
- actual graph UI
- action button implementation
- package / lock file change
- Supabase schema change
- Edge Function change

この document は、governance semantic graph interaction boundary の architecture / boundary / local state / wording 整理であり、実装差分や runtime behavior を追加しない。
