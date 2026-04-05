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
-- AFTER INSERT / AFTER UPDATE。UPDATE 時は OLD を打ち消してから NEW を反映。
-- IN/OUT/MOVE は既存設計。MOVE は from 減・to 加。quantity_on_hand は負にしない（GREATEST）。
-- ADJUST は未対応（棚卸差異・補正ロジックは将来対応）。
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.phase_b1_sync_apply_row_to_inventory_current(r public.inventory_transactions)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF r.transaction_type = 'IN' THEN
    INSERT INTO public.inventory_current (part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at)
    VALUES (r.part_no, r.warehouse_code, r.location_code, r.inventory_type, r.quantity, now())
    ON CONFLICT ON CONSTRAINT uq_inventory_current_natural_key DO UPDATE SET
      quantity_on_hand = public.inventory_current.quantity_on_hand + EXCLUDED.quantity_on_hand,
      updated_at = now();
  ELSIF r.transaction_type = 'OUT' THEN
    UPDATE public.inventory_current
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;
  ELSIF r.transaction_type = 'MOVE' THEN
    IF r.to_warehouse_code IS NOT NULL AND r.to_location_code IS NOT NULL THEN
      UPDATE public.inventory_current
      SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
          updated_at = now()
      WHERE part_no = r.part_no
        AND warehouse_code = r.warehouse_code
        AND location_code = r.location_code
        AND inventory_type = r.inventory_type;
      INSERT INTO public.inventory_current (part_no, warehouse_code, location_code, inventory_type, quantity_on_hand, updated_at)
      VALUES (r.part_no, r.to_warehouse_code, r.to_location_code, r.inventory_type, r.quantity, now())
      ON CONFLICT ON CONSTRAINT uq_inventory_current_natural_key DO UPDATE SET
        quantity_on_hand = public.inventory_current.quantity_on_hand + EXCLUDED.quantity_on_hand,
        updated_at = now();
    END IF;
  ELSIF r.transaction_type = 'ADJUST' THEN
    NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase_b1_sync_undo_row_from_inventory_current(r public.inventory_transactions)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF r.transaction_type = 'IN' THEN
    UPDATE public.inventory_current
    SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;
  ELSIF r.transaction_type = 'OUT' THEN
    UPDATE public.inventory_current
    SET quantity_on_hand = quantity_on_hand + r.quantity,
        updated_at = now()
    WHERE part_no = r.part_no
      AND warehouse_code = r.warehouse_code
      AND location_code = r.location_code
      AND inventory_type = r.inventory_type;
  ELSIF r.transaction_type = 'MOVE' THEN
    IF r.to_warehouse_code IS NOT NULL AND r.to_location_code IS NOT NULL THEN
      UPDATE public.inventory_current
      SET quantity_on_hand = quantity_on_hand + r.quantity,
          updated_at = now()
      WHERE part_no = r.part_no
        AND warehouse_code = r.warehouse_code
        AND location_code = r.location_code
        AND inventory_type = r.inventory_type;
      UPDATE public.inventory_current
      SET quantity_on_hand = GREATEST(0, quantity_on_hand - r.quantity),
          updated_at = now()
      WHERE part_no = r.part_no
        AND warehouse_code = r.to_warehouse_code
        AND location_code = r.to_location_code
        AND inventory_type = r.inventory_type;
    END IF;
  ELSIF r.transaction_type = 'ADJUST' THEN
    NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase_b1_sync_inventory_current_from_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM public.phase_b1_sync_undo_row_from_inventory_current(OLD);
  END IF;
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.phase_b1_sync_apply_row_to_inventory_current(NEW);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.phase_b1_sync_inventory_current_from_transactions() IS
  'inventory_transactions の INSERT/UPDATE の後に inventory_current を同期。apply/undo 補助関数あり。UPDATE は OLD undo の後に NEW apply。';

DROP TRIGGER IF EXISTS trigger_phase_b1_inventory_transactions_sync_inventory_current ON public.inventory_transactions;
CREATE TRIGGER trigger_phase_b1_inventory_transactions_sync_inventory_current
  AFTER INSERT OR UPDATE ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.phase_b1_sync_inventory_current_from_transactions();

-- -----------------------------------------------------------------------------
-- MOVE 手動検証の例（Phase B-2）
-- 1) IN 100 を WH01 / LOC01 / inventory_type NORMAL に入れる
-- 2) MOVE 30 を from WH01・LOC01 → to WH01・LOC02（to_* 必須）で記録する
-- 3) inventory_current 期待: WH01/LOC01/NORMAL=70、WH01/LOC02/NORMAL=30
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Phase B-1 負在庫防止: inventory_current を参照し OUT / MOVE を検証（BEFORE INSERT OR UPDATE）
-- 同期は AFTER INSERT OR UPDATE（本関数は BEFORE のみ）。
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.phase_b1_undo_old_effect_on_key(
  p_old public.inventory_transactions,
  p_part text,
  p_wh text,
  p_loc text,
  p_inv text
) RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_old.transaction_type = 'IN' THEN
    IF p_old.part_no = p_part
       AND p_old.warehouse_code = p_wh
       AND p_old.location_code = p_loc
       AND p_old.inventory_type = p_inv THEN
      RETURN -p_old.quantity;
    END IF;
  ELSIF p_old.transaction_type = 'OUT' THEN
    IF p_old.part_no = p_part
       AND p_old.warehouse_code = p_wh
       AND p_old.location_code = p_loc
       AND p_old.inventory_type = p_inv THEN
      RETURN p_old.quantity;
    END IF;
  ELSIF p_old.transaction_type = 'MOVE' THEN
    IF p_old.part_no = p_part
       AND p_old.warehouse_code = p_wh
       AND p_old.location_code = p_loc
       AND p_old.inventory_type = p_inv THEN
      RETURN p_old.quantity;
    END IF;
    IF p_old.to_warehouse_code IS NOT NULL
       AND p_old.to_location_code IS NOT NULL
       AND p_old.part_no = p_part
       AND p_old.to_warehouse_code = p_wh
       AND p_old.to_location_code = p_loc
       AND p_old.inventory_type = p_inv THEN
      RETURN -p_old.quantity;
    END IF;
  END IF;
  RETURN 0::numeric;
END;
$$;

CREATE OR REPLACE FUNCTION public.phase_b1_prevent_negative_inventory_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_available numeric;
  v_delta numeric;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION
      'phase_b1_negative_inventory: quantity must be positive (got %, transaction_type=%)',
      NEW.quantity,
      NEW.transaction_type
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.transaction_type NOT IN ('OUT', 'MOVE') THEN
    RETURN NEW;
  END IF;

  IF NEW.warehouse_code IS NULL OR NEW.location_code IS NULL THEN
    RAISE EXCEPTION
      'phase_b1_negative_inventory: OUT/MOVE require warehouse_code and location_code (transaction_type=%)',
      NEW.transaction_type
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.transaction_type = 'MOVE' THEN
    IF NEW.to_warehouse_code IS NULL OR NEW.to_location_code IS NULL THEN
      RAISE EXCEPTION
        'phase_b1_negative_inventory: MOVE requires to_warehouse_code and to_location_code (part_no=%)',
        NEW.part_no
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  SELECT COALESCE(SUM(quantity_on_hand), 0::numeric) INTO v_available
  FROM public.inventory_current
  WHERE part_no = NEW.part_no
    AND warehouse_code = NEW.warehouse_code
    AND location_code = NEW.location_code
    AND inventory_type = NEW.inventory_type;

  IF TG_OP = 'UPDATE' THEN
    v_delta := public.phase_b1_undo_old_effect_on_key(
      OLD,
      NEW.part_no,
      NEW.warehouse_code,
      NEW.location_code,
      NEW.inventory_type
    );
    v_available := v_available + v_delta;
  END IF;

  IF v_available < NEW.quantity THEN
    RAISE EXCEPTION
      'phase_b1_negative_inventory: insufficient stock movement_type=% required=% available=% part_no=% warehouse_code=% location_code=% inventory_type=%',
      NEW.transaction_type,
      NEW.quantity,
      v_available,
      NEW.part_no,
      NEW.warehouse_code,
      NEW.location_code,
      NEW.inventory_type
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.phase_b1_prevent_negative_inventory_transactions() IS
  'OUT/MOVE の出庫元で inventory_current に基づき負在庫を拒否。UPDATE 時は OLD 分をデルタで戻してから判定。phase_b1_undo_old_effect_on_key は OLD の影響をキー単位で打ち消すデルタ。';

DROP TRIGGER IF EXISTS trg_phase_b1_prevent_negative_inventory_transactions ON public.inventory_transactions;
CREATE TRIGGER trg_phase_b1_prevent_negative_inventory_transactions
  BEFORE INSERT OR UPDATE ON public.inventory_transactions
  FOR EACH ROW
  EXECUTE PROCEDURE public.phase_b1_prevent_negative_inventory_transactions();
