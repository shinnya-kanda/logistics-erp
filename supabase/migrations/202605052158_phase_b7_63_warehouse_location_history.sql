create table if not exists public.warehouse_location_history (
  id uuid primary key default gen_random_uuid(),
  warehouse_code text not null,
  location_code text not null,
  action_type text not null,
  before_data jsonb,
  after_data jsonb,
  operator_id text,
  operator_role text,
  created_at timestamptz default now()
);