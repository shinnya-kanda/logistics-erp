# 物流ERP ロードマップ

## Phase 0: trace_events 冪等性の完成（実施済み）

- **目的**: importer を再実行しても trace_events が重複登録されないようにする。
- **内容**:
  - SQL: 重複削除、idempotency_key 追加、unique (shipment_id, event_type)、unique (idempotency_key) WHERE NOT NULL。
  - schema: TraceEvent / CreateTraceEventInput に idempotency_key。
  - trace_id: normalizeTraceToken / buildTraceId(issueNo, partNo) で helper 統一。
  - repository: find-or-create（idempotency_key 優先、shipment_id + event_type で fallback）。
  - importer: SHIPPER_CONFIRMED 時に idempotency_key 必須、trace_id は helper 経由。

## 今後のフェーズ（未実施）

- **stock_movements / inventory の冪等**: Phase 0 は trace_events のみ。在庫・movement の二重登録防止は別フェーズ。
- **transaction / outbox / importer_run_id**: 取込単位のロールバックや再実行範囲の明確化。
- **QR / driver / shipper app**: trace_events への登録と client_event_id の idempotency_key 利用。
