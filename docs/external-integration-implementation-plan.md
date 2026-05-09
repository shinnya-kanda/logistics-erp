# External Integration Implementation Plan（Phase B8-07）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における OCR / EDI / CSV / Excel / external API / NAS / external system との連携導入計画を整理する。

ERP設計憲法、開発ルール、workflow / saga implementation plan、event contract architecture、event security architecture、distributed trace design、traceability implementation plan、event validation、event governance を前提にすると、external integration は単なる file import / API 呼び出しではない。外部入力は信頼境界の外から来るため、source of truth に直結させず、identity、file hash、trace、validation、manual review、warehouse boundary、audit を通して段階的に業務データへ変換する必要がある。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- external integration implementation の目的
- OCR integration 方針
- EDI integration 方針
- CSV / Excel integration 方針
- external API integration 方針
- NAS / local file integration 方針
- external event / trace 方針
- external identity / file hash 方針
- external validation 方針
- retry / replay / duplicate 方針
- warehouse boundary 方針
- observability / audit 方針
- manual review / approval 方針
- rollout / verification 方針
- lightweight integration 方針
- future optional architecture

---

## ■ external integration implementation の目的

external integration implementation は、外部システム・外部ファイル・現場ファイル運用を、logistics-erp の source of truth / traceability / workflow / audit へ安全に接続するための導入計画である。

目的:

- 外部入力をそのまま正解データとして扱わない
- OCR / EDI / CSV / Excel / NAS / external API の受信単位を追跡できるようにする
- external id と internal id を分離する
- external_file_hash / source_system / received_at を重複検知・forensic の軸にする
- parse / validate / review / accepted / rejected / corrected を分離する
- Expected / Actual / shipment / inventory / billing へ進む前に validation / manual review を挟む
- replay / retry / duplicate を混同しない
- warehouse_code boundary を外部連携でも維持する
- 外部連携の失敗を observability / recovery / audit へ接続する

external integration は、自動化のために外部データを無条件に取り込むことではない。

現場運用を壊さず、Excel / CSV / NAS などの既存運用を残しながら、確認可能な単位で DB 中心の業務へ寄せるための段階導入である。

---

## ■ OCR integration 方針

OCR integration は、PDF / 画像 / 紙帳票由来の入力を読み取り、確認・補正・確定を経て Expected / Actual / shipment / inventory へつなげる外部入力 workflow である。

想定 flow:

```text
ocr.import.received
  -> ocr.import.parsed
  -> ocr.import.corrected
  -> expected.created
  -> actual.matched
  -> inventory.in.created
```

方針:

- OCR 抽出結果をそのまま source of truth にしない
- OCR result は「候補データ」として扱い、人間による確認・補正を分ける
- 読取元 file、file hash、source_system、received_at、parser version を将来 metadata 候補にする
- OCR誤読は update で上書きせず、corrected / reconciled の event として説明する
- OCR retry と OCR replay を混同しない
- OCR replay は元 trace / external input と新 trace を分離する
- 個人情報や帳票全文を metadata に入れすぎない

manual review 候補:

- OCR confidence が低い
- business identifier が欠落している
- project_no / issue_no の意味が不明
- warehouse_code を特定できない
- Expected / Actual の照合で mismatch が発生した

---

## ■ EDI integration 方針

EDI integration は、外部 partner / system から受信する file / message / line 単位のデータを、shipment / inventory / billing などの workflow へ接続する外部連携である。

想定 flow:

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

- EDI は file / message / line の階層を持つものとして扱う
- external_message_id を internal primary key として扱わない
- source_system + external_message_id / external_file_hash で外部同一性を検討する
- accepted / rejected / corrected を分離する
- EDI schema change は event contract / governance / impact analysis の対象にする
- EDI duplicate は自動削除せず、manual review / dead-letter / recovery 候補にする
- 外部送信済み EDI event の replay は禁止または強い approval 候補にする

manual review 候補:

- schema version を解釈できない
- required metadata が欠落している
- external file hash が重複している
- warehouse_code が既存業務境界と一致しない
- shipment / order / business identifier が重複している

---

## ■ CSV / Excel integration 方針

CSV / Excel integration は、現場運用・事務運用・移行期間における重要な中間手段である。

方針:

- CSV / Excel 運用を否定しない
- upload された内容を即 source of truth にしない
- parse / validate / preview / accepted / rejected / corrected を分離する
- file name ではなく file hash / upload batch / source_system を同一性候補にする
- Excel の列名変更やフォーマット差異は schema / contract 変更として扱う
- import 結果は trace / request_id / operator と接続することを検討する
- CSV / Excel export は audit / evidence として使えるが、source of truth ではない

確認観点:

- required column が揃っているか
- project_no / issue_no / pallet_code / part_no の意味が混同されていないか
- quantity / unit / date / warehouse_code が妥当か
- duplicate row / duplicate file がないか
- upload operator と warehouse_code が一致するか

初期導入では、CSV / Excel を現場移行の補助とし、完全自動 import より preview / manual review を優先する。

---

## ■ external API integration 方針

external API integration は、外部 system との API 受信・送信・webhook・同期処理を扱う連携である。

対象候補:

- external API polling
- webhook received
- shipment / order API
- OCR service API
- EDI partner API
- external notification API

方針:

- external API request / response を internal primary key と混同しない
- external_request_id / external_response_id / source_system_event_id は external identity として扱う
- request_id は API 実行の観測IDとして扱う
- timeout / retry / idempotency / replay を分離する
- external API failure は source of truth 破壊ではなく integration failure / workflow stuck として扱う
- 外部送信済み event は replay 禁止または要承認候補にする
- token / secret / API key を metadata に入れない

retry 方針:

- 一時的な API failure は retry 候補
- retry には idempotency / duplicate handling が必要
- retry で回復しないものは dead-letter / manual review / recovery 候補
- replay は過去入力を新しい操作として再実行するものであり、単純 retry と混同しない

---

## ■ NAS / local file integration 方針

NAS / local file integration は、現場や事務所の共有フォルダ、ローカルファイル、手動配置ファイルを取り込む連携である。

方針:

- NAS / local file は信頼境界の外として扱う
- file path を業務 identity として扱わない
- file hash、file size、modified_at、received_at、source_system を同一性候補にする
- file move / rename / overwrite による同一性の崩れに注意する
- NAS 参照パスやファイル本文を通常 metadata に入れすぎない
- access control / warehouse_code / operator を考慮する
- file disappearance / partial copy / locked file は integration failure として扱う

検知候補:

- file hash duplicate
- partial file
- unreadable file
- unexpected file format
- wrong folder / wrong warehouse
- file modified during import
- archive reference mismatch

初期導入では、NAS watcher や自動取込 job を作らず、ファイル同一性と手動確認の方針整理を優先する。

---

## ■ external event / trace 方針

external event / trace は、外部入力・外部送信を logistics-erp の trace chain へ接続するための考え方である。

対象候補:

- OCR import trace
- EDI file trace
- CSV upload trace
- external API request trace
- NAS file import trace
- external sent event trace

方針:

- 外部入力は workflow の起点になり得る
- `trace_id` は取り込み・parse・accepted などの業務操作を束ねる
- `parent_trace_id` は file / message / shipment / inventory などの階層を接続する候補とする
- `request_id` は API / webhook / upload の受信単位を観測する
- 外部 ID を `trace_id` として流用しない
- trace-search / audit view では source_system / external_file_hash を補助情報として扱う

例:

```text
parent_trace_id = edi.file.received
  -> trace_id = edi.message.accepted
  -> trace_id = shipment.created
  -> trace_id = inventory.out.distributed
```

---

## ■ external identity / file hash 方針

external identity は、外部 system 側の識別子やファイル同一性を表す情報である。

候補:

- source_system
- source_system_event_id
- external_file_id
- external_file_hash
- external_message_id
- external_request_id
- external_response_id
- webhook_id
- file_name
- file_size
- received_at

方針:

- external ID と internal ID を分離する
- external ID を internal primary key として扱わない
- file hash は duplicate detection / forensic / replay planning の重要候補とする
- file name / path だけで同一性を判断しない
- source_system と external ID の組み合わせで意味を固定する
- external identity の欠落は validation warning / error / manual review 候補にする

注意:

- external ID は外部 system 側で再利用・変更・欠落する可能性がある
- duplicate detection は1つのIDだけに依存しない
- file hash は便利だが、同一内容の再送と同一業務操作は区別が必要である

---

## ■ external validation 方針

external validation は、外部入力が schema / metadata / identity / time / warehouse boundary / security の観点で業務に使える状態か確認する方針である。

検証候補:

- file / message schema を解釈できるか
- required field が揃っているか
- source_system が明確か
- external_file_hash / external_message_id が妥当か
- project_no / issue_no / business identifier が混同されていないか
- event_time / received_at / processed_at が不自然でないか
- warehouse_code boundary と矛盾しないか
- sensitive metadata / secret が混入していないか
- duplicate / missing / orphan がないか

方針:

- validation failure を silent skip しない
- warning / error / manual review / dead-letter / recovery を分類する
- external input を source of truth に直結させない
- accepted / rejected / corrected を分離する
- validation result は observability / audit / recovery の入力にする

---

## ■ retry / replay / duplicate 方針

retry、replay、duplicate detection は目的が異なる。

| 項目 | 主目的 | 例 |
| --- | --- | --- |
| retry | 一時的な失敗を再試行する | external API timeout 後の再送 |
| replay | 過去入力・trace を参照し新しい操作として再実行する | OCR補正後の再処理 |
| duplicate detection | 二重入力・二重処理を検出する | 同じ file hash の再取込 |

方針:

- retry と replay を混同しない
- idempotency_key を trace_id として流用しない
- replay は元 trace と新 trace を分離する
- duplicate を検出しても自動削除しない
- duplicate は skip / investigation / correction / recovery の対象にする
- 外部送信済み event の replay は要承認または禁止候補にする

duplicate 候補:

- same external_file_hash
- same source_system + external_message_id
- same external_request_id
- same business identifier
- same idempotency_key
- same trace_id に不自然な複数 accepted event

---

## ■ warehouse boundary 方針

external integration でも `warehouse_code` boundary を維持する。

方針:

- warehouse_code は guard / authenticated profile / trusted mapping 由来を基本とする
- client payload / external file 内の warehouse_code を無条件に信頼しない
- external input の warehouse_code は validation / mapping / manual review 対象にする
- trace-search / audit / forensic でも warehouse_code で絞る
- external file / archive / cold storage にも warehouse boundary を維持する
- cross-warehouse integration が必要な場合は別途 approval / audit / role を検討する

注意:

- trace_id や external_file_hash が一致しても warehouse boundary を越えてよいとは限らない
- warehouse mismatch は validation / security incident 候補にする
- external system 側の拠点コードと logistics-erp の warehouse_code は mapping が必要になる可能性がある

---

## ■ observability / audit 方針

external integration は observability / audit の対象である。

観測候補:

- import received count
- parse success / failure count
- validation warning / error count
- duplicate file count
- external API retry / timeout count
- replay count
- correction count
- manual review count
- warehouse_code 別 import count
- source_system 別 failure count

audit / forensic 候補:

- source_system
- external_file_hash
- external_message_id
- request_id
- trace_id / parent_trace_id
- received_at / processed_at
- operator / approver
- validation result
- accepted / rejected / corrected reason
- replay_of_trace_id

方針:

- 外部入力の取り込み経路を後から説明できるようにする
- external file 本文や sensitive payload を通常 metadata に入れすぎない
- forensic 用の詳細情報と通常業務表示を分ける
- external integration failure は workflow stuck / recovery / manual review へ接続する

---

## ■ manual review / approval 方針

manual review は、外部入力を自動で業務 source of truth へ進めるには危険な場合に、人間が判断する正式な経路である。

manual review 候補:

- OCR confidence が低い
- EDI schema が解釈できない
- CSV / Excel の required column が欠落している
- file hash duplicate がある
- warehouse_code mapping に疑義がある
- business identifier が重複している
- external API response が不完全
- 外部送信済み event の replay が必要
- 請求・実物流に影響する correction が必要

review に必要な情報:

- source_system
- file / message identity
- external_file_hash
- affected warehouse_code
- validation result
- suggested action
- affected trace_id / parent_trace_id
- operator / approver
- before / after diff

方針:

- manual review は例外ではなく正式な integration workflow step として扱う
- worker に任意 replay / correction / integration recovery 権限を与えるかは慎重に検討する
- approval の role matrix は今回決定しない

---

## ■ rollout / verification 方針

rollout は、完全自動連携よりも、外部入力の棚卸し・同一性・validation・manual review から始める。

推奨 rollout 順:

1. external source / source_system を棚卸しする
2. OCR / EDI / CSV / Excel / NAS / external API の入力単位を整理する
3. external identity / file hash / received_at の候補を整理する
4. accepted / rejected / corrected の workflow を整理する
5. warehouse_code mapping / validation 方針を整理する
6. retry / replay / duplicate 方針を整理する
7. manual review / approval 条件を整理する
8. observability / audit 項目を整理する
9. 自動 import / API integration は将来検討する

verification 観点:

- 外部入力を source of truth に直結していない
- external ID と internal ID を混同していない
- file name / path だけで同一性を判断していない
- warehouse boundary を維持している
- validation failure を silent skip していない
- duplicate を自動削除していない
- retry / replay / duplicate を混同していない
- manual review が必要なケースを自動処理していない

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の external input checklist review
- 将来の role / warehouse_code 別表示確認
- 将来の import dry-run / preview review

---

## ■ lightweight integration 方針

lightweight integration は、最初から大きな integration platform や自動連携を作らず、既存の Excel / CSV / NAS / 手動確認を活かしながら段階導入する方針である。

初期方針:

- integration platform を作らない
- event bus / queue / watcher を急がない
- NAS watcher を今回作らない
- external API 自動同期を今回作らない
- monitoring / alert system を今回作らない
- まず source_system、file hash、validation、manual review を整理する
- OCR / EDI / CSV / Excel は preview / review を優先する

lightweight start の対象:

- OCR input checklist
- EDI file / message checklist
- CSV / Excel import checklist
- NAS file identity checklist
- external API retry / timeout checklist
- manual review criteria

方針:

- 現場運用を止めない
- Excel / CSV 運用を否定しない
- source of truth を守る
- 既存業務に影響する自動化を急がない
- 必要性が明確になった段階で job / queue / API / UI を検討する

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回決定しない。

候補:

- external input table
- external file registry
- file hash index
- OCR import job
- EDI parser / mapper
- CSV / Excel preview UI
- NAS watcher
- external API connector
- webhook receiver
- dead-letter table / queue
- integration event catalog
- schema registry
- partner mapping table
- source_system registry
- archive / cold storage
- replay planner
- Admin Dashboard integration audit UI
- external monitoring dashboard

導入判断の観点:

- source of truth を壊さないか
- external ID と internal ID を分離できるか
- warehouse boundary を維持できるか
- validation / manual review を通せるか
- replay / duplicate / retry を安全に扱えるか
- sensitive metadata を過剰保存しないか
- event contract / governance / impact analysis と接続できるか

---

## ■ 今後の検討事項

以下は今回決定しない。

- external input table を作るか
- external file registry を作るか
- file hash の保存先
- OCR parser / OCR workflow の実装方式
- EDI parser / mapper の実装方式
- CSV / Excel preview UI
- NAS watcher を作るか
- external API connector / webhook receiver の実装方式
- source_system registry / partner mapping table
- external schema versioning
- dead-letter table / queue
- duplicate detection job
- replay planner / replay engine
- archive / cold storage 方式
- external file access control の role matrix
- Admin Dashboard integration audit UI
- warehouse_code mapping の正式ルール
- external system ごとの event catalog

---

## ■ 原則

external integration は、外部入力を source of truth に直結する仕組みではない。

OCR / EDI / CSV / Excel / NAS / external API は信頼境界の外から来るため、identity、file hash、validation、manual review、trace、audit を通して業務データへ変換する。

external ID と internal ID を混同しない。

retry、replay、duplicate detection を混同しない。

warehouse_code boundary、event contract、security、governance、traceability を守りながら、軽量に始めて段階的に integration を育てる。
