# Governance Semantic Graph Renderer Evaluation Design

Phase B77-22 documentation.

このドキュメントは、B77-20 read-only graph UI skeleton と B77-21 read-only graph mock data model refinement を受け、将来 Graph Renderer を導入する前に renderer 候補を read-only observability boundary の観点で評価するための design document である。

今回は documentation phase であり、React implementation、renderer implementation、package install、API implementation、DB implementation、Supabase integration、Edge Function change、mutation、workflow execution、graph layout engine implementation は扱わない。

## 1. このドキュメントの目的

governance semantic graph renderer evaluation design の目的は、B77 graph data model と B77 rendering architecture に適合する renderer 条件を整理し、package 追加や renderer implementation に進む前の判断材料を明文化することである。

renderer 実装前に評価が必要な理由:

- Graph Renderer は node / edge / path interaction を持つため、command UI や execution UI に誤認されるリスクがある。
- B77 の graph は semantic interpretation map であり、workflow map、approval route、operation route ではない。
- renderer package を追加すると dependency、bundle size、accessibility、interaction control、maintenance cost が増える可能性がある。
- B77-21 の mock data model は static graph input であり、renderer はその read-only data を表示するだけに限定する必要がある。
- B77-17 の rendering architecture は Summary Panel、Graph Canvas、Inspector Panel、Filter / View Panel、Legend を分離しており、renderer は Graph Canvas の責務を越えてはならない。

B77 graph data model との関係:

- `InventoryIntegrityGraphData` は summaries、nodes、edges、metadata、viewModes、default selection を持つ static mock model である。
- renderer は nodes / edges を visualization input として受け取れることが望ましい。
- renderer は summary / inspector / legend を内包せず、local UI state による選択と highlight に連動する表示部品として扱う。
- renderer input は command payload ではなく、read-only governance metadata である。

B77 rendering architecture との関係:

- Graph Canvas は semantic interpretation map であり、execution canvas ではない。
- Summary Panel は graph 全体の critical caveat を先に読ませ、Graph Canvas は detail visualization を支える。
- Inspector Panel は selected summary / node / edge の reason / source / signals を表示する。
- Filter / View Panel は active view mode、active layer、density control を local state として扱う。
- Legend は severity、edge type、read-only meaning を説明する。

この phase は implementation ではない。renderer を選定・導入・実装するのではなく、後続 prototype phase に進む前の評価基準を固定する。

## 2. Evaluation Boundary

この phase は次に限定する。

- documentation only
- no implementation
- no package install
- no renderer integration
- no API
- no DB
- no mutation
- read-only observability evaluation

禁止:

- `npm install`
- `pnpm add`
- `package.json` 変更
- `pnpm-lock.yaml` 変更
- React Flow 実装
- Cytoscape 実装
- SVG renderer 実装
- Canvas renderer 実装
- graph layout engine 実装
- `apps/admin-dashboard/src/app` 変更
- Supabase integration
- Edge Function change

追加 boundary:

- renderer evaluation は package adoption approval ではない。
- renderer evaluation は implementation permission ではない。
- renderer comparison は execution workflow selection ではない。
- compare endpoint は `GET` only として維持する。
- renderer から `fetch`、`createClient`、`.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を呼ばない前提を維持する。

## 3. Renderer Requirements

Graph Renderer に求める条件は次の通り。

- read-only interaction を実現しやすい。
- node click / edge click が command UI に見えない。
- local state only で動かせる。
- B77-21 の mock data model から描画可能である。
- collapse path first 表示に対応できる。
- density control に対応できる。
- accessibility を考慮しやすい。
- custom legend / inspector と分離できる。
- execution workflow に見えにくい。
- Graph Canvas の責務に閉じ、Summary Panel、Inspector Panel、Filter / View Panel、Legend を侵食しない。
- package 追加前に prototype 可能な段階を持てる。
- stable / positive signal を過度に強調せず、critical / broken / unavailable / collapse path を優先表示できる。

renderer が持つべき interaction の意味:

- node click: selectedNodeId の local state 更新と Inspector 表示。
- edge click: selectedEdgeId の local state 更新と Inspector 表示。
- path highlight: highlightedPathId の local state 表示。
- view mode / layer switch: activeViewMode / activeLayer の local state 表示。

これらはすべて read-only observability interaction であり、business workflow state や execution state ではない。

## 4. Evaluation Candidates

比較対象:

- React Flow
- Cytoscape.js
- SVG custom renderer
- HTML/CSS custom layout
- Mermaid
- Canvas custom renderer

比較の前提:

- B77-22 では package を追加しない。
- package が必要な候補は、後続の separate evaluation spike でのみ検証する。
- first prototype は no package / static / local state only の候補を優先する。
- Graph Engine はまだ導入しない。

## 5. React Flow Evaluation

Pros:

- React component として扱いやすく、Next.js / React UI に統合しやすい。
- nodes / edges の data model が明確で、B77 の nodes / edges と対応させやすい。
- node click、edge click、selection、viewport control などが整っている。
- custom node / edge renderer により severity、label、badge を出し分けやすい。
- local state 連携が比較的自然である。

Cons:

- package 追加が必要であり、bundle size、dependency、version compatibility の評価が必要になる。
- interaction が豊富なため、編集可能 graph や workflow editor に見えるリスクがある。
- drag / connect / edit 系機能を明示的に無効化しないと、read-only boundary が弱く見える可能性がある。
- accessibility は自動で十分とは限らず、keyboard / screen reader support を別途設計する必要がある。

Read-only 対応:

- nodes draggable、connectable、selectable、deletable などの挙動を慎重に制御する必要がある。
- edge creation、node movement、canvas editing を不可にする前提が必要である。
- controls を置く場合も navigation controls に限定し、command controls に見せない。

Local state 対応:

- selectedNodeId / selectedEdgeId / highlightedPathId と連動しやすい。
- activeViewMode / activeLayer に応じた visible nodes / edges filtering も実装しやすい。
- ただし filtering が workflow routing に見えない wording が必要である。

Package 追加リスク:

- dependency が増える。
- CSS / layout behavior の検証が必要になる。
- Next.js build との相性確認が必要になる。
- package update に伴う maintenance cost が発生する。

Interaction 制御:

- click / hover / selection は制御しやすい。
- drag / connect / edit を完全に抑止する設計が必要である。
- default controls の見た目が operation tool に見えないか確認が必要である。

Density control:

- node / edge filtering、positioning、minimap、zoom などで密度調整しやすい。
- 一方で過剰な graph UI により、初期 prototype では複雑になりやすい。

Accessibility:

- custom node に accessible label を付与できる。
- graph 全体の keyboard navigation、focus order、screen reader description は別途設計が必要である。

B77 data contract との相性:

- High。nodes / edges / metadata / local view state と対応しやすい。
- B77 の edge relation を React Flow edge に mapping しやすい。
- readOnlyBoundary / noExecutionMeaning を node / edge data に保持できる。

Execution UI 誤認リスク:

- Medium to High。workflow editor に見える可能性がある。
- drag handle、connector、minimap、controls などを慎重に制限し、read-only badge / legend / inspector 分離を強調する必要がある。

## 6. Cytoscape.js Evaluation

Graph layout strengths:

- graph layout algorithms が豊富で、node / edge が増えた場合の配置に強い。
- graph analysis / graph visualization に特化している。
- collapse path、cluster、dependency graph の表現力が高い。

Dependency risk:

- package 追加が必要であり、B77-22 では導入しない。
- React integration layer の選定や wrapper の maintenance cost が発生する可能性がある。
- layout plugin を追加する場合、dependency がさらに増える。

Styling flexibility:

- node / edge style を細かく制御できる。
- severity、edge type、highlight、fade、compact 表示に対応しやすい。
- HTML/React component としての rich node 表現は React Flow より設計上の工夫が必要になる可能性がある。

Read-only boundary:

- graph manipulation を無効化し、tap / hover を metadata inspection に限定する必要がある。
- graph analysis tool に見えやすく、operation UI よりは誤認リスクが低いが、interactive graph としての強さを制御する必要がある。

Accessibility:

- Canvas / SVG に近い描画になるため、screen reader / keyboard support は別途作り込みが必要になる。
- Inspector Panel と summary text による accessible fallback を用意する前提が必要である。

Density control:

- High。layout、filter、cluster、selected path、edge visibility control に強い。
- node explosion / edge spaghetti 対策には向いている。

Interaction 制御:

- tap / select / hover を制御できる。
- gestures / pan / zoom が強いため、read-only navigation としての説明が必要である。

B77 data contract との相性:

- High。nodes / edges を graph elements として mapping しやすい。
- severity / category / edgeType / propagationKind を style data に変換しやすい。

Execution UI 誤認リスク:

- Medium。workflow editor というより graph analysis UI に見えるが、path traversal や layout animation が operation route に見えないよう注意が必要である。

## 7. SVG Custom Renderer Evaluation

Package 追加不要:

- browser native SVG で実装できるため、初期 prototype では dependency を増やさずに進められる。
- `package.json` / `pnpm-lock.yaml` を変更せずに static prototype を設計できる。

Controllability:

- node / edge / label / badge / path highlight の見た目を完全に制御できる。
- read-only badge、severity color、collapse path emphasis を過剰な interaction なしで表現しやすい。
- Graph Canvas の見た目を action UI から遠ざけやすい。

Layout complexity:

- layout algorithm を自前で持つ必要がある。
- nodes が増えると manual positioning や simple layered layout では限界が出る。
- edge routing、label overlap、responsive layout の調整が難しい。

Accessibility:

- SVG element に `role`、`aria-label`、`title`、`desc` を付与できる。
- keyboard focus を設計すれば read-only navigation として扱える。
- Inspector Panel と併用することで accessible detail を補完できる。

Density control:

- 初期の collapse path first / small graph には十分対応できる。
- large graph、dynamic clustering、complex edge routing は後続課題になる。

Read-only boundary:

- editing affordance が少ないため、read-only boundary を保ちやすい。
- node / edge click を local selection に限定しやすい。

Initial prototype suitability:

- High。B77-23 / B77-24 の static renderer prototype に向いている。
- package なしで Graph Canvas の見た目、summary-to-detail navigation、path highlight を確認できる。

Maintenance cost:

- small graph では低い。
- graph size や layout requirements が増えると、自前実装の maintenance cost が上がる。

## 8. HTML/CSS Custom Layout Evaluation

Package 追加不要:

- 既存の B77-20 / B77-21 skeleton の延長で実装しやすい。
- `package.json` / `pnpm-lock.yaml` を変更しない first prototype に向いている。

Simple skeleton continuation:

- 現在の mock nodes / mock edges list を card / lane / path block として発展させやすい。
- Summary Panel、Inspector Panel、Filter Panel、Legend との分離を維持しやすい。
- local state only の実装方針と相性が良い。

Node / edge 表現の限界:

- true graph layout、curved edge、edge crossing avoidance、cluster layout は表現しにくい。
- edge relation は line 表現よりも path row / relation card / dependency list になりやすい。
- Graph Canvas と呼ぶには視覚的な graph 感が弱くなる可能性がある。

Accessibility:

- HTML button / section / list として表現でき、screen reader / keyboard support を作りやすい。
- focus order を Summary -> Canvas -> Inspector の reading hierarchy に合わせやすい。

Summary-to-detail navigation との相性:

- High。summary card click -> related node card focus -> inspector detail の導線を自然に作れる。
- breadcrumb と local state の関係も読みやすい。

Collapse path 表示:

- path row、critical lane、highlighted relation group として表現しやすい。
- edge geometry よりも semantic path explanation を重視する場合に向いている。

First prototype suitability:

- High。B77-23 の static renderer prototype plan では最も低リスクの候補である。
- graph engine を導入せず、read-only boundary を保ったまま prototype できる。

## 9. Mermaid Evaluation

Documentation-like graph:

- documentation に近い graph 表現として理解しやすい。
- static preview や architecture doc の補助には向いている。
- semantic dependency chain の概要表示には使いやすい。

Low interaction:

- interaction は限定的であり、read-only 表示としては扱いやすい。
- ただし summary-to-detail navigation、selectedNodeId、selectedEdgeId、highlightedPathId との連動は弱い。

Limited custom interaction:

- custom node / edge click、Inspector Panel 連携、density control、view mode filtering は制約が大きい。
- B77 の local state based rendering には向きにくい。

Accessibility:

- rendered graph の accessibility は実装方式に依存する。
- text source と rendered view の両方を用意すれば補助可能だが、dashboard interaction としては不足しやすい。

Static preview suitability:

- Medium。documentation preview としては有用。
- dashboard renderer の first prototype としては、interaction / styling / local state 連携が弱い。

Dashboard integration suitability:

- Low to Medium。read-only static diagram としては可能だが、B77 Graph Canvas の selected node / edge inspector には合いにくい。

## 10. Canvas Custom Renderer Evaluation

High flexibility:

- large graph、custom animation、dense edge rendering、high performance rendering に強い可能性がある。
- pixel-level control が可能で、独自 layout 表現を作れる。

High complexity:

- node hit testing、edge hit testing、focus management、responsive layout、text rendering を自前で設計する必要がある。
- Inspector Panel 連携や highlight control も複雑になりやすい。

Accessibility difficulty:

- Canvas は DOM node として個別要素を持たないため、screen reader / keyboard navigation が難しい。
- accessible fallback list / hidden DOM representation / Inspector text が必須になる。

Interaction complexity:

- click target、hover target、focus target を自前で管理する必要がある。
- read-only interaction を実現できても、初期 phase では実装負荷が高い。

First prototype suitability:

- Low。B77 の first renderer prototype には過剰である可能性が高い。
- package なしでも実装できるが、maintenance cost と accessibility risk が大きい。

## 11. Evaluation Matrix

| Candidate | Read-only suitability | No-execution-risk | Package risk | Implementation complexity | Accessibility | Density control | Data contract compatibility | Prototype suitability |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| React Flow | Medium | Medium | Medium | Medium | Medium | High | High | Medium |
| Cytoscape.js | Medium | Medium | Medium | Medium to High | Low to Medium | High | High | Medium |
| SVG custom renderer | High | High | High | Medium | Medium to High | Medium | High | High |
| HTML/CSS custom layout | High | High | High | Low | High | Low to Medium | Medium to High | High |
| Mermaid | High | High | Medium | Low to Medium | Medium | Low | Medium | Low to Medium |
| Canvas custom renderer | Medium | Medium | High | High | Low | High | Medium | Low |

評価の読み方:

- Read-only suitability: local state / metadata inspection に限定しやすいか。
- No-execution-risk: command UI、workflow UI、operation UI に見えにくいか。
- Package risk: High は package risk が低いことを意味する。
- Implementation complexity: High は複雑であることを意味する。
- Accessibility: keyboard / screen reader / text fallback を作りやすいか。
- Density control: collapse path first、filter、cluster、edge visibility を扱いやすいか。
- Data contract compatibility: B77-21 mock data model と mapping しやすいか。
- Prototype suitability: no package / static / local state first prototype に向くか。

## 12. Recommendation

推奨方針:

1. First prototype は HTML/CSS custom layout または SVG custom renderer を優先する。
2. Graph engine はまだ導入しない。
3. React Flow / Cytoscape.js は後続の package evaluation spike で比較する。
4. package 追加は別 phase とし、B77-22 では判断材料の整理に留める。
5. B77-23 は static renderer prototype design または implementation plan とする。

理由:

- B77-20 / B77-21 は static mock data、local state only、no API、no DB の skeleton であるため、first prototype もその延長に置く方が安全である。
- HTML/CSS custom layout は accessibility と summary-to-detail navigation を保ちやすく、現行 skeleton からの移行リスクが低い。
- SVG custom renderer は graph-like visual expression を強めつつ package 追加を避けられる。
- React Flow / Cytoscape.js は data contract との相性は良いが、package 追加、interaction control、execution UI 誤認リスクを別 phase で評価する必要がある。
- Mermaid は documentation preview には向くが、dashboard の local state / inspector 連携には弱い。
- Canvas custom renderer は柔軟だが、accessibility と interaction complexity が高く first prototype には不向きである。

推奨する first prototype の方向:

- Summary Panel と Inspector Panel は現行構造を維持する。
- Graph Canvas は HTML/CSS relation layout または simple SVG path layout として設計する。
- selectedNodeId / selectedEdgeId / highlightedPathId は local state only のまま扱う。
- collapse path first、critical first、support details on demand を維持する。
- package 追加なしで feasibility を確認する。

## 13. Future Phases

候補 phase:

- B77-23 static graph renderer prototype plan
- B77-24 read-only SVG/HTML graph prototype
- B77-25 renderer package evaluation spike
- B77-26 renderer integration decision

各 phase の位置付け:

- B77-23: renderer prototype の scope、layout、state、accessibility、verification plan を documentation として固定する。
- B77-24: package 追加なしで read-only SVG/HTML graph prototype を検証する候補 phase。実装する場合も static mock data と local state only に限定する。
- B77-25: React Flow / Cytoscape.js など package 候補を isolated spike として評価する候補 phase。package 追加はこの phase で明示判断する。
- B77-26: renderer integration の採否を決める候補 phase。Graph Engine 導入が必要か、custom renderer 継続かを判断する。

これらは future planning であり、B77-22 の時点では implementation permission ではない。

## 14. 今回の範囲外

今回の範囲外:

- React implementation
- Renderer implementation
- package install
- `package.json` change
- `pnpm-lock.yaml` change
- API integration
- DB integration
- Supabase integration
- Edge Function change
- mutation
- workflow execution
- graph layout engine implementation
- React Flow implementation
- Cytoscape implementation
- Mermaid package adoption
- D3 adoption
- Canvas renderer implementation

## 15. Explicit Prohibitions

B77-22 では次を追加・変更しない。

- `apps/admin-dashboard/src/app`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- DB schema
- Edge Functions
- `npm install`
- `pnpm add`
- React Flow
- Cytoscape
- Mermaid package
- D3
- graph renderer implementation
- `fetch`
- `createClient`
- mutation
- `POST`
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`
- execution workflow
- onClick execution

この document は renderer 候補の評価設計であり、renderer 導入、package 追加、Graph Engine 導入、API / DB integration の開始条件ではない。
