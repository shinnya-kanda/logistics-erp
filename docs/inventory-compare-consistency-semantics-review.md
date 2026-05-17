# Inventory Compare Consistency Semantics Review

Phase B32-04 inventory compare consistency semantics review.

この文書は、inventory compare / integrity visualization / governance reasoning における compare consistency semantics を整理し、「比較結果をどこまで信用できるか」を明確にするための semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、compare engine、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- compare は `inventory_transactions` 由来の expected quantity と cache / read model の差異を説明する reasoning / review / visualization である。
- compare consistency は絶対保証ではない。
- compare mismatch は即異常を意味しない。
- stale / partial / delayed compare を前提にする。
- compare は execution authority を持たない。
- compare は rebuild、compare execution、replay、correction、mutation を開始しない。

## Concept: InventoryCompareConsistency

`InventoryCompareConsistency` は、compare result がどの程度同じ条件・同じ時点・同じ集計単位で読めるかを示す review signal である。

含むべき意味:

- compare scope
- expected quantity source
- cached quantity source
- aggregation unit alignment
- snapshot alignment
- freshness state
- confidence
- mismatch type
- limitation
- evidence reference
- lineage reference
- review / attention signal

含まない意味:

- source of truth error の確定
- `inventory_current` の正当性保証
- rebuild approval
- correction command
- replay eligibility
- compare execution completion
- execution authority

InventoryCompareConsistency は、比較結果を安全に読むための意味境界であり、「比較が一致したから正しい」「不一致だから異常」と断定するものではない。

## Compare Consistency Level

compare consistency level は、比較結果をどれくらい安定して読めるかを表す分類である。

候補:

- `aligned`: aggregation unit、snapshot、freshness、evidence が概ね揃っている。
- `stale`: 片方または両方の snapshot / cache が古い可能性がある。
- `partial`: transaction coverage、aggregation unit、evidence、lineage の一部が不足している。
- `mismatched`: expected quantity と cached quantity に差異がある。
- `ambiguous`: ADJUST / CANCEL / MOVE / pallet relation などの意味が曖昧で、差異の読み方が確定しない。
- `unknown`: 比較に必要な情報が不足している。

level は review / investigation / audit のための表示であり、処理優先度や execution permission ではない。

## Compare Confidence

compare confidence は、比較結果の読みやすさ・説明可能性を示す signal である。

confidence に影響する要素:

- `inventory_transactions` の coverage
- aggregation unit の明確さ
- quantity sign semantics の明確さ
- snapshot as_of_time の整合
- `inventory_current` cache freshness
- evidence quality
- lineage completeness
- pallet / lot / location / project boundary の明確さ
- ADJUST / CANCEL / MOVE の解釈可能性

confidence high:

- 比較条件が比較的そろっていることを示す。
- correctness guarantee ではない。
- safe to execute ではない。

confidence low / unknown:

- 比較結果の読み方に limitation があることを示す。
- source error の確定ではない。
- automatic correction の指示ではない。

## Compare Freshness

compare freshness は、expected quantity と cached quantity がどの時点の情報として比較されているかを説明する。

分けるべき freshness:

- source freshness: `inventory_transactions` がどこまで含まれているか。
- aggregation snapshot freshness: expected quantity がどの as_of_time で作られたか。
- cache freshness: `inventory_current` がどの時点まで反映しているか。
- projection freshness: compare projection がいつ生成されたか。
- review freshness: 人がいつ確認したか。

freshness が揃っていない場合、compare mismatch は timing gap の可能性を持つ。freshness が揃っていても、compare consistency は絶対保証ではない。

## Stale Compare

stale compare は、expected 側または cached 側のどちらかが古い可能性がある比較結果である。

扱い:

- stale は data propagation / snapshot generation / cache reflection の limitation として表示する。
- stale compare mismatch は即異常ではない。
- stale compare match も correctness guarantee ではない。
- stale は `inventory_current` 更新、rebuild、replay、correction の開始条件ではない。

推奨 wording:

- 比較結果は生成時点の説明表示です。
- source transaction または cache の最新反映とは限りません。
- stale は確認制限であり、実行指示ではありません。

## Partial Compare

partial compare は、比較に必要な source / snapshot / aggregation unit / evidence / lineage の一部が不足している状態である。

原因例:

- transaction coverage が一部のみである。
- expected snapshot と cached snapshot の scope がずれている。
- warehouse / project / part / location / pallet / lot の一部が missing である。
- ADJUST / CANCEL / MOVE の意味解釈に制限がある。
- pallet relation が部分的である。
- evidence confidence が low / unknown である。

partial compare は review limitation であり、compare engine の失敗確定でも correction 指示でもない。

## False-Positive Compare

false-positive compare は、一見 mismatch に見えるが、実際には異常ではない可能性がある比較結果である。

発生し得る例:

- expected 側と cached 側の as_of_time が異なる。
- `inventory_current` cache の反映が遅れている。
- zero quantity row の表示方針が異なる。
- aggregation unit の roll-up 粒度が異なる。
- MOVE の source / destination effect の片側だけが snapshot に含まれている。
- pallet relation の反映タイミングが inventory aggregation とずれている。
- ADJUST / CANCEL の解釈が projection 間で異なる。

false-positive の可能性がある mismatch は、attention / review signal として扱う。即異常、rebuild 必須、correction 必須とは扱わない。

## Mismatch Semantics

compare mismatch は、expected quantity と cached quantity の差異が見える状態である。

主な mismatch type:

- quantity mismatch: 数量差異がある。
- missing expected: transaction aggregation 側で期待数量を説明できない。
- missing cached: `inventory_current` に対応する cache row がない。
- scope mismatch: warehouse / project / part / location / pallet / lot の境界が異なる。
- freshness mismatch: expected と cached の時点が異なる。
- evidence mismatch: 証跡・由来・trace の説明範囲が一致しない。
- pallet relation mismatch: pallet projection と part aggregation の関係が合わない。

mismatch が意味しないこと:

- source of truth error の確定
- `inventory_current` が必ず誤りであること
- transaction が必ず不足していること
- rebuild / replay / correction の実行許可
- business incident の確定

mismatch は review / investigation / audit の入口である。

## Compare Evidence

compare evidence は、比較結果をどの根拠で読めるかを示す。

含む観点:

- source transaction evidence
- aggregation unit evidence
- signed quantity evidence
- snapshot evidence
- cache observation evidence
- trace / request id evidence
- pallet relation evidence
- freshness evidence
- limitation evidence

evidence があることは correctness guarantee ではない。evidence が不足していることは automatic correction の指示ではない。evidence は compare result を安全に読むための説明材料である。

## Compare Lineage

compare lineage は、compare result がどの aggregation snapshot / cache snapshot / transaction effect / projection に由来するかを説明する。

確認観点:

- expected quantity はどの `inventory_transactions` 範囲から導出されたか。
- cached quantity はどの `inventory_current` observation から来たか。
- aggregation unit はどの境界で揃えたか。
- mismatch reason はどの evidence / trace に基づくか。
- compare projection はどの snapshot を参照しているか。

lineage は reasoning visualization であり、execution dependency ではない。lineage が揃っていても replay eligibility ではなく、lineage gap があっても correction command ではない。

## Compare Attention / Review

compare attention / review は、比較結果の見落としや誤読を防ぐための signal である。

注意確認の例:

- high difference quantity
- stale compare
- partial compare
- low confidence compare
- ambiguous ADJUST / CANCEL / MOVE semantics
- negative quantity related mismatch
- cross-projection mismatch
- pallet relation mismatch

attention は human review の補助であり、assignment、notification、approval、execution priority ではない。

## Governance Visualization との関係

governance visualization は、compare consistency を使って「比較結果をどこまで信用してよいか」「どの limitation があるか」「どの review が必要か」を説明する。

扱うもの:

- compare consistency level
- compare confidence
- compare freshness
- mismatch type
- evidence quality
- lineage completeness
- source trace relation
- limitation
- attention / review signal
- read-only boundary

扱わないもの:

- rebuild approval
- correction approval
- replay operation
- DB update decision
- `inventory_current` update
- compare execution completion

governance visualization は review / investigation / audit の補助であり、operation correctness や execution permission を保証しない。

## Compare Limitation

compare consistency には limitation がある。

- source transaction coverage が partial の場合、expected quantity を確定できない。
- expected snapshot と cached snapshot の as_of_time が異なる可能性がある。
- `inventory_current` cache が stale の場合、difference が timing gap に見える可能性がある。
- aggregation unit が揃っていない場合、mismatch の意味が曖昧になる。
- ADJUST / CANCEL / MOVE の semantics が曖昧な場合、signed effect の読み方が変わる。
- pallet / lot / location / project boundary が部分的な場合、compare scope がずれる。
- evidence confidence が low / unknown の場合、compare consistency を過信できない。
- mismatch なしでも correctness guarantee ではない。
- mismatch ありでも即異常ではない。

limitation は compare / integrity / governance visualization で明示する。limitation は execution permission ではない。

## Compare Consistency を過信しない方針

compare consistency は、比較結果を安全に読むための review signal である。

過信しないための原則:

- match は正しさの保証ではない。
- mismatch は即異常ではない。
- confidence high は safe to execute ではない。
- freshness high は correction permission ではない。
- evidence available は correctness guarantee ではない。
- partial / stale / delayed compare は通常の limitation として扱う。
- compare result から direct mutation を開始しない。

compare consistency は、review / investigation / audit の優先度や読み方を補助する。実行判断そのものではない。

## Non-Execution Boundary

B32-04 は compare consistency semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- compare engine 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

compare は execution authority ではない。compare は reasoning / review / visualization のために、consistency / confidence / freshness / mismatch / limitation を説明する conceptual boundary である。
