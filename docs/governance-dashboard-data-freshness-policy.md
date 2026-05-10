# Governance Dashboard Data Freshness Policy（Phase B17-01）

作成日: 2026-05-10

---

## ■ 目的

このドキュメントは、read-only governance dashboard の freshness semantics / staleness semantics / generated_at semantics / delayed data semantics を整理する。

Phase B11 から B16 では、read-only recovery governance dashboard の information architecture、data contract、static mock、component boundary、state machine、rendering model、accessibility / usability、terminology / glossary、information density、navigation workflow を整理した。そこでは、stale data を business incident ではなく freshness warning として扱うこと、generated_at / affected contract を表示すること、stale / partial / error から execution を促さないことを明確にした。

Phase B17-01 では、それらの前提を data freshness の観点で補強し、compare / observability / recovery / snapshot / timeline / cache の data が「いつ生成され、どの範囲で新しいと見なせるか」を整理する。

今回は設計ドキュメントの追加のみを行い、migration・DB変更・Edge Function変更・RPC変更・React component実装・API実装・execution button・correction・rebuild・replay・自動同期は実装しない。

---

## ■ 基本方針

data freshness policy は、dashboard に表示される read-only data の鮮度・遅延・部分欠落を誤解なく伝えるための方針である。

基本方針:

- freshness は read-only data quality signal として扱う
- stale は business incident そのものではない
- stale は correction / rebuild / replay の execution trigger ではない
- `generated_at` は表示 data が生成された時刻として扱う
- delayed data は source of truth の遅延と projection / snapshot / cache の遅延を分ける
- compare / observability / recovery / timeline の freshness semantics を分ける
- partial freshness は partial data warning として表示する
- stale / delayed / partial は audit limitation として扱う
- execution freshness を置かない

---

## ■ Data Freshness Policy の目的

この policy の目的は、operator / reviewer / auditor が dashboard data の鮮度を理解した上で、read-only review / investigation / audit を行えるようにすることである。

答えたい問い:

- この summary はいつ生成されたものか
- compare result は現在の projection を反映しているか
- observability snapshot は今日のものか、過去のものか
- recovery operation state はどの時点の response か
- timeline event は最新まで取得できているか
- cache によって表示が古くなっていないか
- stale data を business incident と誤認していないか
- stale data から execution workflow を出していないか

---

## ■ Generated_at Semantics

`generated_at` は、dashboard response / summary / snapshot / timeline view が生成された時刻を示す。

意味:

- 表示 data が組み立てられた時刻
- compare / observability / recovery summary の観測時刻
- snapshot の場合は snapshot record の生成時刻
- cache response の場合は cache の生成時刻または元 data の生成時刻

意味しないもの:

- source of truth transaction の発生時刻
- operation の完了時刻
- approval の承認時刻
- evidence の作成時刻
- timeline event の event time

方針:

- `generated_at` は可能な限り dashboard header / summary / detail で見えるようにする
- contract ごとに `generated_at` が異なる場合は affected contract を明示する
- `generated_at` がない data は freshness unknown として扱う候補にする
- `generated_at` は execution permission ではない

---

## ■ Stale Threshold

stale threshold は、`generated_at` から一定時間が経過した data を stale とみなすための目安である。

threshold 候補:

| Data type | 初期 threshold 候補 | 備考 |
| --- | --- | --- |
| Compare current view | 数分〜数十分 | 現在 projection 比較のため短め |
| Observability summary | 数十分〜数時間 | aggregate / trend のため中程度 |
| Daily snapshot | 1 日単位 | snapshot date と generated_at を分ける |
| Recovery governance summary | 数分〜数十分 | lifecycle / approval 表示のため短め |
| Timeline view | 数分〜数十分 | event 取得範囲に依存 |
| Audit package summary | 数時間〜1 日 | audit reference の性質に依存 |

方針:

- threshold は実装時に hard-code せず、contract / config / operation policy として調整できる余地を残す
- threshold 超過は stale warning であり execution trigger ではない
- threshold は dashboard area ごとに分ける
- stale threshold を超えても source of truth を変更しない
- threshold の version / rule を将来説明できるようにする

---

## ■ Partial Freshness

partial freshness は、一部 data / contract だけが新しく、一部が古いまたは欠落している状態である。

例:

- incident summary は最新だが evidence summary が古い
- compare result は最新だが observability snapshot は昨日のもの
- recovery summary は取得できたが timeline が取得できない
- cache は新しいが元 snapshot が古い

表示方針:

- partial freshness を `Partial data freshness` として表示する
- affected contract / section を明示する
- fresh data と stale data を分けて表示する
- missing evidence と stale evidence を分ける
- partial freshness から execution を促さない

---

## ■ Delayed Data Semantics

delayed data は、source / projection / snapshot / cache / timeline のどこかで data 反映が遅れている状態を示す。

delay 種別:

| 種別 | 意味 |
| --- | --- |
| source delay | source of truth transaction 自体の記録が遅れている可能性 |
| projection delay | read model / projection 反映が遅れている可能性 |
| snapshot delay | snapshot 生成が遅れている可能性 |
| cache delay | cache 更新が遅れている可能性 |
| timeline delay | event timeline の取得・集約が遅れている可能性 |

方針:

- delay の場所を可能な限り分けて表示する
- delayed は failed operation と同じではない
- delayed は consistency incident と断定しない
- delayed data は investigation limitation として扱う
- delayed data から automatic correction / rebuild / replay を行わない

---

## ■ Compare Freshness

compare freshness は、inventory / pallet consistency compare result がどの時点の projection / read model に基づくかを示す。

対象:

- `inventory_current`
- `pallet_units`
- `pallet_item_links`
- compare function response
- difference severity / reason_code
- review_required status

表示候補:

- compare generated_at
- source table / projection freshness
- affected warehouse_code
- filter condition
- partial / stale warning

方針:

- compare result は source of truth ではなく read model / projection の比較結果である
- compare stale は diff が無効という意味ではなく、再確認が必要な signal とする
- compare freshness と recovery lifecycle freshness を混同しない
- compare stale から correction / rebuild / replay を実行しない

---

## ■ Observability Freshness

observability freshness は、backlog / aging / hotspot / trend / health がどの時点の aggregate に基づくかを示す。

対象:

- backlog summary
- critical count
- unresolved aging
- hotspot ranking
- trend summary
- consistency health

表示候補:

- observability generated_at
- metric window
- snapshot date
- source compare version
- health rule version

方針:

- observability は運用品質 signal であり execution trigger ではない
- trend freshness と current compare freshness を分ける
- hotspot freshness と incident freshness を分ける
- health が stale の場合は health decision limitation として表示する
- observability stale から automatic recovery を行わない

---

## ■ Recovery Freshness

recovery freshness は、incident / operation / approval / evidence / lifecycle の governance state がどの時点の response に基づくかを示す。

対象:

- incident summary
- operation summary
- lifecycle state
- approval status
- evidence completeness
- queue summary
- failed / retry candidate summary

表示候補:

- recovery generated_at
- affected contract
- last activity timestamp
- lifecycle event timestamp
- approval updated_at
- evidence package updated_at

方針:

- recovery freshness は governance visibility の鮮度である
- approval `approved` の freshness は execution completed を意味しない
- lifecycle stale は operation mutation の invitation ではない
- evidence stale は attach evidence action ではなく audit limitation として表示する
- recovery stale から retry / approve / resolve を行わない

---

## ■ Snapshot Freshness

snapshot freshness は、historical observability snapshot がどの日付・条件・生成時刻に基づくかを示す。

対象:

- daily snapshot
- backlog history
- hotspot history
- consistency health history
- trend persistence

表示候補:

- snapshot date
- generated_at
- warehouse_code
- source query version
- metric window
- regeneration flag / version

方針:

- snapshot date と generated_at を分ける
- snapshot は historical observation であり current state ではない
- stale snapshot は current recovery operation を意味しない
- missing snapshot を business incident と断定しない
- snapshot freshness は trend interpretation の limitation として表示する

---

## ■ Timeline Freshness

timeline freshness は、incident / operation / trace timeline がどの範囲まで取得・表示されているかを示す。

対象:

- incident timeline
- operation lifecycle timeline
- evidence timeline
- trace timeline reference

表示候補:

- timeline generated_at
- event range start / end
- latest event timestamp
- event count
- missing event warning
- partial timeline warning

方針:

- timeline generated_at と event timestamp を分ける
- latest event が古い場合は timeline stale candidate とする
- missing event は audit warning として表示する
- timeline stale から replay / correction / rebuild を実行しない
- operation lifecycle timeline と trace timeline の freshness を混同しない

---

## ■ Cache Freshness

cache freshness は、dashboard 表示が cache response によるものか、最新取得によるものかを示す。

対象:

- dashboard summary cache
- API response cache
- snapshot cache
- client-side previous data
- retry fetch 中の previous data

表示候補:

- cache generated_at
- source generated_at
- last refreshed at
- cache age
- stale cache warning

方針:

- cache が新しくても source data が古い場合がある
- source generated_at と cache generated_at を分ける
- previous data 表示中は stale candidate として扱う
- cache freshness は execution permission ではない
- cache stale から automatic sync を行わない

---

## ■ Stale Visualization Policy

stale visualization は、data freshness warning を operator / auditor に伝えるための表示方針である。

表示候補:

- `Stale data`
- `Partial freshness`
- `Generated at`
- `Last refreshed at`
- `Affected contract`
- `Snapshot date`
- `Timeline latest event`

方針:

- stale は badge + text で表示する
- stale と critical を混同しない
- stale は read-only warning として表示する
- critical / cross-warehouse と stale が同時にある場合は両方を表示する
- stale state でも read-only indication を維持する
- stale warning から execution affordance を出さない

例:

```text
[STALE DATA]
Generated at: 2026-05-10 08:00
Affected contract: recovery.operation_summary
This is a read-only freshness warning. No execution action is available here.
```

---

## ■ Stale Audit Limitation

stale audit limitation は、監査時に data freshness の制約を明示するための考え方である。

audit に残したい context:

- generated_at
- snapshot date
- source query version
- affected contract
- stale threshold rule
- cache age
- partial data section
- missing timeline range

方針:

- stale data を使った判断は limitation として説明できるようにする
- audit package は source of truth の代替ではない
- stale evidence と missing evidence を分ける
- stale timeline と missing timeline event を分ける
- stale audit limitation は correction / rebuild / replay の automatic trigger ではない

---

## ■ Compare / Observability / Recovery Freshness Separation

compare / observability / recovery は、freshness の意味が異なる。

| Area | Freshness meaning | 誤解しないこと |
| --- | --- | --- |
| Compare | projection compare の生成時刻 | source of truth transaction time ではない |
| Observability | aggregate / snapshot / trend の生成時刻 | incident resolved ではない |
| Recovery | governance state response の生成時刻 | operation completed ではない |
| Trace | timeline view / event range の生成時刻 | event occurrence time ではない |

方針:

- dashboard 間で generated_at label は揃える
- freshness threshold は area ごとに分ける
- stale warning は area context と一緒に表示する
- cross-dashboard link では source area の freshness context を維持する将来余地を残す
- dashboard 間 link から execution しない

---

## ■ Execution Freshness を置かない方針

read-only governance dashboard では、execution freshness を置かない。

置かない概念:

- fresh enough to execute
- stale means execute rebuild
- stale means replay now
- stale means approve retry
- freshness-based auto correction
- freshness-based auto sync
- freshness-based lifecycle transition

理由:

- freshness は read-only data quality signal である
- stale は business incident そのものではない
- correction / rebuild / replay / approval には別の controlled execution workflow が必要である
- source of truth protection / warehouse boundary / blast radius を freshness だけで保証できない
- stale data を execution trigger にすると監査性が弱くなる

代替表現:

- `Stale data`
- `Partial freshness`
- `Freshness unknown`
- `Recheck recommended`
- `Suggested next review`
- `Read-only freshness warning`

---

## ■ 導入段階案

### Step 0: Data Freshness Policy の明文化

本ドキュメントで freshness semantics / staleness semantics / generated_at semantics / delayed data semantics を整理する。

この段階では実装しない。

### Step 1: Generated_at Semantics Review

確認:

- generated_at が何の生成時刻か明確か
- event timestamp / approval timestamp / completed timestamp と混同していないか
- contract ごとの generated_at 差分を説明できるか

### Step 2: Stale Threshold Review

確認:

- compare / observability / recovery / timeline で threshold を分けているか
- threshold 超過が execution trigger になっていないか
- threshold rule を後から説明できるか

### Step 3: Partial / Delayed Freshness Review

確認:

- partial freshness の affected contract を表示できるか
- source delay / projection delay / snapshot delay / cache delay を分けて考えているか
- delayed data を business incident と断定していないか

### Step 4: Area-specific Freshness Review

対象:

- Compare
- Observability
- Recovery
- Snapshot
- Timeline
- Cache

確認:

- area ごとの freshness meaning が明確か
- stale warning が area context と一緒に表示されるか
- dashboard 間で generated_at label が揃っているか

### Step 5: Stale Visualization / Audit Review

確認:

- stale が badge + text で表示されるか
- stale と critical を混同していないか
- stale / partial が audit limitation として説明されているか
- stale evidence と missing evidence を分けているか

### Step 6: No Execution Freshness Review

確認:

- `fresh enough to execute` のような概念がないか
- stale から correction / rebuild / replay / approval / retry に進んでいないか
- freshness warning が read-only warning として扱われているか
- automatic sync / automatic recovery を示唆していないか

---

## ■ 今回は実装しない判断

Phase B17-01 では、data freshness policy ドキュメントの追加のみを行う。

実装しないもの:

- migration
- DB変更
- Edge Function変更
- RPC変更
- React component 実装
- API実装
- freshness contract 実装
- stale threshold 実装
- cache 実装
- execution button
- approval mutation
- correction 実装
- rebuild 実装
- replay 実装
- 自動同期
- README変更

理由:

- まず freshness / staleness semantics を固定する必要がある
- generated_at / snapshot date / event timestamp / cache timestamp の意味を分ける必要がある
- compare / observability / recovery / timeline の freshness meaning を混同しないための方針が必要である
- execution freshness を置かない方針を明確にする必要がある

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/inventory-pallet-consistency-policy.md`
- `docs/request-chain-parent-trace-design.md`
- `docs/historical-observability-snapshot-design.md`
- `docs/controlled-correction-policy.md`
- `docs/scoped-rebuild-policy.md`
- `docs/replay-isolation-policy.md`
- `docs/approval-boundary-policy.md`
- `docs/recovery-operation-lifecycle-policy.md`
- `docs/operation-evidence-audit-package-policy.md`
- `docs/recovery-incident-management-policy.md`
- `docs/read-only-recovery-dashboard-design.md`
- `docs/recovery-dashboard-information-architecture.md`
- `docs/recovery-data-contract-design.md`
- `docs/recovery-dashboard-static-mock-design.md`
- `docs/recovery-dashboard-component-boundary-design.md`
- `docs/governance-dashboard-state-machine-design.md`
- `docs/governance-dashboard-rendering-model-design.md`
- `docs/governance-dashboard-accessibility-usability-policy.md`
- `docs/governance-dashboard-terminology-glossary-policy.md`
- `docs/governance-dashboard-information-density-policy.md`
- `docs/governance-dashboard-navigation-workflow-policy.md`
- `docs/observability-monitoring-implementation-plan.md`
- `docs/rebuild-recovery-implementation-plan.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`

---

## ■ Notes

governance dashboard data freshness policy は、read-only governance dashboard の data がいつ生成され、どの範囲で新しい・古い・部分的・遅延と見なせるかを整理するための設計方針である。

generated_at、stale threshold、partial freshness、delayed data、compare / observability / recovery / snapshot / timeline / cache freshness、stale visualization、stale audit limitation を整理し、execution freshness を置かないことで、visibility と mutation の境界を守る。
