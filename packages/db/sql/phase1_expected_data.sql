-- =============================================================================
-- Phase 1: Expected Data（source_files, shipments 拡張, shipment_items）
-- 前提: public.shipments が存在すること（Phase 0 CSV 取込・在庫連携）
-- 互換: 既存の行単位 shipments 行はそのまま残せる（レガシー列は NULL 許容へ）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 共通: updated_at 自動更新
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_expected_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. source_files
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.source_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_type text NOT NULL,
  file_name text NOT NULL,
  file_path text,
  source_system text,
  checksum text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_source_files_imported_at ON public.source_files (imported_at);
CREATE INDEX IF NOT EXISTS idx_source_files_file_type ON public.source_files (file_type);
CREATE INDEX IF NOT EXISTS idx_source_files_checksum ON public.source_files (checksum);
CREATE UNIQUE INDEX IF NOT EXISTS uq_source_files_checksum_not_null
  ON public.source_files (checksum)
  WHERE checksum IS NOT NULL;

COMMENT ON TABLE public.source_files IS 'Phase1: 取込ファイルの監査ルート。全 Expected 取込の起点。';

DROP TRIGGER IF EXISTS trigger_source_files_updated_at ON public.source_files;
CREATE TRIGGER trigger_source_files_updated_at
  BEFORE UPDATE ON public.source_files
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

-- -----------------------------------------------------------------------------
-- 2. shipments 拡張（Expected ヘッダ + Phase0 レガシー列）
-- -----------------------------------------------------------------------------
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS source_file_id uuid;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipment_no text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipper_code text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipper_name text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS receiver_code text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS receiver_name text;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS scheduled_ship_date date;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'imported';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS remarks text;

-- レガシー列が NOT NULL の環境でも Phase1 ヘッダ行を挿入できるよう緩和
ALTER TABLE public.shipments ALTER COLUMN issue_no DROP NOT NULL;
ALTER TABLE public.shipments ALTER COLUMN part_no DROP NOT NULL;
ALTER TABLE public.shipments ALTER COLUMN quantity DROP NOT NULL;

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS shipments_source_file_id_fkey;
ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_source_file_id_fkey
  FOREIGN KEY (source_file_id) REFERENCES public.source_files (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_source_file_id ON public.shipments (source_file_id);
CREATE INDEX IF NOT EXISTS idx_shipments_shipment_no ON public.shipments (shipment_no);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery_date ON public.shipments (delivery_date);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON public.shipments (status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipments_source_file_id_not_null
  ON public.shipments (source_file_id)
  WHERE source_file_id IS NOT NULL;

DROP TRIGGER IF EXISTS trigger_shipments_expected_updated_at ON public.shipments;
CREATE TRIGGER trigger_shipments_expected_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

COMMENT ON COLUMN public.shipments.source_file_id IS 'Phase1: 取込元 source_files。1 ファイル 1 ヘッダ想定。';
COMMENT ON COLUMN public.shipments.issue_no IS 'Phase0 互換: 行単位 shipments のキー。Phase1 ヘッダでは NULL。';

-- -----------------------------------------------------------------------------
-- 3. shipment_items（Expected 明細）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments (id) ON DELETE CASCADE,
  line_no integer,
  trace_id text NOT NULL,
  part_no text NOT NULL,
  part_name text,
  quantity_expected numeric NOT NULL,
  quantity_unit text,
  unload_location text,
  delivery_date date,
  lot_no text,
  external_barcode text,
  match_key text,
  status text NOT NULL DEFAULT 'planned',
  source_row_no integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment_id ON public.shipment_items (shipment_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_items_trace_id ON public.shipment_items (trace_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_part_no ON public.shipment_items (part_no);
CREATE INDEX IF NOT EXISTS idx_shipment_items_unload_location ON public.shipment_items (unload_location);
CREATE INDEX IF NOT EXISTS idx_shipment_items_delivery_date ON public.shipment_items (delivery_date);
CREATE INDEX IF NOT EXISTS idx_shipment_items_status ON public.shipment_items (status);
CREATE INDEX IF NOT EXISTS idx_shipment_items_match_key ON public.shipment_items (match_key);

COMMENT ON TABLE public.shipment_items IS 'Phase1: 出荷予定明細（Expected）。検品・scan_events は Phase2 以降。';

DROP TRIGGER IF EXISTS trigger_shipment_items_updated_at ON public.shipment_items;
CREATE TRIGGER trigger_shipment_items_updated_at
  BEFORE UPDATE ON public.shipment_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

-- -----------------------------------------------------------------------------
-- 4. stock_movements: Phase1 明細への参照（在庫効果の冪等キー単位）
-- -----------------------------------------------------------------------------
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS shipment_item_id uuid;

ALTER TABLE public.stock_movements DROP CONSTRAINT IF EXISTS stock_movements_shipment_item_id_fkey;
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_shipment_item_id_fkey
  FOREIGN KEY (shipment_item_id) REFERENCES public.shipment_items (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_shipment_item_id ON public.stock_movements (shipment_item_id);

COMMENT ON COLUMN public.stock_movements.shipment_item_id IS 'Phase1: Expected 明細単位の入庫等。レガシーでは NULL。';

-- -----------------------------------------------------------------------------
-- 5. trace_events: 明細単位の冪等性（レガシーは shipment_id 行のまま）
-- -----------------------------------------------------------------------------
ALTER TABLE public.trace_events ADD COLUMN IF NOT EXISTS shipment_item_id uuid;

ALTER TABLE public.trace_events DROP CONSTRAINT IF EXISTS trace_events_shipment_item_id_fkey;
ALTER TABLE public.trace_events
  ADD CONSTRAINT trace_events_shipment_item_id_fkey
  FOREIGN KEY (shipment_item_id) REFERENCES public.shipment_items (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trace_events_shipment_item_id ON public.trace_events (shipment_item_id);

DROP INDEX IF EXISTS public.uniq_trace_event;
CREATE UNIQUE INDEX uniq_trace_event_legacy_shipment_line
  ON public.trace_events (shipment_id, event_type)
  WHERE shipment_item_id IS NULL;

CREATE UNIQUE INDEX uniq_trace_event_per_shipment_item
  ON public.trace_events (shipment_item_id, event_type)
  WHERE shipment_item_id IS NOT NULL;

COMMENT ON COLUMN public.trace_events.shipment_item_id IS 'Phase1: イベントを Expected 明細に紐づけ。Phase2 scan_events への橋渡し。';
COMMENT ON COLUMN public.trace_events.shipment_id IS '出荷ヘッダ（shipments.id）。Phase1 ではヘッダ ID、レガシーでは行単位 ID。';
