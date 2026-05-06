import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireFieldWriteRole } from "../_shared/fieldWriteGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type CreatePalletResult = {
  ok?: boolean;
  pallet_id?: string;
  pallet_code?: string;
  created?: boolean;
  trace_id?: string;
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

function errorStatus(error: string | undefined): number {
  if (error === "pallet_code_already_exists") return 400;
  if (error === "location_already_occupied") return 400;
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
    const warehouseCode = guard.warehouseCode;

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
    const projectNo = stringOrNull(body.project_no) ?? warehouseCode;
    const currentLocationCode =
      stringOrNull(body.current_location_code) ?? stringOrNull(body.location_code);

    if (!palletCode) {
      return jsonResponse({ ok: false, error: "pallet_code is required" }, 400);
    }

    const traceId = crypto.randomUUID();

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data: result, error } = await supabase.rpc("create_pallet", {
      p_pallet_code: palletCode,
      p_warehouse_code: warehouseCode,
      p_created_by: stringOrNull(body.created_by) ?? guard.userId,
      p_remarks: stringOrNull(body.remarks),
      p_inventory_type: stringOrNull(body.inventory_type) ?? "project",
      p_project_no: projectNo,
      p_current_location_code: currentLocationCode,
      p_trace_id: traceId,
    });

    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500);
    }

    const createResult = result as CreatePalletResult;
    if (createResult.ok !== true) {
      const errorCode = createResult.error ?? "failed to create pallet";
      return jsonResponse(
        {
          ok: false,
          error: errorCode,
          ...(errorCode === "pallet_code_already_exists"
            ? { message: "このPLコードはすでに登録されています" }
            : {}),
          ...(errorCode === "location_already_occupied"
            ? { message: "この棚はすでに別のパレットで使用中です" }
            : {}),
        },
        errorStatus(createResult.error)
      );
    }

    const { data: pallet, error: palletError } = await supabase
      .from("pallet_units")
      .select("*")
      .eq("warehouse_code", warehouseCode)
      .eq("pallet_code", createResult.pallet_code ?? palletCode)
      .maybeSingle();

    if (palletError || !pallet) {
      return jsonResponse({ ok: false, error: "failed to load created pallet" }, 500);
    }

    return jsonResponse({
      ok: true,
      pallet,
      pallet_id: createResult.pallet_id ?? pallet.id,
      pallet_code: createResult.pallet_code ?? pallet.pallet_code,
      created: createResult.created === true,
      trace_id: traceId,
    });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
