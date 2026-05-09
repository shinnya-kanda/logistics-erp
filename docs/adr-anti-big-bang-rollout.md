# ADR-0005: Big-Bang Migration を避け段階導入を基本とする

作成日: 2026-05-09
Status: accepted

---

## ■ Context

logistics-erp は、物流現場の Excel、NAS、紙、PDF、手入力、既存 Driver App / Admin Dashboard、Node API 残存箇所、Supabase Edge Functions へ移行済み API が混在する状態から、段階的に DB 中心の運用へ移行するシステムである。

現場運用では、実物流が止まらないこと、事務確認が続けられること、旧運用と新運用の差異を調査できることが重要である。全 API / UI / workflow / projection / external integration を一度に切り替えると、障害時の原因特定、回復、教育、現場説明が難しくなる。

Operational Rollout Strategy では、read-only / compare-only / dry-run / manual review を優先し、big-bang migration を避ける方針を整理している。この判断を正式 ADR として記録する。

---

## ■ Decision

logistics-erp の rollout は big-bang migration を避け、段階導入を基本とする。

- 既存運用を一度に廃止しない。
- Excel / NAS / manual operation と一定期間共存する。
- 新機能は read-only / compare-only / dry-run から始める。
- high risk domain である inventory / pallet / warehouse location から小さく進める。
- observability / trace-search / Admin Dashboard の調査導線を先に整える。
- rollback ではなく correction / recovery で業務履歴を説明する。
- warehouse_code boundary を rollout 全体で維持する。

automation は、manual review の実績と業務影響の説明ができる範囲から検討する。

---

## ■ Consequences

- 現場運用を止めずに、新旧運用の共存期間を正式に扱える。
- 新機能を本適用する前に、read-only / compare-only / dry-run で差異を観測できる。
- 切替速度は一時的に遅く見えるが、障害時の原因特定と回復可能性を高められる。
- Excel / NAS / manual operation を無理に廃止しないため、外部入力の validation / review が必要になる。
- rollout の単位、対象 warehouse_code、role、operator education、incident procedure を明確にする必要がある。
- すべての optional architecture を先に導入しないため、Markdown / checklist / manual review の運用品質が重要になる。

---

## ■ Alternatives Considered

### 全 API / UI / workflow を一度に切り替える

Rejected.

障害時に原因箇所が広がり、現場作業、事務確認、回復手順への影響が大きい。既存仕様を壊さず小さく変更する開発ルールにも反する。

### Excel / NAS / manual operation を一度に廃止する

Rejected.

Excel / CSV / NAS / 手作業は現場導入期の重要な中間手段である。代替運用で同じ業務判断ができることを確認する前に廃止しない。

### 汎用 event store / workflow engine / queue / registry を先に導入する

Deferred.

将来候補ではあるが、業務 step、failure pattern、consumer、retry、dead-letter、governance の要件が安定する前に導入すると過剰設計になりやすい。

### 本適用を先に行い、問題があれば rollback する

Rejected.

commit 済みの業務履歴は rollback ではなく correction / recovery で説明する方針である。本適用前に read-only / compare-only / dry-run で確認する。

---

## ■ Review Conditions

この ADR は以下の条件で見直す。

- 特定 domain の新運用が安定し、旧運用の廃止条件を定義する場合
- read-only / compare-only / dry-run から本適用へ移る場合
- operator education / onboarding の正式手順を決める場合
- incident / recovery playbook を実装・運用化する場合
- queue / workflow engine / registry など optional architecture の導入判断を行う場合
- warehouse_code / role / domain 単位の rollout scope を拡大する場合

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/adr-template.md`
- `docs/adr-source-of-truth.md`
- `docs/adr-correction-over-rollback.md`
- `docs/adr-warehouse-boundary.md`
- `docs/architecture-decision-records-strategy.md`
- `docs/minimum-viable-event-driven-architecture.md`
- `docs/event-driven-erp-principles.md`
- `docs/operational-rollout-strategy.md`

---

## ■ Notes

big-bang migration を避けることは、進捗を止めることではない。

現場運用を壊さず、調査できる状態を先に作り、業務影響を説明できる範囲から少しずつ本適用へ進めるための architecture decision である。
