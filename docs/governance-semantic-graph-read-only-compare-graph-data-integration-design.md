# Governance Semantic Graph Read-Only Compare Graph Data Integration Design

Phase B77-34 documentation.

このドキュメントは、B77-31 から B77-33 で追加した graph adapter type scaffolding、fixture-based graph adapter、compare response fixture adapter を前提に、将来 `compare-readonly` endpoint response を `InventoryIntegrityGraphData` として Graph UI に渡す場合の integration boundary を整理する documentation phase である。

今回は documentation only であり、API fetch implementation、Graph UI implementation、route change、DB query、Supabase call、mutation、POST、workflow execution は扱わない。

## 1. Purpose

read-only compare graph data integration design の目的は、`compare-readonly` response と Inventory Integrity Graph UI の接続境界を、実装前に read-only observability integration として固定することである。

この design が整理するもの:

- `compare-readonly` response と Graph UI の接続設計
- read-only graph integration の責務分離
- graph adapter responsibility
- UI responsibility
- fetch responsibility
- fallback responsibility
- unavailable / partial / unsupported metadata の表示方針

この design が整理しないもの:

- API fetch implementation
- Graph UI implementation
- route change
- DB query
- Supabase integration
- execution workflow
- mutation payload

B77-34 は implementation permission ではない。B77-34 は、B77-35 以降で integration spike や data source toggle を検討する前に、どの layer が何を担当し、どこで read-only boundary を維持するかを文書化する phase である。

## 2. Integration Architecture

将来の integration architecture は次の reading / projection chain として整理する。

```text
compare-readonly endpoint
↓
inventoryIntegrityFetchAdapter
↓
inventoryIntegrityAdapter
↓
inventoryIntegrityGraphAdapter
↓
InventoryIntegrityGraphData
↓
InventoryIntegrityGraphSection
↓
StaticGraphPrototype
```

各責務:

- `compare-readonly endpoint`: `GET` only の read-only source。`inventory_transactions` を truth source、`inventory_current` を compare target として読み、compare metadata chain を返す。
- `inventoryIntegrityFetchAdapter`: transport / fetch-result semantics を payload semantics に寄せる adapter。network execution や UI rendering の責務を持たない。
- `inventoryIntegrityAdapter`: raw/static source から normalized read-only projection を作る normalization boundary。graph rendering や UI state を持たない。
- `inventoryIntegrityGraphAdapter`: response metadata / fixture metadata を `InventoryIntegrityGraphData` に投影する pure function boundary。fetch せず、UI state を持たず、mutation しない。
- `InventoryIntegrityGraphData`: Graph UI rendering input。command payload、workflow state、approval request ではない。
- `InventoryIntegrityGraphSection`: graph data を受け取り、summary / inspector / view state の read-only UI composition を担当する候補。
- `StaticGraphPrototype`: nodes / edges / relation chips / SVG relation overlay を data-driven に描画する候補。execution canvas ではない。

この architecture は execution chain ではない。各 arrow は data interpretation / projection の順序であり、作業順序、承認経路、修復経路、現場指示を意味しない。

## 3. Boundary Definition

責務分離:

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| `compare-readonly` | source of truth compare response | `GET` only。correction / rebuild / replay / sync を実行しない |
| fetch adapter | transport | response envelope / payload semantics を整理する。Graph UI を知らない |
| inventory adapter | normalization | raw/static source を normalized read-only data に整える。Graph projection はしない |
| graph adapter | graph projection | metadata を summary / node / edge / graph metadata に投影する pure function |
| graph UI | rendering | `InventoryIntegrityGraphData` を表示する。data mutation はしない |
| inspector | read-only explanation | selected summary / node / edge の reason / source / signals を読む |

boundary の重要点:

- endpoint は source であり command authority ではない。
- fetch adapter は transport boundary であり business workflow ではない。
- inventory adapter は normalization boundary であり Graph UI state を持たない。
- graph adapter は projection boundary であり fetch / route / DB / UI rendering をしない。
- graph UI は rendering boundary であり correction / approval / remediation を開始しない。
- inspector は explanation boundary であり action panel ではない。

## 4. Data Flow

data flow は次の形に整理する。

```text
response
↓
metadata extraction
↓
graph metadata
↓
summaries
↓
nodes
↓
edges
↓
ui rendering
```

flow の意味:

- response: `compare-readonly` の read-only response。
- metadata extraction: response metadata から graph adapter が読む semantic metadata を抽出する。
- graph metadata: graph title、active layer、generatedAt、`GET` only、read-only boundary を作る。
- summaries: Graph Health / Risk / Evidence / Confidence / Stability / lifecycle summaries を生成する。
- nodes: severity / risk / evidence / confidence / freshness / stability / lifecycle nodes を生成する。
- edges: evidence -> confidence、freshness -> confidence、risk -> lifecycle などの semantic relation を生成する。
- ui rendering: Graph UI が `InventoryIntegrityGraphData` を data-driven に描画する。

この flow は実行命令ではない。metadata extraction、summary generation、node / edge projection、UI rendering は、すべて観測用の読み替えであり、inventory data change、approval、repair、sync、migration を開始しない。

## 5. Read-Only Contract

Graph Integration は次に限定する。

- Read Only
- Observability Only
- `GET` Only
- No Mutation

禁止:

- POST
- correction
- rebuild
- replay
- sync
- execution workflow
- approval workflow
- remediation workflow
- migration workflow
- inventory data change
- command payload generation

追加 boundary:

- graph adapter output は `InventoryIntegrityGraphData` であり command payload ではない。
- summary priority は reading order であり execution priority ではない。
- node selection は local UI state であり action target ではない。
- edge direction は semantic relation direction であり operation route ではない。
- inspector detail は explanation であり action recommendation ではない。

## 6. UI Integration Strategy

現在:

```text
inventoryIntegrityGraphMockData
↓
Graph UI
```

将来:

```text
InventoryIntegrityGraphData
↓
Graph UI
```

UI integration 方針:

- `InventoryIntegrityGraphSection` は将来 `graphData` を受け取れる data-driven structure へ移行する候補とする。
- `StaticGraphPrototype` は現在と同じく `nodes` / `edges` / `edgeSemanticsLegend` を受け取って描画する component として維持する。
- Inspector は `InventoryIntegrityGraphData` の `summaries` / `nodes` / `edges` を読む。
- active summary / selected node / selected edge / highlighted path は local UI state として扱う。
- Graph UI は fallback / unavailable / partial を表示できる必要があるが、action button を追加しない。

UI が行わないこと:

- API fetch
- route call implementation
- DB query
- Supabase call
- mutation
- workflow transition
- approval / remediation / sync / rebuild control

## 7. Adapter Integration Strategy

現在:

```text
fixture
↓
graph adapter
```

将来:

```text
compare response
↓
graph adapter
```

adapter integration 方針:

- `inventoryIntegrityGraphAdapter` は pure function を維持する。
- input は `unknown compareResponse` を受け、type guard と metadata extraction で安全に読む。
- compare response fixture と real compare response は同じ projection rule に寄せる。
- graph adapter は `fetch`、route call、Supabase client、DB query を持たない。
- graph adapter は `createUnavailableGraphData()` を fallback として維持する。
- graph adapter warnings は UI が read-only caveat として表示できる形にする。

adapter の責務:

- metadata extraction
- severity mapping
- summary mapping
- node mapping
- edge mapping
- unavailable fallback
- warnings collection

adapter の対象外:

- transport
- authentication
- authorization
- endpoint invocation
- React state
- UI rendering
- mutation

## 8. Fallback Strategy

失敗時 flow:

```text
compare unavailable
↓
createUnavailableGraphData()
↓
graph unavailable state
```

fallback triggers:

- compare response が `null` / `undefined`
- metadata がない
- metadata が object ではない
- required-like semantics が全くない
- unsupported metadata shape
- graph projection に必要な node / edge relation が成立しない

warnings 方針:

- `missing_metadata`: metadata がない。
- `unsupported_metadata_shape`: metadata が object として読めない。
- `missing_value`: expected semantic value が欠けている。
- `incomplete_fixture`: fixture / response が部分的である。
- `normalized_non_string_metadata`: object metadata から代表値を抽出した。
- `fallback_used`: unavailable graph に倒した。
- `adapter_unavailable`: adapter が graph projection を安全に継続できなかった。

fallback は実データ成功に見せない。fallback graph は unavailable state として表示し、positive / stable summary を強調しない。

## 9. Error Visibility

Graph UI へ伝えるべき error visibility:

- graph unavailable
- missing metadata
- partial metadata
- unsupported shape
- incomplete relation
- normalized non-string metadata

表示方針:

- Graph Header / metadata area に read-only / unavailable caveat を表示する候補とする。
- Summary Panel に `Graph Unavailable` または partial caveat summary を表示する候補とする。
- Inspector に warnings、reason、source、signals を read-only explanation として表示する候補とする。
- Relation Chips / Edge Legend に incomplete relation は execution route ではないことを表示する候補とする。

禁止:

- retry button
- repair button
- sync button
- rebuild button
- approve button
- correction button
- migration button
- action recommendation panel

error visibility は user が状態を読めるようにするための表示であり、復旧操作や承認操作の開始点ではない。

## 10. Loading Strategy

将来 integration phase で loading を扱う場合も、loading は workflow state ではなく view state として扱う。

候補 view states:

- `loading`: read-only data を読み込み中の表示状態。
- `loaded`: graph data を表示できる状態。
- `unavailable`: `createUnavailableGraphData()` を表示する状態。
- `partial`: warnings 付きで graph data を表示する状態。

注意:

- loading は execution progress ではない。
- loaded は correctness guarantee ではない。
- unavailable は repair instruction ではない。
- partial は approval待ちではない。
- retry / repair / sync の操作導線を同じ phase に入れない。

state machine として業務状態を管理するのではなく、Graph UI の view state として扱う。

## 11. Feature Flag Strategy

将来の切替候補:

- mock graph
- fixture graph
- real compare graph

切替方法候補:

- local development flag
- environment flag
- admin-only local toggle
- build-time constant
- query-less internal configuration

feature flag boundary:

- toggle は data source selection であり workflow transition ではない。
- real graph が unavailable の場合、mock graph に silently fallback しない。
- mock graph fallback を使う場合は `Mock Data` / `Fallback` caveat を明示する。
- feature flag は package install、route change、DB migration を伴わない別 phase で設計する。

B77-34 では feature flag を実装しない。

## 12. Future Phases

候補:

- B77-35 graph adapter integration spike
- B77-36 graph data source toggle
- B77-37 read-only graph integration implementation
- B77-38 graph unavailable state implementation

推奨順序:

1. B77-35: adapter integration spike を fixture / local function call の範囲で確認する。
2. B77-36: mock / fixture / real graph source toggle の design または local implementation を検討する。
3. B77-37: `compare-readonly` response を read-only fetch boundary から graph adapter に渡す implementation を検討する。
4. B77-38: unavailable / partial / warning visibility を Graph UI に出す implementation を検討する。

future phase の原則:

- fetch implementation は別 phase。
- route change は別 phase。
- UI integration は data-driven に限定する。
- `compare-readonly` は `GET` only として維持する。
- graph adapter は pure function として維持する。
- fallback は `createUnavailableGraphData()` を維持する。

## 13. Out of Scope

B77-34 の範囲外:

- API fetch implementation
- Graph UI implementation
- route change
- DB query
- Supabase call
- mutation
- POST
- package install
- graph behavior change
- execution workflow
- approval workflow
- remediation workflow
- migration workflow

変更禁止:

- `apps/admin-dashboard/src/app`
- `package.json`
- `pnpm-lock.yaml`
- `supabase`
- `migrations`
- DB schema
- Edge Functions
- `services/api`

追加禁止:

- `fetch`
- `createClient`
- mutation
- `POST`
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`

この document は、read-only compare graph data integration の接続境界を整理するための documentation であり、real data integration の実装開始ではない。
