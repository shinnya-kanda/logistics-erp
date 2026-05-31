# Governance Semantic Graph Read-Only UI Skeleton Implementation Plan

Phase B77-19 documentation.

このドキュメントは、B77-18 implementation readiness review の結果を受け、将来の Governance Semantic Graph UI 実装に向けた read-only graph UI skeleton implementation plan を整理するための planning document である。

今回は documentation phase であり、React implementation、TypeScript implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、actual graph UI、mutation、workflow execution、correction / rebuild / replay / sync は扱わない。

## 1. このドキュメントの目的

read-only graph UI skeleton implementation plan の目的は、将来の最初の Graph UI phase を安全に始めるために、実装順序、component candidates、mock data strategy、local state、navigation、accessibility、risk mitigation を documentation として固定することである。

skeleton phase が必要な理由:

- B77-01 から B77-18 で整理した graph architecture / summary / navigation / rendering / readiness を、いきなり graph engine や API integration に接続せず、最小 UI 構成として確認するため。
- Summary Panel、Graph Canvas Placeholder、Inspector Panel、Filter Panel、Legend、Breadcrumb の責務を実装前に固定するため。
- node click / edge click / summary click が execution trigger に見えないことを、実装前の UI skeleton 計画で確認するため。
- mock data と local state だけで、read-only observability boundary を確認するため。
- execution layer、mutation、POST、Supabase mutation、correction / rebuild / replay / sync を初回 UI phase に持ち込まないため。

B77-18 readiness review の次に行う理由:

- readiness review で documentation readiness は高いが implementation permission ではないと整理した。
- 次に進む場合も、first implementation should be skeleton / static / mock / no API mutation とされた。
- そのため、実装に入る前に skeleton phase の scope、order、state、risk を documentation として固定する必要がある。

この document は implementation plan であり implementation ではない。component を作成せず、`apps/admin-dashboard/src/app` 配下を変更せず、API / DB / Edge Function / package / lock file も変更しない。

## 2. Implementation Boundary

初期 UI phase は次の性質に限定する。

- read-only
- mock data
- local state only
- observability only
- static skeleton first
- no API integration
- no DB integration
- no graph engine integration

禁止:

- mutation
- POST
- Supabase mutation
- correction
- rebuild
- replay
- sync
- execution workflow
- approval workflow
- remediation workflow
- implementation workflow
- migration workflow

追加 boundary:

- compare endpoint は `GET` only として維持する。
- skeleton phase は compare endpoint を呼ばない前提から開始する。
- skeleton phase は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を前提にしない。
- mock data は command payload ではない。
- local state は workflow state ではない。
- implementation plan は implementation permission ではない。

初期 UI phase は、人間が read-only graph layout を確認するための skeleton であり、業務操作、承認、修復、同期、再構築、移行、実行を開始しない。

## 3. Phase Scope

初回 UI skeleton の対象:

- Graph Header
- Summary Panel
- Graph Canvas Placeholder
- Inspector Panel
- Filter Panel
- Legend
- Breadcrumb

初回 UI skeleton の対象外:

- real graph rendering
- Cytoscape
- D3
- Mermaid
- API integration
- DB integration
- Supabase integration
- Edge Function integration
- graph layout algorithm
- dynamic graph computation
- mutation
- execution workflow

scope の読み方:

- Graph Header は title、active view mode、active layer、generatedAt、read-only indicator、`GET` only caveat を表示する候補として扱う。
- Summary Panel は static mock summary cards を表示する。
- Graph Canvas Placeholder は actual graph renderer ではなく、node / edge / path area の placeholder として扱う。
- Inspector Panel は selected summary / node / edge の mock detail を表示する。
- Filter Panel は local view state の toggle 表示に限定する。
- Legend は read-only meaning と noExecutionMeaning を説明する。
- Breadcrumb は workflow step ではなく local navigation context を表示する。

## 4. Implementation Order

推奨順序:

Phase 1: layout skeleton

- Graph page level の layout を定義する。
- Graph Header / Breadcrumb、Summary Panel、Graph Canvas Placeholder、Inspector Panel、Filter Panel、Legend の配置を確認する。
- action button、execution button、approval button を置かない。
- read-only indicator を header / inspector / legend で表示する。

Phase 2: summary cards

- static mock summary cards を表示する。
- Graph Summary、Health Summary、Risk Summary、Collapse Summary、Convergence Summary、Survivability / Sustainability / Maintainability / Evolvability Summary を mock として並べる。
- summary first / collapse first を優先する。
- summary click は local selection のみにする。

Phase 3: inspector skeleton

- selected summary / selected node / selected edge の mock detail area を用意する。
- reason / source / signals / upstream / downstream / read-only boundary を表示する。
- Inspector Panel を command panel / action panel に見せない。

Phase 4: local navigation state

- selectedSummaryId、selectedNodeId、selectedEdgeId、highlightedPathId、activeInspectorTab を local state として扱う計画を固定する。
- breadcrumb click、summary click、mock node click、mock edge click を local state update のみに限定する。
- DB 永続化、API write、workflow transition を行わない。

Phase 5: mock graph canvas

- actual graph engine なしで Graph Canvas Placeholder を mock graph area として表示する。
- mock nodes / mock edges / highlighted path representation を simple static blocks や list 表示で確認する。
- node explosion / edge spaghetti を避けるため、初期表示は overview / collapse-first にする。

Phase 6: accessibility review

- keyboard navigation が表示移動だけであることを確認する。
- screen reader 向けに read-only / no execution caveat を含める。
- color only に依存しない label / badge / text 表示を確認する。
- summary first / details later の読み順を確認する。

この順序は implementation order の提案であり、workflow order、approval order、execution priority ではない。

## 5. Mock Data Strategy

利用対象:

- static mock graph
- static mock nodes
- static mock edges
- static mock summary
- static mock metadata
- static mock reason / source / signals
- static mock view state

mock data の方針:

- source file 内または mock module 内の static object として扱う計画にする。
- API fetch を使わない。
- DB access を使わない。
- Supabase client を使わない。
- mutation payload を含めない。
- command payload に見える field を持たせない。
- `readOnlyBoundary` と `noExecutionMeaning` を mock data に含める候補にする。
- `compareEndpointMethod: "GET"` を metadata mock に含める候補にする。

禁止:

- API fetch
- DB access
- mutation
- POST
- Supabase mutation
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`

mock data は visual skeleton の検証用であり、truth guarantee、execution request、approval request、remediation request ではない。

## 6. UI Component Candidates

初回 skeleton の component candidates:

- GraphPage
- GraphHeader
- SummaryPanel
- SummaryCard
- GraphCanvasPlaceholder
- InspectorPanel
- FilterPanel
- LegendPanel
- BreadcrumbBar

候補ごとの役割:

- GraphPage: skeleton 全体の page composition を持つ候補。layout と local state の置き場所になるが、workflow container ではない。
- GraphHeader: graph title、active view mode、active layer、generatedAt、read-only indicator、`GET` only caveat を表示する候補。
- SummaryPanel: mock summary cards を summary first / collapse first で表示する候補。command panel ではない。
- SummaryCard: Graph / Health / Risk / Collapse / Convergence / lifecycle summary の単位表示候補。action card ではない。
- GraphCanvasPlaceholder: actual graph engine なしで graph area を示す候補。execution canvas ではない。
- InspectorPanel: selected summary / node / edge の mock metadata detail を表示する候補。action panel ではない。
- FilterPanel: activeViewMode / activeLayer / local filters を表示する候補。routing panel ではない。
- LegendPanel: node category、edge type、severity、read-only meaning、noExecutionMeaning を説明する候補。workflow legend ではない。
- BreadcrumbBar: local navigation context を表示する候補。workflow stepper ではない。

component candidate は実装対象の候補整理であり、今回 component file を作成しない。

## 7. Local State Model

local state 候補:

- activeViewMode
- activeLayer
- selectedSummaryId
- selectedNodeId
- selectedEdgeId
- activeInspectorTab
- highlightedPathId

state 方針:

- local state のみとする。
- DB 永続化しない。
- URL routing に依存しない初期 skeleton から開始する。
- API request body にしない。
- mutation payload にしない。
- workflow state として扱わない。
- approval state として扱わない。
- review status として扱わない。

state の意味:

- activeViewMode: 表示する mock view の選択。workflow transition ではない。
- activeLayer: 表示する mock layer の選択。execution phase ではない。
- selectedSummaryId: Inspector に表示する mock summary の選択。action target ではない。
- selectedNodeId: Inspector に表示する mock node の選択。execution target ではない。
- selectedEdgeId: Inspector に表示する mock edge の選択。workflow transition ではない。
- activeInspectorTab: Inspector 内の表示 section。command tab ではない。
- highlightedPathId: mock path の強調表示。action plan ではない。

## 8. Navigation Plan

navigation plan:

- summary click
- node click
- edge click
- breadcrumb click

すべて local state 更新のみとする。

summary click:

- selectedSummaryId を更新する。
- InspectorPanel に summary detail を表示する。
- 必要に応じて highlightedPathId を mock path に更新する。
- workflow を開始しない。

node click:

- selectedNodeId を更新する。
- InspectorPanel に node detail を表示する。
- correction / rebuild / replay / sync を開始しない。

edge click:

- selectedEdgeId を更新する。
- InspectorPanel に edge detail を表示する。
- edge traversal や propagation execution を行わない。

breadcrumb click:

- local navigation context を戻す。
- workflow step transition ではない。
- routing、POST、mutation を行わない。

navigation は read-only metadata inspection のための導線であり、workflow、execution、approval、remediation、implementation、migration を開始しない。

## 9. Rendering Plan

初期 phase:

- graph canvas placeholder
- summary cards
- inspector detail area
- filter / view controls as local display controls
- legend / read-only meaning
- no actual graph engine

Graph Canvas Placeholder:

- actual graph rendering を行わない。
- Cytoscape / D3 / Mermaid を導入しない。
- mock nodes / mock edges の簡易 placeholder 表示に限定する。
- collapse path first の視覚方針だけを確認する。
- "graph engine not connected" ではなく "read-only placeholder" として表現する。

Summary Cards:

- Graph Summary / Health / Risk / Collapse / Convergence / lifecycle summaries を static mock として表示する。
- positive summary は控えめにする。
- collapse / unavailable / broken を優先表示する。

Inspector Detail Area:

- selected mock metadata を表示する。
- reason / source / signals / read-only boundary を表示する。
- action button を置かない。

後続 phase:

- graph renderer evaluation
- graph renderer prototype
- graph renderer integration

後続 phase でも execution layer は別とする。renderer evaluation は visualization library の比較であり、mutation、workflow、approval、remediation を含めない。

## 10. Accessibility Plan

accessibility plan:

- keyboard navigation
- screen reader
- color only に依存しない
- summary first
- focus state は local UI state
- read-only caveat を常に読めるようにする

keyboard navigation:

- summary card、mock node、mock edge、breadcrumb、inspector tab の表示移動に限定する。
- Enter / Space がある場合も local selection / detail display のみにする。
- keyboard operation で execution しない。

screen reader:

- Summary Panel、Graph Canvas Placeholder、Inspector Panel、Filter Panel、Legend の landmark / label を明確にする計画にする。
- read-only / no execution caveat を読み上げ可能にする。
- severity や status を color だけで伝えない。

color / label:

- collapse、unavailable、broken、stable、evolvable などは label / badge / text を併用する。
- stable / evolvable は execution permission ではない caveat を近接表示する。

summary first:

- focus order は Graph Header、Summary Panel、Graph Canvas Placeholder、Inspector Panel、Filter Panel、Legend の順を基本候補にする。
- critical / collapse summary を見落としにくくする。

## 11. Risks

実装時リスクと mitigation:

- graph density
  - mitigation: 初期 skeleton は Graph Canvas Placeholder に限定し、all nodes rendering を行わない。summary first / collapse first を優先する。

- execution UI 誤認
  - mitigation: action button、execution button、approval button、repair button、sync button を置かない。read-only indicator と noExecutionMeaning を表示する。

- summary recommendation 誤認
  - mitigation: SummaryCard は "recommend" / "apply" / "fix" / "approve" の語彙を避け、summary / reason / source / signals を中心にする。

- local state の workflow state 誤認
  - mitigation: selectedSummaryId、selectedNodeId、highlightedPathId は local UI state として扱い、DB 永続化や URL workflow と結びつけない。

- node click / edge click が action に見えるリスク
  - mitigation: click 後は Inspector detail のみを表示し、toast、progress、spinner、execution feedback を出さない。

- Graph Canvas Placeholder が execution canvas に見えるリスク
  - mitigation: placeholder に read-only observability label を置き、command palette / action menu を置かない。

- Filter Panel が routing panel に見えるリスク
  - mitigation: filter は display only と表示し、route、send、apply、execute の語彙を避ける。

- future graph renderer evaluation が実装開始に見えるリスク
  - mitigation: renderer evaluation は別 documentation / prototype phase とし、API / DB / mutation と分離する。

## 12. Implementation Readiness Gate

実装開始前条件:

- B77 docs completed。
- B77-18 readiness review completed。
- read-only boundary agreed。
- no mutation policy agreed。
- compare endpoint `GET` only policy agreed。
- initial phase is static mock / no API / no DB。
- component scope agreed。
- local state only policy agreed。
- action button / onClick execution prohibition agreed。
- accessibility baseline agreed。

gate の意味:

- gate 通過は implementation permission for mutation ではない。
- gate 通過は execution readiness ではない。
- gate 通過は approval readiness ではない。
- gate 通過後も最初の implementation は read-only static mock skeleton に限定する。

## 13. Recommended First Implementation

recommended first implementation は `apps/admin-dashboard/src/app` 配下のみを対象にする。

推奨内容:

- GraphPage skeleton
- static mock cards
- static inspector
- Graph Canvas Placeholder
- Filter Panel static controls
- Legend Panel
- BreadcrumbBar
- no API
- no DB
- no Supabase client
- no graph renderer
- no mutation

first implementation の前提:

- static mock data を使う。
- API fetch しない。
- compare endpoint を呼ばない。
- compare endpoint は将来 integration しても `GET` only とする。
- local state のみで summary click / mock node click / mock edge click / breadcrumb click を扱う。
- execution button / onClick execution を置かない。

recommended first implementation は UI skeleton の確認に限定する。business operation、approval、remediation、implementation workflow、migration workflow を追加しない。

## 14. Future Phases

future phases 候補:

- graph renderer evaluation
- graph renderer prototype
- graph renderer integration
- mock graph data contract refinement
- accessibility review refinement
- read-only API integration planning

future phase boundary:

- graph renderer evaluation は library selection / prototype evaluation であり、execution layer ではない。
- graph renderer prototype は read-only mock data の範囲に限定する。
- graph renderer integration は data contract / rendering architecture と整合する必要がある。
- read-only API integration planning を行う場合も compare endpoint は `GET` only とする。
- execution layer は別 endpoint / 別 workflow / 別 design phase とする。

future phases でも、correction、rebuild、replay、sync、mutation、POST、Supabase mutation、approval workflow、remediation workflow、migration workflow を Graph UI skeleton に混ぜない。

## 15. 今回の範囲外

Phase B77-19 では次を扱わない。

- React implementation
- TypeScript implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- actual graph UI
- Cytoscape implementation
- D3 implementation
- Mermaid implementation
- package / lock file change
- Supabase schema change
- mutation
- workflow execution
- correction / rebuild / replay / sync
- approval workflow
- remediation workflow
- implementation workflow
- migration workflow

この document は read-only graph UI skeleton implementation plan の documentation であり、実装差分や runtime behavior を追加しない。
