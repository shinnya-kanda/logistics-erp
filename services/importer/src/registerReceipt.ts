import type { Inventory, Shipment, StockMovement } from "@logistics-erp/schema";
import {
  increaseInventoryByReceipt,
  insertStockMovement,
} from "@logistics-erp/db";

export interface RegisterReceiptResult {
  movement: StockMovement
  inventory: Inventory
}

/**
 * shipment を受け取り、① stock_movements に IN を登録し、② inventory を増加させる。
 */
export async function registerReceipt(
  shipment: Shipment
): Promise<RegisterReceiptResult> {
  const movement = await insertStockMovement({
    movement_type: "IN",
    supplier: shipment.supplier || null,
    part_no: shipment.partNo,
    part_name: shipment.partName || null,
    quantity: shipment.quantity,
    shipment_id: null,
  });

  const inventory = await increaseInventoryByReceipt({
    supplier: shipment.supplier || null,
    part_no: shipment.partNo,
    part_name: shipment.partName || null,
    quantity: shipment.quantity,
  });

  return { movement, inventory };
}
