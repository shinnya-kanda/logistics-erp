# ADR-0002: 現在状態テーブルは Projection / Read Model として扱う

作成日: 2026-05-09
Status: accepted

---

## ■ Context

logistics-erp では、現場・事務・管理者が現在の在庫やパレット状態を素早く確認する必要がある。

そのため、`inventory_current` や `pallet_units` のような現在状態テーブルは、検索・表示・作業判断に重要である。一方で、これらは業務履歴そのものではなく、source of truth から導出された状態である。

在庫差異、パレット移動差異、棚番履歴の不整合、請求・監査の説明では、現在状態だけでは根拠が不足する。projection を source of truth と混同すると、履歴不整合を表示上の修正で隠してしまうリスクがある。

この判断を正式 ADR として記録し、read model の便利さと source of truth の責務を分ける。

---

## ■ Decision

`inventory_current` と `pallet_units` は projection / read model として扱う。

- `inventory_current` は `inventory_transactions` から導出される在庫現在状態である。
- `pallet_units` は `pallet_transactions` から導出されるパレット現在状態である。
- Admin Dashboard の検索・一覧・trace timeline は read-only の調査入口であり、source of truth そのものではない。
- projection drift は source of truth との差分として扱う。
- projection を直接修正して履歴不整合を隠すことはしない。

rebuild / refresh / compare-only / dry-run は、source of truth を変更せず、projection の整合性を確認・回復するために使う。

---

## ■ Consequences

- 現在状態を高速に表示しながら、履歴の説明責任を source of truth に残せる。
- projection drift を検出した場合、read model だけで判断せず、source of truth と照合する必要がある。
- projection の直接 update は、例外的な復旧ではなく不整合隠しになり得るため避ける。
- rebuild / refresh は source of truth を変更しない operation として扱う。
- projection の freshness、drift、rebuild 結果を observability / Admin Dashboard で確認できるようにする余地を残す。
- すべての CRUD を過剰に CQRS / event-driven 化する必要はない。

---

## ■ Alternatives Considered

### `inventory_current` / `pallet_units` を正とする

Rejected.

現在状態は便利だが、業務履歴、補正理由、operator、trace、audit の根拠としては不足する。現在状態だけを正とすると、なぜその数量・状態になったかを説明できない。

### projection drift を直接 update で直す

Rejected.

projection だけを修正すると、source of truth との差分が隠れ、後続の rebuild / audit / recovery で説明できなくなる。差異は source of truth と比較し、必要に応じて correction または projection rebuild / refresh で扱う。

### すべての projection を非同期 event consumer に置き換える

Deferred.

将来的な選択肢としてはあり得るが、現時点では consumer 数、遅延許容、dead-letter、retry、ordering の運用要件が十分に固まっていない。まずは既存 projection を守り、compare-only / dry-run / manual review から始める。

---

## ■ Review Conditions

この ADR は以下の条件で見直す。

- projection drift が頻発し、手動調査では追いつかなくなった場合
- rebuild / refresh の自動化が必要になった場合
- read model freshness を業務上明示する必要が出た場合
- consumer 数が増え、非同期 projection 更新の導入が必要になった場合
- `inventory_current` / `pallet_units` の責務や schema を大きく変更する場合

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/adr-template.md`
- `docs/adr-source-of-truth.md`
- `docs/architecture-decision-records-strategy.md`
- `docs/minimum-viable-event-driven-architecture.md`
- `docs/event-driven-erp-principles.md`
- `docs/operational-rollout-strategy.md`

---

## ■ Notes

projection / read model は軽いものではなく、現場運用に必要な重要な表示・確認基盤である。

ただし、重要であることと source of truth であることは別である。
