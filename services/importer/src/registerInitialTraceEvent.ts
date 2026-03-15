import type { Shipment, TraceEvent } from "@logistics-erp/schema";
import { buildTraceId } from "@logistics-erp/schema";
import { insertTraceEvent } from "@logistics-erp/db";

export interface RegisterInitialTraceEventOptions {
  /** 必須。idempotency_key と (shipment_id, event_type) の冪等に必要。 */
  shipmentId: string
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
  const idempotencyKey = `IMPORTER_INIT:${options.shipmentId}:SHIPPER_CONFIRMED`;

  return insertTraceEvent({
    event_type: "SHIPPER_CONFIRMED",
    trace_id: traceId,
    idempotency_key: idempotencyKey,
    supplier: shipment.supplier || null,
    part_no: shipment.partNo,
    part_name: shipment.partName || null,
    issue_no: shipment.issueNo,
    shipment_id: options.shipmentId,
    stock_movement_id: options.stockMovementId ?? null,
    quantity: shipment.quantity,
    actor_type: "SYSTEM",
    status: "OK",
    payload: { source: "importer" },
  });
}
