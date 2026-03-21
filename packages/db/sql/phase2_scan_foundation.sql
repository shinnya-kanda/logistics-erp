-- =============================================================================
-- Phase 2: Actual Data 最小基盤（scan_events, shipment_item_progress, shipment_item_issues）
-- 前提: public.shipment_items が存在すること（Phase 1）
-- Expected（shipment_items）と Actual（scan_events）をテーブルレベルで分離する。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. scan_events — raw fact（現場スキャンの事実のみ。集約ロジックは持たない）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text,
  shipment_item_id uuid REFERENCES public.shipment_items (id) ON DELETE SET NULL,
  scan_type text NOT NULL,
  scanned_code text NOT NULL,
  scanned_part_no text,
  quantity_scanned numeric,
  quantity_unit text,
  unload_location_scanned text,
  result_status text NOT NULL,
  device_id text,
  operator_id text,
  operator_name text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scan_events_shipment_item_id ON public.scan_events (shipment_item_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_trace_id ON public.scan_events (trace_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_scanned_code ON public.scan_events (scanned_code);
CREATE INDEX IF NOT EXISTS idx_scan_events_scanned_at ON public.scan_events (scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_events_result_status ON public.scan_events (result_status);

COMMENT ON TABLE public.scan_events IS 'Phase2 Actual: スキャン・現場操作の raw fact。照合結果は result_status に保存するが集約状態は progress へ。';

-- -----------------------------------------------------------------------------
-- 2. shipment_item_progress — current state（明細ごとの検品・進捗の現在値）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipment_item_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_item_id uuid NOT NULL REFERENCES public.shipment_items (id) ON DELETE CASCADE,
  trace_id text,
  quantity_expected numeric NOT NULL,
  quantity_scanned_total numeric NOT NULL DEFAULT 0 CHECK (quantity_scanned_total >= 0),
  progress_status text NOT NULL DEFAULT 'planned',
  first_scanned_at timestamptz,
  last_scanned_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_shipment_item_progress_item UNIQUE (shipment_item_id)
);

CREATE INDEX IF NOT EXISTS idx_shipment_item_progress_trace_id ON public.shipment_item_progress (trace_id);
CREATE INDEX IF NOT EXISTS idx_shipment_item_progress_status ON public.shipment_item_progress (progress_status);

COMMENT ON TABLE public.shipment_item_progress IS 'Phase2: shipment_items と 1:1 の現在進捗。raw は scan_events。';

DROP TRIGGER IF EXISTS trigger_shipment_item_progress_updated_at ON public.shipment_item_progress;
CREATE TRIGGER trigger_shipment_item_progress_updated_at
  BEFORE UPDATE ON public.shipment_item_progress
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

-- -----------------------------------------------------------------------------
-- 3. shipment_item_issues — mismatch / issue 履歴
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipment_item_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_item_id uuid NOT NULL REFERENCES public.shipment_items (id) ON DELETE CASCADE,
  trace_id text,
  issue_type text NOT NULL,
  severity text,
  expected_value text,
  actual_value text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_item_issues_shipment_item_id ON public.shipment_item_issues (shipment_item_id);
CREATE INDEX IF NOT EXISTS idx_shipment_item_issues_trace_id ON public.shipment_item_issues (trace_id);
CREATE INDEX IF NOT EXISTS idx_shipment_item_issues_issue_type ON public.shipment_item_issues (issue_type);
CREATE INDEX IF NOT EXISTS idx_shipment_item_issues_severity ON public.shipment_item_issues (severity);
CREATE INDEX IF NOT EXISTS idx_shipment_item_issues_detected_at ON public.shipment_item_issues (detected_at);

COMMENT ON TABLE public.shipment_item_issues IS 'Phase2: 照合ミスマッチ等の履歴。current state は progress。';

DROP TRIGGER IF EXISTS trigger_shipment_item_issues_updated_at ON public.shipment_item_issues;
CREATE TRIGGER trigger_shipment_item_issues_updated_at
  BEFORE UPDATE ON public.shipment_item_issues
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();
