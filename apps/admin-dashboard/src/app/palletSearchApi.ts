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

type PalletSearchParams = {
  warehouseCode?: string;
  status?: PalletSearchStatus;
  partNo?: string;
};

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

export async function searchPallets({
  warehouseCode,
  status = "ALL",
  partNo,
}: PalletSearchParams): Promise<PalletSearchResponse> {
  const params = new URLSearchParams();
  const trimmedWarehouseCode = warehouseCode?.trim();
  const trimmedPartNo = partNo?.trim();
  if (trimmedWarehouseCode) {
    params.set("warehouse_code", trimmedWarehouseCode);
  }
  if (status === "ACTIVE" || status === "OUT") {
    params.set("status", status);
  }
  if (trimmedPartNo) {
    params.set("part_no", trimmedPartNo);
  }

  const res = await fetch(`${API_BASE}/pallets/search?${params.toString()}`);
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
