# Rebuild / Recovery Implementation Plan（Phase B8-04）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における rebuild / refresh / recovery / correction / replay の実装導入計画を整理する。

ERP設計憲法、開発ルール、projection consistency implementation plan、event recovery architecture、trace replay design、event-driven ERP principles、event validation、event impact analysis を前提にすると、rebuild / recovery は「壊れたデータを戻す」ための一括処理ではない。source of truth を守り、projection / read model / workflow / trace timeline の不整合や失敗を、説明可能な方法で検出・確認・回復するための段階導入である。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- rebuild / recovery implementation の目的
- rebuild / refresh / replay / correction の違い
- `inventory_current` rebuild 方針
- `pallet_units` rebuild 方針
- trace timeline recovery 方針
- compare-only recovery 方針
- scoped rebuild 方針
- rollback を避ける方針
- correction event 方針
- manual review / approval 方針
- warehouse boundary 方針
- observability / audit 方針
- rollout / verification 方針
- lightweight recovery 方針
- future optional architecture

---

## ■ rebuild / recovery implementation の目的

rebuild / recovery implementation は、projection drift、read model failure、trace timeline 欠落、workflow stuck、replay failure、validation failure などを、source of truth と trace chain を根拠に説明可能に回復するための導入計画である。

目的:

- `inventory_current` / `pallet_units` を source of truth から検証・再構築できるようにする
- trace timeline の欠落・変換失敗・warehouse boundary 問題を調査できるようにする
- recovery と correction / replay / rebuild を混同しない
- dry-run / compare-only により本適用前に差分と業務影響を確認する
- scoped rebuild により対象範囲を小さく限定する
- commit 済み業務履歴を rollback で消さず、補正・rebuild・manual review で扱う
- recovery の理由・対象・実行者・結果を audit 可能にする
- warehouse_code boundary を recovery でも維持する

recovery は失敗を隠すための処理ではない。

何が失敗し、どの source of truth を根拠に、誰が、どの方法で回復したかを後から説明できるようにすることが目的である。

---

## ■ rebuild / refresh / replay / correction の違い整理

rebuild、refresh、replay、correction は似ているが、目的と対象が異なる。

| 種別 | 主目的 | 対象 | source of truth 変更 | 例 |
| --- | --- | --- | --- | --- |
| rebuild | source of truth から projection を再作成する | projection / read model / cache | しない | `inventory_transactions` から `inventory_current` を再構築 |
| refresh | projection の一部を再反映する | projection / read model / cache | しない | 特定 warehouse / pallet の current 状態を再計算 |
| replay | 過去入力・trace を参照し新しい操作として再実行する | command / workflow step / external input | 新しい event を追加し得る | OCR補正後に新しい trace で再処理 |
| correction | 誤った業務事実を補正 event / transaction として記録する | source of truth 上の業務事実 | 新しい補正履歴を追加する | 誤入庫を ADJUST で補正 |
| recovery | failure / drift / stuck から説明可能に回復する | projection / workflow / event processing | 手段による | rebuild / refresh / replay / correction / manual review を選び分ける |

方針:

- rebuild は source of truth を変更しない
- refresh は scoped な rebuild として扱える場合がある
- replay は idempotency retry と混同しない
- correction を recovery の名目で隠さない
- recovery は原因・業務影響・承認要否を確認して手段を選ぶ

---

## ■ `inventory_current` rebuild 方針

`inventory_current` は `inventory_transactions` から導出される projection である。

source of truth:

- `inventory_transactions`

rebuild 対象:

- `inventory_current`

rebuild の目的:

- ledger 集計と current quantity の差分を検出する
- projection update failure から回復する
- projection logic 変更後の差分を確認する
- replay / correction 後の current 反映を確認する

初期方針:

- まず compare-only で期待値と現行 `inventory_current` を比較する
- 本適用 rebuild は急がない
- rebuild は `inventory_transactions` を変更しない
- source of truth が誤っている場合は rebuild ではなく correction transaction を検討する
- warehouse_code / location_code / part_no / stock_type などで対象を限定する

差分分類候補:

- missing current row
- extra current row
- quantity mismatch
- location / stock_type mismatch
- latest transaction 未反映
- negative quantity risk
- idempotency replay 二重反映疑い

manual review が必要なケース:

- 数量差分が出庫・請求・棚卸に影響する
- source of truth 側の誤登録が疑われる
- correction transaction が必要になる
- warehouse_code boundary に疑義がある
- compare-only diff が大きすぎる

---

## ■ `pallet_units` rebuild 方針

`pallet_units` は `pallet_transactions` から導出されるパレット現在状態 cache / projection である。

source of truth:

- `pallet_transactions`

rebuild 対象:

- `pallet_units`

rebuild の目的:

- latest transaction と current state の差分を検出する
- 誤った current location / status を source of truth から検証する
- project_no correction や OUT 状態の反映漏れを確認する
- 実物流に関わる drift を早期に調査する

初期方針:

- まず compare-only で最新 `pallet_transactions` と `pallet_units` を比較する
- `pallet_units` を直接直して履歴不整合を隠さない
- rebuild は `pallet_transactions` を変更しない
- source of truth が誤っている場合は correction / compensation event を検討する
- warehouse_code / pallet_code / created_at range で scoped に扱う

差分分類候補:

- latest MOVE と current_location_code が一致しない
- OUT 済み pallet が active に見える
- active pallet に根拠 transaction がない
- transaction はあるが pallet unit がない
- project_no correction が反映されていない
- duplicate pallet state

manual review が必要なケース:

- 実物流がすでに動いている
- 出庫済み pallet の扱いに関わる
- correction / compensation の方向が業務判断を要する
- 顧客出荷・請求・棚卸に影響する

---

## ■ trace timeline recovery 方針

trace timeline は、複数 source of truth を read-only に統合して表示する projection / read model である。

source:

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- 将来の shipment / OCR / EDI / billing event

recovery 対象:

- trace-search の統合結果
- Admin Dashboard の trace timeline 表示
- source row 変換・ordering・metadata 表示

失敗候補:

- source row は存在するが timeline に出ない
- source ごとの変換 logic が失敗する
- 存在しない column を select して runtime error になる
- synthetic id / source row id が不安定
- created_at / event time ordering が説明しにくい
- warehouse boundary を越えた row が混入する

方針:

- trace timeline recovery は source of truth を変更しない
- source table の存在確認、変換 logic、warehouse_code filter、ordering を分けて調査する
- missing timeline は source row 削除で解決しない
- trace-search の failure は observability / audit の対象にする
- warehouse boundary violation は security / critical severity 候補にする

初期 recovery:

- source ごとの row count を確認する
- trace_id / warehouse_code / source / created_at を確認する
- 変換失敗を silent skip しない
- Admin Dashboard 表示は read-only に保つ

---

## ■ compare-only recovery 方針

compare-only recovery は、projection を変更せず、source of truth から期待状態を計算して現行 projection と比較し、recovery 判断材料を作る方式である。

目的:

- 本 rebuild 前に差分を確認する
- rebuild logic の安全性を確認する
- 差分の severity と業務影響を分類する
- manual review / approval の材料を作る
- 自動 recovery を急がず、現場影響を抑える

出力候補:

- recovery candidate id
- projection name
- warehouse_code
- affected key
- source of truth range
- current projection value
- expected value
- diff type
- severity
- related trace_id
- suggested action
- manual review required

方針:

- compare-only は projection / source of truth を変更しない
- unexpected diff を silent skip しない
- diff が大きい場合は対象範囲を縮小する
- compare-only 結果は recovery audit trail の候補にする
- 初期導入では compare-only を最優先する

---

## ■ scoped rebuild 方針

scoped rebuild は、rebuild 対象を warehouse_code、期間、業務キー、trace_id などで限定し、影響範囲を小さくする考え方である。

対象範囲候補:

- warehouse_code
- created_at range
- trace_id
- part_no
- location_code
- stock_type
- pallet_code
- project_no
- source table

方針:

- 全件 rebuild を初期導入しない
- warehouse_code を必ず明示する
- high risk domain は小さい範囲から確認する
- compare-only -> manual review -> scoped refresh / rebuild の順で進める
- rebuild failure 時は対象範囲を縮小する
- archive data や deprecated event が必要な場合は将来検討へ分離する

scoped rebuild の判断観点:

- source of truth をすべて読めるか
- 対象範囲の業務影響が説明できるか
- projection logic が現行 schema と一致しているか
- correction event が必要か
- rebuild 後に trace timeline / audit で説明できるか

---

## ■ rollback を避ける方針

業務履歴に対して、安易な rollback を recovery として扱わない。

整理:

- deploy / migration 失敗は技術的 rollback の対象になり得る
- commit 済み業務履歴の誤りは rollback ではなく correction / compensation で扱う
- projection drift は rollback ではなく refresh / rebuild / recovery で扱う
- replay は過去状態への巻き戻しではなく、新しい trace / event として再実行する

避けること:

- `inventory_transactions` を削除して在庫を戻す
- `pallet_transactions` を削除してパレット移動をなかったことにする
- `inventory_current` だけを直接修正して差分を隠す
- `pallet_units` だけを直接修正して履歴不整合を隠す
- replay 結果を元 trace に上書きする

方針:

- rollback より correction over overwrite を優先する
- 元 event / trace と補正 event / replay trace の関係を残す
- manual recovery でも source of truth の直接更新は避ける
- 例外が必要な場合は理由・範囲・承認・before/after diff を残すことを検討する

---

## ■ correction event 方針

correction event は、source of truth 上の業務事実に誤りがある場合、元履歴を消さずに補正を説明するための event / transaction である。

対象候補:

- 誤入庫
- 誤出庫
- 誤移動
- 誤パレット移動
- project_no correction
- OCR / EDI 誤読
- shipment / billing candidate 誤り

方針:

- correction は recovery と区別する
- correction は元 event / trace との関係を持つ
- correction reason、operator、approver を metadata として扱うことを検討する
- 実物流・請求・外部送信済みの correction は強い approval 候補にする
- correction 後は projection refresh / rebuild が必要か確認する

初期整理:

- inventory correction は adjustment / reverse transaction の方針を整理する
- pallet correction は reverse move / compensation event の方針を整理する
- trace timeline では元 event と correction event を両方表示する方針を検討する

---

## ■ manual review / approval 方針

manual review は、自動 recovery では業務判断ができない場合に、operator / approver が判断する正式な経路である。

manual review が必要なケース:

- source of truth 自体が誤っている
- correction event が必要
- rebuild diff が大きい
- warehouse_code boundary に疑義がある
- 実物流がすでに動いている
- 請求・外部送信・顧客出荷へ影響する
- replay 禁止ケースに該当する可能性がある

review に必要な情報:

- affected warehouse_code
- affected source of truth
- affected projection
- affected trace_id / parent_trace_id
- diff type / severity
- before / after value
- suggested action
- recovery reason
- operator / approver
- executed_at / reviewed_at

approval 方針:

- low / warning は通常確認候補
- high は admin / chief review 候補
- critical は承認付き manual recovery 候補
- worker に recovery / rebuild / correction の管理権限を与えるかは慎重に検討する

詳細な role matrix は今回決定しない。

---

## ■ warehouse boundary 方針

rebuild / refresh / recovery / correction / replay でも `warehouse_code` boundary を維持する。

方針:

- recovery 対象 warehouse_code を明示する
- source of truth 読み取りは許可された warehouse_code に限定する
- projection rebuild / refresh も同じ warehouse_code 境界内で行う
- trace timeline recovery でも guard.warehouseCode 絞り込みを維持する
- replay / correction でも client payload の warehouse_code を信頼しない
- warehouse boundary を越える recovery は原則禁止または強い管理判断の対象にする

注意:

- trace_id が一致しても warehouse boundary を越えてよいとは限らない
- recovery 操作は通常 query より強い権限を必要とする可能性がある
- warehouse boundary violation は projection drift ではなく security incident として扱う

---

## ■ observability / audit 方針

rebuild / recovery は observability / audit の対象である。

observability 候補:

- compare-only run count
- rebuild run count
- refresh count
- recovery count
- recovery by severity
- rebuild failure count
- replay failure count
- correction event count
- manual review count
- warehouse_code 別 recovery count
- projection name 別 drift count

audit 候補:

- recovery reason
- affected source of truth
- affected projection
- affected trace_id / parent_trace_id
- warehouse_code
- before / after diff
- selected action
- operator / approver
- requested_at / executed_at / completed_at
- result / failure reason

方針:

- recovery は実行結果だけでなく判断理由を残す
- rebuild の前後差分は audit / forensic の調査起点にする
- sensitive metadata は必要最小限にする
- alert は severity と対応手順に結びつける
- observability / audit の保存先やUIは今回決定しない

---

## ■ rollout / verification 方針

rollout は、検知・可視化・手動判断から始める。

推奨 rollout 順:

1. failure / drift pattern を棚卸しする
2. rebuild / refresh / replay / correction の判断表を整理する
3. `inventory_current` compare-only 方針を整理する
4. `pallet_units` compare-only 方針を整理する
5. trace timeline recovery 方針を整理する
6. severity / manual review 条件を整理する
7. scoped rebuild の対象範囲を整理する
8. observability / audit 項目を整理する
9. 自動 recovery 候補を将来検討する

verification 観点:

- source of truth を変更していない
- projection を source of truth として扱っていない
- compare-only が副作用を持たない
- rebuild は source of truth を根拠にしている
- recovery と correction / replay / rebuild を混同していない
- warehouse_code boundary を維持している
- manual review が必要なケースを自動実行していない
- rollback で業務履歴を消す方針になっていない

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の compare-only output review
- 将来の Admin Dashboard build
- 将来の role / warehouse_code 別 recovery 表示確認

---

## ■ lightweight recovery 方針

lightweight recovery は、大きな recovery engine を最初から作らず、重要 domain の調査・判断・手動回復を先に整える方針である。

初期方針:

- recovery engine を作らない
- replay engine を作らない
- queue / broker / workflow engine を急がない
- DB table / audit trail の新設を今回決めない
- `inventory_current` / `pallet_units` / trace timeline を優先する
- compare-only と manual review を優先する
- automatic recovery は後回しにする

lightweight start の対象:

- inventory projection drift
- pallet projection drift
- trace-search / timeline failure
- warehouse boundary mismatch
- replay / rebuild validation failure

方針:

- まず検知・可視化・手動判断を優先する
- 自動化は source of truth と業務影響が明確な範囲から検討する
- operational simplicity を優先する
- 現場運用を止めない

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回決定しない。

候補:

- recovery engine
- replay engine
- rebuild job
- refresh API
- compare-only API
- recovery audit trail table
- recovery_id
- rebuild_run_id
- replay_run_id
- dead-letter table / queue
- projection checkpoint
- projection freshness metadata
- correction event catalog
- approval workflow
- Admin Dashboard recovery UI
- observability dashboard
- alert notification
- event bus / consumer checkpoint
- snapshot
- archive-aware rebuild

導入判断の観点:

- source of truth を安全に読めるか
- warehouse boundary を維持できるか
- manual review なしで実行できる業務影響か
- replay / rebuild 不能な event を silent skip しないか
- audit / forensic に必要な情報が残るか
- impact analysis 上、downstream projection / workflow に影響しないか

---

## ■ 今後の検討事項

以下は今回決定しない。

- `inventory_current` rebuild の正式手順
- `pallet_units` rebuild の正式手順
- trace timeline recovery の実装方式
- compare-only output の形式
- compare-only 結果の保存先
- rebuild / refresh API を作るか
- recovery audit trail table を作るか
- recovery_id / rebuild_run_id / replay_run_id を導入するか
- correction event の正式 event name
- inventory correction transaction 種別
- pallet correction / compensation event 種別
- replay engine を作るか
- recovery / rebuild / replay の role matrix
- approval workflow の実装方式
- Admin Dashboard recovery UI
- observability / alert の保存先と通知先
- archive data を含めた rebuild
- snapshot の導入有無
- automatic recovery の対象範囲

---

## ■ 原則

rebuild は source of truth から projection / read model を再作成するための手段であり、source of truth を変更しない。

refresh は対象を限定した projection 回復として扱う。

replay は元履歴を上書きせず、新しい trace / event として再実行する。

correction は誤った業務事実を削除ではなく補正として説明する。

recovery は rollback ではない。

logistics-erp では、commit 済みの業務履歴を消すよりも、source of truth、trace chain、diff、operator / approver、reason を残して説明可能に回復することを優先する。
