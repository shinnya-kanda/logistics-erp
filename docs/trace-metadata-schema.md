# Trace Metadata Schema（Phase B7-76）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、trace / event / replay / audit / distributed trace で利用する metadata の標準構造を整理する。

`trace_id`、`parent_trace_id`、`request_id`、event taxonomy を導入しても、metadata の意味と粒度が揃っていなければ、後から業務の流れを正しく説明できない。

本ドキュメントでは以下を整理する。

- metadata schema の目的
- trace metadata と event metadata の違い
- 必須 metadata 候補
- optional metadata 候補
- inventory / pallet / shipment / OCR / EDI metadata
- `request_id` / `parent_trace_id` / `idempotency_key` の関係
- business identifier の扱い
- operator metadata
- replay metadata
- external system metadata
- metadata naming guideline
- metadata versioning
- metadata size / security / privacy 方針

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ metadata schema の目的

metadata schema は、trace や event に付随する補助情報を、同じ意味・同じ名前・同じ粒度で扱うための設計である。

目的:

- trace検索結果を業務担当者が理解しやすくする
- audit 時に「誰が・いつ・何を・なぜ」を説明しやすくする
- replay / rebuild の対象範囲を判断しやすくする
- distributed trace で親子関係や外部入力元を追いやすくする
- IDの意味混同を防ぐ
- 将来の metadata versioning の土台にする

metadata は「何でも入れる自由欄」ではない。

業務説明・監査・再構築に必要な情報を、意味を分けて持つための構造である。

---

## ■ trace metadata と event metadata の違い

### trace metadata

trace metadata は、1つの `trace_id` 全体に共通する情報である。

例:

- `trace_id`
- `parent_trace_id`
- `request_id`
- `warehouse_code`
- `business_mode`
- `source_system`
- `operator_id`
- `started_at`

用途:

- どの業務操作かを説明する
- どの上位 trace から派生したかを説明する
- APIリクエストや外部入力と紐づける

### event metadata

event metadata は、trace 内の個別 event に付随する情報である。

例:

- `event_name`
- `event_version`
- `transaction_type`
- `part_no`
- `quantity`
- `pallet_code`
- `location_code`
- `reason`

用途:

- 個別 event の意味を説明する
- transaction / history の詳細を補足する
- replay / recovery の可否判断に使う

### 原則

trace metadata は「操作全体の文脈」を表す。

event metadata は「個別に起きたことの詳細」を表す。

この2つを混同しない。

---

## ■ 必須 metadata 候補

将来的に trace / event を標準化する場合、以下は必須候補になる。

| metadata | 意味 | 備考 |
| --- | --- | --- |
| `trace_id` | 業務操作単位の追跡キー | 既存対応済み範囲あり |
| `warehouse_code` | 倉庫・拠点コード | guard 由来を基本とする |
| `event_name` | 業務イベント名 | event taxonomy に準拠 |
| `event_time` | event が発生した時刻 | `created_at` / `event_at` との整理が必要 |
| `source` | 元テーブル・元システム | trace-search の `source` と整合 |
| `schema_version` | metadata 構造のversion | 将来検討 |

ただし、現時点でDBやAPIに必須化しない。

初期段階では、既存データとの互換性を優先し、nullable / optional を許容する。

---

## ■ optional metadata 候補

optional metadata は、event の種類や業務モードによって存在する補助情報である。

候補:

- `parent_trace_id`
- `request_id`
- `idempotency_key`
- `business_mode`
- `project_no`
- `issue_no`
- `operator_id`
- `operator_role`
- `operator_name`
- `source_system`
- `external_file_id`
- `external_message_id`
- `shipment_id`
- `pallet_id`
- `pallet_code`
- `part_no`
- `quantity`
- `quantity_unit`
- `from_location_code`
- `to_location_code`
- `location_code`
- `reason`
- `replay_of_trace_id`
- `rebuild_of_trace_id`

optional であっても、意味を混同してはいけない。

特に `project_no` と `issue_no` は別の business identifier として分離する。

---

## ■ inventory metadata

inventory 系 event では、品番・数量・在庫区分・棚番を説明できる metadata が必要になる。

候補:

| metadata | 意味 |
| --- | --- |
| `part_no` | 品番 |
| `part_name` | 品名 |
| `quantity` | 数量 |
| `quantity_unit` | 数量単位 |
| `inventory_type` | 在庫区分 |
| `project_no` | 製番 / PJ NO |
| `mrp_key` | MRPキー |
| `location_code` | 対象棚番 |
| `from_location_code` | 移動元 / 出庫元棚番 |
| `to_location_code` | 移動先棚番 |
| `transaction_type` | 既存 transaction 種別 |
| `transaction_id` | 個別 transaction のID |

方針:

- 数量の真実は `inventory_transactions` に置く
- metadata は説明・検索・audit の補助とする
- `transaction_type` と `event_name` を混同しない

---

## ■ pallet metadata

pallet 系 event では、パレット・棚番・状態変更を説明できる metadata が必要になる。

候補:

| metadata | 意味 |
| --- | --- |
| `pallet_id` | パレット内部ID |
| `pallet_code` | 現場で扱うパレットコード |
| `pallet_unit_id` | 旧互換または補助ID |
| `project_no` | 製番 / PJ NO |
| `from_location_code` | 移動元棚番 |
| `to_location_code` | 移動先棚番 |
| `current_location_code` | 現在棚番 |
| `current_status` | 現在状態 |
| `transaction_type` | パレットtransaction種別 |
| `transaction_id` | 個別transaction ID |

方針:

- パレット履歴の真実は `pallet_transactions` を中心に説明する
- `pallet_units` の現在状態は派生キャッシュとして扱う
- 実物流に関わるmetadataは replay / audit で重要になる

---

## ■ shipment metadata

shipment 系 metadata は、出荷・請求・在庫更新を接続するために使う。

現時点では設計候補であり、実装を前提にしない。

候補:

- `shipment_id`
- `shipment_no`
- `customer_code`
- `customer_name`
- `ship_to_code`
- `scheduled_ship_date`
- `actual_ship_date`
- `billing_target`
- `billing_status`
- `pick_batch_id`
- `shipment_line_id`

方針:

- shipment は inventory / pallet / billing をつなぐ親業務になり得る
- 将来的には `parent_trace_id` と組み合わせて child trace を接続する
- 請求確定済み metadata は replay 禁止判定に関わる

---

## ■ OCR metadata

OCR metadata は、外部入力・読取結果・補正履歴を追うために使う。

候補:

- `ocr_document_id`
- `source_file_name`
- `source_file_hash`
- `ocr_engine`
- `ocr_engine_version`
- `parsed_at`
- `confidence_score`
- `corrected_by`
- `correction_reason`
- `page_no`
- `line_no`

方針:

- OCR入力は replay の起点になり得る
- 元ファイルや読取結果を追える情報を残す
- 個人情報や不要な全文データを metadata に入れすぎない

---

## ■ EDI metadata

EDI metadata は、ファイル・メッセージ・明細単位の外部入力を追うために使う。

候補:

- `edi_file_id`
- `edi_file_name`
- `edi_file_hash`
- `edi_message_id`
- `edi_message_type`
- `trading_partner_code`
- `received_at`
- `parsed_at`
- `line_no`
- `external_order_no`
- `external_ref_no`

方針:

- EDI は file / message / line の階層を持つ
- `parent_trace_id` を使って階層的に追跡する可能性がある
- 外部参照番号を `project_no` に流用しない

---

## ■ request_id / parent_trace_id / idempotency_key の関係

| metadata | 目的 | 生成単位 |
| --- | --- | --- |
| `request_id` | 1回のAPI実行を観測する | API request |
| `trace_id` | 1つの業務操作を追跡する | business operation |
| `parent_trace_id` | trace同士の親子関係を表す | trace chain |
| `idempotency_key` | 同一操作の二重実行を防ぐ | retry-safe operation |

原則:

- `request_id` を `trace_id` として流用しない
- `idempotency_key` を `trace_id` として流用しない
- `parent_trace_id` は個別transactionのIDではない
- replay では元 trace と新 trace を分離する
- 再送では `idempotency_key` は同じでも、`request_id` は変わり得る

---

## ■ business identifier の扱い

business identifier は、業務上の意味を持つIDである。

候補:

- `project_no`: コマツ金沢の製番 / PJ NO
- `issue_no`: ブリヂストンの発行NO
- `shipment_no`: 出荷番号
- `external_order_no`: 外部受注番号
- `external_ref_no`: 外部参照番号

方針:

- `project_no` と `issue_no` を混同しない
- 外部番号を安易に `project_no` へ入れない
- `business_mode` と組み合わせて意味を明確にする
- trace metadata では、業務識別子を個別フィールドとして保持する

IDは意味を持つ。metadata でも流用してはいけない。

---

## ■ operator metadata

operator metadata は、誰が操作したかを説明するために使う。

候補:

- `operator_id`
- `operator_role`
- `operator_name`
- `operator_email`
- `approved_by`
- `approved_at`

方針:

- audit に必要な最小限を保持する
- 表示名やメールアドレスは変更され得るため、内部IDを優先する
- 権限判定は metadata ではなく、実行時の guard / profile に基づく
- replay や recovery では実行者と承認者を分ける可能性がある

---

## ■ replay metadata

replay metadata は、元操作と再実行操作の関係を説明するために使う。

候補:

- `replay_of_trace_id`
- `replay_reason`
- `replay_requested_by`
- `replay_approved_by`
- `replay_mode`
- `dry_run`
- `replay_started_at`
- `replay_completed_at`
- `replay_result`

方針:

- 元 trace と replay trace を分離する
- replay 理由を必ず説明可能にする
- dry-run と本実行を区別する
- replay 結果を元履歴へ上書きしない

---

## ■ external system metadata

external system metadata は、OCR / EDI / webhook / API連携など、外部入力・外部送信を追うために使う。

候補:

- `source_system`
- `source_system_event_id`
- `external_file_id`
- `external_file_hash`
- `external_message_id`
- `external_request_id`
- `external_response_id`
- `webhook_id`
- `received_at`
- `sent_at`

方針:

- 外部システム側のIDと logistics-erp 側のIDを分離する
- 外部IDを内部主キーとして扱わない
- 外部送信済み event は replay 禁止や要承認の判定に関わる
- file hash は再取込・重複検知・forensic に有用である

---

## ■ metadata naming guideline

命名ルール:

- 小文字の snake_case を使う
- IDは末尾を `_id` にする
- 時刻は末尾を `_at` にする
- boolean は `is_` / `has_` / `can_` を使う
- 外部由来は `external_` または `source_` を使う
- replay 由来は `replay_` を使う
- 業務IDは意味ごとに分ける

例:

- `trace_id`
- `parent_trace_id`
- `request_id`
- `event_name`
- `event_version`
- `warehouse_code`
- `project_no`
- `issue_no`
- `operator_id`
- `source_system`
- `external_file_hash`
- `replay_of_trace_id`

避ける例:

- `id2`
- `ref`
- `number`
- `pj_or_issue_no`
- `operator`
- `data`
- `misc`

---

## ■ metadata versioning

metadata versioning は、metadata の構造や意味が変わった場合に互換性を保つための考え方である。

候補:

- `metadata_version`
- `event_schema_version`
- `source_schema_version`

例:

```json
{
  "event_name": "inventory.out.distributed",
  "event_version": 1,
  "metadata_version": 1,
  "metadata": {
    "warehouse_code": "KZ01",
    "part_no": "ABC-001",
    "quantity": 10
  }
}
```

初期段階では versioning を必須化しない。

ただし、OCR / EDI / shipment のように外部仕様変更の影響を受けるmetadataでは、将来的に versioning が重要になる。

---

## ■ metadata size 方針

metadata は大きくしすぎない。

方針:

- trace検索で必要な最小限を入れる
- 大きなOCR全文、PDF本文、EDI全文をそのまま入れない
- 大きな入力データは別ストレージまたは専用テーブルで管理する
- metadata には参照IDやhashを入れる
- 一覧表示に必要な値と詳細調査に必要な値を分ける

metadata は「軽量な説明情報」として扱う。

---

## ■ security / privacy 方針

metadata は監査や調査で閲覧される可能性があるため、security / privacy を考慮する。

方針:

- 個人情報を必要以上に入れない
- 認証情報・API key・token・secret を入れない
- 外部ファイル内容を無制限に入れない
- operator は内部IDを優先し、表示名やemailは必要な範囲に限定する
- `warehouse_code` によるアクセス制御を維持する
- admin / chief / office など、閲覧権限を分ける可能性を考慮する
- forensic に必要な情報と、通常画面に表示する情報を分ける

metadata は便利な調査情報である一方、情報漏えいリスクにもなる。

---

## ■ 導入段階案

### Step 1: metadata 候補の標準化

本ドキュメントの候補をもとに、domain ごとの metadata 名を揃える。

### Step 2: trace-search 表示との整合

trace-search で返す `source`、`event_type`、`warehouse_code`、`created_at` と metadata の関係を整理する。

### Step 3: event taxonomy との接続

`event_name` と metadata の必須・optional を event 種別ごとに整理する。

### Step 4: replay / audit への展開

replay 理由、承認者、元 trace などを metadata として扱う方針を固める。

### Step 5: versioning 検討

OCR / EDI / shipment など外部仕様の影響を受ける領域から metadata versioning を検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- metadata をDBへ保存するか、APIレスポンス上の正規化に留めるか
- `metadata jsonb` カラムを各履歴テーブルへ追加するか
- `trace_events` テーブルを新設して metadata を集約するか
- metadata versioning の具体的なカラム構成
- event name ごとの必須 metadata
- metadata の最大サイズ
- metadata に含める operator 情報の範囲
- external file の保存先
- OCR / EDI の全文保存方針
- replay metadata の保存先
- security / privacy review の運用
- admin-dashboard で表示する metadata の範囲
- OpenTelemetry など外部規格との対応有無

---

## ■ 原則

metadata は、trace や event の意味を説明するための補助情報である。

metadata にIDを入れる場合も、IDの意味を混同してはいけない。

`project_no`、`issue_no`、`request_id`、`trace_id`、`parent_trace_id`、`idempotency_key` はそれぞれ役割が違う。

metadata は必要最小限から始め、監査可能性・安全性・プライバシーを守りながら段階的に拡張する。
