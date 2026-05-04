import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type PalletLocationRow = {
  warehouse_code: string;
  current_location_code: string | null;
};

type WarehouseLocationRow = {
  location_code: string;
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const guard = await adminGuard(req);
    if (!guard.ok) {
      return jsonResponse(guard.body, guard.status);
    }
    if (guard.role !== "admin") {
      return jsonResponse({ ok: false, error: "forbidden" }, 403);
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data: palletRows, error: palletError } = await supabase
      .from("pallet_units")
      .select("warehouse_code, current_location_code")
      .eq("warehouse_code", guard.warehouseCode)
      .not("current_location_code", "is", null)
      .limit(5000)
      .returns<PalletLocationRow[]>();

    if (palletError) {
      return jsonResponse(
        { ok: false, error: "failed to get unregistered warehouse locations" },
        500
      );
    }

    const { data: locationRows, error: locationError } = await supabase
      .from("warehouse_locations")
      .select("location_code")
      .eq("warehouse_code", guard.warehouseCode)
      .returns<WarehouseLocationRow[]>();

    if (locationError) {
      return jsonResponse(
        { ok: false, error: "failed to get unregistered warehouse locations" },
        500
      );
    }

    const registeredCodes = new Set(
      (locationRows ?? []).map((row) => row.location_code)
    );
    const usageByLocation = new Map<string, number>();

    for (const row of palletRows ?? []) {
      const locationCode = row.current_location_code?.trim();
      if (!locationCode || registeredCodes.has(locationCode)) continue;
      usageByLocation.set(locationCode, (usageByLocation.get(locationCode) ?? 0) + 1);
    }

    const locations = Array.from(usageByLocation.entries())
      .map(([locationCode, usageCount]) => ({
        warehouse_code: guard.warehouseCode,
        location_code: locationCode,
        usage_count: usageCount,
      }))
      .sort((a, b) => {
        if (b.usage_count !== a.usage_count) return b.usage_count - a.usage_count;
        return a.location_code.localeCompare(b.location_code, "ja");
      });

    return jsonResponse({ ok: true, locations });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
