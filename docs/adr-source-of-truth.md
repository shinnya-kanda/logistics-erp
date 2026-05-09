# ADR-0001: Source of Truth は業務履歴テーブルを基本とする

作成日: 2026-05-09
Status: accepted

---

## ■ Context

logistics-erp は、物流現場に存在する Excel・紙・PDF・手入力業務を、既存運用を止めずに段階的に DB 中心へ移行するシステムである。

在庫、パレット、棚番移動などの高リスク domain では、現在状態や画面表示だけでは後から「何が起きたか」を説明できない。誤登録、補正、棚卸差異、請求根拠、監査対応では、現在値よりも業務履歴が重要になる。

既存設計では、以下が業務上の事実を説明する中心である。

| domain | source of truth |
| --- | --- |
| inventory | `inventory_transactions` |
| pallet | `pallet_transactions` |
| warehouse location | `warehouse_location_history` |

この判断を正式 ADR として記録し、projection / read model や将来の event store と混同しないようにする。

---

## ■ Decision

logistics-erp の core domain における source of truth は、現時点では以下を基本とする。

- inventory の source of truth は `inventory_transactions`
- pallet の source of truth は `pallet_transactions`
- warehouse location の source of truth は `warehouse_location_history`

`inventory_current`、`pallet_units`、Admin Dashboard の一覧、trace timeline は source of truth ではなく、source of truth から導出・参照される projection / read model として扱う。

OCR / EDI / CSV / Excel / external API / NAS などの外部入力は、確認・検証・確定前に source of truth として扱わない。

汎用 `event_store` や `trace_events` を将来導入する可能性は否定しないが、現時点では既存 source table を一気に置き換えない。

---

## ■ Consequences

- 在庫・パレット・棚番履歴の説明責任を、現在値ではなく履歴テーブルに置ける。
- projection drift が起きた場合、source of truth を根拠に調査・rebuild / refresh / recovery を検討できる。
- correction / compensation は元履歴との関係を残す必要がある。
- 画面表示や検索性能の都合で source of truth を歪めてはならない。
- 汎用 event store を先に作らないため、event_name / event_version / metadata の統一管理は当面 Markdown / design documents / table-specific policy で扱う。
- source of truth を将来変更する場合は、強い review と新しい ADR が必要になる。

---

## ■ Alternatives Considered

### `inventory_current` / `pallet_units` を source of truth とする

Rejected.

これらは検索・表示・集計のための現在状態であり、履歴、補正、監査、rebuild の根拠としては不十分である。projection を source of truth として扱うと、差異発生時に原因を追跡できなくなる。

### 汎用 `event_store` をすぐ導入する

Deferred.

将来的な選択肢としては有効だが、現時点で既存 source table を一気に置き換えると big-bang migration になる。まずは既存履歴を守り、traceability / projection consistency / observability を段階的に広げる。

### 外部入力をそのまま source of truth とする

Rejected.

OCR / EDI / CSV / Excel / NAS は誤読、重複、欠落、ファイル差し替え、warehouse mapping 誤りが起き得る。検証・manual review・確定を経るまでは source of truth にしない。

---

## ■ Review Conditions

この ADR は以下の条件で見直す。

- 汎用 event store が必要になるほど event 数・consumer 数・audit 要求が増えた場合
- `inventory_transactions` / `pallet_transactions` / `warehouse_location_history` だけでは replay / rebuild / forensic が困難になった場合
- shipment / billing / external input の source of truth を正式に定義する場合
- source of truth の schema / ownership / lifecycle を変更する場合
- 既存 source table と新しい event store を併存させる必要が出た場合

---

## ■ Related Documents

- `ERP設計憲法.md`
- `開発ルール.md`
- `docs/adr-template.md`
- `docs/architecture-decision-records-strategy.md`
- `docs/minimum-viable-event-driven-architecture.md`
- `docs/event-driven-erp-principles.md`
- `docs/operational-rollout-strategy.md`

---

## ■ Notes

この ADR は、将来の event store を不要と決めるものではない。

現時点の正式判断は、既存の業務履歴テーブルを source of truth として守り、置き換えではなく段階的に traceability / observability / governance を追加することである。
