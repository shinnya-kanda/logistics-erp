create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  scanned_code text not null,
  scan_type text not null,
  created_at timestamptz default now(),
  idempotency_key text
);

create unique index if not exists scan_events_idempotency_key_idx
on public.scan_events (idempotency_key)
where idempotency_key is not null;