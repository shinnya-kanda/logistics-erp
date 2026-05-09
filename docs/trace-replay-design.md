# Trace Replay / Rebuild Design（Phase B7-74）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、`trace_id` / `parent_trace_id` を利用して、業務イベント単位で replay / rebuild / audit を可能にするための設計方針を整理する。

Phase B7-67 から B7-73 では、`trace_id`、`request_id`、`parent_trace_id`、trace chain の役割を整理した。本ドキュメントでは、その trace 情報を使って将来的に以下を行うための考え方を定義する。

- 過去イベントの replay
- 履歴からの rebuild
- audit / forensic / recovery
- replay 禁止ケースの整理
- replay engine の将来像

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ replay の目的

replay は、過去の入力・業務操作・外部イベントを、説明可能な形で再実行するための考え方である。

目的:

- タイムアウトや一時障害で完了状態が不明な操作を再確認する
- OCR / EDI / CSV などの入力データを再処理する
- ロジック修正後に、同じ入力を使って再計算結果を検証する
- audit 上、どの入力からどの履歴が作られるかを再現する
- recovery 時に、失われた派生データを再作成する

replay は「過去のDBを巻き戻す」操作ではない。

replay は、過去の入力やtraceを参照し、新しい操作として再実行することを基本に考える。

---

## ■ rebuild の目的

rebuild は、真実ログから現在状態や派生データを再構築するための考え方である。

logistics-erp では、以下を真実ログとして扱う。

- `inventory_transactions`
- `pallet_transactions`
- `warehouse_location_history`
- 将来の shipment / OCR / EDI / billing event

rebuild の目的:

- `inventory_current` のような派生状態を再計算する
- `pallet_units.current_location_code` などの派生キャッシュを検証する
- shipment / billing の集計結果を再作成する
- 監査時に「現在状態がどの履歴から作られたか」を説明する

rebuild は、過去イベントを直接更新するのではなく、履歴から派生状態を再構築する処理である。

---

## ■ trace replay の考え方

trace replay は、`trace_id` を単位に過去の業務操作を特定し、その入力・関連履歴・結果をもとに再処理を検討する考え方である。

基本方針:

- 元の `trace_id` は「参照元」として残す
- 再実行する場合は、新しい `trace_id` を発行することを基本にする
- 元 trace と replay trace の関係は `parent_trace_id` または専用関係で表す
- replay 結果を元履歴へ上書きしない
- replay の実行者・理由・時刻を監査可能にする

例:

```text
original trace_id: trace-inventory-in-001
replay trace_id:   trace-inventory-in-001-replay-001
parent_trace_id:   trace-inventory-in-001
reason:            OCR補正後の再処理
```

このように、元操作と再実行操作を混同しないことが重要である。

---

## ■ inventory_transactions replay 方針

`inventory_transactions` は数量変動の真実ログである。

そのため、原則として既存行を更新・削除して replay しない。

方針:

- 過去の `inventory_transactions` は監査ログとして保持する
- replay で数量を補正する場合は、新しい補正transactionを作る
- 元transactionとの関係を `trace_id` / `parent_trace_id` で説明する
- `inventory_current` は transaction 履歴から再構築できる状態を目指す
- `idempotency_key` は二重実行防止であり、replay の識別子として流用しない

例:

- 誤った入庫を打ち消す場合: 元INを更新せず、補正OUTまたはADJUSTを追加
- OCR補正後に再入庫する場合: 新しい trace で正しいINを追加
- 棚卸差異を反映する場合: ADJUSTとして別イベントを作る

---

## ■ pallet_transactions replay 方針

`pallet_transactions` はパレット位置・状態変更の真実ログである。

方針:

- 過去の `pallet_transactions` を更新・削除しない
- 誤った移動は、逆方向の移動や補正イベントで表現する
- replay で再作成したパレット操作は、新しい trace として記録する
- `pallet_units` の現在状態は履歴から検証・再構築できる状態を目指す
- パレット出庫済みなど、業務上取り消しに制約がある状態は replay 禁止ケースとして扱う

例:

- 誤移動: A→B を消さず、B→A の補正MOVEを追加
- 出庫取消: OUTを削除せず、取消イベントまたは再入庫イベントを検討
- パレット作成の重複: 既存 `pallet_code` と業務実態を確認し、自動replayしない

---

## ■ distributed trace replay の考え方

distributed trace replay は、単一 `trace_id` ではなく、`parent_trace_id` に連なる trace chain を単位に再処理範囲を考える。

例:

```text
OCR取込 parent_trace
  -> Expected作成 trace
  -> Actual照合 trace
  -> inventory IN trace
  -> billing候補 trace
```

この場合、replay 対象は以下のように分ける。

- OCR取込だけを再処理する
- Expected作成以降を再処理する
- Actual照合以降を再処理する
- 在庫更新は再処理せず、照合結果だけを再計算する

trace chain は、replay 対象範囲を誤らないための判断材料になる。

---

## ■ rollback との違い

rollback と replay は目的が異なる。

| 項目 | rollback | replay |
| --- | --- | --- |
| 主目的 | 変更を戻す | 過去入力・操作を再実行する |
| 対象 | migration / deploy /処理結果 | 業務イベント / trace |
| データ扱い | 変更前状態への復帰を検討 | 元履歴を残して新しい履歴を作る |
| 監査性 | 戻し方によって失われる可能性 | 元操作と再実行操作を両方残す |
| 使用例 | deploy失敗、migration失敗 | OCR再処理、EDI再取込、補正検証 |

ERPの履歴系データでは、安易な rollback よりも、補正イベントや replay trace によって説明可能性を残すことを優先する。

---

## ■ audit / forensic / recovery との関係

### audit

audit は、誰が・いつ・何を・なぜ行ったかを説明するための確認である。

replay した場合も、元操作と replay 操作を両方追跡できる必要がある。

### forensic

forensic は、障害・不正・データ不整合の原因を後から調査するための考え方である。

trace chain があると、以下を確認しやすい。

- どの request が起点だったか
- どの外部入力から派生したか
- どの transaction が作られたか
- どの段階で失敗または欠落したか

### recovery

recovery は、障害後に正しい業務状態へ戻すための考え方である。

recovery では、rebuild と replay を組み合わせる可能性がある。

例:

- 真実ログから現在在庫を rebuild
- 欠落した派生データのみ replay
- 二重登録されたイベントは補正transactionで調整

---

## ■ replay 禁止ケース

以下は原則として自動 replay しない。

- 既に請求確定済みの transaction
- 外部送信済みの EDI / CSV / API 通知
- 出庫確定後に客先へ渡った実物流
- `idempotency_key` の状態が不完全な操作
- 元入力の正当性が確認できない OCR / PDF / CSV
- replay により負在庫や二重在庫が発生する可能性がある操作
- operator や承認者の責任範囲が変わる操作
- 法務・監査上、元履歴を変更したように見える操作

禁止ケースでは、自動再実行ではなく、手動確認・承認・補正イベントで扱う。

---

## ■ replay 安全性

replay を安全に行うには、以下を満たす必要がある。

- 元 trace と replay trace を分離する
- replay 理由を記録する
- replay 実行者を記録する
- replay 対象範囲を trace chain で明示する
- dry-run と本実行を分ける
- 既存履歴を更新・削除しない
- idempotency と replay を混同しない
- warehouse_code は必ずサーバー側で確定する
- replay 前後の差分を確認できる
- 失敗時に部分適用が残らない単位で実行する

特に在庫・パレットは実物流に影響するため、replay は「便利な再実行」ではなく「監査可能な補正操作」として扱う。

---

## ■ 将来的な replay engine 構想

将来的には、以下のような replay engine を検討する。

### 1. trace resolver

`trace_id` / `parent_trace_id` から、関連する transaction / history / external input を取得する。

### 2. replay planner

replay 可能な範囲、禁止対象、必要な承認、影響テーブルを判定する。

### 3. dry-run executor

実際にDBへ書き込まず、replay 結果の差分を算出する。

### 4. approval gate

admin / chief などの承認を受けて、本実行へ進める。

### 5. replay executor

新しい `trace_id` を発行し、元 trace との関係を残した上で補正イベントまたは再実行イベントを作る。

### 6. audit reporter

元操作・replay操作・差分・実行者・理由を一覧化する。

この構想は将来案であり、今回実装しない。

---

## ■ event sourcing との関係

event sourcing は、状態を直接保存するのではなく、イベント列から状態を再構築する設計である。

logistics-erp は完全な event sourcing を今すぐ採用するわけではない。

ただし、以下の考え方は取り入れる。

- transaction / history を真実ログとして扱う
- 現在状態は派生キャッシュとして扱う
- 過去履歴を更新・削除せず、補正イベントで表現する
- rebuild によって現在状態を検証できるようにする
- trace_id によりイベントの業務単位を説明できるようにする

完全な event sourcing へ移行するかどうかは、将来の業務規模・監査要件・性能要件を見て判断する。

---

## ■ 導入段階案

### Step 1: trace検索の安定化

単一 `trace_id` で関連イベントを横断検索できる状態を安定化する。

### Step 2: replay対象の分類

inventory / pallet / shipment / OCR / EDI ごとに、replay可能・禁止・要承認の分類を整理する。

### Step 3: dry-run 方針の設計

実行前に差分を確認するための dry-run 結果形式を検討する。

### Step 4: parent_trace_id 連携

trace chain を使って replay 対象範囲を指定できるようにする設計を検討する。

### Step 5: replay engine 検討

resolver / planner / executor / reporter の責務を分けて設計する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- replay engine を作るかどうか
- replay engine の実行権限
- replay の承認フロー
- dry-run 結果の形式
- replay trace と元 trace の関連保存方法
- `parent_trace_id` を使うか、専用 relation table を使うか
- replay 禁止ケースをDB制約で持つか、アプリケーションで判定するか
- inventory / pallet の補正イベント種別
- shipment / billing 確定後の replay ルール
- OCR / EDI 入力データの保存形式
- rebuild 対象テーブルと順序
- replay / rebuild の監査ログ保存先
- admin-dashboard での replay UI 表示有無
- event sourcing へ寄せる範囲

---

## ■ 原則

replay は元履歴を消すための仕組みではない。

rebuild は真実ログから派生状態を再構築する仕組みである。

rollback は実装・migration・deploy を戻す考え方であり、業務履歴の補正とは分けて扱う。

`trace_id`、`parent_trace_id`、`request_id`、`idempotency_key` の意味を混同しない。

在庫・パレット・請求に関わる replay は、必ず監査可能な新しい業務イベントとして扱う。
