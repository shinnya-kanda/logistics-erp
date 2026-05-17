# Inventory Integrity Projection Contract Design

Phase B33-01 inventory integrity projection contract architecture review.

この文書は、inventory integrity / governance visualization / compare reasoning における projection contract を整理し、UI projection / adapter / compare visualization の共通境界を明確にするための contract architecture review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、projection 実装、adapter 実装、workflow、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- projection は reasoning / review / audit / visualization 用の read-only object である。
- projection metadata は truth guarantee ではない。
- stale / partial / delayed projection を前提にする。
- projection object を execution object と混同しない。
- projection contract は execution authority を持たない。
- projection contract は rebuild、compare execution、replay、correction、adapter execution、workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityProjection

`InventoryIntegrityProjection` は、inventory aggregation / compare / snapshot / evidence / lineage / attention / review / escalation / governance boundary を、UI / adapter / compare visualization が共通して読める形にまとめた conceptual contract である。

含むべき意味:

- projection identity
- source / truth boundary
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
- consistency signal
- non-execution caveat

含まない意味:

- executable command
- rebuild plan execution
- correction command
- replay command
- adapter execution
- workflow state
- approval mutation
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityProjection は「何が見えているか、どの制限付きか、どの根拠から読めるか」を示す read-only projection であり、「何を実行してよいか」を示す object ではない。

## Projection Identity

projection identity は、projection を一意に追跡し、scope / source / version / boundary を混同しないための metadata である。

含む観点:

- projection id
- projection type
- projection version
- projection scope
- warehouse / project / part / location / pallet / lot boundary
- source reference
- parent projection reference
- generated_at
- contract version

identity が意味しないこと:

- source of truth confirmation
- persistence guarantee
- execution eligibility
- update permission

identity は traceability のための参照情報であり、mutation key ではない。

## Snapshot Metadata

snapshot metadata は、projection がいつ・どの範囲・どの条件で観測されたかを示す。

含む観点:

- snapshot id
- as_of_time
- generated_at / observed_at
- transaction coverage
- aggregation scope
- source completeness
- stale / partial / delayed caveat
- snapshot limitation

snapshot metadata の注意点:

- snapshot が fresh でも source of truth confirmation ではない。
- snapshot が stale でも source error の確定ではない。
- partial snapshot は review limitation であり、automatic remediation ではない。
- snapshot metadata は compare / integrity visualization の説明材料であり、execution trigger ではない。

## Compare Metadata

compare metadata は、expected quantity と cached quantity の差異をどう読めるかを示す。

含む観点:

- compare id
- expected quantity source
- cached quantity source
- difference quantity
- mismatch type
- compare consistency level
- compare confidence
- compare freshness
- false-positive caveat
- compare limitation

compare metadata が意味しないこと:

- `inventory_current` が必ず誤りであること
- `inventory_transactions` が誤っている確定
- correction permission
- compare execution completion
- rebuild requirement

compare metadata は review / investigation / audit の入口であり、correction authority ではない。

## Freshness Metadata

freshness metadata は、projection がどの鮮度状態で読まれるべきかを示す。

分けるべき freshness:

- source freshness
- aggregation freshness
- snapshot freshness
- cache freshness
- compare freshness
- evidence freshness
- review freshness
- governance projection freshness

freshness metadata の注意点:

- freshness high は correctness guarantee ではない。
- freshness low は source error の確定ではない。
- stale / delayed は limitation として表示する。
- freshness metadata は execution permission ではない。

## Confidence Metadata

confidence metadata は、projection の読みやすさ・説明可能性を示す。

confidence に影響する要素:

- source coverage
- aggregation unit alignment
- snapshot alignment
- compare consistency
- evidence quality
- lineage completeness
- freshness
- ADJUST / CANCEL / MOVE semantics clarity
- pallet / lot / location / project boundary clarity

confidence high:

- review に必要な条件が比較的そろっていることを示す。
- safe to execute ではない。
- truth guarantee ではない。

confidence low / unknown:

- projection の読み方に limitation があることを示す。
- automatic correction の指示ではない。

## Evidence Metadata

evidence metadata は、projection を読むための根拠・証跡・制限を示す。

含む観点:

- source transaction evidence
- compare evidence
- snapshot evidence
- signed quantity evidence
- cache observation evidence
- trace / request id evidence
- pallet relation evidence
- limitation evidence
- confidence level
- evidence gap

evidence metadata が意味しないこと:

- correctness guarantee
- operation correct
- evidence fetch execution
- correction command

evidence は reasoning / review / audit の説明材料である。

## Lineage Metadata

lineage metadata は、projection がどの source / snapshot / compare / evidence / review signal から導出されたかを示す。

含む観点:

- source transaction relation
- aggregation effect relation
- snapshot relation
- compare relation
- evidence relation
- parent / child projection relation
- trace id / request id / parent trace id
- dependency caveat

lineage metadata の注意点:

- lineage complete は permission granted ではない。
- trace relation は replay eligibility ではない。
- dependency は execution dependency ではない。
- lineage gap は correction command ではない。

## Attention Metadata

attention metadata は、projection の見落としや誤読を防ぐための review signal を示す。

含む観点:

- attention level
- attention reason
- review priority
- stale / partial / delayed caveat
- low confidence signal
- negative quantity signal
- cross-projection mismatch signal
- pallet relation signal

attention metadata が意味しないこと:

- assignment
- notification
- approval
- execution priority
- execute now

attention は human review の補助であり、workflow ではない。

## Review State Metadata

review state metadata は、projection に関係する review lifecycle の状態を示す。

含む state:

- `detected`
- `observed`
- `reviewing`
- `needs-evidence`
- `pending`
- `stale`
- `resolved`
- `rejected`
- `ignored`

review state metadata の注意点:

- review state は mutation authority ではない。
- `resolved` は truth guarantee ではない。
- `pending` は assignment queue ではない。
- `needs-evidence` は evidence fetch command ではない。
- stale review は rebuild required ではない。

## Escalation Metadata

escalation metadata は、projection を誰が重要視すべきかを示す管理上の注意優先度である。

含む観点:

- escalation level
- target audience
- severity escalation
- stale escalation
- unresolved escalation
- cross-warehouse escalation
- audit escalation
- manager review signal
- escalation limitation

escalation metadata の注意点:

- escalation は execution authority ではない。
- escalation は異常確定ではない。
- manager-review は assignment created ではない。
- audit-review は audit started ではない。
- critical escalation は execute now ではない。

## Governance Boundary Metadata

governance boundary metadata は、projection が review / visualization と execution / mutation を混同しないための境界情報である。

含む観点:

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
- projection metadata = truth guarantee ではない。

## Projection Limitation

projection contract には limitation がある。

- source transaction coverage が partial の場合、expected quantity を確定できない。
- snapshot / compare / evidence の scope がずれている可能性がある。
- stale / delayed projection は通常の前提として扱う必要がある。
- aggregation unit が揃っていない場合、projection consistency が曖昧になる。
- evidence confidence が low / unknown の場合、projection を過信できない。
- lineage gap がある場合、source から projection への説明が部分的になる。
- review state / escalation / attention は execution permission と誤読されやすい。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Projection Consistency

projection consistency は、projection contract 内の metadata が同じ scope / time / source / limitation で読めるかを示す review signal である。

確認観点:

- projection identity と snapshot scope が一致しているか。
- compare metadata と snapshot metadata の as_of_time が説明できるか。
- freshness metadata と confidence metadata が矛盾していないか。
- evidence metadata と lineage metadata が同じ source range を参照しているか。
- attention / review / escalation が compare limitation と対応しているか。
- governance boundary metadata が execution expectation を遮断しているか。

projection consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- rebuild required
- correction required
- execution permission

## Adapter / UI / Compare Visualization との関係

### Adapter

adapter は raw transaction / aggregation / snapshot / compare を projection contract へ整理する conceptual boundary である。adapter は execution authority を持たない。

### UI

UI は projection contract を read-only surface として表示する。UI は projection metadata を表示するが、mutation / rebuild / correction / replay / workflow を開始しない。

### Compare Visualization

compare visualization は compare metadata / limitation / evidence / lineage を読み、expected quantity と cached quantity の差異を説明する。compare visualization は compare execution completion でも correction authority でもない。

## Non-Execution Boundary

B33-01 は inventory integrity projection contract architecture review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- projection 実装
- adapter 実装
- workflow 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

projection contract は execution authority ではない。projection contract は reasoning / visualization のために、identity / snapshot / compare / freshness / confidence / evidence / lineage / attention / review / escalation / governance boundary / limitation / consistency を説明する conceptual contract である。
