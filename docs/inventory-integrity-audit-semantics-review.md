# Inventory Integrity Audit Semantics Review

Phase B34-01 inventory integrity audit semantics review.

この文書は、inventory integrity / governance visualization / reasoning graph における audit semantics を整理し、監査・棚卸・内部統制・説明責任の観点で integrity information をどのように扱うかを明確にするための semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、audit workflow 実装、audit execution 実装、auto-audit、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- audit は reasoning / review / traceability / explanation responsibility のための read-only semantics である。
- audit metadata は truth guarantee ではない。
- stale / partial / delayed audit state を前提にする。
- audit visualization を execution workflow と混同しない。
- audit semantics は execution authority を持たない。
- audit semantics は rebuild、compare execution、replay、correction、audit execution、auto-audit、auto-fix、workflow、mutation を開始しない。

## Concept: InventoryIntegrityAuditSemantics

`InventoryIntegrityAuditSemantics` は、inventory integrity information を監査・棚卸・内部統制・説明責任の文脈で安全に読めるようにする conceptual semantics である。

含むべき意味:

- audit visibility semantics
- audit evidence semantics
- audit confidence semantics
- audit lineage semantics
- audit stale state semantics
- audit review state semantics
- audit escalation semantics
- audit traceability semantics
- audit readability semantics
- audit limitation
- audit consistency
- raw source / adapter / projection / graph / audit boundary
- non-execution caveat

含まない意味:

- audit workflow
- audit execution
- audit approval mutation
- audit assignment
- audit notification
- auto-audit
- executable command
- rebuild plan execution
- correction command
- replay command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityAuditSemantics は「監査観点で何をどう読めるか」を示す意味整理であり、「監査を開始する」「修正する」「再構築する」ための実行 object ではない。

## Audit Visibility Semantics

audit visibility は、監査・棚卸・内部統制・説明責任の観点で、どの integrity information を確認対象として見えるようにするかを示す。

visibility 対象:

- inventory compare mismatch
- expected quantity / cached quantity difference
- source transaction coverage
- snapshot / compare freshness
- evidence quality
- lineage completeness
- review lifecycle state
- escalation level
- attention signal
- governance boundary
- limitation

audit visibility が意味しないこと:

- audit started
- audit completed
- incident confirmed
- source of truth confirmation
- correction required
- rebuild required
- execution permission

audit visibility は、監査観点で確認しやすくするための read-only visibility であり、audit workflow の開始ではない。

## Audit Evidence Semantics

audit evidence は、監査・棚卸・説明責任のために integrity information をどう読めるかを支える根拠である。

evidence 対象:

- source transaction evidence
- signed quantity evidence
- snapshot evidence
- compare evidence
- cache observation evidence
- trace / request id evidence
- pallet relation evidence
- review lifecycle evidence
- escalation evidence
- limitation evidence

audit evidence の注意点:

- evidence available は correctness guarantee ではない。
- evidence completeness は audit completed ではない。
- evidence missing は upload action required ではない。
- evidence confidence low / unknown は automatic correction ではない。
- evidence は `inventory_transactions` の代替 truth ではない。

audit evidence は review / investigation / audit の説明材料であり、correction / rebuild / replay の実行指示ではない。

## Audit Confidence Semantics

audit confidence は、監査観点で integrity information をどの程度説明可能に読めるかを示す。

confidence に影響する要素:

- source coverage
- transaction completeness
- aggregation unit alignment
- snapshot alignment
- compare consistency
- evidence quality
- lineage completeness
- traceability completeness
- stale / partial / delayed caveat
- ADJUST / CANCEL / MOVE semantics clarity
- pallet / lot / location / project boundary clarity

audit confidence の注意点:

- high confidence は truth guarantee ではない。
- high confidence は safe to execute ではない。
- high confidence は audit completed ではない。
- low confidence は wrong data の確定ではない。
- unknown confidence は safe to ignore ではない。

audit confidence は監査上の読みやすさ・説明可能性の signal であり、execution authority ではない。

## Audit Lineage Semantics

audit lineage は、audit visibility / evidence / review / escalation がどの source / projection / graph relation に由来するかを示す。

lineage 対象:

- source transaction relation
- aggregation effect relation
- snapshot relation
- compare relation
- evidence relation
- review state relation
- escalation relation
- attention relation
- trace id / request id / parent trace id
- parent / child projection relation

audit lineage の注意点:

- lineage complete は permission granted ではない。
- trace relation は replay eligibility ではない。
- dependency は execution dependency ではない。
- lineage gap は correction command ではない。
- lineage は source of truth confirmation ではない。

audit lineage は、説明責任と追跡可能性を補助する read-only relation である。

## Audit Stale State Semantics

audit stale state は、audit visibility / evidence / review / escalation が古い snapshot や delayed source に基づく可能性を示す。

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
- audit visibility freshness

扱い:

- stale は audit limitation として表示する。
- stale は `inventory_transactions` が誤っていることを意味しない。
- stale は `inventory_current` 更新の許可ではない。
- stale は rebuild / replay / compare execution / correction の開始条件ではない。
- stale は監査上「最新 context で再確認した方がよい可能性」として読む。

推奨 wording:

- audit 表示は生成時点の reasoning / traceability 表示です。
- 最新 transaction 反映とは限りません。
- stale は監査上の確認制限であり、実行指示ではありません。

## Audit Review State Semantics

audit review state は、差異・証跡・由来・制限が監査観点でどの確認状態として読めるかを示す。

audit review で参照する state:

- `detected`
- `observed`
- `reviewing`
- `needs-evidence`
- `pending`
- `stale`
- `resolved`
- `rejected`
- `ignored`

audit review state の注意点:

- review state は audit workflow state ではない。
- `resolved` は truth guarantee ではない。
- `pending` は assignment queue ではない。
- `needs-evidence` は evidence fetch command ではない。
- `stale` は rebuild required ではない。
- `ignored` は safe guarantee ではない。

audit review state は、監査・棚卸・内部統制で「どの確認状態として読めるか」を揃えるための signal である。

## Audit Escalation Semantics

audit escalation は、監査観点で evidence / lineage / trace / limitation を重点確認すべき状態を示す。

audit escalation が必要に見える例:

- evidence confidence が low / unknown である。
- lineage gap がある。
- CANCEL target が不明である。
- ADJUST semantics が差分か絶対値か不明である。
- negative quantity が説明しきれない。
- review state が stale / unresolved のまま残っている。
- compare mismatch が長期間続いている。
- cross-warehouse / cross-location relation が説明しきれない。
- trace / request id relation に gap がある。

audit escalation の注意点:

- audit escalation は audit started ではない。
- audit-review は assignment created ではない。
- escalation level は execution priority ではない。
- critical-review は execute now ではない。
- escalation は異常確定ではない。

audit escalation は、監査観点で注意して読むべきことを示す reasoning / visualization であり、approval、assignment、notification、correction を作らない。

## Audit Traceability Semantics

audit traceability は、監査・棚卸・説明責任のために、source / projection / graph / review / evidence のつながりを追える状態を示す。

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

audit traceability の注意点:

- traceability complete は operation correct ではない。
- trace relation は causal proof ではない。
- parent_trace_id は approval hierarchy ではない。
- trace gap は correction required ではない。
- traceability は replay permission ではない。

audit traceability は説明責任の補助であり、execution workflow の dependency graph ではない。

## Audit Readability Semantics

audit readability は、監査側が evidence / lineage / trace / limitation を安全に確認できる読みやすさである。

読みやすくする観点:

- source transaction evidence
- signed quantity evidence
- snapshot evidence
- compare evidence
- cache observation evidence
- trace / request id evidence
- lineage completeness
- evidence gap
- stale / partial limitation
- cross-projection audit gap
- read-only / no-execution caveat

読み方:

- audit visibility は audit started ではない。
- evidence available は correctness guarantee ではない。
- lineage complete は replay eligibility ではない。
- trace relation は causal proof ではない。
- audit attention は correction / rebuild / replay の実行指示ではない。

audit readability は、監査観点で説明材料を読みやすくするための semantics であり、監査実行や承認状態を表さない。

## Audit Limitation

audit semantics には limitation がある。

- source coverage が partial の場合、audit visibility を確定できない。
- stale / delayed / partial audit state は通常の前提として扱う必要がある。
- evidence confidence が low / unknown の場合、audit metadata を過信できない。
- lineage gap がある場合、説明責任の根拠は部分的になる。
- snapshot / compare / evidence の scope がずれている場合、audit state の読み方に caveat が必要になる。
- review state / escalation は audit workflow や assignment と誤読されやすい。
- traceability は causal proof や replay eligibility と誤読されやすい。
- audit metadata は truth guarantee ではない。
- audit visibility は source of truth の代替ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は inventory integrity / compare / governance visualization で明示する。limitation は execution permission ではない。

## Audit Consistency

audit consistency は、audit visibility / evidence / confidence / lineage / review / escalation / traceability が同じ scope / time / source / limitation で読めるかを示す review signal である。

確認観点:

- audit visibility と source coverage が一致しているか。
- evidence reference と lineage reference が同じ source range を参照しているか。
- confidence と limitation が矛盾していないか。
- stale state と snapshot / compare freshness が説明できるか。
- review state と escalation が同じ caveat を持つか。
- traceability と evidence が同じ request / trace context を参照しているか。
- cross-warehouse / cross-location relation が過剰な断定になっていないか。
- governance boundary が audit execution expectation を遮断しているか。

audit consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- audit completed
- audit approved
- correction required
- rebuild required
- execution permission

## Raw Source / Adapter / Projection / Graph / Audit Boundary

raw source / adapter / projection / graph / audit は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> audit semantics
  -> audit / inventory / governance review
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- audit semantics: 監査・棚卸・内部統制・説明責任の観点で integrity information を安全に読む semantics。execution workflow ではない。
- audit / inventory / governance review: human review / investigation / audit の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B34-01 は inventory integrity audit semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- audit workflow 実装
- audit execution 実装
- auto-audit 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

audit semantics は execution authority ではない。audit semantics は reasoning / review / traceability のために、audit visibility / evidence / confidence / lineage / stale state / review state / escalation / traceability / readability / limitation / consistency / raw source boundary を説明する conceptual semantics である。
