import type { Inventory, StockMovement, TraceEvent } from "@logistics-erp/schema";
import type { Shipment } from "@logistics-erp/schema";
import {
  increaseInventoryByReceipt,
  insertStockMovement,
} from "@logistics-erp/db";
import { registerInitialTraceEventFromShipment } from "./registerInitialTraceEvent.js";

/**
 * Supabase shipments テーブルから返る 1 行（upsert 後のレコード）。
 * registerShipmentEffects はこの形式を受け取り、在庫・trace を登録する。
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

export interface RegisterShipmentEffectsResult {
  shipment: ShipmentRow
  movement: StockMovement
  inventory: Inventory
  traceEvent: TraceEvent
}

function rowToShipment(row: ShipmentRow): Shipment {
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
 * 1 件の shipment レコードを起点に、
 * ① stock_movements に IN 登録
 * ② inventory 更新
 * ③ trace_events に初期イベント登録（stock_movement_id を紐づけ）
 * を順に実行し、結果をまとめて返す。
 *
 * TODO(idempotency): 現状、importer を 2 回実行すると stock_movements と trace_events が重複登録される。
 * 重複防止には (1) source_type + source_ref + shipment_id + event_type の一意制約、
 * (2) importer_run_id の導入、(3) 再実行時の idempotency key の導入 などが検討事項。
 */
export async function registerShipmentEffects(
  shipmentRow: ShipmentRow
): Promise<RegisterShipmentEffectsResult> {
  const shipment = rowToShipment(shipmentRow);

  // 1. stock_movements に IN を登録（shipment_id を紐づけ）
  const movement = await insertStockMovement({
    movement_type: "IN",
    supplier: shipmentRow.supplier,
    part_no: shipmentRow.part_no,
    part_name: shipmentRow.part_name,
    quantity: shipmentRow.quantity,
    shipment_id: shipmentRow.id,
  });

  // 2. inventory を増加（存在しなければ insert）
  const inventory = await increaseInventoryByReceipt({
    supplier: shipmentRow.supplier,
    part_no: shipmentRow.part_no,
    part_name: shipmentRow.part_name,
    quantity: shipmentRow.quantity,
  });

  // 3. trace_events に初期イベントを登録（movement 登録後に stock_movement_id を設定）
  const traceEvent = await registerInitialTraceEventFromShipment(shipment, {
    shipmentId: shipmentRow.id,
    stockMovementId: movement.id,
  });

  return {
    shipment: shipmentRow,
    movement,
    inventory,
    traceEvent,
  };
}
