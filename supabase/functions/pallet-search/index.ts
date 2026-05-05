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

type PalletItemLinkRow = {
  pallet_id: string;
  part_no: string | null;
  part_name: string | null;
  quantity: string | number | null;
  quantity_unit: string | null;
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
    const projectNo = url.searchParams.get("project_no")?.trim() || null;
    const partNo = url.searchParams.get("part_no")?.trim() || null;
    const palletCode = url.searchParams.get("pallet_code")?.trim() || null;
    const rawStatus = url.searchParams.get("status")?.trim().toUpperCase();
    const status = rawStatus && rawStatus !== "ALL" ? rawStatus : null;

    if (status !== null && status !== "ACTIVE" && status !== "OUT") {
      return jsonResponse({ ok: false, error: "status must be ACTIVE or OUT" }, 400);
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
      .order("current_location_code", { ascending: true, nullsFirst: false })
      .order("pallet_code", { ascending: true })
      .limit(200);

    if (projectNo) {
      palletQuery = palletQuery.eq("project_no", projectNo);
    }
    if (status) {
      palletQuery = palletQuery.eq("current_status", status);
    }
    if (palletCode) {
      palletQuery = palletQuery.ilike("pallet_code", `%${palletCode}%`);
    }

    const { data: palletRows, error: palletError } =
      await palletQuery.returns<PalletUnitRow[]>();
    if (palletError) {
      return jsonResponse({ ok: false, error: "failed_to_search_pallets" }, 500);
    }

    const pallets = palletRows ?? [];
    if (pallets.length === 0) {
      return jsonResponse({ ok: true, pallets: [] });
    }

    let linkQuery = supabase
      .from("pallet_item_links")
      .select("pallet_id, part_no, part_name, quantity, quantity_unit, updated_at")
      .in(
        "pallet_id",
        pallets.map((row) => row.id)
      )
      .order("part_no", { ascending: true, nullsFirst: false });

    if (partNo) {
      linkQuery = linkQuery.ilike("part_no", `%${partNo}%`);
    }

    const { data: linkRows, error: linkError } =
      await linkQuery.returns<PalletItemLinkRow[]>();
    if (linkError) {
      return jsonResponse({ ok: false, error: "failed_to_search_pallets" }, 500);
    }

    const linksByPalletId = new Map<string, PalletItemLinkRow[]>();
    for (const link of linkRows ?? []) {
      const links = linksByPalletId.get(link.pallet_id) ?? [];
      links.push(link);
      linksByPalletId.set(link.pallet_id, links);
    }

    const rows = pallets.flatMap((pallet) => {
      const links = linksByPalletId.get(pallet.id) ?? [];
      if (partNo && links.length === 0) return [];
      if (links.length === 0) {
        return [
          {
            pallet_id: pallet.id,
            pallet_code: pallet.pallet_code,
            warehouse_code: pallet.warehouse_code,
            project_no: pallet.project_no,
            current_location_code: pallet.current_location_code,
            current_status: pallet.current_status,
            part_no: null,
            part_name: null,
            quantity: null,
            quantity_unit: null,
            updated_at: pallet.updated_at ?? pallet.created_at,
          },
        ];
      }

      return links.map((link) => ({
        pallet_id: pallet.id,
        pallet_code: pallet.pallet_code,
        warehouse_code: pallet.warehouse_code,
        project_no: pallet.project_no,
        current_location_code: pallet.current_location_code,
        current_status: pallet.current_status,
        part_no: link.part_no,
        part_name: link.part_name,
        quantity: link.quantity,
        quantity_unit: link.quantity_unit,
        updated_at: link.updated_at ?? pallet.updated_at ?? pallet.created_at,
      }));
    });

    return jsonResponse({ ok: true, pallets: rows });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
