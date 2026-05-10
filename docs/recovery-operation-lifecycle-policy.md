# Recovery Operation Lifecycle Policy（Phase B10-05）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、correction / rebuild / replay / recovery operation が、どの状態を経て安全に実行・監査されるかを lifecycle として整理する。

inventory / pallet consistency の差異は、compare-only / observability first で発見され、manual review、approval boundary、controlled correction、scoped rebuild、replay isolation へ段階的に進む。ここで recovery operation の状態が曖昧だと、承認済みなのか、dry-run 済みなのか、実行中なのか、失敗後に retry してよいのかを説明できなくなる。

Phase B10-05 では、recovery operation state、dry-run lifecycle、execution lifecycle、approval state と execution state の分離、retry isolation、rollback / compensation、observability / auditability、correction / rebuild / replay の lifecycle 差分を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・lifecycle・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

recovery lifecycle は、operation を安全に進めるための状態管理方針である。

基本方針:

- lifecycle state は operation の現在位置を説明する
- approval state と execution state を分ける
- dry-run と execution を分ける
- retry は original execution と分離して扱う
- failed operation を silent retry しない
- cancelled operation を暗黙に再開しない
- completed は「実行完了」だけでなく post-compare / audit 確認を含めて考える
- rollback は安易に使わず、必要なら compensation を検討する
- lifecycle は observability / auditability と一体で扱う

---

## ■ Recovery Lifecycle の目的

recovery lifecycle の目的は、recovery operation を一貫した状態遷移で扱い、後から説明できるようにすることである。

目的:

- operation がどの段階にあるかを明確にする
- dry-run と execution の混同を防ぐ
- approval 済みと実行済みの混同を防ぐ
- failed / cancelled / retry の扱いを明確にする
- correction / rebuild / replay の違いを lifecycle 上でも表現する
- request_id / trace_id / parent_trace_id と operation state を結び付ける
- audit 時に誰が何を承認し、何が実行されたか説明できるようにする

---

## ■ Recovery Operation State の整理

recovery operation は、少なくとも以下の state を持つ候補として整理する。

| State | 意味 | 主な責務 |
| --- | --- | --- |
| requested | operation が要求された | scope / reason / requester を記録する |
| reviewing | 内容を確認中 | source / projection / 実物流 / risk を確認する |
| dry_run | dry-run / compare-only を実施中または実施済み | expected impact と diff を確認する |
| approved | execution が承認された | approval role / evidence / scope を固定する |
| scheduled | 実行予定として登録された | timing / window / affected scope を確認する |
| executing | execution 中 | request_id / trace_id / progress を追跡する |
| completed | execution と post-compare が完了 | result / after_summary / remaining diff を記録する |
| failed | execution または dry-run が失敗 | failure reason / retry 可否を判断する |
| cancelled | operation が取り消された | cancel reason / cancel actor を記録する |

注意:

- state は必ず一方向にしか進まないとは限らない
- failed から retry candidate へ進むことはある
- reviewing へ戻すことはある
- cancelled を勝手に approved / executing へ戻さない
- completed 後に追加差異が出た場合は、新しい operation として扱う

---

## ■ State ごとの考え方

### requested

requested は、recovery operation の入口である。

必要な情報候補:

- operation_type
- requested_by
- requested_at
- reason_code
- reason_text
- affected warehouse_code
- affected keys
- source evidence
- related trace_id
- parent_trace_id

方針:

- requested だけでは execution できない
- scope が曖昧な request は reviewing で止める
- warehouse_code が不明な request は high / critical risk として扱う

### reviewing

reviewing は、operation の妥当性を確認する段階である。

確認項目:

- source of truth 側の誤りか
- projection / read model 側の誤りか
- replay / rebuild / correction のどれが適切か
- warehouse boundary を越えないか
- dry-run が必要か
- approval role は誰か

方針:

- reviewing 中は source of truth を変更しない
- high / critical risk は domain owner review を検討する
- reviewing で no action / cancelled になることも許容する

### dry_run

dry_run は、read-only / compare-only で期待影響を確認する段階である。

対象:

- correction dry-run
- rebuild dry-run
- replay dry-run
- recovery compare

方針:

- dry_run は execution approval ではない
- dry_run request_id / trace_id は execution と分ける
- dry_run result が大きすぎる場合は scope を狭める
- dry_run failure は execution を止める signal として扱う

### approved

approved は、execution が承認された状態である。

必要な情報候補:

- approved_by
- approved_at
- approval_role
- approved_scope
- approved_risk_level
- approved_dry_run_id
- approval_reason
- evidence reference

方針:

- approved は executed を意味しない
- approval scope を超えた execution は禁止する
- dry-run から時間が経ちすぎた場合は re-review を検討する
- critical risk は domain owner approval を検討する

### scheduled

scheduled は、execution の時間・順序・運用影響を調整した状態である。

確認項目:

- execution window
- affected warehouse / operation time
- concurrent operation risk
- retry / failure handling
- post-compare plan

方針:

- scheduled 中に scope が変わった場合は reviewing へ戻す
- scheduled は execution lock ではない
- high impact operation は現場運用時間を避ける

### executing

executing は、operation が実行中の状態である。

必要な情報候補:

- execution_request_id
- execution_trace_id
- started_at
- executor
- progress
- current step
- affected keys

方針:

- executing 中の二重実行を避ける
- timeout / partial failure を failed として扱う候補にする
- execution scope を途中で広げない
- execution は approval scope 内に限定する

### completed

completed は、execution と post-compare / audit summary が完了した状態である。

必要な情報候補:

- finished_at
- after_summary
- resolved diff count
- remaining diff count
- newly introduced diff count
- post_compare_result
- final status reason

方針:

- completed は「プロセスが終わった」だけでなく、期待差分と影響範囲を説明できる状態とする
- remaining diff がある場合は新しい requested operation の候補にする
- completed operation を再実行する場合は別 operation として扱う

### failed

failed は、dry-run または execution が失敗した状態である。

必要な情報候補:

- failed_at
- failure_stage
- failure_reason
- error detail
- partial result
- retryable
- manual_review_required

方針:

- failed を silent retry しない
- retry する場合は retry operation / retry request_id を分ける
- partial success がある場合は post-failure compare を検討する
- failure reason が不明なまま execution を繰り返さない

### cancelled

cancelled は、operation が取り消された状態である。

必要な情報候補:

- cancelled_by
- cancelled_at
- cancel_reason
- previous state
- related review note

方針:

- cancelled を自動的に再開しない
- cancellation は audit 対象にする
- cancelled 後に再度必要になった場合は新しい requested operation とする

---

## ■ Dry-run Lifecycle の考え方

dry-run lifecycle は、execution 前の read-only / compare-only 確認に限定する。

流れ:

```text
requested
  -> reviewing
  -> dry_run
  -> reviewing
  -> approved or cancelled
```

dry-run の目的:

- expected impact を確認する
- affected scope を確認する
- before / expected diff を確認する
- approval の判断材料を作る
- operation type が妥当か再確認する

方針:

- dry-run は source of truth を変更しない
- dry-run は projection / read model を変更しない
- dry-run success は execution approval ではない
- dry-run の request_id / trace_id は execution と分ける
- dry-run 結果は observability / audit の対象にする

---

## ■ Execution Lifecycle の考え方

execution lifecycle は、approved operation を実際に実行し、post-compare まで確認する流れである。

流れ:

```text
approved
  -> scheduled
  -> executing
  -> completed or failed
```

execution 前提:

- approval scope が明確である
- dry-run / compare result が確認済みである
- affected warehouse_code が明確である
- operation type が correction / rebuild / replay のどれか明確である
- traceability に必要な ID を発行できる

execution 後:

- post-compare を行う
- before / after summary を残す
- remaining diff を確認する
- newly introduced diff を確認する
- snapshot / trend / observability に反映する将来余地を残す

方針:

- execution は approval scope 内で行う
- execution 中に scope を拡張しない
- execution failure は failed として扱い、retry 判断へ進める
- completed 後に追加対応が必要な場合は新しい operation とする

---

## ■ Approval State と Execution State の分離

approval state と execution state は分けて扱う。

分離する理由:

- approved は execution 済みを意味しない
- dry-run approval は execution approval ではない
- scheduled は approved だが未実行である
- executing は approval scope 内で進行中である
- completed は approval と execution の両方を後から説明できる必要がある

整理:

| 観点 | 例 |
| --- | --- |
| approval state | not_required, pending, approved, rejected, expired |
| execution state | requested, reviewing, dry_run, scheduled, executing, completed, failed, cancelled |

方針:

- approval_status と execution_status を同じ column / state として混ぜない
- approved_at と executed_at を分ける
- approved_by と executor を分ける
- approval scope と execution actual scope を比較できるようにする
- approval expired の概念を将来検討する

---

## ■ Retry / Retry Isolation の考え方

retry isolation は、失敗した operation の再試行を original execution と混同しないための原則である。

retry が必要になる例:

- timeout
- transient RPC failure
- external service failure
- lock / concurrency conflict
- partial execution
- replay downstream failure

原則:

- retry request_id は新しくする
- retry trace_id は元 execution trace と分けるか、retry attempt として識別する
- retry は original operation の silent continuation にしない
- failed reason と retry reason を記録する
- retry scope は approved scope を超えない
- retry 前に partial result / post-failure compare を確認する

retry state 候補:

- retry_requested
- retry_reviewing
- retry_approved
- retry_executing
- retry_completed
- retry_failed

初期方針:

- 本ドキュメントでは retry state を別実装しない
- retry は failed operation から派生する新しい requested operation として扱う案を優先する
- automatic retry は low risk / idempotent operation に限定する将来候補とし、現時点では急がない

---

## ■ Rollback / Compensation の考え方

rollback は、実行した変更を単純に巻き戻す考え方である。一方、compensation は、誤った業務事実を新しい補正履歴で打ち消す考え方である。

方針:

- commit 済み transaction / history を削除・上書きしない
- source of truth に影響する operation は rollback より compensation を優先する
- projection / read model の誤 rebuild は、source of truth から scoped rebuild / refresh で回復する
- replay の誤実行は original trace を上書きせず、replay trace と補正方針を分ける
- rollback という名前で transaction delete / silent overwrite を行わない

operation 別:

| Operation | 失敗時の考え方 |
| --- | --- |
| correction | 追加の compensation transaction / correction を検討する |
| rebuild | source of truth から再度 scoped rebuild / refresh を検討する |
| replay | replay trace を失敗または補正対象として扱い、original trace は残す |
| dry-run | source of truth を変更していないため rollback 不要 |

---

## ■ Observability / Auditability との関係

recovery lifecycle は observability / auditability の対象である。

観測したい項目:

- operation count by state
- operation count by type
- failed operation count
- cancelled operation count
- retry candidate count
- dry-run success / failure count
- execution success / failure count
- approval pending aging
- completed with remaining diff count
- high / critical operation count

audit で説明したいこと:

- 誰が request したか
- 誰が review したか
- 誰が approval したか
- どの dry-run / compare result を根拠にしたか
- どの request_id / trace_id で実行されたか
- before / after はどう変わったか
- 失敗・retry・cancel の理由は何か

方針:

- lifecycle state は observability dashboard の将来候補にする
- state transition は audit 可能にする
- automatic state transition は慎重に扱う
- lifecycle metrics は automatic correction / rebuild / replay の直接トリガーにしない

---

## ■ Correction / Rebuild / Replay の Lifecycle 差分

### Correction

correction は source of truth に補正履歴を追加し得るため、approval と audit を強くする。

特徴:

- reviewing で source of truth の誤りかを確認する
- dry-run では expected before / after を確認する
- approved には approver / domain owner が関与し得る
- completed 後も correction trace と original trace の関係を残す
- failed 時は compensation 方針を検討する

### Rebuild

rebuild は source of truth を変更せず、projection / read model を回復する。

特徴:

- dry-run で current projection と expected projection を比較する
- approval は scope / blast radius / before-after compare を重視する
- completed は post-compare で期待差分だけが反映されたことを確認する
- failed 時は projection の partial state を確認する

### Replay

replay は original input / operation を新しい実行として再処理する。

特徴:

- original trace と replay trace を分離する
- dry-run で expected transaction / projection impact を確認する
- approved では duplicate risk と downstream impact を確認する
- completed 後は original vs replay compare を残す
- failed / retry 時も original trace を変更しない

---

## ■ 導入段階案

### Step 0: Policy の明文化

本ドキュメントで recovery lifecycle の原則を整理する。

この段階では実装しない。

### Step 1: State Definition

候補:

- requested
- reviewing
- dry_run
- approved
- scheduled
- executing
- completed
- failed
- cancelled

方針:

- state 名称と意味を先に固定する
- approval state と execution state を分ける
- correction / rebuild / replay の差分を整理する

### Step 2: Checklist Operation

候補:

- requested checklist
- review checklist
- dry-run checklist
- approval checklist
- execution checklist
- completed checklist
- failed / retry checklist
- cancelled checklist

この段階では DB 変更しない。

### Step 3: Traceability Design

候補:

- operation_id
- operation_type
- operation_state
- approval_status
- request_id
- trace_id
- parent_trace_id
- dry_run_id
- original_trace_id
- retry_of_operation_id
- before / after summary

nullable / additive / no destructive change を前提に設計する。

### Step 4: Read-only Lifecycle Visibility

候補:

- operation list
- state counts
- pending approval aging
- failed operation list
- retry candidate list

UI を追加する場合も read-only visibility から始め、execution button は急がない。

### Step 5: Controlled Execution Integration

候補:

- approved correction execution
- approved scoped rebuild execution
- approved replay execution

実装する場合は、dry-run、approval、traceability、post-compare を必須候補にする。

### Step 6: Retry / Compensation Design

候補:

- retry policy
- retry attempt tracking
- compensation relation
- failed operation recovery checklist

automatic retry / automatic compensation は最後に検討する。

---

## ■ 今回は実装しない判断

Phase B10-05 では、policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- lifecycle 実装
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- operation table
- approval workflow
- retry mechanism
- scheduled job
- README変更

理由:

- まず lifecycle state と意味を固定する必要がある
- approval state と execution state の分離を実装前に明確にする必要がある
- retry / rollback / compensation の扱いを曖昧にしたまま実行機能を作ると auditability が弱くなる
- correction / rebuild / replay の lifecycle 差分を policy として整理してから実装すべきである
- 現時点では compare-only / observability first の延長として lifecycle を設計する段階である

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/request-chain-parent-trace-design.md`
- `docs/historical-observability-snapshot-design.md`
- `docs/controlled-correction-policy.md`
- `docs/scoped-rebuild-policy.md`
- `docs/replay-isolation-policy.md`
- `docs/approval-boundary-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

recovery operation lifecycle は、実行機能そのものではなく、safe execution と auditability のための状態管理方針である。

requested から completed / failed / cancelled までの状態を明確にし、dry-run と execution、approval state と execution state、original execution と retry を分離する。これにより、correction / rebuild / replay / recovery を source of truth protection と observability first の範囲内で段階的に扱えるようにする。
