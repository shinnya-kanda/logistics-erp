# Governance Dashboard Accessibility and Usability Policy（Phase B15-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の accessibility / usability / operator readability / audit usability を整理する。

Phase B11 から B14 では、read-only recovery governance dashboard の information architecture、data contract、static mock、component boundary、state machine、rendering model を整理した。そこでは、dashboard が correction / rebuild / replay / approval / retry / incident resolution を実行しないこと、state visualization と mutation を分けること、execution rendering を置かないことを明確にした。

Phase B15-01 では、それらの前提を accessibility / usability の観点で補強し、keyboard navigation、screen reader readability、badge readability、color dependence の回避、operator cognitive load、audit usability、cross-dashboard UX consistency を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

accessibility / usability policy は、read-only governance dashboard を「見やすく、迷いにくく、監査しやすく、誤実行を誘発しない」画面にするための方針である。

基本方針:

- accessibility は governance visibility の一部として扱う
- keyboard だけで read-only navigation / filter / search / drilldown ができる設計を目指す
- screen reader でも severity / lifecycle / approval / evidence / risk の意味が伝わるようにする
- badge は色だけに依存しない
- stale / critical / cross-warehouse は視覚・文言の両方で明示する
- operator が短時間で優先度を判断できるようにする
- auditor が後から根拠と状態を追えるようにする
- compare / observability / recovery の UX 意味を混同しない
- read-only indication を常に見える位置に置く
- execution affordance を置かない

---

## ■ Accessibility / Usability Policy の目的

この policy の目的は、dashboard の情報量が増えても、user が安全に状態を理解できるようにすることである。

答えたい問い:

- keyboard 操作だけで必要な情報に到達できるか
- screen reader で badge や timeline の意味が分かるか
- critical / cross-warehouse を色だけで伝えていないか
- lifecycle と approval を混同しない表示になっているか
- stale / partial / error data を business incident と誤認しないか
- operator が次に「確認すべきこと」を理解できるか
- auditor が evidence / timeline / approval / warehouse boundary を追えるか
- read-only dashboard に execution affordance が混入していないか

---

## ■ Keyboard Navigation の考え方

keyboard navigation は、read-only investigation を支える基本操作である。

対象操作:

- top-level navigation
- tab navigation
- filter
- sort
- search
- list row focus
- detail drilldown
- expand / collapse
- timeline event navigation
- copy ID
- open reference link

方針:

- focus order は画面の情報構造と一致させる
- `READ ONLY` banner は focus の邪魔をしないが、screen reader で認識できるようにする
- table / list では row 単位で focus できる設計を検討する
- drilldown link は link として扱い、button に見せない
- badge は必要に応じて tooltip / description に keyboard で到達できるようにする
- execution button / approval button / retry button は focus 対象として存在させない

keyboard flow 例:

```text
Page Header -> Navigation Tabs -> Filter/Search -> Summary Cards -> List Rows -> Detail Panel -> Evidence Links -> Timeline Links
```

---

## ■ Screen Reader Readability

screen reader readability は、視覚情報だけでなく意味情報を伝えるための方針である。

読み上げ対象:

- dashboard title
- read-only indication
- generated_at / stale status
- severity
- lifecycle
- approval status
- evidence status
- cross-warehouse risk
- warehouse_code
- incident_id / operation_id / evidence_package_id
- timeline event order

方針:

- badge は `Critical severity` のように category と value を合わせて読めるようにする
- `approved` は `approval approved, not executed` のように誤解を防ぐ文言を検討する
- `dry_run` は `dry run state, not execution` のように文脈を補う
- icon-only 表示にしない
- timeline は event name だけでなく timestamp / actor / state / related ID を読めるようにする
- color / icon だけで criticality を伝えない

---

## ■ Badge Readability

severity / lifecycle / approval / evidence badge は、短い表示で状態を伝えるが、概念を混ぜてはいけない。

badge category:

| Category | 例 | 読みやすさ方針 |
| --- | --- | --- |
| Severity | low / medium / high / critical | business impact として表示する |
| Lifecycle | requested / dry_run / approved / completed / failed | operation progress として表示する |
| Approval | pending / approved / rejected / expired | execution approval として表示する |
| Evidence | missing / partial / available / not_required | audit readiness として表示する |
| Risk | low / medium / high / critical / cross-warehouse | operation / boundary risk として表示する |

方針:

- badge text は省略しすぎない
- same color を使う場合も category label を表示する
- critical / high は color + label + icon / shape の組み合わせを検討する
- `approved` badge は `completed` と並べても意味が混ざらないようにする
- `missing evidence` は upload action ではなく audit warning として表示する

---

## ■ Color Dependence 回避方針

color dependence を避けることで、色覚差や環境差があっても状態を理解できるようにする。

方針:

- 色だけで severity / risk を表現しない
- text label を必ず表示する
- icon / border / pattern / position など複数の cue を検討する
- contrast を確保する
- critical / cross-warehouse は文言でも明示する
- stale / partial / error は色だけでなく `Stale data` / `Partial data` / `Data error` と表示する

例:

```text
[CRITICAL] Cross-warehouse risk detected
[STALE DATA] Generated at: 2026-05-10 08:00
[EVIDENCE MISSING] Post-compare evidence is not available
```

---

## ■ Stale / Critical / Cross-warehouse Visibility

stale / critical / cross-warehouse は、operator と auditor が見落としてはいけない signal である。

表示方針:

- stale は freshness warning として表示する
- critical は business impact / governance risk として表示する
- cross-warehouse は warehouse boundary risk として表示する
- stale と critical を混同しない
- cross-warehouse は list / detail / evidence / timeline で一貫して表示する
- critical / cross-warehouse でも execution affordance は置かない

表示候補:

| Signal | 表示 |
| --- | --- |
| stale | `Stale data`, generated_at, affected contract |
| critical | `Critical severity`, reason, affected scope |
| cross-warehouse | `Cross-warehouse risk`, affected warehouse list, boundary evidence |

---

## ■ Timeline Readability

timeline readability は、incident / operation / trace の流れを追いやすくするための方針である。

対象 timeline:

- incident timeline
- operation lifecycle timeline
- evidence timeline
- trace timeline reference

方針:

- timestamp を読みやすい形式で表示する
- event type / state / actor / related ID を分けて表示する
- timeline の種類を明示する
- missing event は audit warning として表示する
- failed / cancelled / post-compare missing は reason を表示する
- timeline event を mutation control にしない
- replay / correction / rebuild from timeline button を置かない

readability 例:

```text
2026-05-10 09:30
Operation lifecycle: dry_run completed
Actor: system
Evidence: dry-run result available
Read-only event. No execution action is available here.
```

---

## ■ Filter / Search Usability

filter / search は、read-only investigation を効率化するための機能である。

filter 候補:

- warehouse_code
- incident severity
- operation_state
- approval_status
- evidence_status
- risk_level
- cross-warehouse risk
- owner / domain owner
- date range

search 候補:

- incident_id
- operation_id
- evidence_package_id
- trace_id
- request_id
- parent_trace_id
- warehouse_code
- part_no
- project_no
- pallet_code

方針:

- active filter を常に表示する
- empty result では filter 条件を表示する
- search result から execution しない
- broad search でも warehouse boundary を見失わない
- sensitive data を検索対象にする場合は別途 privacy / security 方針を整理する
- filter / search は server state を変更しない local / read-only interaction とする

---

## ■ Mobile / Tablet Readability

mobile / tablet readability は、現場確認や会議中の閲覧を想定した読みやすさの方針である。

方針:

- summary は縦積みでも意味が崩れないようにする
- table は priority column を先に表示する
- incident / operation / evidence / timeline を段階的に開ける構造を検討する
- badge text を省略しすぎない
- warehouse_code / severity / lifecycle / approval / evidence は小画面でも見えるようにする
- critical / cross-warehouse は折りたたみ内に隠しすぎない
- execution affordance を mobile sticky action として置かない

優先表示候補:

1. read-only indication
2. severity / risk / cross-warehouse
3. warehouse_code
4. lifecycle / approval
5. evidence status
6. generated_at / stale status
7. related links

---

## ■ Operator Cognitive Load

operator cognitive load は、operator が短時間で「何を確認すべきか」を理解できるようにする考え方である。

負荷を下げる方針:

- severity / lifecycle / approval / evidence を分けて表示する
- priority order を一貫させる
- summary から detail へ自然に drilldown できるようにする
- reason_code / reason_text を近くに表示する
- suggested next review は短い文言にする
- empty / error / stale の意味を明示する
- critical / cross-warehouse の理由を隠さない

避けること:

- badge だけを大量に並べる
- 同じ色で異なる意味を表す
- approved を completed のように見せる
- failed を retry action に見せる
- evidence missing を upload action に見せる
- read-only dashboard に action area を置く

---

## ■ Audit Usability

audit usability は、後から operation / incident / approval / evidence / timeline を説明できるようにするための方針である。

auditor が確認したい情報:

- incident_id
- operation_id
- evidence_package_id
- warehouse_code / affected warehouse list
- severity / risk_level
- lifecycle state
- approval status
- evidence completeness
- generated_at
- trace_id / request_id / parent_trace_id
- dry-run / post-compare presence
- failure / cancellation reason

方針:

- ID は copy しやすく表示する
- evidence package への reference を分かりやすくする
- timeline と evidence の関係を追えるようにする
- warehouse boundary evidence を見落とさないようにする
- stale / partial data は audit limitation として表示する
- raw data を過剰表示せず、summary と reference を分ける

---

## ■ Compare / Observability / Recovery UX Consistency

compare / observability / recovery は目的が異なるが、UX の基本意味は一貫させる。

| Area | UX focus | 一貫性方針 |
| --- | --- | --- |
| Compare | row-level diff / reason / review_required | severity / reason を読みやすくする |
| Observability | backlog / aging / hotspot / trend | trend / health を execution signal にしない |
| Recovery | incident / operation / approval / evidence / lifecycle | governance state を read-only で追えるようにする |

方針:

- dashboard 間で `warehouse_code` / `trace_id` / `request_id` / `parent_trace_id` の label を揃える
- critical / cross-warehouse は共通して強調する
- badge category の意味を揃える
- cross-dashboard link は reference navigation として扱う
- link 先で execution affordance を出さない

---

## ■ Read-only Indication Visibility

read-only indication は、画面が確認専用であることを常に伝える表示である。

表示候補:

- page header の `READ ONLY`
- subheader の `No correction, rebuild, replay, approval, or retry is executed from this dashboard.`
- detail panel の `Governance review only`
- empty state の `No execution actions are available here.`
- timeline event の `Read-only event`

方針:

- read-only indication は全 screen で見えるようにする
- critical / error / empty state でも read-only indication を維持する
- disabled execution button で read-only を表現しない
- read-only の説明は短く、繰り返しすぎない
- screen reader でも read-only であることが分かるようにする

---

## ■ Execution Affordance を置かない Usability 方針

read-only governance dashboard では、execution affordance を置かない。

置かないもの:

- execution button
- disabled execution button
- approval button
- retry button
- resolve incident button
- attach evidence button
- auto recover button
- lifecycle transition control
- drag-and-drop state change
- inline edit control

理由:

- read-only governance dashboard は visibility / review / audit のための画面である
- disabled button は将来押せる action と誤解されやすい
- action affordance があると operator が review と execution を混同しやすい
- source of truth protection / warehouse boundary / approval / audit log を UI 単体で保証できない
- execution flow は別の controlled execution design として扱うべきである

代替表現:

- `Suggested next review`
- `Approval required`
- `Evidence missing`
- `Post-compare missing`
- `Retry candidate`
- `Escalation candidate`
- `Read-only reference`

---

## ■ 導入段階案

### Step 0: Accessibility / Usability Policy の明文化

本ドキュメントで accessibility / usability / operator readability / audit usability を整理する。

この段階では実装しない。

### Step 1: Read-only Indication Review

確認:

- 全 screen で read-only が伝わるか
- empty / error / stale でも read-only が伝わるか
- disabled button に依存していないか

### Step 2: Badge Readability Review

確認:

- severity / lifecycle / approval / evidence / risk が分かれているか
- color だけに依存していないか
- screen reader で category と value が伝わるか

### Step 3: Navigation / Search Review

確認:

- keyboard flow が情報構造と一致しているか
- filter / search / drilldown が read-only interaction として扱われているか
- empty result の理由が分かるか

### Step 4: Timeline / Evidence Review

確認:

- timeline event が読みやすいか
- missing evidence / post-compare missing が audit warning として分かるか
- trace / evidence / operation の reference が追いやすいか

### Step 5: Mobile / Tablet Readability Review

確認:

- critical / cross-warehouse が小画面でも見えるか
- warehouse_code / lifecycle / approval / evidence が省略されすぎていないか
- sticky execution action が存在しないか

### Step 6: No Execution Affordance Review

確認:

- execution button がないか
- disabled execution button がないか
- approve / retry / resolve / attach control がないか
- suggested next review が action に見えないか
- timeline / badge / empty state から execution を促していないか

---

## ■ 今回は実装しない判断

Phase B15-01 では、accessibility and usability policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- accessibility 実装
- keyboard navigation 実装
- screen reader 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず accessibility / usability の方針を固定する必要がある
- rendering model と state machine に対して、読みやすさと監査しやすさの基準を追加する段階である
- execution affordance を置かない方針を usability の観点から明確にする必要がある
- UI 実装前に keyboard / screen reader / color dependence / mobile readability の観点を整理する必要がある

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
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard accessibility and usability policy は、read-only governance dashboard を安全に読み、調査し、監査するための設計方針である。

keyboard navigation、screen reader readability、badge readability、color dependence 回避、timeline readability、operator cognitive load、audit usability を整理し、execution affordance を置かないことで、visibility と mutation の境界を守る。
