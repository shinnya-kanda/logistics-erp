# Trace Consistency / Integrity Design（Phase B7-78）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、trace / distributed trace / replay / audit を前提として、trace の整合性・説明可能性・改ざん耐性をどう維持するかを整理する。

`trace_id`、`parent_trace_id`、event taxonomy、metadata、retention 方針を整えても、trace chain に欠落・重複・孤立・部分書き込みがあると、後から業務の流れを正しく説明できない。

本ドキュメントでは以下を整理する。

- trace consistency の目的
- trace integrity の目的
- partial write 問題
- orphan trace 問題
- missing event 問題
- duplicated trace 問題
- replay consistency
- rebuild consistency
- idempotency と integrity の違い
- audit / forensic との関係
- trace validation の考え方
- consistency check job の将来像
- immutable log の考え方
- correction event の考え方

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ trace consistency の目的

trace consistency は、trace に含まれる複数の event / transaction / history が、業務上矛盾なくつながっている状態を指す。

目的:

- 1つの `trace_id` に属する履歴が同じ業務操作として説明できる
- `parent_trace_id` による親子関係が循環せず、業務順序として理解できる
- 必要な event が欠落していない
- 同じ業務操作が重複して記録されていない
- replay / rebuild 時に対象範囲を誤らない
- audit / forensic で原因追跡できる

trace consistency は、単に `trace_id` が入っていることではない。

trace の中身が業務として一貫していることが重要である。

---

## ■ trace integrity の目的

trace integrity は、trace や履歴が後から不正に改ざんされず、説明可能な形で保持されている状態を指す。

目的:

- 真実ログが更新・削除で失われない
- 補正は correction event として残る
- replay は元 trace と新 trace を分離して説明できる
- metadata の意味が後から解釈できる
- operator / request / external input との関係が追える
- forensic 時に「いつ・誰が・何を変更したか」を確認できる

integrity は改ざん防止だけでなく、変更理由を説明できることも含む。

---

## ■ partial write 問題

partial write は、1つの業務操作で複数の書き込みが必要なのに、一部だけが保存された状態である。

例:

- `inventory_transactions` は作成されたが、対応する `pallet_transactions` がない
- `warehouse_locations` は更新されたが、`warehouse_location_history` がない
- parent trace は作成されたが、child trace が途中で欠落した
- external input は保存されたが、Expected / Actual が作成されていない

影響:

- trace-search の結果が不完全になる
- replay 対象範囲を誤る
- audit で説明できない
- rebuild 結果が不整合になる

方針:

- 複数書き込みは RPC などで可能な限り1トランザクションにまとめる
- partial write を検出できる validation を検討する
- partial write が発生した場合は、削除ではなく correction / recovery event で補正する

---

## ■ orphan trace 問題

orphan trace は、親子関係や参照先が欠落している trace である。

例:

- `parent_trace_id` が存在しない trace を参照している
- replay trace が元 trace を参照できない
- `request_id` はあるが、対応する業務 trace がない
- external file metadata はあるが、元ファイルが存在しない

影響:

- distributed trace chain が途中で切れる
- replay / forensic の起点が説明できない
- long-term traceability が崩れる

方針:

- `parent_trace_id` の参照整合性を将来検討する
- archive / deletion でも trace chain を切らない
- orphan を自動削除せず、調査対象として扱う
- orphan を補正する場合は correction event を残す

---

## ■ missing event 問題

missing event は、業務上必要な event が記録されていない状態である。

例:

- `inventory.out.distributed` があるのに shipment 出庫確定 event がない
- `pallet.out.completed` があるのに pallet の現在状態が更新されていない
- `actual.matched` があるのに在庫入庫 event がない
- OCR取込はあるが parse / rejected / corrected の結果 event がない

影響:

- 業務フローの途中状態が不明になる
- replay でどこから再実行すべきか判断できない
- audit 上「なぜそのtransactionが発生したか」を説明できない

方針:

- event taxonomy に基づき、期待される event chain を定義する
- missing event は validation で検出する
- 欠落を後から補う場合は backfill ではなく、説明可能な recovery / correction として扱う

---

## ■ duplicated trace 問題

duplicated trace は、同じ業務操作が重複して trace / event / transaction として記録されている状態である。

例:

- 同じ `idempotency_key` で複数の在庫入庫が作られている
- 同じ外部ファイルから複数の Expected が作られている
- 同じ pallet move が二重に記録されている
- replay と再送が混同され、同じ操作が二重実行されている

影響:

- 在庫数量が過大または過小になる
- パレット状態が実物流とずれる
- 請求候補が重複する
- audit で正しい操作数を説明できない

方針:

- idempotency は二重実行防止として維持する
- replay は idempotency retry と分離する
- 重複が見つかった場合は削除ではなく補正eventで調整する
- external file hash などで外部入力の重複検知を検討する

---

## ■ replay consistency

replay consistency は、replay 操作が元 trace と矛盾せず、監査可能に記録されている状態である。

方針:

- replay は元 trace を上書きしない
- replay には新しい `trace_id` を発行することを基本にする
- 元 trace との関係を `parent_trace_id` または replay metadata で残す
- replay 理由、実行者、承認者、実行結果を記録する
- dry-run と本実行を区別する
- replay による補正は correction event として表現する

不整合例:

- replay 結果が元 trace と同じ `trace_id` に混在している
- replay 理由が不明
- replay で元履歴が更新・削除されている
- replay 後の補正transactionがどの元transactionに対応するか不明

---

## ■ rebuild consistency

rebuild consistency は、真実ログから派生状態を再構築した結果が、現在状態と説明可能に一致する状態である。

対象例:

- `inventory_transactions` から `inventory_current` を再構築する
- `pallet_transactions` から `pallet_units.current_location_code` を検証する
- shipment / billing の集計を履歴から再作成する

方針:

- rebuild の根拠は真実ログに置く
- 派生キャッシュを真実として扱わない
- rebuild 結果と現在状態が異なる場合は、差分を検出・説明する
- rebuild のために必要な最低データを retention で保持する
- rebuild 結果の補正は直接上書きではなく、必要に応じて correction event として扱う

---

## ■ idempotency と integrity の違い

idempotency と integrity は目的が異なる。

| 項目 | idempotency | integrity |
| --- | --- | --- |
| 主目的 | 同一操作の二重実行防止 | 履歴・trace の正しさと説明可能性 |
| 対象 | API request / retry | trace chain / transaction / history |
| 時点 | 書き込み時 | 書き込み時 + 後続検証 |
| 例 | 同じ `idempotency_key` なら既存結果を返す | partial write / orphan / missing を検出する |

`idempotency_key` が正しくても、trace integrity が保たれているとは限らない。

例:

- idempotency replay は成功しているが、関連する history が欠落している
- 同じ trace 内に必要な event がない
- parent trace が存在しない

---

## ■ audit / forensic との関係

### audit

audit では、trace の整合性により「誰が・いつ・何を・なぜ」を説明できる。

必要な観点:

- event chain が業務フローとして自然か
- correction event が元 event と対応しているか
- replay の理由と承認が残っているか
- operator metadata があるか

### forensic

forensic では、障害・不正・データ不整合の原因を追う。

必要な観点:

- partial write が発生したか
- missing event があるか
- duplicate があるか
- request_id / external file hash / source system と接続できるか
- archive / deletion により trace chain が切れていないか

---

## ■ trace validation の考え方

trace validation は、trace chain と event / transaction / metadata の整合性を検証する考え方である。

検証候補:

- `trace_id` が空でないか
- `warehouse_code` が guard 由来の業務範囲と矛盾しないか
- `parent_trace_id` が循環していないか
- replay trace が元 trace を参照できるか
- `idempotency_key` と transaction の関係が一貫しているか
- event taxonomy 上、必要な前後 event があるか
- external file hash と metadata が一致するか
- archive 後も trace chain をたどれるか

初期段階では、validation は設計候補であり、今回実装しない。

---

## ■ consistency check job の将来像

将来的には、trace consistency を定期的に確認する job を検討する。

候補:

### 1. partial write check

複数テーブル更新が必要な trace で、一部履歴が欠落していないか確認する。

### 2. orphan trace check

`parent_trace_id` や replay metadata が参照する元 trace が存在するか確認する。

### 3. missing event check

event taxonomy 上、期待される event chain が成立しているか確認する。

### 4. duplicate check

`idempotency_key`、external file hash、business identifier の重複を確認する。

### 5. rebuild diff check

真実ログから再構築した結果と派生キャッシュの差分を確認する。

### 6. archive integrity check

archive / cold storage へ移したデータが trace chain を維持しているか確認する。

job の結果は、単にエラーとして扱うのではなく、調査・補正・承認のワークフローにつなげることを検討する。

---

## ■ immutable log の考え方

immutable log は、過去の履歴を更新・削除せず、追加イベントで事実を積み上げる考え方である。

logistics-erp では、以下を真実ログとして扱う。

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- 将来の shipment / OCR / EDI / billing event

方針:

- 真実ログを安易に update / delete しない
- 誤りは correction event で表現する
- replay は新しい trace として記録する
- rebuild は真実ログから派生状態を再計算する
- archive しても immutable 性と traceability を維持する

完全な event sourcing を今すぐ採用するわけではないが、監査可能な履歴設計として immutable log の考え方を取り入れる。

---

## ■ correction event の考え方

correction event は、過去の誤りや不整合を、削除・上書きではなく新しい履歴として補正する event である。

目的:

- 元履歴を残したまま補正する
- 誰が・なぜ補正したかを説明する
- replay / rebuild / audit で元操作と補正操作を区別する
- forensic で誤りの発生と修正の両方を追えるようにする

例:

- 誤った IN を補正する ADJUST
- 誤った pallet move を戻す MOVE
- OCR誤読を補正する `ocr.corrected`
- Expected / Actual 差異を解消する `actual.reconciled`

correction event は元eventを消すためのものではない。

元eventとcorrection eventの関係を metadata または trace chain で説明できる必要がある。

---

## ■ 導入段階案

### Step 1: trace-search 結果の説明可能性確認

既存の `trace-search` で返る event が、source / event_type / warehouse_code / created_at で説明できるか確認する。

### Step 2: 不整合パターンの棚卸し

inventory / pallet / warehouse location / shipment / OCR / EDI ごとに、partial write、missing、duplicate の発生パターンを整理する。

### Step 3: validation ルール候補作成

event taxonomy と metadata schema に基づき、検証可能なルールを整理する。

### Step 4: consistency check job 検討

検証ルールを定期実行する job と、結果の通知・承認・補正フローを検討する。

### Step 5: correction event 設計

各 domain ごとに、削除・上書きではなく補正eventで扱うための event name / metadata を検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- trace validation をどこで実行するか
- consistency check job を作るかどうか
- job の実行頻度
- job 結果の保存先
- validation error の severity
- partial write の自動補正可否
- orphan trace をどこまで許容するか
- missing event の判定ルール
- duplicate trace の検出条件
- immutable log をDB制約で守るか、運用ルールで守るか
- correction event の正式 event name
- correction event と元eventの関連保存方法
- admin-dashboard で integrity warning を表示するか
- archive data を含めた integrity check の方法

---

## ■ 原則

trace consistency は、業務の流れが矛盾なく説明できることを守る。

trace integrity は、履歴が改ざんされず、補正も含めて説明できることを守る。

idempotency は二重実行防止であり、integrity 全体を保証するものではない。

真実ログを安易に更新・削除しない。

誤りや不整合は、削除ではなく correction event として説明可能に扱う。
