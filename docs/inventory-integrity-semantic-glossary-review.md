# Inventory Integrity Semantic Glossary Review

Phase B35-01 inventory integrity semantic glossary review.

この文書は、inventory integrity / governance visualization / operational comprehension における semantic glossary を整理し、用語・意味・禁止解釈・関連概念を横断で統一するための glossary review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、glossary engine 実装、execution workflow、auto-operation、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- glossary は reasoning / review / comprehension / implementation guidance のための shared semantic language である。
- glossary metadata は truth guarantee ではない。
- Dashboard / UI は日本語中心表記を採用する。
- 英語は内部 technical semantics を補助する用途に留める。
- glossary を execution workflow と混同しない。
- glossary は execution authority を持たない。
- glossary は rebuild、compare execution、replay、correction、glossary engine、execution workflow、auto-operation、auto-fix、mutation を開始しない。

## Concept: InventoryIntegritySemanticGlossary

`InventoryIntegritySemanticGlossary` は、inventory integrity / governance visualization / operational comprehension で使う用語を、同じ意味・同じ禁止解釈・同じ関連概念で読めるようにする conceptual glossary である。

含むべき意味:

- glossary entry structure
- Japanese-first UI wording
- English technical auxiliary wording
- semantic readability
- semantic misuse risk
- semantic limitation
- glossary consistency
- raw source / adapter / projection / graph / glossary boundary
- non-execution caveat

含まない意味:

- glossary engine
- automatic translation
- executable command
- workflow state
- approval mutation
- assignment creation
- notification sending
- rebuild plan execution
- correction command
- replay command
- `inventory_current` update permission
- source of truth confirmation

InventoryIntegritySemanticGlossary は「同じ言葉を同じ意味で読む」ための review / comprehension 補助であり、「どの処理を実行するか」を示す workflow object ではない。

## Glossary Entry Structure

glossary entry は、以下の項目で整理する。

- 用語: technical term または domain term。
- 日本語 UI 推奨表現: Dashboard / UI で優先して表示する日本語中心表記。
- 意味: reasoning / review / governance 上、安全に読んでよい意味。
- 禁止解釈: 誤読してはいけない意味、または execution expectation につながる読み方。
- 関連概念: 一緒に読むべき周辺概念。
- 注意事項: stale / partial / delayed / read-only / no-execution などの caveat。

entry structure の方針:

- 用語だけで判断させない。
- 日本語 UI 推奨表現には必要に応じて英語を括弧で補助する。
- 禁止解釈を必ず明示する。
- 関連概念は execution dependency ではなく reasoning relation として扱う。
- glossary entry は correctness guarantee ではない。

## Japanese-First UI Wording

Dashboard / UI は日本語中心表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は technical semantics の補助として括弧内に置く。
- user-facing label は実行を想起させない表現にする。
- read-only / no-execution caveat を日本語で読めるようにする。
- ambiguity がある語は短い説明または caveat を添える。

推奨例:

- 由来データ(source trace)
- 表示モデル(projection)
- 比較表示(compare)
- 確認状態(review state)
- 注意表示(attention)
- 管理上の注意優先度(escalation)
- 参照のみ(READ ONLY)
- 実行しません(NO EXECUTION)

英語は UI の主語ではなく、implementation guidance / technical semantics / glossary alignment の補助として使う。

## Glossary Entries

### truth

- 日本語 UI 推奨表現: 在庫の正(truth)
- 意味: 在庫数量を説明する起点。inventory integrity では `inventory_transactions` を truth として扱う。
- 禁止解釈: raw source が常に完全である、compare mismatch が即異常である、correction が不要である、execution permission がある。
- 関連概念: `inventory_transactions`, source coverage, evidence, lineage, semantic limitation。
- 注意事項: truth 説明も stale / partial / delayed source coverage の limitation を持ち得る。

### cache

- 日本語 UI 推奨表現: 集計キャッシュ(cache)
- 意味: `inventory_current` など、表示や比較のために保持された read model / aggregation cache。
- 禁止解釈: source of truth、transaction 履歴の代替、単独の correction 根拠、更新許可。
- 関連概念: `inventory_current`, compare target, cache freshness, expected quantity。
- 注意事項: `inventory_current` を source of truth にしない。stale / partial / delayed になり得る。

### projection

- 日本語 UI 推奨表現: 表示モデル(projection)
- 意味: source / snapshot / compare / evidence / lineage / attention / review / escalation を読める形にした read-only object。
- 禁止解釈: executable command、workflow state、mutation key、source of truth confirmation。
- 関連概念: adapter, snapshot, compare, evidence, lineage, governance boundary。
- 注意事項: projection metadata は truth guarantee ではない。

### snapshot

- 日本語 UI 推奨表現: 観測時点(snapshot)
- 意味: ある時点・範囲・条件で見た reasoning / compare / visualization 用の観測状態。
- 禁止解釈: source of truth の置き換え、`inventory_current` の正当性保証、rebuild completion、replay eligibility。
- 関連概念: as_of_time, generated_at, observed_at, freshness, partial, stale。
- 注意事項: snapshot は raw transaction そのものではない。

### compare

- 日本語 UI 推奨表現: 比較表示(compare)
- 意味: `inventory_transactions` 由来の expected quantity と `inventory_current` 由来の cached quantity の差異を説明する reasoning 表示。
- 禁止解釈: source of truth error の確定、`inventory_current` が必ず誤りであること、correction authority、compare execution completion。
- 関連概念: expected quantity, cached quantity, mismatch, confidence, freshness。
- 注意事項: compare mismatch は review / investigation / audit の入口であり、実行指示ではない。

### review

- 日本語 UI 推奨表現: 確認状態(review)
- 意味: 差異・証跡・由来・制限がどの確認状態として読めるかを示す review signal。
- 禁止解釈: workflow state、assignment queue、correction in progress、truth guarantee。
- 関連概念: detected, observed, reviewing, needs-evidence, pending, stale, resolved, rejected, ignored。
- 注意事項: review state は mutation authority ではない。

### attention

- 日本語 UI 推奨表現: 注意表示(attention)
- 意味: 見落としや誤読を防ぐために注意して読むべき signal。
- 禁止解釈: action instruction、execute now、assignment、notification、execution priority。
- 関連概念: severity, stale, partial, low confidence, evidence gap, lineage gap。
- 注意事項: critical / high attention でも correction / rebuild / replay は開始しない。

### escalation

- 日本語 UI 推奨表現: 管理上の注意優先度(escalation)
- 意味: 誰が重要視して読むべきかを示す management attention priority。
- 禁止解釈: execution authority、assignment created、audit started、execute now、異常確定。
- 関連概念: reference, watch, review, manager-review, audit-review, critical-review。
- 注意事項: escalation は workflow、approval、notification、correction を開始しない。

### audit

- 日本語 UI 推奨表現: 監査確認(audit)
- 意味: 監査・棚卸・内部統制・説明責任の観点で integrity information を読むこと。
- 禁止解釈: audit started、audit completed、audit approval mutation、operation correct、causal proof。
- 関連概念: audit evidence, audit lineage, audit traceability, audit limitation。
- 注意事項: audit metadata は truth guarantee ではない。

### operational

- 日本語 UI 推奨表現: 運用上の確認(operational)
- 意味: 所長・事務・現場・監査が integrity information を運用上安全に読むこと。
- 禁止解釈: operational workflow、assignment created、operation started、physical action instruction。
- 関連概念: manager, office, worker, audit / review, operational visibility。
- 注意事項: operational metadata は truth guarantee ではない。

### reasoning

- 日本語 UI 推奨表現: 理由づけ(reasoning)
- 意味: source / evidence / lineage / limitation から「どう読めるか」を説明すること。
- 禁止解釈: cause confirmed、execution plan、workflow decision、automatic remediation。
- 関連概念: projection, graph, evidence, confidence, limitation。
- 注意事項: reasoning は review / comprehension の補助であり、実行判断そのものではない。

### lineage

- 日本語 UI 推奨表現: 由来関係(lineage)
- 意味: projection / review / escalation がどの source / snapshot / compare / evidence に由来するかを示す relation。
- 禁止解釈: permission granted、replay eligibility、execution dependency、correction command。
- 関連概念: source trace, evidence, trace id, parent / child projection。
- 注意事項: lineage complete は correctness guarantee ではない。

### evidence

- 日本語 UI 推奨表現: 根拠・証跡(evidence)
- 意味: projection / compare / review / audit を読むための根拠や説明材料。
- 禁止解釈: operation correct、source of truth verified、upload action required、audit completed。
- 関連概念: source transaction evidence, compare evidence, snapshot evidence, limitation evidence。
- 注意事項: evidence available は correctness guarantee ではない。

### source trace

- 日本語 UI 推奨表現: 由来データ(source trace)
- 意味: `inventory_transactions` や related source relation を参照し、どの情報から表示が来たかを説明する trace。
- 禁止解釈: source mutation、replay permission、causal proof、approval hierarchy。
- 関連概念: trace id, request id, parent trace id, lineage, evidence。
- 注意事項: source trace は read-only reference であり、実行依存ではない。

### governance boundary

- 日本語 UI 推奨表現: ガバナンス境界(governance boundary)
- 意味: review / visualization と execution / mutation を混同しないための意味境界。
- 禁止解釈: execution authority、mutation authority、approval execution authority、auto-fix authority。
- 関連概念: review boundary, execution boundary, mutation boundary, approval boundary, compare boundary。
- 注意事項: boundary は correctness guarantee ではなく、誤読防止の guardrail である。

### freshness

- 日本語 UI 推奨表現: 鮮度(freshness)
- 意味: source / snapshot / compare / evidence / review / projection がどの時点の情報として読めるかを示す。
- 禁止解釈: correctness guarantee、source error confirmation、execution permission。
- 関連概念: stale, as_of_time, generated_at, observed_at, compared_at。
- 注意事項: freshness high でも safe to execute ではない。

### confidence

- 日本語 UI 推奨表現: 説明可能性(confidence)
- 意味: evidence / scope / lineage / freshness などがどの程度そろい、読めるかを示す review signal。
- 禁止解釈: correctness guarantee、safe to execute、approval ready、cause confirmed、audit completed。
- 関連概念: evidence quality, source coverage, lineage completeness, compare consistency。
- 注意事項: confidence low / unknown は automatic correction ではない。

### stale

- 日本語 UI 推奨表現: 古い可能性(stale)
- 意味: source / snapshot / compare / evidence / review / projection が最新状態を反映していない可能性。
- 禁止解釈: inconsistent confirmed、source of truth failed、rebuild required、`inventory_current` update permitted。
- 関連概念: freshness, delayed, snapshot, compare, review limitation。
- 注意事項: stale は確認制限であり、実行指示ではない。

### partial

- 日本語 UI 推奨表現: 一部のみ(partial)
- 意味: source / snapshot / compare / evidence / lineage / graph の一部だけが見えている、または不足している状態。
- 禁止解釈: missing action required、confirmed error、no issue、automatic remediation。
- 関連概念: source coverage, evidence gap, lineage gap, limitation, unknown。
- 注意事項: partial は review limitation として表示する。

## Semantic Readability Policy

semantic readability は、Dashboard / UI で用語が短時間で安全に読める状態である。

方針:

- same concept は same label で表示する。
- confusing pair は glossary / tooltip / caveat で分ける。
- badge / warning は category + value + caveat で読む。
- truth / cache / projection / snapshot / compare を同じ表示カテゴリに混ぜない。
- confidence / evidence / lineage / attention / escalation は reason と limitation を合わせて読む。
- read-only / no-execution caveat を常に読めるようにする。

semantic readability は correctness guarantee でも execution permission でもない。

## Semantic Misuse Risk

semantic misuse risk は、glossary 用語が本来と異なる意味で使われる risk である。

誤用しやすい例:

- truth を raw source completeness と読む。
- cache を source of truth と読む。
- projection を executable object と読む。
- snapshot を final state と読む。
- compare mismatch を source error と読む。
- review `resolved` を correction completed と読む。
- attention high を execute now と読む。
- escalation を assignment と読む。
- audit を audit execution と読む。
- lineage を replay permission と読む。
- evidence を operation correct と読む。
- confidence high を safe to execute と読む。
- stale を inconsistent と読む。
- partial を missing action required と読む。

方針:

- misuse risk は user blame ではなく governance quality risk として扱う。
- misuse risk は review limitation として明示する。
- misuse risk から execution affordance を出さない。
- glossary は execution remediation を提供しない。

## Semantic Limitation

glossary には limitation がある。

- glossary は用語の意味を揃えるが、source completeness を保証しない。
- glossary metadata は truth guarantee ではない。
- stale / partial / delayed semantic state を前提にする必要がある。
- context により補足 caveat が必要になる。
- Japanese-first wording でも technical ambiguity は残る可能性がある。
- English auxiliary wording が主語化すると execution expectation が生まれる可能性がある。
- glossary consistency は source of truth confirmation ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Glossary Consistency

glossary consistency は、同じ用語が Dashboard / UI / projection metadata / reasoning visualization / audit / operational explanation / implementation guidance で同じ意味に読めるかを示す review signal である。

確認観点:

- 日本語 UI 推奨表現が同じ概念に対して一貫しているか。
- 英語 technical term が補助として使われているか。
- 禁止解釈が用語ごとに明示されているか。
- truth / cache の境界が崩れていないか。
- confidence / evidence / lineage が correctness guarantee に見えていないか。
- attention / escalation / review が execution expectation を生んでいないか。
- stale / partial が limitation として読めるか。
- glossary が workflow object と誤読されていないか。

glossary consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- UI 実装完了
- semantic engine availability
- execution permission

## Raw Source / Adapter / Projection / Graph / Glossary Boundary

raw source / adapter / projection / graph / glossary は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> semantic glossary
  -> UI / governance / audit / operational comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- semantic glossary: 用語・日本語 UI 表現・禁止解釈・関連概念を揃える read-only glossary。glossary engine ではない。
- UI / governance / audit / operational comprehension: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B35-01 は inventory integrity semantic glossary review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- glossary engine 実装
- execution workflow 実装
- auto-operation 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

glossary は execution authority ではない。glossary は reasoning / review / comprehension のために、用語、日本語 UI 推奨表現、意味、禁止解釈、関連概念、注意事項、misuse risk、limitation、consistency、raw source boundary を説明する conceptual review である。
