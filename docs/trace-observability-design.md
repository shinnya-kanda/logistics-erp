# Trace Observability / Monitoring Design（Phase B7-79）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、trace / distributed trace / replay / integrity を前提として、運用時に業務イベント・異常・遅延・不整合をどう観測するかを整理する。

`trace_id`、`parent_trace_id`、event taxonomy、metadata、integrity check の考え方を整えても、運用時に異常を検知できなければ、replay / recovery / audit は後手に回る。

本ドキュメントでは以下を整理する。

- observability の目的
- monitoring の目的
- trace observability の考え方
- technical event / business event monitoring
- distributed trace monitoring
- replay monitoring
- integrity monitoring
- orphan / missing / duplicate detection
- latency / timeout / retry monitoring
- alerting の考え方
- audit / forensic との関係
- dashboard / timeline view の将来像
- OpenTelemetry 的概念との関係
- business KPI monitoring の考え方

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ observability の目的

observability は、システムや業務イベントの内部状態を、外部から観測できるようにする考え方である。

目的:

- どの業務操作が起きたかを追える
- どのAPI request がどの transaction / history を作ったかを追える
- エラーや遅延の原因を trace chain で調査できる
- replay / rebuild / recovery の対象を判断できる
- audit / forensic のための事実関係を確認できる

observability は単なるログ出力ではない。

trace / event / metadata / request / external input をつなげて「何が起きたか」を説明できる状態を指す。

---

## ■ monitoring の目的

monitoring は、運用上の異常・遅延・不整合・業務リスクを継続的に検知するための考え方である。

目的:

- APIエラーやタイムアウトを早期検知する
- partial write / missing event / duplicate trace を検知する
- replay や recovery の失敗を検知する
- 外部入力の停滞や処理遅延を検知する
- 業務KPIの急変を検知する
- 監査上問題になり得る操作を検知する

monitoring は、異常を見つけるだけでなく、誰がどう対応するかにつながる必要がある。

---

## ■ trace observability の考え方

trace observability では、1つの `trace_id` または `parent_trace_id` から関連する出来事を横断して確認できることを目指す。

観測対象:

- Edge Function request
- RPC 実行
- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- OCR / EDI / CSV / PDF 取込
- shipment / billing event
- replay / correction event

基本方針:

- `trace_id` は業務操作の観測軸
- `parent_trace_id` は業務フロー全体の観測軸
- `request_id` はAPI実行の観測軸
- event name は「何が起きたか」の観測軸
- metadata は「なぜ・どこで・誰が」を補足する観測情報

---

## ■ technical event monitoring

technical event monitoring は、API / job / webhook / external call など、システム処理の状態を監視する。

対象候補:

- `api.request.received`
- `api.request.failed`
- `edge_function.invoked`
- `rpc.failed`
- `job.started`
- `job.completed`
- `webhook.received`
- `external_api.failed`

観測項目:

- request count
- error count
- status code
- latency
- timeout
- retry count
- request_id
- trace_id
- Edge Function 名

目的:

- 技術障害の早期検知
- API / RPC の失敗原因調査
- retry / timeout の増加検知
- external system の障害切り分け

---

## ■ business event monitoring

business event monitoring は、物流ERP上の業務イベントの発生状況を監視する。

対象候補:

- `inventory.in.created`
- `inventory.out.distributed`
- `inventory.move.created`
- `pallet.move.completed`
- `pallet.out.completed`
- `shipment.pick.confirmed`
- `actual.mismatch_detected`
- `ocr.import.rejected`

観測項目:

- event count
- warehouse_code 別件数
- event_type / event_name 別件数
- quantity 合計
- mismatch 件数
- replay 件数
- correction event 件数

目的:

- 業務量の変化を把握する
- 異常に多い出庫・調整・replay を検知する
- OCR / EDI / Expected / Actual の異常を検知する
- 請求・在庫・出荷の根拠を追えるようにする

---

## ■ distributed trace monitoring

distributed trace monitoring は、複数 trace にまたがる業務フローを監視する。

例:

```text
ocr.import.received
  -> ocr.import.parsed
  -> expected.created
  -> actual.matched
  -> inventory.in.created
```

監視観点:

- parent trace に対して必要な child trace が揃っているか
- trace chain が途中で止まっていないか
- 同じ parent trace に過剰な child trace がないか
- child trace の順序が業務フローとして自然か
- archive / deletion により chain が切れていないか

目的:

- 業務フローの停滞検知
- partial write / missing event の検知
- replay 対象範囲の判断
- audit / forensic の起点整理

---

## ■ replay monitoring

replay monitoring は、replay / dry-run / correction の実行状況を監視する。

観測項目:

- replay request count
- dry-run count
- replay success / failed
- replay target trace
- replay_of_trace_id
- replay reason
- approved_by
- correction event count
- replay 後の差分

注意:

- replay は通常業務より強い監査性が必要である
- replay 失敗は不整合や二重実行につながる可能性がある
- replay と idempotency retry を混同しない

alert 候補:

- replay failed
- approval なし replay
- replay 後に duplicate が発生
- replay 対象が禁止ケースに該当

---

## ■ integrity monitoring

integrity monitoring は、trace consistency / integrity の異常を検知する。

対象:

- partial write
- orphan trace
- missing event
- duplicated trace
- replay inconsistency
- rebuild diff
- archive chain break

方針:

- integrity check は定期 job として将来検討する
- 検知結果は単なるシステムエラーではなく、業務調査・補正・承認へつなげる
- severity を分ける
- 自動補正より、まず検知・可視化・承認を優先する

---

## ■ orphan / missing / duplicate detection

### orphan detection

検知候補:

- `parent_trace_id` が参照する trace がない
- replay trace の元 trace がない
- metadata の external file id が参照できない

### missing detection

検知候補:

- event taxonomy 上、期待される後続 event がない
- warehouse location update に history がない
- actual matched 後の inventory event がない

### duplicate detection

検知候補:

- 同じ `idempotency_key` で複数 transaction がある
- 同じ external file hash で複数取込がある
- 同じ business identifier で重複 shipment がある

これらは自動削除せず、調査対象として扱う。

補正が必要な場合は correction event として説明可能にする。

---

## ■ latency / timeout / retry monitoring

latency / timeout / retry は、technical event と business event の両方に影響する。

観測項目:

- Edge Function latency
- RPC duration
- DB query duration
- external API latency
- OCR / EDI parse duration
- retry count
- timeout count
- idempotency replay count

業務影響:

- 入庫・出庫処理の遅延
- shipment 確定遅延
- OCR / EDI 取込遅延
- replay / recovery の処理遅延
- 現場作業の待ち時間増加

注意:

- retry が増えても成功していれば見落としやすい
- idempotency replay の増加は、通信不安定や二重クリックの兆候になり得る
- timeout 後に partial write がないか確認が必要である

---

## ■ alerting の考え方

alerting は、運用担当者が対応すべき異常を通知するための考え方である。

alert 候補:

- Edge Function 5xx 増加
- RPC失敗増加
- timeout 増加
- partial write 検出
- orphan trace 検出
- missing event 検出
- duplicate trace 検出
- replay failed
- correction event 急増
- actual mismatch 急増
- OCR / EDI 取込停止

severity 候補:

- `info`: 状況把握
- `warning`: 調査推奨
- `critical`: 業務影響あり、即時対応

方針:

- alert は多すぎると無視される
- 業務影響と復旧手順に結びつくものを優先する
- alert には trace_id / parent_trace_id / request_id を含めることを検討する

---

## ■ audit / forensic との関係

observability は、audit / forensic の前提である。

audit では、業務イベントの流れを説明する。

forensic では、異常の原因を追跡する。

必要な観測情報:

- trace_id
- parent_trace_id
- request_id
- event_name
- event_time
- operator metadata
- source_system
- external file hash
- error / retry / timeout
- correction event

運用時に観測していない情報は、後から調査できない可能性がある。

---

## ■ dashboard / timeline view の将来像

将来的には、admin-dashboard などで trace を timeline として表示することを検討する。

表示候補:

- trace_id 検索
- parent_trace_id 検索
- request_id 検索
- event timeline
- source 別表示
- technical / business event の切替
- latency 表示
- retry / timeout 表示
- integrity warning
- replay / correction 表示
- external input 参照

timeline の目的:

- 業務担当者が流れを理解できる
- 開発者が障害原因を追える
- 監査担当者が根拠を確認できる
- replay / recovery の対象を判断できる

今回 UI は実装しない。

---

## ■ OpenTelemetry 的概念との関係

OpenTelemetry では trace / span / event / attribute のような概念がある。

logistics-erp では、すぐに OpenTelemetry 完全準拠を目指さない。

ただし、概念上は以下の対応を検討できる。

| OpenTelemetry 的概念 | logistics-erp での対応候補 |
| --- | --- |
| trace | `parent_trace_id` を含む業務フロー |
| span | 1つの `trace_id` または API request |
| event | event taxonomy の event name |
| attribute | metadata |
| trace_id | `trace_id` / `parent_trace_id` との対応整理が必要 |

注意:

- logistics-erp の `trace_id` は業務操作IDであり、OpenTelemetry の trace_id と完全に同じ意味ではない
- 業務IDと技術観測IDを混同しない
- 将来の外部監視基盤連携時に対応関係を整理する

---

## ■ business KPI monitoring

business KPI monitoring は、trace / event を使って業務量や異常傾向を把握する考え方である。

候補:

- 入庫件数
- 出庫件数
- 移動件数
- パレット出庫件数
- 分散出庫件数
- OCR取込件数
- EDI取込件数
- Expected / Actual mismatch 件数
- replay 件数
- correction event 件数
- warehouse_code 別処理件数
- 平均処理時間

注意:

- KPI は監査ログの代替ではない
- KPI 集計のために真実ログを変更しない
- 業務モードごとに意味が異なる値を混ぜない
- `project_no` と `issue_no` を混同しない

---

## ■ 導入段階案

### Step 1: trace-search の運用利用

単一 `trace_id` で event を追える状態を運用確認する。

### Step 2: technical monitoring の整理

Edge Function / RPC / external API の error / latency / timeout を整理する。

### Step 3: business event monitoring の整理

event taxonomy に基づき、重要な business event の件数・異常値を整理する。

### Step 4: integrity monitoring の検討

partial write / orphan / missing / duplicate の検知ルールを整理する。

### Step 5: dashboard / alerting 検討

timeline view、integrity warning、alert の通知先・severity を検討する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- OpenTelemetry を導入するか
- request_id をログだけにするかDBにも保存するか
- technical event をどこに保存するか
- business event を `trace_events` に集約するか
- monitoring 用の集計テーブルを作るか
- alert の閾値
- alert の通知先
- alert severity の定義
- integrity check job の実装有無
- dashboard / timeline view のUI
- archive data を monitoring 対象に含めるか
- business KPI の正式指標
- warehouse_code をまたぐ監視権限
- 外部監視基盤との連携方式

---

## ■ 原則

observability は、業務の流れを後から説明できる状態を作るための基盤である。

monitoring は、異常・遅延・不整合を運用中に検知するための仕組みである。

technical event と business event を混同しない。

業務IDと技術観測IDを混同しない。

監視は、調査・補正・承認・recovery につながる形で設計する。
