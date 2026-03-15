# 冪等性と trace_id（Phase 0）

## Phase 0: trace_events の冪等性

importer を再実行しても **trace_events が重複登録されない** 状態を実現する。

### 実施内容

1. **既存重複削除**: 同一 (shipment_id, event_type) の行のうち、id が小さい 1 件だけ残す。
2. **idempotency_key カラム**: テーブルに追加（null 可）。
3. **unique index (shipment_id, event_type)**: 同一 shipment ・同一 event_type の行は 1 件のみ。
4. **unique index (idempotency_key) WHERE idempotency_key IS NOT NULL**: 同一キーでは 1 件のみ。

### importer 側のルール

- **idempotency_key**: `IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED` を必ず設定。
- **repository**: insert 前に idempotency_key で検索 → 既存があれば返却。なければ insert。insert が unique 違反なら (shipment_id, event_type) で再取得して返却。

## trace_id は物流単位を追う共通キー

**trace_id** は「この荷物・この単位を一意に追いかけるキー」。QR スキャン、集荷、受領、納品まで、同じ trace_id のイベントを並べると経路が分かる。

### 現在のルール（Phase 0）

- **形式**: `TRC:{normalized(issueNo)}:{normalized(partNo)}`
- **helper**: `buildTraceId(issueNo, partNo)` で生成。`normalizeTraceToken` で各トークンを正規化。
- **正規化**: trim、大文字、空白・`:`・`/`・`\` を `-` に、英数字・`-`・`_` 以外を `-` に。空なら `UNKNOWN`。

## まだ未対応のリスク（Phase 0 以降）

- **stock_movements / inventory**: Phase 0 は trace_events のみ。在庫・movement の冪等は別フェーズ。
- **shipment_id なしの登録**: importer 経由では必ず shipment_id を渡す設計。それ以外の経路では (shipment_id, event_type) の unique が効かない場合がある。
- **将来**: QR アプリからは client_event_id を idempotency_key に使う想定。transaction / outbox / importer_run_id の導入可能性。
