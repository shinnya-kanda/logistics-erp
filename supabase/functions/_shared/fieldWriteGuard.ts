import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2";

export type FieldWriteRole = "admin" | "chief" | "worker";

export type FieldWriteProfile = {
  user_id: string;
  role: string | null;
  warehouse_code: string | null;
  is_active: boolean;
};

export type FieldWriteAuthContext = {
  userId: string;
  role: FieldWriteRole;
  warehouseCode: string;
};

export type FieldWriteGuardResult =
  | FieldWriteAuthContext
  | Response;

const ALLOWED_ROLES = new Set<FieldWriteRole>(["admin", "chief", "worker"]);

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return match?.[1] ?? null;
}

function isFieldWriteRole(role: string): role is FieldWriteRole {
  return ALLOWED_ROLES.has(role as FieldWriteRole);
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
 * 現場書き込み系 Edge Function 用guard。
 *
 * 許可: admin / chief / worker
 * 拒否: office / profileなし / inactive / role不明 / warehouse_codeなし
 */
export async function requireFieldWriteRole(
  req: Request
): Promise<FieldWriteGuardResult> {
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

  try {
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, role, warehouse_code, is_active")
      .eq("user_id", user.id)
      .maybeSingle<FieldWriteProfile>();

    if (profileError || !profile) {
      return forbidden("profile_not_found");
    }
    if (profile.user_id !== user.id) {
      return forbidden("forbidden");
    }
    if (profile.is_active !== true) {
      return forbidden("user_inactive");
    }
    if (typeof profile.role !== "string" || !profile.role.trim()) {
      return forbidden("role_not_found");
    }
    if (!isFieldWriteRole(profile.role)) {
      return forbidden("forbidden");
    }

    const warehouseCode =
      typeof profile.warehouse_code === "string"
        ? profile.warehouse_code.trim()
        : "";
    if (!warehouseCode) {
      return forbidden("warehouse_code_not_found");
    }

    return {
      userId: user.id,
      role: profile.role,
      warehouseCode,
    };
  } catch {
    return forbidden("forbidden");
  }
}
