import type {
  InventoryCurrentRow,
  InventoryCurrentUpsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

/**
 * inventory_current は集約キャッシュ。衝突時は quantity_on_hand を上書き。
 */
export async function upsertInventoryCurrent(
  input: InventoryCurrentUpsertInput
): Promise<InventoryCurrentRow> {
  const row = {
    part_no: input.part_no,
    warehouse_code: input.warehouse_code,
    location_code: input.location_code,
    inventory_type: input.inventory_type,
    quantity_on_hand: input.quantity_on_hand,
  };

  const { data, error } = await supabase
    .from("inventory_current")
    .upsert(row, {
      onConflict: "part_no,warehouse_code,location_code,inventory_type",
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] upsertInventoryCurrent failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as InventoryCurrentRow;
}

export async function getInventoryCurrentByKey(
  params: Omit<InventoryCurrentUpsertInput, "quantity_on_hand">
): Promise<InventoryCurrentRow | null> {
  const { data, error } = await supabase
    .from("inventory_current")
    .select("*")
    .eq("part_no", params.part_no)
    .eq("warehouse_code", params.warehouse_code)
    .eq("location_code", params.location_code)
    .eq("inventory_type", params.inventory_type)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] getInventoryCurrentByKey failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data as InventoryCurrentRow) ?? null;
}
