-- =============================================================================
-- Phase 2.1: scan_events に idempotency_key（クライアント再送・二重 POST 対策）
-- 前提: public.scan_events が存在すること（phase2_scan_foundation.sql）
-- =============================================================================

ALTER TABLE public.scan_events
  ADD COLUMN IF NOT EXISTS idempotency_key text;

COMMENT ON COLUMN public.scan_events.idempotency_key IS 'Phase2.1: リクエスト単位の冪等キー。NULL の行は従来どおり非冪等。';

CREATE UNIQUE INDEX IF NOT EXISTS uq_scan_events_idempotency_key
  ON public.scan_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
