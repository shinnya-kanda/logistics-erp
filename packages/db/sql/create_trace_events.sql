-- =============================================================================
-- 物流ERP: trace_events（現場イベント台帳 / QR trace 中心テーブル）
-- 前提: shipments, stock_movements は既存
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.trace_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT now(),
  trace_id text NOT NULL,
  qr_code text,
  qr_type text,
  supplier text,
  part_no text,
  part_name text,
  issue_no text,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  stock_movement_id uuid REFERENCES stock_movements(id) ON DELETE SET NULL,
  actor_type text,
  actor_id text,
  actor_name text,
  location_type text,
  location_code text,
  location_name text,
  device_type text,
  device_id text,
  status text,
  quantity bigint,
  unit text,
  payload jsonb,
  note text,

  CONSTRAINT trace_events_event_type_check CHECK (
    event_type IN (
      'LABEL_PRINTED',
      'SHIPPER_PACKED',
      'SHIPPER_CONFIRMED',
      'PICKUP_SCANNED',
      'PICKUP_CONFIRMED',
      'BRANCH_RECEIVED',
      'WAREHOUSE_PUTAWAY',
      'OUTBOUND_SCANNED',
      'OUTBOUND_CONFIRMED',
      'DELIVERED',
      'EXCEPTION_RECORDED'
    )
  ),
  CONSTRAINT trace_events_actor_type_check CHECK (
    actor_type IS NULL OR actor_type IN (
      'SHIPPER',
      'DRIVER',
      'WAREHOUSE',
      'ADMIN',
      'SYSTEM'
    )
  ),
  CONSTRAINT trace_events_location_type_check CHECK (
    location_type IS NULL OR location_type IN (
      'SHIPPER_SITE',
      'BRANCH',
      'WAREHOUSE',
      'TRUCK',
      'CUSTOMER_SITE',
      'UNKNOWN'
    )
  ),
  CONSTRAINT trace_events_status_check CHECK (
    status IS NULL OR status IN (
      'OK',
      'WARNING',
      'ERROR',
      'PARTIAL',
      'CANCELLED'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_trace_events_trace_id ON public.trace_events (trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_event_type ON public.trace_events (event_type);
CREATE INDEX IF NOT EXISTS idx_trace_events_event_at ON public.trace_events (event_at);
CREATE INDEX IF NOT EXISTS idx_trace_events_issue_no ON public.trace_events (issue_no);
CREATE INDEX IF NOT EXISTS idx_trace_events_part_no ON public.trace_events (part_no);
CREATE INDEX IF NOT EXISTS idx_trace_events_supplier ON public.trace_events (supplier);
CREATE INDEX IF NOT EXISTS idx_trace_events_shipment_id ON public.trace_events (shipment_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_stock_movement_id ON public.trace_events (stock_movement_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_location_code ON public.trace_events (location_code);
CREATE INDEX IF NOT EXISTS idx_trace_events_actor_id ON public.trace_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_trace_events_payload_gin ON public.trace_events USING gin (payload);

COMMENT ON TABLE public.trace_events IS '現場で何が起きたかを残すイベント台帳。QR読取・荷主出荷・集荷・受領・棚入れ・出庫・納品まで追跡。物流ERP/WMS/QR trace の中心。';
