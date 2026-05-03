import type { ScanHttpPostScansSuccessBody } from "@logistics-erp/schema";
import type { ScanInputPayload } from "@logistics-erp/schema";
import { getScanApiBaseUrl } from "./config.js";

const DEFAULT_TIMEOUT_MS = 15_000;
export const WAREHOUSE_CODE_STORAGE_KEY = "logistics_erp_warehouse_code";
export const DEFAULT_WAREHOUSE_CODE = "KOMATSU";

function normalizeWarehouseCode(raw: string | null | undefined): string {
  return (raw ?? "").trim().toUpperCase();
}

export function getStoredWarehouseCode(): string {
  if (typeof window === "undefined") return DEFAULT_WAREHOUSE_CODE;
  try {
    return normalizeWarehouseCode(window.localStorage.getItem(WAREHOUSE_CODE_STORAGE_KEY)) || DEFAULT_WAREHOUSE_CODE;
  } catch {
    return DEFAULT_WAREHOUSE_CODE;
  }
}

export function setStoredWarehouseCode(raw: string): string {
  const warehouseCode = normalizeWarehouseCode(raw) || DEFAULT_WAREHOUSE_CODE;
  try {
    window.localStorage.setItem(WAREHOUSE_CODE_STORAGE_KEY, warehouseCode);
  } catch {
    // localStorage が使えない環境でも固定初期値で業務処理は続ける。
  }
  return warehouseCode;
}

function linkAbort(parent: AbortSignal, child: AbortController): void {
  if (parent.aborted) {
    child.abort();
    return;
  }
  parent.addEventListener("abort", () => child.abort(), { once: true });
}

export type ScanApiErrorKind =
  | "network"
  | "timeout"
  | "validation"
  | "server"
  | "parse"
  | "unknown";

export type ScanApiError = {
  kind: ScanApiErrorKind;
  message: string;
  status?: number;
};

export type InventoryMovePayload = {
  part_no: string;
  quantity: number;
  warehouse_code: string;
  from_location_code: string;
  to_location_code: string;
  operator_name?: string;
  remarks?: string;
  idempotency_key: string;
};

export type InventoryMoveSuccessBody = {
  ok: true;
  move: {
    out_transaction: Record<string, unknown>;
    in_transaction: Record<string, unknown>;
  };
};

export type PalletCreatePayload = {
  pallet_code: string;
  warehouse_code: string;
  project_no?: string;
  current_location_code?: string;
  created_by?: string;
  remarks?: string;
};

export type PalletCreateSuccessBody = {
  ok: true;
  pallet_id: string;
  pallet_code: string;
  created: boolean;
};

export type PalletItemAddPayload = {
  pallet_code: string;
  part_no: string;
  quantity: number;
  warehouse_code: string;
  project_no?: string;
  quantity_unit?: string;
  created_by?: string;
  remarks?: string;
};

export type PalletItemAddSuccessBody = {
  ok: true;
  pallet_code: string;
  part_no: string;
  quantity_added: number;
};

export type PalletItemOutPayload = {
  pallet_code: string;
  part_no: string;
  quantity: number;
  warehouse_code: string;
  project_no?: string;
  operator_id?: string;
  operator_name?: string;
  remarks?: string;
  idempotency_key: string;
};

export type PalletItemOutSuccessBody = {
  ok: true;
  transaction: Record<string, unknown>;
  part_no?: string;
  quantity_out?: string | number;
  remaining_quantity?: string | number;
  idempotency_hit?: boolean;
};

export type PalletMovePayload = {
  pallet_code: string;
  to_location_code: string;
  warehouse_code: string;
  project_no?: string;
  operator_id?: string;
  operator_name?: string;
  remarks?: string;
  idempotency_key: string;
};

export type PalletMoveSuccessBody = {
  ok: true;
  transaction: Record<string, unknown>;
};

export type PalletOutPayload = {
  pallet_code: string;
  warehouse_code: string;
  project_no?: string;
  operator_id?: string;
  operator_name?: string;
  remarks?: string;
  idempotency_key: string;
};

export type PalletOutSuccessBody = {
  ok: true;
  transaction: Record<string, unknown>;
};

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

export type PalletSearchSuccessBody = {
  ok: true;
  pallets: PalletSearchRow[];
};

export type EmptyPalletRow = {
  pallet_id: string;
  pallet_code: string;
  warehouse_code: string;
  current_location_code: string | null;
  current_status: string | null;
  updated_at: string | null;
};

export type EmptyPalletsSuccessBody = {
  ok: true;
  pallets: EmptyPalletRow[];
};

export type WarehouseLocationCheckSuccessBody = {
  ok: true;
  warehouse_code: string;
  location_code: string;
  is_registered_location: boolean;
  is_unregistered_location: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function parseErrorBody(json: unknown): string {
  if (isRecord(json) && typeof json.message === "string") {
    return json.message;
  }
  if (isRecord(json) && typeof json.error === "string") {
    return json.error;
  }
  return "エラー応答の形式が不正です。";
}

export async function postScan(
  body: ScanInputPayload,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 201 | 200; data: ScanHttpPostScansSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/scans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: `応答が ${timeoutMs / 1000} 秒以内に返りませんでした。同じ送信の再試行なら、そのまま再送して構いません（冪等キーが有効です）。`,
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message:
          "ネットワークに接続できません。電波・VPN・API の起動を確認し、再試行してください（冪等キーは維持されます）。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。しばらくして再試行してください。",
        status: res.status,
      },
    };
  }

  if (res.status === 201 || res.status === 200) {
    if (!isScanSuccessBody(json)) {
      return {
        ok: false,
        error: {
          kind: "parse",
          message: "スキャン結果の形式が想定と異なります。",
          status: res.status,
        },
      };
    }
    return { ok: true, status: res.status as 201 | 200, data: json };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  if (res.status >= 500) {
    return {
      ok: false,
      error: {
        kind: "server",
        message: parseErrorBody(json),
        status: res.status,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isScanSuccessBody(v: unknown): v is ScanHttpPostScansSuccessBody {
  if (!isRecord(v)) return false;
  if (!isRecord(v.scanEvent)) return false;
  if (typeof v.scanEvent.result_status !== "string") return false;
  if (typeof v.idempotency_hit !== "boolean") return false;
  if (typeof v.created_new_scan !== "boolean") return false;
  if (!isRecord(v.match) || typeof v.match.kind !== "string") return false;
  if (v.match.kind === "ambiguous") {
    const m = v.match as Record<string, unknown>;
    if (!Array.isArray(m.candidate_ids)) return false;
    if (m.candidates !== undefined && !Array.isArray(m.candidates)) {
      return false;
    }
  }
  return true;
}

export async function getHealth(options?: {
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<
  | { ok: true }
  | { ok: false; error: Omit<ScanApiError, "status"> & { status?: number } }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 8_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return {
        ok: false,
        error: {
          kind: "server",
          message: `HTTP ${res.status}`,
          status: res.status,
        },
      };
    }
    return { ok: true };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "ヘルスチェックがタイムアウトしました。",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "接続できません。API が起動しているか確認してください。",
      },
    };
  }
}

export async function checkWarehouseLocation(
  params: { warehouseCode: string; locationCode: string },
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: WarehouseLocationCheckSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 8_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  const query = new URLSearchParams({
    warehouse_code: params.warehouseCode,
    location_code: params.locationCode,
  });

  let res: Response;
  try {
    res = await fetch(`${base}/warehouse-locations/check?${query.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "棚番チェックがタイムアウトしました。",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "棚番チェックに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "棚番チェックで JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isWarehouseLocationCheckSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "棚番チェック結果の形式が想定と異なります。",
        status: 200,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status === 400 ? "validation" : res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isWarehouseLocationCheckSuccessBody(v: unknown): v is WarehouseLocationCheckSuccessBody {
  if (!isRecord(v)) return false;
  return (
    v.ok === true &&
    typeof v.warehouse_code === "string" &&
    typeof v.location_code === "string" &&
    typeof v.is_registered_location === "boolean" &&
    typeof v.is_unregistered_location === "boolean"
  );
}

export async function postInventoryMove(
  body: InventoryMovePayload,
  options?: {
    signal?: AbortSignal;
    timeoutMs?: number;
    onDebug?: (message: string) => void;
  }
): Promise<
  | { ok: true; status: 200; data: InventoryMoveSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  const url = `${base}/inventory/move`;
  console.log("[MOVE API] URL:", url);
  console.log("[MOVE API] BODY:", body);
  options?.onDebug?.(`[MOVE API] URL: ${url}`);
  options?.onDebug?.(`[MOVE API] BODY: ${JSON.stringify(body)}`);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    console.log("[MOVE API] RESPONSE STATUS:", res.status);
    options?.onDebug?.(`[MOVE API] RESPONSE STATUS: ${res.status}`);
  } catch (e) {
    console.error("[MOVE API] FETCH ERROR:", e);
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      options?.onDebug?.("[MOVE API] FETCH ERROR: API通信タイムアウト");
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    options?.onDebug?.(
      `[MOVE API] FETCH ERROR: ${e instanceof Error ? e.message : String(e)}`
    );
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
    console.log("[MOVE API] RESPONSE JSON:", json);
    options?.onDebug?.(`[MOVE API] RESPONSE JSON: ${JSON.stringify(json)}`);
  } catch {
    options?.onDebug?.("[MOVE API] RESPONSE JSON: parse failed");
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (!isInventoryMoveSuccessBody(json)) {
      return {
        ok: false,
        error: {
          kind: "parse",
          message: "棚移動結果の形式が想定と異なります。",
          status: 200,
        },
      };
    }
    return { ok: true, status: 200, data: json };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isInventoryMoveSuccessBody(v: unknown): v is InventoryMoveSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (!isRecord(v.move)) return false;
  if (!isRecord(v.move.out_transaction)) return false;
  if (!isRecord(v.move.in_transaction)) return false;
  return true;
}

export async function postPalletCreate(
  body: PalletCreatePayload,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: PalletCreateSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/pallets/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isPalletCreateSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "server",
        message: parseErrorBody(json),
        status: 200,
      },
    };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isPalletCreateSuccessBody(v: unknown): v is PalletCreateSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (typeof v.pallet_id !== "string") return false;
  if (typeof v.pallet_code !== "string") return false;
  if (typeof v.created !== "boolean") return false;
  return true;
}

export async function postPalletItemAdd(
  body: PalletItemAddPayload,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: PalletItemAddSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/pallets/items/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isPalletItemAddSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "server",
        message: parseErrorBody(json),
        status: 200,
      },
    };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isPalletItemAddSuccessBody(v: unknown): v is PalletItemAddSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (typeof v.pallet_code !== "string") return false;
  if (typeof v.part_no !== "string") return false;
  if (typeof v.quantity_added !== "number") return false;
  return true;
}

export async function postPalletItemOut(
  body: PalletItemOutPayload,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: PalletItemOutSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/pallets/items/out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isPalletItemOutSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "server",
        message: parseErrorBody(json),
        status: 200,
      },
    };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isPalletItemOutSuccessBody(v: unknown): v is PalletItemOutSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (!isRecord(v.transaction)) return false;
  return true;
}

export async function postPalletMove(
  body: PalletMovePayload,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: PalletMoveSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/pallets/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isPalletMoveSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "server",
        message: parseErrorBody(json),
        status: 200,
      },
    };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isPalletMoveSuccessBody(v: unknown): v is PalletMoveSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (!isRecord(v.transaction)) return false;
  return true;
}

export async function postPalletOut(
  body: PalletOutPayload,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: PalletOutSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/pallets/out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isPalletOutSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "server",
        message: parseErrorBody(json),
        status: 200,
      },
    };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isPalletOutSuccessBody(v: unknown): v is PalletOutSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (!isRecord(v.transaction)) return false;
  return true;
}

export async function searchActivePalletsByPartNo(
  params: {
    warehouseCode: string;
    projectNo?: string;
    partNo: string;
  },
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: PalletSearchSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  const query = new URLSearchParams({
    warehouse_code: params.warehouseCode,
    status: "ACTIVE",
    part_no: params.partNo,
  });
  if (params.projectNo?.trim()) {
    query.set("project_no", params.projectNo.trim());
  }

  let res: Response;
  try {
    res = await fetch(`${base}/pallets/search?${query.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isPalletSearchSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "品番棚検索結果の形式が想定と異なります。",
        status: 200,
      },
    };
  }

  if (res.status === 400) {
    return {
      ok: false,
      error: {
        kind: "validation",
        message: parseErrorBody(json),
        status: 400,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isPalletSearchSuccessBody(v: unknown): v is PalletSearchSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (!Array.isArray(v.pallets)) return false;
  return v.pallets.every(isPalletSearchRow);
}

function isPalletSearchRow(v: unknown): v is PalletSearchRow {
  if (!isRecord(v)) return false;
  return (
    typeof v.pallet_id === "string" &&
    typeof v.pallet_code === "string" &&
    typeof v.warehouse_code === "string"
  );
}

export async function getEmptyPallets(
  warehouseCode: string,
  projectNo?: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<
  | { ok: true; status: 200; data: EmptyPalletsSuccessBody }
  | { ok: false; error: ScanApiError }
> {
  const base = getScanApiBaseUrl();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (options?.signal) {
    linkAbort(options.signal, controller);
  }

  const query = new URLSearchParams({
    warehouse_code: warehouseCode,
  });
  if (projectNo?.trim()) {
    query.set("project_no", projectNo.trim());
  }

  let res: Response;
  try {
    res = await fetch(`${base}/pallets/empty?${query.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          kind: "timeout",
          message: "API通信タイムアウト",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "network",
        message: "ネットワークに接続できません。API の起動を確認してください。",
      },
    };
  }
  clearTimeout(timeoutId);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "サーバーから JSON 以外の応答が返りました。",
        status: res.status,
      },
    };
  }

  if (res.status === 200) {
    if (isEmptyPalletsSuccessBody(json)) {
      return { ok: true, status: 200, data: json };
    }
    return {
      ok: false,
      error: {
        kind: "parse",
        message: "空パレット検索結果の形式が想定と異なります。",
        status: 200,
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: res.status >= 500 ? "server" : "unknown",
      message: parseErrorBody(json),
      status: res.status,
    },
  };
}

function isEmptyPalletsSuccessBody(v: unknown): v is EmptyPalletsSuccessBody {
  if (!isRecord(v)) return false;
  if (v.ok !== true) return false;
  if (!Array.isArray(v.pallets)) return false;
  return v.pallets.every(isEmptyPalletRow);
}

function isEmptyPalletRow(v: unknown): v is EmptyPalletRow {
  if (!isRecord(v)) return false;
  return (
    typeof v.pallet_id === "string" &&
    typeof v.pallet_code === "string" &&
    typeof v.warehouse_code === "string"
  );
}

export type { ScanHttpPostScansSuccessBody };
