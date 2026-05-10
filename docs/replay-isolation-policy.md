# Replay Isolation Policy（Phase B10-03）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、replay を original business operation と混同せず、安全に再実行・比較・監査できるようにする policy を整理する。

replay は、過去入力・過去操作・workflow step を参照し、新しい実行として再処理するための recovery 手段である。replay は便利だが、original trace と混同すると、同じ業務操作が二重に起きたのか、再実行されたのか、補正されたのかを後から説明できなくなる。

Phase B10-03 では、replay の目的、replay isolation、original trace と replay trace の分離、`request_id` / `trace_id` / `parent_trace_id` の扱い、dry-run、compare、traceability、approval boundary、rebuild / correction との違いを整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・replay・correction・rebuild・自動同期は実装しない。

---

## ■ 基本方針

replay isolation は、元の業務操作と replay 実行を明確に分けるための原則である。

基本方針:

- replay は original transaction / history を削除・上書きしない
- replay は original trace と同じ trace_id を再利用しない
- replay execution は新しい `request_id` と replay 用 `trace_id` を持つ
- replay dry-run と replay execution を分ける
- replay result は original result と compare できるようにする
- replay は correction の代替ではない
- replay は rebuild の代替ではない
- replay は automatic action ではなく、approval boundary を持つ recovery candidate として扱う
- warehouse_code boundary を維持する
- observability first を維持する

---

## ■ Replay の目的

replay の目的は、過去入力や過去 workflow step を、新しい実行として安全に再処理することである。

目的:

- external input の再処理
- OCR / EDI / shipment などの workflow step 再実行
- idempotency / duplicate handling の検証
- original result と replay result の比較
- 失敗した workflow step の recovery candidate 作成
- projection / read model 作成処理の再評価
- correction 後の downstream processing 再評価

replay が適している例:

- OCR 読み取り結果を補正した後、後続処理を新しい trace として再実行する
- EDI input の変換 logic 修正後に dry-run で差分を見る
- shipment workflow の失敗 step を元 input から再処理する
- idempotency_key の扱いが正しいか比較する

replay が適していない例:

- 誤った在庫 transaction を単純に消したい
- projection が stale なだけで source of truth は正しい
- 現場が実物流を修正済みで、業務的な補正 transaction が必要である
- original trace を上書きして「なかったこと」にしたい

---

## ■ Replay Isolation の基本原則

replay isolation の目的は、再実行による新しい履歴と original の履歴を混同しないことである。

原則:

- original trace は immutable な調査対象として扱う
- replay trace は新しい業務的・技術的実行として扱う
- replay は original transaction を更新・削除しない
- replay result は original result と比較されるが、同一視されない
- replay dry-run は source of truth を変更しない
- replay execution は実行前に approval boundary を通す
- replay の影響範囲を事前に説明できるようにする

禁止:

- original trace_id の再利用
- original request_id の再利用
- replay result による silent overwrite
- replay を correction と呼び替えること
- replay を rebuild と呼び替えること
- approval なしの high impact replay

---

## ■ Original Trace と Replay Trace の分離

original trace と replay trace は別物として扱う。

| 項目 | Original Trace | Replay Trace |
| --- | --- | --- |
| 意味 | 最初に発生した業務操作 | 再実行された新しい操作 |
| trace_id | original の trace_id | replay 用に新規発行 |
| request_id | original request | replay request |
| parent_trace_id | 元業務 chain | original / incident / recovery chain を参照し得る |
| transaction | original の結果 | replay execution が作る新しい結果 |
| 監査 | 原因調査対象 | recovery /再実行の監査対象 |

方針:

- original trace は残す
- replay trace は original trace を参照できるようにする
- replay trace は original trace の置き換えではない
- timeline / trace search では original と replay の関係を説明できるようにする

将来の関係表現候補:

- `original_trace_id`
- `replay_trace_id`
- `parent_trace_id`
- `related_trace_id`
- `replay_reason_code`
- `replay_group_id`

現時点では schema を追加せず、policy として整理する。

---

## ■ Replay request_id / trace_id / parent_trace_id の考え方

replay では、`request_id`、`trace_id`、`parent_trace_id` の役割を分ける。

### `request_id`

`request_id` は、replay dry-run または replay execution の API / job / batch 実行単位である。

方針:

- replay 実行ごとに新しい `request_id` を発行する
- original request_id を再利用しない
- retry した場合も request_id は変わり得る
- request_id は idempotency_key ではない

### `trace_id`

`trace_id` は、replay という新しい業務操作または recovery operation の単位である。

方針:

- replay trace_id は original trace_id と分ける
- dry-run trace と execution trace を同一視しない
- replay result を original result と比較できるようにする
- trace_id は business operation の説明軸であり、transaction primary key ではない

### `parent_trace_id`

`parent_trace_id` は、replay がどの上位業務 chain / original operation / recovery incident に属するかを説明する補助軸である。

方針:

- original trace を parent_trace_id に入れるか、別 metadata で持つかは将来検討する
- OCR / EDI / shipment などの上位 workflow では parent_trace_id が有効になり得る
- 初期導入では nullable / optional とし、強制しない
- parent_trace_id を根拠に automatic replay を実行しない

---

## ■ Replay Dry-run の考え方

replay dry-run は、過去入力や original trace を参照して、実行した場合に何が起きるかを source of truth へ反映せずに確認する方式である。

目的:

- replay の影響範囲を事前に確認する
- original result と replay expected result を比較する
- duplicate / idempotency risk を確認する
- manual review / approval の材料にする
- replay logic の安全性を検証する

dry-run 出力候補:

- replay_dry_run_id
- original_trace_id
- candidate_replay_trace_id
- request_id
- parent_trace_id
- source input reference
- expected transactions
- expected projection impact
- affected warehouse_code
- affected pallet_code
- affected part_no
- diff summary
- risk level
- manual_review_required
- suggested action

方針:

- dry-run は transaction / projection を変更しない
- dry-run result は automatic replay execution の直接トリガーにしない
- dry-run result が大きすぎる場合は scope を狭める
- dry-run と execution は関連付けるが、同一視しない

---

## ■ Replay Compare の考え方

replay compare は、original result と replay result / expected result を比較し、差異と影響を説明する考え方である。

比較対象:

- original input
- replay input
- original transactions
- replay expected transactions
- original projection impact
- replay expected projection impact
- original trace timeline
- replay trace timeline

比較したい問い:

- original と replay で作られる transaction は同じか
- 数量・location・project_no・inventory_type に差があるか
- replay により duplicate が発生しないか
- replay result は correction が必要な source error を含んでいないか
- warehouse_code boundary を越えないか
- downstream projection / read model への影響は何か

方針:

- compare は read-only に行う
- replay compare は approval の判断材料にする
- compare result だけで automatic correction / rebuild を実行しない
- original と replay の差異は原因調査の入口として扱う

---

## ■ Replay Traceability の考え方

replay は original operation を再処理するため、通常実行より強い traceability が必要である。

保存・表示したい情報:

- replay_id
- replay_type
- replay_mode
- original_trace_id
- replay_trace_id
- parent_trace_id
- request_id
- requested_by
- approved_by
- reason_code
- reason_text
- source input reference
- dry_run_id
- compare_summary
- affected warehouse_code
- affected keys
- status
- started_at
- finished_at

traceability 方針:

- replay trace は original trace と分ける
- replay trace は original trace を参照できるようにする
- dry-run と execution を分けて記録する
- replay reason は free text だけでなく reason_code を検討する
- replay status は requested / dry_run / approved / executed / failed / cancelled などを分けて考える
- replay 結果は observability / audit の対象にする

初期方針:

- すぐに schema は作らない
- まず policy と checklist を整える
- 将来 migration を行う場合は nullable / additive / no destructive change を守る

---

## ■ Replay Approval Boundary の考え方

replay approval boundary は、どの replay を誰の承認で実行できるかを分けるための境界である。

approval が必要な理由:

- replay は新しい transaction / event を追加し得る
- duplicate processing の危険がある
- shipment / billing / inventory に影響する可能性がある
- original trace と replay trace の関係を説明する必要がある
- warehouse_code boundary を越えた影響を避ける必要がある

approval boundary 候補:

| Replay type | Risk | Approval 方針 |
| --- | --- | --- |
| dry-run only | low | operator review |
| projection impact compare | medium | reviewer approval |
| transaction generating replay | high | approver approval |
| cross-domain workflow replay | high | domain owner approval |
| cross-warehouse replay | critical | 原則禁止または特別承認 |

方針:

- dry-run と execution の approval を分ける
- high / critical replay は automatic execution しない
- replay execution 前に affected scope と compare result を確認する
- approval なしに original trace を置き換えない

---

## ■ Replay と Rebuild の違い

replay と rebuild は目的と対象が異なる。

| 種別 | 対象 | 実行内容 | Source of truth 変更 |
| --- | --- | --- | --- |
| Replay | command / workflow / external input | 過去入力や操作を新しい実行として再処理する | 新しい event / transaction を追加し得る |
| Rebuild | projection / read model | source of truth から派生状態を再計算する | しない |

replay が適切なケース:

- OCR / EDI / shipment input を再処理する
- workflow step を新しい request / trace として再実行する
- external callback や batch input の処理結果を再評価する

rebuild が適切なケース:

- source of truth は正しいが projection が stale
- `inventory_current` / `pallet_units` / `pallet_item_links` を再計算したい
- read model logic 修正後に派生状態を回復したい

禁止:

- projection drift を replay だけで解決したことにする
- workflow 再実行が必要な問題を rebuild と呼び替える
- rebuild と replay の trace を混同する

---

## ■ Replay と Correction の違い

replay と correction も目的が異なる。

| 種別 | 対象 | 主目的 | Source of truth 変更 |
| --- | --- | --- | --- |
| Replay | original input / workflow step | 新しい実行として再処理する | 新しい event / transaction を追加し得る |
| Correction | 誤った業務事実 | 補正 transaction / event で業務状態を正す | 新しい補正履歴を追加する |

replay が適切なケース:

- 入力や workflow step を再実行すれば正しい結果を得られる
- original result と replay result を比較したい
- external input 処理の失敗から回復したい

correction が適切なケース:

- original source of truth に誤った業務事実が記録されている
- operator 入力ミスを承認付きで補正する必要がある
- 実物流・請求影響に対して補正 transaction が必要である

禁止:

- correction が必要な誤登録を replay で隠す
- replay result で original transaction を上書きする
- replay を取消・調整 transaction の代替にする

---

## ■ Observability First との関係

replay isolation は observability first の後に来る。

関係:

- trace timeline が original operation を説明する
- trace relation が request_id 単位の流れを説明する
- compare dashboard が projection / read model の差異を見える化する
- historical snapshot が trend / recurrence を説明する
- replay isolation policy が replay candidate を安全に扱う条件を整理する

observability first が必要な理由:

- original trace が説明できないと replay scope を決められない
- replay すべきか rebuild / correction すべきか判断できない
- original result と replay result の比較軸が必要である
- approval boundary を決めるには affected scope と risk が必要である

方針:

- observability metrics は replay candidate の選定に使う
- metrics は automatic replay の直接トリガーにしない
- replay 後も compare / trace timeline / snapshot / trend で効果を確認する

---

## ■ 導入段階案

### Step 0: Policy の明文化

本ドキュメントで replay isolation の原則を整理する。

この段階では実装しない。

### Step 1: Replay Candidate Checklist

候補:

- original trace は特定できるか
- original input は再利用可能か
- replay が rebuild / correction より適切か
- affected warehouse_code は明確か
- duplicate risk はあるか
- approval が必要な risk level か

### Step 2: ID / Trace Relation Design

候補:

- original_trace_id
- replay_trace_id
- parent_trace_id
- request_id
- dry_run_id
- replay_group_id

方針:

- original trace_id は再利用しない
- replay trace_id は新規発行する
- parent_trace_id / related_trace_id は optional とする

### Step 3: Replay Dry-run Design

候補:

- source input reference
- expected transaction summary
- expected projection impact
- duplicate risk
- affected scope
- manual_review_required

この段階では source of truth を変更しない。

### Step 4: Replay Compare Design

候補:

- original result
- replay expected result
- transaction diff
- projection impact diff
- trace timeline diff
- warehouse boundary check

compare result は approval の判断材料として扱う。

### Step 5: Approval Boundary Design

候補:

- dry-run only
- reviewer approval
- approver approval
- domain owner approval
- special approval for cross-warehouse risk

high / critical replay は automatic execution しない。

### Step 6: Controlled Replay Execution Candidate

候補:

- OCR input replay
- EDI input replay
- shipment workflow step replay
- idempotency verification replay

実装する場合は、dry-run、approval、traceability、post-compare を必須候補にする。

### Step 7: Post-replay Observability

候補:

- replay trace timeline
- original vs replay compare
- projection diff after replay
- affected snapshot / trend
- remaining manual review items

replay 成功は、単に実行が完了したことではなく、期待した差分と影響範囲を説明できることで判断する。

---

## ■ 今回は実装しない判断

Phase B10-03 では、policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- replay 実装
- correction 実装
- rebuild 実装
- 自動同期
- replay table
- approval workflow
- scheduled job
- README変更

理由:

- 現在は replay isolation の原則を明文化する段階である
- original trace と replay trace の分離を先に固定する必要がある
- dry-run / compare / approval / traceability なしに replay を実行すると監査性が弱い
- replay と rebuild / correction の責務を混ぜると、原因調査と説明責任が弱くなる
- automatic replay は duplicate / double processing の危険があるため急がない

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/request-chain-parent-trace-design.md`
- `docs/historical-observability-snapshot-design.md`
- `docs/controlled-correction-policy.md`
- `docs/scoped-rebuild-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

replay isolation は、再実行を安全に扱うための監査境界である。

original trace は元の業務操作として残し、replay trace は新しい recovery /再実行 operation として分離する。replay は correction や rebuild の代替ではなく、dry-run、compare、approval、traceability を通して段階的に扱う。
