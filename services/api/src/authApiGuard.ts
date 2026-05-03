import type { IncomingMessage } from "node:http";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { requireDatabaseUrl } from "@logistics-erp/db";

export type ApiRole = "admin" | "chief" | "office" | "worker";

export type ApiAuthContext = {
  userId: string;
  email: string | null;
  role: ApiRole;
  warehouseCode: string;
  displayName: string | null;
};

export type ApiGuardResult =
  | { ok: true; auth: ApiAuthContext }
  | { ok: false; status: 401 | 403 | 500; body: unknown };

const API_ROLES: readonly ApiRole[] = ["admin", "chief", "office", "worker"];

function isApiRole(s: string): s is ApiRole {
  return (API_ROLES as readonly string[]).includes(s);
}

export type RequireApiRoleOptions = {
  /** 契約テスト等のみ。本番では使用しないこと。 */
  skip?: boolean;
};

let supabaseAuthClient: SupabaseClient | null = null;

function requireSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getSupabaseAuthClient(): SupabaseClient | null {
  const env = requireSupabaseEnv();
  if (!env) return null;
  if (!supabaseAuthClient) {
    supabaseAuthClient = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseAuthClient;
}

export function extractBearerToken(req: IncomingMessage): string | null {
  const raw = req.headers.authorization;
  if (!raw || typeof raw !== "string") return null;
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return m?.[1]?.trim() || null;
}

/**
 * Bearer JWT を検証し、user_profiles で role を確認する。
 */
export async function requireApiRole(
  req: IncomingMessage,
  allowedRoles: readonly ApiRole[],
  options?: RequireApiRoleOptions
): Promise<ApiGuardResult> {
  if (options?.skip) {
    return {
      ok: true,
      auth: {
        userId: "00000000-0000-0000-0000-000000000001",
        email: "contract-test@local",
        role: "admin",
        warehouseCode: "KOMATSU",
        displayName: null,
      },
    };
  }

  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, status: 401, body: { ok: false, error: "unauthorized" } };
  }

  const supabase = getSupabaseAuthClient();
  if (!supabase) {
    return { ok: false, status: 401, body: { ok: false, error: "unauthorized" } };
  }

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return { ok: false, status: 401, body: { ok: false, error: "unauthorized" } };
  }

  const sql = postgres(requireDatabaseUrl(), { max: 1 });
  try {
    const rows = await sql<
      {
        user_id: string;
        email: string;
        display_name: string | null;
        role: string;
        warehouse_code: string;
        is_active: boolean;
      }[]
    >`
      SELECT user_id, email, display_name, role, warehouse_code, is_active
      FROM public.user_profiles
      WHERE user_id = ${user.id}::uuid
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return { ok: false, status: 403, body: { ok: false, error: "profile_not_found" } };
    }

    if (!row.is_active) {
      return { ok: false, status: 403, body: { ok: false, error: "user_inactive" } };
    }

    if (!isApiRole(row.role)) {
      return { ok: false, status: 403, body: { ok: false, error: "forbidden" } };
    }

    const role = row.role;

    if (!allowedRoles.includes(role)) {
      return { ok: false, status: 403, body: { ok: false, error: "forbidden" } };
    }

    return {
      ok: true,
      auth: {
        userId: user.id,
        email: user.email ?? row.email ?? null,
        role,
        warehouseCode: row.warehouse_code,
        displayName: row.display_name,
      },
    };
  } catch (e) {
    console.error("[authApiGuard] user_profiles lookup", e);
    return {
      ok: false,
      status: 500,
      body: { ok: false, error: "internal_error" },
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
