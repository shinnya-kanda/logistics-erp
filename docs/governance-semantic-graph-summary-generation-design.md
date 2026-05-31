# Governance Semantic Graph Summary Generation Design

Phase B77-15 documentation.

このドキュメントは、B76 governance semantics architecture、B77-01 graph visualization design、B77-02 node taxonomy、B77-03 edge taxonomy、B77-04 visualization layering design、B77-05 view mode design、B77-06 interaction boundary design、B77-07 data contract design、B77-08 readability density control design、B77-09 semantic collapse visualization design、B77-10 semantic convergence visualization design、B77-11 survivability propagation visualization design、B77-12 sustainability propagation visualization design、B77-13 maintainability propagation visualization design、B77-14 evolvability propagation visualization design を前提に、将来 governance semantic graph の summary generation を表示する場合の design 方針を整理するための design document である。

今回は documentation phase であり、React implementation、TypeScript implementation、API implementation、DB implementation、Edge Function change、graph rendering implementation、summary generation engine implementation、workflow execution、mutation、rebuild / replay / correction / sync、actual graph UI は扱わない。

## 1. このドキュメントの目的

governance semantic graph summary generation design の目的は、B77-01 から B77-14 で整理した graph foundation / visualization / lifecycle propagation を、人間が短時間で安全に理解できる overview summary として読むための方針を整理することである。

graph summary が必要な理由:

- governance semantic graph は node / edge / layer / propagation が多く、最初から詳細を読むと critical signal を見落としやすい。
- graph overview は、unavailable / collapse / critical risk / broken continuity などを先に把握するための入口になる。
- node detail は根拠確認に必要だが、最初に読むものではなく、summary から必要な detail へ進む方が安全である。
- summary は graph 全体の health、risk、collapse、convergence、survivability、sustainability、maintainability、evolvability を短く整理する。

この design が整理するもの:

- graph summary の設計
- graph health summary の設計
- graph risk summary の設計
- collapse / convergence / survivability summary の集約設計
- sustainability / maintainability / evolvability summary の集約設計
- summary readability / density / support model
- read-only observability summary boundary

この design が整理しないもの:

- summary generation engine implementation
- graph rendering implementation
- React / TypeScript implementation
- API implementation
- execution recommendation
- approval recommendation
- mutation payload

graph summary は read-only observability summary である。summary は「graph 全体がどう読めるか」を短く示す overview であり、「何を実行すべきか」を示す action plan ではない。

## 2. Summary Boundary

graph summary は次の性質を持つ。

- read-only
- observability only
- semantic interpretation summary
- governance observability summary
- graph overview explanation

graph summary は次を実行しない。

- correction
- rebuild
- replay
- sync
- mutation
- POST
- execution workflow
- approval workflow
- implementation workflow
- migration workflow
- orchestration

追加 boundary:

- summary は action plan ではない。
- summary は execution recommendation ではない。
- summary は approval recommendation ではない。
- summary は implementation recommendation ではない。
- summary は migration recommendation ではない。
- summary は remediation plan ではない。
- compare endpoint は `GET` only として維持する。
- summary generation は `.insert`、`.update`、`.upsert`、`.delete`、`.rpc` を前提にしない。

summary、summary panel、summary click、summary expansion は、すべて semantic interpretation を支える表示であり、修正、再構築、同期、承認、実装、移行、実行を開始しない。

## 3. Graph Summary Model

graph summary は、graph 全体を短く読むための hierarchy として整理する。

summary hierarchy:

```text
Graph Summary
├─ Health Summary
├─ Risk Summary
├─ Collapse Summary
├─ Convergence Summary
├─ Survivability Summary
├─ Sustainability Summary
├─ Maintainability Summary
└─ Evolvability Summary
```

各 summary の役割:

- Graph Summary: graph 全体の最上位 overview。critical caveat と主要 lifecycle summary を短く示す。
- Health Summary: graph が観測上どの程度健全に読めるかを示す。execution readiness ではない。
- Risk Summary: graph 全体の semantic risk を示す。remediation plan ではない。
- Collapse Summary: unavailable / broken / nonrecoverable / outside boundary などの collapse signal を集約する。
- Convergence Summary: stable convergence / coherent reasoning / recoverable などの安定方向を補助表示する。
- Survivability Summary: degraded state 下でも semantic governance を読み続けられるかを集約する。
- Sustainability Summary: long-term persistence が読めるかを集約する。
- Maintainability Summary: long-term maintenance capacity が読めるかを集約する。
- Evolvability Summary: future extension safety が読めるかを集約する。

summary hierarchy は表示上の読み順であり、workflow order、approval route、implementation order ではない。

## 4. Graph Health Summary

graph health summary は、graph 全体が観測上どの程度健全に読めるかを短く示す。

候補 values:

- graph healthy
- partially healthy
- degraded
- unhealthy
- unavailable

読み方:

- graph healthy: critical collapse が見当たらず、support context が十分に読める状態。ただし実行許可ではない。
- partially healthy: 一部 caveat があるが、主要 summary は読める状態。
- degraded: support weakness、fragile lifecycle、partial continuity などにより graph 全体の読み方に制限がある状態。
- unhealthy: collapse / broken / nonrecoverable などが強く、summary を安全側に読む必要がある状態。
- unavailable: graph summary を生成・表示する前提情報が欠け、positive summary を強調できない状態。

重要な boundary:

- health は execution readiness ではない。
- health は approval signal ではない。
- healthy は implementation readiness ではない。
- degraded / unhealthy は correction command ではない。

health summary は graph overview の読みやすさを支える read-only signal であり、実行状態や承認状態を変更しない。

## 5. Graph Risk Summary

graph risk summary は、graph 全体の semantic risk を短く示し、critical caveat を見落とさないために使う。

候補 values:

- critical risk
- elevated risk
- moderate risk
- low risk
- unavailable risk

読み方:

- critical risk: unavailable、collapse、nonrecoverable、broken continuity などが存在し、最優先で安全側に読む状態。
- elevated risk: fragile / degraded / conditional semantics が複数存在する状態。
- moderate risk: caveat はあるが、support context とともに読める状態。
- low risk: critical caveat が見当たらず、support も比較的安定して読める状態。ただし正しさ保証ではない。
- unavailable risk: risk を十分に読める根拠が欠けている状態。

重要な boundary:

- risk summary は remediation plan ではない。
- critical risk は repair instruction ではない。
- low risk は execution permission ではない。
- risk summary click で correction / rebuild / sync を開始しない。

risk summary は graph interpretation を安全側に誘導する overview であり、修復、承認、実行の優先順位を作らない。

## 6. Collapse Summary Generation

collapse summary generation は、graph 内の collapse signal を集約し、critical degradation を短く読めるようにする。

入力例:

- unavailable
- broken continuity
- nonrecoverable
- outside boundary
- collapsed resilience

出力例:

- collapse summary
- collapse severity
- collapse explanation

生成方針:

- unavailable / broken / collapsed / outside boundary / nonrecoverable を safety-first に優先する。
- collapse severity は critical caveat を埋もれさせない。
- collapse explanation は reason / source / signals と紐づけて読めるようにする。
- collapse summary は graph summary の前面に出す。
- collapse summary は correction / rebuild / replay / sync の開始条件ではない。

collapse summary は semantic degradation の読み方を示す read-only summary であり、remediation workflow や action plan ではない。

## 7. Convergence Summary Generation

convergence summary generation は、graph 内の stabilization / recovery direction を補助的に集約する。

入力例:

- stable convergence
- recoverable
- coherent reasoning
- explainable
- evidence support

出力例:

- convergence summary
- convergence confidence
- convergence explanation

生成方針:

- convergence summary は collapse summary より前面に出さない。
- stable / recoverable / coherent は positive signal として控えめに表示する。
- convergence confidence は evidence / freshness / explainability と近接表示する。
- collapse caveat がある場合、convergence summary は caveat 付きの補助表示にする。
- convergence explanation は recovery workflow や auto-fix workflow に見せない。

convergence summary は安定方向に読める可能性を示す read-only summary であり、execution readiness、approval readiness、correctness guarantee ではない。

## 8. Survivability / Sustainability / Maintainability / Evolvability Summary

lifecycle後段 summary は、long-term governance viability を短く読むために使う。

各 summary は次を持つ。

- summary
- confidence
- explanation
- support context

Survivability Summary:

- degraded state 下でも semantic governance を読み続けられるかを示す。
- degraded survivability / survivability blocked は safety-first に表示する。
- survivable は execution permission ではない。

Sustainability Summary:

- long-term persistence が読めるかを示す。
- fragile sustainability / sustainability blocked は maintainability / evolvability の caveat として扱う。
- sustainable は approval readiness ではない。

Maintainability Summary:

- long-term maintenance capacity が読めるかを示す。
- fragile maintainability / conditional maintainability を positive state より先に読む。
- maintainable は maintenance workflow ではない。

Evolvability Summary:

- future extension safety が読めるかを示す。
- limited evolvability / evolvability blocked を positive state より先に読む。
- evolvable は implementation permission や migration readiness ではない。

共通方針:

- optimistic summary を過度に強調しない。
- collapse がある場合は補助表示にする。
- confidence / evidence / freshness / explainability を近接表示する。
- support context が弱い場合は positive summary を控えめにする。

これらの summary は lifecycle interpretation を支える overview であり、実行許可、承認、実装開始、移行開始を意味しない。

## 9. Summary Prioritization

summary prioritization は、graph overview で何を先に読むべきかを整理する。

優先順位例:

1. unavailable
2. collapse
3. critical risk
4. broken continuity
5. nonrecoverable
6. degraded survivability
7. fragile sustainability
8. fragile maintainability
9. limited evolvability
10. convergence

重要な方針:

- positive summary を最上位にしない。
- stable / healthy / evolvable は critical caveat の後に読む。
- collapse / unavailable / broken / nonrecoverable を先に表示する。
- convergence は補助 summary として扱う。
- summary priority は execution priority ではない。
- summary priority は approval priority ではない。

summary prioritization は read-only display ordering であり、workflow queue、remediation order、implementation order を作らない。

## 10. Summary Readability Policy

summary readability は、graph 全体を短時間で安全に読むための方針である。

方針:

- summary first とする。
- details later とする。
- short text を基本にする。
- semantic overload を避ける。
- node explosion を避ける。
- edge explosion を避ける。
- reason / source / signals を grouping する。
- confidence を summary の近くに表示する。
- collapse caveat を見落とさない。
- optimistic summary を過度に強調しない。

summary は graph の全情報を詰め込む場所ではない。graph summary では主要 caveat と代表 explanation を表示し、詳細は inspector / detail panel / expanded summary に逃がす。

## 11. Summary Density Control

summary density control は、overview を短く保ちながら必要な根拠へ進めるようにする。

表示形態:

- collapsed summary
- expanded summary
- detail on demand
- grouped summary
- hidden detail

方針:

- collapsed summary は最重要 caveat と代表 summary を表示する。
- expanded summary は confidence / explanation / support context を表示する。
- detail on demand で reason / source / signals を確認できるようにする。
- grouped summary で lifecycle 後段 summary をまとめられるようにする。
- hidden detail は workflow ignore ではない。
- hidden detail は semantic deletion ではない。
- expansion state は local visualization state として扱う。

summary density control は表示密度を調整するだけであり、business state、workflow state、approval state、execution state を変更しない。

## 12. Summary Support Model

summary support model は、summary の信頼性や caveat を近接表示するために使う。

support semantics examples:

- confidence
- evidence
- freshness
- truth aggregation quality
- explainability
- reasoning coherence
- audit trail

方針:

- support が弱い summary は強調しない。
- stale freshness は optimistic summary を抑制する。
- weak evidence は health / convergence / evolvability の positive summary を控えめにする。
- weak explainability は summary explanation を caveat 付きで表示する。
- partial reasoning coherence は conditional summary として扱う。
- audit trail が弱い場合は lifecycle 後段 summary を強調しない。
- support unavailable の場合は unavailable / limited / blocked summary を優先する。

support model は summary の読み方を補助する read-only metadata であり、execution readiness や approval readiness を示さない。

## 13. Summary Interaction Boundary

summary interaction は、overview から detail へ読むための read-only interaction に限定する。

方針:

- summary click は detail 展開のみである。
- summary click で execution しない。
- summary click で workflow 開始しない。
- summary click で approval を開始しない。
- summary click で implementation / migration を開始しない。
- summary panel は command panel ではない。
- summary expansion は local display state である。
- summary filter は execution routing ではない。

interaction boundary:

- summary から correction / rebuild / replay / sync を開始しない。
- summary から orchestration を開始しない。
- summary panel に execution button を置かない。
- inspector / detail panel から mutation しない。
- keyboard operation で execution しない。

summary interaction は、graph overview の根拠と detail を読むための表示補助であり、action trigger ではない。

## 14. Accessibility / Safety-First Policy

summary accessibility / safety-first policy は、短い summary でも critical caveat を見落とさないようにする。

方針:

- summary を色だけで表現しない。
- label / badge / text を併用する。
- screen reader でも summary の health / risk / collapse が伝わるようにする。
- keyboard navigation は表示切替のみに使う。
- keyboard operation で execution しない。
- collapse を見落とさない。
- optimistic summary を強調しすぎない。
- unavailable / broken / nonrecoverable を明確に表示する。
- read-only / no execution caveat を読み取れるようにする。

summary state、support caveat、collapse severity、risk level、health level は、色、shape、label、text、badge の複数手段で読めるようにする前提を置く。

## 15. Future Implementation Boundary

将来 implementation に進む場合は、次の前提を満たす必要がある。

- graph implementation は別 phase とすること。
- summary implementation は別 phase とすること。
- summary generation engine implementation は別 phase とすること。
- summary state は local UI state に限定すること。
- compare endpoint を `POST` 化しないこと。
- compare endpoint は `GET` only として維持すること。
- summary generation から mutation しないこと。
- execution layer は別 endpoint / 別 workflow として設計すること。
- approval / implementation / migration layer は別 endpoint / 別 workflow として設計すること。
- graph summary は read-only observability summary として維持すること。

summary generation design は visualization implementation の前提整理であり、execution approval、approval recommendation、implementation recommendation、migration recommendation ではない。

## 16. 今回の範囲外

Phase B77-15 では次を扱わない。

- React implementation
- TypeScript implementation
- API implementation
- DB implementation
- Edge Function change
- graph rendering implementation
- actual graph UI
- summary generation engine implementation
- workflow execution
- mutation
- correction
- rebuild
- replay
- sync
- approval workflow
- implementation workflow
- migration workflow
- package / lock file change
- Supabase schema change

この document は、governance semantic graph summary generation の architecture / boundary / policy 整理であり、実装差分や runtime behavior を追加しない。
