create table if not exists public.trip_resort (
  id         uuid primary key default gen_random_uuid(),
  trip_id    text not null unique,
  name       text,
  address    text,
  checkin    text,
  checkout   text,
  room_info  text,
  contact    text,
  notes      text,
  updated_at timestamptz default now()
);

alter table public.trip_resort enable row level security;

create policy "trip_resort anon select" on public.trip_resort
  for select using (true);

create policy "trip_resort anon insert" on public.trip_resort
  for insert with check (true);

create policy "trip_resort anon update" on public.trip_resort
  for update using (true) with check (true);
