import type {
  StockMovement,
  StockMovementInsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

/**
 * stock_movements 1 件 insert。
 * - shipment_id: 出荷元（shipments.id）との紐づけ。importer では upsert 後の id を渡す。
 * - source_type / source_ref: 将来の重複防止（importer_run_id / idempotency key）用。
 * - quantity: IN の場合は正数前提。0 は DB の CHECK (quantity <> 0) でエラーになる。
 */
export async function insertStockMovement(
  input: StockMovementInsertInput
): Promise<StockMovement> {
  const row = {
    movement_type: input.movement_type,
    supplier: input.supplier ?? null,
    part_no: input.part_no,
    part_name: input.part_name ?? null,
    quantity: input.quantity,
    movement_date: input.movement_date ?? undefined,
    source_type: input.source_type ?? null,
    source_ref: input.source_ref ?? null,
    shipment_id: input.shipment_id ?? undefined,
    note: input.note ?? null,
  };
  const { data, error } = await supabase
    .from("stock_movements")
    .insert(row)
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
