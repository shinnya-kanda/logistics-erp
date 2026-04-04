import type {
  PalletItemLink,
  PalletItemLinkInsertInput,
  PalletTransaction,
  PalletTransactionInsertInput,
  PalletUnit,
  PalletUnitInsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

export async function insertPalletUnit(
  input: PalletUnitInsertInput
): Promise<PalletUnit> {
  const row = {
    pallet_no: input.pallet_no ?? null,
    trace_id: input.trace_id ?? null,
    inventory_type: input.inventory_type ?? null,
    status: input.status ?? null,
    warehouse_code: input.warehouse_code ?? null,
    location_code: input.location_code ?? null,
    received_at: input.received_at ?? null,
    closed_at: input.closed_at ?? null,
    storage_area_tsubo: input.storage_area_tsubo ?? 0.5,
    remarks: input.remarks ?? null,
  };

  const { data, error } = await supabase
    .from("pallet_units")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertPalletUnit failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as PalletUnit;
}

export async function getPalletUnitById(
  id: string
): Promise<PalletUnit | null> {
  const { data, error } = await supabase
    .from("pallet_units")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] getPalletUnitById failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data as PalletUnit) ?? null;
}

/** pallet_transactions 1 件 insert（パレットイベントの最小経路）。 */
export async function insertPalletTransaction(
  input: PalletTransactionInsertInput
): Promise<PalletTransaction> {
  const row = {
    pallet_unit_id: input.pallet_unit_id,
    transaction_type: input.transaction_type,
    occurred_at: input.occurred_at ?? undefined,
    warehouse_code: input.warehouse_code ?? null,
    location_code: input.location_code ?? null,
    storage_area_tsubo: input.storage_area_tsubo ?? null,
    source_reference: input.source_reference ?? null,
    remarks: input.remarks ?? null,
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

  return data as PalletTransaction;
}

export async function insertPalletItemLink(
  input: PalletItemLinkInsertInput
): Promise<PalletItemLink> {
  const row = {
    pallet_unit_id: input.pallet_unit_id,
    part_no: input.part_no,
    part_name: input.part_name ?? null,
    quantity: input.quantity,
    quantity_unit: input.quantity_unit ?? "part",
    linked_at: input.linked_at ?? undefined,
    unlinked_at: input.unlinked_at ?? null,
    remarks: input.remarks ?? null,
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

  return data as PalletItemLink;
}
