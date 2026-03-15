import type { StockMovement, StockMovementType } from "@logistics-erp/schema";
import { supabase } from "./client.js";

/**
 * stock_movements 1 件 insert 用パラメータ。
 * - shipment_id: 出荷元（shipments.id）との紐づけ。importer では upsert 後の id を渡す。
 * - 将来の重複防止: source_type / source_ref で importer_run_id や idempotency key を入れる想定（テーブルにカラムあり）。
 * - quantity: IN の場合は正数前提。0 は DB の CHECK (quantity <> 0) でエラーになる。
 */
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
