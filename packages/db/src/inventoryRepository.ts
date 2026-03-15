import type {
  Inventory,
  InventoryInsertInput,
  InventoryUpdateInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

export interface IncreaseInventoryByReceiptParams {
  supplier: string | null
  part_no: string
  part_name: string | null
  quantity: number
}

export async function increaseInventoryByReceipt(
  params: IncreaseInventoryByReceiptParams
): Promise<Inventory> {
  const { supplier, part_no, part_name, quantity } = params;

  let query = supabase
    .from("inventory")
    .select("id, on_hand_qty, allocated_qty, part_name")
    .eq("part_no", part_no);
  if (supplier == null) {
    query = query.is("supplier", null);
  } else {
    query = query.eq("supplier", supplier);
  }
  const { data: existing } = await query.maybeSingle();

  if (existing) {
    const newOnHand = (existing.on_hand_qty ?? 0) + quantity;
    const allocated = existing.allocated_qty ?? 0;
    const available = newOnHand - allocated;

    const updatePayload: InventoryUpdateInput = {
      on_hand_qty: newOnHand,
      available_qty: available,
      part_name: part_name ?? existing.part_name ?? null,
    };
    const { data: updated, error } = await supabase
      .from("inventory")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new Error(
        `[@logistics-erp/db] increaseInventoryByReceipt update failed: ${error.message}`,
        { cause: error }
      );
    }

    return updated as Inventory;
  }

  const insertPayload: InventoryInsertInput = {
    supplier,
    part_no,
    part_name,
    on_hand_qty: quantity,
    allocated_qty: 0,
    available_qty: quantity,
  };
  const { data: inserted, error } = await supabase
    .from("inventory")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] increaseInventoryByReceipt insert failed: ${error.message}`,
      { cause: error }
    );
  }

  return inserted as Inventory;
}
