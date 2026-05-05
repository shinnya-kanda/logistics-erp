import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireFieldWriteRole } from "../_shared/fieldWriteGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type WarehouseLocationRow = {
  location_code: string;
  is_active: boolean | null;
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

async function readLocationCode(req: Request): Promise<string | null> {
  const urlLocationCode = new URL(req.url).searchParams.get("location_code")?.trim();
  if (urlLocationCode) return urlLocationCode;

  if (req.method !== "POST") return null;

  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) return null;
    return stringOrNull(body.location_code);
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const guard = await requireFieldWriteRole(req);
    if (guard instanceof Response) {
      return guard;
    }

    const locationCode = await readLocationCode(req);
    if (!locationCode) {
      return jsonResponse({ ok: false, error: "location_code is required" }, 400);
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data, error } = await supabase
      .from("warehouse_locations")
      .select("location_code, is_active")
      .eq("warehouse_code", guard.warehouseCode)
      .eq("location_code", locationCode)
      .maybeSingle<WarehouseLocationRow>();

    if (error) {
      return jsonResponse({ ok: false, error: "failed_to_check_location" }, 500);
    }

    if (!data) {
      return jsonResponse({ ok: true, exists: false });
    }

    return jsonResponse({
      ok: true,
      exists: true,
      location_code: data.location_code,
      active: data.is_active === true,
    });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
