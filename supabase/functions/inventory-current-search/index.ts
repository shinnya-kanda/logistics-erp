import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type InventoryCurrentRow = {
  id: string;
  part_no: string;
  part_name: string | null;
  warehouse_code: string;
  location_code: string;
  inventory_type: string;
  project_no: string | null;
  mrp_key: string | null;
  pallet_id: string | null;
  quantity_on_hand: string | number;
  quantity_unit: string;
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

    const url = new URL(req.url);
    const partNo = url.searchParams.get("part_no")?.trim() || null;
    const locationCode = url.searchParams.get("location_code")?.trim() || null;
    const projectNo = url.searchParams.get("project_no")?.trim() || null;
    const inventoryType = url.searchParams.get("inventory_type")?.trim() || null;

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    let query = supabase
      .from("inventory_current")
      .select(
        "id, part_no, part_name, warehouse_code, location_code, inventory_type, project_no, mrp_key, pallet_id, quantity_on_hand, quantity_unit, updated_at"
      )
      .eq("warehouse_code", guard.warehouseCode)
      .order("part_no", { ascending: true })
      .order("location_code", { ascending: true })
      .limit(500);

    if (partNo) {
      query = query.ilike("part_no", `%${partNo}%`);
    }
    if (locationCode) {
      query = query.ilike("location_code", `%${locationCode}%`);
    }
    if (projectNo) {
      query = query.eq("project_no", projectNo);
    }
    if (inventoryType) {
      query = query.eq("inventory_type", inventoryType);
    }

    const { data, error } = await query.returns<InventoryCurrentRow[]>();
    if (error) {
      return jsonResponse({ ok: false, error: "failed_to_search_inventory_current" }, 500);
    }

    return jsonResponse({ ok: true, items: data ?? [] });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
