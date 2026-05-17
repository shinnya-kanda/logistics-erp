# Inventory Integrity Warning Semantics Review

Phase B35-03 inventory integrity warning semantics review.

この文書は、Governance Dashboard / Inventory Integrity における warning semantics を整理し、warning / attention / escalation / review required の意味境界と表示強度を統一するための warning semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、warning engine 実装、execution workflow、auto-warning、auto-escalation、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- warning semantics は reasoning / review / comprehension / operational safety のための read-only semantics である。
- warning metadata は truth guarantee ではない。
- stale / partial / delayed warning state を前提にする。
- Dashboard / UI は日本語中心 warning 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- warning semantics を execution workflow と混同しない。
- warning semantics は execution authority を持たない。
- warning semantics は rebuild、compare execution、replay、correction、warning engine、execution workflow、auto-warning、auto-escalation、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityWarningSemantics

`InventoryIntegrityWarningSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される info / notice / attention / warning / critical / review required / audit required / escalation required を、同じ表示強度・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- info semantics
- notice semantics
- attention semantics
- warning semantics
- critical semantics
- review required semantics
- audit required semantics
- escalation required semantics
- warning visibility semantics
- warning readability semantics
- warning misuse risk
- warning limitation
- warning consistency
- Japanese-first warning wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / warning boundary
- non-execution caveat

含まない意味:

- React component
- warning engine
- automatic escalation
- automatic notification
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

InventoryIntegrityWarningSemantics は「warning をどの強度・どの意味で読めるか」を示す review / comprehension 補助であり、「何を実行するか」を示す UI ではない。

## Japanese-First Warning Wording Policy

Dashboard / UI は日本語中心 warning 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- warning は `category + reason + caveat` で表示する。
- 強い色や強調だけに意味を持たせない。
- action instruction に見える文言を避ける。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `注意: 確認が必要な可能性があります`
- `制限: 最新反映とは限りません`
- `強い注意: 実行指示ではありません`
- `監査観点の確認: 自動監査ではありません`

避ける形式:

- `今すぐ実行`
- `修正してください`
- `再構築が必要`
- `自動対応`
- `異常確定`

## Info Semantics

info は、通常の説明や参照情報を示す最も低い表示強度である。

推奨表現:

- `情報(info)`
- `参考情報`
- `表示上の説明`
- `確認用の補足`

意味:

- review / comprehension の補助である。
- source / projection / snapshot / compare の読み方を補足する。
- urgent attention ではない。

禁止解釈:

- correctness guarantee
- source of truth confirmation
- execution permission
- safe to ignore

info は通常表示だが、truth guarantee ではない。

## Notice Semantics

notice は、通常表示より少し注意して読むべき補足や caveat を示す。

推奨表現:

- `補足(notice)`
- `確認補足`
- `読み方の補足`
- `制限の補足`

意味:

- 表示の読み方に caveat があることを示す。
- stale / partial / delayed などの前提を軽く知らせる。
- review の入口になることがある。

禁止解釈:

- action instruction
- warning confirmed
- assignment created
- correction required

notice は読み方の補足であり、execution workflow の開始ではない。

## Attention Semantics

attention は、見落としや誤読を防ぐために注意して読むべき signal である。

推奨表現:

- `注意表示(attention)`
- `見落とし注意`
- `確認優先の候補`
- `注意して確認`

意味:

- human review priority を示す。
- difference / stale / partial / evidence gap / lineage gap などを見落とさないための表示である。
- review / investigation / audit の補助である。

禁止解釈:

- execute now
- execution priority
- assignment
- notification
- approval
- correction required

attention は action instruction ではない。

## Warning Semantics

warning は、attention より強い確認制限や誤読 risk を示す。

推奨表現:

- `警告(warning)`
- `確認制限があります`
- `誤読に注意`
- `強めの注意表示`

意味:

- review / investigation / audit で優先して確認した方がよい可能性を示す。
- stale / partial / low confidence / missing evidence / boundary mismatch などの risk を目立たせる。
- reading limitation を明示する。

禁止解釈:

- business failure confirmed
- source of truth error confirmed
- rebuild required
- correction required
- automatic remediation

warning は表示強度であり、実行権限ではない。

## Critical Semantics

critical は、強い注意表示が必要な状態を示す。ただし execution trigger ではない。

推奨表現:

- `強い注意(critical)`
- `優先確認が必要な可能性`
- `重要な確認候補`
- `強い確認制限`

意味:

- 数量差異、境界ずれ、cross-warehouse、negative quantity、audit risk などを強く見落とさないようにする。
- manager / audit / operational review で優先的に読む候補である。
- high visibility を持つ review signal である。

禁止解釈:

- execute now
- emergency operation
- automatic escalation
- incident confirmed
- correction required
- rebuild required

critical は human review priority であり、execution priority ではない。

## Review Required Semantics

review required は、人による確認が有用または必要そうに見える状態を示す。

推奨表現:

- `確認が必要な可能性(review required)`
- `人による確認候補`
- `確認優先`
- `確認対象`

意味:

- 差異、根拠不足、由来不足、stale / partial / delayed caveat を人が確認する候補である。
- review / investigation の入口である。
- workflow queue ではない。

禁止解釈:

- assignment created
- notification sent
- workflow started
- correction in progress
- approval required

review required は確認候補であり、execution workflow ではない。

## Audit Required Semantics

audit required は、監査観点で確認した方がよい可能性を示す。

推奨表現:

- `監査観点の確認(audit required)`
- `監査確認の候補`
- `証跡確認の候補`
- `説明責任の確認候補`

意味:

- evidence / lineage / trace / limitation を監査観点で読む候補である。
- audit / review の visibility を高める。
- internal control / inventory audit / explanation responsibility の補助である。

禁止解釈:

- audit started
- audit completed
- audit assignment created
- audit approval mutation
- correction required

audit required は audit visibility であり、audit execution ではない。

## Escalation Required Semantics

escalation required は、管理上の注意優先度を上げて読むべき可能性を示す。

推奨表現:

- `管理上の注意が必要な可能性(escalation required)`
- `管理者確認の候補`
- `注意優先度が高い候補`
- `強い注意表示の候補`

意味:

- manager-review / audit-review / critical-review に近い visibility を示す。
- who should pay attention の補助である。
- unresolved / stale / cross-warehouse / evidence gap / lineage gap を見落とさないための表示である。

禁止解釈:

- escalation executed
- assignment created
- notification sent
- approval required
- execute first

escalation required は management attention priority であり、execution authority ではない。

## Warning Visibility Semantics

warning visibility は、どの warning をどの程度目立たせるかを示す。

visibility 方針:

- read-only / no-execution caveat を warning と一緒に表示する。
- critical / audit required / review required は折りたたみ内に隠しすぎない。
- stale / partial / delayed は limitation として見えるようにする。
- confidence / evidence / lineage の理由を detail で確認できるようにする。
- color だけで severity を伝えない。
- warning と execution control を近接させない。

visibility が意味しないこと:

- action priority
- workflow priority
- mutation permission
- incident confirmation

warning visibility は comprehension safety のための表示強度である。

## Warning Readability Semantics

warning readability は、warning を短時間で安全に読める状態である。

readability 方針:

- warning は category + reason + caveat で表示する。
- reason / scope / limitation を分ける。
- long warning text は detail / expansion / reference に分ける。
- same level は same label で表示する。
- confusing pair は glossary / tooltip / caveat で分ける。
- action wording を避ける。

推奨 wording:

- `警告: 比較条件に制限があります。実行指示ではありません。`
- `強い注意: 管理者確認の候補です。自動割当ではありません。`
- `監査観点の確認: 証跡確認の候補です。監査開始ではありません。`

warning readability は correctness guarantee でも execution permission でもない。

## Warning Misuse Risk

warning misuse risk は、warning 表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- info を safe to ignore と読む。
- notice を action instruction と読む。
- attention high を execute now と読む。
- warning を business failure confirmed と読む。
- critical を emergency operation と読む。
- review required を assignment created と読む。
- audit required を audit started と読む。
- escalation required を notification sent と読む。
- stale warning を cache is wrong と読む。
- partial warning を missing action required と読む。

方針:

- misuse risk は user blame ではなく warning governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- warning misuse risk から execution affordance を出さない。
- warning は execution remediation を提供しない。

## Warning Limitation

warning semantics には limitation がある。

- warning は読み方を揃えるが、source completeness を保証しない。
- warning metadata は truth guarantee ではない。
- stale / partial / delayed warning state を前提にする必要がある。
- warning level が高くても source error の確定ではない。
- warning level が低くても safe guarantee ではない。
- Japanese-first wording でも technical ambiguity は残る可能性がある。
- English auxiliary wording が主語化すると execution expectation が生まれる可能性がある。
- warning consistency は source of truth confirmation ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Warning Consistency

warning consistency は、warning / attention / escalation / review required が Dashboard / UI / audit / operational explanation で同じ意味に読めるかを示す review signal である。

確認観点:

- info / notice / attention / warning / critical の表示強度が一貫しているか。
- review required / audit required / escalation required が workflow state に見えていないか。
- warning label が action instruction に見えていないか。
- stale / partial / delayed warning が limitation として読めるか。
- confidence / evidence / lineage warning が correctness guarantee に見えていないか。
- critical warning が execute now に見えていないか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_current` を truth として扱っていないか。

warning consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- warning engine availability
- execution permission
- workflow transition

## Raw Source / Adapter / Projection / Graph / Warning Boundary

raw source / adapter / projection / graph / warning は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> warning semantics
  -> UI / governance / audit / operational comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- warning semantics: warning / attention / escalation / review required の意味境界と表示強度を揃える read-only review。warning engine ではない。
- UI / governance / audit / operational comprehension: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B35-03 は inventory integrity warning semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- warning engine 実装
- execution workflow 実装
- auto-warning 実装
- auto-escalation 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

warning semantics は execution authority ではない。warning semantics は reasoning / review / comprehension のために、info / notice / attention / warning / critical / review required / audit required / escalation required、visibility、readability、misuse risk、limitation、consistency、Japanese-first warning wording、raw source boundary を説明する conceptual review である。
