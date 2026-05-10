# Controlled Correction Policy（Phase B10-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、inventory / pallet consistency に対して、安全に correction / rebuild / recovery を行うための方針を整理する。

これまでの Phase では、`inventory_current` と `pallet_units` / `pallet_item_links` の差異を compare-only で可視化し、severity、aging、review status、hotspot、observability、trend、historical snapshot の考え方を整理してきた。

Phase B10-01 では、見つかった差異に対して「いつ、どの範囲で、どの根拠に基づき、どのように補正・再構築・回復へ進むか」を policy として整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・correction・replay・rebuild・自動同期は実装しない。

---

## ■ 基本原則

controlled correction は、差異を見つけた瞬間に自動で直す仕組みではない。

基本原則:

- source of truth を壊さない
- commit 済み transaction / history を削除・上書きしない
- correction は理由・根拠・operator・approver・related trace を説明できる形にする
- projection / read model の差異は、source of truth を根拠にして判断する
- rebuild / recovery は scoped に行い、対象範囲を広げすぎない
- replay は元 trace と replay trace を混同しない
- automatic correction は、manual correction の運用ルールが固まるまで急がない
- observability first を維持し、compare-only から段階的に進める

source of truth:

| Domain | Source of truth | Projection / read model |
| --- | --- | --- |
| Inventory | `inventory_transactions` | `inventory_current` |
| Pallet | `pallet_transactions` | `pallet_units`, `pallet_item_links` |
| Warehouse location | `warehouse_location_history` | location search / current location views |

---

## ■ Correction の目的

correction の目的は、差異を隠すことではない。

目的:

- source of truth に誤りがある場合に、履歴を残したまま業務状態を正す
- projection / read model が source of truth とズレている場合に、根拠を持って回復する
- 実物流・請求・監査に影響する差異を説明可能な形で収束させる
- 後から「なぜ補正したか」「誰が承認したか」「どの trace に関連するか」を追跡できるようにする

correction がしてはいけないこと:

- transaction を物理削除する
- 過去 transaction を単純上書きする
- `inventory_current` だけを直接更新して差異を隠す
- `pallet_units` / `pallet_item_links` だけを根拠なく更新して現場状態を隠す
- trace / request / approval なしに業務状態を変える

---

## ■ Manual Correction を優先する理由

初期段階では manual correction を優先する。

理由:

- 差異の原因が source of truth 側か projection / read model 側かを人間が判断する必要がある
- pallet move と inventory move の業務的な同一性が warehouse / customer / operation mode で異なる可能性がある
- 混載 pallet、部分移動、project_no 混在、inventory_type 差異は自動判定が難しい
- 実物流確認、現場ヒアリング、請求影響確認が必要になる場合がある
- correction reason / operator / approver の運用が先に必要である
- 自動補正を先に入れると、誤った差異解釈を大量に反映する危険がある

manual correction の役割:

- 差異を分類する
- source of truth の誤りか、projection / read model の誤りかを切り分ける
- correction / rebuild / replay / no action を判断する
- 根拠と承認を残す

manual correction は非効率に見えるが、初期段階では業務ルールを学習するための重要なプロセスである。

---

## ■ Automatic Correction を急がない理由

automatic correction は将来候補であり、現時点では急がない。

急がない理由:

- 差異の種類だけでは正しい補正方法が決まらない
- source of truth にない状態を projection に反映すると監査性が壊れる
- projection の差異を source of truth の誤りと誤判定すると、履歴汚染につながる
- automatic correction の失敗は、元の差異より大きな業務影響を生む可能性がある
- approval / rollback / compensation / audit の設計なしに自動化すると説明責任が弱い
- replay / rebuild と correction の責務が混ざると、原因調査が難しくなる

automatic correction を検討できる条件:

- correction 対象の domain と差異 type が限定されている
- source of truth と projection の責務が明確である
- correction reason / approval / traceability が保存できる
- dry-run と compare-only result を確認できる
- failure / partial success / retry の扱いが決まっている
- warehouse_code boundary が保証されている

---

## ■ Scoped Rebuild の考え方

scoped rebuild は、source of truth から projection / read model を限定範囲で再構築する recovery 手段である。

対象例:

- `inventory_transactions` から特定 warehouse / part / project / inventory_type の `inventory_current` を再計算する
- `pallet_transactions` から特定 pallet の `pallet_units` / `pallet_item_links` の現在状態を再構築する
- location history から特定 location / pallet の current view を再確認する

原則:

- rebuild は source of truth を変更しない
- rebuild 対象範囲を明示する
- rebuild 前後の diff を compare-only で確認する
- rebuild 実行 trace / request / operator / reason を記録できる設計にする
- 全件 rebuild は最後の手段とする

scoped rebuild の単位候補:

- `warehouse_code`
- `pallet_code`
- `part_no`
- `project_no`
- `inventory_type`
- `location_code`
- `trace_id`
- `parent_trace_id`

注意:

scoped rebuild は、source of truth が正しいことを前提にする。source of truth 自体に誤りがある場合は、rebuild ではなく correction / compensation transaction を検討する。

---

## ■ Replay Isolation の考え方

replay は、過去入力や過去操作を再実行する考え方である。

replay isolation は、元の業務操作と replay 実行を混同しないための原則である。

原則:

- replay 実行時の `request_id` は新しくする
- replay trace は元 trace と区別する
- replay が参照した original trace / parent trace を説明できるようにする
- replay 結果は元 transaction の上書きではなく、新しい実行結果として扱う
- replay dry-run と replay execution を分ける
- replay は correction の代替ではない

replay が向いているケース:

- external input の再処理
- OCR / EDI / shipment などの workflow 再実行
- idempotency の検証
- projection 作成処理の再評価

replay が向かないケース:

- 過去 transaction の単純な打ち消し
- 現場が実物流を修正済みの差異
- operator 入力ミスに対する承認済み補正
- source of truth に補正 transaction が必要なケース

---

## ■ Correction Traceability の考え方

correction は、通常 transaction より強い traceability が必要である。

保存・表示したい情報:

- correction_id
- correction_type
- reason_code
- reason_text
- operator
- approver
- original_trace_id
- correction_trace_id
- parent_trace_id
- request_id
- before state
- after state
- evidence / attachment reference
- created_at

traceability の方針:

- correction trace は元 trace と関連付ける
- `request_id` は correction API / batch 実行単位として扱う
- `trace_id` は correction という業務操作単位として扱う
- `parent_trace_id` は元業務 chain との関係を説明する補助軸として扱う
- correction reason は free text だけでなく reason_code を検討する
- correction の承認状態と実行状態を分けて考える

初期方針:

- すぐに schema は作らない
- まず policy と manual checklist を整える
- 将来 migration を行う場合は nullable / additive / no destructive change を守る

---

## ■ Source of Truth を壊さない Correction 原則

source of truth protection は controlled correction の最重要原則である。

Inventory:

- `inventory_current` を直接更新して真実扱いしない
- 在庫数量の correction は `inventory_transactions` への補正 transaction / compensation transaction として検討する
- 過去 transaction は削除・上書きしない
- 取り消し・調整・再入庫・再出庫などの業務意味を明確にする

Pallet:

- `pallet_units` / `pallet_item_links` は現在保管状態 read model として扱う
- pallet の真実は `pallet_transactions` を中心に追跡する
- pallet item の紐付け差異は、現場状態・過去 pallet transaction・inventory transaction との関係を確認する
- read model だけを更新して transaction 履歴との矛盾を隠さない

Warehouse location:

- location の有効化・無効化・変更は `warehouse_location_history` を根拠にする
- current view だけを見て履歴を無視しない
- warehouse_code boundary を越える correction は critical risk として扱う

禁止:

- transaction delete
- silent overwrite
- projection-only fix
- unapproved cross-warehouse correction
- trace なし correction

---

## ■ Projection / Read Model Correction の考え方

projection / read model correction は、source of truth が正しく、派生状態だけがズレている場合に検討する。

対象:

- `inventory_current`
- `pallet_units`
- `pallet_item_links`
- current warehouse view
- snapshot / monitoring aggregate

方針:

- projection correction は source of truth を根拠にする
- projection だけを手で直して差異を隠さない
- rebuild / refresh / scoped recovery を優先する
- correction 前後の diff を残せる設計にする
- projection correction と source correction を明確に分ける

判断:

| 状況 | 優先対応 |
| --- | --- |
| source of truth が誤っている | correction / compensation transaction |
| projection だけが古い | scoped rebuild / refresh |
| read model 作成ロジックが誤っている | bug fix + rebuild 検討 |
| 実物流が system と違う | manual review + source correction 検討 |
| 原因不明 | compare-only + investigation 継続 |

---

## ■ Observability First との関係

controlled correction は observability first の次の段階である。

関係:

- compare dashboard は差異を見える化する
- observability dashboard は運用品質 risk を要約する
- historical snapshot は傾向と再発を説明する
- controlled correction policy は、どの条件で correction / rebuild / replay に進むかを整理する

observability first が必要な理由:

- 差異の種類と頻度を知らないまま correction を設計すると過剰実装になる
- recurring hotspot を見ないと scoped rebuild の単位を決めにくい
- aging / backlog を見ないと priority が決まらない
- trend を見ないと automation の効果を測れない

方針:

- correction は observability の結果を参考にする
- observability metrics は automatic action の直接トリガーにしない
- correction 後も snapshot / trend で効果を確認する

---

## ■ Compare-only から Correction へ進む段階

compare-only から correction へは段階的に進める。

### Stage 0: Compare-only

差異を検出し、表示するだけの段階。

やること:

- severity
- reason_codes
- review_required
- aging
- hotspot
- trend

やらないこと:

- DB更新
- correction
- rebuild
- replay
- 自動同期

### Stage 1: Manual Review

差異を人間が確認する段階。

やること:

- 差異原因の分類
- source / projection /実物流の切り分け
- correction 要否の判断
- evidence の収集
- approval 要否の判断

### Stage 2: Manual Correction Policy

manual correction のルールを明文化する段階。

やること:

- correction type 定義
- reason_code 定義
- operator / approver 定義
- trace relation 定義
- before / after evidence 定義

### Stage 3: Controlled Execution

限定された correction / scoped rebuild / replay dry-run を実行可能にする段階。

やること:

- dry-run
- diff preview
- approval
- scoped execution
- execution trace
- post-compare

### Stage 4: Limited Automation Candidate

限定条件で automation を検討する段階。

条件:

- 差異 type が限定されている
- source of truth が明確である
- dry-run が安定している
- approval / audit が整っている
- rollback / compensation 方針がある

この段階でも、automatic correction は例外的に扱う。

---

## ■ 導入段階案

### Step 0: Policy の明文化

本ドキュメントで controlled correction の原則を整理する。

この段階では実装しない。

### Step 1: Manual Review Checklist

候補:

- source of truth 側の誤りか
- projection / read model 側の誤りか
- 実物流確認が必要か
- 請求影響があるか
- warehouse boundary risk があるか
- correction / rebuild / replay / no action のどれか

### Step 2: Correction Type / Reason Code 設計

候補:

- inventory quantity correction
- inventory location correction
- pallet item link correction
- pallet location correction
- projection rebuild
- replay dry-run
- no action / accepted difference

reason code:

- operator_input_error
- projection_drift
- stale_read_model
- location_mismatch
- project_mismatch
- partial_move
- migration_residue
- external_input_error
- unknown

### Step 3: Traceability Design

候補:

- original_trace_id
- correction_trace_id
- parent_trace_id
- request_id
- operator
- approver
- reason_code
- before / after diff

この段階では nullable / optional を前提に設計する。

### Step 4: Dry-run / Diff Preview Design

候補:

- correction dry-run
- scoped rebuild dry-run
- replay dry-run
- before / after compare
- affected rows summary

dry-run は source of truth を変更しない。

### Step 5: Scoped Execution Design

候補:

- scoped rebuild
- manual correction transaction
- projection refresh
- replay execution

実装する場合は、approval・traceability・post-compare を必須候補にする。

### Step 6: Automation Candidate Review

automation は最後に検討する。

確認:

- manual correction で十分な実績があるか
- 誤補正時の回復方針があるか
- audit / approval に耐えられるか
- warehouse / customer / operation mode 差を吸収できるか
- observability metrics で効果を検証できるか

---

## ■ 今回は実装しない判断

Phase B10-01 では、policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- correction 実装
- replay 実装
- rebuild 実装
- 自動同期
- correction table
- approval workflow
- scheduled job
- README変更

理由:

- まだ compare-only / observability first の段階である
- manual correction の判断軸を先に固める必要がある
- automatic correction は source of truth protection と auditability の設計後に検討すべきである
- correction / rebuild / replay の責務を混ぜると、原因調査と説明責任が弱くなる
- controlled correction は実装より先に policy と運用判断を整える必要がある

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/request-chain-parent-trace-design.md`
- `docs/historical-observability-snapshot-design.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/projection-consistency-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-projection-read-model.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

controlled correction は、差異を自動で消す仕組みではなく、source of truth を守りながら安全に回復へ進むための policy である。

まずは compare-only / observability first で差異を説明し、manual review で判断軸を育てる。その上で、scoped rebuild、replay isolation、correction traceability を段階的に設計し、automatic correction は十分な根拠と監査性が整ってから検討する。
