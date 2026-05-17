# Inventory Integrity Governance Boundary Review

Phase B32-07 inventory integrity governance boundary review.

この文書は、inventory integrity / governance reasoning / compare review における governance boundary semantics を整理し、「どこまでが review / visualization で、どこからが execution / mutation なのか」を明確にするための semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、workflow、approval execution、mutation、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- governance reasoning は review / investigation / audit / visualization のための read-only reasoning である。
- governance reasoning は execution authority を持たない。
- review state は mutation authority ではない。
- escalation は execution authority ではない。
- approval semantics は rebuild authority ではない。
- compare は correction authority ではない。
- governance boundary は rebuild、compare execution、replay、correction、approval execution、mutation、auto-fix、workflow を開始しない。

## Concept: InventoryIntegrityGovernanceBoundary

`InventoryIntegrityGovernanceBoundary` は、inventory integrity の表示・確認・証跡・由来・注意・エスカレーションが、どこまで review / visualization として読まれ、どこから execution / mutation と分離されるかを示す概念である。

含むべき意味:

- review boundary
- execution boundary
- mutation boundary
- approval boundary
- rebuild boundary
- compare boundary
- evidence boundary
- lineage boundary
- attention boundary
- escalation boundary
- limitation
- non-execution caveat

含まない意味:

- DB update authority
- `inventory_current` update authority
- rebuild authority
- correction authority
- replay authority
- approval execution authority
- workflow authority
- assignment / notification authority
- auto-fix authority

InventoryIntegrityGovernanceBoundary は「何を見てよいか」「何を意味しないか」を分ける境界であり、「何を実行してよいか」を付与する境界ではない。

## Review Boundary

review boundary は、差異・証跡・由来・snapshot・attention・escalation を人が確認する範囲を示す。

review boundary に含めるもの:

- compare mismatch の確認
- expected quantity と cached quantity の差異確認
- evidence / lineage / source trace の確認
- stale / partial / delayed caveat の確認
- review lifecycle state の確認
- escalation level の確認
- audit / manager review の必要性の確認

review boundary に含めないもの:

- correction 実行
- rebuild 実行
- replay 実行
- `inventory_current` 更新
- assignment 作成
- notification 送信
- approval mutation

review state は review / investigation / audit の補助であり、mutation authority ではない。

## Execution Boundary

execution boundary は、dashboard / governance reasoning が実行機能へ進まないための境界である。

execution に含まれるもの:

- DB mutation
- RPC / Edge Function / API 実行
- inventory update
- rebuild execution
- compare execution
- replay execution
- correction execution
- workflow execution
- approval execution
- notification / assignment execution
- auto-fix execution

governance reasoning はこれらを開始しない。表示上の `critical`、`resolved`、`approved`、`manager-review`、`audit-review`、`high confidence` は execution permission ではない。

## Mutation Boundary

mutation boundary は、read-only review と data change を分ける境界である。

mutation に該当するもの:

- `inventory_current` 更新
- `inventory_transactions` 変更
- correction transaction 追加
- cancel / adjust transaction 追加
- pallet relation 変更
- review state の永続更新
- assignment / notification record 作成
- approval record 変更

B32-07 では mutation を扱わない。governance boundary は mutation を示すのではなく、mutation と誤読されないように caveat を明示するための意味境界である。

## Approval Boundary

approval boundary は、approval に見える signal を governance reference として扱い、execution authority と分離する境界である。

方針:

- approval semantics は review / governance visibility のために使う。
- approval は rebuild authority ではない。
- approval は correction authority ではない。
- approval は workflow completion ではない。
- approval は `inventory_current` update permission ではない。
- approval state が見えても automatic execution は開始しない。

approval wording は、operation completed / safe to execute / rebuild approved と誤読されないようにする。

## Rebuild Boundary

rebuild boundary は、`inventory_transactions` から `inventory_current` 相当の read model を再構成できる考え方と、実際の rebuild execution を分ける境界である。

review / visualization で扱うもの:

- rebuild が成立するための source coverage
- aggregation unit の整合
- signed quantity semantics
- snapshot / compare / evidence limitation
- rebuild verification の前提

扱わないもの:

- rebuild 実行
- rebuild approval
- rebuild completion
- `inventory_current` 更新
- correction / replay の開始

rebuild boundary は将来設計の前提を説明するが、execution authority を持たない。

## Compare Boundary

compare boundary は、expected quantity と cached quantity の差異表示を、correction authority と分離する境界である。

方針:

- compare は reasoning / review / visualization 用である。
- compare mismatch は即異常ではない。
- compare match は correctness guarantee ではない。
- stale / partial / delayed compare を前提にする。
- compare confidence high は safe to execute ではない。
- compare は correction authority ではない。
- compare は compare execution completion でもない。

compare result は review / investigation / audit の入口であり、direct mutation を開始しない。

## Governance Visualization Boundary

governance visualization boundary は、dashboard が governance 情報をどう表示し、どこまで解釈してよいかを分ける境界である。

表示してよいもの:

- review state
- compare consistency / confidence / freshness
- evidence quality
- lineage completeness
- attention signal
- escalation level
- snapshot limitation
- source trace relation
- read-only / no execution caveat

表示してはいけない意味:

- execute now
- rebuild required
- correction required
- source of truth failed
- assignment created
- approval mutation completed
- inventory_current update permitted
- auto-fix available

governance visualization は operator / reviewer / manager / auditor の理解を補助する。operation correctness や execution permission を保証しない。

## Review / Evidence / Lineage / Attention / Escalation との関係

### Review

review lifecycle は差異確認の状態を示すが、workflow state ではない。`resolved` は truth guarantee ではなく、`pending` は assignment queue ではない。

### Evidence

evidence は根拠や説明材料を示す。evidence available は correctness guarantee ではなく、evidence missing は upload action required ではない。

### Lineage

lineage は由来や依存関係を示す。lineage complete は permission granted ではなく、trace relation は replay eligibility ではない。

### Attention

attention は見落とし防止の review signal である。critical attention は execute now ではなく、attention priority は execution priority ではない。

### Escalation

escalation は管理上の注意優先度である。manager-review は assignment created ではなく、audit-review は audit started ではない。

## Governance Limitation

governance boundary semantics には limitation がある。

- boundary wording が弱いと execution expectation が発生する可能性がある。
- review / approval / resolved / critical / escalation は実行可能性と誤読されやすい。
- evidence / lineage / confidence は correctness guarantee と誤読されやすい。
- snapshot / compare / review state が stale / partial / delayed の場合、表示の読み方に caveat が必要である。
- governance visualization は source of truth の代替ではない。
- `inventory_current` の cache 表示は truth ではない。
- boundary が明確でも、user が execution expectation を持つ可能性は残る。

limitation は inventory integrity / compare / governance visualization で明示する。limitation は execution permission ではない。

## Governance Boundary を過信しない方針

governance boundary は、review / visualization と execution / mutation を分けるための semantic guardrail である。

過信しないための原則:

- boundary があることは correctness guarantee ではない。
- read-only 表示は source of truth confirmation ではない。
- review state は mutation authority ではない。
- escalation は execution authority ではない。
- approval semantics は rebuild authority ではない。
- compare は correction authority ではない。
- evidence available は operation correct ではない。
- lineage complete は permission granted ではない。
- high confidence は safe to execute ではない。
- boundary から direct mutation を開始しない。

governance boundary は、review / investigation / audit / management visibility の安全な読み方を補助する。実行判断そのものではない。

## Non-Execution Boundary

B32-07 は inventory integrity governance boundary semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- workflow 実装
- approval execution 実装
- mutation 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

governance reasoning は execution authority ではない。governance boundary は review / visualization / meaning boundary のために、review boundary / execution boundary / mutation boundary / approval boundary / rebuild boundary / compare boundary / limitation を説明する conceptual boundary である。
