# Request Chain / Parent Trace ID Design（Phase B9-16）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、単一の `trace_id` / `request_id` を超えて、複数 API・複数 transaction・複数業務イベントを親子関係で追跡できる request chain 設計を整理する。

logistics-erp では、在庫・パレット・棚番・OCR・EDI・shipment・billing が段階的につながっていく。単一 API の中で完結する操作だけでなく、外部入力から照合、在庫更新、出庫、請求候補まで続く業務の流れを後から説明できる必要がある。

この設計の目的は以下である。

- `request_id` / `trace_id` / `parent_trace_id` の違いを明確にする
- 複数 API にまたがる業務 chain を説明できるようにする
- trace timeline / trace relation UI の将来拡張方向を整理する
- compare-only / visibility / explainability を優先し、実装を急がない
- correction / replay / rebuild と request chain の関係を整理する
- 将来の distributed trace 化に備えた段階導入案を定義する

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・correction・replay・rebuild・自動同期は実装しない。

---

## ■ ID の役割整理

### `request_id`

`request_id` は、1回の API request / Edge Function 実行 / external callback / batch invocation を識別するための ID である。

主な役割:

- API 実行ログと DB 履歴を突き合わせる
- timeout / 500 error / retry の調査単位にする
- 同じ trace 内でどの HTTP request がどの transaction を作ったかを確認する
- trace timeline / trace relation UI で request 単位に grouping する

性質:

- API request ごとに生成される
- 同じ業務操作でも retry では変わり得る
- 業務上の同一性そのものではない
- `idempotency_key` とは異なり、二重実行防止を主目的にしない

例:

```text
request_id = req-001
  -> inventory_transactions rows
  -> pallet_transactions rows
```

### `trace_id`

`trace_id` は、1つの業務操作に属する履歴を束ねるための ID である。

主な役割:

- inventory / pallet / warehouse location の transaction / history を横断して束ねる
- trace-search / trace timeline の検索キーになる
- 業務操作の説明単位になる
- idempotency replay 時に同じ業務操作の結果を確認しやすくする

性質:

- 1つの業務操作を表す
- 複数 transaction / history に共有され得る
- transaction row の主キーではない
- 在庫数量の真実ではなく、説明・監査・調査の補助軸である

例:

```text
trace_id = pallet-move-001
  -> pallet_transactions MOVE
  -> inventory_transactions MOVE（将来連動する場合）
```

### `parent_trace_id`

`parent_trace_id` は、ある `trace_id` がどの上位業務 chain から派生したかを示す ID である。

主な役割:

- 複数 child trace を1つの上位業務へまとめる
- OCR / EDI / shipment / billing など長い業務 flow を説明する
- correction / replay / rebuild がどの元業務から派生したかを記録する
- 将来の distributed trace / workflow trace の親子関係を表現する

性質:

- 個別 request ではなく、上位業務の親 trace を指す
- transaction row の主キーではない
- 必ずしも全 transaction に最初から保存しない
- 初期導入では nullable / optional とし、強制しない

例:

```text
parent_trace_id = ocr-import-001
  -> trace_id = expected-create-001
  -> trace_id = actual-match-001
  -> trace_id = inventory-in-001
```

---

## ■ request chain の考え方

request chain は、`request_id`、`trace_id`、`parent_trace_id` を組み合わせて、業務の「実行単位」と「業務単位」と「上位業務単位」を分けて追跡する考え方である。

整理:

| ID | 粒度 | 主な問い | 例 |
| --- | --- | --- | --- |
| `request_id` | API実行 | どのリクエストで発生したか | Edge Function 1回 |
| `trace_id` | 業務操作 | どの操作に属する履歴か | 在庫入庫、PL移動 |
| `parent_trace_id` | 上位業務 chain | どの業務フローから派生したか | OCR取込、shipment |

request chain が答える問い:

- この在庫 transaction は、どの API request で作られたか
- この pallet transaction は、どの業務操作の一部か
- この出庫は、どの shipment / EDI / OCR から派生したか
- この correction は、どの元 trace を補正しているか
- この rebuild / replay は、どの chain を対象にしたか

初期方針:

- `trace_id` と `request_id` の可視化を先に安定させる
- `parent_trace_id` は設計上の余地として扱い、すぐに保存を強制しない
- chain 表示は compare-only / visibility から始める
- chain を根拠に自動 correction / replay / rebuild を実行しない

---

## ■ Domain 連携例

### Inventory

inventory domain の source of truth は `inventory_transactions` である。

request chain で追跡したいこと:

- 入庫 / 出庫 / 移動 / 調整がどの API request で発生したか
- その transaction がどの業務操作 trace に属するか
- shipment / OCR / EDI / pallet 操作から派生した在庫変動か

例:

```text
parent_trace_id = shipment-001
  -> trace_id = inventory-out-001
       request_id = req-inventory-out-001
       source = inventory_transactions
```

### Pallet

pallet domain の source of truth は `pallet_transactions` である。`pallet_units` / `pallet_item_links` は現在保管状態 read model として扱う。

request chain で追跡したいこと:

- パレット作成、品番紐付け、棚移動、出庫が同じ上位業務に属するか
- pallet move と inventory move を将来連動させる場合、どの chain で説明するか
- pallet item と inventory_current の差異調査で、どの操作が原因候補か

例:

```text
parent_trace_id = pallet-workflow-001
  -> trace_id = pallet-create-001
  -> trace_id = pallet-item-add-001
  -> trace_id = pallet-move-001
```

### Warehouse Location

warehouse location domain の履歴は `warehouse_location_history` で追跡する。

request chain で追跡したいこと:

- 棚番登録・有効化・無効化がどの request で行われたか
- 棚番変更が在庫移動やパレット移動の前後関係に影響したか
- warehouse boundary を越えた履歴混入がないか

例:

```text
trace_id = location-disable-001
  -> warehouse_location_history DISABLED
  -> related trace timeline investigation
```

### OCR

OCR は外部入力の起点になり得る。

request chain で追跡したいこと:

- OCRファイル取込から、Expected 作成、Actual 照合、在庫入庫までの流れ
- OCR 読み取り結果と人間の確認・補正の関係
- 誤読や補正がどの在庫 transaction に影響したか

例:

```text
parent_trace_id = ocr-file-import-001
  -> trace_id = ocr-parse-001
  -> trace_id = expected-create-001
  -> trace_id = actual-reconcile-001
  -> trace_id = inventory-in-001
```

### EDI

EDI はファイル、メッセージ、明細、shipment のような階層を持つ可能性がある。

request chain で追跡したいこと:

- EDI file / message / line がどの shipment を作ったか
- shipment からどの inventory / pallet operation が派生したか
- 外部システム再送や重複入力をどう説明するか

例:

```text
parent_trace_id = edi-file-001
  -> trace_id = edi-message-001
  -> trace_id = shipment-create-001
  -> trace_id = inventory-out-001
```

### Shipment

shipment は将来、出庫・請求・外部連携の中心になる可能性がある。

request chain で追跡したいこと:

- shipment 作成から、引当、ピッキング、出庫、請求候補までの流れ
- shipment 単位で関連する inventory / pallet transaction を説明する
- 請求候補の根拠を source of truth にたどれるようにする

例:

```text
parent_trace_id = shipment-001
  -> trace_id = picking-001
  -> trace_id = pallet-out-001
  -> trace_id = inventory-out-001
  -> trace_id = billing-candidate-001
```

---

## ■ Trace Timeline / Trace Relation UI との関係

現在の Admin Dashboard では、`trace_id` による trace-search / trace timeline / trace relation の可視化が導入されている。

現時点の役割:

- `trace-search`: source row を表形式で確認する
- `trace timeline`: `trace_id` 内のイベントを時系列で確認する
- `trace relation`: `request_id` 単位で同一 trace 内イベントの関連を確認する

request chain 導入後の拡張候補:

- `parent_trace_id` で関連 child trace を検索する
- parent trace と child trace を同じ画面で折りたたみ表示する
- request_id grouping と parent_trace grouping を分けて表示する
- OCR / EDI / shipment / correction / replay の関係を reason code として表示する

重要方針:

- UI は compare-only / visibility を目的とする
- UI から correction / replay / rebuild を自動実行しない
- source of truth と read model の責務を混同しない
- inventory / pallet / warehouse location の event source を明確に区別する

---

## ■ Compare-only / Visibility / Explainability との関係

request chain は、最初から automation のために導入しない。

初期目的:

- どの request / trace / parent trace で履歴が作られたかを見える化する
- 差異や障害の原因候補を説明しやすくする
- 現場・事務・管理者が「なぜこの在庫・パレット状態になったか」を確認できるようにする
- replay / rebuild / correction を行う前の調査材料を増やす

やらないこと:

- chain が見つかっただけで自動補正する
- parent trace 配下を自動 replay する
- read model を自動同期する
- projection drift を UI 上の操作だけで修正する

---

## ■ Correction / Replay / Rebuild との関係

### Correction

correction は commit 済みの業務履歴を削除・上書きせず、補正 transaction / event として説明する考え方である。

request chain との関係:

- correction trace は元 trace を参照する必要がある
- `parent_trace_id` に元業務 chain を入れるか、別 metadata で related_trace_id を持つかは将来検討する
- correction の UI / approval / reason は別設計とする

### Replay

replay は過去入力や操作を再実行する考え方である。

request chain との関係:

- replay 実行時の `request_id` は新しくなる
- replay trace は元 trace と混同しない
- `parent_trace_id` は「何を再実行したか」を説明する補助軸になり得る
- replay 実装は本ドキュメントでは行わない

### Rebuild

rebuild は source of truth から projection / read model を再構築する考え方である。

request chain との関係:

- parent trace を使うと rebuild 対象範囲を説明しやすくなる
- shipment / OCR / EDI 単位で関連 transaction を抽出しやすくなる
- rebuild 自体は source of truth を変更しない recovery 手段として設計する
- rebuild 実装は本ドキュメントでは行わない

---

## ■ 導入段階案

### Step 0: 設計整理

本ドキュメントで `request_id` / `trace_id` / `parent_trace_id` の役割を整理する。

この段階では実装しない。

### Step 1: 単一 trace の可視化を安定させる

対象:

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- trace-search
- trace timeline / trace relation UI

方針:

- `trace_id` と `request_id` の保存・表示を安定させる
- `warehouse_code` boundary を維持する
- nullable / no backfill を守る
- compare-only / read-only UI を維持する

### Step 2: parent trace の受け皿を設計する

検討対象:

- `parent_trace_id` を transaction table に持たせるか
- 別の trace relation table / event metadata に持たせるか
- Edge Function shared utility で `parentTraceId` を受け渡すか
- client payload 由来の `parent_trace_id` を許可するか
- external input / workflow / shipment で誰が parent を発行するか

この段階でも、まだ強制保存や NOT NULL 化はしない。

### Step 3: high risk domain から optional に保存する

候補:

- OCR import → inventory in
- EDI import → shipment → inventory out
- pallet workflow → pallet move / item out
- correction trace → original trace

方針:

- optional / nullable で保存する
- 既存 API の互換性を壊さない
- UI では parent chain を compare-only に表示する
- backfill は別検討にする

### Step 4: trace chain search を追加する

候補:

- `trace_id` から parent / child を検索する
- `parent_trace_id` から child traces を一覧する
- request_id / trace_id / parent_trace_id を同じ timeline に出す

方針:

- search は read-only とする
- correction / replay / rebuild 実行とは分離する
- permission / warehouse boundary を先に定義する

### Step 5: distributed trace 化を検討する

将来、API / workflow / external input / batch / queue が増えた場合に検討する。

候補:

- W3C Trace Context 相当の header 受け渡し
- `x-request-id` / `traceparent` / `parent_trace_id` の mapping
- Edge Function / Node API / external webhook の共通 trace context
- trace event catalog / relation table / observability dashboard

現時点では、OpenTelemetry や queue / workflow engine の導入を前提にしない。

---

## ■ 将来の Distributed Trace 化の方向性

将来の distributed trace 化では、技術的 trace と業務 trace を混同しない。

技術的 trace:

- API latency
- function invocation
- HTTP request / response
- retry / timeout
- service-to-service call

業務 trace:

- OCR取込
- inventory transaction
- pallet transaction
- shipment
- billing candidate
- correction / recovery

方針:

- 最初は業務 trace を優先する
- `request_id` は技術的 trace との接続点として扱う
- `trace_id` は業務操作の説明軸として扱う
- `parent_trace_id` は業務 chain の説明軸として扱う
- 将来 OpenTelemetry 等を導入する場合も、source of truth の責務は変えない

---

## ■ 今回は実装しない判断

Phase B9-16 では、設計ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- `parent_trace_id` 保存
- trace chain search
- correction
- replay
- rebuild
- 自動同期
- README変更

理由:

- `trace_id` / `request_id` の可視化が安定し始めた段階であり、親子 chain をすぐ義務化しない
- parent trace の保存場所、生成主体、warehouse boundary、external input との関係を先に整理する必要がある
- correction / replay / rebuild と結びつける前に、compare-only / visibility / explainability の用途で検証するべきである

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/trace-id-design.md`
- `docs/distributed-trace-design.md`
- `docs/traceability-implementation-plan.md`
- `docs/projection-consistency-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-projection-read-model.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

request chain は、現時点では監査・原因確認・説明可能性のための設計である。

`parent_trace_id` は強力な追跡軸になり得るが、保存を急ぐと ID の意味が曖昧になり、後から補正・replay・rebuild の責務が混ざる。まずは単一 trace の可視化を安定させ、次に optional / nullable な形で親子関係を導入する。
