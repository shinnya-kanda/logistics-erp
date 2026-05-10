# Governance Dashboard Information Density Policy（Phase B16-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の information density / progressive disclosure / scanability / dashboard layering を整理する。

Phase B11 から B15 では、read-only recovery governance dashboard の information architecture、data contract、static mock、component boundary、state machine、rendering model、accessibility / usability、terminology / glossary を整理した。そこでは、summary から detail へ段階的に辿ること、severity / lifecycle / approval / evidence / risk を分けること、critical / cross-warehouse / stale / partial data を見落とさないこと、execution affordance / execution wording を置かないことを明確にした。

Phase B16-01 では、それらの前提を information density の観点で補強し、情報量が多い dashboard でも operator が優先度を素早く読み取り、auditor が必要な根拠に辿れるようにする。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

information density policy は、read-only governance dashboard に表示する情報量を制御し、scanability / auditability / safety を両立するための方針である。

基本方針:

- summary と detail の情報密度を分ける
- overview では判断の入口だけを表示する
- detail では evidence / timeline / reason を追えるようにする
- progressive disclosure により段階的に情報を開く
- critical / cross-warehouse / stale / partial / error は隠しすぎない
- hotspot / aging / failed / missing evidence は優先順位をつけて表示する
- compare / observability / recovery の density を混同しない
- mobile / tablet では優先情報を先に表示する
- audit 情報は detail / expansion / reference として整理する
- execution density を置かない

---

## ■ Information Density Policy の目的

この policy の目的は、dashboard が情報過多になっても、operator / reviewer / auditor が迷わず必要な情報に到達できるようにすることである。

答えたい問い:

- overview は何を要約し、何を隠すべきか
- list row にはどの項目を出し、detail に何を回すべきか
- critical / cross-warehouse は折りたたみ内に隠れていないか
- hotspot / aging / failed operation は優先表示されているか
- audit evidence は必要なときに辿れるか
- timeline は多すぎる event で読みにくくなっていないか
- mobile / tablet で重要情報が埋もれないか
- execution button / action area が情報密度を増やしていないか

---

## ■ Information Overload 回避方針

information overload は、operator が重要な signal を見落とす原因になる。

回避方針:

- 1 screen にすべての detail を出さない
- summary card は最大でも数個の key metric に絞る
- list row は scan に必要な項目に絞る
- reason_text / long evidence / full timeline は expansion に置く
- badge を大量に並べすぎない
- 同じ意味の warning を重複表示しない
- critical / cross-warehouse はまとめて埋もれないようにする
- empty / stale / partial / error は短い説明にする

避けること:

- overview に full evidence を表示する
- list row に audit package 全体を表示する
- timeline event をすべて常時展開する
- badge だけで row を埋める
- execution action area を置いて scan 対象を増やす

---

## ■ Summary vs Detail Density

summary と detail は、目的と情報密度を分ける。

| Layer | 目的 | 表示密度 |
| --- | --- | --- |
| Summary | 全体状態と優先度を把握する | 低〜中 |
| List | 対象を比較・選択する | 中 |
| Detail | 根拠と状態を確認する | 中〜高 |
| Evidence | audit package を確認する | 高 |
| Timeline | 時系列を確認する | 中〜高 |

summary に出す候補:

- open incident count
- critical / high count
- cross-warehouse risk count
- failed operation count
- pending approval aging count
- evidence missing count
- stale / partial data warning

detail に回す候補:

- reason_text
- full affected scope
- approval history
- before / after summary
- dry-run result
- post-compare evidence
- detailed timeline

---

## ■ Progressive Disclosure

progressive disclosure は、重要な情報を先に見せ、詳細は必要に応じて開く考え方である。

段階:

```text
Overview -> List -> Detail -> Evidence -> Timeline -> Trace Reference
```

方針:

- overview では priority signal を見せる
- list では比較に必要な項目を見せる
- detail では reason / boundary / evidence status を見せる
- evidence / timeline は必要に応じて expand / drilldown する
- expansion は read-only interaction とする
- expansion から execution affordance を出さない

例:

```text
Summary: Critical incidents 3
List: incident_id / severity / warehouse / owner / related operation count
Detail: reason / scope / approval / evidence / related timeline
Evidence: dry-run result / post-compare / warehouse boundary evidence
```

---

## ■ Critical Focus Policy

critical focus policy は、重大な signal を情報量の中に埋もれさせないための方針である。

対象:

- critical severity
- critical risk
- cross-warehouse risk
- failed high risk operation
- missing post-compare for completed operation
- missing warehouse boundary evidence
- stale / partial data affecting critical summary

方針:

- critical signal は overview / list / detail で一貫して表示する
- critical signal は badge + text で表示する
- critical reason を detail で確認できるようにする
- critical を action permission として扱わない
- critical でも execution button は置かない
- critical が多い場合は grouping / sorting / filter を使う

---

## ■ Hotspot Prioritization

hotspot prioritization は、繰り返し発生する location / part / project / warehouse の問題を見落とさないための方針である。

hotspot 候補:

- location_code
- warehouse_code
- part_no
- project_no
- pallet_code
- recurring incident
- recurring evidence missing
- repeated failed operation

表示方針:

- overview では top hotspot のみ表示する
- observability では ranking / trend として表示する
- recovery では related incident / operation context として表示する
- hotspot は incident と断定しない
- hotspot は execution trigger ではない

density rule:

| Layer | Hotspot 表示 |
| --- | --- |
| Overview | top 1〜3 件 |
| Observability | ranking / trend |
| Recovery list | recurring flag |
| Recovery detail | related hotspot context |
| Audit detail | recurrence evidence reference |

---

## ■ Cognitive Scanability

cognitive scanability は、operator が短時間で priority を読み取れるようにする考え方である。

scan order:

1. `READ ONLY` / `NO EXECUTION`
2. critical / cross-warehouse
3. warehouse_code / affected scope
4. lifecycle / approval
5. evidence / post-compare
6. stale / partial / generated_at
7. related links

方針:

- label の位置を screen 間で揃える
- badge category を揃える
- important ID は同じ位置に置く
- long text は detail / expansion に置く
- stale / partial / error は短い warning として表示する
- suggested next review は短くする
- execution action を scan order に入れない

---

## ■ Dashboard Layering

dashboard layering は、compare / observability / trace / recovery の役割を分けたまま、関連情報に辿れるようにする考え方である。

layer:

| Layer | 主な問い | Density |
| --- | --- | --- |
| Compare | どこに差異があるか | row-level 中〜高 |
| Observability | 運用品質はどう変化しているか | aggregate 中 |
| Trace | 何が起きたか | timeline 中〜高 |
| Recovery | governance はどう進んでいるか | incident / operation 中〜高 |

方針:

- compare に recovery operation detail を詰め込まない
- observability に full evidence を詰め込まない
- recovery に compare row 全量を詰め込まない
- trace timeline は recovery lifecycle timeline と混同しない
- cross-dashboard link は reference navigation とする
- link 先から execution しない

---

## ■ Detail Expansion Policy

detail expansion は、row / card の背後にある根拠を必要に応じて表示するための read-only interaction である。

expansion 候補:

- reason_text
- affected warehouse list
- related operation list
- approval history
- evidence package summary
- dry-run result
- post-compare summary
- timeline excerpt
- trace reference

方針:

- expansion は user が情報を読むための操作である
- expansion は lifecycle / approval state を変更しない
- expansion 内に execution button を置かない
- nested expansion は深くしすぎない
- detail expansion には close / collapse の動線を用意する将来余地を残す

---

## ■ Audit Density

audit density は、監査に必要な情報を過不足なく辿れるようにするための方針である。

audit に必要な情報:

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
- dry-run result
- post-compare evidence
- failure / cancellation reason

方針:

- overview に audit detail を詰め込まない
- detail / evidence / timeline で audit trail を辿れるようにする
- raw data は必要に応じて reference として扱う
- evidence package は source of truth の代替ではない
- stale / partial data は audit limitation として明示する
- audit density が高い section でも execution affordance を置かない

---

## ■ Mobile / Tablet Density

mobile / tablet density は、小画面でも重要情報を見落とさないための方針である。

優先表示:

1. read-only indication
2. critical / cross-warehouse
3. warehouse_code
4. incident_id / operation_id
5. lifecycle / approval
6. evidence status
7. generated_at / stale
8. related reference

方針:

- table は card / stacked layout に変換する将来余地を残す
- detail は accordion / section に分ける
- critical / cross-warehouse を折りたたみの奥に隠しすぎない
- long evidence は summary + reference にする
- sticky execution action を置かない
- mobile でも read-only indication を維持する

---

## ■ Timeline Density

timeline density は、時系列 event を読みやすく保つための方針である。

timeline 種別:

- incident timeline
- operation lifecycle timeline
- evidence timeline
- trace timeline reference

density 方針:

- latest / key event を先に表示する
- full timeline は expansion / drilldown に置く
- event type / timestamp / actor / status / related ID を分けて表示する
- repeated event は grouping を検討する
- missing event は audit warning として表示する
- operation lifecycle timeline と trace timeline を混同しない
- timeline event を action control にしない

表示例:

```text
Key events:
- dry_run completed
- approval approved, not executed
- post-compare missing

Open full timeline: read-only reference
```

---

## ■ Compare / Observability / Recovery Density Separation

compare / observability / recovery は、表示すべき情報密度が異なる。

| Area | Density focus | Detail に回す情報 |
| --- | --- | --- |
| Compare | row-level diff / reason / severity | detailed transaction context |
| Observability | aggregate / trend / hotspot | snapshot history / ranking detail |
| Recovery | incident / operation / approval / evidence | audit package / lifecycle timeline |

方針:

- compare row に governance detail を出しすぎない
- observability metric に operation detail を出しすぎない
- recovery list に compare row 全量を出しすぎない
- cross-dashboard density は reference link で調整する
- dashboard 間 link から execution しない

---

## ■ Read-only Information Ergonomics

read-only information ergonomics は、情報配置によって誤操作・誤読を避ける考え方である。

方針:

- read-only indication を常に視野に入れる
- action area を置かず、情報表示 area に集中する
- suggested next review は action ではなく guidance として表示する
- candidate / required / missing / reference の wording を使う
- high density section ほど category label を明確にする
- copy ID / reference link は read-only utility として扱う
- execution action と誤認される visual treatment を避ける

ergonomics checklist:

- 重要情報が上から読めるか
- category が明確か
- detail は必要なときだけ開けるか
- warning が重複しすぎていないか
- action に見える要素が混ざっていないか

---

## ■ Execution Density を置かない方針

read-only governance dashboard では、execution density を置かない。

置かない情報領域:

- action toolbar
- execution button group
- disabled execution button area
- approval action area
- retry action area
- resolve incident area
- attach evidence area
- auto recover shortcut
- inline state edit area

理由:

- execution action は情報密度を増やし、review / audit の scanability を下げる
- disabled action でも future execution を示唆し、read-only UX を曖昧にする
- high density dashboard に action area を混ぜると operator が review と execution を混同しやすい
- correction / rebuild / replay / approval は controlled execution flow の責務である
- source of truth protection / warehouse boundary / audit log を UI density で保証できない

代替表示:

- `Suggested next review`
- `Approval required`
- `Evidence missing`
- `Post-compare missing`
- `Retry candidate`
- `Escalation candidate`
- `Read-only reference`

---

## ■ 導入段階案

### Step 0: Information Density Policy の明文化

本ドキュメントで information density / progressive disclosure / scanability / dashboard layering を整理する。

この段階では実装しない。

### Step 1: Summary Density Review

確認:

- overview に key metrics だけが表示されているか
- critical / cross-warehouse / stale / partial が見えるか
- full detail を詰め込みすぎていないか

### Step 2: List / Detail Density Review

確認:

- list row は比較に必要な項目に絞られているか
- detail で reason / evidence / timeline を辿れるか
- badge が多すぎないか

### Step 3: Progressive Disclosure Review

確認:

- overview -> list -> detail -> evidence -> timeline の流れが自然か
- expansion が read-only interaction として扱われているか
- expansion 内に execution affordance がないか

### Step 4: Critical / Hotspot Review

確認:

- critical / cross-warehouse が埋もれていないか
- hotspot は top summary / ranking / context に分かれているか
- hotspot を incident / execution trigger と断定していないか

### Step 5: Audit Density Review

確認:

- audit に必要な ID / status / evidence / timeline が辿れるか
- raw data を過剰表示していないか
- stale / partial を audit limitation として表示しているか

### Step 6: Mobile / Timeline Density Review

確認:

- mobile / tablet で重要情報が見えるか
- timeline は key event と full detail が分かれているか
- repeated event が読みやすいか

### Step 7: No Execution Density Review

確認:

- action toolbar がないか
- execution button group がないか
- disabled execution button area がないか
- approve / retry / resolve / attach area がないか
- suggested next review が action area に見えないか

---

## ■ 今回は実装しない判断

Phase B16-01 では、information density policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- dashboard layout 実装
- progressive disclosure 実装
- mobile layout 実装
- timeline UI 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず information density / progressive disclosure / scanability の方針を固定する必要がある
- accessibility / terminology / rendering の方針に対して、情報量の制御基準を追加する段階である
- auditability と operator readability を両立するには、summary / detail / evidence / timeline の密度分離が必要である
- execution density を置かない方針を明確にする必要がある

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
- `docs/governance-dashboard-terminology-glossary-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard information density policy は、read-only governance dashboard の情報量を制御し、summary / detail / evidence / timeline を適切に分けるための設計方針である。

progressive disclosure、critical focus、hotspot prioritization、cognitive scanability、audit density、mobile / tablet density、timeline density を整理し、execution density を置かないことで、visibility と mutation の境界を守る。
