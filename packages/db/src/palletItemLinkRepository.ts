import type {
  PalletItemLinkInsertInput,
  PalletItemLinkRow,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

export async function insertPalletItemLink(
  input: PalletItemLinkInsertInput
): Promise<PalletItemLinkRow> {
  const row = {
    pallet_unit_id: input.pallet_unit_id,
    part_no: input.part_no,
    part_name: input.part_name ?? null,
    quantity: input.quantity,
    quantity_unit: input.quantity_unit,
    linked_at: input.linked_at ?? undefined,
    unlinked_at: input.unlinked_at ?? null,
  };

  const { data, error } = await supabase
    .from("pallet_item_links")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertPalletItemLink failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as PalletItemLinkRow;
}
