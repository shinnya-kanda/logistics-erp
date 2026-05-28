# Governance Semantic Graph Readability Density Control Design

Phase B77-08 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design を前提に、将来 governance semantic graph を表示する場合の readability / density control 方針を整理するための design document である。

今回は documentation phase であり、TypeScript implementation、React implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、Cytoscape / D3 / Mermaid implementation、mutation、workflow execution、rebuild / replay / correction / sync、actual graph UI、actual density control UI は扱わない。

## 1. このドキュメントの目的

governance semantic graph readability density control design の目的は、B76 semantics chain を graph として読む際に、semantic graph の過密化を防ぎ、critical / collapse / unavailable signal を見落とさないようにすることである。

この design が整理するもの:

- semantic graph の過密化リスク
- node explosion / edge spaghetti / semantic galaxy の回避
- graph readability を safety-first に維持する目的
- node / edge / path / cluster density control
- view mode ごとの density control
- reason / source / signals の密度方針
- read-only observability visualization boundary

この design が整理しないもの:

- graph rendering implementation
- actual density control UI
- execution workflow
- API implementation
- mutation payload

semantic graph は全量表示を目的にしない。graph は governance semantics を安全に読み取るための解釈支援表示であり、すべての node / edge を常時同じ強度で表示するものではない。

## 2. Readability / Density Control Boundary

density control は次の性質を持つ。

- read-only
- observability only
- visualization readability support
- semantic interpretation support
- local visualization presentation policy

density control は次を実行しない。

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

- density control は execution routing ではない。
- hidden node は ignored workflow ではない。
- collapsed node group は workflow state ではない。
- filtered view は business state ではない。
- compare endpoint は `GET` only として維持する。
- graph density control から mutation しない。
- density control は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない。

hidden、compact、filtered、collapsed、highlighted は、すべて local visualization presentation の状態であり、業務状態、承認状態、実行状態を意味しない。

## 3. Density Problem Statement

B76 governance semantics chain は、多数の semantic layer を持つ。将来 graph visualization に進む場合、すべてを一度に表示すると readability が低下する。

主な問題:

- B76 semantics chain が大きい。
- node / edge が増える。
- all nodes view は読みにくい。
- stable semantics がノイズになる可能性がある。
- collapse chain が埋もれる可能性がある。
- edge spaghetti により upstream / downstream が読めなくなる。
- user が critical semantics を見落とす可能性がある。

特に、confidence、freshness、evidence、auditability、explainability などの support semantics は重要だが、常時全量表示すると collapse / broken / unavailable の path が見えにくくなる。

## 4. Density Control Principle

density control は、graph を小さく見せるためではなく、重要な semantic risk を見落とさないために使う。

原則:

- summary first
- critical first
- unavailable / broken / collapsed first
- collapse path first
- support details on demand
- optimistic semantics は補助表示
- stable semantics は compact 表示
- reason / source / signals は detail 表示
- graph は全量表示ではなく解釈支援表示

positive state や stable state は有用な補助情報だが、critical signal より前面に出さない。安全側の制限、破綻、境界外、回復不能を先に読める構造にする。

## 5. Node Density Control

node density control は、semantic node の表示優先度、grouping、compact 表示、detail 表示の方針を定義する。

node 表示方針:

- critical nodes は常時表示する。
- unavailable / broken / collapsed nodes は優先表示する。
- outside boundary / nonrecoverable nodes は優先表示する。
- stable / maintainable / evolvable nodes は compact 表示にできる。
- support nodes は必要時のみ展開する。
- same cluster の stable nodes は group 表示可能にする。
- detail は inspector / hover / expand に逃がす。
- reason / source / signals は summary node に詰め込みすぎない。

重要な boundary:

- hidden / compact node は削除ではない。
- hidden / compact node は execution state ではない。
- node grouping は local visualization density control である。
- compact 表示は semantic value を軽視することではない。
- node visibility は workflow eligibility ではない。

node density control は review attention を支えるための表示方針であり、node の業務上の有効 / 無効を決めない。

## 6. Edge Density Control

edge density control は、semantic dependency / propagation edge の過密化を防ぎ、重要 path を先に読めるようにする。

edge 表示方針:

- collapse propagation edge を優先表示する。
- critical edge を優先表示する。
- unavailable / broken / outside boundary / nonrecoverable に接続する edge を優先表示する。
- support edge は必要時のみ表示する。
- stable propagation edge は簡略表示にできる。
- dense dependency edge は filtered 表示にできる。
- selected path の edge を highlight する。
- non-selected edge は fade / compact にできる。

重要な boundary:

- edge filter は execution traversal ではない。
- hidden edge は workflow skip ではない。
- edge highlight は action path ではない。
- faded edge は low priority execution ではない。
- edge direction は operation order ではない。

edge density control は semantic interpretation dependency を読みやすくするための表示調整であり、実行経路や承認経路を作らない。

## 7. Path Prioritization

path prioritization は、graph 上でどの semantic path を先に読むべきかを整理する。

優先表示:

- collapse path
- critical propagation path
- unavailable source path
- broken continuity path
- outside boundary path
- nonrecoverable path

補助表示:

- convergence path
- recovery path
- survivability path
- maintainability path
- evolvability path

重要な boundary:

- positive path は optimistic に過度強調しない。
- collapse path を先に読む。
- positive path は safety caveat と一緒に読む。
- path highlight は action plan ではない。
- path selection は workflow execution ではない。

convergence、recovery、survivability、maintainability、evolvability は重要な semantics だが、collapse / broken / nonrecoverable signal が存在する場合はそちらを先に表示する。

## 8. Cluster Density Control

cluster density control は、semantic graph を意味領域ごとにまとめ、node explosion を避けるための方針である。

cluster examples:

- operational cluster
- governance cluster
- lifecycle cluster
- survivability cluster
- evolvability cluster
- support cluster

density 方針:

- cluster は collapsed / expanded を持てる。
- collapsed cluster は semantic summary を表示する。
- expanded cluster は node / edge detail を表示する。
- cluster expansion は local UI state として扱う。
- support cluster は detail on demand を基本にする。
- critical / unavailable / collapsed を含む cluster は summary に caveat を出す。

重要な boundary:

- cluster は workflow lane ではない。
- cluster は execution group ではない。
- collapsed cluster は workflow pause ではない。
- expanded cluster は execution readiness ではない。
- cluster summary は correctness guarantee ではない。

cluster は graph readability と semantic grouping のための表示単位であり、業務処理単位ではない。

## 9. View Mode Density Control

view mode ごとに表示密度の目的を分けることで、semantic graph を用途別に読みやすくする。

overview view:

- top-level critical / broken / unavailable を表示する。
- summary semantics を表示する。
- compact graph を基本にする。
- optimistic semantics を過度表示しない。

collapse view:

- collapse path を優先表示する。
- downstream collapse edge を表示する。
- broken / outside boundary / nonrecoverable を明確に表示する。
- support edge は必要時に展開する。

convergence view:

- convergence path を中心に表示する。
- support signals は必要時表示にする。
- stable path は subdued positive として扱う。
- collapse caveat がある場合は併記する。

support view:

- evidence / confidence / freshness / audit support を表示する。
- reason / source / signals の関係を読みやすくする。
- support edge が execution readiness に見えないようにする。

maintainability / evolvability view:

- lifecycle 後段のみを中心に表示する。
- maintainability / evolvability の前提 caveat を表示する。
- optimistic semantics の過度強調を避ける。
- unmaintainable / unevolvable を優先表示する。

view mode density control は observability filtering であり、workflow transition や execution routing ではない。

## 10. Safety-First Visual Priority

graph density control は safety-first visual priority を支える。

priority order:

1. unavailable
2. broken / collapsed
3. outside boundary / nonrecoverable
4. intolerable / nonsurvivable / unsustainable / unmaintainable / unevolvable
5. fragile / limited / interrupted
6. partial / conditional
7. stable / maintainable / evolvable

重要な方針:

- stable は最後に扱う。
- optimistic は控えめに表示する。
- critical / warning を見落とさない。
- positive state には caveat を残す。
- unavailable / collapsed がある場合は positive summary より優先する。

この priority は表示上の読み順であり、execution priority ではない。

## 11. Reason / Source / Signals Density Policy

reason / source / signals は、readability を壊さずに根拠を追えるように表示密度を調整する。

方針:

- summary area では短く表示する。
- detail panel で全文表示する。
- hover だけに依存しない。
- source / signals は grouping する。
- repeated signals は deduplicate する。
- machine-like signals を読みやすくする。
- B76-22 readability refinement を維持する。
- reason / source / signals は execution instruction として表示しない。

summary では最重要 caveat と代表 reason を出し、source / signals の全文は detail panel、inspector、expand で確認できるようにする。

## 12. Accessibility / Readability Policy

accessibility / readability policy は、graph density を下げても重要 signal が誰にでも伝わるようにするための方針である。

方針:

- 色だけに依存しない。
- label / badge / text を併用する。
- collapsed / unavailable を明確に表示する。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- screen reader でも critical semantics が伝わるようにする。
- graph density を段階的に増やす。
- read-only / no execution caveat を読み取れるようにする。

collapsed、filtered、highlighted、selected の表示は、視覚表現だけでなく text / badge / label でも意味が分かるようにする。

## 13. Local Visualization State

density control に関係する state は local visualization state として扱う。

例:

- activeViewMode
- activeLayer
- activeFilters
- expandedClusterIds
- highlightedPath
- selectedNodeId
- selectedEdgeId
- showSupportEdges
- compactStableNodes

重要な boundary:

- local visualization state である。
- workflow state ではない。
- DB 永続化しない前提で扱う。
- mutation payload ではない。
- selectedNodeId / selectedEdgeId は action target ではない。
- highlightedPath は execution path ではない。
- compactStableNodes は stable semantics の無視ではない。

local visualization state は、graph の見え方を調整するための一時的な UI state であり、business state や approval state ではない。

## 14. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- density control design が固定されていること。
- data contract と整合していること。
- interaction boundary と整合していること。
- node / edge taxonomy、layering、view mode と整合していること。
- graph implementation は別 phase とすること。
- density control は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- density control から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- graph density control を execution UI として扱わないこと。

density control design は visualization implementation の前提整理であり、implementation approval ではない。

## 15. 今回の範囲外

Phase B77-08 では次を扱わない。

- TypeScript implementation
- React implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- Cytoscape / D3 / Mermaid implementation
- mutation
- workflow execution
- rebuild / replay / correction / sync
- actual graph UI
- actual density control UI
- package / lock file change
- Supabase schema change

この document は、governance semantic graph readability / density control の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
