# Governance Semantic Graph Data Source Toggle Design

Phase B77-36 documentation.

このドキュメントは、B77-35 graph adapter integration spike で確認した `mock` / `adapter` / `fallback` の local source switching を前提に、将来の read-only graph integration に進む前の Graph Data Source Toggle の正式設計を整理する documentation phase である。

今回は documentation only であり、UI implementation、fetch implementation、route change、environment flag implementation、query parameter implementation、real compare integration、DB query、Supabase call、mutation、POST、workflow execution は扱わない。

## 1. Purpose

graph data source toggle design の目的は、Inventory Integrity Graph UI がどの `InventoryIntegrityGraphData` source を読むかを、安全な read-only observability boundary として整理することである。

B77-35 spike から正式設計へ進む理由:

- B77-35 では `mock graph`、`adapter graph`、`fallback graph` が同じ `InventoryIntegrityGraphData` contract で `StaticGraphPrototype` に渡せることを確認した。
- spike の local toggle は rendering compatibility の確認であり、production source selection policy ではない。
- 次に real compare data へ進む前に、source mode、trust level、default source、feature flag、fallback、warning visibility を設計として固定する必要がある。
- fixture と real data の表示差を明示しないと、fixture output が実データ、fallback output が正常データとして誤読されるリスクがある。
- `compare-readonly` endpoint は `GET` only の read-only source として維持し、Graph UI は command payload や workflow state を持たない必要がある。

この document は implementation permission ではない。B77-36 は source toggle の方針を整理する documentation phase であり、UI、fetch、route、env flag、query parameter、real compare integration を実装しない。

## 2. Source Mode Candidates

Graph Data Source Toggle の候補 mode は次の通り。

| Mode | Meaning | Use | Required disclosure |
| --- | --- | --- | --- |
| `mock` | 既存の static mock graph data を表示する mode | UI layout、readability、accessibility、demo 表示の確認 | `Mock Data / モックデータ`, `Not Live Compare Data / 実データではありません` |
| `adapter_fixture` | graph adapter 用の fixture metadata を `InventoryIntegrityGraphData` に projection する mode | adapter mapping、summary / node / edge contract、warning visibility の確認 | `Fixture Adapter / フィクスチャアダプタ`, `Adapter Verification Only / アダプタ確認用` |
| `compare_fixture` | compare response shape に近い static fixture を adapter に渡す mode | real response shape に近い metadata extraction、unsupported shape handling の確認 | `Compare Fixture / 比較レスポンスフィクスチャ`, `Not Live Compare Data / 実データではありません` |
| `real_compare_readonly` | `compare-readonly` の `GET` only response を graph adapter に渡す mode | 将来の read-only integration、本番候補の graph source | `Read-only Compare Data / 読み取り専用比較データ`, `GET Only / GET のみ` |
| `fallback_unavailable` | `createUnavailableGraphData()` による unavailable graph を表示する mode | adapter failure、missing metadata、unsupported response shape、fetch failure の安全側表示 | `Graph Unavailable / グラフ利用不可`, `Fallback / フォールバック` |

各 mode の注意点:

- `mock` は UI confirmation 用であり、在庫整合性の真実や compare result を示さない。
- `adapter_fixture` は pure adapter の projection 確認用であり、live compare data ではない。
- `compare_fixture` は response shape verification 用であり、現場データや production compare status を示さない。
- `real_compare_readonly` は read-only source であっても correctness guarantee ではない。Graph UI は観測表示であり、修正、承認、再構築、同期を開始しない。
- `fallback_unavailable` は graph が使えないことを安全に示す state であり、正常 data や成功状態に見せない。

## 3. Default Source Strategy

default source は environment と readiness により変える。ただし default source の選択は workflow transition ではなく display source selection である。

Recommended defaults:

| Context | Recommended default | Reason |
| --- | --- | --- |
| development | `mock` or `adapter_fixture` | UI stability と adapter projection を API なしで確認できる |
| review / demo | `adapter_fixture` | mock-only ではなく adapter output rendering compatibility を示せる |
| production initial | `mock` or `fallback_unavailable` until real compare is verified | real compare integration の誤表示を避け、未検証 source を本番 default にしない |
| production after gate | `real_compare_readonly` only after explicit enablement | GET-only、fallback、warning disclosure、build/test が確認されてから有効化する |

default source policy:

- `real_compare_readonly` は明示有効化のみとする。
- real compare が unavailable の場合、silent に `mock` へ戻さない。
- fallback を使う場合は `Graph Unavailable` と `Fallback` を明示する。
- source mode は persisted workflow state ではなく、local view state または configuration として扱う。
- production initial では optimistic default を避け、未検証 real compare を自動表示しない。

## 4. Feature Flag Strategy

Feature flag は source selection の手段であり、execution workflow や approval workflow ではない。B77-36 では実装しない。

| Candidate | Pros | Cons | Boundary |
| --- | --- | --- | --- |
| local UI toggle | 確認しやすく、B77-35 spike と同じ操作感で mock / fixture / fallback を比較できる | production UI に残ると実行操作や本番切替に見える可能性がある | admin/debug only、display change only、no command wording |
| constant flag | 実装が単純で build 内 behavior を固定しやすい | 切替に code change が必要で、environment 別運用に弱い | source selection constant であり workflow flag ではない |
| environment variable | environment ごとに default を変えられる | deployment 設定ミスで real compare が意図せず有効になるリスクがある | explicit allow-list、production default conservative |
| build-time flag | bundle 単位で source mode を固定できる | runtime 切替ができず、review 時の比較には不向き | release configuration であり execution permission ではない |
| query parameter | temporary review に便利で共有しやすい | URL で本番表示が変わるため誤表示・漏洩・support 混乱のリスクがある | production disabled or admin-only guarded |
| admin-only debug toggle | production-like 環境で限定確認できる | admin/debug UI の存在自体が操作導線に見える可能性がある | clearly labeled debug display source, no retry / no repair |

推奨:

- development / review では local UI toggle または constant flag を候補にする。
- production initial では environment variable か build-time flag を conservative default に寄せる。
- query parameter は実装する場合も production disabled を原則にする。
- admin-only debug toggle は source disclosure と read-only caveat を必須にする。

## 5. Source Trust Level

source trust level は correctness guarantee ではなく、user が表示の性質を誤読しないための disclosure policy である。

| Source mode | Trust level | Interpretation |
| --- | --- | --- |
| `mock` | demo only | UI layout / wording / accessibility 確認用。現場データではない |
| `adapter_fixture` | adapter verification only | adapter projection の確認用。live compare result ではない |
| `compare_fixture` | shape verification only | response shape extraction の確認用。real source ではない |
| `real_compare_readonly` | real read-only source | `compare-readonly` GET response 由来。ただし Graph UI は観測表示のみ |
| `fallback_unavailable` | safety fallback | source や adapter が安全に読めない場合の unavailable state |

trust wording:

- `demo only` は production data を示さない。
- `adapter verification only` は mapping success を示すが business correctness を保証しない。
- `shape verification only` は response compatibility を示すが live source ではない。
- `real read-only source` は read-only compare data であり、execution permission ではない。
- `safety fallback` は graph unavailable を示し、正常状態ではない。

## 6. UI Disclosure Strategy

Graph UI は source mode を Graph Header / metadata area / Inspector などで明示する必要がある。mode badge は visual decoration ではなく、read-only boundary と source trust level の説明である。

Mode-specific disclosure:

| Mode | Required UI wording |
| --- | --- |
| `mock` | `Mock Data / モックデータ`, `Demo Only / デモ用`, `Not Live Compare Data / 実データではありません` |
| `adapter_fixture` | `Fixture Adapter / フィクスチャアダプタ`, `Adapter Verification Only / アダプタ確認用`, `Not Live Compare Data / 実データではありません` |
| `compare_fixture` | `Compare Fixture / 比較レスポンスフィクスチャ`, `Shape Verification Only / 形状確認用`, `Not Live Compare Data / 実データではありません` |
| `real_compare_readonly` | `Read-only Compare Data / 読み取り専用比較データ`, `GET Only / GET のみ`, `Observability Only / 観測専用` |
| `fallback_unavailable` | `Graph Unavailable / グラフ利用不可`, `Fallback / フォールバック`, `Adapter Graph Unavailable / アダプタグラフ利用不可` |

Common disclosure:

- `Read Only / 読み取り専用`
- `Observability Only / 観測専用`
- `No Execution Controls / 実行操作なし`
- `No API Write / 書き込み API なし`
- `No DB Mutation / DB 変更なし`
- `No Execution Route / 実行経路ではありません`

Placement candidates:

- Graph Header: source mode、trust level、GET only、read-only boundary。
- Summary Panel: unavailable / partial / fixture caveat を短く表示。
- Inspector: warnings、source、reason、signals を detail として表示。
- Legend: source badge と no execution meaning を補助説明。

## 7. Fallback Strategy

すべての unsafe / unsupported source state は `createUnavailableGraphData()` に安全側 fallback できる設計とする。

Fallback triggers:

- adapter failure
- missing metadata
- unsupported response shape
- fetch failure in a future phase
- graph adapter warnings that block safe graph projection
- missing summary / node / edge relation
- unsupported source mode
- `real_compare_readonly` が disabled または gate 未達

Fallback behavior:

- `fallback_unavailable` mode として明示する。
- `Graph Unavailable` summary を最優先に表示する。
- positive / stable summary を強調しない。
- unavailable reason、source、signals を Inspector に出す。
- fallback から `mock` へ silent fallback しない。
- fallback は repair instruction ではない。

Fallback output:

```text
unsafe or unavailable source
↓
createUnavailableGraphData()
↓
InventoryIntegrityGraphData
↓
Graph UI unavailable display
```

この flow は execution flow ではない。read-only unavailable projection の表示順であり、retry、repair、sync、rebuild を開始しない。

## 8. Warning Strategy

warnings は action prompt ではなく read-only caveat として表示する。

Display candidates:

- compact warning badge in Graph Header
- inspector caveat section
- graph metadata caveat row
- source mode detail in Summary Panel
- unavailable summary when warnings block projection

Warning examples:

- `missing_metadata`
- `unsupported_metadata_shape`
- `missing_value`
- `incomplete_fixture`
- `normalized_non_string_metadata`
- `incomplete_relation`
- `fallback_used`
- `adapter_unavailable`
- `graph_unavailable`

Warning display rules:

- warning は compact に表示し、詳細は Inspector で読む。
- warning count や warning code は execution priority として扱わない。
- warning がある real data を正常完了のように表示しない。
- `fallback_used` は必ず source / header / inspector のいずれかで見えるようにする。
- `normalized_non_string_metadata` は partial / shape caveat として扱う。

禁止:

- retry button
- rebuild button
- repair button
- sync button
- approve button
- correction button
- action recommendation panel

## 9. Read-only Boundary

source toggle は次に限定する。

- read-only
- observability-only
- local view state or configuration
- no mutation
- no execution workflow

重要な boundary:

- source toggle は data source selection であり、workflow transition ではない。
- source mode は business state ではない。
- source mode は approval status ではない。
- source mode は repair / correction / rebuild / sync の開始条件ではない。
- source mode は command payload ではない。
- `InventoryIntegrityGraphData` は visualization input であり execution request ではない。
- `compare-readonly` は `GET` only として維持する。

Implementation phase で維持する禁止事項:

- API write
- DB mutation
- route mutation
- execution workflow
- approval workflow
- remediation workflow
- automatic repair
- silent source fallback from real to mock

## 10. Real Compare Integration Gate

`real_compare_readonly` を有効にする条件は、次の gate をすべて満たすこととする。

Gate conditions:

1. `compare-readonly` が `GET` only として確認済みである。
2. graph adapter が real-like response / compare fixture を安全に `InventoryIntegrityGraphData` へ projection できる。
3. `createUnavailableGraphData()` fallback が adapter failure / missing metadata / unsupported shape で確認済みである。
4. Graph UI が `fallback_unavailable` を正常 data と誤認しない表示になっている。
5. source disclosure が Graph Header / Inspector / Legend のいずれかで明示されている。
6. adapter warnings が compact badge と detail caveat で表示できる。
7. no POST / no mutation / no DB write / no execution workflow が確認済みである。
8. build / type check / lint が成功している。
9. production default が explicit enablement なしに `real_compare_readonly` へ切り替わらない。
10. real compare failure が `mock` に silent fallback しない。

Gate failure behavior:

- `real_compare_readonly` を有効化しない。
- `fallback_unavailable` または conservative default を表示する。
- warning / unavailable caveat を明示する。
- retry / repair / sync / rebuild の操作導線を追加しない。

## 11. Risk / Mitigation

| Risk | Impact | Mitigation |
| --- | --- | --- |
| fixture を実データと誤認する | review / demo で現場状態と誤解される | mode badge、`Not Live Compare Data`、fixture wording |
| fallback を正常データと誤認する | graph unavailable を stable state と誤読する | `Graph Unavailable` summary、warning tone、positive summary を出さない |
| real data toggle が本番で誤表示される | 未検証 real compare が production default になる | explicit enablement、conservative production default、gate checklist |
| warning が見落とされる | partial / unsupported data が正常に見える | compact warning badge、Inspector caveat、header caveat |
| UI toggle が実行操作に見える | source selection が workflow action と誤読される | no command wording、display-only label、admin/debug only |
| real compare failure が mock に隠れる | real source の障害が見えない | no silent fallback to mock、fallback visible |
| source mode が persisted business state に見える | source selection が approval / operation state と誤読される | local view state wording、configuration wording、no workflow terminology |

Additional mitigation:

- `Read Only / 読み取り専用` を常時表示する。
- `Observability Only / 観測専用` を Graph Header と Inspector に置く。
- `No Execution Controls / 実行操作なし` を toggle 近くに表示する。
- warning details は Inspector に集約し、action button と並べない。
- production source mode は admin/debug または explicit configuration に限定する。

## 12. Future Implementation Proposal

Future phases:

- B77-37 graph data source toggle implementation
  - B77-36 の mode / disclosure / default source policy を最小 UI 実装へ反映する。
  - implementation は local source selection から始め、real fetch は含めない候補とする。

- B77-38 read-only compare graph integration
  - `real_compare_readonly` を `GET` only boundary で graph adapter に渡す integration を検討する。
  - fetch / transport boundary は Graph UI から分離する。

- B77-39 graph unavailable state refinement
  - fallback graph、warning badge、Inspector caveat、unavailable summary の readability を調整する。
  - fallback を正常 data に見せない UI を確認する。

- B77-40 real compare data validation review
  - real compare response shape、adapter warnings、metadata completeness、production default gate を review する。
  - production enablement 前に no POST / no mutation / GET only を再確認する。

Implementation order recommendation:

1. source toggle implementation を fixture / fallback のみで固める。
2. unavailable / warning display を UI と accessibility 観点で確認する。
3. real compare integration gate を満たした後に `real_compare_readonly` を別 phase で検討する。
4. production default は最後に決める。

## 13. Out of Scope

B77-36 の対象外:

- UI implementation
- fetch implementation
- route change
- env flag implementation
- query parameter implementation
- real compare integration
- DB query
- Supabase integration
- mutation
- POST
- workflow execution
- approval workflow
- remediation workflow
- package install
- graph renderer change

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
- mutation implementation
- `POST` implementation
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`

この document は、Graph Data Source Toggle の正式設計を read-only observability boundary として固定するための documentation であり、real compare integration や source toggle implementation の開始ではない。
