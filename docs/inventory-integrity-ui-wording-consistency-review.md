# Inventory Integrity UI Wording Consistency Review

Phase B35-02 inventory integrity UI wording consistency review.

この文書は、Governance Dashboard / Inventory Integrity における UI wording consistency を整理し、画面横断で用語・注意文・状態表現を統一するための wording consistency review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、UI wording engine 実装、execution workflow、auto-operation、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- wording consistency は reasoning / review / comprehension / Japanese operational UX のための read-only semantics である。
- wording は truth guarantee ではない。
- stale / partial / delayed wording context を前提にする。
- Dashboard / UI は日本語中心表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- wording consistency を execution workflow と混同しない。
- wording consistency は execution authority を持たない。
- wording consistency は rebuild、compare execution、replay、correction、UI wording engine、execution workflow、auto-operation、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityUIWordingConsistency

`InventoryIntegrityUIWordingConsistency` は、Governance Dashboard / Inventory Integrity UI で使う status / attention / review / escalation / evidence / lineage / compare / stale / operational / audit / warning wording を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- status wording consistency
- attention wording consistency
- review wording consistency
- escalation wording consistency
- evidence wording consistency
- lineage wording consistency
- compare wording consistency
- stale wording consistency
- operational wording consistency
- audit wording consistency
- warning wording consistency
- wording readability
- wording misuse risk
- wording limitation
- Japanese-first UI wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / wording boundary
- non-execution caveat

含まない意味:

- React component
- UI wording engine
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

InventoryIntegrityUIWordingConsistency は「同じ表示文言を同じ意味で読めるか」を示す review / comprehension 補助であり、「どの処理を実行するか」を示す UI ではない。

## Japanese-First UI Wording Policy

Dashboard / UI は日本語中心表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- user-facing wording は短く、action instruction にしない。
- read-only / no-execution caveat を日本語で読めるようにする。
- ambiguity がある語は caveat と一緒に表示する。
- 同じ概念は同じ日本語表現で表示する。

推奨形式:

- `日本語(English technical term)`
- `状態 + 意味 + 制限`
- `注意理由 + 確認制限 + 実行しない caveat`

避ける形式:

- 英語だけの badge。
- action verb で始まる warning。
- `execute`, `fix`, `rebuild now`, `correct now` を想起させる文言。
- disabled button で read-only を表現すること。

## Status Wording Consistency

status wording は、表示状態を workflow state と誤読させないために統一する。

推奨表現:

- `表示候補(detected)`
- `表示上の確認(observed)`
- `確認中(reviewing)`
- `根拠確認が必要(needs-evidence)`
- `確認保留(pending)`
- `古い可能性(stale)`
- `確認上は説明済み(resolved)`
- `確認対象外(rejected)`
- `現時点では対象外(ignored)`

禁止解釈:

- detected = incident confirmed
- reviewing = workflow in progress
- needs-evidence = evidence fetch command
- pending = assignment queue
- stale = rebuild required
- resolved = correction completed / truth guarantee
- ignored = safe guarantee

status wording は確認状態の読み方であり、execution authority ではない。

## Attention Wording Consistency

attention wording は、見落としや誤読を防ぐ signal として統一する。

推奨表現:

- `注意表示(attention)`
- `確認優先の候補`
- `見落とし注意`
- `差異が大きい可能性`
- `根拠不足の注意`
- `由来不足の注意`
- `境界ずれの注意`

禁止表現:

- `実行してください`
- `今すぐ修正`
- `自動修正対象`
- `再構築が必要`
- `異常確定`

attention wording は human review priority であり execution priority ではない。

## Review Wording Consistency

review wording は、人が確認する文脈として統一する。

推奨表現:

- `確認(review)`
- `人による確認`
- `確認上の状態`
- `確認制限`
- `確認メモ`
- `確認対象`

禁止表現:

- `処理状態`
- `実行状態`
- `担当割当`
- `修正中`
- `承認済み`

review wording は review / investigation / audit の補助であり、workflow state ではない。

## Escalation Wording Consistency

escalation wording は、管理上の注意優先度として統一する。

推奨表現:

- `管理上の注意優先度(escalation)`
- `参考表示(reference)`
- `注意表示(watch)`
- `確認優先(review)`
- `管理者確認(manager-review)`
- `監査観点の確認(audit-review)`
- `強い注意表示(critical-review)`

禁止表現:

- `割当済み`
- `通知済み`
- `承認済み`
- `実行優先`
- `今すぐ対応`
- `異常確定`

escalation wording は visibility / attention であり、assignment / notification / approval を意味しない。

## Evidence Wording Consistency

evidence wording は、根拠や証跡を correctness guarantee と誤読させないために統一する。

推奨表現:

- `根拠・証跡(evidence)`
- `確認用の根拠`
- `証跡あり`
- `証跡不足`
- `根拠の制限`
- `説明材料`

禁止表現:

- `正しいことを確認済み`
- `処理完了`
- `監査完了`
- `証跡を追加してください`
- `修正根拠`

evidence wording は review / audit の説明材料であり、operation correctness ではない。

## Lineage Wording Consistency

lineage wording は、由来関係を permission や execution dependency と誤読させないために統一する。

推奨表現:

- `由来関係(lineage)`
- `どの情報に由来するか`
- `由来の説明`
- `関連する表示モデル`
- `由来不足`
- `由来の制限`

禁止表現:

- `実行依存`
- `再実行可能`
- `許可済み`
- `承認関係`
- `原因確定`

lineage wording は reasoning relation であり、replay eligibility や permission granted ではない。

## Compare Wording Consistency

compare wording は、expected quantity と cached quantity の差異を安全に読むために統一する。

推奨表現:

- `比較表示(compare)`
- `期待数量`
- `キャッシュ数量`
- `表示上の差異`
- `比較上の制限`
- `一致して見える`
- `差異が見える`

禁止表現:

- `在庫が正しい`
- `在庫が誤り`
- `修正が必要`
- `再構築が必要`
- `比較完了`
- `異常確定`

compare wording は review / investigation / audit の入口であり、correction authority ではない。

## Stale Wording Consistency

stale wording は、古い可能性を inconsistency や execution trigger と誤読させないために統一する。

推奨表現:

- `古い可能性(stale)`
- `生成時点の表示`
- `最新反映とは限りません`
- `確認制限`
- `再確認した方がよい可能性`

禁止表現:

- `不整合確定`
- `古いので再構築`
- `source failed`
- `cache is wrong`
- `更新してください`

stale wording は limitation であり、`inventory_current` 更新や rebuild / replay / correction の開始条件ではない。

## Operational Wording Consistency

operational wording は、所長・事務・現場・監査が運用上安全に読むために統一する。

推奨表現:

- `運用上の確認(operational)`
- `現場説明の補助`
- `事務確認の補助`
- `管理者確認`
- `確認対象の範囲`
- `運用上の確認制限`

禁止表現:

- `作業指示`
- `現場対応してください`
- `担当割当済み`
- `通知済み`
- `実行開始`

operational wording は operational comprehension の補助であり、execution workflow ではない。

## Audit Wording Consistency

audit wording は、監査・棚卸・内部統制の確認材料として統一する。

推奨表現:

- `監査確認(audit)`
- `監査観点の確認`
- `棚卸確認の補助`
- `内部統制上の確認`
- `説明責任のための根拠`
- `監査上の確認制限`

禁止表現:

- `監査開始`
- `監査完了`
- `承認済み`
- `原因確定`
- `再実行可能`

audit wording は traceability / explanation responsibility の補助であり、audit execution ではない。

## Warning Wording Consistency

warning wording は、強い表示でも execution expectation を生まないように統一する。

推奨表現:

- `注意`
- `確認が必要な可能性`
- `制限があります`
- `誤読に注意`
- `最新反映とは限りません`
- `表示のみです`
- `実行しません`

禁止表現:

- `今すぐ実行`
- `自動修正`
- `再構築してください`
- `承認してください`
- `エラー確定`
- `修正必須`

warning は category + reason + caveat で表示する。warning は business failure confirmation ではない。

## Wording Readability

wording readability は、user が短時間で「何を見ているか」「何が重要か」「何が制限か」「何を実行しないか」を理解できる状態である。

方針:

- title / section / badge / warning / detail で同じ概念を同じ表現にする。
- badge は category + value で表示する。
- warning は reason / scope / limitation を detail で確認できるようにする。
- long wording は detail / expansion / reference に分ける。
- read-only / no-execution を常に読めるようにする。
- color や強調だけに意味を持たせない。
- execution action を scan order に入れない。

wording readability は correctness guarantee でも execution permission でもない。

## Wording Misuse Risk

wording misuse risk は、表示文言が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- `キャッシュ` を source of truth と読む。
- `比較差異` を source error と読む。
- `確認済み` を correction completed と読む。
- `注意` を action instruction と読む。
- `管理者確認` を assignment created と読む。
- `監査確認` を audit started と読む。
- `証跡あり` を operation correct と読む。
- `由来あり` を replay eligibility と読む。
- `説明可能性 high` を safe to execute と読む。
- `古い可能性` を inconsistent confirmed と読む。
- `一部のみ` を missing action required と読む。

方針:

- misuse risk は user blame ではなく wording governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- misuse risk から execution affordance を出さない。
- wording は execution remediation を提供しない。

## Wording Limitation

wording consistency には limitation がある。

- wording は用語の読み方を揃えるが、source completeness を保証しない。
- wording は truth guarantee ではない。
- stale / partial / delayed wording context を前提にする必要がある。
- Japanese-first wording でも technical ambiguity は残る可能性がある。
- English auxiliary wording が主語化すると execution expectation が生まれる可能性がある。
- warning wording が強すぎると action instruction と誤読される可能性がある。
- wording consistency は source of truth confirmation ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は UI / compare / governance visualization で明示する。limitation は execution permission ではない。

## Raw Source / Adapter / Projection / Graph / Wording Boundary

raw source / adapter / projection / graph / wording は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> UI wording consistency
  -> UI / governance / audit / operational comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- UI wording consistency: 用語・状態表現・注意文・warning wording を揃える read-only wording review。UI wording engine ではない。
- UI / governance / audit / operational comprehension: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B35-02 は inventory integrity UI wording consistency review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- UI wording engine 実装
- execution workflow 実装
- auto-operation 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

wording consistency は execution authority ではない。wording consistency は reasoning / review / comprehension のために、status / attention / review / escalation / evidence / lineage / compare / stale / operational / audit / warning wording、readability、misuse risk、limitation、Japanese-first UI wording、raw source boundary を説明する conceptual review である。
