# Inventory Aggregation Projection Adapter Design

Phase B32-02 inventory aggregation projection adapter architecture review.

この文書は、`inventory_transactions` から aggregation / compare / integrity visualization / governance visualization へ変換する際の adapter / projection / snapshot boundary を整理するための architecture review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、adapter 実装、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- raw transaction を UI projection に直接接続しない。
- adapter layer は raw source を reasoning projection 用の中間表現へ変換する境界である。
- adapter layer は execution authority を持たない。
- adapter layer は rebuild、compare execution、replay、correction、mutation、assignment、approval を開始しない。
- aggregation semantics は `docs/inventory-aggregation-semantics-review.md` の前提を維持する。

## Adapter Layer の目的

Inventory aggregation projection adapter は、raw transaction と UI projection の間で意味を整える read-only boundary である。

役割:

- raw transaction の集計意味を、UI / governance / integrity で読める projection へ変換する。
- transaction type、quantity sign、aggregation unit、trace、evidence、limitation を同じ文脈で扱えるようにする。
- compare projection が期待現在庫と cache quantity を安全に比較できるように、差異の説明材料を整理する。
- governance visualization が source of truth と read model の境界を誤読しないように、reasoning metadata を付与する。

役割ではないこと:

- SQL query 実行の設計
- RPC / Edge Function / API の設計
- `inventory_current` の更新
- rebuild / replay / correction の実行
- UI 操作や button の設計
- source of truth の置き換え

## Concept: InventoryAggregationProjection

`InventoryAggregationProjection` は、transaction aggregation の結果を UI / governance / integrity visualization で読める説明表示へ変換した概念である。

含むべき意味:

- aggregation unit: warehouse / project / part / location / pallet / lot の境界
- expected current quantity: `inventory_transactions` から導出した期待現在庫
- source coverage: 集計に使える transaction の範囲
- limitation: missing field、partial trace、ambiguous adjust、cancel target 不明など
- lineage: どの transaction / pallet / evidence に由来するか
- consistency status: cache / projection と比較したときの一致、差異、未比較、制限
- semantic boundary: reasoning visualization only

含まない意味:

- 実行可能な rebuild plan
- correction command
- replay command
- approval state
- mutation permission

`InventoryAggregationProjection` は、数量を表示するだけでなく「なぜその数量として見えるのか」を説明するための read-only projection である。

## Concept: InventoryAggregationSnapshot

`InventoryAggregationSnapshot` は、ある時点またはある条件で aggregation projection を観測した状態を表す概念である。

snapshot semantics:

- generated_at / observed_at の時点を持つ。
- 対象範囲を持つ。例: warehouse、project、part、location、pallet、lot。
- transaction coverage を持つ。例: included range、excluded range、partial coverage。
- source freshness / projection freshness を分ける。
- cache freshness と transaction completeness を混同しない。
- snapshot は「その時点で見える説明表示」であり、source of truth confirmation ではない。

snapshot が意味しないこと:

- 最新性の保証
- correctness guarantee
- rebuild completion
- compare completion
- audit completion

snapshot は governance / integrity visualization において、表示がどの時点・どの範囲・どの制限で作られたかを説明するための境界である。

## Concept: InventoryAggregationDifference

`InventoryAggregationDifference` は、transaction aggregation から導出した expected current quantity と、`inventory_current` などの cache / read model の cached current quantity の差異を表す概念である。

構成要素:

- aggregation unit
- expected current quantity
- cached current quantity
- difference quantity
- severity / attention level
- reason candidate
- limitation
- evidence reference

差異の意味:

- projection / cache が stale の可能性
- aggregation unit がずれている可能性
- transaction completeness が不足している可能性
- ADJUST / CANCEL / MOVE の解釈に制限がある可能性
- pallet / lot / location / project boundary が一致していない可能性

差異が意味しないこと:

- `inventory_transactions` が誤っている確定
- `inventory_current` を更新してよい許可
- rebuild を実行してよい許可
- compare execution の完了
- correction の必要確定

## Concept: InventoryAggregationTrace

`InventoryAggregationTrace` は、aggregation projection がどの raw transaction / derived effect / pallet relation / evidence に由来するかを説明する概念である。

含む観点:

- transaction id
- trace id / request id / parent trace id
- source transaction type
- signed quantity effect
- aggregation unit
- MOVE の source effect / destination effect
- CANCEL の target relation
- ADJUST の interpretation limitation
- pallet transaction / pallet item link relation
- evidence confidence / evidence gap

trace は execution trace ではなく reasoning trace である。trace が存在しても replay eligibility ではなく、trace gap があっても correction command ではない。

## Raw Transaction To Projection Flow

raw transaction から UI projection までは、以下のように段階を分ける。

```text
inventory_transactions
  -> transaction effect semantics
  -> aggregation unit grouping
  -> signed quantity aggregation
  -> aggregation snapshot
  -> aggregation projection
  -> compare / integrity / governance visualization
```

各段階の意味:

- `inventory_transactions`: source of truth。履歴イベントそのもの。
- transaction effect semantics: IN / OUT / MOVE / ADJUST / CANCEL を signed effect として説明する。
- aggregation unit grouping: warehouse / project / part / location / pallet / lot の境界で grouping する。
- signed quantity aggregation: expected current quantity を計算する考え方。
- aggregation snapshot: 生成時点、範囲、coverage、limitation を持つ観測状態。
- aggregation projection: UI / governance が読める説明表示。
- visualization: compare / integrity / reasoning / governance の read-only surface。

raw source は UI に直結しない。UI は adapter が整理した projection / snapshot / limitation / evidence を読む。

## Projection Adapter Boundary

projection adapter boundary は、source data と UI projection の意味を分離する境界である。

境界内で行う意味整理:

- raw transaction の signed effect 化
- aggregation unit の正規化
- source coverage の整理
- limitation の付与
- trace / lineage / evidence 参照の整理
- compare 用 difference candidate の整理
- governance 用 consistency / integrity signal の整理

境界外に置くもの:

- DB mutation
- `inventory_current` update
- rebuild execution
- replay execution
- correction execution
- compare execution
- notification / assignment
- approval / operation lifecycle transition

adapter layer は reasoning projection を作る conceptual boundary であり、実行権限を持たない。

## Snapshot Semantics

snapshot は「いつ・どの範囲・どの制限で projection を作ったか」を説明する。

snapshot に含めたい意味:

- snapshot id
- generated_at / observed_at
- aggregation range
- transaction coverage
- source completeness
- freshness note
- limitation note
- trace coverage
- evidence coverage

snapshot の注意点:

- snapshot が fresh でも source of truth confirmation ではない。
- snapshot が stale でも source error の確定ではない。
- partial snapshot は review limitation であり、automatic remediation ではない。
- snapshot は compare / integrity visualization の説明材料であり、execution trigger ではない。

## Compare Projection との関係

compare projection は、aggregation adapter が整理した expected quantity と `inventory_current` cache quantity の差異を表示する。

関係:

- adapter は expected current quantity の説明材料を作る。
- compare projection は expected と cached の difference を表示する。
- compare projection は difference reason / severity / limitation / evidence を読める形にする。
- compare projection は compare execution を行わない。

`inventory_current` は compare target であり、truth ではない。差異がある場合も、まず transaction aggregation と projection limitation を確認する。

## Governance Reasoning との関係

governance visualization は、adapter / projection / snapshot を使って「何が見えているか」「何が制限か」「どこから来た情報か」を説明する。

governance reasoning が扱うもの:

- projection consistency
- integrity signal
- attention signal
- evidence quality
- source trace
- lineage relation
- snapshot freshness / limitation
- read-only boundary

governance reasoning が扱わないもの:

- rebuild approval
- correction approval
- assignment
- retry / replay operation
- DB update decision

governance visualization は review / investigation / audit の補助であり、operation correctness や execution permission を保証しない。

## Lineage / Evidence / Source Trace との関係

adapter layer は、aggregation projection に lineage / evidence / source trace を付与するための意味境界になる。

lineage:

- aggregation projection がどの transaction effect から導出されたかを説明する。
- MOVE / CANCEL / ADJUST の由来関係を説明する。
- projection dependency を示すが、実行依存ではない。

evidence:

- aggregation result を説明する証跡を示す。
- confidence / gap / limitation を含む。
- correctness guarantee ではない。

source trace:

- `inventory_transactions`、`pallet_transactions`、`pallet_item_links` などの source relation を示す。
- source mutation や source resolution execution ではない。

## Rebuild / Compare / Replay との関係

adapter layer は、rebuild / compare / replay の意味を整理するが、実行権限を持たない。

- rebuild: `inventory_transactions` から read model を再構成できる前提を説明する。実行しない。
- compare: expected quantity と cached quantity の差異を表示するための材料を作る。compare execution はしない。
- replay: trace / event order を説明する文脈として扱う。replay execution はしない。
- correction: 差異や limitation の説明対象ではあるが、correction command は作らない。

adapter が projection を作れることは、rebuild / compare / replay / correction を実行してよいことを意味しない。

## Adapter Limitation

adapter layer には limitation がある。

- raw transaction に必要な field が不足している場合、aggregation unit が曖昧になる。
- ADJUST の semantics が差分か絶対値か不明な場合、signed effect が曖昧になる。
- CANCEL target が不明な場合、取消効果を説明しきれない。
- MOVE の source / destination が不完全な場合、片側 effect として見える。
- pallet relation が部分的な場合、part quantity と pallet state の関係を確定できない。
- snapshot coverage が部分的な場合、projection consistency を断定できない。
- evidence confidence が低い場合、governance visualization は limitation として表示する必要がある。
- adapter の変換結果は read-only reasoning projection であり、source of truth ではない。

limitation は visibility / integrity / evidence として表示する。limitation は execution permission ではない。

## Projection Consistency

projection consistency は、source of truth から導出される projection / read model が期待通りに見えるかを示す review signal である。

確認観点:

- `inventory_transactions` から expected current quantity を説明できるか。
- `inventory_current` cache と差異がある場合、stale / partial / inconsistent を分けて説明できるか。
- aggregation unit が warehouse / project / part / location / pallet / lot の境界を越えていないか。
- pallet projection と inventory aggregation projection の関係が説明できるか。
- snapshot freshness と source completeness を混同していないか。
- evidence gap を correctness failure と断定していないか。

projection consistency warning は review / investigation / audit の入口であり、update / rebuild / replay / correction を直接実行しない。

## Non-Execution Boundary

B32-02 は adapter architecture review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- adapter 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

adapter layer は execution authority ではない。raw source と UI projection の間に意味境界を作り、reasoning projection / snapshot / difference / trace を安全に説明するための conceptual layer である。
