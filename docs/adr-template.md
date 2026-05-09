# ADR Template（Phase B8-13）

作成日: 2026-05-09

---

## ■ 目的

このドキュメントは、logistics-erp で今後使う Architecture Decision Record（ADR）の標準テンプレートを整理する。

ERP設計憲法、開発ルール、architecture decision records strategy、minimum viable event-driven architecture、event-driven ERP principles を前提に、ADR は重要な設計判断について「何を決めたか」「なぜ決めたか」「何を採用しなかったか」「いつ見直すか」を軽量に残すために使う。

今回は ADR template の追加のみを行い、migration・実装・Edge Function・RPC・README・`docs/adr/` ディレクトリは変更しない。

---

## ■ ADR の基本フォーマット

ADR は 1 decision につき 1 文書を基本とする。

標準フォーマット:

```markdown
# ADR-XXXX: <decision title>

作成日: YYYY-MM-DD
Status: proposed / accepted / rejected / deferred / superseded

---

## ■ Context

## ■ Decision

## ■ Consequences

## ■ Alternatives Considered

## ■ Review Conditions

## ■ Related Documents

## ■ Notes
```

方針:

- 長い設計書ではなく、判断と理由を短く残す
- accepted だけでなく rejected / deferred も残す
- optional architecture を「今は導入しない」と決めた場合も ADR 候補にする
- 既存の原則・設計文書・実装計画への参照を残す
- decision が変わる場合は、過去 ADR を削除せず superseded として扱うことを検討する

---

## ■ Status

ADR の status は以下を使う。

| status | 意味 |
| --- | --- |
| proposed | 提案中。まだ採用・却下・保留が決まっていない |
| accepted | 現時点で採用する判断 |
| rejected | 検討したが採用しない判断 |
| deferred | 今は決めず、将来見直す判断 |
| superseded | 後続 ADR により置き換えられた判断 |

方針:

- `proposed` は議論中の状態として使う
- `accepted` は実装済みとは限らない。採用した architecture decision を表す
- `rejected` は再提案を防ぐため、理由を残す
- `deferred` は未検討ではなく、現時点では決めない判断として使う
- `superseded` は過去判断を削除せず、履歴として残すために使う

---

## ■ Context

Context には、判断の背景を書く。

記入すること:

- 何が問題か
- どの業務・domain・運用に関係するか
- どの原則・設計文書が前提か
- 現時点で既に実装済み / 整理済みのものは何か
- なぜ今 decision が必要か

確認観点:

- 現場運用を止めないか
- 既存機能を壊さないか
- source of truth に影響するか
- projection / workflow / recovery / audit に影響するか
- warehouse_code boundary に影響するか

---

## ■ Decision

Decision には、採用・却下・保留する判断を書く。

記入すること:

- 何を決めたか
- status は何か
- 適用範囲はどこか
- 何は今回決めないか
- 実装判断と architecture decision を混同していないか

書き方の例:

```markdown
現時点では、汎用 event_store は作らず、既存の
inventory_transactions / pallet_transactions / warehouse_location_history
を source of truth として維持する。

Status: deferred
```

方針:

- decision は曖昧にしない
- 「今は決めない」場合も deferred として明示する
- optional architecture は導入しない理由と見直し条件を書く

---

## ■ Consequences

Consequences には、判断により発生する影響を書く。

記入すること:

- 良い影響
- 制約
- リスク
- 将来必要になり得る対応
- 運用上の注意

確認観点:

- source of truth を守れるか
- projection drift をどう検出するか
- recovery / correction は説明可能か
- warehouse boundary を維持できるか
- optional architecture を後から導入できる余地を残しているか

注意:

- Consequences は「メリットだけ」を書く場所ではない
- 採用しなかった選択肢に比べた制約も書く
- deferred の場合は、保留による運用上の注意を書く

---

## ■ Alternatives Considered

Alternatives Considered には、検討した別案を書く。

記入すること:

- 採用しなかった案
- 却下理由
- 保留理由
- 将来再検討する条件

候補例:

- 汎用 `event_store`
- `trace_events`
- queue / broker / outbox
- workflow engine / saga controller
- schema registry
- event catalog DB
- dependency graph DB
- validation engine
- recovery engine

方針:

- rejected decision は理由を残す
- deferred decision は見直し条件を残す
- 「検討していない」と「検討したが今は決めない」を分ける

---

## ■ Review Conditions

Review Conditions には、いつ見直すべきかを書く。

記入すること:

- 見直し条件
- 見直しタイミング
- 見直しに必要な観測情報
- 影響を受ける domain / owner

見直し条件の例:

- event 数が増えて Markdown 管理が難しくなった
- consumer 数が増えて impact analysis が困難になった
- projection drift が運用課題になった
- workflow stuck が頻発した
- replay / rebuild の手動判断が限界に近づいた
- audit / forensic 要求が強まった
- warehouse boundary 例外が必要になった

---

## ■ Related Documents

Related Documents には、判断の根拠や関連する設計文書を書く。

候補:

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/event-driven-erp-principles.md`
- `docs/minimum-viable-event-driven-architecture.md`
- `docs/architecture-decision-records-strategy.md`
- `docs/event-driven-implementation-roadmap.md`
- `docs/operational-rollout-strategy.md`
- `docs/event-catalog-governance-implementation-plan.md`

方針:

- ADR は単独で完結しすぎなくてよい
- 原則・計画・実装方針への参照を残す
- 関連文書を更新する必要がある場合は Notes に書く

---

## ■ 重要判断用チェック項目

source of truth / projection / warehouse boundary / rollout など、logistics-erp で重要な判断では以下を確認する。

### source of truth

- 業務上の真実はどこにあるか
- `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` を壊さないか
- read model / projection を source of truth と混同していないか
- external input を確認前に source of truth にしていないか
- correction / recovery / audit の根拠が残るか

### projection / CQRS

- projection の source は何か
- projection drift をどう検出するか
- rebuild / refresh は source of truth を変更しないか
- small CRUD まで過剰に CQRS / event-driven 化していないか
- read model の都合で write model を歪めていないか

### warehouse boundary

- `warehouse_code` は guard / server-side profile 由来か
- client payload の `warehouse_code` を信頼していないか
- trace-search / Admin Dashboard / audit view が warehouse boundary を越えないか
- replay / rebuild / recovery 対象 warehouse_code が明示されるか
- cross-warehouse operation が必要な場合、理由と承認が説明できるか

### rollout

- 現場運用を止めないか
- Excel / NAS / manual operation と共存できるか
- read-only / compare-only / dry-run から始められるか
- operator education / onboarding が必要か
- incident / recovery 手順が説明できるか
- automation を急ぎすぎていないか

### optional architecture

- 今すぐ導入する必要があるか
- Markdown / checklist / manual review では不足する理由があるか
- 導入後の運用負荷を引き受けられるか
- 導入しない場合のリスクを観測できるか
- 見直し条件が明確か

---

## ■ 記入例

以下は記入例であり、正式な ADR ではない。

```markdown
# ADR-0001: 汎用 event_store の導入を現時点では保留する

作成日: 2026-05-09
Status: deferred

---

## ■ Context

logistics-erp では event-driven ERP の理想像として、将来的に汎用 event_store や trace_events を検討できる。

一方で現時点では、inventory_transactions / pallet_transactions / warehouse_location_history が source of truth として機能している。

minimum viable event-driven architecture では、まず既存 source of truth を守り、trace-search、projection consistency、compare-only、manual review を優先する方針である。

## ■ Decision

現時点では、汎用 event_store は作らない。

既存の inventory_transactions / pallet_transactions / warehouse_location_history を source of truth として維持し、event_store 導入判断は deferred とする。

## ■ Consequences

- 既存履歴テーブルを一気に移し替える big-bang migration を避けられる。
- trace-search と Admin Dashboard の read-only 調査導線を優先できる。
- event_name / event_version / metadata の統一管理は当面 Markdown / design documents で扱う。
- 横断 audit / forensic 要求が強まる場合は再検討が必要になる。

## ■ Alternatives Considered

- 汎用 event_store をすぐ作る: 既存 source of truth の移行リスクが高いため採用しない。
- trace_events を先に作る: parent_trace_id / request_id の保存先が未確定のため保留する。
- 既存 source table を維持する: 現時点ではこの方針を採用する。

## ■ Review Conditions

- 既存 source table だけでは横断 audit / forensic が困難になった場合。
- event_name / event_version / metadata_version の統一保存が必要になった場合。
- replay / rebuild / lifecycle 管理が既存構造では難しくなった場合。

## ■ Related Documents

- ERP設計憲法.md
- docs/event-driven-erp-principles.md
- docs/minimum-viable-event-driven-architecture.md
- docs/architecture-decision-records-strategy.md

## ■ Notes

この ADR は event_store を不要と決めるものではない。
現時点では導入しない、という deferred decision を記録する。
```

---

## ■ lightweight ADR 方針

ADR は重い承認プロセスではなく、重要判断を短く残すために使う。

方針:

- すべての小変更を ADR 化しない
- 1 ADR につき 1 decision を基本にする
- source of truth / projection / warehouse boundary / recovery / rollout に関わる判断を優先する
- optional architecture の accepted / rejected / deferred を優先して残す
- 実装変更の詳細ではなく、architecture decision と理由を残す
- 既存方針に沿った typo / UI 表示補足 / 内部 refactor は通常 ADR 不要
- decision が変わる場合は過去 ADR を削除せず、superseded として扱うことを検討する

ADR が必要になりやすい判断:

- source of truth を変更する
- projection の責務を変更する
- warehouse boundary の例外を作る
- event store / queue / workflow engine / registry を導入する
- rollback / correction / recovery 方針を変更する
- Excel / NAS / manual operation の廃止条件を決める

---

## ■ 今後の検討事項

以下は今回決定しない。

- ADR の正式 numbering rule
- ADR を `docs/adr/` に分離するか
- ADR index を作るか
- ADR owner / reviewer
- ADR review workflow
- ADR status registry
- superseded / obsolete の正式運用
- ADR と event catalog / impact analysis の cross reference 方式
- ADR を CI / lint で確認するか
- ADR を Admin Dashboard に表示するか
- AI / Cursor が ADR を優先参照するルール

---

## ■ 原則

ADR は、判断を重くするためではなく、判断を忘れないために使う。

採用・却下・保留した理由を短く残す。

principle、implementation、optional architecture を混同しない。

現場運用を壊さず育てるために、source of truth、projection、warehouse boundary、correction / recovery、rollout に関わる判断を優先して記録する。
