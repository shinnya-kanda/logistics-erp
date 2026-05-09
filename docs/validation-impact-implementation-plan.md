# Validation / Impact Implementation Plan（Phase B8-08）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における validation / impact analysis の段階導入計画を整理する。

ERP設計憲法、開発ルール、event validation architecture、event impact analysis architecture、external integration implementation plan、projection consistency implementation plan、workflow / saga implementation plan、observability / monitoring implementation plan、event-driven implementation roadmap を前提にすると、validation は単なる入力項目チェックではない。event / metadata / identity / time / warehouse boundary / projection / workflow / external input が業務上説明可能かを確認し、impact analysis はその rule や schema を変更したときにどこへ波及するかを事前に整理する活動である。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- validation / impact implementation の目的
- schema / metadata validation 方針
- identity / time validation 方針
- warehouse boundary validation 方針
- projection validation 方針
- workflow validation 方針
- external input validation 方針
- validation severity 方針
- warning / error / manual review 方針
- impact analysis checklist 方針
- breaking change 判定方針
- governance / approval との関係
- observability / recovery との関係
- rollout / verification 方針
- lightweight validation 方針
- future optional architecture

---

## ■ validation / impact implementation の目的

validation / impact implementation は、業務 event とそれに関係する read model / workflow / external input / recovery が、source of truth と warehouse boundary を壊さずに進化できる状態を作るための導入計画である。

目的:

- source of truth に入る前に拒否すべき不正を明確にする
- source of truth に入った後に観測・調査すべき不整合を明確にする
- validation failure を silent skip しない
- warning / error / manual review / recovery の扱いを分ける
- validation rule 変更による false positive / false negative の影響を確認する
- schema / metadata / workflow / projection の変更影響を事前に整理する
- breaking change を技術互換性だけでなく業務影響で判定する
- governance / approval / observability / recovery へ接続する

validation は「すべてを自動拒否する仕組み」ではない。

現場運用を止めず、既存履歴を壊さず、異常を説明可能に扱うための判断層として段階導入する。

---

## ■ schema / metadata validation 方針

schema validation は、event payload / external input / projection input の構造が定義された契約に合っているかを確認する。

metadata validation は、trace / warehouse / operator / external / replay / recovery などの補助情報が正しい意味で付与されているかを確認する。

検証候補:

- event_name が event catalog に存在するか
- event_version / metadata_version を解釈できるか
- required field が存在するか
- field type / enum / status が許容範囲内か
- required metadata が存在するか
- `trace_id` / `parent_trace_id` / `request_id` の意味が混同されていないか
- `warehouse_code` が信頼できる source 由来か
- `source_system` / `external_file_hash` が必要な event に存在するか
- secret / token / API key / 大きな OCR / EDI 本文が metadata に入っていないか

方針:

- schema / metadata は event contract / event governance と接続する
- required field 欠落は error 候補にする
- optional field 欠落は warning または許容候補にする
- unknown optional field は可能な限り許容する方針を検討する
- 古い event / deprecated event を silent skip しない
- metadata を「何でも入れる自由欄」にしない

impact 観点:

- required field / required metadata の追加は consumer 影響を確認する
- field 名変更、型変更、意味変更は breaking change 候補にする
- metadata の追加でも sensitive metadata の場合は security impact を確認する

---

## ■ identity / time validation 方針

identity validation は、ID が正しい意味で使われているかを確認する。

time validation は、event time / business time / created_at / processed_at / replay time / workflow time が矛盾していないかを確認する。

identity 検証候補:

- `trace_id` を `request_id` として流用していないか
- `idempotency_key` を `trace_id` として流用していないか
- `parent_trace_id` が循環していないか
- replay 元 trace と replay 結果 trace が分離されているか
- external ID を internal primary key として扱っていないか
- duplicate detection に必要な identity が揃っているか

time 検証候補:

- `created_at` が存在するか
- business event time が system persisted time と大きく乖離していないか
- `scanned_at` / uploaded_at / received_at / processed_at の順序が不自然でないか
- replay time と original event time が混同されていないか
- workflow timeout / stuck 判定に必要な時刻があるか
- external system clock drift を考慮できているか

方針:

- ID field は意味を持つため流用しない
- delayed upload / offline scan を単純に不正扱いしない
- clock drift は warning / manual review / dead-letter 候補にする
- identity が不足している event は automatic recovery の対象にしない
- duplicate detection は単一 ID だけに依存しない

---

## ■ warehouse boundary validation 方針

warehouse boundary validation は、event / trace / projection / workflow / external input / replay / recovery / audit view が許可された `warehouse_code` 境界内にあるかを確認する。

検証候補:

- write command の `warehouse_code` が guard / authenticated profile 由来か
- client payload の `warehouse_code` を信頼していないか
- external file / EDI / CSV 内の warehouse code を無条件に採用していないか
- trace-search / audit view が guard 由来 warehouse_code で絞られているか
- projection diff が warehouse boundary を越えていないか
- replay / rebuild / recovery 対象 warehouse_code が実行者権限内か
- cross-domain trace が warehouse boundary を不自然にまたいでいないか

方針:

- `warehouse_code` は主要な業務境界として扱う
- trace_id が一致しても warehouse boundary を越えてよいとは限らない
- external input の warehouse_code は mapping / validation / manual review 対象にする
- warehouse boundary violation は high / critical severity 候補にする
- boundary violation は projection drift ではなく security / data isolation issue として扱う

impact 観点:

- `warehouse_code` の source を変更する場合は breaking change 候補にする
- Admin Dashboard / trace-search / external integration / recovery への表示範囲影響を確認する

---

## ■ projection validation 方針

projection validation は、projection / read model / cache が source of truth と説明可能に整合しているかを確認する。

初期対象:

- `inventory_transactions` vs `inventory_current`
- `pallet_transactions` vs `pallet_units`
- source rows vs trace timeline
- 将来の workflow status
- 将来の billing summary

検証候補:

- missing row
- extra row
- quantity mismatch
- status mismatch
- location mismatch
- stale projection
- duplicate projection
- source row 変換失敗
- replay / correction event 未反映
- warehouse boundary mismatch

方針:

- projection は source of truth ではない
- validation は source of truth を根拠にする
- drift を見つけても source of truth を削除・更新しない
- 初期は compare-only / dry-run を優先する
- projection validation failure は refresh / rebuild / correction / recovery の入口にする
- `inventory_current` / `pallet_units` など high risk projection を優先する

impact 観点:

- projection logic 変更時は rebuild / diff detection / observability への影響を確認する
- read model の表示都合で source of truth を歪めない

---

## ■ workflow validation 方針

workflow validation は、workflow / saga の event chain と step state が業務フローとして妥当かを確認する。

対象候補:

- OCR / expected workflow
- actual scan workflow
- reconciliation workflow
- shipment workflow
- billing candidate workflow
- replay / recovery workflow

検証候補:

- required predecessor event が存在するか
- expected next event が一定時間内に発生しているか
- stuck workflow が発生していないか
- duplicate step がないか
- invalid transition が発生していないか
- compensation action が元 step と関係づいているか
- replay 禁止 transition に replay が実行されていないか
- workflow owner / step owner が明確か

方針:

- workflow validation は event catalog / dependency / impact analysis と接続する
- stuck workflow を自動削除しない
- commit 済み step は rollback ではなく compensation / correction で扱う
- 請求・実物流・外部送信に関わる workflow は強い validation / approval 候補にする
- synchronous に拒否すべき rule と asynchronous に検知する rule を分ける

impact 観点:

- required predecessor / expected next event の変更は downstream workflow impact を確認する
- timeout / stuck detection rule の変更は false positive / false negative を確認する

---

## ■ external input validation 方針

external input validation は、OCR / EDI / CSV / Excel / external API / NAS / local file など信頼境界外の入力が業務に使える状態か確認する。

検証候補:

- file / message schema を解釈できるか
- required field / required column が揃っているか
- source_system が明確か
- external_file_hash / external_message_id が妥当か
- external ID を internal primary key として扱っていないか
- project_no / issue_no / business identifier が混同されていないか
- event_time / received_at / processed_at が不自然でないか
- warehouse_code boundary と矛盾しないか
- duplicate file / duplicate message / duplicate row がないか
- sensitive metadata / secret が混入していないか

方針:

- external input を source of truth に直結させない
- parse / validate / preview / accepted / rejected / corrected を分離する
- validation failure を silent skip しない
- warning / error / manual review / dead-letter / recovery を分類する
- external file 本文や大きな payload を metadata に入れすぎない
- retry / replay / duplicate を混同しない

impact 観点:

- EDI / CSV / Excel schema change は event contract / governance review 候補にする
- 外部送信済み event の replay は要承認または禁止候補にする

---

## ■ validation severity 方針

validation severity は、検証結果の業務影響と対応優先度を表す。

分類候補:

| severity | 意味 | 例 | 初期対応 |
| --- | --- | --- | --- |
| info | 記録・観測対象 | optional metadata 欠落 / trace_id nullable 既存行 | 記録・経過確認 |
| warning | 処理継続可能だが確認対象 | delayed upload / minor projection lag | 手動確認・warning 期間 |
| error | 処理停止または recovery 対象 | required metadata 欠落 / invalid transition | reject / dead-letter / recovery |
| critical | 境界・請求・実物流影響 | warehouse boundary violation / source of truth tampering | 承認付き対応 |

分類観点:

- source of truth への影響
- warehouse boundary への影響
- projection / read model への影響
- workflow / external integration への影響
- billing / 実物流への影響
- replay / rebuild 可能性への影響
- automatic recovery 可否
- manual review 必要性

方針:

- severity は技術エラー種別だけで決めない
- 同じ validation failure でも業務影響により severity は変わる
- warning から error / critical へ引き上げる場合は impact analysis 対象にする
- high risk validation は warning 期間を検討する
- severity は alert / authorization / recovery と接続する

---

## ■ warning / error / manual review 方針

warning / error / manual review は、validation failure の扱いを業務影響で分けるための分類である。

warning 候補:

- optional metadata 欠落
- minor projection freshness delay
- delayed upload / clock drift
- external identity の一部不足
- trace_id nullable 既存行

error 候補:

- required field / required metadata 欠落
- schema unreadable
- invalid transition
- replay 禁止候補への replay
- source of truth と projection の重大差分

manual review 候補:

- warehouse_code mapping に疑義がある
- OCR confidence が低い
- EDI / CSV / Excel schema が不明
- duplicate external input がある
- billing / 実物流 / 外部送信に影響する
- false positive / false negative の業務影響が大きい

方針:

- warning も observability / audit の対象にする
- error を silent skip しない
- manual review は例外ではなく正式な workflow step として扱う
- validation failure を自動削除で解決しない
- correction / recovery が必要な場合は元 event / trace との関係を残す

---

## ■ impact analysis checklist 方針

impact analysis checklist は、event / schema / metadata / validation rule / projection / workflow / external integration を変更する前に影響範囲を確認するための軽量な確認表である。

checklist 候補:

- owner domain は明確か
- event name / event meaning が変わるか
- schema / required field / enum / metadata が変わるか
- producer の生成条件・生成タイミングが変わるか
- consumer / projection / workflow が影響を受けるか
- replay / rebuild / recovery が過去 event を読めるか
- validation rule / severity / warning period が変わるか
- warehouse boundary / security / sensitive metadata へ影響するか
- external integration / external schema / file hash / source_system へ影響するか
- observability / audit / forensic で説明できるか
- rollback ではなく compensation / correction / recovery 方針があるか

方針:

- impact analysis は変更を止めるためではなく、影響範囲と責任を明確にするために使う
- dependency graph が未整備な領域は manual review 対象にする
- 初期は Markdown checklist で開始する
- high risk domain から適用する
- 影響範囲が広い変更は owner domain / affected consumer / security review へ接続する

---

## ■ breaking change 判定方針

breaking change は、既存 producer / consumer / projection / workflow / replay / rebuild / validation / audit が安全に動かなくなる変更である。

breaking change 候補:

- event name の変更
- event meaning の変更
- required field の削除
- required field の意味変更
- field type の変更
- enum 値の削除
- required metadata の削除
- `warehouse_code` source の変更
- deprecated event を読めなくする変更
- projection rebuild 不能になる変更
- workflow required predecessor を破壊する変更
- validation severity を error / critical へ変更して既存 event を止める変更
- replay / rebuild 禁止範囲を変える変更
- external integration schema を互換性なく変更すること

非 breaking になりやすい変更候補:

- optional field の追加
- optional metadata の追加
- event catalog の説明追記
- unknown field を許容する consumer 向けの schema 拡張
- read model の表示専用 field 追加
- warning として始める validation rule 追加

注意:

- optional field 追加でも、consumer が unknown field を拒否する場合は breaking になり得る
- enum 値追加でも、consumer が exhaustive handling を前提にしている場合は breaking になり得る
- metadata 追加でも sensitive metadata の場合は security impact が高い
- validation severity の変更は operational breaking change になり得る

方針:

- breaking change 判定は技術的互換性だけでなく業務影響で判断する
- breaking change は owner domain / affected consumer / governance review の対象にする
- breaking change が必要な場合は migration path / deprecated period / adapter / manual recovery を検討する
- 既存 source of truth を直接書き換えて互換性問題を隠さない

---

## ■ governance / approval との関係

governance は、validation rule と impact analysis の意味・責務・変更手順を支える。

governance で定義するもの:

- event name
- owner domain
- producer / consumer
- schema / version
- required / optional metadata
- identity の意味
- time metadata の意味
- allowed / invalid transition
- replay / rebuild support
- security boundary
- external integration contract

approval が必要になりやすい変更:

- 新しい event name の追加
- required metadata の追加
- event meaning の変更
- integration event schema の変更
- workflow step dependency の変更
- validation severity の error / critical 化
- replay / rebuild support の変更
- billing / external system / audit / security に関わる変更
- breaking change 判定された変更

方針:

- owner domain が primary reviewer になる
- affected consumer / projection / workflow owner も確認する
- security 影響がある場合は security review を含める
- 初期段階では重い承認プロセスより、設計レビューと変更理由の明文化を優先する
- approval の正式 workflow / role matrix は今回決定しない

---

## ■ observability / recovery との関係

validation result と impact analysis result は observability / recovery の入力になる。

observability 候補:

- validation error count
- validation warning count
- severity 別 count
- domain 別 validation failure
- warehouse_code 別 validation failure
- schema / metadata / identity / time validation failure
- projection validation failure
- workflow validation failure
- external input validation failure
- breaking change review count

recovery 接続:

- schema unreadable -> dead-letter / manual review
- identity missing -> recovery blocked
- time inconsistency -> manual review / forensic
- projection drift -> projection refresh / rebuild
- invalid transition -> correction / manual recovery
- workflow stuck -> retry / resume / compensation
- warehouse boundary violation -> security incident
- external input duplicate -> investigation / manual review

方針:

- validation failure は monitoring / alert / recovery の入口にする
- warning も audit / observability 対象にできるようにする
- recovery は source of truth と validation result を根拠にする
- validation / impact result 自体も将来 audit trail の候補にする
- alert 閾値、通知先、保存先は今回決定しない

---

## ■ rollout / verification 方針

rollout は、validation engine や自動 CI からではなく、high risk domain の checklist と warning 運用から始める。

推奨 rollout 順:

1. validation 対象を棚卸しする
2. severity の初期分類を整理する
3. impact analysis checklist を Markdown で作る
4. warehouse boundary validation を優先整理する
5. projection validation を compare-only と接続する
6. workflow validation の required predecessor / expected next event を整理する
7. external input validation の accepted / rejected / corrected を整理する
8. warning / error / manual review の扱いを整理する
9. governance / approval / observability / recovery へ接続する

verification 観点:

- validation failure を silent skip していない
- warning と error を混同していない
- manual review が必要なものを自動処理していない
- warehouse boundary を越えていない
- projection を source of truth として扱っていない
- external input を source of truth に直結していない
- breaking change 判定に業務影響が含まれている
- validation severity 変更の impact を確認している

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の validation checklist review
- 将来の impact analysis checklist review
- 将来の compare-only result review

---

## ■ lightweight validation 方針

lightweight validation は、最初から大きな validation engine / schema registry / CI gate を作らず、設計表・checklist・manual review から始める方針である。

初期方針:

- validation engine を今回作らない
- validation result table を今回作らない
- schema registry を今回作らない
- impact analysis CI を今回作らない
- Admin Dashboard validation UI を今回作らない
- まず Markdown checklist で high risk domain を整理する
- warning 期間を設けて false positive / false negative を確認する

lightweight start の対象:

- warehouse boundary checklist
- projection validation checklist
- workflow validation checklist
- external input validation checklist
- severity classification table
- breaking change checklist
- validation rule change checklist

方針:

- source of truth と warehouse boundary を最優先で守る
- high risk domain から validation rule を段階的に増やす
- 完璧な自動検証より、更新し続けられる軽量な管理を優先する
- 実装・DB・CI・UI は必要性が明確になった段階で検討する

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回決定しない。

候補:

- validation engine
- validation result table
- validation rule registry
- schema registry
- metadata schema registry
- impact analysis registry
- dependency graph table
- breaking change checker
- schema diff tool
- validation rule diff tool
- impact analysis CI
- dead-letter table / queue
- manual review queue
- Admin Dashboard validation view
- Admin Dashboard impact analysis view
- validation alert dashboard
- recovery planner
- external input validation job
- projection validation job

導入判断の観点:

- source of truth を壊さないか
- warehouse boundary を維持できるか
- validation failure を説明可能に扱えるか
- false positive / false negative の業務影響を抑えられるか
- governance / approval と接続できるか
- observability / recovery / audit と接続できるか
- 現場運用を止めずに段階導入できるか

---

## ■ 今後の検討事項

以下は今回決定しない。

- validation engine を作るか
- validation result の保存先
- validation rule を Markdown / DB / code / YAML のどこで管理するか
- schema registry を導入するか
- metadata schema registry を導入するか
- command 実行前 validation と非同期 validation の正式な切り分け
- warning 期間の長さ
- severity の正式定義
- manual review queue の実装方式
- dead-letter table / queue を作るか
- impact analysis checklist の正式フォーマット
- impact analysis を CI で必須化するか
- dependency graph の保存先
- breaking change checker を作るか
- approval workflow の role matrix
- Admin Dashboard validation / impact 表示
- validation / impact result の audit trail 保存先

---

## ■ 原則

validation は入力項目チェックだけではない。

event / metadata / identity / time / projection / workflow / external input / warehouse boundary が、業務上説明可能かを確認する。

impact analysis は変更を止めるためではなく、変更がどこへ波及するかを事前に説明するために行う。

validation failure は削除ではなく、warning、manual review、dead-letter、correction、recovery へ接続する。

breaking change は技術互換性だけでなく、source of truth、warehouse boundary、rebuild 可能性、audit 可能性、現場運用への影響で判断する。
