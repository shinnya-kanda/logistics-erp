import type { Shipment, TraceEvent } from "@logistics-erp/schema";
import { insertTraceEvent } from "@logistics-erp/db";

export interface RegisterInitialTraceEventOptions {
  shipmentId?: string | null
  stockMovementId?: string | null
}

/**
 * shipment を元に trace_events の初期イベントを作成する。
 * event_type = SHIPPER_CONFIRMED、trace_id = issue_no + ":" + part_no（暫定）。
 */
export async function registerInitialTraceEventFromShipment(
  shipment: Shipment,
  options: RegisterInitialTraceEventOptions = {}
): Promise<TraceEvent> {
  const traceId = `${shipment.issueNo}:${shipment.partNo}`.trim();
  if (!traceId || traceId === ":") {
    throw new Error(
      "[@logistics-erp/importer] registerInitialTraceEventFromShipment: issueNo と partNo が必要です。"
    );
  }

  return insertTraceEvent({
    event_type: "SHIPPER_CONFIRMED",
    trace_id: traceId,
    supplier: shipment.supplier || null,
    part_no: shipment.partNo,
    part_name: shipment.partName || null,
    issue_no: shipment.issueNo,
    shipment_id: options.shipmentId ?? null,
    stock_movement_id: options.stockMovementId ?? null,
    quantity: shipment.quantity,
    actor_type: "SYSTEM",
    status: "OK",
    payload: { source: "importer" },
  });
}
