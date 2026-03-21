import type { ScanHttpPostScansSuccessBody } from "@logistics-erp/schema";
import type { ScanInputPayload } from "@logistics-erp/schema";
import { getScanApiBaseUrl } from "./config.js";

const DEFAULT_TIMEOUT_MS = 15_000;

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

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function parseErrorBody(json: unknown): string {
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

export type { ScanHttpPostScansSuccessBody };
