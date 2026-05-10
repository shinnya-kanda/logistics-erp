# Governance Dashboard Terminology and Glossary Policy（Phase B15-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の terminology / wording / glossary / tooltip semantics を整理し、compare / observability / recovery 間の language consistency を統一する。

Phase B11 から B15-01 では、read-only recovery governance dashboard の information architecture、data contract、static mock、component boundary、state machine、rendering model、accessibility / usability policy を整理した。そこでは、severity / lifecycle / approval / evidence / risk を分けて扱うこと、color だけに依存しないこと、read-only indication を常時表示すること、execution affordance を置かないことを明確にした。

Phase B15-02 では、それらの表示・アクセシビリティ方針を支える用語体系を整理する。用語の意味、tooltip の説明、audit wording、read-only wording、使わない execution wording を明確にし、dashboard 間で同じ言葉が同じ意味を持つようにする。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

terminology / glossary policy は、read-only governance dashboard の言葉を揃えるための方針である。

基本方針:

- 同じ用語は dashboard 間で同じ意味にする
- 異なる概念に同じ用語を使わない
- severity / lifecycle / approval / evidence / risk を分ける
- compare / observability / recovery の用語を分ける
- tooltip は用語の意味と誤解しやすい点を短く説明する
- audit wording は後から根拠を説明できる表現にする
- read-only wording は常に execution が行われないことを明確にする
- execution wording を置かない
- action に見える言葉は避け、review / reference / visibility の言葉を使う

---

## ■ Terminology / Glossary Policy の目的

この policy の目的は、dashboard の言葉が operator / reviewer / approver / auditor に同じ意味で伝わるようにすることである。

答えたい問い:

- `critical` はどの dashboard でも同じ意味で使われているか
- `approved` は `completed` と誤解されないか
- `failed` は `retry` を促す言葉になっていないか
- `evidence missing` は upload action と誤解されないか
- `stale data` は business incident と混同されないか
- `health` は recovery completed と誤解されないか
- `suggested next review` は execution instruction と誤解されないか
- tooltip が action permission を暗示していないか

---

## ■ Severity Terminology

severity は、incident / diff の業務影響度を示す用語である。

values:

| Term | 意味 | 推奨 tooltip |
| --- | --- | --- |
| low | 軽微、または確認優先度が低い状態 | `Low severity: minor business impact or informational review.` |
| medium | review が必要な状態 | `Medium severity: review is recommended before escalation.` |
| high | 業務影響候補があり、優先確認が必要な状態 | `High severity: possible business impact, priority review required.` |
| critical | 実物流・倉庫境界・請求・出荷など重大 risk がある状態 | `Critical severity: significant business or warehouse boundary risk.` |

方針:

- severity は approval status ではない
- severity は lifecycle state ではない
- severity は operation risk_level と同一視しない
- critical は execution permission ではない
- `critical` を `execute immediately` の意味で使わない

---

## ■ Lifecycle Terminology

lifecycle は、recovery operation の進行状態を示す用語である。

values:

| Term | 意味 | 注意 |
| --- | --- | --- |
| requested | operation が要求された状態 | 実行開始ではない |
| reviewing | review 中 | approval 済みではない |
| dry_run | dry-run / 検証中または完了 | execution-ready ではない |
| approved | execution approval が得られた状態 | completed ではない |
| scheduled | 実行予定として記録された状態 | 実行済みではない |
| executing | 実行中として記録された状態 | UI control ではない |
| completed | operation が完了した状態 | post-compare と合わせて確認する |
| failed | operation が失敗した状態 | retry button を意味しない |
| cancelled | operation が取り消された状態 | rollback ではない |

推奨 wording:

- `Lifecycle: approved, not executed`
- `Lifecycle: completed, post-compare missing`
- `Lifecycle: failed, review required`

避ける wording:

- `Ready to execute`
- `Run now`
- `Retry failed operation`
- `Approve and execute`

---

## ■ Approval Terminology

approval は、execution approval の governance state を示す用語である。

values:

| Term | 意味 | 推奨 tooltip |
| --- | --- | --- |
| not_required | この operation では approval が不要と判断された状態 | `Approval not required for this operation type or scope.` |
| pending | approval 待ち | `Approval pending: review is not complete.` |
| approved | approval 済み | `Approval approved: this does not mean execution completed.` |
| rejected | approval が却下された状態 | `Approval rejected: operation should be reviewed again.` |
| expired | approval が期限切れ | `Approval expired: re-review may be required.` |

方針:

- approval は lifecycle completed ではない
- approval は execution を開始する UI action ではない
- `approved` は `safe` や `done` の意味で使わない
- approval wording から approve / reject button を連想させない

---

## ■ Evidence Terminology

evidence は、audit readiness / 根拠資料の状態を示す用語である。

values:

| Term | 意味 | 推奨 tooltip |
| --- | --- | --- |
| missing | 必要 evidence がない | `Evidence missing: required audit evidence is not available.` |
| partial | 一部 evidence が不足 | `Evidence partial: some evidence is available, but audit package is incomplete.` |
| available | 必要 evidence が確認できる | `Evidence available: required evidence is linked for review.` |
| not_required | この operation では evidence が不要 | `Evidence not required for this operation type or scope.` |

関連用語:

- compare summary
- before / after summary
- dry-run result
- post-compare evidence
- trace timeline
- warehouse boundary evidence
- attachment reference

方針:

- evidence は source of truth ではない
- evidence missing は upload action ではない
- evidence available は operation が正しいことの保証ではない
- `attach evidence` を read-only dashboard の wording として使わない

---

## ■ Risk Terminology

risk は、operation / incident / warehouse boundary / audit readiness の危険度を示す用語である。

values:

| Term | 意味 |
| --- | --- |
| low risk | 影響範囲が限定的 |
| medium risk | review が必要な影響候補 |
| high risk | 業務・監査・倉庫境界への影響候補 |
| critical risk | 重大な業務影響または境界違反候補 |
| cross-warehouse risk | warehouse_code を跨ぐ影響候補 |
| unknown risk | 判断に必要な情報が不足 |

方針:

- risk は severity と同じではない
- cross-warehouse risk は critical 相当として強調する
- unknown risk は safe ではなく warning 候補として扱う
- risk wording から automatic execution を促さない

---

## ■ Escalation Terminology

escalation は、より高い review / approval / domain owner attention が必要な状態を示す用語である。

values:

| Term | 意味 |
| --- | --- |
| no_escalation | escalation 不要 |
| reviewer_attention | reviewer の確認が必要 |
| approver_attention | approver の確認が必要 |
| domain_owner_attention | domain owner の確認が必要 |
| cross_warehouse_escalation | warehouse boundary を跨ぐため強い確認が必要 |
| recurring_incident_escalation | recurring incident / hotspot として改善確認が必要 |

方針:

- escalation は action ではなく signal である
- escalation は automatic execution の根拠ではない
- `Escalate now` のような button wording は置かない
- `Escalation candidate` / `Domain owner attention` のような review wording を使う

---

## ■ Stale / Partial / Error Terminology

stale / partial / error は、data quality / fetch / contract の状態を示す用語であり、business incident そのものではない。

| Term | 意味 | 誤解防止 |
| --- | --- | --- |
| stale data | 表示 data の生成時刻が古い | business incident ではない |
| partial data | 一部 contract / data が欠落している | evidence missing とは別 |
| data error | data fetch / parse / contract validation に失敗 | recovery operation failure とは別 |
| empty result | 表示対象がない | stable と断定しない |
| no search result | search 条件に該当がない | incident がないとは限らない |

推奨 wording:

- `Stale data: generated_at is older than expected.`
- `Partial data: evidence summary is unavailable.`
- `Data error: operation summary could not be loaded.`
- `No results for current filters.`

避ける wording:

- `No issue` when filter is active
- `System recovered` for empty result
- `Failure` for API fetch error without context

---

## ■ Compare / Observability / Recovery 用語分離

compare / observability / recovery は目的が異なるため、用語を分ける。

| Area | 主な用語 | 意味 |
| --- | --- | --- |
| Compare | diff, quantity_diff, reason_code, review_required, severity | 現在差異の確認 |
| Observability | backlog, aging, hotspot, trend, health | 運用品質の継続観測 |
| Recovery | incident, operation, lifecycle, approval, evidence, risk | governance / audit 状態の確認 |

分離方針:

- compare `review_required` を recovery `approval pending` と呼ばない
- observability `health` を recovery `resolved` と呼ばない
- recovery `operation completed` を compare `diff resolved` と呼ばない
- hotspot を incident と断定しない
- trend worsening を execution trigger と呼ばない

---

## ■ Tooltip / Glossary Policy

tooltip / glossary は、短い用語の意味と誤解しやすい点を補足するために使う。

tooltip 方針:

- category + value + caveat の順で説明する
- action permission を暗示しない
- read-only dashboard では mutation action を案内しない
- technical ID は必要に応じて glossary で補足する
- screen reader でも意味が伝わる文言にする

tooltip pattern:

```text
{Category}: {Value}. {Meaning}. {Caveat if needed}.
```

例:

```text
Severity: Critical. Significant business or warehouse boundary risk. This does not permit automatic execution.
Approval: Approved. Execution approval exists. This does not mean the operation is completed.
Evidence: Missing. Required audit evidence is not available. No attachment action is available in this view.
```

---

## ■ Wording Consistency

wording consistency は、画面ごとに同じ意味を同じ文言で表す方針である。

共通 label:

- `READ ONLY`
- `NO EXECUTION`
- `Suggested next review`
- `Read-only reference`
- `Warehouse boundary`
- `Cross-warehouse risk`
- `Post-compare missing`
- `Evidence missing`
- `Retry candidate`
- `Escalation candidate`
- `Generated at`

方針:

- 同じ dashboard 内で `critical` / `severe` / `urgent` を混在させない
- `retry candidate` と `retry` を混同しない
- `review required` と `approval pending` を混同しない
- `reference link` と `action link` を混同しない
- local language と English term を混在させる場合は glossary に寄せる

---

## ■ Audit Wording

audit wording は、後から状態・根拠・判断境界を説明しやすくするための文言である。

含めるべき言葉:

- `Audit evidence`
- `Evidence package`
- `Before / after summary`
- `Dry-run result`
- `Post-compare evidence`
- `Approval status`
- `Lifecycle state`
- `Warehouse boundary evidence`
- `Trace reference`
- `Generated at`
- `Read-only snapshot`

方針:

- audit wording は事実と根拠を示す
- judgement を断定しすぎない
- evidence available を business correctness と表現しない
- stale / partial data は audit limitation として明示する
- source of truth と evidence package を混同しない

---

## ■ Read-only Wording Consistency

read-only wording は、dashboard が確認専用であることを明確にする文言である。

推奨 wording:

- `READ ONLY`
- `NO EXECUTION`
- `This dashboard does not execute correction, rebuild, replay, approval, or retry.`
- `Governance review only.`
- `No execution actions are available in this view.`
- `Read-only event.`
- `Read-only reference.`

方針:

- read-only wording は page / detail / empty / error / timeline で一貫させる
- critical / failed / missing evidence でも read-only wording を維持する
- disabled button で read-only を表現しない
- read-only wording は短く、意味が明確なものにする

---

## ■ Execution Wording を置かない方針

read-only governance dashboard では、execution wording を置かない。

置かない wording:

- `Execute`
- `Run`
- `Start recovery`
- `Apply correction`
- `Apply rebuild`
- `Replay now`
- `Approve`
- `Reject`
- `Retry`
- `Resolve incident`
- `Attach evidence`
- `Auto recover`
- `Fix now`
- `Sync now`

理由:

- execution wording は action affordance になる
- read-only governance dashboard は visibility / review / audit のための画面である
- disabled wording でも future action を示唆しやすい
- operation lifecycle / approval / evidence を UI 文言で変更できるように見せてはいけない
- correction / rebuild / replay / approval は別の controlled execution design の責務である

代替 wording:

| 置かない wording | 代替 |
| --- | --- |
| `Retry` | `Retry candidate` |
| `Approve` | `Approval required` / `Approval pending` |
| `Attach evidence` | `Evidence missing` |
| `Resolve incident` | `Resolution evidence missing` / `Incident under review` |
| `Execute rebuild` | `Rebuild candidate` |
| `Replay now` | `Replay candidate` |
| `Fix now` | `Suggested next review` |

---

## ■ 導入段階案

### Step 0: Terminology / Glossary Policy の明文化

本ドキュメントで terminology / wording / glossary / tooltip semantics を整理する。

この段階では実装しない。

### Step 1: Badge Glossary Review

対象:

- severity
- lifecycle
- approval
- evidence
- risk
- escalation

確認:

- category と value が分かれているか
- tooltip が action permission を暗示していないか
- `approved` / `completed` / `critical` の誤解を防いでいるか

### Step 2: Data Quality Wording Review

対象:

- stale data
- partial data
- data error
- empty result
- no search result

確認:

- business incident と混同していないか
- filter / generated_at / affected contract を説明できるか
- empty を stable と断定していないか

### Step 3: Cross-dashboard Language Review

対象:

- Compare
- Observability
- Trace Timeline
- Recovery Governance

確認:

- `warehouse_code` / `trace_id` / `request_id` / `parent_trace_id` の label が揃っているか
- compare severity と recovery risk を混同していないか
- observability health と recovery resolution を混同していないか

### Step 4: Audit Wording Review

対象:

- evidence package
- approval status
- lifecycle state
- warehouse boundary evidence
- trace reference
- generated_at

確認:

- 後から状態と根拠を説明できるか
- source of truth と evidence を混同していないか
- stale / partial を audit limitation として説明できるか

### Step 5: Read-only Wording Review

対象:

- page header
- detail panel
- empty state
- error state
- timeline event
- reference link

確認:

- read-only が常に伝わるか
- wording が長すぎないか
- disabled button に依存していないか

### Step 6: No Execution Wording Review

確認:

- `Execute` / `Run` / `Retry` / `Approve` / `Attach` がないか
- candidate / required / missing / reference として表現できているか
- tooltip が execution を促していないか
- critical / failed / missing evidence から execution wording が出ていないか

---

## ■ 今回は実装しない判断

Phase B15-02 では、terminology and glossary policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- glossary UI 実装
- tooltip 実装
- wording 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず terminology / glossary semantics を固定する必要がある
- accessibility / usability と rendering model に対して、用語の意味を揃える段階である
- compare / observability / recovery 間で language consistency を確保する必要がある
- execution wording を置かない方針を明確にする必要がある

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
- `docs/read-only-recovery-dashboard-design.md`
- `docs/recovery-dashboard-information-architecture.md`
- `docs/recovery-data-contract-design.md`
- `docs/recovery-dashboard-static-mock-design.md`
- `docs/recovery-dashboard-component-boundary-design.md`
- `docs/governance-dashboard-state-machine-design.md`
- `docs/governance-dashboard-rendering-model-design.md`
- `docs/governance-dashboard-accessibility-usability-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard terminology and glossary policy は、read-only governance dashboard の言葉の意味を揃えるための設計方針である。

severity / lifecycle / approval / evidence / risk / escalation / stale / partial / error の意味を明確にし、compare / observability / recovery 間の language consistency を保つ。execution wording を置かないことで、visibility と mutation の境界を守る。
