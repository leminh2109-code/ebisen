-- ebisen — thêm bảng Thực đơn (menu) để quản lý giá tập trung.
--
-- Vấn đề gốc: giá không nên gắn cứng vào loại bánh bằng công thức (đổi giá làm
-- sai lịch sử). Giải pháp:
--   - menu = nguồn giá HIỆN TẠI (đổi được bất cứ lúc nào).
--   - sales.unit_price + sales.cake_type = SNAPSHOT tại thời điểm bán (cố định).
--     Đổi giá menu KHÔNG ảnh hưởng sales cũ.
--   - sales.menu_item_id = link tới menu (để phân tích + form tự điền giá).
--
-- (Chạy trong SQL Editor sau 0002_redesign.sql.)

-- ============================================================================
-- 1. Bảng MENU (Thực đơn)
-- ============================================================================
create table public.menu (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  price       numeric(14, 2) not null default 0 check (price >= 0),
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.menu is 'Thực đơn: giá HIỆN TẠI của từng món. Đổi giá ở đây không ảnh hưởng sales cũ (sales lưu snapshot).';

create trigger touch_menu before update on public.menu
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 2. Link sales -> menu (giữ nguyên snapshot cake_type + unit_price + amount)
-- ============================================================================
alter table public.sales
  add column menu_item_id uuid references public.menu (id) on delete set null;
create index sales_menu_item_idx on public.sales (menu_item_id);

-- ============================================================================
-- 3. RLS
-- ============================================================================
alter table public.menu enable row level security;

create policy "menu: authenticated đọc" on public.menu
  for select using (auth.uid() is not null);
create policy "menu: owner thêm" on public.menu
  for insert with check (public.is_owner());
create policy "menu: owner sửa" on public.menu
  for update using (public.is_owner());
create policy "menu: owner xóa" on public.menu
  for delete using (public.is_owner());

-- ============================================================================
-- 4. SEED menu từ sales hiện có: giá MỚI NHẤT mỗi loại bánh
--    (bỏ qua bản ghi trống loại bánh / giá 0)
-- ============================================================================
insert into public.menu (name, price)
select distinct on (cake_type) cake_type, unit_price
from public.sales
where cake_type is not null and cake_type <> '' and unit_price > 0
order by cake_type, sale_date desc, sold_at desc
on conflict (name) do nothing;

-- ============================================================================
-- 5. BACKFILL: link sales cũ tới menu theo tên loại bánh
-- ============================================================================
update public.sales s
set menu_item_id = m.id
from public.menu m
where s.cake_type = m.name and s.menu_item_id is null;
