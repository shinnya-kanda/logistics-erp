# Event Validation Architecture（Phase B7-95）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における event / metadata / identity / time / state transition の検証方針を整理する。

event state transition、event identity、event time、event catalog、event governance、event security、trace integrity を前提にすると、validation は単なる入力項目チェックではない。event が業務上説明可能であり、warehouse boundary を守り、identity / time / metadata / state transition が矛盾せず、replay / rebuild / recovery の根拠として使える状態を保つための設計である。

本ドキュメントでは以下を整理する。

- event validation の目的
- schema validation
- metadata validation
- identity validation
- time validation
- warehouse boundary validation
- state transition validation
- replay / rebuild validation
- workflow validation
- projection validation
- security validation
- validation severity
- validation error / warning の扱い
- observability / recovery との関係
- lightweight start 方針
- governance との関係

今回は Markdown の設計整理のみを行い、migration・実装・Edge Function・RPC・README は変更しない。

---

## ■ event validation の目的

event validation は、event が schema、metadata、identity、time、state transition、security boundary の観点で業務上説明可能かを検証する考え方である。

目的:

- event schema / metadata の破壊的な不整合を検出する
- `trace_id` / `event_id` / `idempotency_key` などのID混同を防ぐ
- `warehouse_code` boundary を守る
- event time / created_at / processed_at の矛盾を検出する
- invalid transition / missing event / duplicate event を検出する
- replay / rebuild の対象範囲を誤らないようにする
- projection drift / stale state を検出する
- security / privacy 上危険な metadata を検出する
- validation 結果を observability / recovery / governance へ接続する

validation は、すべてを自動で拒否するための仕組みではない。

業務影響に応じて error、warning、manual review、recovery required に分類し、説明可能な対応へつなげることが重要である。

---

## ■ schema validation

schema validation は、event payload / metadata が定義された構造に合っているかを検証する。

検証候補:

- event_name が event catalog に存在するか
- event_version / metadata_version が解釈可能か
- required field が存在するか
- field type が期待通りか
- enum / status 値が許可範囲内か
- deprecated event を新規生成していないか
- unknown field を許容するか

方針:

- schema validation は owner domain の event contract を基準にする
- backward compatibility を考慮し、古い event を silent skip しない
- required field 欠落は error 候補にする
- optional field 欠落は warning または許容にできる
- deprecated event は読み取り可能にし、新規生成は制限することを検討する

---

## ■ metadata validation

metadata validation は、event / trace / workflow / replay / recovery に付随する metadata の意味と内容を検証する。

検証候補:

- `trace_id` が存在するか
- `warehouse_code` が存在し、許可された範囲か
- `event_name` と metadata の組み合わせが自然か
- `project_no` と `issue_no` が混同されていないか
- `source_system` / `external_file_hash` が必要な event で存在するか
- replay metadata に元 trace / reason / operator があるか
- free text に secret / token / API key が含まれていないか
- metadata size が過大でないか

方針:

- metadata は「何でも入れる自由欄」にしない
- metadata の意味は event catalog / metadata schema と合わせる
- sensitive metadata は通常表示と forensic 表示で分けることを検討する
- 大きな OCR / EDI / PDF 本文を metadata に直接入れない

---

## ■ identity validation

identity validation は、event / trace / workflow / replay / projection / integration の識別子が正しい意味で使われているかを検証する。

検証候補:

- `event_id` が一意か
- `trace_id` が業務操作単位として一貫しているか
- `request_id` を `trace_id` として流用していないか
- `idempotency_key` を `trace_id` として流用していないか
- `parent_trace_id` が循環していないか
- replay 元 trace と replay 結果 trace が分離されているか
- external ID を internal primary key として扱っていないか
- duplicate detection に必要な identity が揃っているか

方針:

- ID field は意味を持つため流用しない
- identity が不足している event は automatic recovery の対象にしない
- external integration では source_system と external ID の組み合わせを検証する
- duplicate detection は1つのIDだけに依存しない

---

## ■ time validation

time validation は、event time / processing time / business time / replay time / workflow time の矛盾を検証する。

検証候補:

- `created_at` が存在するか
- business event time が system time と大きく乖離していないか
- `scanned_at` が `uploaded_at` より不自然に未来でないか
- `processed_at` が `created_at` より前になっていないか
- replay time と original event time が混同されていないか
- rebuild 対象 time range が明示されているか
- workflow timeout / stuck 判定に必要な時刻があるか
- external system clock drift が許容範囲内か

方針:

- `created_at` は保存時刻であり、業務発生時刻とは限らない
- delayed event / offline scan を単純に不正扱いしない
- clock drift が大きい場合は warning / manual review / dead-letter 候補にする
- replay / recovery / correction の時刻は元 event time と分離する

---

## ■ warehouse boundary validation

warehouse boundary validation は、event / trace / projection / replay / rebuild / archive が許可された `warehouse_code` 境界内にあるかを検証する。

検証候補:

- write command の `warehouse_code` が guard / server-side profile 由来か
- client payload の `warehouse_code` を信頼していないか
- trace-search / audit view が guard.warehouseCode で絞られているか
- cross-domain trace の event が warehouse boundary を不自然にまたいでいないか
- replay / rebuild 対象 warehouse_code が実行者権限内か
- archive / cold storage 参照でも warehouse boundary が維持されているか

方針:

- `warehouse_code` は主要な業務境界として扱う
- trace_id が一致しても warehouse boundary を越えてよいとは限らない
- warehouse boundary violation は high / critical severity 候補にする
- validation 結果は security / recovery / audit と接続する

---

## ■ state transition validation

state transition validation は、event による状態変化が owner domain の業務ルール上許されるかを検証する。

検証候補:

- required predecessor event が存在するか
- invalid transition が発生していないか
- OUT 済み pallet が MOVE されていないか
- shipment cancelled 後に billing candidate が作成されていないか
- inventory out が在庫不足を起こしていないか
- workflow completed だが必須 step が missing していないか
- projection state が source of truth と矛盾していないか
- replay 禁止 transition に replay が実行されていないか

方針:

- transition rule は owner domain が定義する
- invalid transition を検出しても source of truth を自動削除しない
- invalid transition は investigation / correction / recovery / manual review の対象にする
- synchronous に拒否すべき transition と asynchronous に検知する transition を分ける

---

## ■ replay / rebuild validation

### replay validation

replay validation は、replay の planning / dry-run / execution / post-check が安全に行えるかを検証する。

検証候補:

- replay 対象 event が replay_supported か
- replay 禁止 event が含まれていないか
- 元 trace / event / external input が参照できるか
- replay trace が元 trace と分離されているか
- replay reason / requester / approver があるか
- dry-run と本実行が区別されているか
- replay 後の projection / workflow 影響が説明できるか

### rebuild validation

rebuild validation は、source of truth から projection / read model を再構築できるかを検証する。

検証候補:

- source event version を解釈できるか
- deprecated event を扱えるか
- source event range / trace range が明確か
- rebuild diff が説明可能か
- archive data を参照できるか
- rebuild result が warehouse boundary を越えていないか

方針:

- replay / rebuild は通常 retry と混同しない
- replay / rebuild validation failure は recovery 対象にする
- 読めない event を silent skip しない
- replay / rebuild の validation 結果は audit trail に残すことを検討する

---

## ■ workflow validation

workflow validation は、workflow / saga の event chain と state が業務フローとして妥当かを検証する。

検証候補:

- workflow の current step が event chain と一致するか
- expected next event が一定時間内に発生しているか
- stuck workflow が発生していないか
- duplicate step がないか
- compensation action が元 step と関係づいているか
- recovery state が workflow state と矛盾していないか
- workflow owner / step owner が明確か

方針:

- workflow validation は event catalog / workflow dependency catalog と接続する
- stuck は削除ではなく retry / compensation / manual recovery の対象にする
- workflow validation failure は severity と業務影響で分類する
- 請求・実物流に関わる workflow は強い validation / approval を検討する

---

## ■ projection validation

projection validation は、projection / read model / summary / cache が source of truth と説明可能に整合しているかを検証する。

検証候補:

- `inventory_transactions` 集計と `inventory_current` が一致するか
- 最新 `pallet_transactions` と `pallet_units` が一致するか
- workflow event chain と workflow status が一致するか
- billing summary が source event と一致するか
- projection freshness / lag が許容範囲内か
- last_projected_event_id / checkpoint が不自然でないか
- replay / correction event が projection に反映されているか

方針:

- projection は source of truth ではない
- projection validation は source of truth を根拠にする
- drift を検出しても source of truth を削除・更新しない
- projection validation failure は refresh / rebuild / recovery の対象にする

---

## ■ security validation

security validation は、event / metadata / trace / replay / archive が security boundary を守っているかを検証する。

検証候補:

- source of truth が不正 update / delete されていないか
- sensitive metadata が不要に含まれていないか
- secret / token / API key が metadata に含まれていないか
- external file reference が直接公開されていないか
- replay / rebuild / recovery の実行権限が妥当か
- audit / forensic view の表示範囲が適切か
- archive metadata と file hash が一致するか
- event tampering の兆候がないか

方針:

- security validation は governance / audit と接続する
- violation は high / critical severity 候補にする
- sensitive metadata は通常画面と forensic 画面で扱いを分ける
- tampering detection は自動削除ではなく調査対象にする

---

## ■ validation severity の考え方

validation severity は、検証結果の業務影響と対応優先度を表す。

分類候補:

| severity | 意味 | 例 |
| --- | --- | --- |
| info | 記録・観測対象 | optional metadata 欠落 |
| warning | 処理継続可能だが確認対象 | delayed upload / minor projection lag |
| error | 処理停止または recovery 対象 | required metadata 欠落 / invalid transition |
| critical | 強い承認・緊急対応対象 | warehouse boundary violation / source of truth tampering |

分類観点:

- source of truth への影響
- warehouse boundary への影響
- billing / external integration への影響
- 実物流への影響
- replay / rebuild 可能性への影響
- automatic recovery 可否
- manual review 必要性

方針:

- severity は技術エラー種別だけで決めない
- 同じ validation failure でも業務影響により severity は変わる
- severity は alert / authorization / recovery と接続する

---

## ■ validation error / warning の扱い

validation error / warning は、検出後の扱いを明確にする必要がある。

扱い候補:

- reject
- accept with warning
- quarantine / dead-letter
- manual review
- retry
- projection refresh
- rebuild
- correction event
- recovery workflow

方針:

- error を silent skip しない
- warning も observability / audit の対象にできるようにする
- dead-letter は event を捨てる場所ではない
- validation failure を自動削除で解決しない
- correction / recovery が必要な場合は元 event との関係を残す

---

## ■ observability / recovery との関係

validation は observability / recovery の入力になる。

観測候補:

- validation error count
- validation warning count
- severity 別 count
- domain 別 validation failure
- warehouse_code 別 validation failure
- schema validation failure
- identity validation failure
- time validation failure
- state transition validation failure
- projection validation failure
- security validation failure

recovery 接続:

- schema unreadable -> dead-letter / manual review
- identity missing -> recovery blocked
- time inconsistency -> manual review / forensic
- projection drift -> projection recovery
- invalid transition -> correction / manual recovery
- warehouse boundary violation -> security incident

方針:

- validation failure は monitoring / alert / recovery の入口にする
- recovery は source of truth と validation result を根拠にする
- validation result 自体も audit trail の候補にする

---

## ■ lightweight start 方針

event validation は重要だが、最初から巨大な validation engine を作ると複雑になる。

lightweight start の候補:

- 既存 trace-search 結果で説明可能性を確認する
- `trace_id` / `warehouse_code` / `created_at` / `source` の基本 validation を整理する
- `inventory_current` と `inventory_transactions` の projection validation を整理する
- `pallet_units` と `pallet_transactions` の projection validation を整理する
- workflow stuck / missing event の代表パターンを整理する
- sensitive metadata / secret 混入の禁止ルールを文書化する
- validation severity の設計表から始める

方針:

- まず source of truth と warehouse boundary を守る
- 次に identity / time / state transition の検証候補を整理する
- high risk domain から validation rule を段階的に増やす
- 具体的な table / job / API / CI / UI は今回決定しない

---

## ■ governance との関係整理

validation rule は governance の実行手段である。

governance で定義するもの:

- event name
- owner domain
- schema / version
- required / optional metadata
- identity の意味
- time metadata の意味
- allowed / invalid transition
- replay / rebuild support
- security boundary

validation で確認するもの:

- governance で定義したルールに event が従っているか
- schema change が backward compatibility を壊していないか
- deprecated event の扱いが正しいか
- consumer / projection / workflow が必要な metadata を読めるか

方針:

- validation rule の owner は owner domain と governance で整理する
- validation rule 変更は event catalog / metadata schema / security 方針へ影響する
- validation failure の扱いも governance 上の review 対象にする

---

## ■ 導入段階案

### Step 1: validation 対象の棚卸し

schema、metadata、identity、time、warehouse boundary、state transition、projection、security の検証候補を整理する。

### Step 2: severity 設計

info / warning / error / critical の分類と、domain ごとの業務影響を整理する。

### Step 3: high risk validation の優先整理

warehouse boundary、source of truth、inventory / pallet projection、security metadata から優先する。

### Step 4: workflow / replay / rebuild validation 整理

stuck workflow、replay 禁止、rebuild diff、deprecated event handling を整理する。

### Step 5: observability / recovery 接続

validation result を monitoring、alert、dead-letter、manual review、recovery へ接続する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- validation engine を作るか
- validation job を作るか
- validation result の保存先
- validation severity の正式定義
- validation rule をコード / DB / Markdown のどこで管理するか
- schema registry と validation を統合するか
- validation を command 実行前 / 実行後 / 非同期 job のどこで行うか
- validation failure の UI 表示
- dead-letter table / queue を作るか
- warehouse boundary violation の alert 方式
- sensitive metadata の自動検出方式
- replay / rebuild validation の承認フロー
- event catalog と validation registry を統合するか

---

## ■ 原則

validation は入力項目チェックだけではない。

event / metadata / identity / time / state transition / security boundary が業務上説明可能かを確認する。

validation failure は削除ではなく、warning、manual review、dead-letter、correction、recovery へ接続する。

source of truth と warehouse boundary を最優先で守る。

validation は governance / observability / recovery / audit の共通基盤になる。
