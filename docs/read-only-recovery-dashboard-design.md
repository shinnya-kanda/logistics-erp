# Read-only Recovery Dashboard Design（Phase B11-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、correction / rebuild / replay / incident / approval / lifecycle を、安全な read-only governance UI として可視化する dashboard design を整理する。

これまでの Phase では、inventory / pallet consistency の差異を compare-only で可視化し、observability、historical snapshot、controlled correction、scoped rebuild、replay isolation、approval boundary、recovery operation lifecycle、operation evidence & audit package、recovery incident management を policy として整理してきた。

Phase B11-01 では、これらの governance 情報を Admin Dashboard などで将来 read-only に確認するための設計を整理する。目的は execution を実行する UI を作ることではなく、recovery candidate、approval pending、failed operation、retry candidate、incident、evidence、timeline を安全に見える化し、判断・監査・改善に使える状態を作ることである。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

read-only recovery dashboard は、recovery operation を実行する画面ではない。

基本方針:

- dashboard は governance / visibility / audit のための read-only UI とする
- correction / rebuild / replay の execution button は置かない
- approval button も初期段階では置かない
- operation lifecycle state を見える化する
- approval state と execution state を分けて表示する
- incident と operation を分けて表示する
- evidence package は summary / reference として表示する
- observability dashboard とは役割を分ける
- execution に進む判断は別 policy / approval / operation lifecycle の対象とする
- dashboard の表示結果だけで automatic correction / rebuild / replay を行わない

---

## ■ Recovery Dashboard の目的

recovery dashboard の目的は、recovery governance の現在地を一画面または複数 view で説明できるようにすることである。

見たい問い:

- 今どの recovery candidate が queue にあるか
- どの operation が approval 待ちか
- どの operation が failed しているか
- retry candidate はあるか
- high / critical incident は何か
- incident と operation はどう関連しているか
- evidence package は揃っているか
- approval state と execution state は一致しているか
- operation timeline はどこで止まっているか
- post-compare が完了しているか

dashboard の利用目的:

- manual review の優先順位付け
- approval / execution 分離の確認
- failed / retry candidate の把握
- incident management の可視化
- evidence / audit readiness の確認
- observability dashboard から recovery governance への橋渡し

---

## ■ Read-only Governance UI の考え方

read-only governance UI は、operation を実行せず、判断材料と状態を表示する UI である。

表示対象:

- recovery operation queue
- pending approval
- failed operation
- retry candidate
- incident summary
- evidence summary
- operation timeline
- approval / execution state
- risk level
- warehouse boundary / cross-warehouse risk

やらないこと:

- correction execution
- rebuild execution
- replay execution
- approval execution
- automatic retry
- automatic incident resolution
- projection / read model update
- source of truth update

方針:

- 表示は read-only として明示する
- operation 実行は separate controlled flow として扱う
- UI 上の state 表示は source of truth の代替にしない
- execution につながる操作は future phase とし、最初は置かない

---

## ■ Recovery Queue View の考え方

recovery queue view は、requested / reviewing / dry_run / approved / scheduled など、execution 前または governance 中の operation を一覧する view である。

表示候補:

- operation_id
- operation_type
  - correction
  - rebuild
  - replay
  - investigation
- operation_state
- approval_status
- risk_level
- incident_id
- affected warehouse_code
- affected keys
- requested_by
- requested_at
- latest evidence status
- next action candidate

見たい問い:

- どの recovery candidate が滞留しているか
- reviewing で止まっているものは何か
- dry-run 待ち / dry-run 済みは何か
- approval 済みだが scheduled されていないものは何か
- high / critical risk が queue に残っていないか

方針:

- queue view から execution しない
- next action は suggestion として表示し、自動実行しない
- operation_state と approval_status を分けて表示する
- warehouse_code / risk_level で filter できる将来余地を残す

---

## ■ Pending Approval View の考え方

pending approval view は、approval が必要だが未承認の operation を確認する view である。

表示候補:

- operation_id
- incident_id
- operation_type
- approval_status
- required_approval_role
- risk_level
- approval_requested_at
- approval_pending_age
- dry_run_id
- compare_summary
- evidence_package_status
- affected warehouse_code
- cross-warehouse risk flag

見たい問い:

- 誰の承認待ちか
- dry-run / compare は揃っているか
- high / critical が長く pending になっていないか
- approval scope は明確か
- cross-warehouse risk があるか

方針:

- approval button は初期段階では置かない
- pending approval は read-only status として表示する
- dry-run approval と execution approval を分けて表示する
- approval がない execution を audit risk として見える化する将来余地を残す

---

## ■ Failed Operation View の考え方

failed operation view は、dry-run / execution / post-compare が失敗した operation を一覧する view である。

表示候補:

- operation_id
- incident_id
- operation_type
- failed_state
- failure_stage
- failure_reason
- failed_at
- retryable
- partial_result
- affected warehouse_code
- execution_request_id
- execution_trace_id
- related evidence package

見たい問い:

- どこで失敗したか
- retry 可能か
- partial success があるか
- post-failure compare が必要か
- failed operation が incident resolution を妨げているか

方針:

- failed view から automatic retry しない
- retry candidate は別 view / 別判断にする
- failure reason が不明なものを放置しない
- failed operation は incident timeline と関連付ける

---

## ■ Retry Candidate View の考え方

retry candidate view は、failed operation のうち、再試行候補になり得るものを確認する view である。

表示候補:

- original_operation_id
- retry_candidate_reason
- retry_risk_level
- retry_scope
- failed_reason
- partial_result
- post-failure compare status
- approval_required
- affected warehouse_code
- retry isolation note

見たい問い:

- retry すべきか、new operation として扱うべきか
- original execution と retry を分離できるか
- retry scope は approval scope を超えないか
- retry 前に manual review が必要か

方針:

- retry button は置かない
- retry は failed operation から派生する新しい requested operation として扱う案を優先する
- retry request_id / trace_id は original execution と分ける
- automatic retry は最後に検討する

---

## ■ Incident Summary View の考え方

incident summary view は、open / investigating / mitigated / resolved などの incident 状況を一覧する view である。

表示候補:

- incident_id
- incident_title
- severity
- incident_status
- owner
- domain_owner
- affected warehouse_code
- affected keys
- related operation count
- open operation count
- failed operation count
- evidence completeness
- recurring hotspot flag
- opened_at
- latest_activity_at

見たい問い:

- high / critical incident は何か
- owner がいない incident はないか
- operation completed だが incident unresolved のものは何か
- recurring hotspot に紐づく incident は何か
- retrospective が必要な incident は何か

方針:

- incident summary から resolution 実行しない
- operation completed と incident resolved を混同しない
- severity / ownership / escalation を見える化する
- recurring incident は retrospective candidate として扱う

---

## ■ Evidence Summary View の考え方

evidence summary view は、operation / incident に必要な evidence package の揃い具合を確認する view である。

表示候補:

- evidence_package_id
- operation_id
- incident_id
- compare summary status
- dry-run result status
- approval evidence status
- execution evidence status
- post-compare evidence status
- trace timeline reference
- hotspot / trend snapshot reference
- warehouse boundary evidence status
- attachment reference count

見たい問い:

- execution に必要な evidence が揃っているか
- approval evidence はあるか
- post-compare evidence が欠けていないか
- warehouse boundary evidence は確認済みか
- screenshot / attachment は補助 evidence として参照されているか

方針:

- evidence summary は audit readiness を示す
- evidence 不足を automatic execution blocking として実装するのは将来検討とする
- evidence package は source of truth の代替ではない
- raw data を dashboard に過剰表示しない

---

## ■ Operation Timeline View の考え方

operation timeline view は、operation の lifecycle state と関連 trace / approval / evidence を時系列で表示する view である。

表示候補:

- requested
- reviewing
- dry_run
- approved
- scheduled
- executing
- completed
- failed
- cancelled
- retry candidate
- evidence attached
- post-compare completed

関連 ID:

- operation_id
- incident_id
- request_id
- trace_id
- parent_trace_id
- original_trace_id
- replay_trace_id
- dry_run_id
- evidence_package_id

見たい問い:

- operation はどこで止まっているか
- approval と execution の順序は正しいか
- dry-run と execution の ID は分離されているか
- failed / cancelled の理由は何か
- post-compare は完了しているか

方針:

- timeline は read-only / audit-oriented とする
- timeline から operation を実行しない
- state transition の欠落は audit risk として表示する将来余地を残す
- trace timeline と operation timeline は混同しない

---

## ■ Observability Dashboard との役割分離

observability dashboard と recovery dashboard は役割が異なる。

| Dashboard | 主目的 | 主な問い |
| --- | --- | --- |
| Compare dashboard | 現在の差異を見える化する | どこに差異があるか |
| Observability dashboard | 運用品質 risk を要約する | backlog / critical / aging / hotspot はどうか |
| Trend / snapshot dashboard | 時間経過の傾向を示す | 改善しているか悪化しているか |
| Recovery dashboard | recovery governance 状態を示す | operation / approval / incident / evidence はどう進んでいるか |

方針:

- observability dashboard は incident / operation candidate を見つける
- recovery dashboard は candidate の governance 状態を追う
- recovery dashboard は correction / rebuild / replay を直接実行しない
- observability metrics は approval / incident priority の context として表示する

---

## ■ Execution Button を急がない理由

read-only recovery dashboard に execution button を急いで置かない。

理由:

- correction / rebuild / replay は source of truth / projection / workflow に影響し得る
- approval state と execution state を完全に分ける必要がある
- dry-run / compare / evidence / approval / lifecycle が先に必要である
- execution button があると compare-only / visibility first の境界が曖昧になる
- operator が意図せず high / critical operation を実行する risk がある
- cross-warehouse risk や blast radius を UI だけで十分に制御する設計が未確定である
- execution 後の post-compare / audit package / incident resolution が未整備だと監査性が弱い

方針:

- 初期 dashboard は read-only に限定する
- execution は別 phase の controlled execution design とする
- execution button を追加する場合は approval boundary / lifecycle / evidence package / warehouse boundary の実装後に検討する
- automatic execution はさらに後の段階とする

---

## ■ Approval / Execution 分離との関係

recovery dashboard は、approval state と execution state の分離を UI 上で明確にする。

表示方針:

- approval_status と operation_state を別 column / badge として表示する
- approved だが scheduled されていない operation を識別する
- scheduled / executing / completed / failed / cancelled を execution lifecycle として表示する
- dry-run approval と execution approval を分ける
- approval scope と actual execution scope の差分を将来表示できる余地を残す

禁止:

- approved を completed と同じ意味で表示する
- dry-run completed を execution ready と短絡表示する
- execution failure を approval failure と混同する
- approval missing の operation を通常完了扱いする

---

## ■ Incident Management との関係

recovery dashboard は incident management の read-only visibility を提供する。

関係:

- incident summary view は incident owner / severity / status を表示する
- recovery queue は incident に紐づく operation を表示する
- failed / retry view は incident resolution を妨げる operation を表示する
- evidence summary は incident audit readiness を補助する
- operation timeline は incident timeline の一部として参照できる

方針:

- operation completed は incident resolved を意味しない
- incident resolved は root cause / remaining risk / post-compare / retrospective を確認して判断する
- recurring hotspot / recurring incident は dashboard で見える化する将来余地を残す
- incident resolution button は初期には置かない

---

## ■ 導入段階案

### Step 0: Design の明文化

本ドキュメントで read-only recovery dashboard の目的と view を整理する。

この段階では実装しない。

### Step 1: View Model の整理

候補:

- recovery queue view
- pending approval view
- failed operation view
- retry candidate view
- incident summary view
- evidence summary view
- operation timeline view

まず Markdown / checklist として表示項目を確認する。

### Step 2: Source / Reference Mapping

候補:

- operation_id
- incident_id
- evidence_package_id
- request_id
- trace_id
- parent_trace_id
- original_trace_id
- replay_trace_id
- dry_run_id
- snapshot date

この段階では DB 変更しない。

### Step 3: Read-only Mock / UX Design

候補:

- tab layout
- filter / sort
- risk badge
- lifecycle badge
- approval badge
- evidence completeness indicator
- cross-warehouse risk marker

UI 実装する場合も read-only に限定する。

### Step 4: Data Contract Design

候補:

- lifecycle summary contract
- approval summary contract
- incident summary contract
- evidence summary contract
- operation timeline contract

Edge Function / RPC 実装は別 phase とする。

### Step 5: Read-only Implementation Candidate

候補:

- static / mock based UI
- read-only API
- no execution button
- no approval mutation
- no correction / rebuild / replay mutation

実装する場合も existing implementation を壊さず、additive に行う。

### Step 6: Controlled Execution Future Review

execution button は最後に検討する。

確認:

- approval boundary は実装済みか
- lifecycle state は実装済みか
- evidence package は実装済みか
- post-compare は実装済みか
- warehouse boundary は強制できるか
- audit log は残るか
- incident resolution と分離できるか

---

## ■ 今回は実装しない判断

Phase B11-01 では、design ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- recovery dashboard component
- dashboard API
- README変更

理由:

- まず read-only governance UI の目的と役割を固定する必要がある
- execution button を先に置くと compare-only / visibility first の境界が崩れる
- approval / execution 分離、lifecycle、evidence package、incident management が実装される前に mutation UI を作ると監査性が弱い
- observability dashboard と recovery dashboard の責務を分けてから実装すべきである
- recovery dashboard は execution ではなく governance visibility から始めるべきである

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
- `docs/recovery-operation-lifecycle-policy.md`
- `docs/operation-evidence-audit-package-policy.md`
- `docs/recovery-incident-management-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

read-only recovery dashboard は、operation を実行するための画面ではなく、recovery governance を見える化するための設計である。

observability dashboard が差異・backlog・hotspot・trend を示すのに対し、recovery dashboard は queue、approval、failed / retry、incident、evidence、timeline を示す。execution button は、approval boundary、lifecycle、evidence package、warehouse boundary、post-compare が整ってから検討する。
