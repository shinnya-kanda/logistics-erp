import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export type PalletSearchRow = {
  pallet_id: string;
  pallet_code: string;
  warehouse_code: string;
  project_no: string | null;
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

export type EmptyPalletRow = {
  pallet_id: string;
  pallet_code: string;
  warehouse_code: string;
  current_location_code: string | null;
  current_status: string | null;
  updated_at: string | null;
};

type EmptyPalletsResponse =
  | { ok: true; pallets: EmptyPalletRow[] }
  | { ok: false; error: string };

export type WarehouseLocationRow = {
  id: string;
  warehouse_code: string;
  location_code: string;
  is_active: boolean;
  remarks: string | null;
  updated_at: string | null;
};

type WarehouseLocationSearchResponse =
  | { ok: true; locations: WarehouseLocationRow[] }
  | { ok: false; error: string };

type WarehouseLocationMutationResponse =
  | { ok: true; location: WarehouseLocationRow; created?: boolean }
  | { ok: false; error: string };

export type UnregisteredWarehouseLocationRow = {
  warehouse_code: string;
  location_code: string;
  usage_count: number;
};

type UnregisteredWarehouseLocationResponse =
  | { ok: true; locations: UnregisteredWarehouseLocationRow[] }
  | { ok: false; error: string };

export type PalletDetail = {
  pallet: {
    pallet_id: string;
    pallet_code: string;
    warehouse_code: string;
    project_no: string | null;
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

export type PalletProjectNoUpdateResponse =
  | {
      ok: true;
      pallet: PalletDetail["pallet"];
      updated_item_link_count: number;
    }
  | { ok: false; error: string };

export type PalletSearchStatus = "ALL" | "ACTIVE" | "OUT";

type PalletSearchParams = {
  warehouseCode?: string;
  projectNo?: string;
  status?: PalletSearchStatus;
  partNo?: string;
  palletCode?: string;
};

const API_BASE = "/api/scan";

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

function isEmptyPalletRow(v: unknown): v is EmptyPalletRow {
  if (!isRecord(v)) return false;
  return (
    typeof v.pallet_id === "string" &&
    typeof v.pallet_code === "string" &&
    typeof v.warehouse_code === "string"
  );
}

function isWarehouseLocationRow(v: unknown): v is WarehouseLocationRow {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.warehouse_code === "string" &&
    typeof v.location_code === "string" &&
    typeof v.is_active === "boolean"
  );
}

function isUnregisteredWarehouseLocationRow(
  v: unknown
): v is UnregisteredWarehouseLocationRow {
  if (!isRecord(v)) return false;
  return (
    typeof v.warehouse_code === "string" &&
    typeof v.location_code === "string" &&
    typeof v.usage_count === "number"
  );
}

function parseError(json: unknown): string {
  if (isRecord(json) && typeof json.error === "string") return json.error;
  return "パレット検索に失敗しました。";
}

async function adminApiHeaders(json = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = json
    ? { "Content-Type": "application/json" }
    : {};
  const client = getSupabaseBrowserClient();
  if (!client) return headers;

  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function getUnregisteredWarehouseLocations(): Promise<UnregisteredWarehouseLocationResponse> {
  const res = await fetch(`${API_BASE}/warehouse-locations/unregistered`, {
    headers: await adminApiHeaders(),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "APIからJSON以外の応答が返りました。" };
  }

  if (!res.ok) {
    return { ok: false, error: parseError(json) };
  }

  if (!isRecord(json) || json.ok !== true || !Array.isArray(json.locations)) {
    return { ok: false, error: "未登録棚番一覧の形式が不正です。" };
  }

  return {
    ok: true,
    locations: json.locations.filter(isUnregisteredWarehouseLocationRow),
  };
}

export async function searchWarehouseLocations(params: {
  warehouseCode?: string;
  locationCode?: string;
  isActive?: "ALL" | "ACTIVE" | "INACTIVE";
}): Promise<WarehouseLocationSearchResponse> {
  const searchParams = new URLSearchParams();
  const warehouseCode = params.warehouseCode?.trim();
  const locationCode = params.locationCode?.trim();
  if (warehouseCode) {
    searchParams.set("warehouse_code", warehouseCode);
  }
  if (locationCode) {
    searchParams.set("location_code", locationCode);
  }
  if (params.isActive === "ACTIVE") {
    searchParams.set("is_active", "true");
  }
  if (params.isActive === "INACTIVE") {
    searchParams.set("is_active", "false");
  }

  const res = await fetch(`${API_BASE}/warehouse-locations/search?${searchParams.toString()}`, {
    headers: await adminApiHeaders(),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "APIからJSON以外の応答が返りました。" };
  }

  if (!res.ok) {
    return { ok: false, error: parseError(json) };
  }

  if (!isRecord(json) || json.ok !== true || !Array.isArray(json.locations)) {
    return { ok: false, error: "棚番マスタ検索結果の形式が不正です。" };
  }

  return { ok: true, locations: json.locations.filter(isWarehouseLocationRow) };
}

export async function createWarehouseLocation(params: {
  warehouseCode: string;
  locationCode: string;
  remarks?: string;
}): Promise<WarehouseLocationMutationResponse> {
  const res = await fetch(`${API_BASE}/warehouse-locations/create`, {
    method: "POST",
    headers: await adminApiHeaders(true),
    body: JSON.stringify({
      warehouse_code: params.warehouseCode,
      location_code: params.locationCode,
      is_active: true,
      remarks: params.remarks?.trim() || undefined,
    }),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "APIからJSON以外の応答が返りました。" };
  }

  if (!res.ok) {
    return { ok: false, error: parseError(json) };
  }

  if (!isRecord(json) || json.ok !== true || !isWarehouseLocationRow(json.location)) {
    return { ok: false, error: "棚番マスタ登録結果の形式が不正です。" };
  }

  return { ok: true, location: json.location, created: json.created === true };
}

export async function updateWarehouseLocationActive(params: {
  id: string;
  isActive: boolean;
}): Promise<WarehouseLocationMutationResponse> {
  const res = await fetch(`${API_BASE}/warehouse-locations/active/update`, {
    method: "POST",
    headers: await adminApiHeaders(true),
    body: JSON.stringify({
      id: params.id,
      is_active: params.isActive,
    }),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "APIからJSON以外の応答が返りました。" };
  }

  if (!res.ok) {
    return { ok: false, error: parseError(json) };
  }

  if (!isRecord(json) || json.ok !== true || !isWarehouseLocationRow(json.location)) {
    return { ok: false, error: "棚番マスタ更新結果の形式が不正です。" };
  }

  return { ok: true, location: json.location };
}

export async function getEmptyPallets(params: {
  warehouseCode?: string;
  projectNo?: string;
}): Promise<EmptyPalletsResponse> {
  const searchParams = new URLSearchParams();
  const warehouseCode = params.warehouseCode?.trim();
  const projectNo = params.projectNo?.trim();
  if (warehouseCode) {
    searchParams.set("warehouse_code", warehouseCode);
  }
  if (projectNo) {
    searchParams.set("project_no", projectNo);
  }

  const query = searchParams.toString();
  const res = await fetch(`${API_BASE}/pallets/empty${query ? `?${query}` : ""}`, {
    headers: await adminApiHeaders(),
  });
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
    return { ok: false, error: "空パレット検索結果の形式が不正です。" };
  }

  return { ok: true, pallets: json.pallets.filter(isEmptyPalletRow) };
}

export async function searchPallets({
  warehouseCode,
  projectNo,
  status = "ALL",
  partNo,
  palletCode,
}: PalletSearchParams): Promise<PalletSearchResponse> {
  const params: string[] = [];
  const trimmedWarehouseCode = warehouseCode?.trim();
  const trimmedProjectNo = projectNo?.trim();
  const trimmedPartNo = partNo?.trim();
  const trimmedPalletCode = palletCode?.trim();
  if (trimmedWarehouseCode) {
    params.push(`warehouse_code=${encodeURIComponent(trimmedWarehouseCode)}`);
  }
  if (trimmedProjectNo) {
    params.push(`project_no=${encodeURIComponent(trimmedProjectNo)}`);
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

  const res = await fetch(`${API_BASE}/pallets/search?${params.join("&")}`, {
    headers: await adminApiHeaders(),
  });
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
    `${API_BASE}/pallets/detail?pallet_code=${encodeURIComponent(palletCode)}`,
    { headers: await adminApiHeaders() }
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

export async function updatePalletProjectNo(params: {
  palletCode: string;
  projectNo: string;
}): Promise<PalletProjectNoUpdateResponse> {
  const res = await fetch(`${API_BASE}/pallets/project-no/update`, {
    method: "POST",
    headers: await adminApiHeaders(true),
    body: JSON.stringify({
      pallet_code: params.palletCode,
      project_no: params.projectNo,
    }),
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "APIからJSON以外の応答が返りました。" };
  }

  if (!res.ok) {
    return { ok: false, error: parseError(json) };
  }

  if (
    !isRecord(json) ||
    json.ok !== true ||
    !isRecord(json.pallet) ||
    typeof json.updated_item_link_count !== "number"
  ) {
    return { ok: false, error: "project_no補正結果の形式が不正です。" };
  }

  return {
    ok: true,
    pallet: json.pallet as PalletDetail["pallet"],
    updated_item_link_count: json.updated_item_link_count,
  };
}
