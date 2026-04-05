-- =============================================================================
-- Phase B-1: pallet_managed（小松金沢）+ simple_managed（ブリヂストン）向け基盤
-- 前提: public.shipments は変更しない。既存 inventory / stock_movements は変更しない。
-- 真実は transactions。inventory_current は集約結果（キャッシュ）であり真実ではない。
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_phase_b1_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. pallet_units（パレットの現在状態。数量は持たない）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pallet_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_no text NOT NULL,
  warehouse_code text NOT NULL,
  location_code text NOT NULL,
  inventory_type text NOT NULL,
  status text NOT NULL,
  storage_area_tsubo numeric NOT NULL DEFAULT 0.5,
  arrived_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pallet_units_pallet_no UNIQUE (pallet_no)
);

CREATE INDEX IF NOT EXISTS idx_pallet_units_pallet_no ON public.pallet_units (pallet_no);
CREATE INDEX IF NOT EXISTS idx_pallet_units_warehouse_code ON public.pallet_units (warehouse_code);
CREATE INDEX IF NOT EXISTS idx_pallet_units_status ON public.pallet_units (status);

COMMENT ON TABLE public.pallet_units IS 'パレット現在状態。数量は持たない。イベントは pallet_transactions。';

DROP TRIGGER IF EXISTS trigger_pallet_units_updated_at ON public.pallet_units;
CREATE TRIGGER trigger_pallet_units_updated_at
  BEFORE UPDATE ON public.pallet_units
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_phase_b1_row_updated_at();

-- -----------------------------------------------------------------------------
-- 2. inventory_transactions（部品在庫の事実ログ）
-- warehouse_code / location_code = 移動元（IN/OUT/MOVE 共通。MOVE では from）
-- to_warehouse_code / to_location_code = 移動先（MOVE 時のみ使用。1イベントで from/to を保持）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type text NOT NULL,
  part_no text NOT NULL,
  part_name text,
  quantity numeric NOT NULL,
  quantity_unit text NOT NULL,
  warehouse_code text NOT NULL,
  location_code text NOT NULL,
  to_warehouse_code text,
  to_location_code text,
  inventory_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source_type text,
  source_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS to_warehouse_code text;
ALTER TABLE public.inventory_transactions
  ADD COLUMN IF NOT EXISTS to_location_code text;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_part_no ON public.inventory_transactions (part_no);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_warehouse_code ON public.inventory_transactions (warehouse_code);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_occurred_at ON public.inventory_transactions (occurred_at);

COMMENT ON TABLE public.inventory_transactions IS '部品在庫の事実ログ（simple_managed 等）。真実はここ。MOVE は同一行に移動元・移動先を保持。';

COMMENT ON COLUMN public.inventory_transactions.warehouse_code IS '倉庫コード（移動元）。MOVE では from。';
COMMENT ON COLUMN public.inventory_transactions.location_code IS 'ロケーション（移動元）。MOVE では from。';
COMMENT ON COLUMN public.inventory_transactions.to_warehouse_code IS '移動先倉庫（MOVE 時。NULL 可）。';
COMMENT ON COLUMN public.inventory_transactions.to_location_code IS '移動先ロケーション（MOVE 時。NULL 可）。';

DROP TRIGGER IF EXISTS trigger_inventory_transactions_updated_at ON public.inventory_transactions;
CREATE TRIGGER trigger_inventory_transactions_updated_at
  BEFORE UPDATE ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_phase_b1_row_updated_at();

-- -----------------------------------------------------------------------------
-- 3. pallet_transactions（パレットイベント）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_unit_id uuid NOT NULL REFERENCES public.pallet_units (id) ON DELETE RESTRICT,
  transaction_type text NOT NULL,
  from_location_code text,
  to_location_code text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  source_type text,
  source_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pallet_transactions_pallet_unit_id ON public.pallet_transactions (pallet_unit_id);
CREATE INDEX IF NOT EXISTS idx_pallet_transactions_occurred_at ON public.pallet_transactions (occurred_at);

COMMENT ON TABLE public.pallet_transactions IS 'パレット在庫の事実ログ（pallet_managed）。';

-- -----------------------------------------------------------------------------
-- 4. pallet_item_links
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pallet_item_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pallet_unit_id uuid NOT NULL REFERENCES public.pallet_units (id) ON DELETE RESTRICT,
  part_no text NOT NULL,
  part_name text,
  quantity numeric NOT NULL,
  quantity_unit text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pallet_item_links_pallet_unit_id ON public.pallet_item_links (pallet_unit_id);
CREATE INDEX IF NOT EXISTS idx_pallet_item_links_part_no ON public.pallet_item_links (part_no);

COMMENT ON TABLE public.pallet_item_links IS 'パレットと部品の紐付け。';

DROP TRIGGER IF EXISTS trigger_pallet_item_links_updated_at ON public.pallet_item_links;
CREATE TRIGGER trigger_pallet_item_links_updated_at
  BEFORE UPDATE ON public.pallet_item_links
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_phase_b1_row_updated_at();

-- -----------------------------------------------------------------------------
-- 5. inventory_current（簡易現在庫・集約。真実ではない）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_current (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_no text NOT NULL,
  warehouse_code text NOT NULL,
  location_code text NOT NULL,
  inventory_type text NOT NULL,
  quantity_on_hand numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_inventory_current_natural_key UNIQUE NULLS NOT DISTINCT (part_no, warehouse_code, location_code, inventory_type)
);

CREATE INDEX IF NOT EXISTS idx_inventory_current_part_no ON public.inventory_current (part_no);

COMMENT ON TABLE public.inventory_current IS '集約キャッシュ。inventory_transactions 等から算出する想定。真実ではない。';

DROP TRIGGER IF EXISTS trigger_inventory_current_updated_at ON public.inventory_current;
CREATE TRIGGER trigger_inventory_current_updated_at
  BEFORE UPDATE ON public.inventory_current
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_phase_b1_row_updated_at();

-- -----------------------------------------------------------------------------
-- CHECK 制約（新規・既存のどちらも同じ手順）: 名前付きのみ。DROP してから ADD（再実行安全）
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    ALTER TABLE public.inventory_transactions
    DROP CONSTRAINT IF EXISTS chk_inventory_transactions_type;

    ALTER TABLE public.inventory_transactions
    ADD CONSTRAINT chk_inventory_transactions_type
    CHECK (transaction_type IN ('IN','OUT','MOVE','ADJUST'));
END $$;

DO $$
BEGIN
    ALTER TABLE public.inventory_transactions
    DROP CONSTRAINT IF EXISTS chk_inventory_transactions_quantity;

    ALTER TABLE public.inventory_transactions
    ADD CONSTRAINT chk_inventory_transactions_quantity
    CHECK (quantity >= 0);
END $$;

DO $$
BEGIN
    ALTER TABLE public.pallet_units
    DROP CONSTRAINT IF EXISTS chk_pallet_units_status;

    ALTER TABLE public.pallet_units
    ADD CONSTRAINT chk_pallet_units_status
    CHECK (status IN ('IN_STOCK','SHIPPED','CLOSED'));
END $$;

DO $$
BEGIN
    ALTER TABLE public.pallet_item_links
    DROP CONSTRAINT IF EXISTS chk_pallet_item_links_quantity;

    ALTER TABLE public.pallet_item_links
    ADD CONSTRAINT chk_pallet_item_links_quantity
    CHECK (quantity > 0);
END $$;

-- -----------------------------------------------------------------------------
-- inventory_current 集約キャッシュの自動更新（正本は inventory_transactions）
-- INSERT のみ。IN/OUT 現状維持。MOVE は Phase B-2: 移動元減算・移動先加算（同一 inventory_type）。
-- inventory_current は集約キャッシュであり真実ではない。
-- ADJUST は未対応（棚卸差異・補正ロジックは将来対応）。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.phase_b1_sync_inventory_current_from_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'IN' THEN
    INSERT INTO public.inventory_current (part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at)
    VALUES (NEW.part_no, NEW.warehouse_code, NEW.location_code, NEW.inventory_type, NEW.quantity, now())
    ON CONFLICT ON CONSTRAINT uq_inventory_current_natural_key DO UPDATE SET
      quantity_on_hand = public.inventory_current.quantity_on_hand + EXCLUDED.quantity_on_hand,
      updated_at = now();
  ELSIF NEW.transaction_type = 'OUT' THEN
    -- NOTE:
    -- 対象在庫が存在しない場合は何も更新されない（Phase B-1では許容）
    -- 将来的にはエラー or 補正対象とする
    UPDATE public.inventory_current
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - NEW.quantity),
        updated_at = now()
    WHERE part_no = NEW.part_no
      AND warehouse_code = NEW.warehouse_code
      AND location_code = NEW.location_code
      AND inventory_type = NEW.inventory_type;
  ELSIF NEW.transaction_type = 'MOVE' THEN
    IF NEW.to_warehouse_code IS NOT NULL AND NEW.to_location_code IS NOT NULL THEN
      -- MOVE: 1イベントで from/to を保持。移動元から減算（0 未満にしない）
      UPDATE public.inventory_current
      SET quantity_on_hand = GREATEST(0, quantity_on_hand - NEW.quantity),
          updated_at = now()
      WHERE part_no = NEW.part_no
        AND warehouse_code = NEW.warehouse_code
        AND location_code = NEW.location_code
        AND inventory_type = NEW.inventory_type;
      -- 移動先へ加算（なければ INSERT、あれば ON CONFLICT で加算）
      INSERT INTO public.inventory_current (part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at)
      VALUES (NEW.part_no, NEW.to_warehouse_code, NEW.to_location_code, NEW.inventory_type, NEW.quantity, now())
      ON CONFLICT ON CONSTRAINT uq_inventory_current_natural_key DO UPDATE SET
        quantity_on_hand = public.inventory_current.quantity_on_hand + EXCLUDED.quantity_on_hand,
        updated_at = now();
    END IF;
  ELSIF NEW.transaction_type = 'ADJUST' THEN
    -- ADJUSTは未対応（棚卸差異・補正ロジックは将来対応）
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.phase_b1_sync_inventory_current_from_transactions() IS
  'Phase B-1/B-2: inventory_transactions INSERT に応じて inventory_current を更新する集約キャッシュ用。真実は inventory_transactions。MOVE は移動元・移動先を反映。';

DROP TRIGGER IF EXISTS trigger_phase_b1_inventory_transactions_sync_inventory_current ON public.inventory_transactions;
CREATE TRIGGER trigger_phase_b1_inventory_transactions_sync_inventory_current
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.phase_b1_sync_inventory_current_from_transactions();

-- -----------------------------------------------------------------------------
-- MOVE 手動検証の例（Phase B-2）
-- 1) IN 100 を WH01 / LOC01 / inventory_type NORMAL に入れる
-- 2) MOVE 30 を from WH01・LOC01 → to WH01・LOC02（to_* 必須）で記録する
-- 3) inventory_current 期待: WH01/LOC01/NORMAL=70、WH01/LOC02/NORMAL=30
-- -----------------------------------------------------------------------------
