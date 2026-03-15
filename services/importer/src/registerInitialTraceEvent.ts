import type { Shipment, TraceEvent } from "@logistics-erp/schema";
import { buildTraceId } from "@logistics-erp/schema";
import { insertTraceEvent } from "@logistics-erp/db";

export interface RegisterInitialTraceEventOptions {
  shipmentId?: string | null
  stockMovementId?: string | null
}

/**
 * shipment を元に trace_events の初期イベントを作成する。
 * - trace_id: buildTraceId({ issue_no, part_no, supplier }) で生成（TRC:...）。
 * - idempotency_key: IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED（再実行時は既存を返す）。
 * - shipment_id が取れない場合は idempotency_key を付けられず重複登録の可能性あり（TODO）。
 */
export async function registerInitialTraceEventFromShipment(
  shipment: Shipment,
  options: RegisterInitialTraceEventOptions = {}
): Promise<TraceEvent> {
  const traceId = buildTraceId({
    issue_no: shipment.issueNo,
    part_no: shipment.partNo,
    supplier: shipment.supplier,
  });

  const shipmentId = options.shipmentId ?? null;
  const idempotencyKey = shipmentId
    ? `IMPORTER_INIT:${shipmentId}:SHIPPER_CONFIRMED`
    : null;
  // TODO: shipment_id が取れない場合（取込経路によっては id が渡らない）、idempotency_key が付けられず二重登録になり得る。

  return insertTraceEvent({
    event_type: "SHIPPER_CONFIRMED",
    trace_id: traceId,
    idempotency_key: idempotencyKey,
    supplier: shipment.supplier || null,
    part_no: shipment.partNo,
    part_name: shipment.partName || null,
    issue_no: shipment.issueNo,
    shipment_id: shipmentId,
    stock_movement_id: options.stockMovementId ?? null,
    quantity: shipment.quantity,
    actor_type: "SYSTEM",
    status: "OK",
    payload: { source: "importer" },
  });
}
