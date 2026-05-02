export type PalletSearchRow = {
  pallet_id: string;
  pallet_code: string;
  warehouse_code: string;
  current_location_code: string | null;
  current_status: string | null;
  part_no: string | null;
  part_name: string | null;
  quantity: string | number | null;
  quantity_unit: string | null;
  updated_at: string | null;
};

type PalletSearchResponse =
  | { ok: true; pallets: PalletSearchRow[] }
  | { ok: false; error: string };

export type PalletSearchStatus = "ALL" | "ACTIVE" | "OUT";

const API_BASE = "http://localhost:3040";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isPalletSearchRow(v: unknown): v is PalletSearchRow {
  if (!isRecord(v)) return false;
  return (
    typeof v.pallet_id === "string" &&
    typeof v.pallet_code === "string" &&
    typeof v.warehouse_code === "string"
  );
}

function parseError(json: unknown): string {
  if (isRecord(json) && typeof json.error === "string") return json.error;
  return "パレット検索に失敗しました。";
}

export async function searchPalletsByWarehouseCode(
  warehouseCode: string,
  status: PalletSearchStatus = "ALL"
): Promise<PalletSearchResponse> {
  const statusQuery =
    status === "ALL" ? "" : `&status=${encodeURIComponent(status)}`;
  const res = await fetch(
    `${API_BASE}/pallets/search?warehouse_code=${encodeURIComponent(warehouseCode)}${statusQuery}`
  );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "APIからJSON以外の応答が返りました。" };
  }

  if (!res.ok) {
    return { ok: false, error: parseError(json) };
  }

  if (!isRecord(json) || json.ok !== true || !Array.isArray(json.pallets)) {
    return { ok: false, error: "パレット検索結果の形式が不正です。" };
  }

  const pallets = json.pallets.filter(isPalletSearchRow);
  return { ok: true, pallets };
}
