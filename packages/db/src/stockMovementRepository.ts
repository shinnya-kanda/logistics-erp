import type {
  StockMovement,
  StockMovementInsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

const UNIQUE_VIOLATION_CODE = "23505";

/**
 * stock_movements 1 件 insert。
 * - idempotency_key を指定した場合、unique 制約違反時は既存行を取得して返す（冪等）。
 * - quantity === 0 はエラー（DB の CHECK (quantity <> 0) に合わせる）。
 * - shipment_id / source_type / source_ref: 出荷・重複防止用。
 */
export async function insertStockMovement(
  input: StockMovementInsertInput
): Promise<StockMovement> {
  if (input.quantity === 0) {
    throw new Error(
      "[@logistics-erp/db] insertStockMovement: quantity は 0 以外を指定してください。"
    );
  }

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
    idempotency_key: input.idempotency_key ?? null,
  };

  const { data, error } = await supabase
    .from("stock_movements")
    .insert(row)
    .select()
    .single();

  if (error) {
    if (
      input.idempotency_key &&
      (error.code === UNIQUE_VIOLATION_CODE || error.message?.includes("unique"))
    ) {
      const existing = await findStockMovementByIdempotencyKey(
        input.idempotency_key
      );
      if (existing) return existing;
    }
    throw new Error(
      `[@logistics-erp/db] insertStockMovement failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as StockMovement;
}

export async function findStockMovementByIdempotencyKey(
  idempotencyKey: string
): Promise<StockMovement | null> {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] findStockMovementByIdempotencyKey failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data as StockMovement) ?? null;
}
