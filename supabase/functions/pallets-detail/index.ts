import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type PalletUnitRow = {
  id: string;
  pallet_code: string;
  warehouse_code: string;
  project_no: string | null;
  current_location_code: string | null;
  current_status: string | null;
  created_at: string | null;
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

async function readInput(req: Request): Promise<{ palletCode: string | null; palletId: string | null }> {
  const url = new URL(req.url);
  const queryPalletCode = url.searchParams.get("pallet_code")?.trim() || null;
  const queryPalletId = url.searchParams.get("pallet_id")?.trim() || null;

  if (req.method !== "POST") {
    return { palletCode: queryPalletCode, palletId: queryPalletId };
  }

  const body: unknown = await req.json().catch(() => ({}));
  if (!isRecord(body)) {
    return { palletCode: queryPalletCode, palletId: queryPalletId };
  }

  return {
    palletCode: stringOrNull(body.pallet_code) ?? queryPalletCode,
    palletId: stringOrNull(body.pallet_id) ?? queryPalletId,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST" && req.method !== "GET") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const guard = await adminGuard(req);
    if (!guard.ok) {
      return jsonResponse(guard.body, guard.status);
    }

    const { palletCode, palletId } = await readInput(req);
    if (!palletCode && !palletId) {
      return jsonResponse({ ok: false, error: "pallet_code is required" }, 400);
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    let palletQuery = supabase
      .from("pallet_units")
      .select(
        "id, pallet_code, warehouse_code, project_no, current_location_code, current_status, created_at, updated_at"
      )
      .eq("warehouse_code", guard.warehouseCode)
      .limit(1);

    palletQuery = palletCode
      ? palletQuery.eq("pallet_code", palletCode)
      : palletQuery.eq("id", palletId);

    const { data: palletRow, error: palletError } =
      await palletQuery.maybeSingle<PalletUnitRow>();

    if (palletError) {
      return jsonResponse({ ok: false, error: "failed_to_get_pallet_detail" }, 500);
    }
    if (!palletRow) {
      return jsonResponse({ ok: false, error: "pallet_not_found" }, 404);
    }

    const pallet = {
      pallet_id: palletRow.id,
      pallet_code: palletRow.pallet_code,
      warehouse_code: palletRow.warehouse_code,
      project_no: palletRow.project_no,
      current_location_code: palletRow.current_location_code,
      current_status: palletRow.current_status,
      created_at: palletRow.created_at,
      updated_at: palletRow.updated_at,
    };

    const { data: items, error: itemsError } = await supabase
      .from("pallet_item_links")
      .select("part_no, part_name, quantity, quantity_unit, linked_at, updated_at")
      .eq("pallet_id", palletRow.id)
      .is("unlinked_at", null)
      .order("part_no", { ascending: true, nullsFirst: false });

    if (itemsError) {
      return jsonResponse({ ok: false, error: "failed_to_get_pallet_detail" }, 500);
    }

    const { data: transactions, error: transactionsError } = await supabase
      .from("pallet_transactions")
      .select(
        "transaction_type, from_location_code, to_location_code, operator_name, remarks, idempotency_key, occurred_at"
      )
      .or(`pallet_code.eq.${palletRow.pallet_code},pallet_unit_id.eq.${palletRow.id},pallet_id.eq.${palletRow.id}`)
      .order("occurred_at", { ascending: false });

    if (transactionsError) {
      return jsonResponse({ ok: false, error: "failed_to_get_pallet_detail" }, 500);
    }

    return jsonResponse({
      ok: true,
      pallet,
      items: items ?? [],
      transactions: transactions ?? [],
    });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
