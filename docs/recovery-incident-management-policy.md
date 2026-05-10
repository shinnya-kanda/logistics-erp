# Recovery Incident Management Policy（Phase B10-07）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、inventory / pallet consistency incident を、個別 operation ではなく incident 単位で管理・監査・改善できるようにする policy を整理する。

これまでの Phase では、compare-only / observability first による差異可視化、controlled correction、scoped rebuild、replay isolation、approval boundary、recovery operation lifecycle、operation evidence & audit package を整理してきた。これらは個々の recovery operation を安全に扱うための方針である。

一方で、実運用では 1 つの差異や 1 回の operation だけではなく、同じ棚・project・part で繰り返し差異が起きる、複数 warehouse / workflow にまたがって影響が広がる、複数回の review / dry-run / correction / rebuild / replay を経て解決する、といった incident 単位の管理が必要になる。

Phase B10-07 では、incident と operation の違い、incident severity、ownership、escalation、timeline、resolution、retrospective、observability / auditability、recurring hotspot / recurring incident の考え方を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・UI変更・incident・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

incident management は、差異や operation を一つの業務問題として束ね、責任・判断・回復・再発防止を説明できるようにするための方針である。

基本方針:

- incident は operation の集合を束ねる管理単位である
- incident は source of truth そのものではない
- incident は差異、operation、approval、evidence、timeline、resolution、retrospective を関連付ける
- incident severity は業務影響・warehouse boundary・recurrence・blast radius を基準にする
- incident ownership を明確にする
- escalation は high / critical risk や recurring issue を中心に行う
- incident timeline は read-only / audit-oriented に扱う
- resolution は「差異が見えなくなった」ではなく「原因・対応・残リスクが説明できる」ことを目指す
- retrospective は blame ではなく再発防止と運用品質改善のために行う
- incident を根拠に automatic correction / rebuild / replay を実行しない

---

## ■ Incident Management の目的

incident management の目的は、inventory / pallet consistency の問題を、個別差異や単発 operation ではなく、業務影響と再発防止の観点で扱うことである。

目的:

- 複数差異を 1 つの業務問題として束ねる
- 複数 operation の関係を説明する
- owner / reviewer / approver / domain owner の責任を明確にする
- escalation 判断を明確にする
- timeline と evidence を一つの incident に関連付ける
- resolution と remaining risk を説明する
- recurring hotspot / recurring incident を改善対象にする
- future correction / rebuild / replay / automation の判断材料を蓄積する

incident management がない場合の risk:

- operation ごとの記録はあるが、全体原因が分からない
- 同じ棚・project・part での再発に気づけない
- escalation すべき high / critical issue が個別差異に埋もれる
- correction / rebuild / replay がばらばらに行われ、関連が追えない
- 解決済みの定義が曖昧になる
- retrospective が行われず、同じ問題が繰り返される

---

## ■ Incident と Operation の違い

incident と operation は粒度が異なる。

| 項目 | Incident | Operation |
| --- | --- | --- |
| 目的 | 業務問題を管理・説明する | 具体的な recovery action を実行・監査する |
| 粒度 | 複数差異・複数 operation を束ねる | correction / rebuild / replay / dry-run など 1 action |
| 状態 | open / investigating / mitigated / resolved など | requested / reviewing / dry_run / approved / executing / completed など |
| owner | incident owner / domain owner | requester / reviewer / approver / executor |
| evidence | 複数 audit package / timeline / snapshot | operation evidence package |
| resolution | 原因・対応・残リスク・再発防止 | execution result / post-compare |

関係:

- 1 incident は 0..N operation を持ち得る
- 1 operation は原則 1 incident に関連付ける候補とする
- incident なしの operation を許すかは将来設計する
- incident は operation 実行ボタンではない
- operation completed は incident resolved を意味しない

例:

```text
incident: location A-01 で同一 part の inventory / pallet quantity mismatch が再発
  -> operation: compare investigation
  -> operation: rebuild dry-run
  -> operation: scoped rebuild execution
  -> operation: post-compare
  -> retrospective: pallet item link update timing の見直し
```

---

## ■ Incident Severity の考え方

incident severity は、業務影響、warehouse boundary、recurrence、blast radius、source of truth risk を基準に分類する。

### low

low は、影響が限定的で、調査・観測で十分な incident である。

例:

- info / warning 差異のみ
- single warehouse / single location に限定
- 実物流・請求影響がない
- recurring ではない
- manual review で no action になり得る

方針:

- operator / reviewer が管理する候補
- observability で継続確認する
- automatic correction / rebuild / replay はしない

### medium

medium は、一定の調査や scoped recovery の候補になる incident である。

例:

- high ではないが review_required が複数ある
- same location / project / part で軽微な再発がある
- projection / read model drift が疑われる
- scoped rebuild dry-run が必要

方針:

- reviewer ownership を明確にする
- dry-run / compare evidence を集める
- scoped operation candidate を検討する

### high

high は、業務影響や source / projection 判断が必要な incident である。

例:

- quantity / location / project_no の high severity 差異
- 出庫・棚卸・請求に影響し得る
- correction / scoped rebuild / replay execution が候補になる
- unresolved aging が長い
- multiple operations が必要になる

方針:

- approver involvement を検討する
- approval boundary と evidence package を強くする
- incident timeline を明確にする
- post-resolution monitoring を行う

### critical

critical は、warehouse boundary、実物流、請求、広範囲影響に関わる重大 incident である。

例:

- cross-warehouse risk
- warehouse_code mismatch
- full rebuild candidate
- transaction generating replay with downstream impact
- billing confirmed data への影響
- source of truth を広範囲に補正する可能性
- critical 差異が同じ hotspot で継続

方針:

- domain owner escalation を必須候補にする
- automatic execution の対象外にする
- operation を分割・縮小できないか検討する
- evidence / approval / timeline / retrospective を必須候補にする
- resolution 後も trend / snapshot で監視する

---

## ■ Incident Ownership の考え方

incident ownership は、誰が incident の進行・判断・解決・再発防止を管理するかを示す。

役割候補:

- incident owner
- operator
- reviewer
- approver
- domain owner
- technical owner

incident owner の責務:

- incident scope を定義する
- severity を初期分類する
- related differences / operations を束ねる
- review / approval / operation の進行を追う
- resolution と remaining risk を整理する
- retrospective を実施する

domain owner の責務:

- high / critical impact を判断する
- cross-warehouse / cross-domain risk を判断する
- shipment / billing / customer impact を判断する
- operation mode / customer-specific rule を確認する

technical owner の責務:

- projection / read model logic の問題を調査する
- trace timeline / compare query / rebuild logic の問題を調査する
- future bug fix / test / monitoring enhancement を整理する

方針:

- incident owner と operation approver を同一人物に固定しない
- high / critical incident では domain owner を関与させる
- owner 不在の incident を長期間放置しない

---

## ■ Incident Escalation の考え方

escalation は、incident の risk / impact / recurrence が高い場合に、より強い role と evidence を要求する考え方である。

escalation trigger 候補:

- severity が high / critical
- warehouse boundary risk がある
- cross-warehouse risk がある
- unresolved aging が一定期間を超える
- same hotspot で recurring
- same reason_code が recurring
- operation failed / retry が続く
- correction / rebuild / replay execution が必要
- shipment / billing impact がある

escalation 先:

- reviewer
- approver
- domain owner
- technical owner
- incident owner

方針:

- escalation は automatic execution の根拠ではない
- escalation は review / approval / evidence 強化の signal として扱う
- critical incident は domain owner review を必須候補にする
- unresolved aging は escalation candidate として扱う

---

## ■ Incident Timeline の考え方

incident timeline は、incident に関連する差異・operation・approval・evidence・判断を時系列で説明する view である。

timeline に含めたいもの:

- incident opened
- severity change
- owner assigned
- compare result attached
- dry-run requested / completed
- approval requested / approved / rejected
- operation scheduled / executing / completed / failed / cancelled
- post-compare result attached
- resolution declared
- retrospective completed

関連 ID:

- incident_id
- operation_id
- request_id
- trace_id
- parent_trace_id
- original_trace_id
- replay_trace_id
- dry_run_id
- evidence_package_id

方針:

- incident timeline は read-only / audit-oriented に扱う
- timeline は operation execution と分離する
- timeline event は source of truth の代替ではない
- timeline が欠落しても transaction / history を削除・上書きしない

---

## ■ Incident Resolution の考え方

incident resolution は、incident を安全に完了扱いにする判断である。

resolved の候補条件:

- root cause または probable cause が説明されている
- related differences が解消または accepted risk として整理されている
- required operation が completed / cancelled / no action として整理されている
- post-compare evidence が確認されている
- remaining risk が明記されている
- recurring prevention / follow-up が整理されている

resolved ではない例:

- UI 上の差異が一時的に消えただけ
- operation が completed しただけで post-compare がない
- source of truth / projection / 実物流の切り分けが未完了
- cross-warehouse risk が未確認
- retry / failed operation が未整理

方針:

- operation completed は incident resolved を意味しない
- incident resolution は incident owner が整理し、必要に応じて domain owner が確認する
- high / critical incident は post-resolution monitoring を検討する
- unresolved remaining diff は新しい incident または child incident として扱う将来余地を残す

---

## ■ Incident Retrospective の考え方

retrospective は、incident の再発防止と運用品質改善のために行う。

整理したい問い:

- 何が最初の signal だったか
- detection は遅かったか
- severity は適切だったか
- escalation は適切だったか
- dry-run / approval / execution は安全だったか
- evidence package は十分だったか
- recurring hotspot だったか
- correction / rebuild / replay の選択は適切だったか
- monitoring / dashboard / policy / checklist に改善点はあるか

成果物候補:

- root cause summary
- contributing factors
- action items
- policy update candidate
- monitoring enhancement candidate
- test / validation candidate
- training / operation checklist update

方針:

- retrospective は blame ではなく改善のために行う
- high / critical incident は retrospective を必須候補にする
- recurring incident は retrospective で再発要因を整理する
- action item は automatic correction の口実にしない

---

## ■ Observability / Auditability との関係

observability は incident の検知・優先順位付け・再発確認に使う。auditability は incident の判断・operation・承認・結果を後から説明するために使う。

observability との関係:

- compare dashboard は incident candidate を見つける
- observability dashboard は severity / backlog / aging / hotspot を示す
- historical snapshot は trend / recurrence を示す
- hotspot history は recurring incident の候補を示す
- lifecycle metrics は operation の停滞や失敗を示す

auditability との関係:

- evidence package は operation の根拠と結果を説明する
- incident timeline は複数 operation の流れを説明する
- approval evidence は execution 判断を説明する
- trace timeline は original / correction / rebuild / replay の関係を説明する

方針:

- observability metrics は incident candidate の signal として扱う
- metrics は automatic incident resolution / automatic operation の根拠にしない
- incident は observability と auditability を接続する管理単位として扱う

---

## ■ Correction / Rebuild / Replay / Approval / Lifecycle との関係

incident management は、各 recovery policy を束ねる上位管理方針である。

関係:

- controlled correction policy
  - source of truth に誤りがある場合の補正方針を整理する
- scoped rebuild policy
  - projection / read model drift を小さい範囲で回復する方針を整理する
- replay isolation policy
  - original trace と replay trace を分離して再実行する方針を整理する
- approval boundary policy
  - high / critical operation を誰が承認するか整理する
- recovery operation lifecycle policy
  - requested から completed / failed / cancelled までの状態を整理する
- operation evidence & audit package policy
  - operation の根拠・比較・承認・結果を audit package として整理する

incident はこれらを束ね、どの operation がどの incident に属し、どの evidence と approval によって解決へ進んだかを説明する。

---

## ■ Recurring Hotspot / Recurring Incident の考え方

recurring hotspot は、同じ location / project / part / inventory_type / warehouse_code で差異が繰り返される状態である。

recurring incident は、同じ原因または類似原因で incident が繰り返される状態である。

判定候補:

- same location_code で repeated days count が高い
- same project_no で high / critical が繰り返される
- same part_no で quantity mismatch が継続する
- same reason_code が複数 incident に出る
- same operation type が repeated failure になる
- same workflow / parent_trace_id で replay candidate が続く

方針:

- recurring hotspot は blame ではなく改善候補として扱う
- recurring incident は retrospective を強化する
- recurring であっても automatic correction / rebuild / replay に直結しない
- recurring pattern は scoped rebuild / validation / workflow / training / UI improvement の検討材料にする
- historical snapshot / trend と関連付ける将来余地を残す

---

## ■ 導入段階案

### Step 0: Policy の明文化

本ドキュメントで incident management の原則を整理する。

この段階では実装しない。

### Step 1: Incident Checklist

候補:

- incident title
- severity
- owner
- affected warehouse_code
- affected keys
- initial compare summary
- related hotspot / trend
- related trace
- suggested operation candidate

まず Markdown / checklist として運用確認する。

### Step 2: Incident / Operation Mapping

候補:

- incident_id
- operation_id
- evidence_package_id
- request_id
- trace_id
- parent_trace_id

この段階では DB 変更しない。

### Step 3: Severity / Escalation Design

候補:

- low
- medium
- high
- critical
- escalation trigger
- owner / approver / domain owner mapping

warehouse boundary と cross-warehouse risk を必ず含める。

### Step 4: Timeline / Evidence Design

候補:

- incident timeline event
- audit package reference
- approval event
- operation lifecycle event
- post-compare event
- retrospective event

read-only / audit-oriented visibility から始める。

### Step 5: Retrospective Checklist

候補:

- root cause summary
- detection quality
- operation quality
- evidence quality
- recurrence risk
- action items

high / critical / recurring incident から適用する。

### Step 6: Future Read-only Incident Dashboard

候補:

- open incident count
- incident severity count
- unresolved aging
- recurring hotspot linked incidents
- failed operation linked incidents
- resolution trend

UI を追加する場合も read-only visibility から始め、operation execution とは分離する。

---

## ■ 今回は実装しない判断

Phase B10-07 では、policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- UI変更
- incident 実装
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- incident table
- incident dashboard
- scheduled job
- README変更

理由:

- まず incident と operation の違いを明文化する必要がある
- severity / ownership / escalation / resolution の考え方を実装前に固定する必要がある
- incident management は observability と auditability を接続する上位概念であり、operation 実装より先に policy が必要である
- recurring hotspot / recurring incident を automatic operation に直結させない方針を明確にする必要がある
- 現時点では compare-only / visibility first の延長として incident 管理を設計する段階である

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

recovery incident management は、個別 operation を安全に実行するための仕組みではなく、複数の差異・operation・approval・evidence を一つの業務問題として説明し、解決と再発防止へつなげるための policy である。

observability は incident candidate を見つけ、auditability は incident の判断と対応を説明する。incident management はその間をつなぎ、operation completed だけではなく、原因・対応・残リスク・再発防止までを管理対象にする。
