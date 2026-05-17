# Inventory Integrity Escalation Semantics

Phase B32-06 inventory integrity escalation semantics.

この文書は、inventory integrity / compare reasoning / governance visualization における escalation semantics を整理し、「どの差異を誰が重要視すべきか」を明確にするための semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、workflow、assignment、notification、auto-escalation、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- escalation は reasoning / review / visualization 用の管理上の注意優先度である。
- escalation は異常確定ではない。
- escalation は assignment、notification、approval、workflow state ではない。
- stale / delayed / partial review を前提にする。
- escalation は execution authority を持たない。
- escalation は rebuild、compare execution、replay、correction、workflow、assignment、notification、auto-escalation、mutation を開始しない。

## Concept: InventoryIntegrityEscalation

`InventoryIntegrityEscalation` は、inventory compare / integrity signal / review lifecycle / evidence / lineage / attention の中で、どの差異や制限をどの関係者が重要視すべきかを説明する概念である。

含むべき意味:

- escalation id
- escalation level
- target audience
- compare reference
- review state reference
- evidence reference
- lineage reference
- attention signal
- freshness / staleness caveat
- limitation
- non-execution boundary

含まない意味:

- workflow state
- assignment state
- notification state
- approval state
- correction state
- rebuild state
- source of truth confirmation
- execution authority

InventoryIntegrityEscalation は「誰が注意して読むべきか」を示す表示状態であり、「誰にタスクを割り当てたか」や「何を実行するか」を示す状態ではない。

## Escalation Level

escalation level は、管理上どの程度注意して見るべきかを示す分類である。

候補:

- `reference`: 参考表示。通常確認の補助として読む。
- `watch`: 注意表示。差異や制限を見落とさないようにする。
- `review`: 担当者または事務側が優先して確認する候補。
- `manager-review`: 所長・管理者が状況を把握すべき候補。
- `audit-review`: 監査観点で evidence / trace / lineage を確認すべき候補。
- `critical-review`: 数量差異、境界ずれ、cross-warehouse など、強い注意表示が必要な候補。

level は human review priority であり、execution priority ではない。高い level でも correction、rebuild、notification、assignment は開始しない。

## Severity Escalation

severity escalation は、compare mismatch / integrity signal の重要度を管理上の注意優先度へ変換して読むための semantics である。

severity escalation が上がる要因:

- difference quantity が大きい。
- negative quantity に関係する。
- ADJUST / CANCEL / MOVE の解釈が曖昧である。
- aggregation unit が warehouse / project / part / location / pallet / lot でずれている。
- `inventory_current` cache と transaction aggregation の差異が継続している。
- evidence confidence が low / unknown である。
- lineage gap がある。

severity escalation は異常確定ではない。severity が高くても source of truth error とは断定しない。

## Stale Escalation

stale escalation は、古い snapshot / compare / review state に基づく差異や注意表示を、管理上どう扱うかを示す。

扱い:

- stale は review limitation として表示する。
- stale escalation は `inventory_transactions` が誤っていることを意味しない。
- stale escalation は `inventory_current` 更新の許可ではない。
- stale escalation は rebuild / replay / compare execution / correction の開始条件ではない。
- stale escalation は「最新 context で再確認した方がよい可能性」を示す。

推奨 wording:

- escalation は過去 snapshot に基づく可能性があります。
- stale は確認制限であり、実行指示ではありません。
- 最新 transaction 反映とは限りません。

## Unresolved Escalation

unresolved escalation は、差異候補や integrity signal がまだ十分に説明できず、管理上の注意が残る状態である。

要因:

- compare confidence が low / unknown である。
- evidence が不足している。
- lineage gap がある。
- review state が `needs-evidence` / `pending` / `stale` である。
- snapshot が partial / stale である。
- ADJUST / CANCEL / MOVE の semantics が曖昧である。
- pallet relation が部分的である。

unresolved escalation は review limitation であり、automatic remediation ではない。未解決であることは、workflow 実行、assignment、notification、correction、rebuild の許可ではない。

## Cross-Warehouse Escalation

cross-warehouse escalation は、warehouse_code 境界をまたぐ差異や解釈ずれが見える場合に、管理上の注意優先度を上げる semantics である。

重要視する理由:

- 倉庫境界を越える数量差異は現場説明や棚卸影響が大きい。
- wrong warehouse / wrong location の誤読につながりやすい。
- pallet / part / location の projection boundary がずれやすい。
- audit review で説明責任が大きくなる可能性がある。

ただし、cross-warehouse escalation は異常確定ではない。warehouse boundary mismatch は timing gap、snapshot scope mismatch、pallet relation gap、aggregation unit mismatch の可能性もある。

## Audit Escalation

audit escalation は、監査観点で evidence / lineage / trace / limitation を重点確認すべき状態を示す。

audit escalation が必要になる例:

- evidence confidence が low / unknown である。
- lineage gap がある。
- CANCEL target が不明である。
- ADJUST semantics が差分か絶対値か不明である。
- negative quantity が説明しきれない。
- review state が stale / unresolved のまま残っている。
- compare mismatch が長期間続いている。

audit escalation は audit開始命令ではない。監査観点で注意して読むべきことを示す reasoning / visualization であり、approval、assignment、notification を作らない。

## Manager Review Semantics

manager review は、所長・管理者が現場影響や説明責任の観点で確認すべき候補を示す semantics である。

manager review が有用な例:

- 現場説明が必要な数量差異がある。
- cross-warehouse / cross-location の可能性がある。
- stale review が続いている。
- unresolved escalation が残っている。
- negative quantity に関係する。
- audit escalation と重なる。

manager review は担当割当ではない。管理者が見るべき visibility / attention を示すだけで、workflow、approval、notification、correction は開始しない。

## Escalation Evidence

escalation evidence は、なぜ escalation として表示されるかを説明する根拠である。

含む観点:

- compare evidence
- snapshot evidence
- source transaction evidence
- signed quantity evidence
- trace / request id evidence
- pallet relation evidence
- freshness evidence
- review lifecycle evidence
- limitation evidence

evidence があることは correctness guarantee ではない。evidence が不足していることは automatic correction の指示ではない。evidence は escalation を安全に読むための説明材料である。

## Escalation Lineage

escalation lineage は、escalation がどの compare result / review state / snapshot / transaction / evidence / attention signal に由来するかを示す。

確認観点:

- escalation はどの compare mismatch に基づくか。
- expected quantity はどの `inventory_transactions` 範囲から導出されたか。
- cached quantity はどの `inventory_current` observation から来たか。
- escalation level はどの evidence / limitation / review state に基づくか。
- stale / unresolved / audit escalation がどの scope と対応しているか。

lineage は reasoning visualization であり、execution dependency ではない。lineage が揃っていても replay eligibility ではなく、lineage gap があっても correction command ではない。

## Escalation Attention

escalation attention は、差異や制限を誰が重要視すべきかを見落とさないための signal である。

attention の例:

- manager review recommended
- audit review recommended
- cross-warehouse attention
- stale escalation
- unresolved escalation
- low evidence escalation
- lineage gap escalation
- negative quantity escalation
- pallet relation escalation

attention は human review の補助であり、assignment、notification、approval、execution priority ではない。`manager-review` も管理者への自動割当ではなく、管理者が見た方がよい可能性を示す表示である。

## Governance Visualization との関係

governance visualization は、escalation semantics を使って「どの差異を誰が重要視すべきか」「どの limitation があるか」「監査・管理者確認がなぜ必要そうに見えるか」を説明する。

扱うもの:

- escalation level
- severity escalation
- stale / unresolved caveat
- cross-warehouse attention
- audit review signal
- manager review signal
- evidence quality
- lineage completeness
- compare confidence
- review lifecycle state
- limitation
- read-only boundary

扱わないもの:

- workflow execution
- assignment
- notification
- auto-escalation
- rebuild approval
- correction approval
- replay operation
- DB update decision
- `inventory_current` update

governance visualization は review / investigation / audit / management visibility の補助であり、operation correctness や execution permission を保証しない。

## Escalation Limitation

escalation semantics には limitation がある。

- escalation は異常確定ではない。
- escalation level は management attention priority であり、処理優先度ではない。
- stale / delayed / partial review は通常の前提として扱う必要がある。
- evidence confidence が low / unknown の場合、escalation を過信できない。
- lineage gap がある場合、escalation の由来説明が部分的になる。
- snapshot / compare / evidence の scope がずれている場合、escalation の読み方に caveat が必要になる。
- cross-warehouse escalation は warehouse error の確定ではない。
- audit escalation は audit開始命令ではない。
- manager review は assignment ではない。

limitation は inventory integrity / compare / governance visualization で明示する。limitation は execution permission ではない。

## Escalation を過信しない方針

escalation は、管理上の注意優先度を安全に読むための review signal である。

過信しないための原則:

- escalation は incident confirmed ではない。
- critical escalation は execute now ではない。
- manager-review は assignment created ではない。
- audit-review は audit started ではない。
- stale escalation は rebuild required ではない。
- unresolved escalation は correction required ではない。
- evidence available は correctness guarantee ではない。
- escalation state から direct mutation を開始しない。

escalation は、review / investigation / audit / management visibility の優先度や読み方を補助する。実行判断そのものではない。

## Non-Execution Boundary

B32-06 は inventory integrity escalation semantics のみである。

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
- auto-escalation 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

escalation は execution authority ではない。escalation は reasoning / review / visualization のために、level / severity / stale / unresolved / cross-warehouse / audit / manager review / evidence / lineage / attention / limitation を説明する conceptual boundary である。
