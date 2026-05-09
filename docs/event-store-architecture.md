# Event Store Architecture（Phase B7-82）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event store の役割、source of truth、projection、append-only event architecture、rebuild / replay の前提構造を整理する。

logistics-erp では、`inventory_transactions`、`pallet_transactions`、`warehouse_location_history` のような履歴テーブルが、業務上の事実を説明する真実ログとして機能している。一方で、`inventory_current` や `pallet_units.current_location_code` のような現在状態は、業務操作の結果を高速に参照するための派生状態である。

本ドキュメントでは以下を整理する。

- event store の目的
- append-only architecture
- source of truth
- projection / read model
- `inventory_current` と ledger の関係
- `pallet_units` cache
- rebuild / replay の前提
- immutable event
- correction event
- snapshot
- distributed event store の将来像
- audit / forensic / recovery との関係
- event ordering
- consistency と eventual consistency

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event store の目的

event store は、業務上発生した事実を、後から再構築・監査・調査できる形で保存するための考え方である。

目的:

- 業務上「何が起きたか」を履歴として残す
- 現在状態の根拠を説明できる
- rebuild により派生状態を再作成できる
- replay / correction の元情報を保持できる
- audit / forensic / recovery の起点になる
- distributed trace / workflow / saga の event chain を支える

event store は、単なるログ置き場ではない。

業務状態を説明するための source of truth であり、projection や read model は event store から導出される。

---

## ■ append-only architecture の考え方

append-only architecture は、過去の event を更新・削除せず、新しい event を追加して履歴を積み上げる考え方である。

logistics-erp では、以下の考え方を基本にする。

- 過去の真実ログを安易に update / delete しない
- 誤りは correction event として追加する
- replay は元 event を上書きせず、新しい trace / event として扱う
- rebuild は event 列から派生状態を再計算する
- audit では元 event と補正 event の両方を確認できるようにする

append-only は、誤りを訂正しないという意味ではない。

誤りを消すのではなく、訂正した事実も新しい event として残すという意味である。

---

## ■ source of truth の考え方

source of truth は、業務上の事実を説明する根拠データである。

現時点の logistics-erp では、以下を source of truth として扱う。

| domain | source of truth 候補 |
| --- | --- |
| inventory | `inventory_transactions` |
| pallet | `pallet_transactions` |
| warehouse location | `warehouse_location_history` |
| shipment | 将来の shipment event / shipment history |
| OCR / EDI | 将来の external input event / parsed event |
| billing | 将来の billing event / billing history |

方針:

- source of truth は現在状態ではなく履歴を優先する
- 派生キャッシュを真実として扱わない
- source of truth は trace_id / parent_trace_id / metadata と接続できるようにする
- source of truth の補正は update / delete ではなく correction event を基本にする

---

## ■ projection / read model の考え方

projection は、event store から利用目的に合わせて作られる派生状態である。

read model は、画面表示・検索・集計・API応答を高速化するための読み取り用モデルである。

例:

| projection / read model | 元になる event store |
| --- | --- |
| `inventory_current` | `inventory_transactions` |
| `pallet_units.current_location_code` | `pallet_transactions` |
| trace timeline | `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` |
| shipment status | 将来の shipment event |
| billing candidate summary | 将来の shipment / inventory / billing event |

方針:

- projection は再作成できることを目指す
- read model の不整合は rebuild / validation で検出する
- read model を直接の監査根拠にしない
- 性能上必要な current table は許容するが、真実ログとの関係を保つ

---

## ■ inventory_current と ledger の関係

`inventory_transactions` は在庫数量変動の ledger である。

`inventory_current` は、その ledger から導出される現在在庫 projection として扱う。

関係:

```text
inventory_transactions
  -> aggregate by warehouse_code / location_code / part_no / stock_type
  -> inventory_current
```

方針:

- 数量変動の根拠は `inventory_transactions` に置く
- `inventory_current` は高速参照用の派生状態として扱う
- rebuild では `inventory_transactions` から `inventory_current` を再計算できることを目指す
- `inventory_current` と ledger がずれた場合、ledger を優先して差分を検出する
- 誤った数量は元 transaction を更新せず、補正 transaction / correction event で説明する

注意:

- `inventory_current` が存在しても ledger の保持を省略しない
- ledger と current の差分は integrity monitoring の対象になる
- idempotency は二重実行防止であり、ledger の完全性全体を保証するものではない

---

## ■ pallet_units cache の考え方

`pallet_transactions` はパレット操作の履歴である。

`pallet_units` は、パレットの現在状態を参照するための cache / projection として扱う。

例:

```text
pallet_transactions
  -> latest location / status / project_no
  -> pallet_units
```

方針:

- パレットの移動・出庫・補正の根拠は `pallet_transactions` に置く
- `pallet_units.current_location_code` は現在位置 cache として扱う
- `pallet_units` の値は `pallet_transactions` から検証できることを目指す
- 誤移動は既存履歴を削除せず、逆方向 move や correction event で説明する
- 実物流と連動するため、replay / correction は承認と監査性を重視する

注意:

- cache が正しくても履歴が欠落している場合、audit では説明不足になる
- cache を直接直すだけでは trace integrity は回復しない
- rebuild 可能性を維持するため、履歴の粒度と event ordering が重要になる

---

## ■ rebuild / replay の前提整理

### rebuild

rebuild は、event store から projection / read model を再構築する処理である。

例:

- `inventory_transactions` から `inventory_current` を再構築する
- `pallet_transactions` から `pallet_units` の現在位置を検証する
- shipment / billing の集計を event から再作成する

方針:

- rebuild の根拠は source of truth に置く
- 派生キャッシュを真実として扱わない
- rebuild 結果と現行 projection の差分を検出できるようにする
- rebuild に必要な最低データを retention / archive でも保持する

### replay

replay は、過去の入力・event・trace を参照し、新しい操作として再実行する考え方である。

方針:

- 元 event を上書きしない
- replay は新しい `trace_id` を持つことを基本にする
- 元 trace との関係を `parent_trace_id` または replay metadata で説明する
- replay 結果は event store に新しい event として追加する
- replay と idempotency retry を混同しない

---

## ■ immutable event の考え方

immutable event は、発生後に意味や内容を変更しない event である。

目的:

- audit 時に過去の事実を説明できる
- forensic 時に改ざんや補正の経緯を追える
- rebuild / replay の入力として信頼できる
- distributed trace chain を後から再現できる

方針:

- immutable event は update / delete を前提にしない
- 誤りがあっても元 event は残す
- 補正は correction event として追加する
- metadata の意味が後から変わらないように命名と versioning を検討する

完全な event sourcing を今すぐ採用するわけではない。

ただし、監査可能なERP履歴として、immutable event の考え方を段階的に取り入れる。

---

## ■ correction event の考え方

correction event は、過去の誤りや不整合を、元 event を消さずに補正するための event である。

例:

| 誤り | correction event 候補 |
| --- | --- |
| 誤った入庫 | 調整 transaction / `inventory.adjust.created` |
| 誤った出庫 | 逆方向の補正 transaction |
| 誤ったパレット移動 | 正しい棚番への追加 move event |
| OCR誤読 | `ocr.corrected` |
| Expected / Actual 差異 | `actual.reconciled` |
| 請求候補誤り | `billing.corrected` |

方針:

- correction event は元 event を消すものではない
- correction event は元 event / trace との関係を持つ
- 補正理由、実行者、承認者を metadata として扱うことを検討する
- 請求・出荷・実物流に関わる補正は承認を強くする

---

## ■ snapshot の考え方

snapshot は、ある時点の projection や集計状態を保存し、rebuild の高速化や比較に使う考え方である。

用途候補:

- 大量の `inventory_transactions` からの rebuild を高速化する
- パレット現在状態の定期検証基準にする
- 月次・日次の請求候補集計を固定する
- archive 前後で整合性を確認する

注意:

- snapshot は source of truth ではない
- snapshot は event store を置き換えない
- snapshot 作成時点、対象範囲、元 event range を説明できる必要がある
- snapshot と event store の差分検証が必要になる

方針:

- 初期段階では snapshot 導入を急がない
- データ量・rebuild 時間・監査要件が明確になった段階で検討する
- snapshot を使う場合でも、event store の保持と traceability を維持する

---

## ■ distributed event store の将来像

distributed event store は、複数 domain の event store を trace chain で接続し、業務全体を横断して説明する考え方である。

将来像:

```text
OCR / EDI event store
  -> expected / actual event store
  -> shipment event store
  -> inventory event store
  -> pallet event store
  -> billing event store
```

接続軸:

- `trace_id`
- `parent_trace_id`
- `request_id`
- event name
- metadata
- business identifier
- external file hash

方針:

- すべての event を最初から1つの巨大テーブルへ集約するとは限らない
- domain ごとの source of truth を尊重する
- cross-domain の関係は trace / metadata / integration event で説明する
- warehouse_code によるデータ境界を維持する
- distributed event store は audit / replay / recovery / monitoring の基盤になる

---

## ■ audit / forensic / recovery との関係

### audit

audit では、event store により「誰が・いつ・何を・なぜ行ったか」を説明する。

必要な観点:

- 元 event
- correction event
- trace_id / parent_trace_id
- operator metadata
- request_id
- source_system / external input

### forensic

forensic では、障害・不正・不整合の原因を調査する。

event store があると、以下を確認しやすい。

- partial write があったか
- missing event があるか
- duplicate event があるか
- replay / correction が元 event と対応しているか
- projection が source of truth とずれているか

### recovery

recovery では、event store を根拠に正しい業務状態へ戻す。

例:

- projection を rebuild する
- stuck workflow を再開する
- missing event を recovery / correction として補う
- duplicate event を補正 transaction で調整する

recovery は、過去 event を消すことではない。

event store から説明可能な形で業務状態を回復することである。

---

## ■ event ordering の考え方

event ordering は、event の発生順序をどう解釈するかの考え方である。

主な ordering 軸:

- `created_at`
- DB sequence / transaction id
- domain-specific event number
- trace chain 上の parent / child relation
- workflow step order

注意:

- `created_at` だけでは完全な順序を保証できない場合がある
- 複数 domain の event は同時並行で発生し得る
- retry / idempotency replay / timeout により観測順と業務順がずれることがある
- external input の受信時刻と処理時刻は別である

方針:

- 単一 local transaction 内ではDB transaction の整合性を優先する
- cross-domain では `parent_trace_id` / workflow step / event metadata で業務順を補足する
- audit では event time と processing time を混同しない
- event ordering の不明点は metadata と observability で説明可能にする

---

## ■ consistency と eventual consistency の関係整理

consistency は、業務状態が矛盾なく説明できる状態である。

eventual consistency は、複数 domain の状態が即時に一致しなくても、event chain と後続処理により最終的に整合する考え方である。

整理:

| 項目 | consistency | eventual consistency |
| --- | --- | --- |
| 主な範囲 | local transaction / projection 検証 | cross-domain workflow |
| 成立タイミング | commit 時または検証時 | 後続 event 完了後 |
| 失敗時 | rollback / validation error | retry / compensation / recovery |
| 観測 | trace consistency / rebuild diff | workflow observability / stuck detection |

方針:

- 在庫数量など即時整合が必要な範囲は local transaction で守る
- shipment / OCR / EDI / billing のような長い業務フローでは eventual consistency を検討する
- eventual consistency は不整合放置ではなく、監視・検知・補正を含む
- projection と source of truth の差分は integrity monitoring の対象にする

---

## ■ 導入段階案

### Step 1: 既存 source of truth の明確化

`inventory_transactions`、`pallet_transactions`、`warehouse_location_history` を真実ログとして整理する。

### Step 2: projection との対応表作成

`inventory_current`、`pallet_units`、trace timeline などの projection が、どの event store から導出されるか整理する。

### Step 3: rebuild 可能性の検証

既存 ledger から current / cache を再構築できるか、差分検出の観点を整理する。

### Step 4: correction event 方針整理

domain ごとに、誤りを update / delete ではなく correction event で扱う方針を整理する。

### Step 5: distributed event store 検討

shipment / OCR / EDI / billing の event store を、trace chain でどう接続するか検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- 汎用 `event_store` / `trace_events` テーブルを新設するか
- domain ごとの履歴テーブルを event store として継続するか
- event schema / event versioning の具体構成
- event ordering 用の sequence を導入するか
- projection rebuild job を作るか
- `inventory_current` rebuild の正式手順
- `pallet_units` rebuild / validation の正式手順
- snapshot を導入するか
- snapshot の保存先・粒度・保持期間
- correction event の正式 event name
- correction event と元 event の関連保存方法
- distributed event store の検索API
- archive 後の event store 参照方式
- event store と OpenTelemetry の対応
- event store への権限・監査ポリシー

---

## ■ 原則

event store は、業務事実を説明する source of truth である。

projection / read model / cache は、event store から導出される派生状態である。

真実ログを安易に更新・削除しない。

誤りは correction event として説明可能に補正する。

rebuild / replay / recovery は、event store と trace chain を根拠に行う。
