-- =============================================================================
-- 物流ERP: idempotency_key 追加（stock_movements / trace_events の二重登録防止）
-- =============================================================================

-- stock_movements
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_movements_idempotency_key
  ON public.stock_movements (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.stock_movements.idempotency_key IS '冪等キー。同一キーでの再 insert 時は既存行を返す想定。例: RECEIPT:{shipment_id}:IN';

-- trace_events
ALTER TABLE public.trace_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_trace_events_idempotency_key
  ON public.trace_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.trace_events.idempotency_key IS '冪等キー。同一キーでの再 insert 時は既存行を返す想定。例: IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED';
