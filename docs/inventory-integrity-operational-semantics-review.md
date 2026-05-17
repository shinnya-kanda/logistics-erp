# Inventory Integrity Operational Semantics Review

Phase B34-02 inventory integrity operational semantics review.

この文書は、inventory integrity / governance visualization / operational comprehension における operational semantics を整理し、所長・事務・現場・監査が integrity information を運用上どのように扱うかを明確にするための semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、operational workflow 実装、execution workflow 実装、auto-operation、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- operational semantics は reasoning / review / comprehension / traceability のための read-only semantics である。
- operational metadata は truth guarantee ではない。
- stale / partial / delayed operational state を前提にする。
- operational visualization を execution workflow と混同しない。
- operational semantics は execution authority を持たない。
- operational semantics は rebuild、compare execution、replay、correction、operational workflow、execution workflow、auto-operation、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityOperationalSemantics

`InventoryIntegrityOperationalSemantics` は、inventory integrity information を所長・事務・現場・監査が運用上安全に読めるようにする conceptual semantics である。

含むべき意味:

- operational visibility semantics
- operational attention semantics
- operational escalation semantics
- operational review semantics
- operational stale handling semantics
- operational traceability semantics
- operational readability semantics
- operational limitation
- operational consistency
- role-oriented operational semantics
- raw source / adapter / projection / graph / operational boundary
- non-execution caveat

含まない意味:

- operational workflow
- execution workflow
- assignment creation
- notification sending
- approval mutation
- auto-operation
- executable command
- rebuild plan execution
- correction command
- replay command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityOperationalSemantics は「運用上どう読めるか」を示す意味整理であり、「誰が何を実行するか」を示す workflow object ではない。

## Operational Visibility Semantics

operational visibility は、所長・事務・現場・監査が運用上確認すべき integrity information を見えるようにする semantics である。

visibility 対象:

- inventory compare mismatch
- expected quantity / cached quantity difference
- affected warehouse / location / project
- affected part / pallet / lot
- source transaction coverage
- snapshot / compare freshness
- evidence quality
- lineage completeness
- review lifecycle state
- escalation level
- attention signal
- governance boundary
- limitation

operational visibility が意味しないこと:

- assignment created
- notification sent
- operation started
- incident confirmed
- source of truth confirmation
- correction required
- rebuild required
- execution permission

operational visibility は運用上の理解を補助する read-only visibility であり、operational workflow の開始ではない。

## Operational Attention Semantics

operational attention は、運用上見落としや誤読を防ぐために注意して読むべき signal を示す。

attention 対象:

- high difference quantity
- negative quantity related mismatch
- stale / partial / delayed caveat
- unresolved review signal
- low confidence compare
- evidence gap
- lineage gap
- cross-warehouse / cross-location relation
- pallet relation mismatch
- governance boundary warning

operational attention の注意点:

- attention は human review priority であり execution priority ではない。
- critical / high attention は execute now ではない。
- attention は assignment / notification / approval を意味しない。
- attention high は correction required ではない。
- attention は source of truth error の確定ではない。

operational attention は、所長・事務・現場・監査が「見落とさない方がよい」候補を読むための補助である。

## Operational Escalation Semantics

operational escalation は、運用上どの関係者が注意して読むべきかを示す管理上の visibility である。

escalation level:

- `reference`
- `watch`
- `review`
- `manager-review`
- `audit-review`
- `critical-review`

運用上の読み方:

- `reference`: 通常確認の補助として読む。
- `watch`: 差異や制限を見落とさないように読む。
- `review`: 事務または担当者が優先して確認する候補として読む。
- `manager-review`: 所長・管理者が状況把握すべき候補として読む。
- `audit-review`: 監査観点で evidence / trace / lineage を確認すべき候補として読む。
- `critical-review`: 強い注意表示が必要な候補として読む。

operational escalation の注意点:

- escalation は execution authority ではない。
- manager-review は assignment created ではない。
- audit-review は audit started ではない。
- critical-review は execute now ではない。
- escalation は異常確定ではない。

## Operational Review Semantics

operational review は、差異・証跡・由来・制限が運用上どの確認状態として読めるかを示す。

operational review で参照する state:

- `detected`
- `observed`
- `reviewing`
- `needs-evidence`
- `pending`
- `stale`
- `resolved`
- `rejected`
- `ignored`

operational review の注意点:

- review state は operational workflow state ではない。
- `resolved` は truth guarantee ではない。
- `pending` は assignment queue ではない。
- `needs-evidence` は evidence fetch command ではない。
- `stale` は rebuild required ではない。
- `ignored` は safe guarantee ではない。

operational review は、所長・事務・現場・監査が「今どの確認状態として読めるか」を揃えるための signal である。

## Operational Stale Handling Semantics

operational stale handling は、古い snapshot / compare / evidence / review に基づく operational state をどう扱うかを示す。

stale 対象:

- source freshness
- adapter normalization freshness
- projection freshness
- graph freshness
- snapshot freshness
- compare freshness
- evidence freshness
- review freshness
- escalation freshness
- operational visibility freshness

扱い:

- stale は operational limitation として表示する。
- stale は `inventory_transactions` が誤っていることを意味しない。
- stale は `inventory_current` 更新の許可ではない。
- stale は rebuild / replay / compare execution / correction の開始条件ではない。
- stale は「最新 context で再確認した方がよい可能性」として読む。

推奨 wording:

- operational 表示は生成時点の reasoning / visibility 表示です。
- 最新 transaction 反映とは限りません。
- stale は運用上の確認制限であり、実行指示ではありません。

## Operational Traceability Semantics

operational traceability は、運用上の説明・確認・引き継ぎのために、source / projection / graph / review / evidence のつながりを追える状態を示す。

traceability 対象:

- `inventory_transactions` reference
- transaction event time / recorded_at
- aggregation effect reference
- snapshot id / as_of_time
- compare id / compared_at
- evidence reference
- trace id / request id / parent trace id
- pallet relation reference
- review state reference
- escalation reference

operational traceability の注意点:

- traceability complete は operation correct ではない。
- trace relation は causal proof ではない。
- parent_trace_id は approval hierarchy ではない。
- trace gap は correction required ではない。
- traceability は replay permission ではない。

operational traceability は説明と確認の補助であり、execution workflow の dependency graph ではない。

## Operational Readability Semantics

operational readability は、所長・事務・現場・監査が短時間で「何を見ているか」「何が重要か」「何が制限か」「何を実行しないか」を理解できる状態を示す。

読みやすくする観点:

- affected scope
- attention / severity summary
- review state
- escalation level
- stale / partial caveat
- evidence quality
- lineage completeness
- traceability reference
- role-oriented note
- read-only / no-execution caveat

読み方:

- readability は operator safety quality である。
- readability high は correctness guarantee ではない。
- readable attention は action instruction ではない。
- readable escalation は assignment ではない。
- readable traceability は replay eligibility ではない。

operational readability は運用上の comprehension を補助する。実行許可や修正指示として表示しない。

## Operational Limitation

operational semantics には limitation がある。

- source coverage が partial の場合、operational visibility を確定できない。
- stale / delayed / partial operational state は通常の前提として扱う必要がある。
- evidence confidence が low / unknown の場合、operational metadata を過信できない。
- lineage gap がある場合、運用上の説明は部分的になる。
- snapshot / compare / evidence の scope がずれている場合、operational state の読み方に caveat が必要になる。
- review state / escalation は operational workflow や assignment と誤読されやすい。
- traceability は causal proof や replay eligibility と誤読されやすい。
- role-oriented visibility は権限付与や担当割当と誤読されやすい。
- operational metadata は truth guarantee ではない。
- operational visibility は source of truth の代替ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は inventory integrity / compare / governance visualization で明示する。limitation は execution permission ではない。

## Operational Consistency

operational consistency は、operational visibility / attention / escalation / review / traceability が同じ scope / time / source / limitation で読めるかを示す review signal である。

確認観点:

- operational visibility と affected scope が一致しているか。
- attention と limitation が同じ source / projection を参照しているか。
- escalation と review state が同じ caveat を持つか。
- stale handling と snapshot / compare freshness が説明できるか。
- traceability と evidence が同じ request / trace context を参照しているか。
- role-oriented note が assignment / execution expectation を生んでいないか。
- cross-warehouse / cross-location relation が過剰な断定になっていないか。
- governance boundary が operational execution expectation を遮断しているか。

operational consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- operation completed
- assignment completed
- correction required
- rebuild required
- execution permission

## Role-Oriented Operational Semantics

role-oriented operational semantics は、同じ integrity information を役割ごとにどう読むべきかを分ける。

### Manager

manager は、現場影響・説明責任・管理上の注意優先度として読む。

読む観点:

- affected warehouse / location / project
- affected quantity range
- severity / attention summary
- unresolved / stale signal
- cross-warehouse / cross-location signal
- audit escalation overlap

意味しないこと:

- assignment created
- execute now
- correction authority
- rebuild authority

### Office

office は、事務確認・帳票説明・照会対応のための review visibility として読む。

読む観点:

- part / pallet / lot scope
- expected / cached difference
- review state
- evidence / lineage limitation
- stale / partial caveat
- related traceability reference

意味しないこと:

- correction command
- workflow queue
- notification required
- `inventory_current` update permission

### Worker

worker は、現場作業そのものではなく、現場説明や確認補助として読む。

読む観点:

- affected location
- affected pallet / part
- attention reason
- stale / partial caveat
- source / derived distinction
- no-execution caveat

意味しないこと:

- picking / moving / adjustment instruction
- immediate physical inventory action
- correction required
- safe to ignore

### Audit / Review

audit / review は、証跡・由来・説明責任・内部統制上の確認材料として読む。

読む観点:

- source transaction evidence
- signed quantity evidence
- lineage completeness
- trace / request id relation
- review lifecycle state
- escalation reason
- audit limitation

意味しないこと:

- audit started
- audit completed
- replay eligibility
- causal proof
- operation correct

## Raw Source / Adapter / Projection / Graph / Operational Boundary

raw source / adapter / projection / graph / operational は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> operational semantics
  -> operational / governance comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- operational semantics: 所長・事務・現場・監査が integrity information を安全に読む semantics。execution workflow ではない。
- operational / governance comprehension: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B34-02 は inventory integrity operational semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- operational workflow 実装
- execution workflow 実装
- auto-operation 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

operational semantics は execution authority ではない。operational semantics は reasoning / review / comprehension のために、operational visibility / attention / escalation / review / stale handling / traceability / readability / limitation / consistency / role-oriented semantics / raw source boundary を説明する conceptual semantics である。
