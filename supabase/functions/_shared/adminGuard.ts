import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2";

export type AdminRole = "admin" | "chief" | "office";

export type AdminGuardProfile = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  warehouse_code: string | null;
  is_active: boolean;
};

export type AdminGuardSuccess = {
  ok: true;
  user: User;
  profile: AdminGuardProfile;
  role: AdminRole;
  warehouseCode: string;
};

export type AdminGuardFailure = {
  ok: false;
  status: 401 | 403;
  body: { ok: false; error: "unauthorized" | "forbidden" };
};

export type AdminGuardResult = AdminGuardSuccess | AdminGuardFailure;

const ALLOWED_ROLES = new Set<AdminRole>(["admin", "chief", "office"]);

function unauthorized(): AdminGuardFailure {
  return { ok: false, status: 401, body: { ok: false, error: "unauthorized" } };
}

function forbidden(): AdminGuardFailure {
  return { ok: false, status: 403, body: { ok: false, error: "forbidden" } };
}

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return match?.[1] ?? null;
}

function isAdminRole(role: string): role is AdminRole {
  return ALLOWED_ROLES.has(role as AdminRole);
}

function createSupabaseClient(token: string): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY is required");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * admin-dashboard / scan-app の軽量 Edge Function 用共通guard。
 *
 * default deny:
 * - 未ログイン / JWT不正: 401
 * - profile未取得 / inactive / worker / role不明 / warehouse_codeなし: 403
 */
export async function requireAdminRole(req: Request): Promise<AdminGuardResult> {
  const token = extractBearerToken(req);
  if (!token) return unauthorized();

  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseClient(token);
  } catch {
    return unauthorized();
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) return unauthorized();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, email, display_name, role, warehouse_code, is_active")
    .eq("user_id", user.id)
    .maybeSingle<AdminGuardProfile>();

  if (profileError || !profile) return forbidden();
  if (profile.user_id !== user.id) return forbidden();
  if (profile.is_active !== true) return forbidden();
  if (typeof profile.role !== "string" || !isAdminRole(profile.role)) {
    return forbidden();
  }

  const warehouseCode =
    typeof profile.warehouse_code === "string" ? profile.warehouse_code.trim() : "";
  if (!warehouseCode) return forbidden();

  return {
    ok: true,
    user,
    profile,
    role: profile.role,
    warehouseCode,
  };
}
