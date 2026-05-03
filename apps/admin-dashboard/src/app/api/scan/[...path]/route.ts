import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowedRoles = new Set(["admin", "chief", "office"]);
const scanApiBaseUrl =
  process.env.ADMIN_DASHBOARD_SCAN_API_BASE_URL?.trim() || "http://localhost:3040";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

type GuardResult =
  | { ok: true; token: string; warehouseCode: string }
  | { ok: false; status: 401 | 403; error: string };

function unauthorized(): GuardResult {
  return { ok: false, status: 401, error: "unauthorized" };
}

function forbidden(error = "forbidden"): GuardResult {
  return { ok: false, status: 403, error };
}

function extractBearerToken(req: NextRequest): string | null {
  const raw = req.headers.get("authorization");
  if (!raw) return null;
  const match = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return match?.[1] ?? null;
}

async function requireAdminDashboardRole(req: NextRequest): Promise<GuardResult> {
  const token = extractBearerToken(req);
  if (!token) return unauthorized();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return unauthorized();

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return unauthorized();

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id, role, is_active, warehouse_code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) return forbidden();
  if (!profile) return forbidden("profile_not_found");
  if (profile.user_id !== user.id) return forbidden();
  if (profile.is_active !== true) return forbidden("user_inactive");
  if (typeof profile.role !== "string" || !allowedRoles.has(profile.role)) {
    return forbidden();
  }

  const warehouseCode =
    typeof profile.warehouse_code === "string" ? profile.warehouse_code.trim() : "";
  if (!warehouseCode) return forbidden();

  return { ok: true, token, warehouseCode };
}

async function proxyScanApi(req: NextRequest, context: RouteContext) {
  const guard = await requireAdminDashboardRole(req);
  if (!guard.ok) {
    return NextResponse.json(
      { ok: false, error: guard.error },
      { status: guard.status }
    );
  }

  const { path } = await context.params;
  const incomingUrl = new URL(req.url);
  const upstreamUrl = new URL(
    path.map(encodeURIComponent).join("/"),
    `${scanApiBaseUrl.replace(/\/$/, "")}/`
  );
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("authorization", `Bearer ${guard.token}`);
  headers.set("x-warehouse-code", guard.warehouseCode);

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body,
  });

  const resHeaders = new Headers();
  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    resHeaders.set("content-type", upstreamContentType);
  }

  return new NextResponse(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(req: NextRequest, context: RouteContext) {
  return proxyScanApi(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return proxyScanApi(req, context);
}
