# Inventory Snapshot Semantics Review

Phase B32-03 inventory snapshot semantics review.

この文書は、inventory aggregation / compare / integrity visualization における snapshot semantics を整理し、「いつ時点の状態か」「どの整合性条件か」「どの制限付きで見ているか」を明確にするための semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、snapshot 実装、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- snapshot は raw transaction そのものではなく、ある時点・範囲・条件で見た reasoning / compare / visualization 用の観測状態である。
- snapshot は stale / partial / delayed になり得る。
- snapshot consistency は correctness guarantee ではない。
- snapshot freshness は execution permission ではない。
- snapshot は execution authority を持たない。
- snapshot は rebuild、compare execution、replay、correction、mutation を開始しない。

## Concept: InventorySnapshot

`InventorySnapshot` は、在庫 aggregation / projection / compare / integrity visualization を説明するために、ある時点の観測状態をまとめた概念である。

含むべき意味:

- snapshot id
- as_of_time
- generated_at / observed_at
- aggregation scope
- aggregation unit
- source coverage
- transaction completeness
- freshness state
- consistency state
- limitation
- lineage reference
- evidence reference
- attention / review signal

含まない意味:

- source of truth の置き換え
- `inventory_current` の正当性保証
- rebuild completion
- compare completion
- replay eligibility
- correction command
- execution authority

InventorySnapshot は「この条件で見ると、こう見える」という説明表示の単位であり、「これが最終的な在庫 truth である」という意味ではない。

## as_of_time Semantics

`as_of_time` は、snapshot がどの時点の状態として読まれるべきかを示す意味境界である。

整理する時刻:

- transaction event time: raw transaction が業務上発生した時刻。
- recorded_at: transaction が記録された時刻。
- generated_at: snapshot / projection が生成された時刻。
- observed_at: dashboard / review で観測された時刻。
- compared_at: compare projection が差異を説明する基準時刻。

注意点:

- `as_of_time` は source of truth の完全性を保証しない。
- `generated_at` が新しくても、source transaction が partial の可能性は残る。
- `observed_at` は user が見た時刻であり、aggregation の基準時刻ではない。
- event time と recorded_at がずれると、as-of の読み方に limitation が出る。
- snapshot は as_of_time を持つが、replay / rebuild の実行時刻ではない。

## Snapshot Consistency

snapshot consistency は、snapshot 内で read model / projection / source-derived quantity がどの程度同じ意味で読めるかを示す review signal である。

確認観点:

- `inventory_transactions` から expected current quantity を説明できるか。
- aggregation unit が warehouse / project / part / location / pallet / lot の境界を越えていないか。
- `inventory_current` cache と expected quantity の差異を説明できるか。
- pallet projection と inventory aggregation projection の境界が揃っているか。
- snapshot の source coverage と compare coverage が一致しているか。
- lineage / evidence / source trace が snapshot scope と対応しているか。

snapshot consistency が意味しないこと:

- source of truth error の確定
- `inventory_current` が正しいという保証
- automatic rebuild が必要という指示
- correction が必要という確定
- execution workflow の開始

## Snapshot Freshness

snapshot freshness は、snapshot が source transactions / cache / projection のどの鮮度状態で生成されたかを説明するための signal である。

分けるべき鮮度:

- source freshness: `inventory_transactions` の対象範囲がどこまで含まれているか。
- aggregation freshness: signed quantity aggregation がどの時点まで反映しているか。
- cache freshness: `inventory_current` など read model がどの時点の反映か。
- projection freshness: UI / governance projection がいつ作られたか。
- review freshness: 人がいつ確認したか。

freshness が高いことは correctness guarantee ではない。freshness が低いことは source error の確定ではない。freshness は review / investigation / audit のための読み方であり、execution permission ではない。

## Stale Snapshot

stale snapshot は、snapshot が source transaction や cache / projection の最新状態を反映していない可能性がある状態である。

扱い:

- stale は data propagation / generation timing の limitation として表示する。
- stale は `inventory_transactions` が誤っていることを意味しない。
- stale は `inventory_current` を更新してよい許可ではない。
- stale は rebuild / replay / compare execution の開始条件ではない。
- stale は compare / integrity visualization で caveat として扱う。

推奨 wording:

- snapshot は生成時点の説明表示です。
- source transaction の最新反映とは限りません。
- stale は確認制限であり、実行指示ではありません。

避ける wording:

- rebuild now
- cache is wrong
- source of truth failed
- safe to execute

## Partial Snapshot

partial snapshot は、対象範囲の一部だけを含む、または evidence / trace / source coverage が完全ではない snapshot である。

原因例:

- transaction range が一部のみである。
- warehouse / project / part / location / pallet / lot の一部が missing である。
- MOVE source / destination の片側が不完全である。
- CANCEL target が追跡できない。
- ADJUST semantics が曖昧である。
- pallet relation が部分的である。
- evidence confidence が low / unknown である。

partial は review limitation であり、automatic remediation ではない。partial snapshot を見た user が「未完了だから実行する」と誤読しないように、limitation と non-execution boundary を表示する必要がある。

## Rebuild Snapshot

rebuild snapshot は、将来 `inventory_transactions` から `inventory_current` 相当の read model を再構成するときに、どの時点・範囲・条件を対象にするかを説明する概念である。

意味:

- rebuild が成立するための source coverage / aggregation unit / signed effect を説明する。
- rebuild 前後の compare / integrity visualization で参照できる。
- source transaction から read model を説明できるかを確認する材料になる。

意味しないこと:

- rebuild 実行
- rebuild approval
- rebuild completion
- `inventory_current` 更新
- correction / replay の開始

B32-03 では rebuild snapshot の semantics だけを整理し、rebuild 実装は扱わない。

## Compare Snapshot

compare snapshot は、expected current quantity と cached current quantity をどの時点・範囲で比較しているかを説明する概念である。

含むべき意味:

- expected quantity as_of_time
- cached quantity observed_at
- compare scope
- difference quantity
- reason candidate
- freshness caveat
- consistency caveat
- evidence / lineage reference

compare snapshot の注意点:

- expected 側と cached 側の時点が異なる可能性がある。
- 差異は source error の確定ではない。
- 差異 0 は correctness guarantee ではない。
- compare snapshot は compare execution の完了を意味しない。
- compare snapshot は review / investigation / audit の入口である。

## Aggregation Snapshot と Projection の関係

aggregation snapshot は、transaction aggregation をある時点・範囲・条件で観測した状態である。projection は、その snapshot を UI / governance / integrity visualization で読める説明表示にしたものである。

関係:

```text
inventory_transactions
  -> aggregation semantics
  -> aggregation snapshot
  -> aggregation projection
  -> compare / integrity / governance visualization
```

aggregation snapshot は raw transaction ではない。projection は source of truth ではない。UI は projection を読むが、truth は `inventory_transactions` にある。

## Snapshot Lineage

snapshot lineage は、snapshot がどの transaction / aggregation unit / adapter boundary / projection に由来するかを説明する。

確認観点:

- snapshot に含まれる transaction range は何か。
- MOVE / ADJUST / CANCEL の effect はどう解釈されたか。
- aggregation unit はどの境界で grouping されたか。
- snapshot から projection への変換でどの limitation が付与されたか。
- compare / governance projection がどの snapshot を参照しているか。

snapshot lineage は reasoning visualization であり、execution dependency ではない。

## Snapshot Evidence

snapshot evidence は、snapshot を読むための根拠・証跡・制限を示す。

含む観点:

- source transaction evidence
- aggregation unit evidence
- signed quantity evidence
- trace / request id evidence
- pallet relation evidence
- cache observation evidence
- freshness evidence
- limitation evidence

evidence があることは correctness guarantee ではない。evidence が不足していることは automatic correction の指示ではない。evidence は review / audit のための説明材料である。

## Snapshot Attention / Review

snapshot attention / review は、snapshot の stale / partial / inconsistent / low-confidence な点を人が見落とさないようにするための signal である。

注意確認の例:

- stale snapshot: 最新反映ではない可能性がある。
- partial snapshot: 対象範囲が一部のみである。
- inconsistent snapshot: expected と cache の差異が見える。
- low evidence snapshot: 証跡の信頼度が低い。
- cross-projection snapshot gap: pallet / inventory / governance projection の境界が揃っていない。

attention は human review の補助であり、assignment、notification、approval、execution priority ではない。

## Governance Visualization との関係

governance visualization は、snapshot を使って「何が見えているか」「どの時点か」「どの制限付きか」「どの evidence があるか」を説明する。

扱うもの:

- snapshot freshness
- snapshot consistency
- snapshot limitation
- snapshot lineage
- snapshot evidence
- snapshot attention
- read-only boundary

扱わないもの:

- rebuild approval
- correction approval
- replay operation
- DB update decision
- source mutation
- `inventory_current` update

governance visualization は review / investigation / audit の補助であり、operation correctness や execution permission を保証しない。

## Snapshot Limitation

snapshot semantics には limitation がある。

- source transaction が partial の場合、expected current quantity を確定できない。
- as_of_time と generated_at が異なる場合、読み方に caveat が必要になる。
- `inventory_current` cache が stale の場合、compare difference が timing gap に見える可能性がある。
- aggregation unit が粗い場合、warehouse / project / location / pallet / lot の境界が曖昧になる。
- evidence が low / unknown の場合、snapshot consistency を過信できない。
- lineage gap がある場合、snapshot から raw source への説明が部分的になる。
- stale / partial / delayed snapshot は通常の前提として扱い、safe や complete と誤読しない。

limitation は visibility / integrity / evidence / attention として表示する。limitation は execution permission ではない。

## Non-Execution Boundary

B32-03 は snapshot semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- snapshot 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

snapshot は execution authority ではない。snapshot は reasoning / compare / visualization のために、時点・範囲・freshness・consistency・limitation を説明する conceptual boundary である。
