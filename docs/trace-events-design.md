# trace_events 設計（Phase 0 反映）

## 役割

**trace_events** は「現場で何が起きたか」を残す**イベント台帳**。QR 読取・荷主出荷・ドライバー集荷・営業所受領・棚入れ・出庫・納品まで、一連の流れを時系列で記録する。

## Phase 0: 冪等性の完成

- **idempotency_key**: 同一キーでは insert せず既存を返す。importer は `IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED` を付与。
- **unique (shipment_id, event_type)**: 同一 shipment ・同一 event_type は 1 行のみ。insert 失敗時は既存を (shipment_id, event_type) で再取得して返す fallback。
- **trace_id**: `buildTraceId(issueNo, partNo)` で生成（`TRC:{normalized}:{normalized}`）。helper 経由に統一。

## shipments / stock_movements / inventory との違い

| テーブル | 役割 |
|----------|------|
| **shipments** | 取込元データ。「何を・いつ届けるか」の指示。 |
| **stock_movements** | 在庫の増減履歴。 |
| **inventory** | 現在庫の集約。 |
| **trace_events** | **誰が・どこで・何をしたか**のイベントログ。冪等は idempotency_key と (shipment_id, event_type) で確保。 |

## trace_id の考え方

- 一つの荷物・ラベル・出荷単位を識別する ID。
- **Phase 0**: `buildTraceId(issueNo, partNo)` で `TRC:{issueNo}:{partNo}`（正規化済み）を生成。importer 含め helper 経由に統一。
- 将来は QR コード値やラベル ID を trace_id に含める拡張が可能。

## 今後の拡張

- driver app / shipper app / warehouse app から `insertTraceEvent` で登録。idempotency_key に client_event_id などを載せる想定。
