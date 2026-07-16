-- ebisen — thêm bảng Nhân viên (employees) + liên kết với sales.
--
-- Trước đây `sales.staff` chỉ là text nhập tay → dễ sai chính tả, khó thống kê theo
-- người. Giải pháp (giống pattern menu):
--   - employees = danh sách nhân viên (nguồn chính, quản lý tập trung).
--   - sales.staff_id = link tới employees (để dropdown form + phân tích theo NV).
--   - sales.staff = SNAPSHOT tên NV tại thời điểm bán (giữ nguyên, không đổi khi
--     sửa/xóa nhân viên) — nhất quán với snapshot cake_type/unit_price.
--
-- (Chạy trong SQL Editor sau 0003_menu.sql.)

-- ============================================================================
-- 1. Bảng EMPLOYEES (Nhân viên)
-- ============================================================================
create table public.employees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  phone       text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.employees is 'Nhân viên: danh sách để chọn trong form nhập bán hàng. sales.staff giữ snapshot tên lúc bán.';

create trigger touch_employees before update on public.employees
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 2. Link sales -> employees (giữ nguyên snapshot sales.staff)
-- ============================================================================
alter table public.sales
  add column staff_id uuid references public.employees (id) on delete set null;
create index sales_staff_idx on public.sales (staff_id);

-- ============================================================================
-- 3. RLS
-- ============================================================================
alter table public.employees enable row level security;

create policy "employees: authenticated đọc" on public.employees
  for select using (auth.uid() is not null);
create policy "employees: owner thêm" on public.employees
  for insert with check (public.is_owner());
create policy "employees: owner sửa" on public.employees
  for update using (public.is_owner());
create policy "employees: owner xóa" on public.employees
  for delete using (public.is_owner());

-- ============================================================================
-- 4. SEED employees từ sales.staff hiện có (bỏ trống/rỗng)
-- ============================================================================
insert into public.employees (name)
select distinct trim(staff)
from public.sales
where staff is not null and trim(staff) <> ''
on conflict (name) do nothing;

-- ============================================================================
-- 5. BACKFILL: link sales cũ tới employees theo tên
-- ============================================================================
update public.sales s
set staff_id = e.id
from public.employees e
where trim(s.staff) = e.name and s.staff_id is null;
