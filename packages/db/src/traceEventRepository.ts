import type {
  TraceEvent,
  TraceEventInsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

/**
 * trace_events 1 件 insert。
 * - shipment_id / stock_movement_id: 出荷・在庫移動との紐づけ。importer では両方渡すと追跡しやすい。
 * - 将来の重複防止: payload に source_type / source_ref や idempotency key を入れ、一意制約で防ぐ想定。
 */
export async function insertTraceEvent(
  input: TraceEventInsertInput
): Promise<TraceEvent> {
  if (!input.trace_id?.trim()) {
    throw new Error(
      "[@logistics-erp/db] insertTraceEvent: trace_id は必須です。"
    );
  }
  if (!input.event_type?.trim()) {
    throw new Error(
      "[@logistics-erp/db] insertTraceEvent: event_type は必須です。"
    );
  }

  const row = {
    event_type: input.event_type,
    event_at: input.event_at ?? new Date().toISOString(),
    trace_id: input.trace_id.trim(),
    qr_code: input.qr_code ?? null,
    qr_type: input.qr_type ?? null,
    supplier: input.supplier ?? null,
    part_no: input.part_no ?? null,
    part_name: input.part_name ?? null,
    issue_no: input.issue_no ?? null,
    shipment_id: input.shipment_id ?? null,
    stock_movement_id: input.stock_movement_id ?? null,
    actor_type: input.actor_type ?? null,
    actor_id: input.actor_id ?? null,
    actor_name: input.actor_name ?? null,
    location_type: input.location_type ?? null,
    location_code: input.location_code ?? null,
    location_name: input.location_name ?? null,
    device_type: input.device_type ?? null,
    device_id: input.device_id ?? null,
    status: input.status ?? null,
    quantity: input.quantity ?? null,
    unit: input.unit ?? null,
    payload: input.payload ?? null,
    note: input.note ?? null,
  };

  const { data, error } = await supabase
    .from("trace_events")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] insertTraceEvent failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as TraceEvent;
}

export async function listTraceEventsByTraceId(
  traceId: string
): Promise<TraceEvent[]> {
  const { data, error } = await supabase
    .from("trace_events")
    .select("*")
    .eq("trace_id", traceId)
    .order("event_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `[@logistics-erp/db] listTraceEventsByTraceId failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data ?? []) as TraceEvent[];
}

export async function listTraceEventsByShipmentId(
  shipmentId: string
): Promise<TraceEvent[]> {
  const { data, error } = await supabase
    .from("trace_events")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("event_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      `[@logistics-erp/db] listTraceEventsByShipmentId failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data ?? []) as TraceEvent[];
}
