import type { StockMovement, StockMovementType } from "@logistics-erp/schema";
import { supabase } from "./client.js";

export interface InsertStockMovementParams {
  movement_type: StockMovementType
  supplier: string | null
  part_no: string
  part_name: string | null
  quantity: number
  shipment_id: string | null
}

export async function insertStockMovement(
  params: InsertStockMovementParams
): Promise<StockMovement> {
  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      movement_type: params.movement_type,
      supplier: params.supplier,
      part_no: params.part_no,
      part_name: params.part_name,
      quantity: params.quantity,
      shipment_id: params.shipment_id ?? undefined,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertStockMovement failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as StockMovement;
}
