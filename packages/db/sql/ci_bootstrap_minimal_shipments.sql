-- =============================================================================
-- CI / 空の Postgres 向け: 既存 SQL が前提とする public.shipments の最小スキーマ
-- 本番 Supabase では既存テーブルがあるため通常は不要。
-- 適用順: このファイルの直後に create_inventory_and_stock_movements.sql 以降
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_no text NOT NULL,
  supplier text NOT NULL,
  part_no text NOT NULL,
  part_name text,
  quantity numeric,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
