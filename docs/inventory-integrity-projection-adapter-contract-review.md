# Inventory Integrity Projection Adapter Contract Review

Phase B33-02 inventory integrity projection adapter contract review.

この文書は、inventory integrity / governance visualization / compare reasoning における projection adapter contract を整理し、raw source → adapter → projection の責務境界を明確にするための adapter contract review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、adapter 実装、projection 実装、workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- adapter は reasoning / review / audit / visualization 用の conceptual boundary である。
- raw source を UI projection に直接接続しない。
- adapter normalization は truth guarantee ではない。
- stale / partial / delayed source を前提にする。
- adapter を execution object と混同しない。
- adapter contract は execution authority を持たない。
- adapter contract は rebuild、compare execution、replay、correction、projection execution、workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityProjectionAdapter

`InventoryIntegrityProjectionAdapter` は、raw source を Inventory Integrity projection contract に合わせて整理し、UI / compare visualization / governance visualization が同じ意味境界で読めるようにする conceptual adapter である。

含むべき意味:

- raw source boundary
- source normalization
- projection hydration
- snapshot binding
- compare enrichment
- metadata propagation
- limitation propagation
- consistency signal
- governance boundary propagation
- non-execution caveat

含まない意味:

- SQL query execution
- API / Edge Function execution
- adapter implementation
- projection implementation
- rebuild execution
- compare execution
- replay execution
- correction command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityProjectionAdapter は「raw source をどう read-only projection contract へ整理するか」を示す責務境界であり、「どの処理を実行するか」を示す object ではない。

## Adapter Responsibility

adapter responsibility は、raw source と projection object の間で意味を失わず、過剰な意味を足さずに変換する責務である。

adapter が担う整理:

- source coverage を示す。
- aggregation unit を揃える。
- signed quantity semantics を保持する。
- snapshot scope を projection scope に結び付ける。
- compare difference を metadata として整理する。
- freshness / confidence / evidence / lineage / attention / escalation を projection contract に伝播する。
- governance boundary を明示する。
- limitation を隠さない。

adapter が担わないこと:

- source of truth の訂正
- `inventory_current` の更新
- rebuild の実行
- compare engine の実行
- replay / correction の実行
- assignment / notification / workflow の作成
- auto-fix の実行

## Source Normalization

source normalization は、raw source を projection contract で読める単位へ整理する conceptual step である。

対象:

- `inventory_transactions`
- `inventory_current`
- `pallet_transactions`
- `pallet_units`
- `pallet_item_links`
- snapshot / compare / evidence / lineage reference

normalization で整理すること:

- transaction type の意味
- signed quantity effect
- aggregation unit
- warehouse / project / part / location / pallet / lot boundary
- source coverage
- missing / partial / ambiguous field
- source freshness

normalization が意味しないこと:

- raw source の正しさ保証
- source mutation
- `inventory_current` の truth 化
- stale / partial source の解消

source normalization は reasoning のための整形であり、truth guarantee ではない。

## Projection Hydration

projection hydration は、normalized source と metadata を `InventoryIntegrityProjection` の contract へ埋める conceptual step である。

hydration で付与するもの:

- projection identity
- snapshot metadata
- compare metadata
- freshness metadata
- confidence metadata
- evidence metadata
- lineage metadata
- attention metadata
- review state metadata
- escalation metadata
- governance boundary metadata
- limitation

hydration の注意点:

- metadata が揃っても correctness guarantee ではない。
- missing metadata は review limitation として残す。
- hydration は projection 実装ではなく、contract 上の責務整理である。
- hydrated projection は execution object ではない。

## Snapshot Binding

snapshot binding は、normalized source / aggregation / compare がどの snapshot に基づくかを projection に結び付ける semantics である。

binding で示すもの:

- snapshot id
- as_of_time
- generated_at / observed_at
- source coverage
- transaction completeness
- stale / partial / delayed caveat
- snapshot limitation

binding の注意点:

- snapshot が fresh でも source of truth confirmation ではない。
- snapshot が stale でも source error の確定ではない。
- partial snapshot は review limitation であり、automatic remediation ではない。
- snapshot binding は rebuild / replay / compare execution の開始条件ではない。

## Compare Enrichment

compare enrichment は、expected quantity と cached quantity の差異を projection contract 上で読める metadata にする semantics である。

enrichment で付与するもの:

- expected quantity source
- cached quantity source
- difference quantity
- mismatch type
- compare consistency level
- compare confidence
- compare freshness
- false-positive caveat
- compare limitation

compare enrichment が意味しないこと:

- `inventory_current` が必ず誤りであること
- `inventory_transactions` が誤っている確定
- correction permission
- compare execution completion
- rebuild requirement

compare enrichment は review / investigation / audit のための説明材料であり、correction authority ではない。

## Freshness Propagation

freshness propagation は、source / snapshot / compare / evidence / review の鮮度を projection contract へ伝える責務である。

伝播する freshness:

- source freshness
- aggregation freshness
- snapshot freshness
- cache freshness
- compare freshness
- evidence freshness
- review freshness
- governance projection freshness

propagation の注意点:

- freshness high は correctness guarantee ではない。
- freshness low は source error の確定ではない。
- stale / delayed は limitation として伝える。
- freshness propagation は execution permission ではない。

## Confidence Propagation

confidence propagation は、projection の読みやすさ・説明可能性を伝える責務である。

confidence に影響する source:

- source coverage
- aggregation unit alignment
- snapshot alignment
- compare consistency
- evidence quality
- lineage completeness
- freshness
- ADJUST / CANCEL / MOVE semantics clarity
- pallet / lot / location / project boundary clarity

propagation の注意点:

- confidence high は safe to execute ではない。
- confidence high は truth guarantee ではない。
- confidence low / unknown は review limitation であり、automatic correction ではない。

## Evidence Propagation

evidence propagation は、projection を読むための根拠・証跡・制限を伝える責務である。

伝播する evidence:

- source transaction evidence
- compare evidence
- snapshot evidence
- signed quantity evidence
- cache observation evidence
- trace / request id evidence
- pallet relation evidence
- limitation evidence
- evidence gap

evidence propagation が意味しないこと:

- correctness guarantee
- operation correct
- evidence fetch execution
- correction command

evidence は reasoning / review / audit の説明材料である。

## Lineage Propagation

lineage propagation は、projection がどの source / snapshot / compare / evidence / review signal から導出されたかを伝える責務である。

伝播する lineage:

- source transaction relation
- aggregation effect relation
- snapshot relation
- compare relation
- evidence relation
- parent / child projection relation
- trace id / request id / parent trace id
- dependency caveat

lineage propagation の注意点:

- lineage complete は permission granted ではない。
- trace relation は replay eligibility ではない。
- dependency は execution dependency ではない。
- lineage gap は correction command ではない。

## Attention Propagation

attention propagation は、projection の見落としや誤読を防ぐ review signal を伝える責務である。

伝播する attention:

- attention level
- attention reason
- review priority
- stale / partial / delayed caveat
- low confidence signal
- negative quantity signal
- cross-projection mismatch signal
- pallet relation signal

attention propagation が意味しないこと:

- assignment
- notification
- approval
- execution priority
- execute now

attention は human review の補助であり、workflow ではない。

## Escalation Propagation

escalation propagation は、projection を誰が重要視すべきかという管理上の注意優先度を伝える責務である。

伝播する escalation:

- escalation level
- target audience
- severity escalation
- stale escalation
- unresolved escalation
- cross-warehouse escalation
- audit escalation
- manager review signal
- escalation limitation

escalation propagation の注意点:

- escalation は execution authority ではない。
- escalation は異常確定ではない。
- manager-review は assignment created ではない。
- audit-review は audit started ではない。
- critical escalation は execute now ではない。

## Governance Boundary Propagation

governance boundary propagation は、projection が review / visualization と execution / mutation を混同しないための境界情報を伝える責務である。

伝播する boundary:

- review boundary
- execution boundary
- mutation boundary
- approval boundary
- rebuild boundary
- compare boundary
- read-only caveat
- no-execution caveat
- not-meaning caveat

境界として明示すること:

- review state = mutation authority ではない。
- escalation = execution authority ではない。
- approval semantics = rebuild authority ではない。
- compare = correction authority ではない。
- adapter normalization = truth guarantee ではない。
- projection metadata = truth guarantee ではない。

## Adapter Limitation

adapter contract には limitation がある。

- raw source coverage が partial の場合、expected quantity を確定できない。
- source normalization で missing / ambiguous field が残る可能性がある。
- snapshot / compare / evidence の scope がずれている可能性がある。
- stale / delayed source は通常の前提として扱う必要がある。
- aggregation unit が揃っていない場合、adapter consistency が曖昧になる。
- evidence confidence が low / unknown の場合、adapter output を過信できない。
- lineage gap がある場合、source から projection への説明が部分的になる。
- adapter の出力は read-only reasoning projection であり、source of truth ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Adapter Consistency

adapter consistency は、adapter が raw source / normalized source / projection contract の metadata を同じ scope / time / source / limitation で結び付けているかを示す review signal である。

確認観点:

- raw source coverage と projection scope が一致しているか。
- normalized aggregation unit と projection identity が対応しているか。
- snapshot binding と compare enrichment の as_of_time が説明できるか。
- freshness propagation と confidence propagation が矛盾していないか。
- evidence propagation と lineage propagation が同じ source range を参照しているか。
- attention / escalation propagation が compare limitation と対応しているか。
- governance boundary propagation が execution expectation を遮断しているか。

adapter consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- rebuild required
- correction required
- adapter execution success
- execution permission

## Raw Source / Adapter / Projection Boundary

raw source / adapter / projection は、次のように分けて読む。

```text
raw source
  -> source normalization
  -> projection hydration
  -> InventoryIntegrityProjection
  -> UI / compare / governance visualization
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- source normalization: raw source を reasoning 用に揃える conceptual step。truth guarantee ではない。
- projection hydration: metadata を projection contract に付与する conceptual step。execution object ではない。
- InventoryIntegrityProjection: read-only reasoning projection。source of truth ではない。
- visualization: UI / compare / governance の表示。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B33-02 は inventory integrity projection adapter contract review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- adapter 実装
- projection 実装
- workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

adapter contract は execution authority ではない。adapter contract は reasoning / visualization のために、responsibility / normalization / hydration / snapshot binding / compare enrichment / metadata propagation / limitation / consistency / raw source boundary を説明する conceptual contract である。
