# Governance Dashboard Consistency Semantics Policy（Phase B17-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の consistency semantics / projection consistency / eventual consistency wording / visibility consistency を整理する。

Phase B9 以降では、inventory / pallet consistency を compare-only で可視化し、source of truth、projection / read model、snapshot / observability、recovery governance の責務を分けてきた。Phase B17-01 では freshness / staleness semantics を整理し、stale data は business incident そのものではなく freshness warning として扱うことを明確にした。

Phase B17-02 では、それらの前提を consistency semantics の観点で補強し、projection consistency、eventual consistency、stale vs inconsistent、partial consistency、cross-warehouse consistency、timeline consistency、audit limitation、visibility consistency を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

consistency semantics policy は、dashboard 上の「一致」「不一致」「遅延」「部分欠落」「観測品質」を誤解なく扱うための方針である。

基本方針:

- consistency は read-only visibility signal として扱う
- projection / read model は source of truth ではない
- compare inconsistency は調査入口であり、自動補正ではない
- stale と inconsistent を分ける
- partial consistency と partial freshness を分ける
- eventual consistency は mutation permission ではない
- cross-warehouse inconsistency は critical risk として強調する
- timeline consistency は event order / reference の整合性として扱う
- audit consistency limitation を明示する
- execution consistency を置かない

---

## ■ Consistency Semantics Policy の目的

この policy の目的は、operator / reviewer / auditor が dashboard 上の consistency signal を正しく解釈できるようにすることである。

答えたい問い:

- 何と何が一致していないのか
- projection inconsistency は source of truth error を意味するのか
- stale data と inconsistent data はどう違うのか
- snapshot health は current consistency を意味するのか
- partial consistency は correction 対象を意味するのか
- cross-warehouse inconsistency はどう扱うべきか
- timeline event の不整合は business operation の失敗を意味するのか
- consistency warning から execution workflow が出ていないか

---

## ■ Projection Consistency

projection consistency は、source of truth から導出される read model / projection が期待通りに見えるかを示す。

対象:

- `inventory_transactions` -> `inventory_current`
- `pallet_transactions` -> `pallet_units`
- `pallet_transactions` / pallet item operation -> `pallet_item_links`
- compare result -> dashboard summary
- observability snapshot -> historical summary

方針:

- `inventory_current` は部品現在庫 projection / read model として扱う
- `pallet_units` / `pallet_item_links` は現在保管状態 read model として扱う
- projection inconsistency は source of truth error と断定しない
- projection のみが誤っている可能性と source of truth が誤っている可能性を分ける
- projection consistency warning から直接 update / rebuild を実行しない

確認観点:

- source of truth に履歴があるか
- projection の反映が遅れていないか
- projection rebuild / refresh の対象範囲か
- manual correction / compensation が必要な source error か
- warehouse_code boundary を越えていないか

---

## ■ Eventual Consistency Wording

eventual consistency wording は、read model / snapshot / cache が source of truth より遅れて反映される可能性を説明するための文言である。

推奨 wording:

- `Projection may be delayed.`
- `Read model may not reflect the latest source transactions.`
- `Snapshot reflects the generated_at point in time.`
- `Timeline may be partial for the selected range.`
- `Consistency warning requires review, not automatic execution.`

避ける wording:

- `Database is wrong`
- `Source of truth is inconsistent`
- `Auto fix required`
- `Rebuild now`
- `Replay now`
- `Fresh enough to execute`

方針:

- eventual consistency は data propagation の説明である
- eventual consistency は inconsistency を無視する理由ではない
- eventual consistency は execution permission ではない
- wording は operator が「確認すべきこと」を理解できる表現にする

---

## ■ Compare Consistency

compare consistency は、compare dashboard が `inventory_current` と `pallet_units` / `pallet_item_links` などの read model 間差異をどう解釈するかを示す。

対象:

- quantity mismatch
- missing inventory current
- missing pallet item
- location mismatch
- project / inventory_type mismatch
- warehouse boundary mismatch

方針:

- compare result は read model / projection 間の差異表示である
- compare inconsistency は source of truth error を直接意味しない
- compare consistency は correction / rebuild / replay の自動判定ではない
- severity / reason_code / review_required は investigation priority として扱う
- compare consistency と recovery lifecycle state を混同しない

表示候補:

- `Compare inconsistency`
- `Projection mismatch`
- `Review required`
- `Reason code`
- `Affected warehouse_code`

---

## ■ Snapshot Consistency

snapshot consistency は、historical observability snapshot が同じ計算条件・同じ範囲・同じ semantics で比較できるかを示す。

対象:

- daily snapshot
- backlog history
- hotspot history
- consistency health history
- trend persistence

方針:

- snapshot は point-in-time observation である
- snapshot consistency は current state consistency ではない
- snapshot query version / health rule version を将来説明できるようにする
- missing snapshot は business inconsistency と断定しない
- regenerated snapshot は original snapshot と区別できる余地を残す
- snapshot inconsistency から automatic correction を行わない

表示候補:

- snapshot date
- generated_at
- source query version
- health rule version
- partial snapshot warning
- regeneration flag / version

---

## ■ Stale vs Inconsistent Distinction

stale と inconsistent は別概念である。

| 概念 | 意味 | 例 |
| --- | --- | --- |
| stale | data が古い可能性 | generated_at が threshold を超過 |
| inconsistent | 複数 data / projection 間で期待値が一致しない | inventory_current と pallet_item_links の数量差 |
| delayed | 反映や集約が遅れている可能性 | projection delay / snapshot delay |
| partial | 一部 data / contract が欠落 | timeline はあるが evidence summary がない |

方針:

- stale であることは inconsistent を意味しない
- inconsistent であることは stale を意味しない
- stale + inconsistent の場合は両方を表示する
- stale は freshness warning、inconsistent は consistency warning として分ける
- どちらも execution trigger ではない

例:

```text
[CONSISTENCY WARNING] Quantity mismatch detected.
[STALE DATA] Generated at: 2026-05-10 08:00.
This view is read-only. No correction or rebuild is executed here.
```

---

## ■ Partial Consistency

partial consistency は、ある範囲では consistency を確認できるが、別の範囲では確認できない状態である。

例:

- quantity は一致しているが location が不明
- `warehouse_code` は一致しているが evidence が欠落
- compare summary はあるが timeline が欠落
- snapshot metrics はあるが source query version が不明
- operation lifecycle はあるが post-compare evidence がない

方針:

- partial consistency は `consistent` と断定しない
- unknown / missing / not_checked を区別する
- partial consistency は audit limitation として表示する
- partial consistency から execution を促さない
- checked scope / unchecked scope を分けて表示する

表示候補:

- `Partially checked`
- `Consistency unknown`
- `Scope not checked`
- `Evidence missing`
- `Timeline unavailable`

---

## ■ Cross-warehouse Consistency

cross-warehouse consistency は、warehouse_code boundary を越えた data 混入・参照・影響範囲の整合性を示す。

対象:

- primary warehouse_code
- affected warehouse_code list
- source rows warehouse_code
- projection rows warehouse_code
- trace timeline warehouse_code
- evidence warehouse boundary
- cross-warehouse risk flag

方針:

- cross-warehouse inconsistency は critical risk として表示する
- unknown warehouse_code は safe ではなく warning 候補として扱う
- warehouse boundary evidence を確認できるようにする
- cross-warehouse consistency は approval / execution permission ではない
- cross-warehouse warning から execution button を出さない

表示候補:

- `Cross-warehouse consistency warning`
- `Affected warehouse mismatch`
- `Warehouse boundary evidence missing`
- `Unknown warehouse scope`

---

## ■ Timeline Consistency

timeline consistency は、incident / operation / trace / evidence の event order と参照関係が期待通りに見えるかを示す。

対象:

- incident timeline
- operation lifecycle timeline
- evidence timeline
- trace timeline reference
- request_id grouping
- trace_id / parent_trace_id relationship

方針:

- timeline consistency は event visualization の整合性である
- timeline generated_at と event timestamp を分ける
- missing event は audit warning として表示する
- event order gap は immediate business failure と断定しない
- operation lifecycle timeline と trace timeline を混同しない
- timeline inconsistency から replay / correction / rebuild を実行しない

表示候補:

- `Timeline gap`
- `Missing lifecycle event`
- `Trace reference unavailable`
- `Event order requires review`
- `Timeline partially available`

---

## ■ Audit Consistency Limitation

audit consistency limitation は、監査時に consistency の判断範囲・限界を説明するための考え方である。

audit に残したい context:

- checked scope
- unchecked scope
- generated_at
- snapshot date
- source query version
- reason_code
- severity / risk
- stale / partial warning
- missing evidence
- missing timeline range
- warehouse boundary evidence

方針:

- audit package は source of truth の代替ではない
- consistency warning を使った判断は limitation として説明できるようにする
- partial consistency を stable と表現しない
- snapshot consistency と current consistency を混同しない
- audit limitation は correction / rebuild / replay の automatic trigger ではない

---

## ■ Visibility Consistency

visibility consistency は、dashboard 間で同じ状態・同じ warning を同じ意味で見せるための方針である。

対象:

- badge wording
- severity / risk category
- stale / partial / error label
- consistency warning label
- warehouse boundary label
- generated_at label
- trace_id / request_id / parent_trace_id label

方針:

- same concept は same label で表示する
- different concept は same label を使わない
- compare `severity` と recovery `risk` を分ける
- stale warning と consistency warning を分ける
- dashboard 間 link では source context を保持する将来余地を残す
- visibility consistency は mutation consistency ではない

---

## ■ Compare / Observability / Recovery Consistency Separation

compare / observability / recovery は、consistency の意味が異なる。

| Area | Consistency meaning | 誤解しないこと |
| --- | --- | --- |
| Compare | read model / projection 間の差異確認 | source of truth error と断定しない |
| Observability | aggregate / snapshot / health の観測一貫性 | incident resolved と同一視しない |
| Recovery | incident / operation / approval / evidence / lifecycle の governance visibility | correction executed と同一視しない |
| Trace | timeline / request / business history の参照一貫性 | replay permission と同一視しない |

方針:

- compare consistency を recovery operation_state として扱わない
- observability health を approval_status として扱わない
- recovery lifecycle completed を compare diff resolved として扱わない
- trace relation consistency を replay trigger として扱わない
- dashboard 間 link から execution しない

---

## ■ Consistency Visualization Policy

consistency visualization は、一致・不一致・不明・部分確認を分かりやすく表示するための方針である。

表示候補:

- `Consistent`
- `Consistency warning`
- `Projection mismatch`
- `Partially checked`
- `Consistency unknown`
- `Cross-warehouse consistency warning`
- `Timeline gap`
- `Audit limitation`

方針:

- `Consistent` は checked scope が明確な場合だけ使う
- unknown を consistent として表示しない
- warning は reason_code / affected scope と一緒に表示する
- stale と inconsistent は別 badge にする
- critical / cross-warehouse は badge + text で強調する
- consistency warning から execution affordance を出さない

---

## ■ Execution Consistency を置かない方針

read-only governance dashboard では、execution consistency を置かない。

置かない概念:

- consistent enough to execute
- inconsistency means rebuild now
- inconsistency means replay now
- consistency warning means approve retry
- consistency-based auto correction
- consistency-based auto sync
- visibility consistency means source of truth correctness

理由:

- consistency signal は read-only visibility / review / audit のための signal である
- inconsistency は調査入口であり、原因分類ではない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を consistency signal だけで保証できない
- consistency warning を execution trigger にすると監査性が弱くなる

代替表現:

- `Consistency warning`
- `Review required`
- `Projection mismatch`
- `Recheck recommended`
- `Suggested next review`
- `Read-only consistency signal`

---

## ■ 導入段階案

### Step 0: Consistency Semantics Policy の明文化

本ドキュメントで consistency semantics / projection consistency / eventual consistency wording / visibility consistency を整理する。

この段階では実装しない。

### Step 1: Projection Consistency Review

確認:

- source of truth と projection / read model の責務が分かれているか
- projection inconsistency を source of truth error と断定していないか
- projection warning から rebuild / refresh を実行していないか

### Step 2: Stale vs Inconsistent Review

確認:

- stale warning と consistency warning が分かれているか
- stale + inconsistent の両方を表示できるか
- stale / inconsistent のどちらも execution trigger になっていないか

### Step 3: Partial / Cross-warehouse Consistency Review

確認:

- checked scope / unchecked scope が分かるか
- unknown を consistent と表示していないか
- cross-warehouse inconsistency を critical risk として強調しているか

### Step 4: Timeline / Snapshot Consistency Review

確認:

- timeline generated_at と event timestamp を分けているか
- missing event を audit warning として扱っているか
- snapshot consistency と current consistency を混同していないか

### Step 5: Visibility Consistency Review

確認:

- dashboard 間で同じ label を同じ意味で使っているか
- compare severity / recovery risk / observability health を混同していないか
- stale / partial / error / consistency warning の label が揃っているか

### Step 6: No Execution Consistency Review

確認:

- `consistent enough to execute` のような概念がないか
- inconsistency から correction / rebuild / replay / approval / retry に進んでいないか
- consistency warning が read-only signal として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B17-02 では、consistency semantics policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- consistency contract 実装
- consistency visualization 実装
- projection rebuild 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず consistency semantics を固定する必要がある
- stale / inconsistent / delayed / partial / unknown の意味を分ける必要がある
- compare / observability / recovery / trace の consistency meaning を混同しないための方針が必要である
- execution consistency を置かない方針を明確にする必要がある

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
- `docs/governance-dashboard-information-density-policy.md`
- `docs/governance-dashboard-navigation-workflow-policy.md`
- `docs/governance-dashboard-data-freshness-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard consistency semantics policy は、read-only governance dashboard 上の consistency signal を正しく解釈するための設計方針である。

projection consistency、eventual consistency wording、compare / snapshot / timeline consistency、stale vs inconsistent、partial / cross-warehouse consistency、audit limitation、visibility consistency を整理し、execution consistency を置かないことで、visibility と mutation の境界を守る。
