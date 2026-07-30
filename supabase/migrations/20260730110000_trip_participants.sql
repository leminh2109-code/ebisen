-- Bảng gia đình + thành viên chuyến đi
create table if not exists public.trip_participants (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  family_name text not null,
  members text[] not null default '{}',
  created_at timestamptz default now(),
  unique(trip_id, family_name)
);

alter table public.trip_participants enable row level security;

create policy "trip_participants anon select" on public.trip_participants
  for select using (true);

create policy "trip_participants anon insert" on public.trip_participants
  for insert with check (true);

create policy "trip_participants anon update" on public.trip_participants
  for update using (true) with check (true);
