# Inventory Integrity Semantic Consistency Review

Phase B34-03 inventory integrity semantic consistency review.

この文書は、inventory integrity / governance visualization / operational comprehension 全体における semantic consistency を整理し、用語・意味・境界が横断で矛盾しないようにするための semantic consistency review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、semantic engine 実装、execution workflow、auto-operation、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- semantic consistency は reasoning / review / comprehension / governance visualization のための read-only semantics である。
- semantic metadata は truth guarantee ではない。
- stale / partial / delayed semantic state を前提にする。
- semantic consistency を execution workflow と混同しない。
- semantic consistency は execution authority を持たない。
- semantic consistency は rebuild、compare execution、replay、correction、semantic engine、execution workflow、auto-operation、auto-fix、mutation を開始しない。

## Concept: InventoryIntegritySemanticConsistency

`InventoryIntegritySemanticConsistency` は、truth / cache / projection / snapshot / compare / review / attention / escalation / audit / operational / governance boundary の意味を横断で揃える conceptual semantics である。

含むべき意味:

- truth semantics
- cache semantics
- projection semantics
- snapshot semantics
- compare semantics
- review semantics
- attention semantics
- escalation semantics
- audit semantics
- operational semantics
- governance boundary semantics
- semantic limitation
- semantic consistency risk
- semantic readability
- semantic propagation consistency
- raw source / adapter / projection / graph / semantic boundary
- non-execution caveat

含まない意味:

- semantic engine
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

InventoryIntegritySemanticConsistency は「概念を同じ意味で読めるか」を示す横断整理であり、「どの処理を実行するか」を示す workflow object ではない。

## Truth Semantics

truth semantics は、在庫の正とする情報源を横断で揃えるための semantics である。

共通方針:

- 在庫数量の truth は `inventory_transactions` にある。
- `inventory_transactions` は入庫・出庫・移動・調整・取消の履歴イベントである。
- 現在数量は transaction history から説明できる状態として扱う。
- truth は projection / snapshot / compare / review / audit / operational metadata へ置き換えない。
- source coverage が partial の場合、truth 説明も limitation を持つ。

truth semantics が意味しないこと:

- raw source が常に完全であること
- source coverage が complete であること
- correction が不要であること
- compare mismatch が即異常であること
- execution permission

truth semantics は、判断の起点を `inventory_transactions` に置くための意味境界である。

## Cache Semantics

cache semantics は、`inventory_current` の意味を横断で揃えるための semantics である。

共通方針:

- `inventory_current` は aggregation cache / compare target である。
- `inventory_current` は source of truth ではない。
- `inventory_current` は stale / partial / delayed になり得る。
- compare では expected quantity と cached quantity の差異を説明する対象として扱う。
- audit / operational / governance では cache observation として読む。

cache semantics が意味しないこと:

- `inventory_current` correctness
- transaction 履歴の代替
- correction の根拠単体
- `inventory_current` update permission
- rebuild / replay / compare execution の開始命令

cache 表示を truth と混同しないことが、semantic consistency の最優先条件である。

## Projection Semantics

projection semantics は、source / snapshot / compare / evidence / lineage / attention / review / escalation を read-only object として読む境界である。

共通方針:

- projection は reasoning / review / audit / visualization 用である。
- projection metadata は truth guarantee ではない。
- projection identity は mutation key ではない。
- projection consistency は source of truth confirmation ではない。
- projection は stale / partial / delayed になり得る。

projection semantics が意味しないこと:

- executable command
- adapter execution
- workflow state
- approval mutation
- correction command
- `inventory_current` update permission

projection は「何が見えているか、どの制限付きか、どの根拠から読めるか」を示す。

## Snapshot Semantics

snapshot semantics は、ある時点・範囲・条件で見た観測状態を横断で揃えるための semantics である。

共通方針:

- snapshot は raw transaction そのものではない。
- snapshot は as_of_time / generated_at / observed_at を分けて読む。
- snapshot freshness は correctness guarantee ではない。
- snapshot consistency は execution permission ではない。
- stale / partial snapshot は review limitation として扱う。

snapshot semantics が意味しないこと:

- source of truth の置き換え
- `inventory_current` の正当性保証
- rebuild completion
- compare completion
- replay eligibility
- correction command

snapshot は「この条件で見ると、こう見える」という説明表示の単位である。

## Compare Semantics

compare semantics は、expected quantity と cached quantity の差異をどう安全に読むかを横断で揃える。

共通方針:

- expected quantity は `inventory_transactions` 由来として読む。
- cached quantity は `inventory_current` observation として読む。
- compare mismatch は review / investigation / audit の入口である。
- compare match は correctness guarantee ではない。
- stale / partial / delayed compare を前提にする。

compare semantics が意味しないこと:

- source of truth error の確定
- `inventory_current` が必ず誤りであること
- transaction が必ず不足していること
- rebuild / replay / correction の実行許可
- business incident の確定

compare は correction authority ではなく、差異の読み方を説明する reasoning semantics である。

## Review Semantics

review semantics は、差異・証跡・由来・制限がどの確認状態として読めるかを横断で揃える。

共通 state:

- `detected`
- `observed`
- `reviewing`
- `needs-evidence`
- `pending`
- `stale`
- `resolved`
- `rejected`
- `ignored`

共通方針:

- review state は confirmation state であり workflow state ではない。
- `resolved` は truth guarantee ではない。
- `pending` は assignment queue ではない。
- `needs-evidence` は evidence fetch command ではない。
- `stale` は rebuild required ではない。
- `ignored` は safe guarantee ではない。

review semantics は human review の補助であり、mutation authority ではない。

## Attention Semantics

attention semantics は、見落としや誤読を防ぐために注意して読むべき signal を横断で揃える。

attention 対象:

- high difference quantity
- negative quantity related mismatch
- stale / partial / delayed caveat
- unresolved review signal
- low confidence signal
- evidence gap
- lineage gap
- cross-projection mismatch
- pallet relation mismatch
- governance boundary warning

共通方針:

- attention は human review priority であり execution priority ではない。
- critical / high attention は execute now ではない。
- attention は assignment / notification / approval を意味しない。
- attention high は correction required ではない。
- attention は source of truth error の確定ではない。

attention は強調表示であって、action instruction ではない。

## Escalation Semantics

escalation semantics は、誰が重要視して読むべきかという管理上の注意優先度を横断で揃える。

共通 level:

- `reference`
- `watch`
- `review`
- `manager-review`
- `audit-review`
- `critical-review`

共通方針:

- escalation は management attention priority である。
- escalation は異常確定ではない。
- manager-review は assignment created ではない。
- audit-review は audit started ではない。
- critical-review は execute now ではない。
- escalation は execution authority ではない。

escalation は visibility / attention を示すだけで、workflow、approval、notification、correction を開始しない。

## Audit Semantics

audit semantics は、監査・棚卸・内部統制・説明責任の観点で integrity information をどう読むかを横断で揃える。

共通方針:

- audit は reasoning / review / traceability 用である。
- audit metadata は truth guarantee ではない。
- audit visibility は audit started ではない。
- evidence completeness は audit completed ではない。
- audit-review は assignment created ではない。
- trace relation は replay eligibility ではない。

audit semantics が意味しないこと:

- audit execution
- audit approval mutation
- operation correct
- causal proof
- correction required
- rebuild required

audit は説明責任を補助する意味境界であり、execution workflow ではない。

## Operational Semantics

operational semantics は、所長・事務・現場・監査が integrity information を運用上どう読むかを横断で揃える。

共通方針:

- operational semantics は reasoning / review / comprehension 用である。
- operational metadata は truth guarantee ではない。
- operational visibility は operational workflow の開始ではない。
- role-oriented visibility は権限付与や担当割当ではない。
- stale / partial / delayed operational state を前提にする。

role 別の意味境界:

- manager: 現場影響・説明責任・管理上の注意優先度として読む。
- office: 事務確認・帳票説明・照会対応の review visibility として読む。
- worker: 現場説明や確認補助として読む。作業指示ではない。
- audit / review: 証跡・由来・説明責任・内部統制上の確認材料として読む。

operational semantics は workflow object ではない。

## Governance Boundary Semantics

governance boundary semantics は、review / visualization と execution / mutation を横断で分離する意味境界である。

分離する boundary:

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

共通方針:

- governance reasoning は execution authority を持たない。
- review state は mutation authority ではない。
- escalation は execution authority ではない。
- approval semantics は rebuild authority ではない。
- compare は correction authority ではない。
- evidence available は operation correct ではない。
- lineage complete は permission granted ではない。

governance boundary は「何を見てよいか」「何を意味しないか」を分けるための semantic guardrail である。

## Semantic Limitation

semantic consistency には limitation がある。

- source coverage が partial の場合、意味境界の説明も partial になる。
- stale / delayed / partial semantic state は通常の前提として扱う必要がある。
- evidence confidence が low / unknown の場合、semantic metadata を過信できない。
- lineage gap がある場合、semantic propagation の由来説明は部分的になる。
- snapshot / compare / evidence の scope がずれている場合、semantic consistency に caveat が必要になる。
- role-oriented visibility は assignment や authority と誤読されやすい。
- attention / escalation / review は execution permission と誤読されやすい。
- semantic metadata は truth guarantee ではない。
- semantic consistency は source of truth の代替ではない。
- `inventory_current` cache 表示は truth ではない。

limitation は inventory integrity / compare / governance visualization で明示する。limitation は execution permission ではない。

## Semantic Consistency Risk

semantic consistency risk は、同じ用語や signal が dashboard / projection / audit / operational context 間で違う意味に読まれる risk である。

誤読しやすい例:

- cache を truth と読む。
- compare mismatch を source of truth error と読む。
- stale を inconsistent と読む。
- partial を missing action required と読む。
- confidence high を safe to execute と読む。
- evidence available を operation correct と読む。
- lineage complete を replay eligibility と読む。
- review `resolved` を correction completed と読む。
- escalation high を execution priority と読む。
- manager-review を assignment created と読む。
- audit-review を audit started と読む。

方針:

- same concept は same label / same caveat で読む。
- confusing pair は label / glossary / caveat で分ける。
- semantic risk は review limitation として扱う。
- semantic risk から execution affordance を出さない。

## Semantic Readability

semantic readability は、user が「何を見ているか」「何が truth か」「何が cache か」「何が制限か」「何を実行しないか」を安全に読める状態である。

readability 方針:

- truth / cache / projection / snapshot / compare を同じ表示カテゴリに混ぜない。
- read-only / no-execution caveat を常に読めるようにする。
- badge / warning は category + value + caveat で読む。
- confidence / evidence / lineage / attention / escalation は reason と limitation を合わせて読む。
- stale / partial / delayed は制限として表示する。
- execution action を semantic scan order に入れない。

semantic readability は comprehension quality であり、correctness guarantee でも execution permission でもない。

## Semantic Propagation Consistency

semantic propagation consistency は、raw source / adapter / projection / graph / audit / operational context へ metadata が伝播するときに、意味が変わらないようにする semantics である。

伝播する metadata:

- source reference
- aggregation unit
- snapshot metadata
- compare metadata
- freshness metadata
- confidence metadata
- evidence metadata
- lineage metadata
- attention metadata
- review state metadata
- escalation metadata
- audit metadata
- operational metadata
- governance boundary metadata
- limitation
- non-execution caveat

propagation 方針:

- metadata propagation は truth guarantee ではない。
- relation propagation は execution dependency ではない。
- stale / partial / delayed propagation を前提にする。
- missing metadata は semantic limitation として残す。
- propagation は workflow transition を意味しない。
- propagation 後も `inventory_current` を truth にしない。

semantic propagation consistency は、意味が context をまたいで drift しないようにするための review signal である。

## Raw Source / Adapter / Projection / Graph / Semantic Boundary

raw source / adapter / projection / graph / semantic は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> semantic consistency
  -> UI / governance / audit / operational comprehension
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / attention / review / escalation を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: projection metadata 間の node / edge / relation を整理する read-only reasoning graph。execution graph ではない。
- semantic consistency: 用語・意味・境界を横断で揃える read-only semantics。semantic engine ではない。
- UI / governance / audit / operational comprehension: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B34-03 は inventory integrity semantic consistency review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- semantic engine 実装
- execution workflow 実装
- auto-operation 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

semantic consistency は execution authority ではない。semantic consistency は reasoning / review / comprehension のために、truth / cache / projection / snapshot / compare / review / attention / escalation / audit / operational / governance boundary / limitation / propagation を横断で説明する conceptual semantics である。
