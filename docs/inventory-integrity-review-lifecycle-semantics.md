# Inventory Integrity Review Lifecycle Semantics

Phase B32-05 inventory integrity review lifecycle semantics.

この文書は、inventory integrity / compare / governance reasoning における review lifecycle semantics を整理し、「差異確認がどの状態にあるか」を明確にするための semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、workflow、assignment、notification、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- review lifecycle は inventory integrity / compare / evidence / governance visualization のための read-only reasoning state である。
- review state は正しさの保証ではない。
- `resolved` は truth guarantee ではない。
- stale / delayed / partial review を前提にする。
- review は execution authority を持たない。
- review lifecycle は rebuild、compare execution、replay、correction、workflow、assignment、notification、mutation を開始しない。

## Concept: InventoryIntegrityReviewLifecycle

`InventoryIntegrityReviewLifecycle` は、inventory compare / integrity signal / evidence / lineage / attention が、人による確認の中でどの状態にあるかを説明する概念である。

含むべき意味:

- review id
- review state
- compare reference
- snapshot reference
- evidence reference
- lineage reference
- attention / review signal
- freshness state
- limitation
- reviewer-facing note
- non-execution boundary

含まない意味:

- operation state
- workflow state
- assignment state
- notification state
- approval state
- correction state
- rebuild state
- source of truth confirmation
- execution authority

InventoryIntegrityReviewLifecycle は「確認上どう読めるか」を示す表示状態であり、「何を実行するか」を示す状態ではない。

## Review State Semantics

review state は、差異確認や integrity signal の確認状態を示す。各 state は review / investigation / audit の補助であり、operation lifecycle や execution workflow ではない。

| State | 意味 | 意味しないこと |
| --- | --- | --- |
| `detected` | compare / integrity signal の候補が見つかった | incident confirmed、execution trigger |
| `observed` | 人または dashboard が表示上の差異を観測した | cause confirmed、source error confirmed |
| `reviewing` | 差異、evidence、lineage、snapshot を確認中 | assignment、approval、correction in progress |
| `needs-evidence` | 追加証跡や説明が必要な状態 | evidence fetch execution、証跡追加指示 |
| `pending` | 確認待ちまたは保留中 | workflow queue、担当割当、通知待ち |
| `stale` | review context が古い可能性がある | source error、rebuild required |
| `resolved` | review 上は一旦説明可能または確認済み | truth guarantee、correction completed |
| `rejected` | この差異候補を review 上は採用しない | source transaction deletion、error absence guarantee |
| `ignored` | 現時点では確認対象から外している | safe guarantee、permanent suppression |

state は category + caveat で読む。state 名だけで実行判断しない。

## Review Freshness

review freshness は、review state がどの程度新しい context に基づくかを示す。

分けるべき freshness:

- source freshness: `inventory_transactions` の対象範囲がどこまで含まれているか。
- snapshot freshness: aggregation / compare snapshot がどの時点のものか。
- compare freshness: expected / cached quantity の比較がどの時点のものか。
- evidence freshness: 証跡がいつ時点の情報か。
- review freshness: 人がいつ確認したか。
- governance projection freshness: dashboard 表示がいつ生成されたか。

freshness が高いことは correctness guarantee ではない。freshness が低いことは source error の確定ではない。freshness は review limitation を読むための情報であり、execution permission ではない。

## Stale Review

stale review は、review state や review note が古い snapshot / compare / evidence に基づいている可能性がある状態である。

扱い:

- stale は review limitation として表示する。
- stale review は `inventory_transactions` が誤っていることを意味しない。
- stale review は `inventory_current` 更新の許可ではない。
- stale review は rebuild / replay / compare execution / correction の開始条件ではない。
- stale review は governance visualization で caveat として表示する。

推奨 wording:

- 確認状態は過去 snapshot に基づく可能性があります。
- stale は確認制限であり、実行指示ではありません。
- 最新 transaction 反映とは限りません。

避ける wording:

- rebuild now
- correction required
- source of truth failed
- safe to execute

## Unresolved Review

unresolved review は、差異候補や integrity signal がまだ十分に説明できていない状態である。

原因例:

- compare confidence が low / unknown である。
- evidence が不足している。
- lineage gap がある。
- snapshot が partial / stale である。
- ADJUST / CANCEL / MOVE の semantics が曖昧である。
- pallet relation が部分的である。
- aggregation unit が揃っていない。

unresolved は review limitation であり、automatic remediation ではない。未解決であることは、workflow 実行、assignment、notification、correction、rebuild の許可ではない。

## Review Evidence

review evidence は、review state をどう読めるかを説明する根拠である。

含む観点:

- source transaction evidence
- compare evidence
- snapshot evidence
- signed quantity evidence
- trace / request id evidence
- pallet relation evidence
- cache observation evidence
- freshness evidence
- limitation evidence

evidence があることは correctness guarantee ではない。evidence が不足していることは automatic correction の指示ではない。`needs-evidence` は証跡取得実行ではなく、review 上の制限表示である。

## Review Lineage

review lineage は、review state がどの compare result / snapshot / transaction / evidence / attention signal に由来するかを示す。

確認観点:

- review state はどの compare projection に基づくか。
- expected quantity はどの `inventory_transactions` 範囲から導出されたか。
- cached quantity はどの `inventory_current` observation から来たか。
- snapshot / evidence / attention が同じ scope を見ているか。
- state transition に見える変化が実行状態遷移ではないことを説明できるか。

lineage は reasoning visualization であり、execution dependency ではない。lineage が揃っていても replay eligibility ではなく、lineage gap があっても correction command ではない。

## Review Attention

review attention は、差異確認で見落としや誤読を防ぐための signal である。

attention の例:

- high difference quantity
- stale review
- unresolved review
- low confidence compare
- needs-evidence
- ambiguous ADJUST / CANCEL / MOVE semantics
- negative quantity related mismatch
- pallet relation mismatch
- cross-projection review gap

attention は human review の補助であり、assignment、notification、approval、execution priority ではない。`pending` も workflow queue ではなく、確認文脈上の保留表示である。

## Governance Visualization との関係

governance visualization は、review lifecycle を使って「差異確認がどの状態にあるか」「どの limitation があるか」「どの evidence が足りないか」を説明する。

扱うもの:

- review state
- review freshness
- stale / partial / unresolved caveat
- evidence quality
- lineage completeness
- compare confidence
- attention / review signal
- limitation
- read-only boundary

扱わないもの:

- workflow execution
- assignment
- notification
- rebuild approval
- correction approval
- replay operation
- DB update decision
- `inventory_current` update

governance visualization は review / investigation / audit の補助であり、operation correctness や execution permission を保証しない。

## Review Limitation

review lifecycle には limitation がある。

- review state は source of truth confirmation ではない。
- `resolved` は truth guarantee ではない。
- `rejected` は error absence guarantee ではない。
- `ignored` は safe guarantee ではない。
- `pending` は workflow queue ではない。
- stale / delayed / partial review は通常の前提として扱う必要がある。
- evidence confidence が low / unknown の場合、review state を過信できない。
- lineage gap がある場合、state の由来説明が部分的になる。
- snapshot / compare / evidence の scope がずれている場合、review state の読み方に caveat が必要になる。

limitation は inventory integrity / compare / governance visualization で明示する。limitation は execution permission ではない。

## Review Lifecycle を過信しない方針

review lifecycle は、確認状態を安全に読むための review signal である。

過信しないための原則:

- detected は incident confirmed ではない。
- observed は cause confirmed ではない。
- reviewing は workflow in progress ではない。
- needs-evidence は evidence fetch command ではない。
- pending は assignment queue ではない。
- stale は rebuild required ではない。
- resolved は truth guarantee ではない。
- rejected は source error が存在しない保証ではない。
- ignored は safe guarantee ではない。
- review state から direct mutation を開始しない。

review lifecycle は、review / investigation / audit の優先度や読み方を補助する。実行判断そのものではない。

## Non-Execution Boundary

B32-05 は inventory integrity review lifecycle semantics のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- workflow 実装
- assignment 実装
- notification 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

review lifecycle は execution authority ではない。review lifecycle は reasoning / review / visualization のために、review state / freshness / stale review / unresolved review / evidence / lineage / attention / limitation を説明する conceptual boundary である。
