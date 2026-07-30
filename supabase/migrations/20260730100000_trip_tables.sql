-- Bảng chi phí chuyến đi
create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  paid_by text not null,
  amount numeric(12,0) not null check (amount > 0),
  description text not null,
  split_between text[] not null,
  created_at timestamptz default now()
);

alter table public.trip_expenses enable row level security;

create policy "trip_expenses anon select" on public.trip_expenses
  for select using (true);

create policy "trip_expenses anon insert" on public.trip_expenses
  for insert with check (true);

-- Bảng ảnh chuyến đi
create table if not exists public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null,
  storage_path text not null,
  public_url text not null,
  uploaded_by text,
  caption text,
  created_at timestamptz default now()
);

alter table public.trip_photos enable row level security;

create policy "trip_photos anon select" on public.trip_photos
  for select using (true);

create policy "trip_photos anon insert" on public.trip_photos
  for insert with check (true);

-- Storage bucket cho ảnh chuyến đi (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-photos',
  'trip-photos',
  true,
  15728640,  -- 15 MB
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
) on conflict (id) do nothing;

create policy "trip_photos storage select" on storage.objects
  for select using (bucket_id = 'trip-photos');

create policy "trip_photos storage insert" on storage.objects
  for insert with check (bucket_id = 'trip-photos');
