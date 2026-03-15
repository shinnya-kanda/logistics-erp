-- =============================================================================
-- 物流ERP: 在庫中核テーブル (inventory, stock_movements)
-- 前提: shipments テーブルは既存
-- =============================================================================

-- -----------------------------------------------------------------------------
-- inventory: 現在庫の集約テーブル (1 supplier + 1 part_no を在庫単位とする)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  supplier text,
  part_no text NOT NULL,
  part_name text,
  on_hand_qty bigint NOT NULL DEFAULT 0 CHECK (on_hand_qty >= 0),
  allocated_qty bigint NOT NULL DEFAULT 0 CHECK (allocated_qty >= 0),
  available_qty bigint NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
  CONSTRAINT inventory_supplier_part_no_key UNIQUE (supplier, part_no),
  -- 運用: available_qty = on_hand_qty - allocated_qty。INSERT/UPDATE 時は必ずこの等式を満たすこと。
  CONSTRAINT inventory_available_qty_check CHECK (available_qty = on_hand_qty - allocated_qty)
);

CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory (supplier);
CREATE INDEX IF NOT EXISTS idx_inventory_part_no ON inventory (part_no);

COMMENT ON TABLE inventory IS '現在庫集約。supplier + part_no を単位とする。available_qty = on_hand_qty - allocated_qty で運用。';

-- -----------------------------------------------------------------------------
-- inventory.updated_at を更新時に自動で now() にする trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_updated_at ON inventory;
CREATE TRIGGER trigger_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE PROCEDURE set_inventory_updated_at();

-- -----------------------------------------------------------------------------
-- stock_movements: 在庫増減履歴 (入庫/出庫/調整/引当/引当解除)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  movement_type text NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUST', 'RESERVE', 'RELEASE')),
  supplier text,
  part_no text NOT NULL,
  part_name text,
  quantity bigint NOT NULL CHECK (quantity <> 0),
  movement_date date NOT NULL DEFAULT current_date,
  source_type text,
  source_ref text,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  note text
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements (created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_supplier ON stock_movements (supplier);
CREATE INDEX IF NOT EXISTS idx_stock_movements_part_no ON stock_movements (part_no);
CREATE INDEX IF NOT EXISTS idx_stock_movements_shipment_id ON stock_movements (shipment_id);

COMMENT ON TABLE stock_movements IS '在庫増減履歴。IN/OUT/ADJUST/RESERVE/RELEASE。shipments や将来の orders/billing/trace_events と紐づく。';

-- -----------------------------------------------------------------------------
-- 将来の拡張メモ:
-- - stock_movements が ERP / WMS / QR trace の中心になる
-- - shipments は取込元データ（CSV/PDF 取込）
-- - inventory は集約結果（stock_movements から集計 or アプリで同期）
-- - 将来 orders / billing / trace_events に接続する想定
-- -----------------------------------------------------------------------------
