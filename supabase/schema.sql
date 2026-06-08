create table if not exists public.marketplace_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.marketplace_state enable row level security;

drop policy if exists "Backend service role can manage marketplace state" on public.marketplace_state;
create policy "Backend service role can manage marketplace state"
  on public.marketplace_state
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
