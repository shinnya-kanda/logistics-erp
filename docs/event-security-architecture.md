# Event Security Architecture（Phase B7-86）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event / trace / replay / metadata / audit / archive の security boundary と access control を整理する。

event store、trace、metadata、archive は、業務上の真実ログと監査証跡を長期的に保持する。これらが不適切に閲覧・改ざん・削除されると、在庫・パレット・出荷・請求の説明可能性が失われる。

本ドキュメントでは以下を整理する。

- event security の目的
- source of truth protection
- append-only security
- replay / rebuild authorization
- audit access control
- metadata / external file / OCR / EDI security
- warehouse boundary / tenant isolation
- trace search security
- PII / sensitive metadata
- archive / cold storage security
- event tampering detection
- security と governance の関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event security の目的

event security は、event / trace / metadata / archive を、権限・境界・改ざん耐性の観点から保護するための考え方である。

目的:

- 真実ログを不正更新・不正削除から守る
- warehouse_code による業務境界を守る
- replay / rebuild の実行権限を制御する
- audit / forensic に必要な情報を適切な権限で閲覧させる
- metadata に含まれる機密情報・個人情報を保護する
- external file / OCR / EDI の元入力を安全に保持する
- archive / cold storage 後も traceability と access control を維持する

event security は、単なるAPI認証ではない。

source of truth、projection、trace search、replay、archive、metadata のそれぞれに適した境界を設計する必要がある。

---

## ■ source of truth protection

source of truth は、業務上の事実を説明する根拠データである。

保護対象:

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- 将来の shipment / OCR / EDI / billing event
- replay / correction event
- trace metadata

方針:

- source of truth は通常業務画面から直接 update / delete しない
- 書き込みは role / warehouse_code / business validation を通した command に限定する
- `warehouse_code` は client payload ではなく guard / server-side profile 由来を基本にする
- 補正は update / delete ではなく correction event として記録する
- source of truth への管理操作は audit 対象にする

注意:

- read model / projection を直しても source of truth は保護されない
- source of truth が壊れると rebuild / replay / audit の根拠が失われる

---

## ■ append-only security

append-only security は、過去 event を更新・削除せず、新しい event として事実を積み上げる設計を安全に守る考え方である。

目的:

- 過去履歴の改ざんを防ぐ
- correction event により補正理由を説明できる
- replay 結果を元 trace と分離する
- forensic 時に元操作と補正操作を追えるようにする

方針:

- 既存 event の直接更新・削除は原則禁止または強い承認対象にする
- correction / compensation は新しい event として追加する
- replay は新しい `trace_id` を持つことを基本にする
- archive しても append-only の意味を維持する
- append-only 違反は tampering detection の対象にする

append-only は「誤りを放置する」ことではない。

誤りを説明可能な形で補正するための security boundary である。

---

## ■ replay authorization

replay は、過去の入力・event・trace を参照して新しい操作として再実行するため、通常の retry より強い権限制御が必要である。

認可観点:

- replay 対象 domain
- replay 対象 warehouse_code
- replay 実行者 role
- replay 理由
- replay 対象 event の禁止 / 要承認分類
- external file / billing / 実物流への影響
- dry-run / 本実行の区別

方針:

- replay は idempotency retry と混同しない
- worker による任意 replay は原則想定しない
- admin / chief など、強い権限と承認を検討する
- billing / 実物流 / 外部送信済み event は要承認または禁止を検討する
- replay 実行者・承認者・理由・結果を metadata として残すことを検討する
- replay 結果は元履歴を上書きしない

今回、具体的な role matrix は決定しない。

---

## ■ rebuild authorization

rebuild は、source of truth から projection / read model を再構築する処理である。

認可観点:

- rebuild 対象 read model
- 対象 warehouse_code
- 対象期間
- source of truth の参照権限
- archive data の参照有無
- rebuild 結果を反映する権限
- dry-run / compare-only / apply の区別

方針:

- rebuild は source of truth を根拠にする
- rebuild 実行は通常 query より強い権限を検討する
- rebuild 結果の差分は audit / integrity monitoring の対象にする
- rebuild により projection を更新する場合は、実行者・範囲・時刻を記録することを検討する
- warehouse boundary をまたぐ rebuild は特別な管理権限を検討する

rebuild は read model を直す処理であっても、業務状態の見え方に影響するため、実行管理が必要である。

---

## ■ audit access control

audit access control は、監査情報を誰がどこまで閲覧できるかを制御する考え方である。

監査情報の例:

- event timeline
- correction event
- replay metadata
- operator metadata
- request_id
- external file hash
- source_system
- archive reference

方針:

- audit view は通常業務 view より広い情報を含む可能性がある
- admin / chief / office / worker で閲覧範囲を分けることを検討する
- operator 個人情報や email は必要最小限にする
- forensic 用の詳細情報と通常 audit 表示を分ける
- warehouse_code による境界を維持する
- audit log の閲覧自体も将来監査対象にすることを検討する

注意:

- audit に必要だからといって、すべてのユーザーに詳細 metadata を見せてよいわけではない
- 調査権限と業務操作権限は分けて考える

---

## ■ metadata security

metadata は、trace / event の意味を説明する補助情報である一方、情報漏えいリスクも持つ。

保護対象候補:

- operator metadata
- external file id / hash
- source_system
- shipment / billing metadata
- customer / trading partner 情報
- OCR / EDI parse metadata
- replay reason
- correction reason

方針:

- metadata は「何でも入れる自由欄」にしない
- token / secret / API key / password を metadata に入れない
- 個人情報を必要以上に入れない
- 大きな OCR / EDI / PDF 本文を metadata に直接入れない
- 通常画面表示用 metadata と forensic 用 metadata を分けることを検討する
- `warehouse_code` によるアクセス制御を維持する

metadata は軽量な説明情報であり、機密データの格納場所ではない。

---

## ■ external file security

external file は、OCR / EDI / CSV / PDF など、replay / forensic の起点になり得る。

保護対象:

- 元ファイル
- parsed result
- file hash
- storage path
- source system id
- received_at
- parser version
- upload operator

方針:

- ファイル本文をDB metadata に直接入れない
- DBには参照ID、hash、source_system、received_at などを保持する
- external file への直接URL露出を避ける
- file access は role / warehouse_code / purpose で制御することを検討する
- file hash により同一性と改ざん検知を支援する
- 削除・移動・再暗号化などの操作履歴を残すことを検討する

external file は業務入力であると同時に、機密情報を含む可能性がある。

---

## ■ OCR / EDI security

OCR / EDI は外部入力であり、replay / workflow / shipment / inventory / billing へ影響する。

security 観点:

- 入力ファイルの真正性
- file hash による重複・改ざん検知
- parser version / schema version
- source_system の識別
- external id と内部IDの分離
- 誤読・補正・再取込の履歴
- 外部送信済み event の replay 制限

方針:

- OCR / EDI 入力は信頼境界の外から来るものとして扱う
- parse 結果をそのまま source of truth にせず、validation / reconciliation を通す
- external id を内部主キーとして扱わない
- OCR補正やEDI再取込は trace / metadata で元入力と関係づける
- OCR / EDI の replay は通常 retry と分離し、承認を検討する

---

## ■ warehouse boundary security

warehouse boundary security は、`warehouse_code` による業務データ境界を守る考え方である。

方針:

- `warehouse_code` は guard / authenticated profile 由来を基本とする
- client payload の `warehouse_code` を信頼しない
- event / trace / metadata / archive 検索は `warehouse_code` で絞る
- replay / rebuild でも対象 warehouse_code を明示・制限する
- archive / cold storage でも `warehouse_code` 境界を維持する
- cross-domain trace でも warehouse_code の意味を混同しない

注意:

- trace_id が一致しても、閲覧者の warehouse_code 境界を超えてよいとは限らない
- admin 権限であっても warehouse 横断閲覧を許すかは別途判断が必要である

---

## ■ tenant / warehouse isolation

tenant / warehouse isolation は、複数倉庫・複数業務単位のデータが混在しないようにする境界設計である。

現時点では `warehouse_code` を主要な業務境界として扱う。

isolation 対象:

- source of truth
- projection / read model
- trace-search
- replay / rebuild 対象
- audit / forensic view
- archive / cold storage reference
- external file

方針:

- query は必ず許可された warehouse_code に限定する
- write は server-side guard 由来 warehouse_code を使う
- read model も source of truth と同じ境界を持つ
- archive data に移しても isolation を維持する
- 将来 tenant 概念が追加される場合、warehouse_code との関係を整理する

---

## ■ trace search security

trace search は、複数 source の event を横断して検索するため、通常の個別一覧より情報範囲が広くなる。

security 観点:

- role 制御
- warehouse_code 絞り込み
- trace_id 完全一致
- metadata 表示範囲
- source ごとの表示制限
- archive data 参照可否
- forensic 詳細へのアクセス可否

方針:

- trace search は admin / chief / office など限定 role を基本にする
- worker による横断 trace search は原則制限する
- `warehouse_code` は guard 由来で絞る
- trace_id が分かっていても warehouse boundary を越えない
- 通常表示では sensitive metadata を省略することを検討する
- forensic 用の詳細表示は別権限を検討する

trace search は便利な調査機能である一方、情報集約により漏えいリスクが高まる。

---

## ■ PII / sensitive metadata の扱い

PII / sensitive metadata は、個人情報や機密性の高い業務情報を含む metadata である。

候補:

- operator email
- operator name
- customer name
- trading partner details
- file path
- external payload
- correction reason の自由記述
- shipment / billing detail

方針:

- 必要最小限のみ保持する
- 内部IDを優先し、表示名や email は必要範囲に限定する
- free text に個人情報や secret が入らないよう注意する
- 通常画面と forensic 画面で表示範囲を分ける
- retention / deletion / anonymization の対象として扱う可能性を検討する
- secret / token / API key は保存禁止とする

PII / sensitive metadata は、audit に便利でも閲覧範囲を慎重に分ける必要がある。

---

## ■ archive / cold storage security

archive / cold storage は、低頻度アクセスの履歴や外部ファイルを長期保存する領域である。

security 観点:

- access control
- encryption
- warehouse_code boundary
- metadata と storage object の整合性
- file hash による改ざん検知
- restore / export 権限
- deletion / legal hold
- audit trail

方針:

- archive 後も source of truth としての意味を保つ
- archive data にも warehouse_code 境界を適用する
- cold storage の object 参照は直接公開しない
- restore / export は強い権限と監査を検討する
- archive data の改ざん・欠落は integrity check の対象にする
- deletion より archive / mask / anonymize を優先検討する

archive は security boundary の外ではない。

active data と同等以上に、長期保持に適した制御が必要である。

---

## ■ event tampering detection

event tampering detection は、event / trace / metadata / archive が不正に変更・削除された可能性を検知する考え方である。

検知候補:

- source of truth の不自然な update / delete
- created_at の逆転や欠落
- trace_id / parent_trace_id の不自然な変更
- correction event なしの状態変更
- archive metadata と file hash の不一致
- projection と source of truth の rebuild diff
- event chain の missing / duplicate
- idempotency_key の重複異常

方針:

- tampering detection は integrity monitoring と接続する
- 検知結果は自動削除ではなく調査対象にする
- severity を分けることを検討する
- correction / recovery は元 event を消さず説明可能に行う
- forensic に必要な request_id / operator / source_system を保持することを検討する

完全な改ざん防止を最初から実装するのではなく、まず検知可能性と説明可能性を整理する。

---

## ■ security と governance の関係

security と governance は補完関係にある。

governance は、event name、owner domain、schema、lifecycle、compatibility を統制する。

security は、その event / metadata / archive に誰がアクセスし、誰が変更できるかを制御する。

関係:

| governance | security |
| --- | --- |
| owner domain を定義する | owner domain の変更権限を制御する |
| event lifecycle を管理する | deprecated / archived の閲覧・生成を制御する |
| schema change を審査する | schema change 実行権限を制御する |
| replay / rebuild 方針を定義する | replay / rebuild 実行権限を制御する |
| metadata 方針を定義する | sensitive metadata の閲覧範囲を制御する |

方針:

- governance で定義したルールを security boundary に反映する
- security 例外は governance 上も記録することを検討する
- owner domain / reviewer / approver と実行権限を混同しない

---

## ■ 導入段階案

### Step 1: security boundary の棚卸し

source of truth、projection、trace search、replay、rebuild、archive、external file の境界を整理する。

### Step 2: role / warehouse_code 制御の整理

admin / chief / office / worker と warehouse_code の関係を、event / trace / replay / audit ごとに整理する。

### Step 3: sensitive metadata の分類

operator、customer、external file、billing、free text など、metadata の閲覧範囲を分類する。

### Step 4: replay / rebuild authorization の検討

dry-run、本実行、承認、対象 warehouse_code、禁止ケースを整理する。

### Step 5: archive / tampering detection の検討

archive access、file hash 検証、projection diff、missing / duplicate detection を security monitoring と接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event / trace / audit の正式 role matrix
- replay 実行権限と承認フロー
- rebuild 実行権限と承認フロー
- warehouse 横断閲覧を許可する role
- forensic 専用権限を作るか
- sensitive metadata の分類ルール
- metadata mask / redact の実装方式
- external file の保存先と暗号化方式
- cold storage の具体的な access control
- file hash 検証 job の実装有無
- tampering detection の具体ルール
- security event / alert の保存先
- audit log 閲覧の監査方法
- legal hold / deletion request への対応

---

## ■ 原則

event / trace / metadata / archive は、業務事実と監査証跡を支える重要な資産である。

source of truth を不正更新・不正削除から守る。

`warehouse_code` による境界を、active data / archive data / trace search / replay / rebuild で維持する。

metadata は必要最小限にし、secret や不要な個人情報を入れない。

security は governance と連動し、event chain を将来も安全に説明可能にする。
