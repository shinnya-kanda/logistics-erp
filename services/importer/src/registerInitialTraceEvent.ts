import type { Shipment, TraceEvent } from "@logistics-erp/schema";
import { buildTraceId } from "@logistics-erp/schema";
import { insertTraceEvent } from "@logistics-erp/db";

export interface RegisterInitialTraceEventOptions {
  /** 必須。ヘッダ shipments.id（Phase1）またはレガシー行 id（Phase0）。 */
  shipmentId: string
  /** Phase1: shipment_items.id。指定時は冪等キーは明細単位になる。 */
  shipmentItemId?: string | null
  stockMovementId?: string | null
}

/**
 * shipment を元に trace_events の初期イベントを冪等に作成する（Phase 0）。
 * - trace_id: buildTraceId(issueNo, partNo) で生成（TRC:...）。
 * - idempotency_key: IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED（再実行時は既存を返す）。
 * - options.shipmentId は必須（冪等キーに使用）。
 */
export async function registerInitialTraceEventFromShipment(
  shipment: Shipment,
  options: RegisterInitialTraceEventOptions
): Promise<TraceEvent> {
  const traceId = buildTraceId(shipment.issueNo, shipment.partNo);
  const idempotencyKey = options.shipmentItemId
    ? `IMPORTER_INIT:${options.shipmentItemId}:SHIPPER_CONFIRMED`
    : `IMPORTER_INIT:${options.shipmentId}:SHIPPER_CONFIRMED`;

  return insertTraceEvent({
    event_type: "SHIPPER_CONFIRMED",
    trace_id: traceId,
    idempotency_key: idempotencyKey,
    supplier: shipment.supplier || null,
    part_no: shipment.partNo,
    part_name: shipment.partName || null,
    issue_no: shipment.issueNo,
    shipment_id: options.shipmentId,
    shipment_item_id: options.shipmentItemId ?? null,
    stock_movement_id: options.stockMovementId ?? null,
    quantity: shipment.quantity,
    actor_type: "SYSTEM",
    status: "OK",
    payload: { source: "importer" },
  });
}
