import type {
  PalletTransactionInsertInput,
  PalletTransactionRow,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

export async function insertPalletTransaction(
  input: PalletTransactionInsertInput
): Promise<PalletTransactionRow> {
  const row = {
    pallet_unit_id: input.pallet_unit_id,
    transaction_type: input.transaction_type,
    from_location_code: input.from_location_code ?? null,
    to_location_code: input.to_location_code ?? null,
    occurred_at: input.occurred_at ?? undefined,
    source_type: input.source_type ?? null,
    source_id: input.source_id ?? null,
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from("pallet_transactions")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertPalletTransaction failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as PalletTransactionRow;
}
