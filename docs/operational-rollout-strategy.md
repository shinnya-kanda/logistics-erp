# Operational Rollout Strategy（Phase B8-10）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp を現場運用へ段階導入する戦略を整理する。

ERP設計憲法、開発ルール、event-driven implementation roadmap、traceability implementation plan、projection consistency implementation plan、rebuild / recovery implementation plan、observability / monitoring implementation plan、workflow / saga implementation plan、external integration implementation plan、validation / impact implementation plan、event catalog / governance implementation plan、event-driven ERP principles を前提にすると、operational rollout は単に機能を deploy することではない。現場・事務・管理者が使い続けられる形で、既存の Excel / NAS / 手作業 / Node API 残存部分と共存しながら、source of truth、warehouse boundary、traceability、observability、manual recovery を段階的に育てる運用戦略である。

今回は運用導入戦略のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- operational rollout の目的
- anti big-bang migration 方針
- lightweight rollout 方針
- current operation coexistence 方針
- Excel / NAS coexistence 方針
- manual operation coexistence 方針
- high risk domain 優先導入方針
- observability first 方針
- compare-only / dry-run rollout 方針
- rollback ではなく correction / recovery 方針
- warehouse boundary rollout 方針
- operator education / onboarding 方針
- incident / recovery 対応方針
- rollout verification checklist
- future operational architecture

---

## ■ operational rollout の目的

operational rollout は、logistics-erp を物流現場へ安全に浸透させるための段階導入方針である。

目的:

- 現場運用を止めない
- 既存 Excel / NAS / 手入力運用を急に廃止しない
- source of truth を壊さずに新しい traceability / validation / observability を追加する
- high risk domain から小さく導入する
- 新機能の本適用前に read-only / compare-only / dry-run で確認する
- rollback ではなく correction / recovery で業務履歴を説明する
- warehouse_code boundary を rollout 全体で維持する
- operator / office / chief / admin が何を見て判断するかを整理する
- incident 時に原因・影響・回復方針を説明できるようにする

operational rollout は「一度に切り替えて完了」ではない。

現場で使える範囲を少しずつ広げ、調査できる状態を先に作り、自動化は業務影響が説明できる範囲から検討する。

---

## ■ anti big-bang migration 方針

logistics-erp の段階導入では、big-bang migration を避ける。

避ける進め方:

- 全 API / UI / workflow を一度に切り替える
- Excel / NAS / 手作業を一度に廃止する
- 汎用 event store / workflow engine / queue を先に導入する
- 全 read model を一度に非同期 projection 化する
- source of truth を置き換える
- 現場画面を設計都合で全面刷新する
- validation / alert / recovery を一度に自動化する

方針:

- 既存 source of truth を尊重する
- 既存 UI / 既存業務を壊さない
- nullable / optional / read-only / compare-only から始める
- high risk domain ごとに小さく進める
- 現場運用と事務確認の逃げ道を残す
- 新旧運用が並ぶ期間を正式に扱う
- 全面切替より、観測・検証・手動判断を先に整える

big-bang を避けることは、進捗を遅くするためではない。

物流現場で起きる例外・遅延・差異・手戻りを吸収しながら、安全に DB 中心の運用へ寄せるためである。

---

## ■ lightweight rollout 方針

lightweight rollout は、最初から大規模な運用基盤や自動化を作らず、現場が理解できる最小単位で導入する方針である。

初期方針:

- 新しい業務フローはまず Markdown / checklist で説明する
- Admin Dashboard は read-only の観測入口を優先する
- trace-search / projection diff / validation warning など、調査機能から広げる
- alert は対応手順があるものに限定する
- automation は manual review の実績ができてから検討する
- queue / workflow engine / registry / recovery engine は今回導入判断しない

lightweight rollout の単位:

- warehouse_code 単位
- domain 単位
- role 単位
- read-only 機能単位
- compare-only / dry-run 単位
- operator training 単位
- incident playbook 単位

方針:

- 運用で説明できない自動化を急がない
- 小さく導入し、観測してから広げる
- 現場入力負荷を急に増やさない
- 事務・所長が判断できる情報を優先する

---

## ■ current operation coexistence 方針

current operation coexistence は、既存の現場運用・事務運用・管理運用と新しい ERP 機能を一定期間共存させる方針である。

共存対象:

- 既存 Driver App / Admin Dashboard 操作
- Node API 残存箇所
- Supabase Edge Functions へ移行済み API
- Excel / CSV 入出力
- NAS / local file
- 紙 / PDF / OCR
- 手入力 / 電話 / 口頭確認
- 現場メモ / 事務確認表

方針:

- 既存運用を廃止する前に、代替運用で同じ業務判断ができるか確認する
- 新旧入力が混在する期間を異常扱いしない
- 新旧運用のどちらが source of truth かを業務単位で明確にする
- read model / dashboard 表示だけで業務確定を判断しない
- operator が迷う場面は manual review / office confirmation の対象にする
- 移行中の例外はコードだけで吸収せず、運用ルールとして明文化する

確認観点:

- 同じ業務が二重登録されないか
- Excel と DB の差異をどう確認するか
- NAS ファイルと DB 取込結果の同一性をどう確認するか
- 現場作業後に事務がどの画面で確認するか
- 旧運用から新運用へ切り替える条件は何か

---

## ■ Excel / NAS coexistence 方針

Excel / NAS coexistence は、現場導入期に Excel / CSV / NAS / local file を否定せず、DB 中心運用への中間手段として扱う方針である。

Excel / CSV 方針:

- Excel / CSV 運用を急に廃止しない
- upload / import は preview / validation / manual review を優先する
- CSV / Excel export は evidence にはなり得るが source of truth ではない
- column change / format change は external schema change として扱う
- duplicate row / duplicate file を自動削除しない

NAS / local file 方針:

- NAS / local file は信頼境界の外として扱う
- file path / file name だけで同一性を判断しない
- file hash / file size / received_at / source_system を同一性候補にする
- partial copy / locked file / overwritten file / moved file を考慮する
- NAS watcher や完全自動 import は今回導入判断しない

共存時の確認:

- file hash duplicate がないか
- external ID と internal ID を混同していないか
- warehouse_code mapping が妥当か
- manual review が必要な file を自動処理していないか
- Excel / NAS と DB の差異を誰が確認するか

Excel / NAS は将来廃止する前提の負債ではなく、現場移行のための重要な中間手段として扱う。

---

## ■ manual operation coexistence 方針

manual operation coexistence は、手作業・確認・補正・承認を正式な運用 step として扱う方針である。

manual operation 候補:

- OCR 読取結果の確認
- EDI / CSV / Excel import の preview 確認
- Expected / Actual mismatch の確認
- 在庫差異の調査
- パレット移動差異の調査
- shipment / billing candidate の確認
- correction / recovery の承認
- warehouse_code mapping の確認

方針:

- manual review は例外ではなく正式な workflow step として扱う
- 手作業の結果も trace / audit / operator metadata と接続することを検討する
- worker に任意 recovery / correction / replay 権限を与えるかは慎重に検討する
- office / chief / admin の確認責務を分ける
- 手戻り可能な状態を残す

manual operation で避けること:

- source of truth を直接更新して辻褄を合わせる
- projection だけを直して履歴不整合を隠す
- 口頭判断だけで recovery / correction を実行する
- 例外ルールをコードだけに埋め込む

---

## ■ high risk domain 優先導入方針

rollout は high risk domain から優先する。

優先度:

| 優先 | domain | 理由 |
| --- | --- | --- |
| 1 | inventory | 数量・棚卸・請求根拠に直結する |
| 2 | pallet | 実物流の位置・状態に直結する |
| 3 | warehouse location | 現場作業と棚番精度に影響する |
| 4 | trace / audit | recovery / forensic の入口になる |
| 5 | OCR / EDI / external input | 誤読・重複・遅延が起きやすい |
| 6 | shipment | 出荷・実物流・後続請求に影響する |
| 7 | billing | 確定後の補正・監査リスクが高い |

方針:

- inventory / pallet では source of truth と projection の関係を最優先で守る
- warehouse location では history / traceability を重視する
- OCR / EDI は source of truth に直結させず validation / review を挟む
- shipment / billing は workflow / approval / audit を整えてから進める
- billing logic は最後に実装する方針を維持する

導入判断:

- 現場作業に直結するか
- 実物流がすでに動くか
- 請求・監査に影響するか
- warehouse boundary を越える可能性があるか
- recovery / correction に承認が必要か

---

## ■ observability first 方針

observability first は、自動化や本適用の前に、何が起きたかを調査・説明できる状態を作る方針である。

初期観測対象:

- trace_id / parent_trace_id / request_id
- source of truth row
- projection drift
- validation warning / error
- workflow stuck / missing / duplicate
- external input received / parsed / accepted / rejected
- rebuild / replay / recovery result
- warehouse_code boundary warning

方針:

- まず read-only の調査入口を整える
- Admin Dashboard は初期段階では観測入口として扱う
- alert は対応手順とセットで導入する
- technical monitoring と business monitoring を分ける
- warning を無視せず、manual review / recovery の入口にする
- sensitive metadata は通常表示しない

observability first は、監視基盤を先に作ることではない。

現場・事務・管理者・開発者が、同じ source of truth と trace を見て判断できる状態を作ることである。

---

## ■ compare-only / dry-run rollout 方針

compare-only / dry-run rollout は、本適用前に source of truth と期待結果を比較し、業務影響を出さずに差分を確認する方針である。

対象候補:

- `inventory_transactions` vs `inventory_current`
- `pallet_transactions` vs `pallet_units`
- trace timeline source count
- CSV / Excel import preview
- OCR / EDI parse result
- validation rule warning period
- replay dry-run
- rebuild dry-run

方針:

- compare-only / dry-run では source of truth を変更しない
- projection も初期段階では変更しない
- diff / warning / error / severity を確認する
- diff が大きい場合は対象範囲を縮小する
- manual review の判断材料として扱う
- dry-run 結果をもとに自動 apply へ急がない

出力候補:

- affected warehouse_code
- affected source of truth
- affected projection / workflow
- diff type
- severity
- related trace_id / parent_trace_id
- suggested action
- manual review required

---

## ■ rollback ではなく correction / recovery 方針

業務履歴に対して、安易な rollback を rollout の前提にしない。

整理:

- deploy / migration 失敗は技術的 rollback の対象になり得る
- commit 済み業務履歴の誤りは rollback ではなく correction / compensation で扱う
- projection drift は rollback ではなく refresh / rebuild / recovery で扱う
- external input の再処理は retry / replay / duplicate handling を分ける

方針:

- `inventory_transactions` / `pallet_transactions` を削除して戻さない
- `inventory_current` / `pallet_units` だけを直接修正して差分を隠さない
- correction は元 event / trace との関係を持つ
- recovery は source of truth と trace chain を根拠にする
- replay は元 event を上書きせず、新しい trace / event として扱う
- 実物流・請求・外部送信に関わる correction / replay は承認候補にする

rollout で重要なのは「戻せる」ことだけではない。

何が起き、なぜ補正し、どの履歴を根拠に回復したかを説明できることである。

---

## ■ warehouse boundary rollout 方針

warehouse boundary rollout は、`warehouse_code` 境界を段階導入中も維持する方針である。

方針:

- command の `warehouse_code` は guard / server-side profile 由来を基本にする
- client payload / external file 内の warehouse_code を無条件に信頼しない
- read model / trace-search / Admin Dashboard でも warehouse_code で絞る
- compare-only / dry-run / recovery でも対象 warehouse_code を明示する
- cross-warehouse rollout は原則避けるか、強い管理判断の対象にする
- trace_id が一致しても warehouse boundary を越えてよいとは限らない

rollout 確認:

- operator の warehouse_code と対象データが一致するか
- Admin Dashboard の表示が warehouse boundary を越えていないか
- external input の warehouse mapping が妥当か
- recovery / rebuild 対象 warehouse_code が明示されているか
- warehouse mismatch が warning / critical として扱われるか

warehouse boundary violation は単なる projection drift ではなく、security / data isolation issue として扱う。

---

## ■ operator education / onboarding 方針

operator education / onboarding は、現場・事務・管理者が新しい運用の意味を理解し、迷ったときに正しい確認先へ進めるようにする方針である。

対象 role:

- worker
- office
- chief
- admin
- developer / operator support

教育内容候補:

- source of truth と read model の違い
- `inventory_current` は表示用であり、真実は `inventory_transactions` にあること
- trace_id は調査用のIDであり、業務IDや idempotency_key とは違うこと
- Excel / CSV / NAS は移行期の中間手段であること
- OCR / EDI 結果は確認前に正解扱いしないこと
- warning / error / manual review の意味
- correction / recovery と rollback の違い
- warehouse_code boundary を越えて閲覧・操作しないこと

onboarding 方針:

- 画面操作だけでなく、例外時の判断を説明する
- 初期は checklist / FAQ / short training を想定する
- operator が迷うケースを manual review へ上げられるようにする
- role ごとにできること・できないことを分ける
- incident 時の連絡先・確認手順を整理する

今回、教育資料や UI は作成しない。

---

## ■ incident / recovery 対応方針

incident / recovery 対応は、異常や差分が発生したときに、source of truth と trace chain を根拠に説明可能に回復するための方針である。

incident 候補:

- inventory quantity mismatch
- pallet location / status mismatch
- trace-search failure
- warehouse boundary violation
- OCR / EDI duplicate
- CSV / Excel import mismatch
- workflow stuck
- validation critical
- external API timeout / duplicate send
- replay / rebuild failure

初期対応方針:

1. 影響 warehouse_code を確認する
2. source of truth を確認する
3. trace_id / parent_trace_id / request_id を確認する
4. projection / read model の差分を compare-only で確認する
5. severity を分類する
6. manual review / approval が必要か判断する
7. recovery / correction / replay / rebuild のどれを使うか選ぶ
8. 結果と理由を audit 可能に残すことを検討する

方針:

- incident を projection 直接修正で隠さない
- duplicate / orphan / missing を自動削除しない
- recovery は technical incident だけでなく業務リスクとして扱う
- critical incident は承認付き対応候補にする
- recovery 後に trace / projection / validation の再確認を行う

正式な incident management tool / notification / escalation は今回決定しない。

---

## ■ rollout verification checklist

rollout 前後で確認する checklist を以下に整理する。

### source of truth

- `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` を直接削除・上書きしていない
- `inventory_current` / `pallet_units` を source of truth として扱っていない
- correction / compensation が必要なケースを rollback で隠していない

### coexistence

- 既存 Excel / CSV / NAS / manual operation と新運用の共存範囲が説明できる
- 旧運用から新運用へ切り替える条件が説明できる
- duplicate input / duplicate file / duplicate operation の確認方法がある

### observability

- trace_id / request_id / warehouse_code で調査できる
- Admin Dashboard は read-only の観測入口として整理されている
- alert / warning は対応手順と結びついている

### dry-run / validation

- compare-only / dry-run で source of truth を変更していない
- validation failure を silent skip していない
- warning / error / manual review を混同していない

### warehouse boundary

- warehouse_code boundary を越えて表示・操作していない
- external input の warehouse mapping を確認している
- recovery / rebuild / replay 対象 warehouse_code が明示されている

### operator readiness

- role ごとの操作範囲が説明できる
- operator が迷ったときの manual review 経路がある
- incident 時の確認手順が説明できる

### recovery

- recovery は source of truth と trace chain を根拠にしている
- projection 直接修正だけで不整合を隠していない
- correction / replay / rebuild の使い分けが説明できる

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の rollout checklist review
- 将来の role / warehouse_code 別 operation review
- 将来の dry-run / compare-only review
- 将来の incident drill / recovery review

---

## ■ future operational architecture 整理

以下は将来 operational architecture として扱い、今回決定しない。

候補:

- rollout feature flag
- warehouse_code 別 rollout configuration
- operator onboarding checklist UI
- Admin Dashboard operations view
- incident management dashboard
- recovery queue
- manual review queue
- approval workflow
- compare-only job framework
- dry-run import UI
- projection drift dashboard
- validation warning dashboard
- alert notification system
- operational runbook repository
- role based operation matrix
- audit report generator
- training material / help center

導入判断の観点:

- 現場運用を止めずに導入できるか
- source of truth を壊さないか
- warehouse boundary を維持できるか
- operator が説明できるか
- manual review / approval が必要な業務か
- incident 時に原因・影響・回復を追えるか
- 自動化によるリスクより運用負荷削減が大きいか

---

## ■ 今後の検討事項

以下は今回決定しない。

- 正式な rollout スケジュール
- warehouse_code 別 rollout 順序
- feature flag を導入するか
- rollout owner / operation owner
- role matrix の正式定義
- operator onboarding 資料
- incident response の正式 escalation
- alert threshold / notification channel
- recovery queue / manual review queue の実装方式
- Admin Dashboard operations UI
- compare-only / dry-run job の実装方式
- Excel / NAS からの正式移行期限
- external integration の自動化時期
- training / help center の形式
- rollout success metrics

---

## ■ 原則

operational rollout は、現場運用を止めずに logistics-erp を育てるための段階導入である。

Excel / NAS / 手作業を急に否定しない。

source of truth、warehouse_code boundary、traceability、observability を守る。

本適用の前に read-only / compare-only / dry-run で確認する。

commit 済み業務履歴は rollback ではなく correction / recovery で説明する。

自動化は、現場・事務・管理者が説明でき、incident 時に回復できる範囲から導入する。
