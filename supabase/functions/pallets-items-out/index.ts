import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireFieldWriteRole } from "../_shared/fieldWriteGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type PalletItemCandidate = {
  pallet_item_id: string;
  pallet_code: string;
  project_no: string | null;
  location_code: string | null;
  quantity: number | string;
};

type OutPalletItemResult = {
  ok?: boolean;
  transaction?: Record<string, unknown>;
  part_no?: string;
  quantity_out?: string | number;
  remaining_quantity?: string | number;
  idempotency_hit?: boolean;
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

function normalizePartNo(v: string): string {
  return v.trim().toUpperCase();
}

function errorStatus(error: string | undefined): number {
  if (
    error === "item_not_found" ||
    error === "insufficient_quantity" ||
    error === "pallet_code_required" ||
    error === "part_no_required" ||
    error === "quantity_must_be_positive" ||
    error === "pallet_not_found" ||
    error === "pallet_already_out" ||
    error === "pallet_item_not_found"
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
    const partNo = stringOrNull(body.part_no);
    const quantity = positiveNumberOrNull(body.quantity);
    const selectedPalletItemId = stringOrNull(body.selected_pallet_item_id);
    const idempotencyKey = stringOrNull(body.idempotency_key);

    if (!partNo) {
      return jsonResponse({ ok: false, error: "part_no is required" }, 400);
    }
    if (quantity === null) {
      return jsonResponse({ ok: false, error: "quantity must be positive" }, 400);
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

    let query = supabase
      .from("pallet_item_links")
      .select(
        "id, part_no, quantity, project_no, pallet_units!inner(pallet_code, warehouse_code, project_no, current_location_code, current_status)"
      )
      .eq("part_no", normalizePartNo(partNo))
      .eq("warehouse_code", guard.warehouseCode)
      .is("unlinked_at", null)
      .gt("quantity", 0)
      .eq("pallet_units.warehouse_code", guard.warehouseCode)
      .neq("pallet_units.current_status", "OUT");

    if (palletCode) {
      query = query.eq("pallet_units.pallet_code", palletCode);
    }
    if (selectedPalletItemId) {
      query = query.eq("id", selectedPalletItemId);
    }

    const { data: rows, error: searchError } = await query;
    if (searchError) {
      return jsonResponse({ ok: false, error: searchError.message }, 500);
    }

    const candidates = (rows ?? []).map((row) => {
      const unit = Array.isArray(row.pallet_units) ? row.pallet_units[0] : row.pallet_units;
      return {
        pallet_item_id: row.id,
        pallet_code: unit?.pallet_code ?? "",
        project_no: row.project_no ?? unit?.project_no ?? null,
        location_code: unit?.current_location_code ?? null,
        quantity: row.quantity,
      };
    }) as PalletItemCandidate[];

    if (candidates.length === 0) {
      return jsonResponse({ ok: false, error: "item_not_found" }, 400);
    }
    if (!selectedPalletItemId && !palletCode && candidates.length > 1) {
      return jsonResponse({ ok: false, requires_selection: true, candidates }, 200);
    }

    const selected = candidates[0];
    const selectedQuantity =
      typeof selected.quantity === "number" ? selected.quantity : Number(selected.quantity);
    if (!Number.isFinite(selectedQuantity) || selectedQuantity < quantity) {
      return jsonResponse({ ok: false, error: "insufficient_quantity" }, 400);
    }

    const { data: result, error } = await supabase.rpc("out_pallet_item", {
      p_pallet_code: selected.pallet_code,
      p_part_no: normalizePartNo(partNo),
      p_quantity: quantity,
      p_warehouse_code: guard.warehouseCode,
      p_operator_id: guard.userId,
      p_operator_name: stringOrNull(body.operator_name),
      p_remarks: stringOrNull(body.remarks),
      p_idempotency_key: idempotencyKey,
      p_project_no: selected.project_no,
    });

    if (error) {
      const message =
        error.message === "insufficient_pallet_item_quantity"
          ? "insufficient_quantity"
          : error.message;
      return jsonResponse({ ok: false, error: message }, errorStatus(message));
    }

    const outResult = result as OutPalletItemResult;
    if (outResult.ok !== true) {
      const errorCode =
        outResult.error === "pallet_item_not_found"
          ? "item_not_found"
          : outResult.error ?? "failed to out pallet item";
      return jsonResponse({ ok: false, error: errorCode }, errorStatus(errorCode));
    }

    return jsonResponse(outResult);
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
