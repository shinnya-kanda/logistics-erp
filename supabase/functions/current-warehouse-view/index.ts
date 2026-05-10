import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type PalletUnitRow = {
  id: string;
  pallet_code: string;
  warehouse_code: string;
  project_no: string | null;
  current_location_code: string | null;
  current_status: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type PalletItemLinkRow = {
  pallet_id: string;
  part_no: string | null;
  part_name: string | null;
  quantity: string | number | null;
  quantity_unit: string | null;
  project_no: string | null;
  updated_at: string | null;
};

type CurrentWarehouseItem = {
  part_no: string | null;
  part_name: string | null;
  quantity: string | number | null;
  quantity_unit: string | null;
  project_no: string | null;
  updated_at: string | null;
};

type CurrentWarehousePallet = {
  pallet_id: string;
  pallet_code: string;
  project_no: string | null;
  current_status: string | null;
  updated_at: string | null;
  items: CurrentWarehouseItem[];
};

type CurrentWarehouseLocation = {
  location_code: string | null;
  pallets: CurrentWarehousePallet[];
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

function locationSortKey(locationCode: string | null): string {
  return locationCode ?? "\uffff";
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
    const locationCode = url.searchParams.get("location_code")?.trim() || null;
    const palletCode = url.searchParams.get("pallet_code")?.trim() || null;
    const partNo = url.searchParams.get("part_no")?.trim() || null;
    const projectNo = url.searchParams.get("project_no")?.trim() || null;

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    let palletQuery = supabase
      .from("pallet_units")
      .select(
        "id, pallet_code, warehouse_code, project_no, current_location_code, current_status, updated_at, created_at"
      )
      .eq("warehouse_code", guard.warehouseCode)
      .or("current_status.is.null,current_status.neq.OUT")
      .order("current_location_code", { ascending: true, nullsFirst: false })
      .order("pallet_code", { ascending: true })
      .limit(500);

    if (locationCode) {
      palletQuery = palletQuery.ilike("current_location_code", `%${locationCode}%`);
    }
    if (palletCode) {
      palletQuery = palletQuery.ilike("pallet_code", `%${palletCode}%`);
    }
    if (projectNo) {
      palletQuery = palletQuery.eq("project_no", projectNo);
    }

    const { data: palletRows, error: palletError } =
      await palletQuery.returns<PalletUnitRow[]>();
    if (palletError) {
      return jsonResponse({ ok: false, error: "failed_to_search_current_warehouse" }, 500);
    }

    const pallets = palletRows ?? [];
    if (pallets.length === 0) {
      return jsonResponse({ ok: true, locations: [] });
    }

    let linkQuery = supabase
      .from("pallet_item_links")
      .select("pallet_id, part_no, part_name, quantity, quantity_unit, project_no, updated_at")
      .in(
        "pallet_id",
        pallets.map((row) => row.id)
      )
      .is("unlinked_at", null)
      .order("part_no", { ascending: true, nullsFirst: false });

    if (partNo) {
      linkQuery = linkQuery.ilike("part_no", `%${partNo}%`);
    }

    const { data: linkRows, error: linkError } =
      await linkQuery.returns<PalletItemLinkRow[]>();
    if (linkError) {
      return jsonResponse({ ok: false, error: "failed_to_search_current_warehouse" }, 500);
    }

    const linksByPalletId = new Map<string, PalletItemLinkRow[]>();
    for (const link of linkRows ?? []) {
      const links = linksByPalletId.get(link.pallet_id) ?? [];
      links.push(link);
      linksByPalletId.set(link.pallet_id, links);
    }

    const locationsByCode = new Map<string, CurrentWarehouseLocation>();
    for (const pallet of pallets) {
      const links = linksByPalletId.get(pallet.id) ?? [];
      if (partNo && links.length === 0) continue;

      const locationKey = pallet.current_location_code ?? "";
      const location =
        locationsByCode.get(locationKey) ??
        {
          location_code: pallet.current_location_code,
          pallets: [],
        };

      location.pallets.push({
        pallet_id: pallet.id,
        pallet_code: pallet.pallet_code,
        project_no: pallet.project_no,
        current_status: pallet.current_status,
        updated_at: pallet.updated_at ?? pallet.created_at,
        items: links.map((link) => ({
          part_no: link.part_no,
          part_name: link.part_name,
          quantity: link.quantity,
          quantity_unit: link.quantity_unit,
          project_no: link.project_no ?? pallet.project_no,
          updated_at: link.updated_at ?? pallet.updated_at ?? pallet.created_at,
        })),
      });

      locationsByCode.set(locationKey, location);
    }

    const locations = Array.from(locationsByCode.values()).sort((a, b) =>
      locationSortKey(a.location_code).localeCompare(locationSortKey(b.location_code), "ja")
    );

    return jsonResponse({ ok: true, locations });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
