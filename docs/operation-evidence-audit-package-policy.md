# Operation Evidence & Audit Package Policy（Phase B10-06）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、correction / rebuild / replay / recovery operation の根拠・比較結果・承認情報を、監査可能な evidence package として整理する policy を定義する。

inventory / pallet consistency の差異は、compare-only / observability first により見える化され、manual review、approval boundary、recovery lifecycle を経て、controlled correction / scoped rebuild / replay isolation へ進む可能性がある。このとき、なぜ operation が必要だったのか、何を比較したのか、誰が承認したのか、実行前後で何が変わったのかを、後から一つの説明単位として確認できる必要がある。

operation evidence & audit package は、個々の evidence をばらばらに扱うのではなく、operation の判断・承認・実行・事後確認を説明するための監査単位として束ねる考え方である。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・evidence・attachment・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

audit package は、operation の正当性と結果を説明するための evidence collection である。

基本方針:

- audit package は source of truth そのものではない
- audit package は operation governance / audit / review の補助記録である
- source of truth は引き続き transaction / history table とする
- compare-only / dry-run / approval / execution / post-compare の evidence を分ける
- evidence は operation type、scope、risk、warehouse_code と関連付ける
- reason_code / reason_text と客観的 evidence を両方扱う
- screenshot / attachment は補助 evidence であり、transaction の代替にしない
- warehouse boundary evidence を必ず意識する
- evidence package だけを根拠に automatic correction / rebuild / replay を実行しない

---

## ■ Audit Package の目的

audit package の目的は、operation の判断と実行を後から説明できる状態にすることである。

説明したい問い:

- なぜ operation が requested されたか
- 差異は何だったか
- source of truth 側の問題か projection / read model 側の問題か
- dry-run では何が期待されたか
- 誰が review / approval したか
- approval scope と execution scope は一致しているか
- execution 前後で何が変わったか
- warehouse boundary を守っているか
- remaining diff / newly introduced diff はあるか
- retry / failed / cancelled の理由は何か

audit package が必要な理由:

- correction / rebuild / replay は業務影響がある
- evidence が散らばると判断根拠を再現できない
- approval だけでは実行結果を説明できない
- execution result だけでは承認根拠を説明できない
- observability metrics だけでは個別 operation の正当性を説明できない

---

## ■ Evidence の種類

### Compare Summary

compare summary は、差異の要約である。

含めたい情報:

- compare target
- compared_at
- warehouse_code
- affected keys
- difference count
- severity count
- reason_codes
- review_required count
- high / critical count

方針:

- compare summary は operation requested / reviewing の入口として扱う
- compare summary は correction / rebuild / replay の自動実行トリガーにしない
- compare 条件や query version を将来説明できる余地を残す

### Before / After Summary

before / after summary は、execution 前後の状態差分を説明する evidence である。

before:

- current state
- expected state
- diff list summary
- affected keys
- approval scope

after:

- actual state after execution
- remaining diff
- resolved diff count
- newly introduced diff count
- scope violation check

方針:

- completed は before / after summary と一緒に説明する
- expected diff だけが反映されたか確認する
- scope 外の変化は audit risk として扱う

### Dry-run Result

dry-run result は、execution 前に expected impact を確認した evidence である。

含めたい情報:

- dry_run_id
- dry_run_request_id
- dry_run_trace_id
- operation_type
- operation_scope
- expected impact
- affected row count
- risk level
- manual_review_required
- suggested action

方針:

- dry-run result は execution approval の材料である
- dry-run success は execution approval ではない
- dry-run result と execution result は分けて保存・参照できる設計を検討する

### Trace Timeline

trace timeline は、operation に関連する business operation / API execution / source history を時系列で説明する evidence である。

含めたい情報:

- original_trace_id
- operation_trace_id
- replay_trace_id
- request_id
- parent_trace_id
- event source
- event type
- created_at
- warehouse_code

方針:

- correction では original trace と correction trace の関係を説明する
- rebuild では rebuild operation trace と対象 source history の関係を説明する
- replay では original trace と replay trace の分離を説明する
- trace timeline は read-only evidence として扱う

### Hotspot / Trend Snapshot

hotspot / trend snapshot は、operation が単発か recurring issue かを説明する observability evidence である。

含めたい情報:

- hotspot dimension
  - location_code
  - project_no
  - part_no
- hotspot rank
- backlog trend
- critical trend
- unresolved aging trend
- consistency health
- snapshot date

方針:

- hotspot / trend は operation priority の判断材料にする
- hotspot / trend は automatic execution の直接トリガーにしない
- recurring hotspot は scoped rebuild / manual review の候補として扱う

### Reason Code / Reason Text

reason_code / reason_text は、人間の判断理由を説明する evidence である。

reason_code 候補:

- projection_drift
- stale_read_model
- operator_input_error
- location_mismatch
- quantity_mismatch
- project_mismatch
- partial_move
- migration_residue
- external_input_error
- replay_verification
- unknown

方針:

- reason_code は集計・検索しやすい分類として扱う
- reason_text は個別事情を説明する補助情報として扱う
- reason_text だけに依存しない
- unknown は許容するが、high / critical operation では追加 review を検討する

### Screenshot / Attachment Reference

screenshot / attachment reference は、現場確認や外部資料を補助する evidence である。

例:

- 現場写真
- 棚札写真
- OCR original document
- EDI file reference
- operator memo
- approval note
- external ticket / incident reference

方針:

- attachment の実体保存は本 phase では実装しない
- reference は file path / object key / ticket URL などの候補として扱う
- attachment は source of truth の代替にしない
- sensitive information / customer data の扱いは別途設計する

### Warehouse Boundary Evidence

warehouse boundary evidence は、operation が正しい warehouse_code の範囲に閉じていることを説明する evidence である。

含めたい情報:

- requested warehouse_code
- approved warehouse_code
- execution affected warehouse_code
- source rows warehouse_code
- projection rows warehouse_code
- trace timeline warehouse_code
- cross-warehouse risk flag

方針:

- warehouse_code が不明な evidence package は execution に進めない候補とする
- cross-warehouse risk は critical risk として扱う
- cross-warehouse operation は原則禁止または domain owner 特別承認とする
- warehouse boundary evidence は correction / rebuild / replay すべてで必須候補とする

---

## ■ Operation Type ごとの差分

### Correction

correction は source of truth に補正履歴を追加し得るため、最も強い evidence が必要である。

必要 evidence 候補:

- original transaction / trace
- correction reason_code / reason_text
- before / expected after state
- operator / reviewer / approver
- evidence / attachment reference
- approval evidence
- correction_trace_id
- post-correction compare
- compensation relation if any

注意:

- correction は transaction delete / silent overwrite ではない
- projection drift を correction で隠してはいけない
- correction trace と original trace の関係を説明する

### Rebuild

rebuild は source of truth を変更せず、projection / read model を再構築・再計算する operation である。

必要 evidence 候補:

- rebuild target
- rebuild scope
- source of truth range
- dry-run result
- before compare
- after compare
- affected row count
- blast radius
- scope violation check
- rebuild_trace_id

注意:

- rebuild は correction の代替ではない
- source of truth が誤っている場合は rebuild ではなく correction を検討する
- full rebuild は最後の手段であり、強い evidence と approval が必要である

### Replay

replay は original input / workflow step を新しい execution として再処理する operation である。

必要 evidence 候補:

- original_trace_id
- replay_trace_id
- source input reference
- replay dry-run result
- original vs replay compare
- duplicate risk
- downstream impact
- approval evidence
- replay request_id
- post-replay trace timeline

注意:

- original trace と replay trace を混同しない
- replay result で original transaction を上書きしない
- replay は correction / rebuild の代替ではない

---

## ■ Approval Evidence の考え方

approval evidence は、誰が何を根拠に execution を許可したかを説明する evidence である。

含めたい情報:

- approval_status
- approval_role
- approved_by
- approved_at
- approval_scope
- risk_level
- reason_code
- reason_text
- dry_run_id
- compare_summary
- evidence reference
- domain_owner approval if required

方針:

- approval state と execution state を分ける
- dry-run approval と execution approval を分ける
- approval scope と execution actual scope を比較できるようにする
- high / critical operation は stronger approval evidence を必要とする
- approval evidence がない execution は audit risk として扱う

---

## ■ Execution Evidence の考え方

execution evidence は、何が実行され、どの request / trace で実行されたかを説明する evidence である。

含めたい情報:

- operation_id
- operation_type
- execution_status
- executor
- execution_request_id
- execution_trace_id
- parent_trace_id
- started_at
- finished_at
- affected warehouse_code
- affected keys
- actual scope
- execution result
- failure reason if any

方針:

- execution は approval scope 内で行う
- execution request_id / trace_id は dry-run と分ける
- failed / retry / cancelled は理由を evidence package に含める
- execution evidence は post-compare evidence とセットで見る

---

## ■ Post-compare Evidence の考え方

post-compare evidence は、operation 後に期待した結果になったかを確認する evidence である。

含めたい情報:

- post_compare_id
- compared_at
- expected after state
- actual after state
- resolved diff count
- remaining diff count
- newly introduced diff count
- severity after execution
- scope violation
- next action candidate

方針:

- completed は post-compare evidence と一緒に判断する
- remaining diff は新しい requested operation の候補にする
- newly introduced diff は failed / partial success / follow-up review の候補にする
- post-compare evidence は observability / historical snapshot と接続する将来余地を残す

---

## ■ Observability / Auditability との関係

observability は、今何が起きているか、どこに risk があるかを見える化する。auditability は、過去の判断・承認・実行・結果を後から説明できるようにする。

関係:

- observability dashboard は差異・backlog・critical・hotspot・trend を示す
- audit package は個別 operation の判断根拠と結果を束ねる
- historical snapshot は運用品質の推移を示す
- lifecycle state は operation の現在位置と履歴を示す
- approval boundary は execution に進む条件を示す

方針:

- observability metrics は audit package の context として利用する
- audit package は observability metrics の代替ではない
- audit package は source of truth の代替ではない
- metrics worsening だけで automatic operation を実行しない
- operation 完了後も observability により効果を確認する

---

## ■ Retention / Reference の考え方

retention / reference は、evidence をどれだけ、どこに、どの粒度で残すかの考え方である。

初期方針:

- 本 phase では保存実装を行わない
- まず evidence package に含めるべき情報を整理する
- 将来は aggregate summary と detail reference を分ける
- attachment 実体と attachment reference を分ける
- sensitive / customer / billing data の retention は別途設計する

保存候補:

- operation summary
- compare summary
- dry-run summary
- approval summary
- execution summary
- post-compare summary
- external attachment reference

reference 候補:

- trace_id
- request_id
- parent_trace_id
- original_trace_id
- replay_trace_id
- dry_run_id
- operation_id
- snapshot date
- attachment object key
- external ticket ID

方針:

- full raw data を常に audit package に複製しない
- source table / trace / snapshot への reference を優先する
- audit package の中に何を materialize するかは将来設計する
- no destructive change / nullable / additive を前提にする

---

## ■ 導入段階案

### Step 0: Policy の明文化

本ドキュメントで audit package の原則を整理する。

この段階では実装しない。

### Step 1: Evidence Checklist

候補:

- compare summary
- before / after summary
- dry-run result
- trace timeline
- hotspot / trend snapshot
- reason_code / reason_text
- screenshot / attachment reference
- warehouse boundary evidence

まず Markdown / checklist として運用確認する。

### Step 2: Operation Type Mapping

対象:

- correction
- rebuild
- replay

方針:

- operation type ごとに必須 evidence と optional evidence を分ける
- high / critical risk operation の必須 evidence を強くする
- warehouse boundary evidence は共通必須候補とする

### Step 3: Approval / Execution / Post-compare Mapping

候補:

- approval evidence
- execution evidence
- post-compare evidence
- failed / retry / cancelled evidence

approval state と execution state を分けて扱う。

### Step 4: Reference Design

候補:

- operation_id
- dry_run_id
- request_id
- trace_id
- parent_trace_id
- original_trace_id
- replay_trace_id
- snapshot date
- attachment reference

nullable / additive / no destructive change を前提に設計する。

### Step 5: Read-only Evidence Visibility

候補:

- operation evidence summary
- approval evidence
- dry-run evidence
- post-compare evidence
- related trace timeline
- attachment reference list

UI を追加する場合も read-only visibility から始め、operation execution とは分離する。

### Step 6: Retention / Security Design

候補:

- retention period
- attachment storage boundary
- sensitive data handling
- warehouse_code access control
- customer / billing data handling

この段階で初めて保存方式を検討する。

---

## ■ 今回は実装しない判断

Phase B10-06 では、policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- evidence 実装
- attachment 実装
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- audit package table
- file storage integration
- README変更

理由:

- まず audit package の概念と evidence 種類を固定する必要がある
- evidence 保存方式を先に作ると、不要な raw data や sensitive data を残す危険がある
- observability と auditability の責務を分けてから実装すべきである
- attachment / screenshot は security / retention / access control の設計が必要である
- correction / rebuild / replay の execution 実装より先に、監査可能な根拠の形を整理する必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

operation evidence & audit package は、operation を正当化するための後付け資料ではない。

compare-only / dry-run / approval / execution / post-compare の各段階で、何を根拠に判断し、何が実行され、何が変わったかを説明するための evidence collection である。observability が運用品質の現在地と傾向を示すのに対し、audit package は個別 operation の判断と結果を監査可能にする。
