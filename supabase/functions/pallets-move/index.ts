import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireFieldWriteRole } from "../_shared/fieldWriteGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type MovePalletResult = {
  ok?: boolean;
  transaction?: Record<string, unknown>;
  error?: string;
  message?: string;
  occupied_pallet_code?: string;
};

type PalletLookup = {
  project_no: string | null;
  current_location_code: string | null;
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
  if (
    error === "pallet_code_required" ||
    error === "to_location_code_required" ||
    error === "warehouse_code_required" ||
    error === "pallet_not_found" ||
    error === "pallet_already_out" ||
    error === "location_already_occupied"
  ) {
    return 400;
  }
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
    const toLocationCode = stringOrNull(body.to_location_code);
    const idempotencyKey = stringOrNull(body.idempotency_key);

    if (!palletCode) {
      return jsonResponse({ ok: false, error: "pallet_code is required" }, 400);
    }
    if (!toLocationCode) {
      return jsonResponse({ ok: false, error: "to_location_code is required" }, 400);
    }
    if (!idempotencyKey) {
      return jsonResponse({ ok: false, error: "idempotency_key is required" }, 400);
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const { data: pallet, error: palletError } = await supabase
      .from("pallet_units")
      .select("project_no, current_location_code")
      .eq("warehouse_code", guard.warehouseCode)
      .eq("pallet_code", palletCode)
      .maybeSingle<PalletLookup>();

    if (palletError) {
      return jsonResponse({ ok: false, error: palletError.message }, 500);
    }
    if (!pallet) {
      return jsonResponse({ ok: false, error: "pallet_not_found" }, 404);
    }
    if (pallet.current_location_code && pallet.current_location_code === toLocationCode) {
      return jsonResponse(
        { ok: false, error: "from_location_code and to_location_code must differ" },
        400
      );
    }

    const { data: result, error } = await supabase.rpc("move_pallet", {
      p_pallet_code: palletCode,
      p_to_location_code: toLocationCode,
      p_warehouse_code: guard.warehouseCode,
      p_operator_id: guard.userId,
      p_operator_name: stringOrNull(body.operator_name),
      p_remarks: stringOrNull(body.remarks),
      p_idempotency_key: idempotencyKey,
      p_project_no: pallet.project_no,
    });

    if (error) {
      return jsonResponse({ ok: false, error: error.message }, 500);
    }

    const moveResult = result as MovePalletResult;
    if (moveResult.ok !== true) {
      const errorCode = moveResult.error ?? "failed to move pallet";
      return jsonResponse(
        {
          ok: false,
          error: errorCode,
          ...(errorCode === "location_already_occupied"
            ? { message: "この棚はすでに別のパレットで使用中です" }
            : {}),
          ...(moveResult.occupied_pallet_code
            ? { occupied_pallet_code: moveResult.occupied_pallet_code }
            : {}),
        },
        errorStatus(moveResult.error)
      );
    }

    return jsonResponse(moveResult);
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
