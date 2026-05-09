# Trace Retention / Archival Design（Phase B7-77）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、trace / event / replay / audit / forensic を前提として、履歴・metadata・external input をどのように保持・アーカイブするかを整理する。

`trace_id`、`parent_trace_id`、event taxonomy、metadata schema を整備しても、保持期間やアーカイブ方針が曖昧なままだと、将来の replay / rebuild / audit / forensic で必要な情報が失われる可能性がある。

本ドキュメントでは以下を整理する。

- retention の目的
- archival の目的
- trace retention policy
- inventory / pallet / shipment retention
- OCR / EDI / external file retention
- replay / audit / forensic との関係
- active data / archive data の分離方針
- cold storage の考え方
- metadata retention
- security / privacy / legal retention
- deletion policy
- rebuild に必要な最低データ
- long-term traceability の考え方

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ retention の目的

retention は、業務・監査・復旧に必要なデータを、必要な期間保持するための方針である。

目的:

- 在庫・パレット・出荷・請求の根拠を後から説明できるようにする
- trace chain を使った audit / forensic を可能にする
- replay / rebuild に必要な入力・履歴・metadata を失わない
- 法務・会計・取引先要件に応じた保持期間を管理する
- 不要になった情報を適切に削除またはアーカイブする

retention は「すべてを永久に保持する」ことではない。

業務上必要な情報、法的に必要な情報、復旧に必要な情報を区別して保持する。

---

## ■ archival の目的

archival は、頻繁には参照しないが、将来の監査・復旧・調査に必要なデータを、active data から分離して長期保存するための方針である。

目的:

- active DB の肥大化を抑える
- 通常検索性能を守る
- 長期監査に必要な履歴を保持する
- cold storage など低頻度アクセス向けの保存先を検討する
- 削除ではなく、参照頻度に応じた階層管理を行う

archival は「使わないデータを捨てる」ことではない。

traceability を維持しながら、保管場所とアクセス方法を変える設計である。

---

## ■ trace retention policy

trace retention policy は、`trace_id` / `parent_trace_id` / `request_id` / event metadata をどの期間・どの粒度で保持するかの方針である。

基本方針:

- `trace_id` は transaction / history と同じ期間保持する
- `parent_trace_id` は trace chain を再構成するために保持する
- `request_id` は技術調査用として一定期間保持を検討する
- event name / event metadata は audit / replay の必要性に応じて保持する
- trace chain を切断する削除は避ける

保持優先度:

| データ | 優先度 | 理由 |
| --- | --- | --- |
| `trace_id` | 高 | 業務操作の追跡キー |
| `parent_trace_id` | 高 | distributed trace の親子関係 |
| transaction / history | 高 | 真実ログ |
| event metadata | 中 | audit / replay の補助 |
| `request_id` | 中 | 技術調査・forensic |
| debug log | 低〜中 | 保存コストと機密性に注意 |

---

## ■ inventory retention

`inventory_transactions` は在庫数量変動の真実ログである。

方針:

- 原則として長期保持する
- `inventory_current` は派生状態であり、長期保持の主対象ではない
- rebuild に必要なtransaction履歴は削除しない
- 補正やreplayは元履歴を更新・削除せず、新しいイベントとして保持する
- 請求・棚卸・監査に関わる期間は法務・会計要件と合わせる

archive 検討:

- 古い `inventory_transactions` を archive table / cold storage に移す場合でも、rebuild 可能性を維持する
- active data から外す場合は、期間集計や残高スナップショットの整合性を検討する
- `trace_id` で archive 側を検索できる導線を残す

---

## ■ pallet retention

`pallet_transactions` はパレット位置・状態変更の真実ログである。

方針:

- 実物流の監査に必要な期間保持する
- `pallet_units` の現在状態は派生キャッシュとして扱う
- パレット移動・出庫・品番紐付け履歴は、在庫・出荷履歴と trace chain で接続できるように保持する
- パレット出庫済み後も、一定期間は履歴を検索できるようにする

archive 検討:

- 出庫済み・長期間更新なしのパレット履歴を archive 候補にする
- archive 後も `pallet_code` / `trace_id` / `warehouse_code` で参照できる設計を検討する
- 実物流の照会頻度が高い期間は active に残す

---

## ■ shipment retention

shipment 系データは、出荷・請求・取引先照会に関わるため、長期保持要件が強くなり得る。

現時点では設計候補であり、実装を前提にしない。

方針:

- 出荷指示・出庫確定・請求候補・請求確定の関係を保持する
- shipment trace を親として、inventory / pallet / billing の child trace を追えるようにする
- 請求確定済みデータは replay / deletion の制約が強い
- 取引先ごとの保管要件を metadata または policy として扱う可能性を検討する

archive 検討:

- 請求確定後、参照頻度が下がった shipment を archive 候補にする
- ただし、請求・監査・クレーム対応に必要な期間は検索可能にする

---

## ■ OCR / EDI / external file retention

OCR / EDI / external file は、replay / forensic の起点になる。

方針:

- 元入力を再処理できる形で保持する
- ファイル本文をDB metadataに直接詰め込まない
- metadata には file id / hash / source system / received_at を持つ
- OCR結果やEDI解析結果は、元ファイルと解析versionを紐づける
- 外部送信済みファイルや通知は、削除・replay に制約を設ける

保持対象候補:

- 元ファイル
- file hash
- parsed result
- parse schema version
- source system
- received_at
- operator / job id
- trace_id / parent_trace_id

archive / cold storage 検討:

- 元ファイルは cold storage 候補にする
- active DB には検索用metadataと参照IDを残す
- hash により同一性を検証できるようにする

---

## ■ replay / audit / forensic との関係

### replay

replay には元入力・元trace・関連metadataが必要である。

保持すべきもの:

- 元 trace
- replay 元の external input
- replay 理由
- replay 実行者 / 承認者
- replay 結果
- 元 trace と replay trace の関係

### audit

audit では、業務上の説明責任が重要である。

保持すべきもの:

- 誰が操作したか
- いつ操作したか
- どの業務イベントが発生したか
- どのtransaction / history が作られたか
- なぜその操作が発生したか

### forensic

forensic では、障害・不正・不整合の原因追跡が重要である。

保持すべきもの:

- request_id
- source system
- external file hash
- error log
- trace chain
- operator / job 実行情報

---

## ■ active data / archive data の分離方針

active data は、日常業務・通常検索・直近監査で頻繁に使うデータである。

archive data は、参照頻度は低いが、長期監査・replay・forensic・法務対応で必要になるデータである。

分離方針:

- active data は通常画面・APIで高速に参照できる
- archive data は専用検索・管理者操作・非同期処理で参照する
- active から archive へ移しても trace chain を切らない
- archive 側にも `warehouse_code` によるアクセス制御を維持する
- archive への移動は削除ではなく状態変更として扱う

---

## ■ cold storage の考え方

cold storage は、低頻度アクセスの大容量データを安価に長期保存するための保管先である。

候補:

- OCR元ファイル
- EDI元ファイル
- 大きなCSV / PDF
- 古い外部連携payload
- 長期保存が必要な audit export

方針:

- DBには参照ID、hash、storage path、received_at などを保持する
- cold storage 上のファイルとDB metadata の整合性を確認できるようにする
- 削除・移動・再暗号化の履歴を残すことを検討する
- 通常業務画面から直接大量取得しない

---

## ■ metadata retention

metadata は trace / event の意味を説明する補助情報である。

方針:

- `trace_id`、`warehouse_code`、event name などの最低限 metadata は transaction / history と同期間保持する
- 大きなmetadata payload は分離保存を検討する
- 個人情報を含むmetadataは保持期間を短くする可能性を検討する
- replay / audit に必要なmetadataは削除前に代替説明が可能か確認する
- metadata version は長期解釈のために保持する

注意:

- metadata だけ残って真実ログがない状態は避ける
- 真実ログだけ残ってmetadata がなく、業務意味を説明できない状態も避ける

---

## ■ security / privacy / legal retention

retention は security / privacy / legal と衝突し得る。

方針:

- 個人情報を必要以上に保持しない
- token / secret / API key を履歴やmetadataに残さない
- 法務・会計・取引先要件に応じた保持期間を検討する
- 削除要求や匿名化要求が発生した場合の扱いを整理する
- forensic に必要な情報と、通常閲覧可能な情報を分ける
- archive / cold storage にもアクセス制御を適用する
- `warehouse_code` によるデータ分離を維持する

legal retention は今回決定しない。

将来的に業務・国・取引先ごとの保持要件を別途整理する。

---

## ■ deletion policy

deletion policy は、保持不要または削除要求対象となったデータをどう扱うかの方針である。

基本方針:

- 真実ログの物理削除は慎重に扱う
- 削除よりも archive / mask / anonymize を優先検討する
- trace chain を切断する削除は避ける
- 外部ファイル削除時は metadata に削除事実を残すことを検討する
- 法的削除要求と監査保持義務が衝突する場合の判断ルールを別途定める

削除候補:

- 一時的なdebug log
- 期限切れのraw OCR中間生成物
- 重複アップロードされた外部ファイル
- 個人情報を含む不要metadata

削除禁止または要承認候補:

- 請求根拠になる履歴
- 在庫数量の真実ログ
- パレット出庫履歴
- replay / recovery の元入力
- 監査対象期間中の external file

---

## ■ rebuild に必要な最低データ

rebuild に必要な最低データは、派生状態を再構築するための真実ログである。

最低保持候補:

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- shipment / billing の真実ログ
- trace_id / parent_trace_id
- event time
- warehouse_code
- transaction_type / event_name
- quantity / location / pallet / part の基本情報

外部入力から再構築する場合の最低保持候補:

- external file id
- external file hash
- parsed result
- parser version
- source system
- received_at

rebuild に不要なものと必要なものを混同しない。

現在状態テーブルや派生キャッシュだけでは rebuild の根拠として不十分である。

---

## ■ long-term traceability の考え方

long-term traceability は、長期間経過後でも「何が起きたか」を説明できる状態を維持する考え方である。

必要な要素:

- trace_id による業務操作追跡
- parent_trace_id による trace chain
- event taxonomy によるイベント意味
- metadata schema による補助情報
- retention policy による保持期間
- archive / cold storage への参照導線
- security / privacy を考慮した閲覧制御

長期追跡では、単にデータを残すだけでは不十分である。

残したデータの意味を将来の開発者・監査担当者・業務担当者が理解できる必要がある。

---

## ■ 導入段階案

### Step 1: retention対象の棚卸し

inventory / pallet / warehouse location / shipment / OCR / EDI ごとに、保持対象と派生データを整理する。

### Step 2: active / archive の基準整理

参照頻度、監査要件、性能要件から、active に残す期間と archive へ移す条件を整理する。

### Step 3: external file 方針整理

OCR / EDI / CSV / PDF の保存先、hash、metadata、削除条件を整理する。

### Step 4: legal / privacy review

法務・会計・個人情報・取引先要件を確認し、保持期間と削除方針を決める。

### Step 5: archive検索設計

trace-search や将来の trace chain 検索が archive data まで参照できるかを検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- 各テーブルの具体的な保持年数
- active から archive へ移す条件
- archive table を作るか、別DB / storage を使うか
- cold storage の具体的なサービス
- archive data の検索API
- trace-search が archive data を検索するか
- external file の保存先と暗号化方式
- OCR / EDI / CSV / PDF の削除条件
- metadata の最大保持期間
- 個人情報metadataの匿名化方針
- legal hold の扱い
- 削除要求と監査保持義務が衝突した場合の判断
- archive / deletion の承認フロー
- archive job / deletion job の実装方式

---

## ■ 原則

retention は、業務説明・監査・復旧に必要な情報を守るための方針である。

archival は、traceability を維持したまま保管階層を分けるための方針である。

真実ログを安易に削除しない。

metadata や external input は、必要最小限・安全性・長期解釈性を意識して保持する。

長期的に「何が起きたか」を説明できることを、短期的なDB軽量化より優先する場面がある。
