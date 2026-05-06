import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type WarehouseLocationRow = {
  id: string;
  warehouse_code: string;
  location_code: string;
  is_active: boolean;
  remarks: string | null;
  updated_at: string | null;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY is required");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function booleanOrNull(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const guard = await adminGuard(req);
    if (!guard.ok) {
      return jsonResponse(guard.body, guard.status);
    }
    if (guard.role !== "admin" && guard.role !== "chief") {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
    }

    if (!isRecord(body)) {
      return jsonResponse({ ok: false, error: "request body must be an object" }, 400);
    }

    const locationCode = stringOrNull(body.location_code);
    const isActive = booleanOrNull(body.is_active);

    if (!locationCode) {
      return jsonResponse({ ok: false, error: "location_code is required" }, 400);
    }
    if (isActive === null) {
      return jsonResponse({ ok: false, error: "is_active must be true or false" }, 400);
    }

    const traceId = crypto.randomUUID();

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data: result, error: rpcError } = await supabase.rpc(
      "update_warehouse_location_active_with_history",
      {
        p_warehouse_code: guard.warehouseCode,
        p_location_code: locationCode,
        p_is_active: isActive,
        p_operator_id: guard.user.id,
        p_operator_role: guard.role,
        p_trace_id: traceId,
      }
    );

    if (rpcError || !isRecord(result)) {
      return jsonResponse({ ok: false, error: "failed to update warehouse location active" }, 500);
    }

    if (result.ok !== true) {
      const error = typeof result.error === "string"
        ? result.error
        : "failed to update warehouse location active";
      const status = error === "location_not_found" ? 404 : 500;
      return jsonResponse({ ok: false, error }, status);
    }

    if (!isRecord(result.location)) {
      return jsonResponse({ ok: false, error: "failed to update warehouse location active" }, 500);
    }

    return jsonResponse({
      ok: true,
      location: result.location as WarehouseLocationRow,
      trace_id: traceId,
    });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
