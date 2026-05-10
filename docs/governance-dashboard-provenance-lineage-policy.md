# Governance Dashboard Provenance and Lineage Policy（Phase B21-02）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の provenance semantics / lineage semantics / derived-from relationship / source provenance visibility を整理する。

Phase B21-01 では、warning / priority / confidence / uncertainty の理由を human understandable に説明し、rationale traceability を evidence / compare / timeline / snapshot / contract へ辿れるようにする方針を整理した。Phase B21-02 では、その前提を provenance / lineage の観点で補強し、dashboard 上の情報が「どの source / snapshot / compare / evidence / trace から派生したか」を説明できるようにする。

provenance / lineage は、source of truth を変更するための仕組みではない。read-only governance dashboard における review / investigation / audit のための参照情報であり、assignment mutation、approval mutation、correction、rebuild、replay、自動同期、execution button には接続しない。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・assignment mutation・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

provenance and lineage policy は、dashboard に表示される signal / summary / evidence / timeline が、どの data source と生成過程に基づくかを説明するための方針である。

基本方針:

- provenance は source / generated_at / query version / scope を説明する
- lineage は derived-from relationship を説明する
- lineage は review / investigation / audit の補助である
- lineage は correctness guarantee ではない
- source of truth と projection / snapshot / evidence / trace を混同しない
- lineage gap / unknown provenance を隠さない
- warehouse_code boundary を lineage 上でも維持する
- compare / observability / recovery の lineage semantics を分ける
- lineage reference は read-only navigation とする
- execution lineage を置かない

---

## ■ Provenance and Lineage Policy の目的

この policy の目的は、read-only governance dashboard 上の情報について、どこから来て、どのように派生し、どの範囲を代表しているかを説明できるようにすることである。

答えたい問い:

- この summary はどの source から作られたか
- この warning はどの compare result から派生したか
- この snapshot はいつ、どの条件で生成されたか
- この evidence はどの operation / incident / trace に紐づくか
- この timeline はどの request_id / trace_id / parent_trace_id を含むか
- この lineage は warehouse_code boundary を越えていないか
- lineage に missing / unknown / stale / partial があるか
- auditor が derived-from relationship を追えるか
- lineage が execution instruction に見えていないか

---

## ■ Provenance Semantics

provenance は、dashboard item の出所・生成条件・参照元を表す。

provenance に含める候補:

- source table / source view / source API
- source domain
- generated_at
- snapshot date
- query version
- contract version
- warehouse_code
- affected scope
- filter / search condition
- request_id / trace_id / parent_trace_id
- evidence_package_id
- incident_id / operation_id

方針:

- provenance は source of truth と read model を分けて表示する
- provenance が unknown の場合は limitation として表示する
- generated_at と source freshness を provenance の一部として扱う
- query version / contract version は将来の audit に備えて保持候補にする
- provenance から correction / rebuild / replay を実行しない

---

## ■ Lineage Semantics

lineage は、ある dashboard item がどの item / source / calculation / snapshot から派生したかを表す。

lineage に含める候補:

- source of truth row
- projection / read model row
- compare result
- daily snapshot
- trend calculation
- evidence package
- timeline event
- trace relation
- incident summary
- operation summary

方針:

- lineage は derived-from relationship として扱う
- lineage は causal proof ではない
- lineage は mutation history の代替ではない
- lineage は source of truth の上書き根拠にしない
- lineage reference は read-only drilldown / reference navigation とする

---

## ■ Derived-from Relationship

derived-from relationship は、dashboard 上の表示がどの元情報から生成・集計・関連付けされたかを示す。

代表例:

```text
inventory_transactions / pallet_transactions
  -> inventory_current / pallet_units / pallet_item_links
  -> compare result
  -> observability snapshot
  -> governance dashboard signal
```

derived-from に含める候補:

- direct source
- intermediate projection
- compare condition
- aggregation rule
- snapshot generation rule
- evidence relation
- trace relation
- limitation

方針:

- direct source と derived source を区別する
- derived item は source of truth と同一視しない
- derived-from chain が途切れる場合は lineage limitation として扱う
- derived-from relationship を execution workflow として表現しない
- chain 表示は review / investigation / audit のために使う

---

## ■ Snapshot Lineage

snapshot lineage は、historical observability snapshot がどの source / compare / metrics から生成されたかを説明する。

snapshot lineage に含める候補:

- snapshot date
- generated_at
- warehouse_code
- source query version
- compare target
- metric calculation version
- included severity counts
- included backlog counts
- included hotspot summary
- included trend input

方針:

- snapshot は read model / monitoring aggregate として扱う
- snapshot は source of truth ではない
- snapshot の欠落は business operation failure と断定しない
- snapshot lineage が stale / partial の場合は limitation を表示する
- snapshot lineage から automatic correction / rebuild / replay を実行しない

---

## ■ Compare Lineage

compare lineage は、compare result がどの source / projection / scope / calculation から作られたかを説明する。

compare lineage に含める候補:

- source of truth domain
- projection / read model
- compare target
- warehouse_code
- part_no / project_no / inventory_type / location_code
- pallet_code
- compare generated_at
- severity rule version
- reason_code rule version
- excluded / unknown scope

方針:

- compare result は difference visibility であり、原因確定ではない
- compare lineage は source of truth error を断定しない
- compare lineage gap は review limitation として扱う
- cross-warehouse lineage は強調する
- compare lineage から correction / rebuild / replay を実行しない

---

## ■ Evidence Lineage

evidence lineage は、evidence package / evidence summary がどの operation / incident / compare / trace から構成されたかを説明する。

evidence lineage に含める候補:

- evidence_package_id
- incident_id
- operation_id
- operation type
- approval reference
- dry-run result reference
- before / after compare reference
- post-compare reference
- screenshot / attachment reference
- warehouse boundary evidence
- generated_at / collected_at

方針:

- evidence lineage は audit support として扱う
- evidence available は correctness guarantee ではない
- evidence missing / partial は limitation として表示する
- evidence lineage は approval / execution state と混同しない
- evidence lineage から assignment mutation / approval mutation を実行しない

---

## ■ Trace Lineage

trace lineage は、request_id / trace_id / parent_trace_id の関係を使い、operation / event / transaction / timeline の派生関係を説明する。

trace lineage に含める候補:

- request_id
- trace_id
- parent_trace_id
- operation_id
- incident_id
- transaction id
- event timestamp
- source domain
- original trace reference
- replay trace reference
- correction / rebuild relation reference

方針:

- trace lineage は investigation / audit の補助軸である
- trace relation は causal proof ではない
- original trace と replay trace は分ける
- parent_trace_id は nullable / optional を前提に扱う
- missing trace relation は lineage limitation として扱う
- trace lineage から replay / rebuild / correction を実行しない

---

## ■ Source Provenance Visibility

source provenance visibility は、dashboard item がどの source layer から来ているかを見えるようにする方針である。

source layer 候補:

- source of truth
- projection / read model
- compare result
- snapshot / history
- evidence package
- trace timeline
- API response contract
- UI local state

方針:

- source layer を label / tooltip / detail で表示できるようにする
- UI local state は server persisted state と区別する
- projection / snapshot / evidence を source of truth と見せない
- source provenance が partial / unknown の場合は limitation を表示する
- source provenance visibility から execution affordance を出さない

表示候補:

- `Source: compare result`
- `Derived from: daily snapshot`
- `Based on: evidence package`
- `Trace relation: request_id + trace_id`
- `Provenance limitation`

---

## ■ Lineage Limitation

lineage limitation は、derived-from relationship を十分に説明できない状態である。

limitation 候補:

- source unknown
- generated_at missing
- query version unknown
- contract version unknown
- snapshot missing
- evidence missing
- trace relation missing
- parent_trace_id missing
- partial compare scope
- stale snapshot
- cross-warehouse boundary uncertain

方針:

- lineage limitation を隠さない
- lineage limitation は audit limitation として扱う
- limitation がある item を verified / resolved と断定しない
- lineage gap は investigation hint にできる
- lineage limitation から automatic recovery / sync を行わない

表示候補:

- `Lineage limitation`
- `Source provenance unknown`
- `Derived-from chain incomplete`
- `Trace relation missing`
- `Snapshot lineage stale`
- `Additional review recommended`

---

## ■ Audit Lineage

audit lineage は、後から dashboard signal / evidence / decision support の由来を説明できるようにするための方針である。

auditor が確認したい lineage:

- which source generated this signal
- which snapshot / compare result was used
- which evidence package supported this view
- which trace / request chain was referenced
- which warehouse_code scope was included
- which scope was excluded / unknown
- when the data was generated
- which limitation remained

方針:

- audit lineage は read-only reference とする
- audit lineage は source of truth の代替ではない
- lineage history と execution history を混同しない
- audit lineage gap は audit limitation として記録候補にする
- audit lineage から correction / rebuild / replay を実行しない

---

## ■ Compare / Observability / Recovery Lineage Separation

compare / observability / recovery は、lineage の意味が異なる。

| Area | Lineage focus | 誤解しないこと |
| --- | --- | --- |
| Compare | source / projection / diff calculation の派生関係 | cause confirmed ではない |
| Observability | snapshot / backlog / hotspot / trend の派生関係 | recovery completed ではない |
| Recovery | incident / operation / evidence / lifecycle の参照関係 | execution permission ではない |
| Trace | request_id / trace_id / parent_trace_id の関係 | replay permission ではない |

方針:

- compare lineage と recovery evidence lineage を混同しない
- observability lineage と incident resolution lineage を混同しない
- recovery lineage と execution history を混同しない
- trace lineage と replay lineage を混同しない
- dashboard 間 link から execution しない

---

## ■ Lineage Visualization Policy

lineage visualization は、derived-from relationship を読みやすく表示するための方針である。

表示候補:

- `Source provenance`
- `Derived from`
- `Lineage`
- `Lineage limitation`
- `Related snapshot`
- `Related compare result`
- `Related evidence`
- `Related trace`
- `Generated at`
- `Query version`

方針:

- lineage は short summary + detail reference とする
- chain 表示は source / derived / limitation を分ける
- color だけに依存しない
- lineage reference は read-only navigation とする
- lineage link を action button にしない
- lineage visualization から execution affordance を出さない

例:

```text
[LINEAGE]
Source: compare result
Derived from: inventory_current and pallet_item_links
Generated at: 2026-05-10T10:00:00Z
Limitation: source query version is not recorded.
This is a read-only lineage reference. No execution action is available here.
```

---

## ■ Execution Lineage を置かない方針

read-only governance dashboard では、execution lineage を置かない。

置かない概念:

- lineage says rebuild
- lineage says replay
- lineage says approve
- derived-from chain means safe to execute
- provenance complete means execute
- snapshot lineage means auto sync
- trace lineage means replay eligible
- evidence lineage means operation correct

理由:

- lineage は read-only review / investigation / audit のための参照関係である
- lineage は causal proof や execution permission ではない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を lineage だけで保証できない
- lineage を execution trigger にすると監査性が弱くなる

代替表現:

- `Source provenance`
- `Derived from`
- `Lineage reference`
- `Lineage limitation`
- `Human review recommended`
- `Read-only lineage`

---

## ■ 導入段階案

### Step 0: Provenance and Lineage Policy の明文化

本ドキュメントで provenance semantics / lineage semantics / derived-from relationship / source provenance visibility を整理する。

この段階では実装しない。

### Step 1: Source Provenance Review

確認:

- source of truth / projection / snapshot / evidence / trace が区別されているか
- generated_at / query version / contract version の扱いが説明されているか
- UI local state を server persisted state と混同していないか

### Step 2: Derived-from Relationship Review

確認:

- direct source と derived source が分かれているか
- derived-from chain の missing / unknown が limitation として表示されるか
- derived-from relationship が execution workflow に見えていないか

### Step 3: Snapshot / Compare / Evidence / Trace Lineage Review

確認:

- snapshot lineage が source of truth と混同されていないか
- compare lineage が cause confirmed として扱われていないか
- evidence lineage が correctness guarantee として扱われていないか
- trace lineage が replay permission として扱われていないか

### Step 4: Lineage Limitation Review

確認:

- source unknown / generated_at missing / query version unknown を隠していないか
- lineage gap を audit limitation として扱っているか
- limitation がある item を verified / resolved と断定していないか

### Step 5: Audit Lineage Review

確認:

- auditor が source / snapshot / compare / evidence / trace を追えるか
- warehouse_code scope と excluded / unknown scope を説明できるか
- lineage history と execution history を混同していないか

### Step 6: No Execution Lineage Review

確認:

- `lineage says rebuild` のような概念がないか
- lineage から correction / rebuild / replay / approval / retry に進んでいないか
- lineage reference が read-only navigation として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B21-02 では、provenance and lineage policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- lineage contract 実装
- provenance visualization 実装
- assignment mutation
- approval mutation
- execution button
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず provenance / lineage semantics を固定する必要がある
- source provenance と derived-from relationship を read-only governance に組み込む必要がある
- lineage limitation と audit lineage を明確にする必要がある
- execution lineage を置かない方針を明確にする必要がある

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
- `docs/governance-dashboard-consistency-semantics-policy.md`
- `docs/governance-dashboard-trust-confidence-policy.md`
- `docs/governance-dashboard-ambiguity-uncertainty-policy.md`
- `docs/governance-dashboard-prioritization-attention-policy.md`
- `docs/governance-dashboard-escalation-coordination-policy.md`
- `docs/governance-dashboard-review-investigation-heuristics-policy.md`
- `docs/governance-dashboard-cognitive-load-safety-policy.md`
- `docs/governance-dashboard-explainability-rationale-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard provenance and lineage policy は、read-only governance dashboard 上の signal / summary / evidence / timeline がどの source から派生したかを、人間が理解し監査時に説明できるようにするための設計方針である。

provenance semantics、lineage semantics、derived-from relationship、snapshot / compare / evidence / trace lineage、source provenance visibility、lineage limitation、audit lineage を整理し、execution lineage を置かないことで、visibility と mutation の境界を守る。
