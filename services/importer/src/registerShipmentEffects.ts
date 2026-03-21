import type { Inventory, StockMovement, TraceEvent } from "@logistics-erp/schema";
import type { Shipment } from "@logistics-erp/schema";
import {
  increaseInventoryByReceipt,
  insertStockMovement,
} from "@logistics-erp/db";
import { registerInitialTraceEventFromShipment } from "./registerInitialTraceEvent.js";

/**
 * Supabase shipments テーブルから返る 1 行（Phase0: 行=明細相当の upsert 後レコード）。
 */
export interface ShipmentRow {
  id: string
  issue_no: string
  supplier: string | null
  part_no: string
  part_name: string | null
  quantity: number
  due_date: string
}

/** Phase1: shipment_items + ヘッダ id を渡し、在庫・trace を明細単位で冪等登録する。 */
export interface ShipmentEffectLineRow {
  shipment_item_id: string
  shipment_header_id: string
  issue_no: string
  supplier: string | null
  part_no: string
  part_name: string | null
  quantity: number
  due_date: string
}

export type ShipmentEffectInputRow = ShipmentRow | ShipmentEffectLineRow;

function isPhase1EffectRow(row: ShipmentEffectInputRow): row is ShipmentEffectLineRow {
  return (
    "shipment_item_id" in row &&
    row.shipment_item_id != null &&
    "shipment_header_id" in row &&
    row.shipment_header_id != null
  );
}

export interface RegisterShipmentEffectsResult {
  shipment: ShipmentEffectInputRow
  movement: StockMovement
  inventory: Inventory
  traceEvent: TraceEvent
}

function rowToShipment(row: ShipmentEffectInputRow): Shipment {
  return {
    issueNo: row.issue_no,
    supplier: row.supplier ?? "",
    partNo: row.part_no,
    partName: row.part_name ?? "",
    quantity: row.quantity,
    dueDate: row.due_date,
  };
}

/**
 * 1 件の shipment（Phase0 行）または shipment_item（Phase1 明細）を起点に、
 * ① stock_movements に IN 登録
 * ② inventory 更新
 * ③ trace_events に初期イベント登録
 * を順に実行し、結果をまとめて返す。
 *
 * Phase0: idempotency_key は RECEIPT:{shipments.id}:IN / IMPORTER_INIT:{shipments.id}:...
 * Phase1: idempotency_key は RECEIPT:{shipment_item_id}:IN / IMPORTER_INIT:{shipment_item_id}:...
 */
export async function registerShipmentEffects(
  row: ShipmentEffectInputRow
): Promise<RegisterShipmentEffectsResult> {
  const shipment = rowToShipment(row);

  const phase1 = isPhase1EffectRow(row);
  const receiptIdempotencyKey = phase1
    ? `RECEIPT:${row.shipment_item_id}:IN`
    : `RECEIPT:${row.id}:IN`;

  const movement = await insertStockMovement({
    movement_type: "IN",
    supplier: row.supplier,
    part_no: row.part_no,
    part_name: row.part_name,
    quantity: row.quantity,
    shipment_id: phase1 ? row.shipment_header_id : row.id,
    shipment_item_id: phase1 ? row.shipment_item_id : null,
    idempotency_key: receiptIdempotencyKey,
  });

  const inventory = await increaseInventoryByReceipt({
    supplier: row.supplier,
    part_no: row.part_no,
    part_name: row.part_name,
    quantity: row.quantity,
  });

  const traceEvent = await registerInitialTraceEventFromShipment(shipment, {
    shipmentId: phase1 ? row.shipment_header_id : row.id,
    shipmentItemId: phase1 ? row.shipment_item_id : null,
    stockMovementId: movement.id,
  });

  return {
    shipment: row,
    movement,
    inventory,
    traceEvent,
  };
}
