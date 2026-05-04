import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireFieldWriteRole } from "../_shared/fieldWriteGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type AddPalletItemResult = {
  ok?: boolean;
  pallet_code?: string;
  part_no?: string;
  quantity_added?: number;
  error?: string;
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

function errorStatus(error: string | undefined): number {
  if (error === "quantity_must_be_positive") return 400;
  if (error === "pallet_not_found") return 400;
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

    const palletCode = stringOrNull(body.pallet_code);
    const partNo = stringOrNull(body.part_no);
    const quantity = positiveNumberOrNull(body.quantity);
    const projectNo = stringOrNull(body.project_no) ?? guard.warehouseCode;

    if (!palletCode) {
      return jsonResponse({ ok: false, error: "pallet_code is required" }, 400);
    }
    if (!partNo) {
      return jsonResponse({ ok: false, error: "part_no is required" }, 400);
    }
    if (quantity === null) {
      return jsonResponse({ ok: false, error: "quantity must be positive" }, 400);
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data: result, error } = await supabase.rpc("add_pallet_item", {
      p_pallet_code: palletCode,
      p_part_no: partNo,
      p_quantity: quantity,
      p_warehouse_code: guard.warehouseCode,
      p_quantity_unit: stringOrNull(body.quantity_unit) ?? "pcs",
      p_created_by: guard.userId,
      p_remarks: stringOrNull(body.remarks),
      p_project_no: projectNo,
    });

    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500);
    }

    const addResult = result as AddPalletItemResult;
    if (addResult.ok !== true) {
      return jsonResponse(
        { ok: false, error: addResult.error ?? "failed to add pallet item" },
        errorStatus(addResult.error)
      );
    }

    return jsonResponse(addResult);
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
