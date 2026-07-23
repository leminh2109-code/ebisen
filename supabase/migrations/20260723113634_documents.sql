-- Lưu trữ tài liệu scan (giấy ĐKKD, an toàn thực phẩm, hợp đồng...)
-- File lưu trong Supabase Storage bucket "documents" (private).

-- ── Storage bucket ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,   -- 50 MB mỗi file
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do nothing;

-- Storage RLS: chỉ owner upload/xóa; mọi user đã đăng nhập xem được
create policy "documents_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and auth.uid() in (select id from public.profiles where role = 'owner')
  );

create policy "documents_authed_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and auth.uid() is not null
  );

create policy "documents_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and auth.uid() in (select id from public.profiles where role = 'owner')
  );

-- ── Table ─────────────────────────────────────────────────────────────────────
create table public.documents (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  category     text        not null default 'Khác',
  storage_path text        not null,
  file_name    text        not null,
  file_size    bigint,
  mime_type    text,
  notes        text,
  uploaded_by  uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.documents enable row level security;

-- Chỉ owner toàn quyền; staff không thấy tài liệu nội bộ
create policy "documents_owner_all" on public.documents
  for all using (
    auth.uid() in (select id from public.profiles where role = 'owner')
  )
  with check (
    auth.uid() in (select id from public.profiles where role = 'owner')
  );
