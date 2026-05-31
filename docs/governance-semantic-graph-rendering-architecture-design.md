# Governance Semantic Graph Rendering Architecture Design

Phase B77-17 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design、B77-10 semantic convergence visualization design、B77-11 survivability propagation visualization design、B77-12 sustainability propagation visualization design、B77-13 maintainability propagation visualization design、B77-14 evolvability propagation visualization design、B77-15 summary generation design、B77-16 summary-to-detail navigation design を前提に、将来 governance semantic graph UI を実装する場合の rendering architecture を整理するための design document である。

今回は documentation phase であり、React implementation、TypeScript implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、actual graph UI、workflow execution、mutation、correction / rebuild / replay / sync は扱わない。

## 1. このドキュメントの目的

governance semantic graph rendering architecture design の目的は、将来 Graph UI を実装する前に、Graph Canvas、Summary Panel、Inspector Panel、Filter / View Panel、Legend、Graph Header / Breadcrumb の配置と責務を read-only observability rendering として固定することである。

graph rendering を設計する理由:

- B77-01 から B77-16 で整理した graph architecture / taxonomy / layer / view / interaction / data contract / density / propagation / summary / navigation を、画面構成として矛盾なく接続する。
- Graph Canvas と Summary Panel と Inspector Panel の関係を、summary first / details later の読み順で整理する。
- rendering が execution UI、command panel、action panel、routing panel、workflow state display に見えないようにする。
- graph density、layout、panel composition を事前に固定し、将来 React implementation で過剰な UI や mutation 導線を追加しない前提を作る。
- compare endpoint が `GET` only の read-only observability endpoint であることを rendering architecture 側でも明示する。

各領域の基本関係:

- Graph Header / Breadcrumb: graph title、active view mode、active layer、generatedAt、read-only indicator を表示し、現在どの metadata を読んでいるかを示す。
- Summary Panel: Graph Summary と Health / Risk / Collapse / Convergence / lifecycle 後段 summary を最初に読ませる入口である。
- Graph Canvas: node、edge、cluster、highlighted path を safety-first に描画する semantic interpretation map である。
- Inspector Panel: selected summary / path / node / edge の reason / source / signals / upstream / downstream context を確認する metadata inspection panel である。
- Filter / View Panel: active view mode、active layer、local filter を表示上の切り替えとして扱う。
- Legend: node category、edge type、severity、read-only meaning、noExecutionMeaning を説明する。

この design は implementation approval ではない。rendering architecture は「どう表示して読むか」を整理する documentation であり、「何を実装・実行するか」を決める workflow ではない。

## 2. Rendering Boundary

rendering architecture は次の性質を持つ。

- read-only
- observability only
- semantic interpretation rendering
- governance metadata visualization rendering
- local UI state based rendering

rendering architecture は次を実行しない。

- correction
- rebuild
- replay
- sync
- mutation
- POST
- Supabase mutation
- execution workflow
- approval workflow
- remediation workflow
- implementation workflow
- migration workflow
- orchestration

追加 boundary:

- Graph Canvas は execution canvas ではない。
- Summary Panel は command panel ではない。
- Inspector Panel は action panel ではない。
- Filter Panel は routing panel ではない。
- Legend は workflow state legend ではない。
- Graph Header / Breadcrumb は workflow progress ではない。
- compare endpoint は `GET` only として維持する。
- rendering state は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を前提にしない。

node、edge、cluster、summary、filter、breadcrumb、legend、inspector、highlight は、すべて read-only governance metadata の見え方である。強調表示、選択、展開、絞り込みが発生しても、承認、修正、再構築、同期、再実行、実装、移行、現場作業指示を意味しない。

## 3. Rendering Layout Overview

将来 Graph UI を実装する場合、rendering layout は summary first、critical first、detail on demand を前提にする。

layout example:

```text
+---------------------------------------------------+
| Graph Header / Breadcrumb                         |
+----------------------+----------------------------+
| Summary Panel        | Graph Canvas                |
|                      |                            |
|                      |                            |
+----------------------+----------------------------+
| Filter / View Panel  | Inspector Panel             |
+----------------------+----------------------------+
| Legend / Read-only Meaning                         |
+---------------------------------------------------+
```

代替として narrow layout では次の縦構成も許容する。

```text
Graph Header / Breadcrumb
Summary Panel
Graph Canvas
Inspector Panel
Filter / View Panel
Legend
```

各領域の役割:

- Graph Header / Breadcrumb: 現在の graph context、view mode、layer、generatedAt、read-only indicator を表示する。
- Summary Panel: graph 全体の health / risk / collapse / convergence / lifecycle 後段 summary を短く読む入口にする。
- Graph Canvas: semantic node / edge / cluster / path を safety-first priority で表示する。
- Inspector Panel: selected summary / path / node / edge の詳細 metadata を表示する。
- Filter / View Panel: visible layer、view mode、critical only、support edges、compact stable nodes などを local visualization state として切り替える。
- Legend: color / badge / edge style / severity / noExecutionMeaning を説明する。

layout は execution dashboard ではない。画面上の領域分割は reading hierarchy と density control のためであり、workflow lane、approval lane、command area、operation console を作らない。

## 4. Graph Header / Breadcrumb

Graph Header / Breadcrumb は、graph 全体の現在 context を短く示す表示領域である。

表示候補:

- graph title
- active view mode
- active layer
- breadcrumb
- generatedAt
- read-only indicator
- compare endpoint method: `GET` only

役割:

- user がどの graph、view、layer、summary / detail を読んでいるかを把握できるようにする。
- generatedAt により観測時点を確認できるようにする。
- read-only indicator により rendering が mutation や workflow ではないことを常に見えるようにする。
- breadcrumb により Summary Panel、Path Summary、Node / Edge Detail、Inspector の読み位置を示す。

重要な boundary:

- breadcrumb は workflow step ではない。
- active view mode は workflow state ではない。
- active layer は execution phase ではない。
- generatedAt は execution timestamp ではない。
- read-only indicator は decorative label ではなく、mutation しない境界の明示である。

breadcrumb click がある場合でも、それは local navigation state の変更であり、routing、POST、mutation、workflow transition を行わない。

## 5. Summary Panel

Summary Panel は、Graph Canvas より先に読む overview 領域である。critical caveat を先に見せ、detail は Inspector に逃がす。

表示候補:

- Graph Summary
- Health Summary
- Risk Summary
- Collapse Summary
- Convergence Summary
- Survivability Summary
- Sustainability Summary
- Maintainability Summary
- Evolvability Summary

方針:

- summary first とする。
- collapse first とする。
- unavailable / broken / collapsed / outside boundary / nonrecoverable を先に読む。
- positive summary は控えめに表示する。
- convergence / survivability / sustainability / maintainability / evolvability は collapse caveat と一緒に読む。
- summary click は detail expand / inspector detail / related path highlight のみとする。
- command button、execution button、approval button、rebuild button、sync button を置かない。

重要な boundary:

- Summary Panel は command panel ではない。
- summary priority は execution priority ではない。
- critical risk は remediation instruction ではない。
- healthy / low risk / evolvable は execution permission ではない。
- summary card は action card ではない。

Summary Panel は graph 全体を短く安全に読むための入口であり、修正、承認、実装、移行、同期、再構築の開始点ではない。

## 6. Graph Canvas

Graph Canvas は、governance semantic graph の node / edge / cluster / path を表示する中心領域である。Canvas は semantic interpretation map であり、execution canvas ではない。

表示候補:

- nodes
- edges
- clusters
- highlighted path
- active layer
- active view mode
- safety-first coloring
- compact stable nodes
- collapse path emphasis
- faded non-selected edges
- read-only caveat

表示方針:

- collapse path を優先表示する。
- unavailable / broken / collapsed / outside boundary / nonrecoverable を目立たせる。
- stable / maintainable / evolvable は compact か subdued positive にできる。
- support edges は detail on demand を基本にする。
- selected path は semantic explanation aid として highlight する。
- node explosion / edge spaghetti を避ける。

重要な boundary:

- node click は execution ではない。
- edge click は execution ではない。
- cluster expand は workflow state change ではない。
- path highlight は action plan ではない。
- canvas interaction は local UI state である。
- action button を置かない。
- onClick execution を置かない。

Graph Canvas は全量表示を目的にしない。Graph Canvas は、B76 / B77 の semantics を人間が安全に読むための interpretation support である。

## 7. Inspector Panel

Inspector Panel は、selected summary / path / node / edge の metadata を詳しく確認するための read-only panel である。

表示候補:

- selected summary detail
- selected path detail
- selected node detail
- selected edge detail
- reason / source / signals
- upstream / downstream context
- support context
- severity / confidence / freshness
- active view mode / active layer context
- read-only boundary
- noExecutionMeaning

役割:

- Summary Panel で見た overview の根拠を確認する。
- Graph Canvas で選択した node / edge / path の meaning と caveat を読む。
- upstream / downstream relationship を execution route ではなく semantic dependency として説明する。
- reason / source / signals を execution input ではなく evidence reference として表示する。

重要な boundary:

- Inspector は command panel ではない。
- Inspector は action panel ではない。
- action button を置かない。
- mutation を起こさない。
- approval / correction / rebuild / replay / sync 導線を置かない。
- implementation / migration 導線を置かない。
- selectedNodeId / selectedEdgeId は action target ではない。

Inspector Panel は「どう読めるか」を詳しく確認する場所であり、「何をするか」を指示する場所ではない。

## 8. Filter / View Panel

Filter / View Panel は、graph の見え方を local visualization state として調整するための領域である。

表示候補:

- active view mode
- active layer
- critical only
- collapse path only
- convergence path only
- support edges
- compact stable nodes
- expanded clusters
- show read-only caveats

方針:

- filter は visibility control として扱う。
- view switch は observability view の切り替えとして扱う。
- layer switch は semantic layer filtering と density control として扱う。
- compact stable nodes は stable semantics を削除せず、表示密度を下げるだけにする。
- expanded clusters は detail visibility であり、execution readiness ではない。

重要な boundary:

- filter は execution routing ではない。
- view switch は workflow transition ではない。
- layer switch は execution phase transition ではない。
- critical only は remediation queue ではない。
- collapse path only は repair route ではない。
- local visualization state として扱う。
- DB 永続化しない前提で扱う。

Filter / View Panel は graph を読みやすくするための panel であり、operation route、approval route、implementation route を選択しない。

## 9. Legend

Legend は、Graph Canvas と Summary Panel で使う visual language を説明する補助領域である。

表示候補:

- node category
- edge type
- layer
- cluster
- severity / importance
- safety-first priority
- read-only meaning
- noExecutionMeaning
- stable / maintainable / evolvable の caveat

役割:

- color、badge、line style、icon、label の意味を説明する。
- color only に依存しないための text / badge meaning を提供する。
- severity と importance が execution priority ではないことを明示する。
- stable / evolvable などの positive wording が permission ではないことを補足する。

重要な boundary:

- Legend は workflow legend ではない。
- severity は execution priority ではない。
- importance は operation priority execution ではない。
- stable は correctness guarantee ではない。
- maintainable は maintenance workflow permission ではない。
- evolvable は implementation permission ではない。

Legend は rendering の読み方を支える説明であり、workflow state、approval state、execution state の凡例ではない。

## 10. Rendering Density Strategy

rendering density strategy は、Graph Canvas と Panel 群が critical signal を埋もれさせないための表示密度方針である。

方針:

- collapse path を優先表示する。
- unavailable / broken / collapsed を優先する。
- outside boundary / nonrecoverable を見落とさない。
- stable / maintainable / evolvable は compact 表示可能にする。
- support edges は detail on demand とする。
- support nodes は Summary Panel や Inspector で必要時に読む。
- node explosion を避ける。
- edge spaghetti を避ける。
- graph は全量表示ではなく interpretation support として扱う。

優先表示の例:

```text
unavailable
↓
broken / collapsed
↓
outside boundary / nonrecoverable
↓
fragile / limited
↓
conditional
↓
stable / maintainable / evolvable
```

この priority は rendering priority であり、execution priority ではない。positive semantics は useful context だが、collapse / unavailable / nonrecoverable より前面に出さない。

## 11. Panel Interaction Model

Panel interaction は、Summary Panel、Graph Canvas、Inspector Panel、Filter / View Panel、Breadcrumb の表示関係を read-only に接続する。

interaction model:

- summary click -> inspector detail
- summary click -> related path highlight
- node click -> inspector detail
- edge click -> inspector detail
- path highlight -> semantic explanation
- filter toggle -> local view state
- view switch -> local view state
- layer switch -> local view state
- breadcrumb click -> local navigation
- legend inspect -> meaning explanation

重要な boundary:

- すべて read-only interaction である。
- workflow / execution ではない。
- action plan ではない。
- approval flow ではない。
- remediation flow ではない。
- implementation / migration flow ではない。
- graph interaction から mutation しない。
- compare endpoint を `POST` 化しない。

Panel interaction は「どの metadata を表示・確認・参照するか」を変えるだけであり、「何を実行するか」を変えない。

## 12. Rendering State Model

Rendering state は、将来 UI 実装時に一時的に保持する可能性のある local UI state として整理する。

候補:

- activeViewMode
- activeLayer
- activeFilters
- selectedSummaryId
- selectedNodeId
- selectedEdgeId
- highlightedPathId
- expandedClusterIds
- compactStableNodes
- showSupportEdges
- inspectorOpen
- focusedPanel
- breadcrumbItems

重要な boundary:

- local UI state である。
- workflow state ではない。
- business review state ではない。
- approval state ではない。
- implementation state ではない。
- migration state ではない。
- mutation payload ではない。
- DB 永続化しない前提で扱う。
- network write を行わない。

selectedSummaryId、selectedNodeId、selectedEdgeId、highlightedPathId は、表示対象を示すだけであり、作業対象、修復対象、承認対象、実行対象を意味しない。

## 13. Accessibility / Readability

Rendering architecture は accessibility と readability を前提にする。特に collapse / unavailable / broken を見落とさず、positive semantics を実行許可と誤読しない表示が必要である。

方針:

- color only に依存しない。
- label / badge / text を併用する。
- screen reader 対応を前提にする。
- keyboard navigation は表示移動のみとする。
- keyboard operation で execution しない。
- collapse / unavailable を見落とさない。
- summary first / details later とする。
- hover だけに依存しない。
- Inspector Panel でも同じ metadata を確認できるようにする。
- read-only / no execution caveat を読み取れるようにする。

keyboard navigation の boundary:

- focus movement は local UI state である。
- Enter / Space がある場合でも detail open / selection に限定する。
- keyboard operation で correction、rebuild、replay、sync、approval、implementation、migration を開始しない。

readability は cosmetic quality ではなく operator / reviewer safety quality として扱う。

## 14. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- rendering architecture が固定されていること。
- data contract と整合していること。
- summary-to-detail navigation と整合していること。
- interaction boundary と整合していること。
- readability / density control と整合していること。
- Graph Canvas / Summary Panel / Inspector Panel / Filter Panel / Legend / Breadcrumb の責務が分離されていること。
- implementation は別 phase とすること。
- React implementation は別 phase とすること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。

rendering architecture は implementation readiness を示さない。将来 Graph UI を作る場合でも、この design は read-only observability rendering の前提であり、execution UI、command UI、approval UI、remediation UI に拡張しない。

## 15. 今回の範囲外

Phase B77-17 では次を扱わない。

- React implementation
- TypeScript implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- Cytoscape / D3 / Mermaid implementation
- actual graph UI
- mutation
- workflow execution
- correction / rebuild / replay / sync
- approval workflow
- remediation workflow
- implementation workflow
- migration workflow
- package / lock file change
- Supabase schema change

この document は、governance semantic graph rendering architecture の layout / panel composition / density / interaction / state / accessibility / future boundary を整理する documentation であり、実装差分や runtime behavior を追加しない。
