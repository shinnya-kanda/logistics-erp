# Workflow / Saga Architecture（Phase B7-81）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、複数 domain / distributed trace / integration event を前提として、長い業務フローをどう整合性付きで実行・補正・監視するかを整理する。

logistics-erp では、在庫入庫やパレット移動のように1回のRPCで完結しやすい処理だけでなく、OCR / EDI 取込、Expected / Actual 照合、shipment、billing のように複数 domain にまたがる長い業務フローが発生する。

本ドキュメントでは以下を整理する。

- workflow の目的
- saga の目的
- local transaction と distributed workflow の違い
- shipment workflow
- OCR / EDI workflow
- expected / actual reconciliation workflow
- compensation action
- rollback と compensation の違い
- orchestration saga / choreography saga の違い
- workflow trace
- retry / timeout / stuck workflow
- replay / recovery との関係
- workflow observability

今回は設計整理のみを行い、migration・実装・Edge Function・RPC・UI・README は変更しない。

---

## ■ workflow の目的

workflow は、複数の業務ステップを順序・状態・責務を持って進めるための考え方である。

目的:

- 長い業務フローの現在位置を説明できる
- domain をまたぐ処理順序を整理できる
- 途中失敗・保留・取消・補正を扱える
- trace chain と event chain を対応づけられる
- audit / replay / recovery の起点を明確にできる

workflow は単なる関数呼び出しの連続ではない。

業務上の状態遷移、承認、外部入力、再試行、補正、監視まで含めて扱う。

---

## ■ saga の目的

saga は、複数の local transaction をまたぐ業務フローで、全体の整合性を compensation action によって維持する考え方である。

目的:

- 複数 domain にまたがる処理を1つの巨大transactionにしない
- 各 domain は自分の local transaction を完了させる
- 後続処理が失敗した場合、削除・巻き戻しではなく補正で整合させる
- distributed trace 上で「どこまで成功し、どこで失敗し、どう補正したか」を説明する

saga は、すべてを自動で成功させる仕組みではない。

失敗を前提に、補正・再試行・手動確認へつなげる設計である。

---

## ■ local transaction と distributed workflow の違い

local transaction は、1つのDB transaction 内で完結する処理である。

distributed workflow は、複数 domain / 複数API / 複数 transaction にまたがる処理である。

| 項目 | local transaction | distributed workflow |
| --- | --- | --- |
| 範囲 | 1 RPC / 1 DB transaction | 複数 domain / 複数 request |
| 整合性 | commit / rollback | event chain / compensation |
| 失敗時 | transaction rollback | retry / compensation / manual recovery |
| 観測軸 | request_id / trace_id | parent_trace_id / workflow trace |
| 例 | 在庫入庫 transaction 作成 | EDI取込から shipment / 出庫 / 請求候補まで |

方針:

- 在庫数量など即時整合が必要な範囲は local transaction を優先する
- 複数 domain をまたぐ長い処理は distributed workflow として扱う
- distributed workflow では rollback ではなく compensation を基本にする

---

## ■ shipment workflow

shipment workflow は、出荷指示からピッキング、在庫・パレット出庫、請求候補までをつなぐ業務フローである。

現時点では設計候補であり、実装を前提にしない。

代表的な流れ:

```text
shipment.created
  -> shipment.pick.started
  -> shipment.pick.confirmed
  -> inventory.out.distributed
  -> pallet.out.completed
  -> shipment.outbound.confirmed
  -> billing.candidate_created
```

主な関与 domain:

- shipment
- inventory
- pallet
- billing

整合性の観点:

- shipment が確定しているのに inventory out がない
- inventory out はあるが pallet out がない
- 出庫済みだが billing candidate がない
- shipment cancel が出庫後に要求された

方針:

- shipment は親 workflow になり得る
- inventory / pallet / billing は child trace として接続する
- 途中失敗は削除ではなく compensation / correction event で扱う
- 請求確定後の補正は承認と監査性を強くする

---

## ■ OCR / EDI workflow

OCR / EDI workflow は、外部入力を受け取り、構造化し、Expected / Actual / shipment / inventory へつなげる業務フローである。

### OCR workflow

代表的な流れ:

```text
ocr.import.received
  -> ocr.import.parsed
  -> expected.created
  -> actual.created
  -> actual.matched
  -> inventory.in.created
```

失敗・保留の例:

- OCR入力が読めない
- parse は成功したが business identifier が不足している
- Expected / Actual の照合に失敗した
- 在庫入庫前に手動確認が必要になった

### EDI workflow

代表的な流れ:

```text
edi.file.received
  -> edi.file.parsed
  -> edi.message.accepted
  -> shipment.created
  -> shipment.pick.confirmed
  -> inventory.out.distributed
```

失敗・保留の例:

- EDIファイル形式が不正
- 同一 external file hash の重複が検出された
- EDI message と既存 shipment が重複する
- warehouse_code や business identifier が一致しない

方針:

- 外部入力は workflow の起点として traceability を強くする
- external file hash / source_system / request_id を metadata として扱うことを検討する
- parse / accepted / rejected / corrected を混同しない
- 外部入力の replay は通常業務の retry と分離する

---

## ■ expected / actual reconciliation workflow

expected / actual reconciliation workflow は、予定情報と実績情報を照合し、差異を検出・解消する業務フローである。

代表的な流れ:

```text
expected.created
  -> actual.created
  -> actual.matched
  -> inventory.in.created
```

差異がある場合:

```text
expected.created
  -> actual.created
  -> actual.mismatch_detected
  -> actual.reconciled
  -> inventory.in.created
```

主な観点:

- Expected はどの外部入力から作られたか
- Actual はどの現場操作・OCR・EDIから作られたか
- mismatch の理由が metadata として説明できるか
- reconciliation 後の在庫更新が trace chain で追えるか

方針:

- mismatch はエラーではなく業務 event として扱う
- 差異解消は上書きではなく `actual.reconciled` として説明できるようにする
- reconciliation 後の inventory / shipment / billing への影響を trace で追えるようにする

---

## ■ compensation action の考え方

compensation action は、すでに完了した local transaction を、削除や直接rollbackではなく、別の業務操作で補正する考え方である。

例:

| 元の処理 | compensation action 候補 |
| --- | --- |
| 誤った `inventory.in.created` | 調整 transaction または correction event |
| 誤った `inventory.out.distributed` | 逆方向の補正 transaction |
| 誤った `pallet.move.completed` | 正しい棚番への追加 move event |
| 誤った `shipment.outbound.confirmed` | shipment cancel / correction |
| 誤った `billing.candidate_created` | billing correction / cancel candidate |

方針:

- compensation は元履歴を消すためのものではない
- 元 trace と compensation trace の関係を残す
- 実物流が動いた後の compensation は業務承認を検討する
- 請求・監査に関係する compensation は理由と承認者を metadata に残すことを検討する

---

## ■ rollback と compensation の違い

rollback は、commit 前の local transaction を取り消す考え方である。

compensation は、commit 済みの業務事実を別 event で補正する考え方である。

| 項目 | rollback | compensation |
| --- | --- | --- |
| 対象 | 未commitの local transaction | commit済みの業務処理 |
| 方法 | DB transaction を取り消す | 補正event / 補正transactionを追加する |
| 履歴 | 原則残らない | 元操作と補正操作が残る |
| 用途 | RPC内の失敗 | distributed workflow の失敗・取消 |
| audit | 説明対象になりにくい | 説明対象になる |

方針:

- local transaction 内では rollback を使う
- distributed workflow では compensation を基本にする
- rollback と compensation を混同しない

---

## ■ orchestration saga / choreography saga の違い

### orchestration saga

orchestration saga は、中心となる workflow controller が各 domain の処理順序を制御する方式である。

例:

```text
shipment workflow controller
  -> create shipment
  -> reserve / out inventory
  -> update pallet
  -> create billing candidate
```

利点:

- 全体の状態を把握しやすい
- retry / timeout / compensation を集中管理しやすい
- 業務フローの順序が明示的になる

注意:

- controller に責務が集中しやすい
- domain 間の結合が強くなりやすい
- controller 自体の障害や二重実行対策が必要になる

### choreography saga

choreography saga は、各 domain が integration event を受けて自律的に後続処理を進める方式である。

例:

```text
shipment.outbound.confirmed
  -> inventory domain handles inventory out
  -> pallet domain handles pallet out
  -> billing domain handles candidate creation
```

利点:

- domain の独立性を保ちやすい
- 新しい後続処理を追加しやすい
- integration event を中心に疎結合にできる

注意:

- 全体の進行状態が見えにくい
- missing event / duplicate event / stuck workflow の監視が重要になる
- trace observability が前提になる

方針:

- 初期は業務影響が大きい workflow ほど orchestration saga を検討する
- domain が増え、event contract が安定したら choreography saga を検討する
- どちらの方式でも workflow trace を残す

---

## ■ workflow trace の考え方

workflow trace は、長い業務フロー全体を trace chain として観測する考え方である。

主なID:

- `request_id`: 1回のAPI実行を観測する
- `trace_id`: 1つの業務操作を束ねる
- `parent_trace_id`: workflow 全体または上位業務と child trace を接続する
- `idempotency_key`: 同一操作の二重実行を防ぐ

例:

```text
parent_trace_id = shipment workflow
  -> trace_id = shipment.created
  -> trace_id = inventory.out.distributed
  -> trace_id = pallet.out.completed
  -> trace_id = billing.candidate_created
```

方針:

- workflow の各 step は domain event として説明できるようにする
- workflow 全体は `parent_trace_id` または workflow metadata で接続する
- retry / compensation / replay は元 step と区別できるようにする
- workflow trace は audit / forensic / recovery の起点になる

---

## ■ retry / timeout / stuck workflow の考え方

### retry

retry は、一時的な失敗に対して同じ step を再試行する考え方である。

方針:

- retry は `idempotency_key` と組み合わせて二重実行を防ぐ
- retry count / reason / last_error を観測できるようにすることを検討する
- retry と replay を混同しない

### timeout

timeout は、外部API・RPC・job が一定時間内に完了しない状態である。

方針:

- timeout 後に partial write がないか確認する
- timeout は技術エラーだけでなく workflow 停滞として扱う
- retry するか compensation へ進むかは domain ごとに判断する

### stuck workflow

stuck workflow は、業務フローが途中 step で止まっている状態である。

例:

- `ocr.import.parsed` 後に `expected.created` がない
- `shipment.pick.confirmed` 後に `inventory.out.distributed` がない
- `inventory.out.distributed` 後に `billing.candidate_created` がない

方針:

- event taxonomy 上の期待 chain と実際の trace chain を比較する
- stuck は自動削除せず、調査・retry・compensation・manual recovery の対象にする
- alert severity は業務影響で分ける

---

## ■ replay / recovery との関係

### replay

replay は、過去の入力や操作を再実行する考え方である。

workflow における replay では、どの step から再実行するかを明確にする必要がある。

例:

- OCR parse から再実行する
- Expected / Actual reconciliation だけ再実行する
- shipment workflow の billing candidate 作成だけ再実行する

方針:

- workflow 全体 replay と step replay を区別する
- replay は元 trace を上書きしない
- replay には新しい `trace_id` を発行し、元 workflow と関係づけることを検討する
- replay 後の差分を audit できるようにする

### recovery

recovery は、失敗・欠落・不整合から業務状態を回復する考え方である。

例:

- missing event を検出して必要な step を再実行する
- stuck workflow を再開する
- compensation action を実行する
- 派生状態を rebuild する

方針:

- recovery は真実ログと trace chain を根拠にする
- 自動 recovery より、まず検知・可視化・承認を優先する
- recovery 自体も domain event / trace として残すことを検討する

---

## ■ workflow observability の考え方

workflow observability は、workflow の進行状態・失敗・補正・再試行を外部から観測できる状態を指す。

観測対象:

- workflow id / parent_trace_id
- current step
- step status
- started_at / completed_at
- retry count
- timeout count
- stuck duration
- last_error
- compensation status
- replay / recovery status
- operator / approver metadata

monitoring 候補:

- workflow started count
- workflow completed count
- workflow failed count
- stuck workflow count
- compensation count
- replay count
- average duration
- step latency
- domain 別 failure count

方針:

- workflow は成功時だけでなく途中状態も観測対象にする
- alert は業務影響と対応手順に結びつける
- trace_id / parent_trace_id / request_id を alert と調査画面に含めることを検討する
- workflow observability は audit / forensic の前提になる

---

## ■ 導入段階案

### Step 1: workflow 候補の棚卸し

shipment、OCR / EDI、expected / actual、billing につながる長い業務フローを整理する。

### Step 2: step と domain event の対応整理

各 workflow step を event taxonomy / domain event architecture と対応づける。

### Step 3: stuck / missing / duplicate パターン整理

workflow ごとに、どの step 欠落・遅延・重複が業務リスクになるか整理する。

### Step 4: compensation action 候補整理

各 domain owner が、取消・補正・再実行の方針を整理する。

### Step 5: workflow observability 検討

workflow trace、status、alert、dashboard / timeline view の候補を整理する。

---

## ■ 今後の検討事項

以下は今回決定しない。

- workflow 状態をDBへ保存するか
- workflow id を `parent_trace_id` と同一にするか分離するか
- saga controller を作るか
- orchestration saga をどの domain が所有するか
- choreography saga の event bus / queue を導入するか
- integration event の配送方式
- step status / retry count / timeout の保存先
- stuck workflow の判定閾値
- compensation action の正式 event name
- compensation の承認フロー
- replay を workflow 全体単位にするか step 単位にするか
- recovery job の実装有無
- admin-dashboard で workflow timeline を表示するか
- alert の通知先・severity

---

## ■ 原則

local transaction は、即時整合が必要な範囲を守る。

distributed workflow は、複数 domain にまたがる長い業務フローを説明可能にする。

saga は、巨大transactionではなく、local transaction と compensation で整合性を維持する。

rollback と compensation を混同しない。

workflow は trace / event / metadata / observability と一体で設計する。
