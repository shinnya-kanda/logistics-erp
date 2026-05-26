# Inventory Integrity Governance Semantics Architecture

Phase B76-50 documentation.

このドキュメントは、B76-10 から B76-49 までで積み上げた Inventory Integrity compare governance semantics chain を、人間と Cursor が同じ前提で俯瞰するための architecture document である。

これは documentation phase であり、code implementation、UI implementation、API implementation、DB migration、Edge Function change、mutation、workflow execution、rebuild / replay / correction / sync は扱わない。

## 目的

Inventory Integrity compare は、在庫の source of truth と projection / read model の差異を read-only に観測し、その差異を governance semantics として段階的に説明する layer である。

このドキュメントの目的は次の通り。

- B76 系 semantics chain の全体像を整理する。
- Inventory Integrity compare の read-only governance layer を俯瞰できるようにする。
- truth source / projection / compare boundary を明文化する。
- compare governance semantics が execution workflow ではないことを明確にする。
- 後続 phase で Cursor が semantic layer を追加する場合の読み方を揃える。

## Truth Source / Projection / Compare Boundary

Inventory Integrity の truth source は `inventory_transactions` である。入庫、出庫、移動、調整、取消などの履歴イベントが在庫数量の説明根拠になる。

`inventory_current` は projection / read model / aggregation cache であり、source of truth ではない。compare では `inventory_transactions` から読める expected quantity と、`inventory_current` に見える cached quantity の差異を観測対象として扱う。

compare boundary の基本方針:

- compare は truth source と projection の差異を観測する read-only visibility である。
- compare 結果は source of truth error を確定しない。
- compare 結果は projection update permission を付与しない。
- compare 結果は correction / sync / rebuild / replay を実行しない。
- compare endpoint は `GET` only として扱う。
- compare semantics は mutation authority、approval authority、workflow authority を持たない。

## Read-Only Observability Boundary

Inventory Integrity governance semantics は、review / investigation / audit / explanation のための read-only observability metadata である。各 semantic value は「どう読めるか」を示し、「何を実行するか」を示さない。

この boundary では、次を追加・実行しない。

- correction
- rebuild
- replay
- auto-fix
- sync
- execution workflow
- workflow state machine
- mutation
- POST
- Supabase mutation
- `.insert`
- `.update`
- `.upsert`
- `.delete`
- `.rpc`
- execution button
- onClick execution

`critical`、`high confidence`、`traceable audit`、`evolvable semantics` のような表示であっても、実行許可、正しさ保証、承認完了、現場作業指示を意味しない。

## B76 Semantics Chain

B76-10 から B76-49 までの compare governance semantics chain は、下流に進むほど複数の前段 signal を統合し、より高次の governance observability を説明する。

```text
truth source compare
↓
classification
↓
severity
↓
review readiness
↓
escalation readiness
↓
operational priority
↓
ownership
↓
owner actionability
↓
operator guidance
↓
operator message
↓
operator summary
↓
operator timeline
↓
compare confidence
↓
projection freshness
↓
truth aggregation quality
↓
compare evidence strength
↓
compare risk
↓
interpretation stability
↓
decision readiness
↓
operational impact
↓
operational attention
↓
governance posture
↓
governance disposition
↓
governance retention
↓
governance audit trail
↓
governance explainability
↓
governance reasoning coherence
↓
governance semantic drift
↓
governance semantic convergence
↓
governance semantic resilience
↓
governance semantic integrity boundary
↓
governance semantic recoverability
↓
governance semantic observability continuity
↓
governance semantic degradation tolerance
↓
governance semantic survivability
↓
governance semantic sustainability
↓
governance semantic maintainability
↓
governance semantic evolvability
```

この chain は execution sequence ではない。上から下へ実行される workflow ではなく、read-only compare result をどう説明するかの semantic dependency map である。

## 各 Semantics の役割

- truth source compare: `inventory_transactions` と `inventory_current` を read-only に比較し、expected quantity と cached quantity の差異を観測する起点。
- classification: compare 差異の基本分類を整理する。projection unavailable、stale projection、quantity mismatch などの読み方を分ける。
- severity: 差異の重大度を表示上の review signal として整理する。business incident の確定ではない。
- review readiness: 人間レビューが必要か、任意か、保留かを示す。review state は mutation authority ではない。
- escalation readiness: escalation が推奨されるかどうかを示す。escalation 表示は execution authority ではない。
- operational priority: operational priority としての優先度を示す。作業指示ではなく注意度の表示である。
- ownership: どの観点の owner が読みやすいかを示す。assignment creation ではない。
- owner actionability: owner が表示上どう解釈しやすいかを示す。action command ではない。
- operator guidance: operator 向けの読み方を整理する。現場作業指示ではない。
- operator message: operator に見せる短い説明を整理する。通知送信や workflow state ではない。
- operator summary: compare result を短く俯瞰する。summary は truth guarantee ではない。
- operator timeline: compare / review signal の時系列的な読み方を整理する。causal proof や replay eligibility ではない。
- compare confidence: compare 結果の説明可能性や信頼度を示す。high confidence は correctness guarantee ではない。
- projection freshness: projection の鮮度を示す。fresh / stale は rebuild required を意味しない。
- truth aggregation quality: source transaction から読める aggregation quality を示す。truth quality は source の完全性保証ではない。
- compare evidence strength: 判断根拠の強さを示す。evidence strong は実行許可ではない。
- compare risk: compare 差異を業務リスクとして読むための signal。risk critical でも自動処理の開始条件ではない。
- interpretation stability: 表示解釈が安定しているかを示す。stable は変更不要の保証ではない。
- decision readiness: 判断材料がそろっているかを示す。decision ready は decision execution ではない。
- operational impact: operational impact の大きさを示す。impact は business operation の完了や失敗を確定しない。
- operational attention: attention の必要度を示す。alert / notification の実行ではない。
- governance posture: governance 上の姿勢や状態を整理する。posture escalated は execution permission ではない。
- governance disposition: observe / review / escalate など表示上の扱いを整理する。queue は workflow queue ではない。
- governance retention: signal を一時的に見るか、保持して観測するかを整理する。retention は storage policy execution ではない。
- governance audit trail: audit traceability を示す。audit trail は audit workflow の開始ではない。
- governance explainability: 人間が説明を読めるかを示す。explainable は原因確定ではない。
- governance reasoning coherence: reasoning が矛盾なく読めるかを示す。coherent reasoning は truth guarantee ではない。
- governance semantic drift: semantics が意図からずれていないかを示す。drift は correction 指示ではない。
- governance semantic convergence: semantics が安定方向へ向かっているかを示す。converging は完了状態ではない。
- governance semantic resilience: 異常や degraded signal 下でも semantics が維持されるかを示す。resilient は実行耐性ではなく表示意味の耐性である。
- governance semantic integrity boundary: semantic integrity の境界内で読めるかを示す。boundary は mutation boundary を越える許可ではない。
- governance semantic recoverability: boundary を越えた後でも semantics を review 上 recover 可能かを示す。recoverable は recovery execution ではない。
- governance semantic observability continuity: observability が継続して読めるかを示す。continuous は monitoring execution ではない。
- governance semantic degradation tolerance: degraded / stale / partial / fragile 状態をどこまで吸収して semantic integrity を維持できるかを示す。
- governance semantic survivability: 重大 degradation / drift / contradiction / collapse 下でも governance semantics が生存可能かを示す。
- governance semantic sustainability: 長期運用下でも semantic governance を持続可能かを示す。
- governance semantic maintainability: 長期運用時に semantic governance を維持・追跡し続けやすいかを示す。
- governance semantic evolvability: 将来的に semantic governance を安全に拡張・変更・進化可能かを示す。

## Safety-First Priority Ordering

B76 semantics chain は safety-first の優先順位で評価する。positive signal を早く採用せず、先に unavailable / degraded / broken signal を確認する。

基本方針:

- `unavailable`、`unverified`、`missing`、`collapsed`、`broken`、`outside`、`intolerable` などは常に安全側に優先する。
- source / scope / evidence / confidence / freshness が欠ける場合は、下流 semantics でも optimistic に扱わない。
- `stable`、`high`、`normal`、`maintainable`、`evolvable` などの positive state は最後に評価する。
- 不明瞭な場合は optimistic に寄せず、`limited`、`fragile`、`review`、`hold` 側に倒す。
- 後段 semantics は前段 semantics の caveat を引き継ぐ。

この ordering は review safety のための評価順であり、execution ordering ではない。

## UI 表示方針

Inventory Integrity UI は read-only observability 表示である。UI は compare result と governance semantics を読みやすく表示するが、operation を開始しない。

表示方針:

- summary area では後段 governance semantics を上位に表示する。
- item card では reason / source / signals を補助表示する。
- B76-22 readability refinement を維持し、主表示、補足表示、reason/source/signals grouping を分ける。
- safe wording を使い、実行指示に見えない表現にする。
- `high confidence`、`evolvable`、`recoverable` などの positive wording でも実行許可に見せない。
- button / onClick / execution UI は追加しない。

UI の役割は、人間が「何が見えているか」「どの caveat があるか」「どの source / signal に基づくか」を読めるようにすることである。

## 将来の Execution Layer への前提条件

将来 rebuild / replay / correction / sync のような execution layer を扱う場合でも、Inventory Integrity compare governance semantics chain から直接 mutation しない。execution layer は別 phase、別 endpoint、明示的 workflow として設計する必要がある。

将来検討の前提条件:

- read-only governance semantics が十分に安定していること。
- truth source / projection / compare boundary が明文化されていること。
- audit trail / explainability / reasoning coherence が確認可能であること。
- source / scope / evidence / confidence / freshness の caveat が UI と metadata で読めること。
- execution は別 phase / 別 endpoint / 明示的 workflow として設計すること。
- compare endpoint を `POST` 化しないこと。
- compare semantics から直接 mutation しないこと。
- `inventory_transactions` と `inventory_current` の責務を崩さないこと。

このドキュメントは将来 execution layer を推奨するものではない。必要になった場合に、read-only governance semantics と execution design を混同しないための前提を整理する。

## 今回の範囲外

Phase B76-50 では次を扱わない。

- code implementation
- UI implementation
- API implementation
- DB migration
- Edge Function change
- mutation
- workflow execution
- rebuild / replay / correction / sync
- package / lock file change
- Supabase schema change

この architecture document は、Inventory Integrity governance semantics の読み方と境界を整理する documentation artifact であり、実装差分や運用処理を追加しない。
