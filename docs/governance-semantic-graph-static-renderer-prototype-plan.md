# Governance Semantic Graph Static Renderer Prototype Plan

Phase B77-23 documentation.

このドキュメントは、B77-22 governance semantic graph renderer evaluation design の結果を受け、B77-24 で package 追加なしの static graph renderer prototype に進む場合の方針を整理する planning document である。

今回は documentation phase であり、React implementation、graph renderer implementation、package install、API integration、DB integration、Supabase integration、Edge Function change、mutation、workflow execution は扱わない。

## 1. このドキュメントの目的

static graph renderer prototype plan の目的は、B77-20 / B77-21 で作成した read-only Graph UI skeleton と mock data model を前提に、first prototype をどの rendering approach で進めるかを決めるための計画を整理することである。

この document が整理するもの:

- package なし prototype から始める理由
- HTML/CSS custom layout、SVG custom renderer、hybrid HTML/SVG layout の比較
- B77-24 implementation に向けた scope proposal
- mock data model の使い方
- local state only interaction の扱い
- accessibility、risk、mitigation、future phase

package なし prototype から始める理由:

- B77-22 で、first prototype は no package / static / local state only が最も低リスクと整理された。
- React Flow / Cytoscape.js などは data contract との相性は良いが、package risk、interaction control、execution UI 誤認リスクを別 phase で評価する必要がある。
- B77-21 の `inventoryIntegrityGraphMockData.ts` は static graph input であり、first prototype はその model を表示するだけで十分である。
- Graph Engine を導入する前に、Summary Panel、Graph Canvas、Inspector Panel、Filter Panel、Legend の read-only responsibility を確認できる。
- package 追加なしであれば `package.json` / `pnpm-lock.yaml` を変更せず、build risk を低く保てる。

B77-22 renderer evaluation との関係:

- B77-22 は renderer 候補全体を評価し、first prototype は HTML/CSS custom layout または SVG custom renderer を優先する方針を示した。
- B77-23 はその結果を具体化し、B77-24 では HTML/CSS custom layout prototype を推奨する。
- SVG custom renderer は edge / path visualization を強める second prototype 候補として残す。

B77-24 implementation に向けた計画:

- B77-24 で実装する場合は、GraphCanvasPlaceholder を StaticGraphPrototype に置き換える計画とする。
- implementation scope は no package、mock data、local state only に限定する。
- SVG edge drawing、drag & drop、zoom / pan、layout engine、API / DB / Supabase integration は対象外にする。

この phase は implementation ではない。B77-23 は B77-24 のための planning document であり、component、renderer、package、API、DB、Supabase、Edge Function を追加しない。

## 2. Prototype Boundary

この phase は次に限定する。

- documentation only
- no implementation
- no package install
- no API
- no DB
- no Supabase
- no mutation
- read-only observability planning

禁止:

- `package.json` 変更
- `pnpm-lock.yaml` 変更
- `apps/admin-dashboard/src/app` 変更
- renderer implementation
- React Flow 導入
- Cytoscape 導入
- D3 導入
- Mermaid 導入
- `fetch`
- `createClient`
- mutation
- `POST`

追加 boundary:

- prototype plan は implementation permission ではない。
- prototype plan は package adoption approval ではない。
- prototype plan は Graph Engine adoption decision ではない。
- compare endpoint は `GET` only として維持する。
- graph interaction は local UI state の表示切替であり、business workflow state ではない。

## 3. Candidate Approaches

候補 approach:

1. HTML/CSS custom layout
2. SVG custom renderer
3. hybrid HTML/SVG layout

比較の前提:

- B77-24 first prototype は package を追加しない。
- `inventoryIntegrityGraphMockData.ts` の summaries / nodes / edges / metadata / viewModes を使う。
- selectedSummaryId、selectedNodeId、selectedEdgeId、activeViewMode、activeLayer、activeInspectorTab、highlightedPathId は local state only とする。
- edge は workflow transition ではなく semantic relation として表示する。
- node / edge click は Inspector Panel の metadata 表示だけを更新する。

簡易比較:

| Approach | Package | Graph-like expression | Accessibility | Complexity | B77-24 suitability |
| --- | --- | --- | --- | --- | --- |
| HTML/CSS custom layout | 不要 | Medium | High | Low | High |
| SVG custom renderer | 不要 | High | Medium | Medium | Medium |
| hybrid HTML/SVG layout | 不要 | High | Medium | High | Low to Medium |

## 4. HTML/CSS Custom Layout Plan

特徴:

- package 不要。
- 既存 skeleton の延長で進めやすい。
- card / node layout が作りやすい。
- accessibility が比較的容易。
- edge 表現は限定的。

想定 rendering:

- nodes は card / grid / lane として表示する。
- severity は badge、border、label で表示する。
- selected node は outline / selected label / aria-pressed で示す。
- edges は relation list、relation chips、path rows として表示する。
- collapse path first の relation group を上部に置く。
- stable / positive node は compact 表示にできる。

向いている用途:

- first prototype。
- summary-to-detail navigation。
- cluster / node card representation。
- read-only observability UI。
- keyboard navigation と screen reader support を重視する prototype。

制約:

- geometric edge drawing は弱い。
- graph らしい visual density は SVG より弱い。
- complex dependency graph や edge crossing の確認には向かない。

B77-24 での扱い:

- 推奨 approach とする。
- GraphCanvasPlaceholder を card / relation based StaticGraphPrototype に置き換える計画にする。
- edge は line-like visual / list / relation chips 程度に留める。

## 5. SVG Custom Renderer Plan

特徴:

- package 不要。
- node / edge 表現が可能。
- path highlight が表現しやすい。
- layout 計算が必要。
- accessibility に注意が必要。

想定 rendering:

- nodes は SVG group / rect / text として配置する。
- edges は line / path / marker として表示する。
- selected path は stroke width / color / label で強調する。
- severity は color / label / pattern を組み合わせる。
- Inspector Panel と連動して selected node / edge を表示する。

向いている用途:

- second prototype。
- edge / path visualization。
- collapse / convergence path 表現。
- relation geometry の確認。

制約:

- node layout、edge routing、label overlap の設計が必要。
- responsive layout が複雑になりやすい。
- keyboard focus と screen reader label を個別設計する必要がある。
- B77-24 の first prototype としてはやや scope が広い。

B77-24 での扱い:

- B77-24 では導入しない。
- B77-25 以降の SVG edge overlay prototype plan または second prototype 候補として残す。

## 6. Hybrid HTML/SVG Plan

特徴:

- node は HTML card。
- edge は SVG overlay。
- package 不要。
- UI 自由度が高い。
- 実装複雑度は上がる。

想定 rendering:

- HTML card の位置を基準に SVG overlay で edge を描画する。
- node card は accessible HTML button / section として扱う。
- edge は SVG path と relation chip の両方で補助する。
- highlightedPathId に応じて SVG edge と relation chip を同期する。

向いている用途:

- B77-25 以降。
- renderer package 導入前の custom graph prototype。
- HTML accessibility と SVG edge expression の両方が必要になった段階。

制約:

- DOM measurement、resize handling、responsive recalculation が必要になりやすい。
- implementation complexity が高い。
- first prototype では scope が広がりやすい。
- SVG overlay が action route のように見えない wording と legend が必要である。

B77-24 での扱い:

- B77-24 では対象外にする。
- HTML/CSS prototype の結果を見て、edge expression が不足する場合に検討する。

## 7. Recommendation

推奨方針:

- B77-24 は HTML/CSS custom layout prototype とする。
- SVG edge rendering は入れない。
- Graph Engine は入れない。
- package は追加しない。
- B77-21 の mock data model を使う。
- local state only とする。
- edge は line-like visual / list / relation chips 程度に留める。

理由:

- read-only boundary を維持しやすい。
- execution UI に見えにくい。
- B77-21 mock model と整合する。
- build risk が低い。
- accessibility 対応しやすい。
- Summary Panel / Graph Canvas / Inspector Panel / Filter Panel / Legend の責務分離を維持しやすい。
- package 追加前に graph canvas の情報設計と user interpretation を確認できる。

推奨 prototype の読み方:

- HTML/CSS custom layout は final renderer ではない。
- first prototype は Graph Canvas の read-only semantics、node / edge metadata、Inspector 連動、density control を確認するための段階である。
- edge geometry の正確さよりも、collapse path first、summary-to-detail navigation、no command wording を優先する。

## 8. B77-24 Implementation Scope Proposal

B77-24 で実装する場合の対象:

- GraphCanvasPlaceholder を StaticGraphPrototype に置き換える。
- mock nodes を card / grid 表示する。
- mock edges を relation list / chips 表示する。
- selected node / edge を local state で highlight する。
- summary / inspector と連動する。
- activeViewMode に応じて表示 group や helper text を切り替える。
- highlightedPathId を relation group の selected state として表示する。
- read-only indicators を Graph Canvas 内にも維持する。

B77-24 で実装する場合の対象外:

- SVG edge drawing
- drag & drop
- zoom / pan
- layout engine
- package 追加
- API 接続
- DB 接続
- Supabase 接続
- mutation
- workflow execution
- Graph Engine integration
- real graph layout algorithm

想定 component 方針:

- `StaticGraphPrototype` は Graph Canvas の内側に閉じる。
- `InventoryIntegrityGraphSection` の top-level local state は継続利用する。
- `inventoryIntegrityGraphMockData.ts` を唯一の graph input とする。
- `SummaryCard`、Inspector、Filter Panel、Legend は既存責務を維持する。

## 9. Data Usage Plan

使用する data:

- `inventoryIntegrityGraphMockData.ts`
- `summaries`
- `nodes`
- `edges`
- `metadata`
- `viewModes`

使用方針:

- summaries は Summary Panel と selectedSummaryId の source とする。
- nodes は StaticGraphPrototype の node card と Inspector node detail の source とする。
- edges は relation list / chips と Inspector edge detail の source とする。
- metadata は read-only boundary、title、GET only caveat の source とする。
- viewModes は Filter Panel の local view state options とする。

禁止:

- real API data
- DB data
- Supabase data
- network request
- persisted state
- generated mutation payload

data usage の boundary:

- mock data は visualization input であり command payload ではない。
- node id / edge id は workflow id ではない。
- selected node / edge は action target ではない。

## 10. Interaction Plan

許可する interaction:

- node click
- edge chip click
- summary click
- filter click

すべて local state only とする。

interaction の意味:

- node click: selectedNodeId を更新し、Inspector に node metadata を表示する。
- edge chip click: selectedEdgeId を更新し、Inspector に edge metadata を表示する。
- summary click: selectedSummaryId を更新し、related node / highlighted path を表示する。
- filter click: activeViewMode を更新し、表示上の focus を切り替える。

禁止する interaction:

- action execution
- workflow start
- correction
- rebuild
- replay
- sync
- approval
- operation routing
- persistent state change
- API call
- DB write

interaction wording:

- 表示
- 詳細
- 確認
- metadata
- observability
- read-only

避ける wording:

- execute
- run
- approve
- apply
- repair
- commit
- route
- dispatch

## 11. Accessibility Plan

accessibility 方針:

- card layout を基本にする。
- buttons / links wording は「表示」「詳細」「確認」を中心にする。
- keyboard navigation で Summary -> Static Graph -> Inspector -> Filter / Legend の順に読めるようにする。
- color only に依存しない。
- severity は color に加えて text label で表示する。
- selected state は outline だけでなく `aria-pressed` や text label で示す。
- read-only indicators を header / graph / inspector / legend に維持する。
- no execution wording を明示する。

HTML/CSS first prototype が accessibility に向く理由:

- node card を native button として扱える。
- relation chip も button として扱える。
- focus order を DOM order で制御しやすい。
- screen reader 向けに reason / source / signals を Inspector で補完できる。

注意:

- relation chip が action chip に見えない wording にする。
- selected / highlighted は operation state ではなく local display state として説明する。
- compact density でも critical label を省略しない。

## 12. Risks and Mitigation

リスク:

- graph に見えにくい。
- edge 表現が弱い。
- static layout が過密化する。
- user が action UI と誤認する。
- relation chips が workflow step に見える。
- selected state が approval / operation target に見える。

mitigation:

- relation chips を semantic relation として明示する。
- Inspector と連動して reason / source / signals を読めるようにする。
- clear read-only labels を常時表示する。
- no command wording を徹底する。
- compact density を使う。
- collapse path first を維持する。
- positive / stable signals は subdued 表示にする。
- node card / edge chip に action verb を使わない。
- Legend に "relation is not workflow" の意味を含める。

## 13. Future Phases

候補 phase:

- B77-24 HTML/CSS static graph prototype implementation
- B77-25 SVG edge overlay prototype plan
- B77-26 SVG edge overlay implementation
- B77-27 package renderer spike decision

各 phase の位置付け:

- B77-24: no package / mock data / local state only の HTML/CSS static graph prototype を実装する候補 phase。
- B77-25: HTML/CSS prototype の edge expression が不足する場合に、SVG edge overlay を documentation phase として計画する。
- B77-26: SVG edge overlay を実装する場合の候補 phase。実施する場合も package 追加なしを前提にする。
- B77-27: React Flow / Cytoscape.js など package renderer を spike として評価するか判断する phase。

future phase の前提:

- B77-24 でも compare endpoint は `GET` only として維持する。
- B77-24 でも API / DB / Supabase integration は扱わない。
- B77-25 以降も package 追加は明示的な separate phase でのみ判断する。

## 14. 今回の範囲外

今回の範囲外:

- React implementation
- graph renderer implementation
- package install
- API integration
- DB integration
- Supabase integration
- Edge Function change
- mutation
- workflow execution
- renderer package evaluation spike
- SVG edge drawing
- layout engine design
- drag & drop
- zoom / pan

## 15. Explicit Prohibitions

B77-23 では次を変更しない。

- `apps/admin-dashboard/src/app`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- DB schema
- Edge Functions

B77-23 では次を追加しない。

- `npm install`
- `pnpm add`
- React Flow
- Cytoscape
- Mermaid
- D3
- renderer implementation
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

この document は static renderer prototype の計画であり、B77-24 implementation、package adoption、Graph Engine adoption、API / DB integration の開始条件ではない。
