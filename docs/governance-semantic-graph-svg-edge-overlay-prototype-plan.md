# Governance Semantic Graph SVG Edge Overlay Prototype Plan

Phase B77-25 documentation.

このドキュメントは、B77-24 HTML/CSS static graph prototype の次段階として、将来 SVG edge overlay を検討する場合の prototype plan を整理するための design document である。

今回は documentation phase であり、SVG implementation、React implementation、package install、API integration、DB integration、Supabase integration、Edge Function change、mutation、workflow execution は扱わない。

## 1. 目的

SVG edge overlay prototype plan の目的は、B77-24 の relation chip based graph prototype から、将来 node card 間の semantic relation を視覚的に結ぶ表現へ進む場合の scope、boundary、risk、mitigation を事前に固定することである。

relation chip から SVG edge overlay へ進める理由:

- relation chip は accessibility と read-only boundary を保ちやすいが、node 間の位置関係や path continuity は視覚的に弱い。
- collapse path、convergence path、survivability / maintainability / evolvability path を人間が短時間で追うには、軽い edge overlay が有効な場合がある。
- selected edge や highlighted path を Graph Canvas 内で視覚的に確認しやすくできる。
- relation chip と Inspector の補足だけでは、edge density や path priority の確認が難しくなる可能性がある。

ただし、SVG edge overlay は execution path ではない。線、矢印、path highlight は semantic relation / observability path を示すだけであり、作業順序、承認経路、修復経路、現場指示、データ変更を意味しない。

## 2. Boundary

将来 SVG overlay を実装する場合でも、次の boundary を維持する。

- read-only
- observability only
- local state only
- no API
- no DB
- no Supabase
- no mutation
- no package install
- no graph engine

禁止するもの:

- React Flow
- Cytoscape
- D3
- Mermaid
- Canvas renderer
- drag / drop
- zoom / pan
- layout engine
- API call
- DB access
- Supabase client
- `fetch`
- `createClient`
- `POST`
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`

SVG overlay の click / focus / highlight は、selectedEdgeId、selectedNodeId、highlightedPathId などの local UI state を表示上更新するだけに限定する。

## 3. Prototype 方針

将来 B77-26 で実装する場合の方針:

- node card は HTML のまま維持する。
- edge は SVG overlay として HTML node card の背後または上に表示する。
- package 追加なしで実装する。
- React Flow / Cytoscape / D3 は使わない。
- drag / drop は使わない。
- zoom / pan は使わない。
- static mock only とする。
- `inventoryIntegrityGraphMockData.ts` の nodes / edges を input とする。
- relation chip は accessibility fallback として残す。
- Inspector は selected edge / selected node の metadata を表示する既存責務を維持する。

想定構成:

```text
---------------------------------------------------+
| HTML Node Cards                                  |
|  [Collapse Node]     [Risk Node]                 |
|        \ semantic relation / observability path  |
|         \                                         |
|          [Convergence Node]                      |
|                                                   |
| SVG Edge Overlay                                 |
| Relation Chips / Inspector fallback              |
+---------------------------------------------------+
```

この構成は graph renderer adoption ではない。HTML/CSS prototype の上に、最小限の edge visibility を追加する custom prototype である。

## 4. SVG Overlay の利点

利点:

- node card 間の relation を視覚的に追いやすい。
- collapse / convergence path を relation chip より直感的に確認できる。
- selected edge highlight を Graph Canvas 内で見せやすい。
- selected path highlight を safety-first に表示しやすい。
- package 追加なしで graph-like expression を強められる。
- HTML node card と Inspector の accessibility fallback を維持できる。

特に有効な表示:

- collapse propagation
- convergence caveat
- survivability propagation
- maintainability propagation
- evolvability propagation
- selected edge
- highlighted path

## 5. SVG Overlay のリスク

リスク:

- edge が execution flow に見える。
- arrow が workflow に見える。
- path が remediation route に見える。
- selected path が action plan に見える。
- density が増え、critical path が読みにくくなる。
- HTML card と SVG overlay の位置合わせが複雑になる。
- resize / responsive layout で edge がずれる。
- keyboard / screen reader accessibility が弱くなる。
- edge click target が分かりにくい。

特に注意する誤読:

- 「線があるから処理順がある」
- 「矢印があるから実行方向がある」
- 「path highlight があるから対応ルートがある」
- 「critical edge があるから操作開始が必要」

## 6. Mitigation

mitigation 方針:

- “semantic relation” / “observability path” wording を使う。
- arrow を強調しすぎない。
- edge label は relation type を短く示し、operation verb を使わない。
- no execution labels を Graph Canvas と Legend に維持する。
- edge click は Inspector 連動のみに限定する。
- relation chip を併置し、screen reader / keyboard fallback とする。
- selected path は semantic highlight と明記する。
- density が増える場合は selected path / critical path だけを表示する。
- non-selected edge は subdued 表示にする。
- color only に依存せず、label / text / aria description を付ける。

wording examples:

- semantic relation
- observability path
- relation detail
- selected relation
- highlighted semantic path
- 表示上の関係
- 観測上のつながり
- 詳細確認

避ける wording:

- execute
- run
- approve
- repair
- route
- dispatch
- fix
- apply
- workflow step

## 7. Accessibility 方針

accessibility 方針:

- HTML node card を primary interactive target として維持する。
- relation chip を edge の primary keyboard target として維持する。
- SVG edge は visual support として扱い、必須情報は relation chip と Inspector にも表示する。
- SVG edge に aria-label を付ける場合も、operation instruction に見える wording を避ける。
- selected edge / selected path は text label でも確認できるようにする。
- color only に依存しない。
- focus order は Summary -> Graph Canvas -> Relation Chips -> Inspector -> Filter / Legend を維持する。

SVG overlay は accessibility の primary surface ではない。primary surface は HTML card、relation chip、Inspector のままとする。

## 8. No Package / No Graph Engine 方針

B77-26 で検討する場合も、次を維持する。

- no package install
- no React Flow
- no Cytoscape
- no D3
- no Mermaid
- no graph engine
- no layout engine
- no API integration
- no DB integration
- no Supabase integration

SVG overlay は custom lightweight visual support であり、renderer package adoption ではない。package renderer evaluation は別 phase として扱う。

## 9. B77-26 Scope Proposal

B77-26 で実装する場合の候補 scope:

- `StaticGraphPrototype` に SVG overlay area を追加する。
- HTML node card の layout は維持する。
- selected edge highlight を SVG edge と relation chip の両方に反映する。
- selected path highlight を SVG edge と relation chip の両方に反映する。
- relation chip を accessibility fallback として残す。
- package 追加なし。
- API なし。
- DB なし。
- Supabase なし。
- mutation なし。
- drag / drop なし。
- zoom / pan なし。

B77-26 で対象外にするもの:

- graph layout engine
- dynamic graph computation
- persisted layout
- package renderer
- React Flow / Cytoscape / D3 / Mermaid
- Canvas renderer
- API / DB / Supabase integration
- workflow execution

## 10. Future Phase Positioning

future phase:

- B77-26 SVG edge overlay implementation
- B77-27 package renderer spike decision
- B77-28 renderer integration readiness review

B77-25 は B77-26 の実装許可ではない。B77-25 は、SVG overlay が read-only observability boundary を壊さずに検討可能かを整理する planning document である。
