# Inventory Integrity Freshness Semantics Review

Phase B36-03 inventory integrity freshness semantics review.

この文書は、Governance Dashboard / Inventory Integrity における freshness semantics を整理し、「情報がどれくらい新しいか」の意味・境界・読み方を横断で統一するための freshness semantics review である。

これは実装ではない。DB、migration、SQL、RPC、Edge Function、API、React UI、freshness engine 実装、live execution、execution workflow、auto-refresh、auto-fix、rebuild、compare execution、replay、correction、`inventory_current` 更新は扱わない。

## 基本方針

- 在庫の source of truth は `inventory_transactions` である。
- `inventory_current` は aggregation cache / compare target であり、source of truth ではない。
- freshness semantics は reasoning / review / comprehension / governance explanation のための read-only semantics である。
- freshness metadata は truth guarantee ではない。
- stale / partial / delayed freshness state を前提にする。
- Dashboard / UI は日本語中心 freshness 表記を採用する。
- 英語は technical semantics を補助する用途に留める。
- freshness semantics を execution workflow と混同しない。
- freshness semantics は execution authority を持たない。
- freshness semantics は rebuild、compare execution、replay、correction、freshness engine、live execution、execution workflow、auto-refresh、auto-fix、mutation を開始しない。

## Concept: InventoryIntegrityFreshnessSemantics

`InventoryIntegrityFreshnessSemantics` は、Governance Dashboard / Inventory Integrity UI で表示される fresh / stale / delayed / expired / unknown freshness を、同じ意味・同じ禁止解釈・同じ caveat で読めるようにする conceptual review である。

含むべき意味:

- fresh semantics
- stale semantics
- delayed semantics
- expired semantics
- unknown freshness semantics
- freshness visibility semantics
- freshness readability semantics
- freshness limitation semantics
- freshness propagation semantics
- freshness と confidence の違い
- freshness と state の違い
- freshness と priority の違い
- freshness misuse risk
- freshness consistency
- Japanese-first freshness wording
- English technical auxiliary wording
- raw source / adapter / projection / graph / freshness boundary
- non-execution caveat

含まない意味:

- React component
- freshness engine
- automatic refresh
- live execution
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

InventoryIntegrityFreshnessSemantics は「どの時点・鮮度・遅延・制限付きで読めるか」を示す review / audit / governance explanation の補助であり、「最新だから正しい」「古いから再構築する」「自動更新する」を示す workflow object ではない。

## Japanese-First Freshness Wording Policy

Dashboard / UI は日本語中心 freshness 表記を採用する。

方針:

- 主表示は日本語にする。
- 英語は括弧内の technical semantics 補助として使う。
- freshness は `level + timestamp/scope + caveat` で表示する。
- fresh を correctness guarantee に見せない。
- stale / expired を rebuild required に見せない。
- delayed を correction required に見せない。
- unknown freshness を safe to ignore に見せない。
- read-only / no-execution caveat を日本語で読めるようにする。

推奨形式:

- `新しい可能性(fresh): 表示時点では比較的新しい情報です。正しさ保証ではありません。`
- `古い可能性(stale): 最新反映とは限りません。再構築指示ではありません。`
- `反映遅延の可能性(delayed): 反映に遅れがある可能性があります。修正指示ではありません。`
- `期限切れの可能性(expired): 確認時点として古すぎる可能性があります。自動更新ではありません。`
- `鮮度不明(unknown freshness): 時点を判断できません。安全保証ではありません。`

避ける形式:

- `最新なので正しい`
- `古いので再構築`
- `遅延なので修正`
- `期限切れなので自動更新`
- `ライブ実行中`
- `安全`

## Fresh Semantics

fresh は、対象情報が比較的新しい時点・範囲・条件として読める状態を示す。

推奨表現:

- `新しい可能性(fresh)`
- `比較的新しい表示`
- `直近の表示`
- `鮮度が高い表示`

意味:

- source / snapshot / projection / evidence / review の時点が比較的新しい可能性を示す。
- review / audit / operational comprehension で時点 caveat が比較的小さいことを示す。
- freshness reason と as_of_time / generated_at / observed_at を一緒に読むべき状態である。

禁止解釈:

- correctness guarantee
- safe to execute
- source complete
- cache correct
- audit completed
- live data guarantee

fresh は時点の新しさであり、正しさ保証ではない。

## Stale Semantics

stale は、対象情報が最新 context を反映していない可能性を示す。

推奨表現:

- `古い可能性(stale)`
- `最新反映とは限りません`
- `過去時点の表示`
- `確認時点に制限あり`

意味:

- source / snapshot / projection / evidence / review / graph の freshness に制限がある。
- review / audit / operational comprehension で caveat として読む。
- delayed update や snapshot 時点の違いを見落とさないための signal である。

禁止解釈:

- source of truth failed
- `inventory_current` is wrong confirmed
- rebuild required
- correction required
- compare execution required
- safe to ignore

stale は確認制限であり、execution trigger ではない。

## Delayed Semantics

delayed は、source / cache / projection / graph / UI への反映が遅れている可能性を示す。

推奨表現:

- `反映遅延の可能性(delayed)`
- `反映に遅れがある可能性`
- `遅延 caveat`
- `反映時点に制限あり`

意味:

- event time / recorded_at / generated_at / observed_at の間にずれがある可能性を示す。
- transaction は存在しても projection や cache observation に未反映の可能性がある。
- review / audit / operational explanation で timing caveat として読む。

禁止解釈:

- operation failed
- correction required
- retry required
- auto-refresh started
- live execution in progress
- source error confirmed

delayed は反映時点の制限であり、修正・再実行・自動更新の指示ではない。

## Expired Semantics

expired は、確認・監査・運用説明の時点として古すぎる可能性があり、現在 context の説明には制限が強い状態を示す。

推奨表現:

- `期限切れの可能性(expired)`
- `確認時点として古い可能性`
- `現在説明には制限あり`
- `再確認が必要な可能性`

意味:

- freshness window や review policy 上、古すぎる可能性を示す。
- current review / audit / operational explanation には強い caveat が必要である。
- priority / warning / confidence limitation の理由になり得る。

禁止解釈:

- automatic refresh required
- rebuild required
- correction required
- data invalid confirmed
- source error confirmed
- safe to ignore

expired は強い鮮度制限であり、auto-refresh や rebuild の実行条件ではない。

## Unknown Freshness Semantics

unknown freshness は、対象情報がどの時点のものとして読めるか判断できない状態を示す。

推奨表現:

- `鮮度不明(unknown freshness)`
- `時点不明`
- `更新時点を確認できません`
- `鮮度判断材料が不足しています`

意味:

- as_of_time / generated_at / observed_at / recorded_at などが不足または不明である。
- freshness level を安全に判断できない。
- review limitation として表示する。

禁止解釈:

- safe to ignore
- no issue
- wrong data confirmed
- automatic refresh required
- source missing confirmed

unknown freshness は不明であることの表示であり、安全保証ではない。

## Freshness Visibility Semantics

freshness visibility は、freshness level と時点・範囲・制限をどの程度見えるようにするかを示す。

visibility 方針:

- freshness level と timestamp / scope / reason を一緒に表示する。
- as_of_time / generated_at / observed_at / recorded_at を混同しない。
- stale / delayed / expired / unknown は limitation として見えるようにする。
- fresh には correctness guarantee ではない caveat を添える。
- color だけで freshness を伝えない。
- freshness と confidence / state / priority を label で区別する。
- freshness と execution control を近接させない。

visibility が意味しないこと:

- correctness confirmation
- operation completion
- audit completion
- mutation permission
- execution readiness

freshness visibility は governance explanation のための表示整理である。

## Freshness Readability Semantics

freshness readability は、freshness level を短時間で安全に読める状態である。

readability 方針:

- freshness は `level + timestamp/scope + caveat` で表示する。
- same freshness level は same label で表示する。
- freshness level / timestamp / limitation を混同しない。
- fresh には correctness guarantee ではない caveat を添える。
- stale / delayed / expired には rebuild / correction / refresh 指示ではない caveat を添える。
- unknown には safe guarantee ではない caveat を添える。
- freshness と confidence / state / priority を混同しない。

推奨 wording:

- `新しい可能性(fresh): 生成時点は比較的新しいです。正しさ保証ではありません。`
- `古い可能性(stale): 最新 transaction 反映とは限りません。再構築指示ではありません。`
- `反映遅延の可能性(delayed): 反映時点にずれがある可能性があります。修正指示ではありません。`
- `鮮度不明(unknown freshness): 時点情報が不足しています。安全保証ではありません。`

freshness readability は correctness guarantee でも execution permission でもない。

## Freshness Limitation Semantics

freshness limitation は、freshness の読み方に制限があることを示す。

limitation 候補:

- missing as_of_time
- missing generated_at / observed_at
- event time / recorded_at mismatch
- source transaction coverage gap
- cache observation delay
- projection generation delay
- evidence freshness gap
- review freshness gap
- graph relation freshness gap
- partial / stale / delayed context
- `inventory_current` cache observation limitation

意味:

- limitation は review / audit / operational comprehension の caveat である。
- freshness を過信しないための guardrail である。
- freshness level が変わり得る理由として表示する。

禁止解釈:

- limitation = source error confirmed
- limitation = correction required
- limitation = rebuild required
- limitation = auto-refresh required
- limitation = safe to ignore

freshness limitation は correction / rebuild / replay / auto-refresh の開始条件ではない。

## Freshness Propagation Semantics

freshness propagation は、freshness の意味が projection / graph / review / audit / priority / warning / confidence に伝わるときの読み方を示す。

propagation 方針:

- freshness level は projection に read-only metadata として伝わる。
- freshness reason は source / snapshot / evidence / review / graph relation と紐づけて読む。
- stale / delayed / expired / unknown は confidence / warning / priority の理由になり得る。
- fresh は confidence を上げる要因になり得るが、truth guarantee ではない。
- graph edge が freshness を参照しても execution dependency にはならない。
- propagation で live execution や auto-refresh を開始しない。

propagation が意味しないこと:

- source verified
- correction required
- replay eligibility
- rebuild required
- approval granted
- assignment created
- live execution started

freshness propagation は reasoning relation の伝播であり、freshness engine 実装ではない。

## Freshness と Confidence の違い

freshness と confidence は同じではない。

- freshness: 情報がどの時点・鮮度として読めるか。
- confidence: 根拠・範囲・鮮度・制限からどの程度説明可能に読めるか。

違い:

- fresh でも confidence が high とは限らない。
- stale でも confidence が必ず low とは限らない。
- freshness は confidence の要因になり得るが、同義ではない。
- confidence high でも freshness が fresh とは限らない。

混同してはいけない解釈:

- fresh = high confidence
- stale = low confidence confirmed
- high confidence = fresh
- unknown freshness = unknown confidence

## Freshness と State の違い

freshness と state は同じではない。

- freshness: 情報の時点・鮮度を示す。
- state: ready / stale / partial / degraded / reviewing / escalated / resolved / ignored など、表示上の状態を示す。

違い:

- stale freshness は state stale の理由になり得るが、同義ではない。
- state resolved でも freshness が stale になる可能性がある。
- state ignored は freshness が不要という意味ではない。
- state ready は freshness が fresh という保証ではない。

混同してはいけない解釈:

- state stale = rebuild required
- fresh = ready
- resolved = fresh
- ignored = freshness irrelevant

## Freshness と Priority の違い

freshness と priority は同じではない。

- freshness: 情報がどれくらい新しいか。
- priority: どれを先に確認して読むかの参考。

違い:

- stale / expired freshness は priority を上げる要因になり得る。
- priority high は freshness stale を意味しない。
- fresh は priority low を意味しない。
- priority ordering は freshness とともに読むが、execution order ではない。

混同してはいけない解釈:

- stale = priority executed
- priority high = stale confirmed
- fresh = no review priority
- priority low = freshness sufficient

## Freshness Misuse Risk

freshness misuse risk は、freshness 表示が本来と異なる意味で読まれる risk である。

誤用しやすい例:

- fresh を correctness guarantee と読む。
- fresh を live data guarantee と読む。
- stale を rebuild required と読む。
- delayed を retry / correction required と読む。
- expired を auto-refresh required と読む。
- unknown freshness を safe to ignore と読む。
- freshness reason を source error confirmed と読む。
- freshness propagation を live execution dependency と読む。
- freshness と confidence / state / priority を同一視する。
- freshness metadata を truth guarantee と読む。

方針:

- misuse risk は user blame ではなく freshness governance risk として扱う。
- misuse risk は caveat / glossary / detail で分ける。
- freshness misuse risk から execution affordance を出さない。
- freshness は execution remediation を提供しない。

## Freshness Consistency

freshness consistency は、fresh / stale / delayed / expired / unknown freshness、readability、limitation、propagation が Dashboard / UI / audit review / operational review / governance explanation / reasoning visualization で同じ意味に読めるかを示す review signal である。

確認観点:

- fresh / stale / delayed / expired / unknown の意味が一貫しているか。
- freshness level が correctness guarantee に見えていないか。
- timestamp が source completeness に見えていないか。
- freshness limitation が correction / rebuild / auto-refresh trigger に見えていないか。
- freshness propagation が live execution dependency に見えていないか。
- freshness と confidence / state / priority の違いが説明されているか。
- read-only / no-execution caveat が常に読めるか。
- `inventory_transactions` を truth として扱っているか。
- `inventory_current` を truth として扱っていないか。

freshness consistency が意味しないこと:

- source of truth confirmation
- `inventory_current` correctness
- freshness engine availability
- execution permission
- workflow priority
- live execution

## Raw Source / Adapter / Projection / Graph / Freshness Boundary

raw source / adapter / projection / graph / freshness は、次のように分けて読む。

```text
raw source
  -> adapter normalization
  -> InventoryIntegrityProjection
  -> InventoryIntegrityReasoningGraph
  -> freshness semantics
  -> UI / governance / audit / operational explanation
```

境界:

- raw source: `inventory_transactions` などの source data。truth は `inventory_transactions` にある。
- adapter normalization: raw source を projection contract で読める単位へ整理する conceptual step。truth guarantee ではない。
- InventoryIntegrityProjection: snapshot / compare / evidence / lineage / confidence / freshness / attention / review / escalation / state / severity / priority を持つ read-only projection。source of truth ではない。
- InventoryIntegrityReasoningGraph: freshness metadata や stale-relative-to relation を含む read-only reasoning graph。execution graph ではない。
- freshness semantics: fresh / stale / delayed / expired / unknown、readability、limitation、propagation の意味境界と読み方を揃える read-only review。freshness engine ではない。
- UI / governance / audit / operational explanation: human review / investigation / audit / management visibility の補助。mutation / rebuild / correction / replay / workflow を開始しない。

## Non-Execution Boundary

B36-03 は inventory integrity freshness semantics review のみである。

扱わないこと:

- DB 変更
- migration 追加
- SQL 追加
- RPC 追加
- Edge Function 追加
- API 追加
- React 変更
- freshness engine 実装
- live execution 実装
- execution workflow 実装
- auto-refresh 実装
- auto-fix 実装
- `inventory_current` 更新
- rebuild 実装
- compare execution 実装
- replay 実装
- correction 実装

freshness semantics は execution authority ではない。freshness semantics は reasoning / review / comprehension のために、fresh / stale / delayed / expired / unknown freshness、visibility、readability、limitation、propagation、confidence との違い、state との違い、priority との違い、misuse risk、consistency、Japanese-first freshness wording、raw source boundary を説明する conceptual review である。
