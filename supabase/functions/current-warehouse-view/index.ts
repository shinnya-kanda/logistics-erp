import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type DifferenceSeverity = "info" | "warning" | "high" | "critical";

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
  inventory_type: string | null;
  project_no: string | null;
  updated_at: string | null;
};

type CurrentWarehouseItem = {
  part_no: string | null;
  part_name: string | null;
  quantity: string | number | null;
  quantity_unit: string | null;
  project_no: string | null;
  inventory_type: string | null;
  pallet_item_quantity: number | null;
  inventory_current_quantity: number | null;
  quantity_diff: number | null;
  difference_severity: DifferenceSeverity;
  difference_reason_codes: string[];
  review_required: boolean;
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

type InventoryCurrentRow = {
  part_no: string;
  warehouse_code: string;
  location_code: string;
  inventory_type: string;
  project_no: string | null;
  quantity_on_hand: string | number | null;
};

type DifferenceClassification = {
  difference_severity: DifferenceSeverity;
  difference_reason_codes: string[];
  review_required: boolean;
};

const EXTREME_QUANTITY_DIFF_THRESHOLD = 1000;

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

function numericValue(value: string | number | null): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function quantityKey(args: {
  warehouseCode: string;
  locationCode: string | null;
  partNo: string | null;
  inventoryType: string | null;
  projectNo: string | null;
}): string | null {
  if (!args.locationCode || !args.partNo || !args.inventoryType) return null;
  return [
    args.warehouseCode,
    args.locationCode,
    args.partNo,
    args.inventoryType,
    args.projectNo ?? "",
  ].join("\u001f");
}

function sameNullableValue(a: string | null, b: string | null): boolean {
  return (a ?? "") === (b ?? "");
}

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function severityRank(severity: DifferenceSeverity): number {
  switch (severity) {
    case "critical":
      return 3;
    case "high":
      return 2;
    case "warning":
      return 1;
    case "info":
      return 0;
  }
}

function maxSeverity(...severities: DifferenceSeverity[]): DifferenceSeverity {
  return severities.reduce<DifferenceSeverity>(
    (current, next) => (severityRank(next) > severityRank(current) ? next : current),
    "info"
  );
}

function classifyDifference(args: {
  warehouseCode: string;
  palletWarehouseCode: string;
  locationCode: string | null;
  partNo: string | null;
  inventoryType: string | null;
  projectNo: string | null;
  palletItemQuantity: number | null;
  inventoryCurrentQuantity: number | null;
  quantityDiff: number | null;
  exactCurrentRowExists: boolean;
  currentRowsForPart: InventoryCurrentRow[];
}): DifferenceClassification {
  const reasons: string[] = [];
  let severity: DifferenceSeverity = "info";

  if (args.palletWarehouseCode !== args.warehouseCode) {
    addReason(reasons, "warehouse_boundary_mismatch");
    severity = maxSeverity(severity, "critical");
  }

  if (
    !args.locationCode ||
    !args.partNo ||
    !args.inventoryType ||
    args.palletItemQuantity === null ||
    (args.exactCurrentRowExists && args.inventoryCurrentQuantity === null)
  ) {
    addReason(reasons, "incomplete_data");
    severity = maxSeverity(severity, "warning");
  }

  if (!args.exactCurrentRowExists && args.palletItemQuantity !== null) {
    addReason(reasons, "missing_inventory_current");
    severity = maxSeverity(severity, "critical");
  }

  for (const row of args.currentRowsForPart) {
    if (row.warehouse_code !== args.warehouseCode) {
      addReason(reasons, "warehouse_boundary_mismatch");
      severity = maxSeverity(severity, "critical");
    }
  }

  const comparableRows = args.currentRowsForPart.filter(
    (row) => row.warehouse_code === args.warehouseCode
  );

  if (
    args.locationCode &&
    comparableRows.some(
      (row) =>
        row.location_code !== args.locationCode &&
        row.inventory_type === args.inventoryType &&
        sameNullableValue(row.project_no, args.projectNo)
    )
  ) {
    addReason(reasons, "location_mismatch");
    severity = maxSeverity(severity, "high");
  }

  if (
    args.locationCode &&
    comparableRows.some(
      (row) =>
        row.location_code === args.locationCode &&
        row.inventory_type === args.inventoryType &&
        !sameNullableValue(row.project_no, args.projectNo)
    )
  ) {
    addReason(reasons, "project_no_mismatch");
    severity = maxSeverity(severity, "high");
  }

  if (
    args.locationCode &&
    comparableRows.some(
      (row) =>
        row.location_code === args.locationCode &&
        row.inventory_type !== args.inventoryType &&
        sameNullableValue(row.project_no, args.projectNo)
    )
  ) {
    addReason(reasons, "inventory_type_mismatch");
    severity = maxSeverity(severity, "high");
  }

  if (typeof args.quantityDiff === "number" && args.quantityDiff !== 0) {
    addReason(reasons, "quantity_mismatch");
    severity = maxSeverity(severity, "high");

    if (Math.abs(args.quantityDiff) >= EXTREME_QUANTITY_DIFF_THRESHOLD) {
      addReason(reasons, "quantity_diff_extreme");
      severity = maxSeverity(severity, "critical");
    }
  }

  if (reasons.length === 0) {
    addReason(reasons, "no_difference");
  }

  return {
    difference_severity: severity,
    difference_reason_codes: reasons,
    review_required: severity !== "info",
  };
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
      .select("pallet_id, part_no, part_name, quantity, quantity_unit, inventory_type, project_no, updated_at")
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

    const partNos = Array.from(
      new Set(
        (linkRows ?? [])
          .map((link) => link.part_no?.trim())
          .filter((value): value is string => Boolean(value))
      )
    );
    const palletQuantityByKey = new Map<string, number>();
    for (const pallet of pallets) {
      const links = linksByPalletId.get(pallet.id) ?? [];
      for (const link of links) {
        const key = quantityKey({
          warehouseCode: guard.warehouseCode,
          locationCode: pallet.current_location_code,
          partNo: link.part_no,
          inventoryType: link.inventory_type,
          projectNo: link.project_no ?? pallet.project_no,
        });
        const quantity = numericValue(link.quantity);
        if (!key || quantity === null) continue;
        palletQuantityByKey.set(key, (palletQuantityByKey.get(key) ?? 0) + quantity);
      }
    }

    const inventoryQuantityByKey = new Map<string, number>();
    const inventoryCurrentKeys = new Set<string>();
    const inventoryRowsByPartNo = new Map<string, InventoryCurrentRow[]>();
    if (partNos.length > 0) {
      const currentQuery = supabase
        .from("inventory_current")
        .select("part_no, warehouse_code, location_code, inventory_type, project_no, quantity_on_hand")
        .eq("warehouse_code", guard.warehouseCode)
        .in("part_no", partNos);

      const { data: currentRows, error: currentError } =
        await currentQuery.returns<InventoryCurrentRow[]>();
      if (currentError) {
        return jsonResponse({ ok: false, error: "failed_to_cross_check_inventory_current" }, 500);
      }

      for (const row of currentRows ?? []) {
        const key = quantityKey({
          warehouseCode: row.warehouse_code,
          locationCode: row.location_code,
          partNo: row.part_no,
          inventoryType: row.inventory_type,
          projectNo: row.project_no,
        });
        const rows = inventoryRowsByPartNo.get(row.part_no) ?? [];
        rows.push(row);
        inventoryRowsByPartNo.set(row.part_no, rows);

        if (key) {
          inventoryCurrentKeys.add(key);
        }

        const quantity = numericValue(row.quantity_on_hand);
        if (!key || quantity === null) continue;
        inventoryQuantityByKey.set(key, (inventoryQuantityByKey.get(key) ?? 0) + quantity);
      }
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
        items: links.map((link) => {
          const itemProjectNo = link.project_no ?? pallet.project_no;
          const key = quantityKey({
            warehouseCode: guard.warehouseCode,
            locationCode: pallet.current_location_code,
            partNo: link.part_no,
            inventoryType: link.inventory_type,
            projectNo: itemProjectNo,
          });
          const palletItemQuantity = key ? palletQuantityByKey.get(key) ?? 0 : null;
          const exactCurrentRowExists = key ? inventoryCurrentKeys.has(key) : false;
          const inventoryCurrentQuantity =
            key && exactCurrentRowExists ? inventoryQuantityByKey.get(key) ?? 0 : null;
          const quantityDiff =
            palletItemQuantity !== null
              ? palletItemQuantity - (inventoryCurrentQuantity ?? 0)
              : null;
          const classification = classifyDifference({
            warehouseCode: guard.warehouseCode,
            palletWarehouseCode: pallet.warehouse_code,
            locationCode: pallet.current_location_code,
            partNo: link.part_no,
            inventoryType: link.inventory_type,
            projectNo: itemProjectNo,
            palletItemQuantity,
            inventoryCurrentQuantity,
            quantityDiff,
            exactCurrentRowExists,
            currentRowsForPart: link.part_no
              ? inventoryRowsByPartNo.get(link.part_no) ?? []
              : [],
          });

          return {
            part_no: link.part_no,
            part_name: link.part_name,
            quantity: link.quantity,
            quantity_unit: link.quantity_unit,
            project_no: itemProjectNo,
            inventory_type: link.inventory_type,
            pallet_item_quantity: palletItemQuantity,
            inventory_current_quantity: inventoryCurrentQuantity,
            quantity_diff: quantityDiff,
            difference_severity: classification.difference_severity,
            difference_reason_codes: classification.difference_reason_codes,
            review_required: classification.review_required,
            updated_at: link.updated_at ?? pallet.updated_at ?? pallet.created_at,
          };
        }),
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
