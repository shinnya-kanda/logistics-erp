import type {
  InventoryTransactionInsertInput,
  InventoryTransactionRow,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

function mapInventoryTransactionRow(
  row: Record<string, unknown>
): InventoryTransactionRow {
  return {
    id: row.id as string,
    transaction_type: row.transaction_type as string,
    part_no: row.part_no as string,
    part_name: row.part_name as string | null,
    quantity: Number(row.quantity),
    quantity_unit: row.quantity_unit as string,
    warehouse_code: row.warehouse_code as string | null,
    location_code: row.location_code as string | null,
    toWarehouseCode:
      (row.to_warehouse_code as string | null | undefined) ?? null,
    toLocationCode:
      (row.to_location_code as string | null | undefined) ?? null,
    inventory_type: row.inventory_type as string,
    occurred_at: row.occurred_at as string,
    source_type: row.source_type as string | null,
    source_id: row.source_id as string | null,
    notes: row.notes as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function insertInventoryTransaction(
  input: InventoryTransactionInsertInput
): Promise<InventoryTransactionRow> {
  const row = {
    transaction_type: input.transaction_type,
    part_no: input.part_no,
    part_name: input.part_name ?? null,
    quantity: input.quantity,
    quantity_unit: input.quantity_unit,
    warehouse_code: input.warehouse_code ?? null,
    location_code: input.location_code ?? null,
    to_warehouse_code: input.toWarehouseCode ?? null,
    to_location_code: input.toLocationCode ?? null,
    inventory_type: input.inventory_type,
    occurred_at: input.occurred_at ?? undefined,
    source_type: input.source_type ?? null,
    source_id: input.source_id ?? null,
    notes: input.notes ?? null,
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

  return mapInventoryTransactionRow(data as Record<string, unknown>);
}

export async function listInventoryTransactionsByPartNo(
  partNo: string,
  limit = 100
): Promise<InventoryTransactionRow[]> {
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

  return (data ?? []).map((r) =>
    mapInventoryTransactionRow(r as Record<string, unknown>)
  );
}
