-- =============================================================================
-- Phase 0: trace_events 冪等性の完成
-- - 既存重複削除（shipment_id + event_type で一意に残す）
-- - idempotency_key カラム追加
-- - unique index (shipment_id, event_type)
-- - unique index (idempotency_key) where not null
-- =============================================================================

-- 1. 重複削除（同一 shipment_id + event_type のうち id が大きい方を削除）
DELETE FROM public.trace_events a
USING public.trace_events b
WHERE a.id > b.id
  AND ((a.shipment_id IS NULL AND b.shipment_id IS NULL) OR (a.shipment_id = b.shipment_id))
  AND a.event_type = b.event_type;

-- 2. idempotency_key カラム追加
ALTER TABLE public.trace_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- 3. (shipment_id, event_type) の unique index（importer 再実行で重複しないようにする）
--    PostgreSQL では NULL は unique 上で互いに異なる扱いのため、(NULL, X) は複数行許容される
DROP INDEX IF EXISTS public.uniq_trace_event;
CREATE UNIQUE INDEX uniq_trace_event
  ON public.trace_events (shipment_id, event_type);

-- 4. idempotency_key の partial unique index（既存の別名 index があれば削除して統一）
DROP INDEX IF EXISTS public.uq_trace_events_idempotency_key;
DROP INDEX IF EXISTS public.uniq_trace_event_idempotency_key;
CREATE UNIQUE INDEX uniq_trace_event_idempotency_key
  ON public.trace_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN public.trace_events.idempotency_key IS 'Phase 0: 冪等キー。例 IMPORTER_INIT:{shipment_id}:SHIPPER_CONFIRMED。同一キーでは既存行を返す。';
