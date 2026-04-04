import type {
  InventoryTransaction,
  InventoryTransactionInsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

export async function insertInventoryTransaction(
  input: InventoryTransactionInsertInput
): Promise<InventoryTransaction> {
  const row = {
    transaction_type: input.transaction_type,
    inventory_type: input.inventory_type,
    part_no: input.part_no,
    part_name: input.part_name ?? null,
    quantity: input.quantity,
    quantity_unit: input.quantity_unit ?? "part",
    occurred_at: input.occurred_at ?? undefined,
    warehouse_code: input.warehouse_code ?? null,
    location_code: input.location_code ?? null,
    shipment_id: input.shipment_id ?? undefined,
    source_reference: input.source_reference ?? null,
    remarks: input.remarks ?? null,
  };

  const { data, error } = await supabase
    .from("inventory_transactions")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertInventoryTransaction failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as InventoryTransaction;
}

export async function listInventoryTransactionsByPartNo(
  partNo: string,
  limit = 100
): Promise<InventoryTransaction[]> {
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("part_no", partNo)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      `[@logistics-erp/db] listInventoryTransactionsByPartNo failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data ?? []) as InventoryTransaction[];
}
