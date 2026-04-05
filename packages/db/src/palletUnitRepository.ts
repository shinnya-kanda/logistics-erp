import type {
  PalletUnitInsertInput,
  PalletUnitRow,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

export async function insertPalletUnit(
  input: PalletUnitInsertInput
): Promise<PalletUnitRow> {
  const row = {
    pallet_no: input.pallet_no,
    warehouse_code: input.warehouse_code,
    location_code: input.location_code,
    inventory_type: input.inventory_type,
    status: input.status,
    storage_area_tsubo: input.storage_area_tsubo ?? 0.5,
    arrived_at: input.arrived_at ?? undefined,
    closed_at: input.closed_at ?? null,
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

  return data as PalletUnitRow;
}

export async function getPalletUnitById(
  id: string
): Promise<PalletUnitRow | null> {
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

  return (data as PalletUnitRow) ?? null;
}
