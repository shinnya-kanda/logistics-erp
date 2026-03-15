export type TraceEventType =
  | "LABEL_PRINTED"
  | "SHIPPER_PACKED"
  | "SHIPPER_CONFIRMED"
  | "PICKUP_SCANNED"
  | "PICKUP_CONFIRMED"
  | "BRANCH_RECEIVED"
  | "WAREHOUSE_PUTAWAY"
  | "OUTBOUND_SCANNED"
  | "OUTBOUND_CONFIRMED"
  | "DELIVERED"
  | "EXCEPTION_RECORDED"

export type TraceActorType =
  | "SHIPPER"
  | "DRIVER"
  | "WAREHOUSE"
  | "ADMIN"
  | "SYSTEM"

export type TraceLocationType =
  | "SHIPPER_SITE"
  | "BRANCH"
  | "WAREHOUSE"
  | "TRUCK"
  | "CUSTOMER_SITE"
  | "UNKNOWN"

export type TraceStatus =
  | "OK"
  | "WARNING"
  | "ERROR"
  | "PARTIAL"
  | "CANCELLED"

export type TraceEvent = {
  id: string
  created_at: string
  event_type: TraceEventType
  event_at: string
  trace_id: string
  qr_code: string | null
  qr_type: string | null
  supplier: string | null
  part_no: string | null
  part_name: string | null
  issue_no: string | null
  shipment_id: string | null
  stock_movement_id: string | null
  actor_type: TraceActorType | null
  actor_id: string | null
  actor_name: string | null
  location_type: TraceLocationType | null
  location_code: string | null
  location_name: string | null
  device_type: string | null
  device_id: string | null
  status: TraceStatus | null
  quantity: number | null
  unit: string | null
  payload: Record<string, unknown> | null
  note: string | null
  idempotency_key: string | null
}

export type TraceEventInsertInput = {
  event_type: TraceEventType
  event_at?: string
  trace_id: string
  qr_code?: string | null
  qr_type?: string | null
  supplier?: string | null
  part_no?: string | null
  part_name?: string | null
  issue_no?: string | null
  shipment_id?: string | null
  stock_movement_id?: string | null
  actor_type?: TraceActorType | null
  actor_id?: string | null
  actor_name?: string | null
  location_type?: TraceLocationType | null
  location_code?: string | null
  location_name?: string | null
  device_type?: string | null
  device_id?: string | null
  status?: TraceStatus | null
  quantity?: number | null
  unit?: string | null
  payload?: Record<string, unknown> | null
  note?: string | null
  idempotency_key?: string | null
}
