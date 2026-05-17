# Inventory Integrity Reasoning Graph Readability Semantics

Phase B33-05 inventory integrity reasoning graph readability semantics review.

この文書は、inventory integrity / governance visualization / reasoning graph における readability semantics を整理し、現場・事務・所長・監査側が reasoning graph を安全かつ理解しやすく読めるようにするための readability semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、graph UI 実装、interactive graph 実装、workflow graph 実装、execution graph 実装、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- readability は reasoning / review / comprehension / audit のための read-only quality である。
- readability は truth guarantee ではない。
- stale / partial / delayed readability を前提にする。
- graph readability を execution UI と混同しない。
- readability semantics は execution authority を持たない。
- readability semantics は rebuild、compare execution、replay、correction、workflow、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityReasoningGraphReadability

`InventoryIntegrityReasoningGraphReadability` は、reasoning graph の attention / severity / confidence / stale / review / cross-projection signal を、現場・事務・所長・監査側が安全に読めるようにする conceptual semantics である。

含むべき意味:

- attention readability semantics
- severity readability semantics
- confidence readability semantics
- review readability semantics
- stale readability semantics
- partial graph readability semantics
- cross-projection readability semantics
- manager readability semantics
- audit readability semantics
- graph readability limitation
- graph comprehension risk
- readability consistency
- raw source / adapter / projection / graph / readability boundary
- non-execution caveat

含まない意味:

- React component
- graph UI implementation
- interactive graph behavior
- workflow graph
- execution graph
- executable command
- rebuild plan execution
- correction command
- replay command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegrityReasoningGraphReadability は「graph を誰がどう読めば安全か」を示す読み方の意味整理であり、「何を実行してよいか」を示す UI ではない。

## Attention Readability Semantics

attention readability は、見落としや誤読を防ぐための attention signal を短時間で安全に読める状態を示す。

読み取り対象:

- stale / partial / delayed caveat
- low confidence signal
- negative quantity signal
- cross-projection mismatch signal
- pallet relation signal
- unresolved review signal
- evidence gap signal
- governance boundary warning

読み方:

- attention は category + reason + caveat で読む。
- attention は human review priority であり execution priority ではない。
- critical / high attention は execute now ではない。
- attention が見えることは assignment / notification / approval を意味しない。

避ける読み方:

- attention = action instruction
- attention high = correction required
- critical = rebuild now
- warning = source of truth failed

## Severity Readability Semantics

severity readability は、差異や制限の重要度を、業務影響と review priority として読みやすくする semantics である。

読み取り対象:

- quantity difference severity
- negative quantity severity
- warehouse / location boundary severity
- stale severity
- unresolved severity
- cross-projection severity
- evidence gap severity
- audit / manager visibility severity

読み方:

- severity は「注意して読む優先度」であり、異常確定ではない。
- severity high は safe to execute ではない。
- severity low は safe to ignore ではない。
- severity は source / evidence / limitation と一緒に読む。
- severity は correction / rebuild / replay の実行許可ではない。

severity 表示は、現場説明や管理者確認の優先度を補助する。実行判断そのものとして読まない。

## Confidence Readability Semantics

confidence readability は、graph や relation の説明可能性を誤読せず読める状態を示す。

読み取り対象:

- source coverage confidence
- adapter normalization confidence
- projection scope confidence
- snapshot alignment confidence
- compare consistency confidence
- evidence quality confidence
- lineage completeness confidence
- cross-projection boundary confidence

読み方:

- confidence は review / investigation / audit の判断材料としての有用度である。
- high confidence は correctness guarantee ではない。
- high confidence は safe to execute ではない。
- low confidence は wrong data の確定ではない。
- unknown confidence は safe でも無視可能でもない。
- confidence は reason と limitation を一緒に読む。

confidence readability は、根拠の読みやすさを補助する。修正や再構築を促す表示ではない。

## Review Readability Semantics

review readability は、review lifecycle state を workflow state や execution state と混同せず読める状態を示す。

読み取り対象:

- `detected`
- `observed`
- `reviewing`
- `needs-evidence`
- `pending`
- `stale`
- `resolved`
- `rejected`
- `ignored`

読み方:

- review state は確認上の表示状態であり、operation state ではない。
- `resolved` は truth guarantee ではない。
- `pending` は assignment queue ではない。
- `needs-evidence` は evidence fetch command ではない。
- `stale` は rebuild required ではない。
- `ignored` は safe guarantee ではない。

review readability は、現場・事務・所長・監査が「今どの確認状態として読めるか」を揃えるための semantics である。

## Stale Readability Semantics

stale readability は、古い可能性がある graph / projection / snapshot / evidence / review を安全に読める状態を示す。

読み取り対象:

- source freshness
- adapter normalization freshness
- projection freshness
- snapshot freshness
- compare freshness
- evidence freshness
- review freshness
- escalation freshness
- governance graph freshness

読み方:

- stale は確認制限である。
- stale は inconsistent の確定ではない。
- stale は `inventory_transactions` が誤っていることを意味しない。
- stale は `inventory_current` 更新の許可ではない。
- stale は rebuild / replay / compare execution / correction の開始条件ではない。

推奨 wording:

- graph は生成時点の reasoning 表示です。
- 最新 transaction 反映とは限りません。
- stale は確認制限であり、実行指示ではありません。

## Partial Graph Readability Semantics

partial graph readability は、node / edge / evidence / lineage の一部が不足している graph を誤読せず読める状態を示す。

partial の例:

- source coverage が一部のみである。
- snapshot scope が部分的である。
- evidence node が不足している。
- lineage edge が欠けている。
- compare coverage が揃っていない。
- cross-projection relation が一部だけ見えている。
- ADJUST / CANCEL / MOVE semantics が曖昧である。
- pallet relation が部分的である。

読み方:

- partial は limitation として読む。
- partial は missing action required ではない。
- partial graph では見えている範囲と見えていない範囲を分ける。
- partial graph は automatic remediation ではない。
- partial は no issue や confirmed error の根拠ではない。

## Cross-Projection Readability Semantics

cross-projection readability は、inventory / pallet / compare / governance など複数 projection の関係やずれを安全に読める状態を示す。

読み取り対象:

- projection scope alignment
- warehouse / project / part / location / pallet / lot boundary alignment
- snapshot as_of_time alignment
- compare coverage alignment
- evidence coverage alignment
- lineage completeness
- cross-projection mismatch
- cross-projection gap

読み方:

- cross-projection relation は review signal である。
- projection 間のずれを source of truth error と断定しない。
- mismatch は timing gap / boundary mismatch / partial coverage の可能性を持つ。
- cross-projection view でも `inventory_transactions` が truth であることを崩さない。
- `inventory_current` を source of truth として読まない。

cross-projection readability は、複数 projection の読み方を揃えるための補助であり、rebuild / replay / correction の実行許可ではない。

## Manager Readability Semantics

manager readability は、所長・管理者が現場影響や説明責任を安全に把握するための読みやすさである。

所長・管理者向けに読みやすくする観点:

- affected warehouse / location / project
- affected quantity range
- severity / attention summary
- stale / partial caveat
- unresolved review signal
- cross-warehouse / cross-location signal
- evidence / lineage limitation
- audit escalation overlap

読み方:

- manager visibility は assignment ではない。
- manager-review は workflow created ではない。
- high severity は execute now ではない。
- 管理上の注意優先度は correction authority ではない。
- 現場説明に使う場合も source / evidence / limitation を合わせて読む。

manager readability は、管理者が状況を把握しやすくするための review visibility であり、実行権限を付与しない。

## Audit Readability Semantics

audit readability は、監査側が evidence / lineage / trace / limitation を安全に確認できる読みやすさである。

監査向けに読みやすくする観点:

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

読み方:

- audit visibility は audit started ではない。
- evidence available は correctness guarantee ではない。
- lineage complete は replay eligibility ではない。
- trace relation は causal proof ではない。
- audit attention は correction / rebuild / replay の実行指示ではない。

audit readability は、監査観点で説明材料を読みやすくするための semantics であり、監査実行や承認状態を表さない。

## Graph Readability Limitation

graph readability には limitation がある。

- graph 表示は source coverage の範囲に依存する。
- stale / partial / delayed readability は通常の前提として扱う必要がある。
- node / edge が読みやすくても relation が完全とは限らない。
- confidence high は correctness guarantee ではない。
- evidence confidence が low / unknown の場合、graph を過信できない。
- lineage gap がある場合、由来説明は部分的になる。
- attention / severity / review / escalation は execution permission と誤読されやすい。
- manager / audit readability は assignment や audit start と誤読されやすい。
- cross-projection readability は boundary mismatch や timing gap を含む可能性がある。
- readability は source of truth の代替ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Graph Comprehension Risk

graph comprehension risk は、graph の読みやすさが本来の意味と異なる理解を生む risk である。

誤読しやすい例:

- readable edge relation を causal proof と読む。
- lineage complete を replay eligibility と読む。
- evidence available を operation correct と読む。
- confidence high を safe to execute と読む。
- severity high を correction required と読む。
- critical attention を execute now と読む。
- review `resolved` を correction completed と読む。
- stale を inconsistent と読む。
- partial を missing action required と読む。
- manager-review を assignment created と読む。
- audit-review を audit started と読む。
- cross-projection mismatch を source of truth error と読む。

方針:

- confusing pair は label / glossary / caveat で分ける。
- graph relation は truth guarantee ではないことを明示する。
- attention / severity / confidence / review / escalation は action wording にしない。
- comprehension risk は review limitation として扱う。
- comprehension risk から execution affordance を出さない。

## Readability Consistency

readability consistency は、graph readability が role / signal / page をまたいでも同じ意味で読めるかを示す review signal である。

確認観点:

- same concept は same label で読めるか。
- attention / severity / confidence の category と value が分かれているか。
- stale / partial / delayed の caveat が一貫しているか。
- source / derived / cache / projection / graph の区別が保たれているか。
- review state が workflow state に見えていないか。
- manager / audit signal が assignment / audit start に見えていないか。
- cross-projection mismatch が source of truth error と断定されていないか。
- read-only / no-execution boundary が常に読めるか。

readability consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- graph completeness
- rebuild required
- correction required
- execution permission

## Raw Source / Adapter / Projection / Graph / Readability Boundary

raw source / adapter / projection / graph / readability は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> graph readability
  -> operational comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- graph readability: 現場・事務・所長・監査が graph を安全に読むための readability semantics。execution UI ではない。
- operational comprehension: user が review / investigation / audit のために理解する状態。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B33-05 は inventory integrity reasoning graph readability semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- graph UI 実装
- interactive graph 実装
- workflow graph 実装
- execution graph 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

readability semantics は execution authority ではない。readability semantics は reasoning / review / comprehension のために、attention / severity / confidence / review / stale / partial / cross-projection / manager / audit の読み方、comprehension risk、limitation、consistency、raw source boundary を説明する conceptual semantics である。
