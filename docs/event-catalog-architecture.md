# Event Catalog Architecture（Phase B7-89）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp に存在する domain event / integration event / projection / consumer / workflow dependency を整理・検索・追跡可能にする event catalog の考え方を整理する。

event governance、event versioning、event bus、projection consistency を進めるには、どの event がどの domain に属し、誰が生成し、誰が消費し、どの projection / workflow / replay / rebuild に影響するかを追える必要がある。

本ドキュメントでは以下を整理する。

- event catalog の目的
- event registry
- producer / consumer catalog
- domain ownership catalog
- projection dependency catalog
- workflow dependency catalog
- schema / version catalog
- replay / rebuild support catalog
- observability metadata catalog
- deprecated event catalog
- event lineage
- trace / event relationship catalog
- lightweight start 方針
- governance / security との関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event catalog の目的

event catalog は、event の意味・所有者・schema・依存関係・lifecycle を整理し、検索・追跡可能にするための台帳である。

目的:

- event name の重複や意味の衝突を防ぐ
- owner domain を明確にする
- producer / consumer の依存関係を追えるようにする
- projection / read model への影響を確認する
- workflow / saga の event chain を説明できる
- schema / version / deprecated の管理を支える
- replay / rebuild / observability の判断材料にする
- governance / security review の入口にする

event catalog は、単なるイベント名一覧ではない。

event がどこから発生し、どこへ伝播し、どの read model / workflow / audit に影響するかを説明するための管理情報である。

---

## ■ event registry の考え方

event registry は、event catalog の中心となる event 一覧である。

管理候補:

| 項目 | 意味 |
| --- | --- |
| `event_name` | event taxonomy に基づく安定名 |
| `event_type` | domain / integration / technical など |
| `owner_domain` | event の意味を所有する domain |
| `source_of_truth` | 根拠となる table / history / event store |
| `event_version` | event schema version |
| `metadata_version` | metadata schema version |
| `lifecycle` | proposed / approved / active / deprecated / archived |
| `description` | 業務上の意味 |

方針:

- event name は UI 表示名ではなく安定した機械名にする
- `transaction_type` をそのまま event name として登録しない
- owner domain が不明な event は登録しない
- active / deprecated / archived の状態を区別する
- event registry は governance review の入口になる

---

## ■ producer / consumer catalog

producer / consumer catalog は、event を生成する側と処理する側を整理する台帳である。

producer 管理候補:

- producer domain
- producer API / RPC / job
- source of truth
- event generation timing
- idempotency_key 利用有無
- trace_id / request_id 付与有無

consumer 管理候補:

- consumer name
- consumer domain
- consumer type
- projection updater
- workflow step
- monitoring aggregate
- external integration
- retry / duplicate handling
- dead-letter 対応

例:

| event | producer | consumer |
| --- | --- | --- |
| `inventory.out.distributed` | inventory command | `inventory_current` projection / monitoring |
| `pallet.move.completed` | pallet command | `pallet_units` projection / trace timeline |
| `edi.message.accepted` | EDI parser | shipment workflow |
| `shipment.outbound.confirmed` | shipment workflow | inventory / pallet / billing |

方針:

- producer は event の意味と schema を安定させる
- consumer は idempotent に処理する前提で設計する
- consumer が増える場合は owner domain と governance で影響確認する
- producer / consumer の依存関係は event bus 設計と接続する

---

## ■ domain ownership catalog

domain ownership catalog は、event と owner domain の対応を整理する。

目的:

- event の意味を誰が管理するか明確にする
- schema change の primary reviewer を決める
- replay / correction / deprecated 方針の責任を明確にする
- domain boundary を越えた意味変更を防ぐ

管理候補:

- event_name
- owner_domain
- reviewer domain
- consumer domain
- correction policy owner
- replay policy owner
- deprecated decision owner

方針:

- inventory は数量変動 event を所有する
- pallet はパレット物理状態 event を所有する
- shipment は出荷 workflow event を所有する
- OCR / EDI は外部入力と解析 event を所有する
- billing は請求確定と請求根拠 event を所有する
- owner domain と consumer domain を混同しない

---

## ■ projection dependency catalog

projection dependency catalog は、どの projection / read model がどの event / source of truth に依存するかを整理する。

対象候補:

- `inventory_current`
- `pallet_units`
- trace timeline
- billing summary
- workflow status
- monitoring aggregate
- admin dashboard read model

管理候補:

| projection | source event / table | refresh / rebuild |
| --- | --- | --- |
| `inventory_current` | `inventory_transactions` | rebuild 候補 |
| `pallet_units` | `pallet_transactions` | rebuild / validation 候補 |
| trace timeline | transactions / histories | query-time aggregation 候補 |
| billing summary | shipment / inventory / billing event | 将来検討 |
| workflow status | workflow event chain | 将来検討 |

方針:

- projection は source of truth ではない
- projection dependency は rebuild / diff detection の前提になる
- projection logic / schema version も将来 catalog 管理候補にする
- source event が deprecated になっても projection が読めるか確認する

---

## ■ workflow dependency catalog

workflow dependency catalog は、workflow / saga の step と event chain の依存関係を整理する。

対象候補:

- shipment workflow
- OCR workflow
- EDI workflow
- expected / actual reconciliation workflow
- billing workflow
- replay / recovery workflow

管理候補:

- workflow name
- workflow owner
- parent event
- step event
- step owner domain
- required predecessor event
- expected next event
- compensation event
- timeout / retry policy
- stuck detection rule

例:

```text
edi.file.received
  -> edi.file.parsed
  -> edi.message.accepted
  -> shipment.created
  -> shipment.pick.confirmed
  -> inventory.out.distributed
  -> billing.candidate_created
```

方針:

- workflow dependency は missing event / stuck workflow detection の前提になる
- workflow event chain の変更は consumer / projection / monitoring 影響を確認する
- compensation event も dependency として catalog に含めることを検討する

---

## ■ schema / version catalog

schema / version catalog は、event schema、metadata schema、projection schema の version を整理する。

管理候補:

- event_name
- event_version
- metadata_version
- event_schema_version
- projection_schema_version
- required fields
- optional fields
- compatibility policy
- schema owner
- deprecated version
- replacement version

方針:

- event versioning は immutable event を読み続けるために使う
- backward compatibility を確認できる情報を持つ
- projection / read model version は event version と分けて扱う
- schema registry 的な仕組みは将来検討とする
- 初期段階では Markdown / 管理表で十分な可能性がある

---

## ■ replay / rebuild support catalog

replay / rebuild support catalog は、event が replay / rebuild に使えるか、制約があるかを整理する。

管理候補:

| 項目 | 意味 |
| --- | --- |
| `replay_supported` | replay 対象にできるか |
| `replay_requires_approval` | 承認が必要か |
| `replay_forbidden_reason` | 禁止理由 |
| `rebuild_supported` | projection rebuild に使えるか |
| `correction_event` | 補正 event 候補 |
| `external_input_required` | 元ファイル等が必要か |

例:

- OCR parse event は replay 候補
- inventory transaction は元履歴更新ではなく correction transaction 候補
- billing confirmed event は replay 禁止または強い承認候補
- external sent event は replay 制限候補

方針:

- replay と idempotency retry を混同しない
- rebuild は source of truth を根拠にする
- replay / rebuild の判断材料を event catalog に集約することを検討する

---

## ■ observability metadata catalog

observability metadata catalog は、event / projection / workflow を監視するために必要な metadata を整理する。

候補:

- `trace_id`
- `parent_trace_id`
- `request_id`
- `warehouse_code`
- `event_name`
- `event_version`
- `source`
- `created_at`
- `producer`
- `consumer`
- `projection_name`
- `retry_count`
- `last_error`
- `dead_letter_reason`

用途:

- trace timeline
- workflow stuck detection
- projection lag monitoring
- dead-letter monitoring
- replay monitoring
- integrity check

方針:

- observability metadata は業務IDと技術観測IDを混同しない
- `warehouse_code` は guard 由来など信頼できる値を使う
- metadata は必要最小限から始める
- sensitive metadata を監視用途で過剰に拡散しない

---

## ■ deprecated event catalog

deprecated event catalog は、新規生成を停止または縮小する event を整理する。

管理候補:

- deprecated event name
- owner domain
- deprecated reason
- replacement event
- deprecated date
- active producer stop status
- consumer support status
- projection support status
- replay / rebuild support
- archive / audit handling

方針:

- deprecated event を削除しない
- projection / replay / audit は deprecated event を読めるようにする
- replacement event との関係を明示する
- external / integration event の deprecated は consumer domain と調整する

deprecated catalog は、過去 event を長期的に解釈するための重要な情報である。

---

## ■ event lineage の考え方

event lineage は、ある event がどの入力・前段 event・workflow から生まれ、どの後続 event / projection に影響したかを追跡する考え方である。

lineage の対象:

- external input
- source event
- derived event
- correction event
- replay event
- projection
- workflow step
- integration event

例:

```text
edi.file.received
  -> edi.message.accepted
  -> shipment.created
  -> inventory.out.distributed
  -> inventory_current projection
```

方針:

- event lineage は trace_id / parent_trace_id と接続する
- source of truth と projection の関係を説明できるようにする
- correction / replay event は元 event との関係を残す
- lineage は audit / forensic / recovery の重要な起点になる

---

## ■ trace / event relationship catalog

trace / event relationship catalog は、trace_id、parent_trace_id、request_id、event の関係を整理する。

管理候補:

- event_name
- trace_id scope
- parent_trace_id usage
- request_id usage
- idempotency_key usage
- source table
- trace-search support
- archive search support

方針:

- `trace_id` は1つの業務操作を束ねる
- `parent_trace_id` は業務フロー全体や親子関係を表す
- `request_id` はAPI実行を観測する
- `idempotency_key` は二重実行防止であり、trace_id と混同しない
- event catalog は trace-search / future trace chain search の意味確認に使えるようにする

---

## ■ lightweight start 方針

event catalog は重要だが、最初からDBや専用UIを作ると管理負荷が増える。

lightweight start の候補:

- Markdown の event catalog 表から始める
- domain event / integration event の代表候補を整理する
- producer / consumer / projection の主要依存だけを記録する
- deprecated / replay / rebuild の判断が必要な event から優先する
- trace-search で表示される source / event_type との対応を整理する
- governance review のチェックリストとして使う

方針:

- まず event name、owner domain、source of truth を固める
- 次に producer / consumer、projection、workflow dependency を追加する
- schema registry やDB化は、event 数や consumer 数が増えてから検討する
- catalog は最新であることが重要なので、重すぎる運用にしない

---

## ■ governance / security との関係整理

### governance

event catalog は governance の実行基盤になる。

用途:

- event name の重複防止
- owner domain の確認
- schema change 影響確認
- deprecated event 管理
- replay / rebuild support 確認
- workflow / consumer 影響確認

### security

event catalog は security review の入力にもなる。

用途:

- sensitive metadata の確認
- consumer への metadata 配送範囲確認
- warehouse_code boundary の確認
- replay / rebuild 権限確認
- audit / forensic view の表示範囲確認

方針:

- catalog は governance / security の共通参照情報にする
- catalog 自体にも閲覧・編集権限を検討する
- sensitive な external file path や秘密情報を catalog に書かない
- catalog は設計情報であり、source of truth の代替ではない

---

## ■ 導入段階案

### Step 1: event registry 最小版を作る

event_name、owner_domain、event_type、source_of_truth、description を整理する。

### Step 2: producer / consumer を追加する

主要な command、projection updater、workflow step、monitoring consumer を紐づける。

### Step 3: projection / workflow dependency を追加する

`inventory_current`、`pallet_units`、trace timeline、billing summary、workflow status との依存を整理する。

### Step 4: version / deprecated / replay 情報を追加する

event_version、metadata_version、deprecated、replay / rebuild support を整理する。

### Step 5: governance review に接続する

新規 event / schema change / consumer 追加時に catalog 更新を review 観点へ含める。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event catalog をDBで管理するか
- event catalog をMarkdown / YAML / JSON / code で管理するか
- event catalog UI を作るか
- admin-dashboard で event catalog を表示するか
- event registry の正式 schema
- producer / consumer registry の正式 schema
- consumer dependency を自動検出するか
- schema registry と統合するか
- governance review と catalog 更新をCIで確認するか
- deprecated event の運用期間
- replay / rebuild support の正式分類
- sensitive metadata catalog の管理方法
- trace-search と event catalog を連携するか
- event lineage を自動生成するか

---

## ■ 原則

event catalog は、event を検索・追跡・統制するための台帳である。

event name、owner domain、source of truth、producer、consumer、projection、workflow dependency を分けて整理する。

catalog は source of truth ではないが、source of truth を安全に使うための設計情報である。

軽量に始め、event 数・consumer 数・workflow 依存が増えた段階で段階的に拡張する。

catalog は governance / security / replay / rebuild / observability の共通言語になる。
