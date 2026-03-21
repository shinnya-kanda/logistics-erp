import type {
  TraceEvent,
  TraceEventInsertInput,
} from "@logistics-erp/schema";
import { supabase } from "./client.js";

const UNIQUE_VIOLATION_CODE = "23505";

/**
 * trace_events 1 件を冪等に作成（find-or-create）。
 * 1. idempotency_key があれば既存検索 → あれば返却
 * 2. shipment_id + event_type があれば既存検索 → あれば返却（fallback）
 * 3. なければ insert
 * 4. insert が unique 制約違反なら既存を再取得して返却
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

  if (input.idempotency_key) {
    const byKey = await findTraceEventByIdempotencyKey(input.idempotency_key);
    if (byKey) return byKey;
  }

  if (input.shipment_item_id && input.event_type) {
    const byItem = await findTraceEventByShipmentItemAndEventType(
      input.shipment_item_id,
      input.event_type
    );
    if (byItem) return byItem;
  }

  if (input.shipment_id && input.event_type) {
    const byShipment = await findTraceEventByShipmentAndEventType(
      input.shipment_id,
      input.event_type
    );
    if (byShipment) return byShipment;
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
    shipment_item_id: input.shipment_item_id ?? null,
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
    idempotency_key: input.idempotency_key ?? null,
  };

  const { data, error } = await supabase
    .from("trace_events")
    .insert(row)
    .select()
    .single();

  if (error) {
    const code = String(error.code ?? "");
    const isUniqueViolation =
      code === UNIQUE_VIOLATION_CODE ||
      code === "23505" ||
      error.message?.includes("unique") ||
      error.message?.includes("uniq_trace_event");

    if (isUniqueViolation) {
      if (input.idempotency_key) {
        const existing = await findTraceEventByIdempotencyKey(
          input.idempotency_key
        );
        if (existing) return existing;
      }
      if (input.shipment_item_id && input.event_type) {
        const existingItem = await findTraceEventByShipmentItemAndEventType(
          input.shipment_item_id,
          input.event_type
        );
        if (existingItem) return existingItem;
      }

      if (input.shipment_id && input.event_type) {
        const existing = await findTraceEventByShipmentAndEventType(
          input.shipment_id,
          input.event_type
        );
        if (existing) return existing;
      }
    }

    throw new Error(
      `[@logistics-erp/db] insertTraceEvent failed: ${error.message}`,
      { cause: error }
    );
  }

  return data as TraceEvent;
}

export async function findTraceEventByIdempotencyKey(
  idempotencyKey: string
): Promise<TraceEvent | null> {
  const { data, error } = await supabase
    .from("trace_events")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] findTraceEventByIdempotencyKey failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data as TraceEvent) ?? null;
}

export async function findTraceEventByShipmentItemAndEventType(
  shipmentItemId: string,
  eventType: string
): Promise<TraceEvent | null> {
  const { data, error } = await supabase
    .from("trace_events")
    .select("*")
    .eq("shipment_item_id", shipmentItemId)
    .eq("event_type", eventType)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] findTraceEventByShipmentItemAndEventType failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data as TraceEvent) ?? null;
}

export async function findTraceEventByShipmentAndEventType(
  shipmentId: string,
  eventType: string
): Promise<TraceEvent | null> {
  const { data, error } = await supabase
    .from("trace_events")
    .select("*")
    .eq("shipment_id", shipmentId)
    .eq("event_type", eventType)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[@logistics-erp/db] findTraceEventByShipmentAndEventType failed: ${error.message}`,
      { cause: error }
    );
  }

  return (data as TraceEvent) ?? null;
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
