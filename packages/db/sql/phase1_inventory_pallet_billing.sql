-- =============================================================================
-- Phase 1: 在庫イベント・パレット・請求根拠（最小構成）
-- 前提: public.shipments が存在すること（Phase 0/1 または CI bootstrap）
-- 互換: 既存 inventory / stock_movements / trace_events 等は変更しない
-- 参照: INVENTORY_CONTEXT.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 共通: updated_at 自動更新（phase1_expected_data と同一。単体適用時も冪等）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_expected_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. pallet_units（パレット実体）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pallet_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_no text,
  trace_id text,
  inventory_type text,
  status text,
  warehouse_code text,
  location_code text,
  received_at timestamptz,
  closed_at timestamptz,
  storage_area_tsubo numeric NOT NULL DEFAULT 0.5,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pallet_units_pallet_no UNIQUE (pallet_no),
  CONSTRAINT uq_pallet_units_trace_id UNIQUE (trace_id)
);

CREATE INDEX IF NOT EXISTS idx_pallet_units_pallet_no ON public.pallet_units (pallet_no);
CREATE INDEX IF NOT EXISTS idx_pallet_units_trace_id ON public.pallet_units (trace_id);
CREATE INDEX IF NOT EXISTS idx_pallet_units_inventory_type ON public.pallet_units (inventory_type);
CREATE INDEX IF NOT EXISTS idx_pallet_units_status ON public.pallet_units (status);
CREATE INDEX IF NOT EXISTS idx_pallet_units_warehouse_location ON public.pallet_units (warehouse_code, location_code);

COMMENT ON TABLE public.pallet_units IS 'パレット実体。部品登録前に単位として立てられる。storage_area_tsubo 既定 0.5 坪。';

DROP TRIGGER IF EXISTS trigger_pallet_units_updated_at ON public.pallet_units;
CREATE TRIGGER trigger_pallet_units_updated_at
  BEFORE UPDATE ON public.pallet_units
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

-- -----------------------------------------------------------------------------
-- 2. inventory_transactions（部品在庫イベント）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL,
  inventory_type text NOT NULL,
  part_no text NOT NULL,
  part_name text,
  quantity numeric NOT NULL,
  quantity_unit text NOT NULL DEFAULT 'part',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  warehouse_code text,
  location_code text,
  shipment_id uuid REFERENCES public.shipments (id) ON DELETE SET NULL,
  source_reference text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_part_no ON public.inventory_transactions (part_no);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_type ON public.inventory_transactions (inventory_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_occurred_at ON public.inventory_transactions (occurred_at);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_warehouse_location ON public.inventory_transactions (warehouse_code, location_code);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_shipment_id ON public.inventory_transactions (shipment_id);

COMMENT ON TABLE public.inventory_transactions IS '部品単位の在庫イベント。正本はイベント。現在庫は将来集約。';

DROP TRIGGER IF EXISTS trigger_inventory_transactions_updated_at ON public.inventory_transactions;
CREATE TRIGGER trigger_inventory_transactions_updated_at
  BEFORE UPDATE ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

-- -----------------------------------------------------------------------------
-- 3. pallet_transactions（パレット在庫イベント）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_unit_id uuid NOT NULL REFERENCES public.pallet_units (id) ON DELETE RESTRICT,
  transaction_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  warehouse_code text,
  location_code text,
  storage_area_tsubo numeric,
  source_reference text,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pallet_transactions_pallet_unit_id ON public.pallet_transactions (pallet_unit_id);
CREATE INDEX IF NOT EXISTS idx_pallet_transactions_transaction_type ON public.pallet_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_pallet_transactions_occurred_at ON public.pallet_transactions (occurred_at);

COMMENT ON TABLE public.pallet_transactions IS 'パレット単位のイベント履歴。';

-- -----------------------------------------------------------------------------
-- 4. pallet_item_links（パレットと部品の後付け紐付け）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pallet_item_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_unit_id uuid NOT NULL REFERENCES public.pallet_units (id) ON DELETE RESTRICT,
  part_no text NOT NULL,
  part_name text,
  quantity numeric NOT NULL,
  quantity_unit text NOT NULL DEFAULT 'part',
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pallet_item_links_pallet_unit_id ON public.pallet_item_links (pallet_unit_id);
CREATE INDEX IF NOT EXISTS idx_pallet_item_links_part_no ON public.pallet_item_links (part_no);
CREATE INDEX IF NOT EXISTS idx_pallet_item_links_linked_at ON public.pallet_item_links (linked_at);

COMMENT ON TABLE public.pallet_item_links IS 'パレットに対する部品紐付け。後から登録する運用を想定。';

DROP TRIGGER IF EXISTS trigger_pallet_item_links_updated_at ON public.pallet_item_links;
CREATE TRIGGER trigger_pallet_item_links_updated_at
  BEFORE UPDATE ON public.pallet_item_links
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

-- -----------------------------------------------------------------------------
-- 5. billing_segments（請求根拠の最小単位）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_type text NOT NULL,
  inventory_type text,
  unit_type text NOT NULL,
  reference_type text,
  reference_id uuid,
  segment_start_at timestamptz,
  segment_end_at timestamptz,
  quantity numeric,
  rate_type text,
  rate_value numeric,
  amount numeric,
  billing_month text,
  status text NOT NULL DEFAULT 'draft',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_segments_billing_type ON public.billing_segments (billing_type);
CREATE INDEX IF NOT EXISTS idx_billing_segments_billing_month ON public.billing_segments (billing_month);
CREATE INDEX IF NOT EXISTS idx_billing_segments_status ON public.billing_segments (status);
CREATE INDEX IF NOT EXISTS idx_billing_segments_reference ON public.billing_segments (reference_type, reference_id);

COMMENT ON TABLE public.billing_segments IS '課金根拠イベント。請求金額は後計算でセグメントに蓄積。';

DROP TRIGGER IF EXISTS trigger_billing_segments_updated_at ON public.billing_segments;
CREATE TRIGGER trigger_billing_segments_updated_at
  BEFORE UPDATE ON public.billing_segments
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();

-- -----------------------------------------------------------------------------
-- 6. billing_monthly（月次請求集計）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_month text NOT NULL,
  customer_code text,
  customer_name text,
  inventory_type text,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  calculated_at timestamptz,
  confirmed_at timestamptz,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_monthly_month_customer_inventory
  ON public.billing_monthly (billing_month, customer_code, inventory_type) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_billing_monthly_billing_month ON public.billing_monthly (billing_month);
CREATE INDEX IF NOT EXISTS idx_billing_monthly_status ON public.billing_monthly (status);

COMMENT ON TABLE public.billing_monthly IS '月次請求の集計結果保存先。計算エンジンは未実装でもスキーマのみ用意。';

DROP TRIGGER IF EXISTS trigger_billing_monthly_updated_at ON public.billing_monthly;
CREATE TRIGGER trigger_billing_monthly_updated_at
  BEFORE UPDATE ON public.billing_monthly
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_expected_row_updated_at();
