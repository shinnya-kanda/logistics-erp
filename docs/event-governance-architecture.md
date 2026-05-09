# Event Governance Architecture（Phase B7-85）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event naming、owner domain、schema change、compatibility、lifecycle をどのように統制するかを整理する。

event store / CQRS / domain event / event versioning を前提にすると、event は単なる実装上のログではなく、rebuild / replay / audit / forensic / workflow を支える長期的な業務資産になる。そのため、event の追加・変更・廃止には統制が必要である。

本ドキュメントでは以下を整理する。

- event governance の目的
- owner domain の責務
- event lifecycle
- event naming governance
- schema change / backward compatibility governance
- deprecated event governance
- integration event governance
- event catalog governance
- trace metadata governance
- replay / rebuild governance
- audit / forensic governance
- workflow / saga governance
- approval / review policy
- domain boundary と governance の関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event governance の目的

event governance は、event を一貫した意味・命名・schema・lifecycle で管理するための考え方である。

目的:

- event name の意味を安定させる
- owner domain を明確にする
- schema change の影響を制御する
- replay / rebuild / projection を壊さない
- integration event の契約を守る
- audit / forensic で過去 event を説明できる
- deprecated event を削除せず安全に移行する

event governance は、開発速度を落とすための承認手続きではない。

業務履歴を長期的に信頼できる状態に保ち、domain 間の変更影響を明確にするための設計である。

---

## ■ owner domain の責務整理

owner domain は、event の意味・生成条件・schema・補正ルールを所有する domain である。

例:

| event | owner domain |
| --- | --- |
| `inventory.out.distributed` | inventory |
| `pallet.move.completed` | pallet |
| `shipment.pick.confirmed` | shipment |
| `edi.message.accepted` | EDI |
| `actual.mismatch_detected` | expected / actual |
| `billing.confirmed` | billing |

owner domain の責務:

- event name の意味を定義する
- event が発生する条件を定義する
- required / optional metadata を整理する
- replay / correction / deprecated 方針を定義する
- integration event の互換性を管理する
- audit / forensic で説明できる粒度を保つ

方針:

- 他 domain は event を参照できるが、意味を勝手に変更しない
- event の廃止や置換は owner domain が主導する
- owner domain が不明な event は追加しない

---

## ■ event lifecycle 整理

event lifecycle は、event が設計され、利用され、変更され、廃止されるまでの流れである。

候補:

```text
proposed
  -> approved
  -> active
  -> deprecated
  -> archived
```

### proposed

新しい event name / schema / owner domain を提案している状態。

### approved

owner domain と用途が整理され、実装候補として認められた状態。

### active

新規 event として生成される状態。

### deprecated

新規生成は停止または縮小するが、過去 event として読み続ける状態。

### archived

active data から archive / cold storage へ移されるが、audit / rebuild / forensic のために参照可能性を維持する状態。

方針:

- deprecated / archived event を削除しない
- lifecycle の変更は replay / rebuild / projection への影響を確認する
- event lifecycle は event catalog で管理することを将来検討する

---

## ■ event naming governance

event name は、業務上「何が起きたか」を表す安定した名前である。

基本形式:

```text
<domain>.<object_or_action>.<verb_or_state>
```

命名ルール:

- domain を先頭に置く
- 小文字を使う
- 階層区切りは `.`
- 単語区切りは `_`
- 過去に起きた事実を表す
- UI表示名ではなく機械的に安定した名前にする
- `transaction_type` をそのまま使わない
- 業務意味が違うものを同じ event name にしない

避ける例:

- `done`
- `update`
- `move`
- `api_success`
- `IN`
- `OUT`

governance 方針:

- event name 追加時は owner domain と source of truth を明記する
- 既存 event と業務意味が重複しないか確認する
- 業務意味が変わる場合は version だけで吸収せず、新 event name を検討する

---

## ■ schema change governance

schema change governance は、event schema / metadata schema の変更を安全に行うための考え方である。

変更分類:

| 変更 | governance |
| --- | --- |
| optional field 追加 | 原則許容しやすい |
| required field 追加 | 影響確認が必要 |
| field 名変更 | 破壊的変更として扱う |
| field 型変更 | 破壊的変更として扱う |
| event 意味変更 | 新 event name を検討 |
| enum 追加 | reader / projection 影響を確認 |
| field 削除 | deprecated 期間を検討 |

方針:

- schema change は backward compatibility を確認する
- rebuild / replay / projection への影響を確認する
- field 名変更より新 field 追加を優先する
- metadata の意味を後から変えない
- migration / backfill で過去 immutable event を直接書き換えない

---

## ■ backward compatibility governance

backward compatibility governance は、新しい reader / projection / replay が古い event を読める状態を維持するための統制である。

確認観点:

- 過去 event version を読めるか
- optional field がない場合も処理できるか
- deprecated event を projection が読めるか
- replay planner が古い schema を解釈できるか
- archive data から戻した event を扱えるか

方針:

- 古い event を silent skip しない
- 読めない event は warning / error / manual review の対象にする
- adapter / mapper を使う場合は変換ルールを明示する
- backward compatibility のために業務意味を曖昧にしない

---

## ■ deprecated event governance

deprecated event は、新規生成を停止または縮小するが、過去 event として読み続ける必要がある event である。

governance 項目:

- deprecated 理由
- owner domain
- replacement event
- 新規生成停止時期
- projection / replay / rebuild の扱い
- integration consumer への影響
- audit / forensic での説明方法

方針:

- deprecated event を削除しない
- 新規 command では replacement event を使う
- projection / replay / audit は deprecated event を読めるようにする
- external / integration event の deprecated は受信側 domain と調整する

例:

```text
old: shipment.billing.candidate_created
new: billing.candidate_created
```

この場合、owner domain と業務意味の変更を明確にする。

---

## ■ integration event governance

integration event は、domain 間で受け渡す契約である。

governance 目的:

- producer / consumer の責務を明確にする
- schema change の影響を抑える
- workflow / saga の破壊的変更を防ぐ
- retry / replay / compensation の判断材料を保つ

確認観点:

- producer domain
- consumer domain
- event name / version
- required metadata
- optional metadata
- compatibility policy
- delivery / retry / duplicate handling
- failure handling

方針:

- 送信元 domain は event の意味と schema を安定させる
- 受信先 domain は unknown field を許容する
- required field の削除や意味変更は破壊的変更として扱う
- 受信できない event version は manual recovery / dead-letter 的扱いを将来検討する

---

## ■ event catalog governance

event catalog は、event name、owner domain、version、schema、lifecycle、互換性方針を管理する一覧である。

管理候補:

- event_name
- owner_domain
- event_type
- source of truth
- event_version
- metadata_version
- required metadata
- optional metadata
- lifecycle
- deprecated flag
- replacement event
- replay support
- rebuild support
- projection support
- integration consumer

用途:

- 新規 event の重複防止
- schema change の影響確認
- replay / rebuild planner の判断材料
- audit / forensic の意味確認
- domain boundary の確認

初期段階では、DBや専用ツールの導入を急がない。

まずは設計文書または管理表として event catalog を整備することを検討する。

---

## ■ trace metadata governance

trace metadata governance は、trace / event に付随する metadata の意味・命名・粒度を統制する考え方である。

対象:

- `trace_id`
- `parent_trace_id`
- `request_id`
- `warehouse_code`
- `event_name`
- `event_version`
- `metadata_version`
- `operator_id`
- `source_system`
- `external_file_hash`
- `replay_of_trace_id`

方針:

- metadata は「何でも入れる自由欄」にしない
- `warehouse_code` は guard 由来など信頼できる値を使う
- `project_no` と `issue_no` を混同しない
- secret / token / API key を metadata に入れない
- 大きな OCR / EDI / PDF 本文を metadata に直接入れない
- replay / audit に必要な最小限から始める

metadata の追加・変更も event schema change と同様に影響確認が必要である。

---

## ■ replay / rebuild governance

replay / rebuild governance は、event を再実行・再構築に使う際の安全性を保つための統制である。

### replay governance

確認観点:

- replay 対象 event
- event version
- replay 禁止ケース
- replay 理由
- 実行者 / 承認者
- 元 trace と replay trace の関係
- dry-run / 本実行
- replay 結果 event

方針:

- replay は元 event を上書きしない
- replay は idempotency retry と混同しない
- 請求・実物流・外部送信済み event は要承認または禁止を検討する
- replay 結果は audit 可能にする

### rebuild governance

確認観点:

- rebuild 対象 projection / read model
- source of truth
- event version handling
- deprecated event handling
- rebuild diff
- snapshot 利用有無

方針:

- rebuild は source of truth を根拠にする
- read model / projection を真実として扱わない
- rebuild error / diff は observability / integrity monitoring の対象にする

---

## ■ audit / forensic governance

audit / forensic governance は、event が後から説明可能であることを保つための統制である。

audit で必要な観点:

- event name
- owner domain
- source of truth
- created_at / event_time
- operator metadata
- warehouse_code
- trace_id / parent_trace_id
- correction event
- deprecated / replacement 関係

forensic で必要な観点:

- partial write
- missing event
- duplicate event
- projection diff
- replay / correction の経緯
- external file hash
- request_id

方針:

- event の意味を後から説明できるようにする
- correction event で元 event との関係を残す
- deprecated event も audit / forensic で読めるようにする
- archive 後も trace chain を切らない

---

## ■ workflow / saga governance

workflow / saga governance は、複数 domain にまたがる event chain の整合性を保つための統制である。

確認観点:

- workflow owner
- step event name
- step owner domain
- integration event
- compensation action
- timeout / retry
- stuck workflow detection
- replay / recovery policy
- parent_trace_id / trace chain

方針:

- workflow の各 step は domain event として説明できるようにする
- saga の compensation は元 event を消さず correction / compensation event として扱う
- workflow event chain の変更は consumer / projection / monitoring 影響を確認する
- stuck / missing / duplicate は monitoring 対象にする

---

## ■ approval / review policy の考え方

event governance では、変更の種類に応じて review の強さを分ける。

軽微な変更候補:

- optional metadata の追加
- event catalog の説明追記
- projection 表示項目の追加

強い review が必要な変更候補:

- 新しい event name の追加
- required metadata の追加
- event meaning の変更
- integration event schema の変更
- deprecated event の設定
- replay / rebuild 影響がある変更
- billing / audit / external system に関わる event 変更

方針:

- owner domain が primary reviewer になる
- 影響を受ける consumer domain も確認する
- schema change は compatibility を確認する
- replay / rebuild / audit への影響を確認する
- 初期段階では重い承認プロセスより、設計レビューと変更理由の明文化を優先する

---

## ■ domain boundary と governance の関係

domain boundary は、業務用語・責務・event ownership の境界である。

governance 上の原則:

- domain をまたいで event の意味を勝手に変更しない
- 他 domain の source of truth を直接壊さない
- cross-domain 連携は integration event / trace metadata で説明する
- owner domain が不明な event は追加しない
- domain boundary をまたぐ変更は consumer 影響を確認する

例:

- inventory は数量変動を所有する
- pallet はパレット物理状態を所有する
- shipment は出荷業務フローを所有する
- billing は請求確定と請求根拠を所有する
- OCR / EDI は外部入力と解析結果を所有する

domain boundary を明確にすることで、event governance は単なる命名ルールではなく、責務分離の仕組みになる。

---

## ■ 導入段階案

### Step 1: owner domain の整理

既存 event candidate と `transaction_type` 対応について、owner domain を整理する。

### Step 2: event catalog 候補作成

event name、owner domain、source of truth、lifecycle、metadata を一覧化する。

### Step 3: naming / schema change review の開始

新規 event name と schema change について、最低限の review 観点を適用する。

### Step 4: deprecated / compatibility 方針整理

古い event name や将来置換される event の扱いを整理する。

### Step 5: replay / rebuild / workflow への接続

event catalog を replay planner、rebuild、workflow observability の判断材料として使う設計を検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- event catalog をDBで管理するか
- event catalog をコード管理するか文書管理するか
- event owner の正式なレビュールール
- schema change の承認フロー
- compatibility check をCIで行うか
- deprecated event の運用期間
- integration event の consumer 登録方法
- trace metadata の必須化範囲
- replay approval の正式フロー
- rebuild job と governance の接続方法
- workflow owner の定義方法
- saga compensation の正式 event name
- governance 違反を検知する lint / validation
- admin-dashboard で event catalog を表示するか

---

## ■ 原則

event は長期的な業務資産である。

event name は業務意味を表し、owner domain がその意味を管理する。

schema change は backward compatibility、replay、rebuild、projection、audit への影響を確認する。

deprecated event は削除せず、読み続けられるようにする。

governance は domain boundary を守り、event chain を将来も説明可能にするための仕組みである。
