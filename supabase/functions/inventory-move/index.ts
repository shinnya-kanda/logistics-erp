import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireFieldWriteRole } from "../_shared/fieldWriteGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
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

function positiveNumberOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function errorStatus(code: string | undefined): number {
  if (code === "23514" || code === "check_violation") return 400;
  return 500;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const guard = await requireFieldWriteRole(req);
    if (guard instanceof Response) {
      return guard;
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

    const partNo = stringOrNull(body.part_no);
    const quantity = positiveNumberOrNull(body.quantity);
    const fromLocationCode = stringOrNull(body.from_location_code);
    const toLocationCode = stringOrNull(body.to_location_code);
    const idempotencyKey = stringOrNull(body.idempotency_key);

    if (!partNo) {
      return jsonResponse({ ok: false, error: "part_no is required" }, 400);
    }
    if (quantity === null) {
      return jsonResponse({ ok: false, error: "quantity must be positive" }, 400);
    }
    if (!fromLocationCode) {
      return jsonResponse({ ok: false, error: "from_location_code is required" }, 400);
    }
    if (!toLocationCode) {
      return jsonResponse({ ok: false, error: "to_location_code is required" }, 400);
    }
    if (fromLocationCode === toLocationCode) {
      return jsonResponse(
        { ok: false, error: "from_location_code and to_location_code must differ" },
        400
      );
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data: result, error } = await supabase.rpc("create_inventory_move", {
      p_part_no: partNo,
      p_quantity: quantity,
      p_warehouse_code: guard.warehouseCode,
      p_from_location_code: fromLocationCode,
      p_to_location_code: toLocationCode,
      p_idempotency_key: idempotencyKey,
      p_inventory_type: stringOrNull(body.inventory_type) ?? "project",
      p_project_no: stringOrNull(body.project_no),
      p_mrp_key: stringOrNull(body.mrp_key),
      p_quantity_unit: stringOrNull(body.quantity_unit),
      p_event_at: new Date().toISOString(),
      p_operator_id: guard.userId,
      p_operator_name: stringOrNull(body.operator_name),
      p_remarks: stringOrNull(body.remarks),
    });

    if (error) {
      return jsonResponse(
        { ok: false, error: error.message ?? "failed to create inventory move" },
        errorStatus(error.code)
      );
    }

    return jsonResponse(result ?? { ok: true, move: null });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
