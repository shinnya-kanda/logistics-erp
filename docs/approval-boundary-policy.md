# Approval Boundary Policy（Phase B10-04）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、correction / rebuild / replay / recovery operation を、安全な権限・承認境界の中で扱うための policy を整理する。

inventory / pallet consistency の差異は、compare-only / observability first により可視化される。その後、manual review、controlled correction、scoped rebuild、replay isolation へ進む場合、誰が確認し、誰が承認し、どの範囲まで実行できるかを明確にしないと、source of truth protection、warehouse boundary、traceability、auditability が弱くなる。

Phase B10-04 では、approval boundary の目的、役割、warehouse boundary、cross-warehouse risk、operation 種別ごとの approval、dry-run と execution approval の分離、high / critical risk operation、observability / audit との関係を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・approval・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

approval boundary は、危険な recovery operation を止めるためだけの仕組みではない。

目的は、誰が、何を根拠に、どの範囲の operation を許可したかを後から説明できるようにすることである。

基本方針:

- dry-run と execution の approval を分ける
- low / medium / high / critical risk を分ける
- warehouse_code boundary を最重要境界として扱う
- cross-warehouse operation は critical risk として扱う
- source of truth を変更し得る operation は強い approval を必要とする
- projection / read model の rebuild でも scope と影響範囲を承認対象にする
- replay は original trace と replay trace の分離を確認してから execution する
- approval は traceability / auditability と一体で扱う
- observability metrics は approval 判断材料であり、自動承認の根拠ではない

---

## ■ Approval Boundary の目的

approval boundary の目的は、recovery operation の安全性と説明可能性を保つことである。

目的:

- source of truth を誤って壊さない
- projection / read model の広範囲な誤更新を防ぐ
- replay による duplicate / double processing を防ぐ
- warehouse boundary を越える誤操作を防ぐ
- correction / rebuild / replay の責務を混同しない
- 実物流・出庫・請求・監査への影響を確認する
- 実行前後の traceability を確保する

approval boundary がない場合の risk:

- operator が意図せず source of truth を変更する
- stale projection を直すつもりで誤った correction を行う
- replay が original operation と混同される
- cross-warehouse operation が見逃される
- 誰が承認したか説明できない
- audit 時に recovery の根拠を説明できない

---

## ■ 役割整理

### Operator

operator は、差異を発見し、一次確認や dry-run request を行う役割である。

主な責務:

- compare dashboard / observability dashboard を確認する
- difference reason / severity / aging を確認する
- manual review checklist を埋める
- dry-run を依頼または実行候補にする
- 実物流・現場状況を確認する

operator が単独で行ってよい候補:

- read-only investigation
- compare-only 確認
- low risk dry-run request
- evidence collection

operator が単独で行わないもの:

- source of truth correction
- high / critical rebuild execution
- transaction generating replay
- cross-warehouse operation

### Reviewer

reviewer は、operator の確認内容と dry-run / compare result を検証する役割である。

主な責務:

- 差異原因の分類を確認する
- source / projection / 実物流の切り分けを確認する
- rebuild / correction / replay / no action の妥当性を確認する
- medium risk operation の承認候補を判断する

reviewer が承認できる候補:

- medium risk dry-run
- projection impact compare
- scoped rebuild dry-run
- manual review status の確認

### Approver

approver は、source of truth や業務影響を伴う operation の実行可否を承認する役割である。

主な責務:

- high risk correction / rebuild / replay execution を承認する
- before / after compare と affected scope を確認する
- reason_code / reason_text / evidence を確認する
- execution traceability が残ることを確認する

approver が承認する候補:

- correction execution
- scoped rebuild execution
- transaction generating replay
- high risk recovery operation

### Domain Owner

domain owner は、業務 domain 横断または critical risk を伴う operation を判断する役割である。

主な責務:

- inventory / pallet / shipment / billing など domain 影響を判断する
- cross-domain workflow replay を承認する
- cross-warehouse risk を判断する
- operation mode / customer-specific rule を確認する
- automatic operation candidate の可否を判断する

domain owner が関与すべき候補:

- cross-warehouse operation
- cross-domain replay
- shipment / billing impact
- warehouse boundary violation candidate
- critical severity correction

---

## ■ Warehouse Boundary の考え方

warehouse_code は、approval boundary の最重要境界である。

方針:

- operation は原則として single warehouse_code に閉じる
- warehouse_code は dry-run / execution / compare / audit のすべてで記録対象にする
- warehouse_code が不明な operation は execution しない
- warehouse_code mismatch は high / critical risk として扱う
- warehouse boundary を越える recovery は原則禁止または特別承認とする

warehouse boundary を確認する対象:

- correction target
- rebuild scope
- replay source input
- replay output candidate
- related trace / parent trace
- affected projection rows
- before / after compare

---

## ■ Cross-warehouse Risk の考え方

cross-warehouse risk は、複数倉庫にまたがる operation または warehouse_code 境界が曖昧な operation の risk である。

critical として扱う理由:

- 倉庫ごとの権限・責任・現場状態が異なる
- pallet / inventory の実物流が別 warehouse に存在する可能性がある
- projection rebuild の影響が広範囲になる
- replay が別 warehouse の transaction を作る危険がある
- 請求・出荷・棚卸の境界が崩れる
- audit 時に責任範囲を説明しにくくなる

cross-warehouse operation 候補:

- 複数 warehouse_code を対象にした rebuild
- original trace と replay output の warehouse_code が異なる replay
- correction 対象と related trace の warehouse_code が異なる correction
- parent_trace_id 配下に複数 warehouse の child trace がある recovery
- warehouse_code が NULL / unknown の履歴を含む operation

方針:

- cross-warehouse は原則 execution しない
- 必要な場合は domain owner approval を必須候補にする
- dry-run / compare を先に行い、affected warehouse を明示する
- operation を warehouse_code ごとに分割できないか検討する
- automatic correction / rebuild / replay の対象外にする

---

## ■ Correction Approval の考え方

correction は source of truth 上の業務事実を補正 transaction / event として扱う可能性があるため、強い approval boundary が必要である。

approval が必要な理由:

- source of truth に新しい補正履歴を追加し得る
- 実物流・出庫・請求・棚卸に影響する
- correction reason / evidence / approver を残す必要がある
- correction と projection-only fix を混同してはいけない

approval 対象:

- correction type
- affected warehouse_code
- affected part_no / pallet_code / project_no
- original_trace_id
- correction_trace_id candidate
- reason_code / reason_text
- before / after expected state
- evidence
- manual review result

方針:

- correction execution は approver approval を必須候補にする
- critical correction は domain owner approval を検討する
- projection drift を correction で隠さない
- correction 後も compare / trace / snapshot で効果を確認する

---

## ■ Rebuild Approval の考え方

rebuild は source of truth を変更しないが、projection / read model を変える可能性があるため approval が必要である。

approval が必要な理由:

- projection の広範囲変更が UI / operation に影響する
- rebuild logic の bug が派生状態を壊す可能性がある
- scope が大きいほど blast radius が大きい
- before / after compare により期待差分だけか確認する必要がある

approval 対象:

- rebuild target
- rebuild scope
- affected warehouse_code
- affected row count
- dry-run result
- before compare
- expected after state
- blast radius
- scope violation check

方針:

- low risk dry-run は operator / reviewer で扱える候補にする
- scoped rebuild execution は approver approval を必須候補にする
- full rebuild は最後の手段であり、domain owner approval を検討する
- cross-warehouse rebuild は原則禁止または特別承認とする

---

## ■ Replay Approval の考え方

replay は新しい transaction / event を追加し得るため、original operation と replay operation の分離を確認した上で approval する。

approval が必要な理由:

- duplicate / double processing の危険がある
- replay trace が original trace と混同される risk がある
- shipment / billing / inventory に downstream impact がある
- original input / workflow step の再利用可否を確認する必要がある

approval 対象:

- original_trace_id
- replay_trace_id candidate
- request_id
- parent_trace_id / related trace
- source input reference
- replay dry-run result
- replay compare result
- duplicate risk
- affected warehouse_code
- downstream impact

方針:

- replay dry-run と replay execution の approval を分ける
- transaction generating replay は approver approval を必須候補にする
- cross-domain workflow replay は domain owner approval を検討する
- cross-warehouse replay は原則禁止または特別承認とする
- original trace_id / request_id を再利用しないことを approval 前に確認する

---

## ■ Dry-run と Execution Approval の分離

dry-run approval と execution approval は分ける。

理由:

- dry-run は read-only / compare-only であり、source of truth を変更しない
- execution は transaction / projection / read model に影響し得る
- dry-run result を見てから execution scope を狭める必要がある
- dry-run が成功しても execution が安全とは限らない

方針:

| Operation | Dry-run / compare approval | Execution approval |
| --- | --- | --- |
| correction | reviewer review | approver / domain owner |
| scoped rebuild | reviewer review | approver |
| full rebuild | approver review | domain owner |
| replay | reviewer review | approver / domain owner |
| cross-warehouse operation | domain owner review | 原則禁止または特別承認 |

禁止:

- dry-run approval を execution approval とみなす
- compare result だけで automatic execution する
- execution 後の post-compare を省略する

---

## ■ High Risk / Critical Risk Operation

operation risk は、source of truth 変更可能性、warehouse boundary、blast radius、業務影響で判断する。

### High Risk

high risk 候補:

- source of truth correction
- transaction generating replay
- scoped rebuild execution with large affected row count
- shipment / billing impact がある recovery
- unresolved aging が長い critical diff の correction
- production workflow に影響する replay

方針:

- approver approval を必須候補にする
- dry-run / compare / evidence を確認する
- execution traceability を必須候補にする
- post-compare を行う

### Critical Risk

critical risk 候補:

- cross-warehouse operation
- warehouse_code mismatch を含む correction
- full rebuild
- original trace と replay output の warehouse_code が異なる replay
- billing confirmed data に影響する operation
- source of truth を広範囲に補正する operation

方針:

- 原則禁止または domain owner 特別承認とする
- automatic execution の対象外にする
- operation を分割・縮小できないか検討する
- evidence / reason / trace relation / approval を必須候補にする

---

## ■ Observability First との関係

approval boundary は observability first の後に来る。

関係:

- compare dashboard が差異を見える化する
- observability dashboard が backlog / critical / aging / hotspot を要約する
- historical snapshot が trend / recurrence を説明する
- controlled correction / scoped rebuild / replay isolation が recovery candidate を整理する
- approval boundary が execution に進む条件を定義する

方針:

- observability metrics は approval 判断材料として使う
- metrics は automatic approval の根拠にしない
- high / critical metrics は review priority を上げる signal として扱う
- approval 後も post-compare / snapshot / trend で効果を確認する

---

## ■ Traceability / Auditability との関係

approval は traceability / auditability と一体で扱う。

保存・表示したい情報:

- operation_id
- operation_type
- operation_mode
- risk_level
- requested_by
- reviewed_by
- approved_by
- domain_owner
- approval_status
- reason_code
- reason_text
- evidence reference
- request_id
- trace_id
- parent_trace_id
- original_trace_id
- related_trace_id
- affected warehouse_code
- affected keys
- dry_run_id
- compare_summary
- before_summary
- after_summary
- created_at
- approved_at
- executed_at

方針:

- approval status と execution status を分ける
- approval なし execution を audit risk として扱う
- trace_id / request_id / parent_trace_id は approval context と関連付ける
- approval は source of truth そのものではなく、operation governance の記録として扱う
- 初期は schema を作らず、policy と checklist を整える

---

## ■ 導入段階案

### Step 0: Policy の明文化

本ドキュメントで approval boundary の原則を整理する。

この段階では実装しない。

### Step 1: Role Definition

候補:

- operator
- reviewer
- approver
- domain owner

方針:

- role 名称と責務を先に固定する
- 実際の RBAC / permission 実装は別 phase とする
- warehouse_code boundary と role の関係を整理する

### Step 2: Risk Classification

候補:

- low
- medium
- high
- critical

判断軸:

- source of truth 変更可能性
- projection impact
- replay duplicate risk
- warehouse boundary risk
- shipment / billing impact
- blast radius

### Step 3: Dry-run Approval Checklist

候補:

- affected scope
- warehouse_code
- dry-run result
- compare summary
- manual_review_required
- suggested action

この段階では execution しない。

### Step 4: Execution Approval Checklist

候補:

- operation type
- risk level
- approval role
- before / after expected state
- evidence
- trace relation
- rollback / compensation policy candidate
- post-compare plan

### Step 5: Traceability Design

候補:

- operation_id
- request_id
- trace_id
- parent_trace_id
- approved_by
- reason_code
- affected keys
- compare_summary

nullable / additive / no destructive change を前提に設計する。

### Step 6: Read-only Approval Visibility

候補:

- approval status display
- pending approval list
- risk level summary
- cross-warehouse risk marker

UI を追加する場合も read-only visibility から始め、execution button は急がない。

### Step 7: Controlled Execution Candidate

候補:

- approved correction
- approved scoped rebuild
- approved replay execution

実装する場合は、dry-run、approval、traceability、post-compare を必須候補にする。

---

## ■ 今回は実装しない判断

Phase B10-04 では、policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- approval 実装
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- approval table
- RBAC変更
- scheduled job
- README変更

理由:

- まず role / risk / boundary / approval の概念を固定する必要がある
- 実装前に warehouse boundary と cross-warehouse risk を明文化する必要がある
- approval と execution の状態を混ぜると auditability が弱くなる
- dry-run と execution approval を分けないと、compare-only から危険な実行に直結しやすい
- approval boundary は correction / rebuild / replay 実装より先に policy として整理すべきである

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

approval boundary は、recovery operation を安全に実行するための governance である。

operator / reviewer / approver / domain owner の役割を分け、warehouse boundary と cross-warehouse risk を明確にし、dry-run と execution approval を分離する。これにより、correction / rebuild / replay / recovery を source of truth protection、traceability、auditability の範囲内で段階的に扱えるようにする。
