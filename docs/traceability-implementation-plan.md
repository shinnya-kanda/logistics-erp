# Traceability Implementation Plan（Phase B8-02）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における traceability phase の実装導入計画を整理する。

event-driven implementation roadmap、distributed trace design、trace-id design、trace metadata schema、event identity、event time、event security を前提にすると、traceability は単に `trace_id` カラムを増やすことではない。`trace_id`、`parent_trace_id`、`request_id`、`idempotency_key`、`warehouse_code` の役割を分離し、inventory / pallet / warehouse location / external input / future workflow を後から説明できるように段階導入する必要がある。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- traceability implementation の目的
- 現在の trace_id 対応状況
- 未対応 domain / API の棚卸し
- `trace_id` / `parent_trace_id` / `request_id` の導入順序
- `inventory_transactions` 対応方針
- `pallet_transactions` 対応方針
- `warehouse_location_history` 対応方針
- trace-search 拡張方針
- Admin Dashboard 表示方針
- `idempotency_key` との関係
- `warehouse_code` boundary 方針
- backward compatibility 方針
- nullable / no backfill 方針
- implementation checklist
- rollout / verification 方針

---

## ■ traceability implementation の目的

traceability implementation は、業務操作、API request、source of truth、projection、workflow、audit、recovery を追跡できる状態へ段階的に近づけるための実装導入計画である。

目的:

- 1つの業務操作で作成された transaction / history を `trace_id` で束ねる
- 1回の API 実行を `request_id` で調査できるようにする
- 複数業務操作にまたがる流れを `parent_trace_id` で接続する
- inventory / pallet / warehouse location の履歴を横断検索できるようにする
- replay / rebuild / recovery / audit の調査軸を作る
- `warehouse_code` boundary を守った trace 検索を維持する
- 既存データ・既存API・既存UIを壊さず段階導入する

traceability は在庫数量の整合性そのものを担保しない。

数量の真実は引き続き `inventory_transactions` にあり、traceability は「なぜ・どの操作で・どの履歴が作られたか」を説明するための補助軸である。

---

## ■ 現在の trace_id 対応状況

現時点で対応済みまたは対応済みに近いもの:

### 設計

- `docs/trace-id-design.md`
- `docs/trace-id-db-design.md`
- `docs/trace-id-migration-plan.md`
- `docs/distributed-trace-design.md`
- `docs/trace-metadata-schema.md`
- `docs/event-identity-architecture.md`

これらにより、`trace_id`、`parent_trace_id`、`request_id`、`idempotency_key` の役割分離は整理済みである。

### DB / migration

- `inventory_transactions.trace_id` は一部 migration で追加済み
- `warehouse_location_history.trace_id` は nullable column として追加済み
- `trace_id` は初期導入では nullable を維持する方針
- NOT NULL 化、index 追加、backfill は初期方針として行わない

### Edge Functions / RPC

- `inventory-move` は `trace_id` write support 導入済み
- `inventory-out` は `trace_id` write support 導入済み
- idempotency replay 時に既存 transaction の `trace_id` を返す方針が導入済み
- `warehouse_code` は guard 由来を維持する方針

### Search / UI

- `trace-search` Edge Function が追加済み
- `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` の横断検索方針が導入済み
- Admin Dashboard に trace検索 UI が追加済み
- `trace_id` 完全一致、created_at asc、source 付与、guard.warehouseCode 絞り込みの方針がある

---

## ■ 未対応 domain / API の棚卸し

traceability phase では、未対応 domain / API を一度に実装せず、source of truth と業務リスクに応じて棚卸しする。

### inventory domain

対応済み:

- `inventory-move`
- `inventory-out`

未対応または要確認:

- `inventory-in`
- `inventory-adjust` 相当の将来処理
- Node `/inventory/in` / `/inventory/out` / `/inventory/move` の残存利用有無
- `rebuild_inventory_current` と traceability の関係

### pallet domain

未対応または要確認:

- `pallet-create`
- `pallet-item-add`
- `pallets-move`
- `pallets-out`
- `pallets-items-out`
- `pallets/project-no/update`
- `pallets/detail` の trace 表示
- `pallets/empty` の trace 関連有無

### warehouse location domain

未対応または要確認:

- `warehouse-location-create`
- `warehouse-locations/active/update`
- `warehouse-locations/check`
- 棚番 active 更新と `warehouse_location_history.trace_id` の接続

### scan / OCR / EDI / external input

未対応または将来検討:

- `POST /scans`
- OCR import / parse / corrected
- EDI file / message / accepted / rejected
- CSV / PDF upload
- external_file_hash / source_system / received_at

### workflow / shipment / billing

将来検討:

- shipment created / pick confirmed / outbound confirmed
- billing candidate / billing confirmed
- expected / actual reconciliation
- parent_trace_id による workflow trace

---

## ■ `trace_id` / `parent_trace_id` / `request_id` の導入順序

導入順序は、単一 `trace_id` を安定させてから `request_id`、`parent_trace_id` へ進む。

### Step 1: `trace_id` の新規書き込み対応拡大

対象:

- source of truth を作成する業務単位API
- 1 request で複数 transaction / history を作るAPI
- inventory / pallet / warehouse location の high risk domain

方針:

- 1リクエストにつき1つの `trace_id` をサーバー側で生成する
- RPC へ `p_trace_id text default null` のような互換的引数を検討する
- 既存レスポンス形式を壊さず、成功レスポンスへ optional に `trace_id` を追加する
- idempotency replay 時は既存 transaction の `trace_id` を返す

### Step 2: `request_id` のログ連携

対象:

- Edge Function request log
- error log / timeout / 500 調査
- external API / webhook / batch の受信単位

方針:

- `request_id` はAPI実行の観測IDとして扱う
- `request_id` を `trace_id` として流用しない
- DB保存するか、ログだけに残すかは将来検討に分離する
- まずは error / console log / response metadata の設計候補として整理する

### Step 3: `parent_trace_id` の設計導入

対象:

- OCR / EDI / shipment / billing の長い workflow
- replay / correction / recovery の元 trace 関係
- 複数 API に分かれる業務フロー

方針:

- `parent_trace_id` は trace 同士の親子関係を表す
- 個別 transaction ID や `idempotency_key` と混同しない
- 各履歴テーブルへ直接持たせるか、trace relation table を作るかは将来検討に分離する
- 初期段階では `trace_id` 単独検索を安定させる

---

## ■ `inventory_transactions` 対応方針

`inventory_transactions` は在庫数量変動の source of truth であり、traceability の最優先対象である。

対応方針:

- `trace_id` は nullable を維持する
- `inventory-in` / `inventory-move` / `inventory-out` / 将来の adjust を対象にする
- Edge Function で `trace_id` を生成し、RPC へ渡す方式を基本候補にする
- RPC 内で作成される複数 `inventory_transactions` 行へ同じ `trace_id` を保存する
- idempotency replay 時は既存行の `trace_id` を返す
- 成功レスポンスには optional field として `trace_id` を追加する方針を検討する

注意:

- `trace_id` は数量整合性を担保しない
- 在庫の真実は transaction row 自体である
- `trace_id` が NULL の既存行も正当な履歴として扱う
- `trace_id` の有無をデータ正当性判定に使わない

---

## ■ `pallet_transactions` 対応方針

`pallet_transactions` はパレット操作の source of truth であり、inventory と並ぶ high risk domain である。

対象候補:

- `pallet-create`
- `pallet-item-add`
- `pallets-move`
- `pallets-out`
- `pallets-items-out`
- project_no correction に関係する将来 event

対応方針:

- `pallet_transactions.trace_id` の nullable column 追加は将来 migration として個別検討する
- pallet 操作 API ごとに `trace_id` 生成・保存・返却方針を整理する
- パレット出庫と品番出庫のように inventory と pallet の両方に影響する操作では、同じ `trace_id` で関連付けることを検討する
- `pallet_units` は projection / cache であり、`trace_id` の主保存先にしない
- 必要な場合でも `created_trace_id` / `last_updated_trace_id` など補助 trace は将来検討に分離する

注意:

- `pallet_code` と `trace_id` を混同しない
- `pallet_transactions` の主キーや transaction id を `trace_id` として流用しない
- 実物流に関わる replay / correction は承認と audit を重視する

---

## ■ `warehouse_location_history` 対応方針

`warehouse_location_history` は棚番マスタ変更の監査ログであり、traceability では中優先度の対象である。

現状:

- nullable `trace_id` column は追加済み
- trace-search 対象として正式対応済み
- select column は実テーブルのカラムに合わせる必要がある

対応方針:

- 棚番作成 / active 更新 / 無効化など管理操作で `trace_id` を保存する方針を整理する
- `warehouse-location-create` と `warehouse-locations/active/update` の traceability 対応を候補にする
- `warehouse-locations/check` は read / validation API であり、通常は `trace_id` 保存対象ではなく request observability 対象として扱う
- admin 操作ログや operator metadata との接続を将来検討する

注意:

- 棚番 history は audit 対象であり、安易に削除しない
- trace-search では `warehouse_code` guard 絞り込みを維持する
- `trace_id` が NULL の history も既存履歴として許容する

---

## ■ trace-search 拡張方針

trace-search は、traceability phase の read-only 調査入口である。

現状の方針:

- `trace_id` 完全一致検索
- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- `source` field 付与
- `created_at asc`
- `warehouse_code` は guard.warehouseCode で絞る
- admin / chief / office のみ許可

拡張候補:

- `request_id` 検索
- `parent_trace_id` 検索
- trace chain 表示
- source row id の安定表示
- event_name / event_version 表示
- idempotency_key 表示
- operator metadata 表示
- replay / correction relation 表示
- archive data 検索

方針:

- 初期は `trace_id` 単独検索を安定させる
- parent / request 検索は保存先と権限が整理されてから検討する
- sensitive metadata は通常表示しない
- trace-search は便利だが情報集約リスクがあるため、role / warehouse_code 制御を維持する

---

## ■ Admin Dashboard 表示方針

Admin Dashboard は traceability の調査・監査入口になる。

現状:

- trace検索タブが追加済み
- `trace_id` 入力欄がある
- `source` / `event_type` / `warehouse_code` / `created_at` 等の一覧表示がある

表示方針:

- まずは read-only 表示を維持する
- trace_id がない履歴を異常扱いしない
- trace_id 検索は完全一致を基本にする
- warehouse_code boundary を越える表示はしない
- worker 向けには横断 trace search を提供しない方針を維持する
- request_id / parent_trace_id / replay metadata は将来拡張として扱う

将来候補:

- parent_trace_id timeline
- request_id からの API 実行調査
- replay / correction 関係表示
- workflow trace 表示
- source of truth row detail へのリンク
- CSV export / audit report

---

## ■ `idempotency_key` との関係整理

`trace_id` と `idempotency_key` は目的が異なる。

| ID | 主目的 | 生成単位 |
| --- | --- | --- |
| `trace_id` | 業務操作の追跡 | business operation |
| `idempotency_key` | 同一操作の二重実行防止 | retry-safe operation |
| `request_id` | API実行の観測 | API request |

方針:

- `idempotency_key` を `trace_id` として流用しない
- `trace_id` を二重実行防止の判定キーにしない
- 同じ idempotency replay では、既存 transaction の `trace_id` を返すことが望ましい
- `request_id` は再送ごとに変わり得るため idempotency 判定に使わない
- duplicate detection は1つのIDだけに依存しない

実装時の確認観点:

- idempotency replay の return path が既存 `trace_id` を返せるか
- 新規実行時と replay 時で response の `trace_id` が一貫するか
- idempotency_key が存在しないAPIで `trace_id` 生成だけが過剰な意味を持っていないか

---

## ■ `warehouse_code` boundary 方針

`warehouse_code` は traceability phase でも最重要の security boundary である。

方針:

- write API の `warehouse_code` は guard / authenticated profile 由来を維持する
- client payload の `warehouse_code` を信頼しない
- trace-search は guard.warehouseCode で絞る
- trace_id が一致しても warehouse boundary を越えて表示しない
- archive / replay / rebuild / future trace chain search でも warehouse_code boundary を維持する
- Admin Dashboard 表示でも sensitive metadata と warehouse boundary を分けて考える

注意:

- trace_id は一意に見えてもアクセス許可を意味しない
- warehouse 横断 trace が将来必要な場合は、別途 role / approval / audit を検討する

---

## ■ backward compatibility 方針

traceability 導入では既存API・既存UI・既存データを壊さない。

方針:

- request body に `trace_id` 必須を追加しない
- 既存レスポンスに必須 field として `trace_id` を要求しない
- 成功レスポンスへ追加する場合は optional field として扱う
- RPC 引数追加時は `p_trace_id text default null` を検討する
- 既存 function signature との衝突を避けるため、migration 時は古い signature の扱いを確認する
- trace_id が NULL の既存行を正当な履歴として扱う
- trace-search / Admin Dashboard は trace_id 対応済み行を中心に扱い、未対応行の存在をエラーにしない

注意:

- backward compatibility のために ID の意味を曖昧にしない
- `project_no` / `issue_no` / `pallet_code` / external id を trace_id 代替にしない

---

## ■ nullable / no backfill 方針

traceability phase では nullable / no backfill を基本とする。

nullable 方針:

- `trace_id` は当面 nullable とする
- 既存データに `trace_id` がないことを許容する
- 未対応APIで作成された新規行も移行期間中は NULL を許容する
- `trace_id` の有無をデータ正当性の判定に使わない

no backfill 方針:

- 既存行への推測 backfill は行わない
- 時刻が近い、operator が同じ、pallet_code が同じ、だけでは同一業務操作と判断しない
- backfill が必要な場合は別 phase / 別 migration とし、説明可能な範囲だけに限定する
- backfill より新規処理からの確実な trace_id 保存を優先する

index 方針:

- index は検索要件が見えた段階で検討する
- 初期 plan では index 追加を決定しない
- `warehouse_code + trace_id` 複合 index は実際の検索条件・データ量を見て判断する

---

## ■ implementation checklist

実装 phase ごとに、以下を確認する。

### DB / migration checklist

- 対象 source of truth table は何か
- `trace_id` column は既に存在するか
- nullable か
- NOT NULL / index / backfill を含めていないか
- comment は必要か
- 他テーブルへ不要な変更を入れていないか

### Edge Function checklist

- 1 request につき `trace_id` を1つ生成しているか
- `warehouse_code` は guard 由来か
- role guard を変更していないか
- request body に `trace_id` 必須を追加していないか
- 成功レスポンスの既存形式を壊していないか
- error response に sensitive metadata を出していないか

### RPC checklist

- `p_trace_id text default null` など後方互換を考慮しているか
- 旧 function signature との衝突を確認しているか
- idempotency replay 時に既存 row の `trace_id` を返せるか
- 複数 row / 複数 table に同じ `trace_id` を保存できるか
- 業務ロジックを変えていないか

### trace-search checklist

- `trace_id` 完全一致か
- guard.warehouseCode で絞っているか
- role 制御を維持しているか
- source field を付与しているか
- created_at asc で返しているか
- 存在しない column を select していないか
- sensitive metadata を過剰表示していないか

### Admin Dashboard checklist

- read-only 表示か
- 既存タブ・既存画面を壊していないか
- JWT / 認証取得方法を維持しているか
- trace_id 未入力時の扱いが明確か
- worker に横断検索を開放していないか

---

## ■ rollout / verification 方針

rollout は high risk domain から小さく進める。

推奨 rollout 順:

1. `inventory_transactions` 対応済み API の安定確認
2. 未対応 inventory API の棚卸し
3. `pallet_transactions` への nullable trace_id 対応検討
4. pallet 系 Edge Function / RPC 対応検討
5. `warehouse_location_history` への書き込み対応検討
6. trace-search / Admin Dashboard 表示確認
7. request_id log 連携設計
8. parent_trace_id / trace chain 設計

verification 観点:

- 新規書き込みで `trace_id` が保存される
- 同一業務操作の複数履歴で同じ `trace_id` になる
- idempotency replay で既存 `trace_id` が返る
- trace-search で対象 source を横断表示できる
- warehouse_code guard 絞り込みが効いている
- worker は trace-search できない
- created_at asc で表示される
- 既存 response / UI / business logic が壊れていない

実行確認候補:

- `git diff --check`
- `git status --short`
- Edge Function 単位の curl
- Admin Dashboard build
- driver-app build
- role 別 trace-search 確認
- warehouse_code 別 data isolation 確認

---

## ■ 今後の検討事項

以下は今回決定しない。

- `trace_id` の型を text のままにするか uuid に寄せるか
- `trace_id` を Edge Function 生成に統一するか RPC 生成を許可するか
- `request_id` をDBへ保存するかログだけにするか
- `parent_trace_id` を各履歴テーブルへ持たせるか relation table を作るか
- `pallet_transactions.trace_id` の migration timing
- `pallet_units` / `pallet_item_links` に補助 trace column を持たせるか
- trace-search で request_id / parent_trace_id 検索を提供するか
- Admin Dashboard の trace chain UI
- trace_id index / warehouse_code + trace_id index の追加時期
- 既存データ backfill の有無
- NOT NULL 化する対象と条件
- OCR / EDI / shipment / billing での trace 単位
- OpenTelemetry など外部 tracing との関係

---

## ■ 原則

traceability implementation は、既存 source of truth を壊さず、後から説明できる追跡軸を段階的に追加する取り組みである。

`trace_id`、`parent_trace_id`、`request_id`、`idempotency_key` を混同しない。

`trace_id` は nullable から始め、推測 backfill は行わない。

`warehouse_code` boundary は trace-search、Admin Dashboard、replay / rebuild、future trace chain search でも維持する。

まず単一 `trace_id` を安定させ、その後に `request_id` と `parent_trace_id` を段階的に導入する。
