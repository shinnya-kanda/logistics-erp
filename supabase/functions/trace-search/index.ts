import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireAdminRole as adminGuard } from "../_shared/adminGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

type InventoryTransactionRow = {
  id: string;
  trace_id: string | null;
  transaction_type: string | null;
  warehouse_code: string;
  location_code: string | null;
  from_location_code: string | null;
  to_location_code: string | null;
  part_no: string | null;
  part_name: string | null;
  quantity: number | string | null;
  quantity_unit: string | null;
  inventory_type: string | null;
  project_no: string | null;
  mrp_key: string | null;
  pallet_id: string | null;
  idempotency_key: string | null;
  operator_id: string | null;
  operator_name: string | null;
  remarks: string | null;
  event_at: string | null;
  created_at: string | null;
};

type PalletTransactionRow = {
  id: string;
  trace_id: string | null;
  request_id: string | null;
  transaction_type: string | null;
  warehouse_code: string;
  pallet_id: string | null;
  pallet_unit_id: string | null;
  pallet_code: string | null;
  from_location_code: string | null;
  to_location_code: string | null;
  idempotency_key: string | null;
  operator_id: string | null;
  operator_name: string | null;
  remarks: string | null;
  event_at: string | null;
  occurred_at: string | null;
  created_at: string | null;
};

type WarehouseLocationHistoryRow = {
  trace_id: string | null;
  warehouse_code: string;
  location_code: string;
  action_type: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  operator_id: string | null;
  operator_role: string | null;
  created_at: string | null;
};

type TraceEvent = {
  source: "inventory_transactions" | "pallet_transactions" | "warehouse_location_history";
  event_type: string | null;
  warehouse_code: string;
  created_at: string | null;
  trace_id: string | null;
  request_id?: string | null;
  id: string;
  event_at?: string | null;
  location_code?: string | null;
  from_location_code?: string | null;
  to_location_code?: string | null;
  part_no?: string | null;
  quantity?: number | string | null;
  quantity_unit?: string | null;
  pallet_id?: string | null;
  pallet_code?: string | null;
  operator_id?: string | null;
  operator_name?: string | null;
  operator_role?: string | null;
  remarks?: string | null;
  data: Record<string, unknown>;
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

async function readTraceId(req: Request): Promise<string | null> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    return url.searchParams.get("trace_id")?.trim() || null;
  }

  if (req.method !== "POST") return null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return null;
  }

  if (!isRecord(body)) return null;
  const value = body.trace_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toInventoryEvent(row: InventoryTransactionRow): TraceEvent {
  return {
    source: "inventory_transactions",
    event_type: row.transaction_type,
    warehouse_code: row.warehouse_code,
    created_at: row.created_at,
    trace_id: row.trace_id,
    request_id: row.request_id,
    id: row.id,
    event_at: row.event_at,
    location_code: row.location_code,
    from_location_code: row.from_location_code,
    to_location_code: row.to_location_code,
    part_no: row.part_no,
    quantity: row.quantity,
    quantity_unit: row.quantity_unit,
    pallet_id: row.pallet_id,
    operator_id: row.operator_id,
    operator_name: row.operator_name,
    remarks: row.remarks,
    data: row as unknown as Record<string, unknown>,
  };
}

function toPalletEvent(row: PalletTransactionRow): TraceEvent {
  return {
    source: "pallet_transactions",
    event_type: row.transaction_type,
    warehouse_code: row.warehouse_code,
    created_at: row.created_at,
    trace_id: row.trace_id,
    id: row.id,
    event_at: row.event_at ?? row.occurred_at,
    from_location_code: row.from_location_code,
    to_location_code: row.to_location_code,
    pallet_id: row.pallet_id ?? row.pallet_unit_id,
    pallet_code: row.pallet_code,
    operator_id: row.operator_id,
    operator_name: row.operator_name,
    remarks: row.remarks,
    data: row as unknown as Record<string, unknown>,
  };
}

function toWarehouseLocationEvent(row: WarehouseLocationHistoryRow): TraceEvent {
  const eventId = [
    "warehouse_location_history",
    row.warehouse_code,
    row.location_code,
    row.action_type,
    row.created_at ?? "",
  ].join(":");

  return {
    source: "warehouse_location_history",
    event_type: row.action_type,
    warehouse_code: row.warehouse_code,
    created_at: row.created_at,
    trace_id: row.trace_id,
    id: eventId,
    location_code: row.location_code,
    operator_id: row.operator_id,
    operator_role: row.operator_role,
    data: row as unknown as Record<string, unknown>,
  };
}

function compareEvents(a: TraceEvent, b: TraceEvent): number {
  const aTime = a.created_at ? Date.parse(a.created_at) : 0;
  const bTime = b.created_at ? Date.parse(b.created_at) : 0;
  if (aTime !== bTime) return aTime - bTime;
  return `${a.source}:${a.id}`.localeCompare(`${b.source}:${b.id}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
    }

    const guard = await adminGuard(req);
    if (!guard.ok) {
      return jsonResponse(guard.body, guard.status);
    }

    const traceId = await readTraceId(req);
    if (!traceId) {
      return jsonResponse({ ok: false, error: "trace_id is required" }, 400);
    }

    let supabase;
    try {
      supabase = createSupabaseClient();
    } catch {
      return jsonResponse({ ok: false, error: "internal_error" }, 500);
    }

    const [inventoryResult, palletResult, warehouseLocationResult] = await Promise.all([
      supabase
        .from("inventory_transactions")
        .select(
          "id, trace_id, transaction_type, warehouse_code, location_code, from_location_code, to_location_code, part_no, part_name, quantity, quantity_unit, inventory_type, project_no, mrp_key, pallet_id, idempotency_key, operator_id, operator_name, remarks, event_at, created_at"
        )
        .eq("trace_id", traceId)
        .eq("warehouse_code", guard.warehouseCode)
        .order("created_at", { ascending: true })
        .returns<InventoryTransactionRow[]>(),
      supabase
        .from("pallet_transactions")
        .select(
          "id, trace_id, request_id, transaction_type, warehouse_code, pallet_id, pallet_unit_id, pallet_code, from_location_code, to_location_code, idempotency_key, operator_id, operator_name, remarks, event_at, occurred_at, created_at"
        )
        .eq("trace_id", traceId)
        .eq("warehouse_code", guard.warehouseCode)
        .order("created_at", { ascending: true })
        .returns<PalletTransactionRow[]>(),
      supabase
        .from("warehouse_location_history")
        .select(
          "trace_id, warehouse_code, location_code, action_type, before_data, after_data, operator_id, operator_role, created_at"
        )
        .eq("trace_id", traceId)
        .eq("warehouse_code", guard.warehouseCode)
        .order("created_at", { ascending: true })
        .returns<WarehouseLocationHistoryRow[]>(),
    ]);

    if (inventoryResult.error) {
      return jsonResponse({ ok: false, error: "failed_to_search_inventory_transactions" }, 500);
    }
    if (palletResult.error) {
      return jsonResponse({ ok: false, error: "failed_to_search_pallet_transactions" }, 500);
    }
    if (warehouseLocationResult.error) {
      console.error("trace-search warehouse_location_history error", {
        code: warehouseLocationResult.error.code,
        message: warehouseLocationResult.error.message,
        details: warehouseLocationResult.error.details,
        hint: warehouseLocationResult.error.hint,
      });
      return jsonResponse({ ok: false, error: "failed_to_search_warehouse_location_history" }, 500);
    }

    const events = [
      ...(inventoryResult.data ?? []).map(toInventoryEvent),
      ...(palletResult.data ?? []).map(toPalletEvent),
      ...(warehouseLocationResult.data ?? []).map(toWarehouseLocationEvent),
    ].sort(compareEvents);

    return jsonResponse({ ok: true, trace_id: traceId, events });
  } catch {
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
});
