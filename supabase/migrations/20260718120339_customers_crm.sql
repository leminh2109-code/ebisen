-- CRM nhẹ: sổ khách hàng + lịch sử mua để CHĂM SÓC & PHÂN TÍCH.
-- HOÀN TOÀN TÁCH khỏi doanh thu/tồn kho (không đụng sales, daily_revenue, shrimp).
--   - customers: nhận diện bằng SĐT (duy nhất) + tên + địa chỉ.
--   - customer_orders: mỗi lần mua (loại bánh, số lượng, ngày).

-- ============================================================================
-- 1. Bảng customers
-- ============================================================================
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  name        text,
  address     text,
  note        text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_at  timestamptz not null default now()
);
comment on table public.customers is 'Sổ khách hàng (CRM). Nhận diện bằng SĐT. Tách khỏi doanh thu.';

create trigger touch_customers before update on public.customers
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 2. Bảng customer_orders — mỗi lần mua của khách (chỉ để chăm sóc/phân tích)
-- ============================================================================
create table public.customer_orders (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null references public.customers (id) on delete cascade,
  order_date    date not null,
  menu_item_id  uuid references public.menu (id) on delete set null,
  cake_type     text,                                  -- snapshot tên loại bánh
  quantity      integer not null check (quantity > 0),
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id)
);
create index customer_orders_customer_idx on public.customer_orders (customer_id);
create index customer_orders_date_idx on public.customer_orders (order_date);
comment on table public.customer_orders is 'Lịch sử mua của khách (loại bánh, số lượng, ngày). KHÔNG tính vào doanh thu.';

-- ============================================================================
-- 3. RLS — như expenses: authenticated đọc/ghi/sửa, owner xóa
-- ============================================================================
alter table public.customers enable row level security;
alter table public.customer_orders enable row level security;

create policy "customers: authenticated đọc" on public.customers
  for select using (auth.uid() is not null);
create policy "customers: authenticated ghi" on public.customers
  for insert with check (auth.uid() is not null);
create policy "customers: authenticated sửa" on public.customers
  for update using (auth.uid() is not null);
create policy "customers: owner xóa" on public.customers
  for delete using (public.is_owner());

create policy "customer_orders: authenticated đọc" on public.customer_orders
  for select using (auth.uid() is not null);
create policy "customer_orders: authenticated ghi" on public.customer_orders
  for insert with check (auth.uid() is not null);
create policy "customer_orders: authenticated sửa" on public.customer_orders
  for update using (auth.uid() is not null);
create policy "customer_orders: owner xóa" on public.customer_orders
  for delete using (public.is_owner());

-- ============================================================================
-- 4. View customer_stats — mỗi khách kèm thống kê để chăm sóc
-- ============================================================================
create view public.customer_stats
with (security_invoker = on) as
  select
    c.id,
    c.phone,
    c.name,
    c.address,
    c.note,
    c.created_at,
    count(o.id)                                          as order_count,
    coalesce(sum(o.quantity), 0)                         as total_qty,
    min(o.order_date)                                    as first_order,
    max(o.order_date)                                    as last_order,
    mode() within group (order by o.cake_type)           as top_cake
  from public.customers c
  left join public.customer_orders o on o.customer_id = c.id
  group by c.id, c.phone, c.name, c.address, c.note, c.created_at
  order by max(o.order_date) desc nulls last;
comment on view public.customer_stats is 'Mỗi khách + thống kê: số lượt, tổng bánh, mua đầu/cuối, loại bánh hay mua.';
