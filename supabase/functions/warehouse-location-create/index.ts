import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function booleanOrDefault(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
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
    if (guard.role !== "admin") {
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
    const locationName = stringOrNull(body.location_name);
    const remarks = stringOrNull(body.remarks);
    const isActive = booleanOrDefault(body.is_active, true);

    if (!locationCode) {
      return jsonResponse({ ok: false, error: "location_code is required" }, 400);
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const selectColumns =
      "id, warehouse_code, location_code, is_active, remarks, updated_at";

    const { data: existing, error: existingError } = await supabase
      .from("warehouse_locations")
      .select(selectColumns)
      .eq("warehouse_code", guard.warehouseCode)
      .eq("location_code", locationCode)
      .maybeSingle<WarehouseLocationRow>();

    if (existingError) {
      return jsonResponse({ ok: false, error: "failed to create warehouse location" }, 500);
    }
    if (existing) {
      return jsonResponse({ ok: true, location: existing, created: false });
    }

    const { data: inserted, error: insertError } = await supabase
      .from("warehouse_locations")
      .insert({
        warehouse_code: guard.warehouseCode,
        location_code: locationCode,
        location_name: locationName,
        is_active: isActive,
        remarks,
        updated_at: new Date().toISOString(),
      })
      .select(selectColumns)
      .single<WarehouseLocationRow>();

    if (insertError) {
      const { data: racedExisting } = await supabase
        .from("warehouse_locations")
        .select(selectColumns)
        .eq("warehouse_code", guard.warehouseCode)
        .eq("location_code", locationCode)
        .maybeSingle<WarehouseLocationRow>();

      if (racedExisting) {
        return jsonResponse({ ok: true, location: racedExisting, created: false });
      }

      return jsonResponse({ ok: false, error: "failed to create warehouse location" }, 500);
    }

    return jsonResponse({ ok: true, location: inserted, created: true });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
