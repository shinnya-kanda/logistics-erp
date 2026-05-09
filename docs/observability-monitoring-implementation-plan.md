# Observability / Monitoring Implementation Plan（Phase B8-05）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp における traceability / projection consistency / rebuild / validation / workflow failure を観測・監視する導入計画を整理する。

ERP設計憲法、開発ルール、trace observability / monitoring design、projection consistency implementation plan、rebuild / recovery implementation plan、traceability implementation plan、event validation、event impact analysis、event-driven ERP principles を前提にすると、observability / monitoring は単なるログ出力や dashboard 追加ではない。source of truth、trace chain、projection drift、validation failure、rebuild / recovery、workflow stuck を、業務影響と対応手順へ接続するための段階導入である。

今回は実装導入計画のみを整理し、migration・実装・Edge Function・RPC・README は変更しない。

本ドキュメントでは以下を整理する。

- observability implementation の目的
- technical monitoring と business monitoring の違い
- trace monitoring 方針
- projection drift monitoring 方針
- rebuild / replay / recovery monitoring 方針
- validation monitoring 方針
- warehouse boundary monitoring 方針
- workflow stuck monitoring 方針
- duplicate / orphan detection 方針
- severity / alerting 方針
- Admin Dashboard observability 方針
- audit / forensic との関係
- rollout / verification 方針
- lightweight monitoring 方針
- future optional architecture

---

## ■ observability implementation の目的

observability implementation は、logistics-erp の内部状態を外部から調査・判断できる形にし、monitoring により異常・遅延・不整合・業務リスクを検知するための導入計画である。

目的:

- `trace_id` / `parent_trace_id` / `request_id` から業務操作と API 実行を追える
- projection drift を source of truth との差分として検出できる
- rebuild / replay / recovery の成功・失敗・差分を観測できる
- validation failure を recovery / manual review へ接続できる
- workflow stuck / missing / duplicate を早期に検知できる
- warehouse_code boundary の逸脱を high / critical risk として扱える
- alert を業務影響と対応手順へ結びつける
- audit / forensic に必要な情報を後から辿れる

observability は、ログを増やすこと自体を目的にしない。

「何が起きたか」「どこで止まったか」「何を根拠に回復すべきか」を説明できる状態を作ることが目的である。

---

## ■ technical monitoring と business monitoring の違い整理

technical monitoring と business monitoring は観測対象と判断軸が異なる。

| 区分 | 主な対象 | 目的 | 例 |
| --- | --- | --- | --- |
| technical monitoring | API / RPC / job / external call | 技術的失敗・遅延・再試行を検知する | 5xx、timeout、RPC failure、latency |
| business monitoring | transaction / event / workflow / projection | 業務上の異常・不整合・停滞を検知する | 在庫差分、missing event、workflow stuck |
| integrity monitoring | source of truth / projection / trace chain | 履歴と派生状態の矛盾を検知する | projection drift、orphan trace、duplicate |
| security monitoring | warehouse boundary / access / sensitive metadata | 境界逸脱・情報漏えいリスクを検知する | warehouse mismatch、secret metadata |

方針:

- technical failure がなくても business failure は起こり得る
- business monitoring は source of truth と trace chain を根拠にする
- monitoring aggregate 自体も projection であり、source event との整合性を意識する
- alert は technical / business / security のどれかを明確にする

---

## ■ trace monitoring 方針

trace monitoring は、`trace_id` / `parent_trace_id` / `request_id` を観測軸にして、業務操作・API実行・source of truth・projection・recovery を追えるようにする方針である。

観測対象:

- Edge Function request
- RPC execution
- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- trace-search result
- replay / correction / recovery event
- 将来の OCR / EDI / shipment / billing event

観測項目候補:

- trace_id count
- trace_id missing count
- request_id error count
- parent_trace_id child count
- trace-search failure count
- trace timeline missing source count
- idempotency replay count
- trace_id / idempotency_key mismatch suspicion

方針:

- `trace_id` は業務操作の観測軸として扱う
- `request_id` は API 実行の観測軸として扱う
- `parent_trace_id` は workflow / distributed trace の観測軸として扱う
- `idempotency_key` を trace_id として扱わない
- trace_id が NULL の既存履歴を即異常扱いしない
- trace-search は read-only の調査入口として維持する

---

## ■ projection drift monitoring 方針

projection drift monitoring は、source of truth と projection / read model / cache の差分を検知する方針である。

初期対象:

- `inventory_transactions` vs `inventory_current`
- `pallet_transactions` vs `pallet_units`
- source rows vs trace timeline

観測項目候補:

- projection drift count
- projection name 別 diff count
- warehouse_code 別 diff count
- diff type
- severity
- compare-only run count
- stale projection count
- projection freshness / lag

diff type 候補:

- missing row
- extra row
- quantity mismatch
- status mismatch
- location mismatch
- timestamp mismatch
- duplicate projection
- stale projection
- warehouse boundary mismatch

方針:

- drift は source of truth との差分として検出する
- drift を見つけても source of truth を削除・更新しない
- projection drift は refresh / rebuild / recovery / correction の入口にする
- high risk projection から監視候補を整理する
- 初期は scheduled job より compare-only / manual review の観測項目整理を優先する

---

## ■ rebuild / replay / recovery monitoring 方針

rebuild / replay / recovery monitoring は、回復操作や再実行操作の状況・失敗・差分・承認要否を観測する方針である。

観測対象:

- compare-only
- scoped rebuild
- projection refresh
- replay dry-run
- replay execution
- correction event
- manual recovery
- recovery failure

観測項目候補:

- compare-only run count
- rebuild run count
- rebuild success / failure count
- rebuild duration
- rebuild diff count
- refresh count
- replay request count
- replay success / failure count
- correction event count
- manual review count
- recovery by severity
- recovery by warehouse_code

方針:

- rebuild は source of truth を変更しないものとして観測する
- replay は元 trace と replay trace を分離して観測する
- correction は元 event / trace との関係を観測する
- recovery は technical incident だけでなく業務リスクとして扱う
- replay / rebuild failure は validation / recovery の対象にする
- approval なし replay や replay 禁止候補は high / critical alert 候補にする

---

## ■ validation monitoring 方針

validation monitoring は、schema / metadata / identity / time / warehouse boundary / state transition / projection / security の検証結果を観測する方針である。

観測項目候補:

- validation error count
- validation warning count
- severity 別 count
- domain 別 validation failure
- warehouse_code 別 validation failure
- schema validation failure
- metadata validation failure
- identity validation failure
- time validation failure
- state transition validation failure
- projection validation failure
- security validation failure

方針:

- validation failure を silent skip しない
- warning も observability / audit の対象にできるようにする
- validation failure は recovery / manual review の入口にする
- high risk validation は warning 期間を検討する
- false positive / false negative の業務影響も impact analysis 対象にする

初期優先:

- warehouse boundary validation
- projection validation
- trace identity validation
- replay / rebuild validation
- workflow missing / stuck validation

---

## ■ warehouse boundary monitoring 方針

warehouse boundary monitoring は、event / trace / projection / replay / rebuild / recovery / audit view が `warehouse_code` 境界を守っているかを観測する方針である。

観測候補:

- cross-warehouse trace suspicion
- trace-search warehouse mismatch
- projection diff warehouse mismatch
- rebuild target warehouse mismatch
- replay / recovery warehouse mismatch
- client payload warehouse_code usage suspicion
- archive / cold storage warehouse mismatch

方針:

- `warehouse_code` は guard / server-side profile 由来を基本にする
- trace_id が一致しても warehouse boundary を越えてよいとは限らない
- warehouse boundary violation は high / critical severity 候補にする
- boundary violation は projection drift ではなく security / data isolation issue として扱う
- Admin Dashboard でも warehouse boundary を越えた observability 表示をしない

---

## ■ workflow stuck monitoring 方針

workflow stuck monitoring は、長い業務フローや distributed trace が途中で止まっていないかを検知する方針である。

対象候補:

- OCR / EDI import workflow
- Expected / Actual reconciliation workflow
- shipment workflow
- inventory outbound workflow
- billing candidate workflow
- replay / recovery workflow

検知候補:

- parent_trace_id に対して expected child trace がない
- required predecessor event の後に expected next event がない
- workflow status は completed だが必要 event が欠落している
- retry が一定回数を超えている
- compensation action が未完了
- recovery が unresolved のまま残っている

方針:

- stuck workflow を自動削除しない
- workflow stuck は retry / resume / compensation / manual recovery の対象にする
- 請求・実物流に関わる stuck は強い review 候補にする
- timeout は技術時間だけでなく業務停滞として扱う
- workflow monitoring の正式な timeout / expected next event は将来検討に分離する

---

## ■ duplicate / orphan detection 方針

duplicate / orphan detection は、重複・孤立・欠落を検知し、調査・補正・recovery へつなげる方針である。

### duplicate detection

検知候補:

- 同じ `idempotency_key` で複数 transaction がある
- 同じ external file hash で複数取込がある
- 同じ trace_id に不自然な重複 event がある
- replay 後に二重 projection が発生している
- consumer duplicate delivery により二重集計されている

### orphan detection

検知候補:

- `parent_trace_id` が参照する trace がない
- replay trace の元 trace がない
- projection row の根拠 source event がない
- external file id / source_system reference が解決できない

### missing detection

検知候補:

- source of truth はあるが trace timeline に出ない
- event taxonomy 上、期待される後続 event がない
- warehouse location update に history がない
- projection に反映されるべき transaction が反映されていない

方針:

- duplicate / orphan / missing は自動削除しない
- 検知結果は investigation / manual review / correction / recovery の対象にする
- duplicate detection は1つのIDだけに依存しない
- correction が必要な場合は元 event との関係を残す

---

## ■ severity / alerting 方針

severity / alerting は、検知結果の業務影響と対応優先度を表す。

severity 候補:

| severity | 意味 | 例 | 初期対応 |
| --- | --- | --- | --- |
| info | 状況把握 | trace_id nullable 既存行 | 記録・経過確認 |
| warning | 調査推奨 | minor projection lag / delayed upload | 手動確認 |
| high | 業務影響の可能性あり | inventory / pallet drift、workflow stuck | 早期調査・manual review |
| critical | 境界・請求・実物流影響 | warehouse boundary violation、source of truth tampering | 承認付き対応 |

alerting 方針:

- alert は多すぎると無視されるため、業務影響と対応手順があるものを優先する
- alert には可能な範囲で trace_id / parent_trace_id / request_id / warehouse_code を含めることを検討する
- warning から error / critical へ引き上げる場合は impact analysis 対象にする
- alert 閾値、通知先、保存先は今回決定しない
- 初期は dashboard / checklist / manual review から始める

---

## ■ Admin Dashboard observability 方針

Admin Dashboard は observability の read-only 入口として扱う。

表示候補:

- trace timeline
- trace-search failure / empty result
- projection drift summary
- compare-only result
- validation warning / error summary
- rebuild / replay / recovery status
- workflow stuck summary
- warehouse_code 別 warning
- severity 別 warning
- source of truth row への参照

方針:

- 初期は read-only 表示に限定する
- Admin Dashboard から source of truth を直接修正しない
- worker に横断 trace search / recovery management を開放しない
- sensitive metadata は通常表示しない
- forensic 用詳細表示と通常業務表示を分けることを検討する
- observability 表示のために write model を歪めない

今回、UI は実装しない。

---

## ■ audit / forensic との関係

observability は audit / forensic の前提である。

audit では、業務イベントの流れを説明する。

forensic では、障害・不正・不整合の原因を調査する。

必要な観測情報候補:

- trace_id
- parent_trace_id
- request_id
- warehouse_code
- source
- event_name / event_type
- created_at / event_time
- operator metadata
- source_system
- external file hash
- error / retry / timeout
- validation result
- projection diff
- rebuild / replay / recovery result
- correction event

方針:

- 運用時に観測していない情報は、後から調査できない可能性がある
- audit view の閲覧範囲は security / warehouse boundary に従う
- sensitive metadata は必要最小限にする
- recovery / correction / replay は元 event との関係を残すことを検討する

---

## ■ rollout / verification 方針

rollout は、最初から巨大な監視基盤を作らず、high risk domain の観測項目整理から始める。

推奨 rollout 順:

1. trace monitoring の観測項目を整理する
2. projection drift monitoring の観測項目を整理する
3. rebuild / replay / recovery monitoring の観測項目を整理する
4. validation monitoring の severity を整理する
5. warehouse boundary monitoring を high / critical 候補として整理する
6. workflow stuck / duplicate / orphan detection の代表パターンを整理する
7. Admin Dashboard の read-only 表示候補を整理する
8. alerting threshold / notification は将来検討へ分離する

verification 観点:

- source of truth を変更していない
- monitoring のために projection を source of truth として扱っていない
- technical monitoring と business monitoring を混同していない
- warehouse_code boundary を維持している
- alert が対応手順へつながる
- validation failure を silent skip していない
- duplicate / orphan / missing を自動削除していない
- Admin Dashboard は read-only の観測入口として整理されている

実行確認候補:

- `git diff --check`
- `git status --short`
- 将来の dashboard display review
- 将来の role / warehouse_code 別表示確認
- 将来の alert checklist review

---

## ■ lightweight monitoring 方針

lightweight monitoring は、監視基盤・集計テーブル・alert system を最初から作らず、運用で使える観測項目と確認手順から始める方針である。

初期方針:

- monitoring aggregate table を作らない
- alert notification system を急がない
- OpenTelemetry 導入を急がない
- trace-search / Admin Dashboard / manual checklist を調査入口にする
- high risk domain から観測項目を整理する
- alert は少なく、対応手順とセットで設計する
- 自動補正より検知・可視化・manual review を優先する

lightweight start の対象:

- trace-search failure / trace missing
- `inventory_current` drift
- `pallet_units` drift
- rebuild / replay / recovery failure
- validation error / warning
- warehouse boundary mismatch
- workflow stuck
- duplicate / orphan / missing

---

## ■ future optional architecture 整理

以下は将来 optional architecture として扱い、今回決定しない。

候補:

- monitoring aggregate table
- observability event table
- technical event log table
- validation result table
- recovery audit trail table
- alert notification system
- Admin Dashboard observability UI
- workflow status read model
- projection freshness metadata
- projection checkpoint
- dead-letter table / queue
- OpenTelemetry integration
- external monitoring service integration
- scheduled integrity check job
- scheduled projection drift check
- anomaly detection
- business KPI dashboard

導入判断の観点:

- source of truth を壊さないか
- warehouse boundary を維持できるか
- sensitive metadata を過剰表示しないか
- alert が業務対応へつながるか
- owner domain / reviewer が明確か
- projection / validation / recovery への影響を impact analysis できるか

---

## ■ 今後の検討事項

以下は今回決定しない。

- technical event をどこに保存するか
- business event を `trace_events` に集約するか
- request_id をDB保存するかログのみにするか
- monitoring aggregate table を作るか
- validation result の保存先
- projection drift check job を作るか
- workflow stuck check job を作るか
- duplicate / orphan detection job を作るか
- alert threshold
- alert notification destination
- severity の正式定義
- Admin Dashboard observability UI
- forensic 詳細表示権限
- OpenTelemetry を導入するか
- external monitoring service と連携するか
- warehouse_code をまたぐ監視権限
- business KPI の正式指標

---

## ■ 原則

observability は、業務の流れとシステム状態を後から説明できる状態にするための基盤である。

monitoring は、異常・遅延・不整合・境界逸脱を運用中に検知するための仕組みである。

technical monitoring と business monitoring を混同しない。

alert は多ければよいわけではなく、severity と対応手順に結びつける。

source of truth、warehouse_code boundary、trace chain、projection consistency、validation result、recovery result をつなげて観測する。

最初から巨大な監視基盤を作らず、trace-search、compare-only、manual review、Admin Dashboard read-only 表示から軽量に始める。
