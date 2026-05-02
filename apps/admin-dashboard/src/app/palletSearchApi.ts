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

export type PalletDetail = {
  pallet: {
    pallet_id: string;
    pallet_code: string;
    warehouse_code: string;
    current_location_code: string | null;
    current_status: string | null;
    created_at: string | null;
    updated_at: string | null;
  };
  items: Array<{
    part_no: string | null;
    part_name: string | null;
    quantity: string | number | null;
    quantity_unit: string | null;
    linked_at: string | null;
    updated_at: string | null;
  }>;
  transactions: Array<{
    transaction_type: string | null;
    from_location_code: string | null;
    to_location_code: string | null;
    operator_name: string | null;
    remarks: string | null;
    idempotency_key: string | null;
    occurred_at: string | null;
  }>;
};

type PalletDetailResponse =
  | ({ ok: true } & PalletDetail)
  | { ok: false; error: string };

export type PalletSearchStatus = "ALL" | "ACTIVE" | "OUT";

type PalletSearchParams = {
  warehouseCode?: string;
  status?: PalletSearchStatus;
  partNo?: string;
  palletCode?: string;
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

function isPalletDetail(v: unknown): v is { ok: true } & PalletDetail {
  if (!isRecord(v) || v.ok !== true) return false;
  if (!isRecord(v.pallet)) return false;
  return (
    typeof v.pallet.pallet_id === "string" &&
    typeof v.pallet.pallet_code === "string" &&
    typeof v.pallet.warehouse_code === "string" &&
    Array.isArray(v.items) &&
    Array.isArray(v.transactions)
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
  palletCode,
}: PalletSearchParams): Promise<PalletSearchResponse> {
  const params: string[] = [];
  const trimmedWarehouseCode = warehouseCode?.trim();
  const trimmedPartNo = partNo?.trim();
  const trimmedPalletCode = palletCode?.trim();
  if (trimmedWarehouseCode) {
    params.push(`warehouse_code=${encodeURIComponent(trimmedWarehouseCode)}`);
  }
  if (status === "ACTIVE" || status === "OUT") {
    params.push(`status=${encodeURIComponent(status)}`);
  }
  if (trimmedPartNo) {
    params.push(`part_no=${encodeURIComponent(trimmedPartNo)}`);
  }
  if (trimmedPalletCode) {
    params.push(`pallet_code=${encodeURIComponent(trimmedPalletCode)}`);
  }

  const res = await fetch(`${API_BASE}/pallets/search?${params.join("&")}`);
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

export async function getPalletDetail(
  palletCode: string
): Promise<PalletDetailResponse> {
  const res = await fetch(
    `${API_BASE}/pallets/detail?pallet_code=${encodeURIComponent(palletCode)}`
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

  if (!isPalletDetail(json)) {
    return { ok: false, error: "パレット詳細結果の形式が不正です。" };
  }

  return {
    ok: true,
    pallet: json.pallet,
    items: json.items,
    transactions: json.transactions,
  };
}
