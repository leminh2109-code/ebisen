-- ebisen — Quản lý TỒN KHO TÔM (chỉ theo dõi SỐ LƯỢNG, không đụng chi phí/P&L).
--
-- Mô hình:
--   - menu.shrimp_per_unit = số CON tôm mỗi bánh (bánh 1 tôm = 1, bánh 2 tôm = 2).
--   - shrimp_purchases      = mỗi lần NHẬP tôm (kg + size con/kg → tự tính số con).
--   - Tôm ĐÃ DÙNG = Σ (sales.quantity × menu.shrimp_per_unit).
--   - Tồn kho hiện tại = tổng nhập − tổng dùng (tính TỪ ngày nhập đầu tiên, để
--     doanh số lịch sử trước khi bắt đầu theo dõi kho không làm âm tồn).
--
-- Toàn bộ số liệu tính ở view (nguyên tắc kiến trúc: không tính ở React).

-- ============================================================================
-- 1. menu.shrimp_per_unit — số con tôm mỗi bánh
-- ============================================================================
alter table public.menu
  add column shrimp_per_unit integer not null default 0
    check (shrimp_per_unit >= 0);
comment on column public.menu.shrimp_per_unit is
  'Số con tôm dùng cho mỗi bánh của món này (để tính tôm đã dùng cho tồn kho).';

-- Set sẵn theo tên: bánh "2 tôm" = 2 con, bánh "1 tôm" = 1 con. Owner chỉnh lại
-- được ở trang Thực đơn.
update public.menu set shrimp_per_unit = 2 where name ilike '%2 tôm%';
update public.menu set shrimp_per_unit = 1 where name ilike '%1 tôm%' and shrimp_per_unit = 0;

-- ============================================================================
-- 2. shrimp_purchases — mỗi lần nhập tôm
-- ============================================================================
create table public.shrimp_purchases (
  id             uuid primary key default gen_random_uuid(),
  purchase_date  date not null,
  kg             numeric(10, 2) not null check (kg > 0),      -- số kg nhập
  size_per_kg    integer not null check (size_per_kg > 0),     -- size: con/kg
  shrimp_count   integer generated always as (round(kg * size_per_kg)::integer) stored, -- số con
  note           text,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id)
);
create index shrimp_purchases_date_idx on public.shrimp_purchases (purchase_date);
comment on table public.shrimp_purchases is
  'Mỗi lần nhập tôm (kg + size con/kg). shrimp_count = kg × size tự tính. Chỉ theo dõi số lượng tồn kho, không liên quan chi phí/P&L.';

-- ============================================================================
-- 3. RLS — như expenses: authenticated đọc/ghi/sửa, owner xóa
-- ============================================================================
alter table public.shrimp_purchases enable row level security;

create policy "shrimp_purchases: authenticated đọc" on public.shrimp_purchases
  for select using (auth.uid() is not null);
create policy "shrimp_purchases: authenticated ghi" on public.shrimp_purchases
  for insert with check (auth.uid() is not null);
create policy "shrimp_purchases: authenticated sửa" on public.shrimp_purchases
  for update using (auth.uid() is not null);
create policy "shrimp_purchases: owner xóa" on public.shrimp_purchases
  for delete using (public.is_owner());

-- ============================================================================
-- 4. VIEWS (security_invoker = on)
-- ============================================================================

-- Tôm nhập theo tháng
create view public.shrimp_purchased_by_month
with (security_invoker = on) as
  select
    date_trunc('month', purchase_date)::date as month,
    count(*)                                  as purchase_count,
    coalesce(sum(kg), 0)                      as kg,
    coalesce(sum(shrimp_count), 0)            as shrimp_in
  from public.shrimp_purchases
  group by date_trunc('month', purchase_date)
  order by month;

-- Tôm đã dùng theo tháng (= Σ số lượng bán × số con mỗi bánh)
create view public.shrimp_used_by_month
with (security_invoker = on) as
  select
    date_trunc('month', s.sale_date)::date              as month,
    coalesce(sum(s.quantity * m.shrimp_per_unit), 0)    as shrimp_used
  from public.sales s
  join public.menu m on m.id = s.menu_item_id
  where m.shrimp_per_unit > 0
  group by date_trunc('month', s.sale_date)
  order by month;

-- Tồn kho hiện tại (tổng cộng dồn toàn thời gian, tính từ ngày nhập đầu tiên)
create view public.shrimp_inventory
with (security_invoker = on) as
  with ins as (
    select
      coalesce(sum(shrimp_count), 0)::bigint as total_in,
      coalesce(sum(kg), 0)                   as total_kg,
      min(purchase_date)                     as start_date
    from public.shrimp_purchases
  ),
  used as (
    select coalesce(sum(s.quantity * m.shrimp_per_unit), 0)::bigint as total_used
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where m.shrimp_per_unit > 0
      and s.sale_date >= (select start_date from ins)
  )
  select
    ins.total_in,
    ins.total_kg,
    used.total_used,
    ins.total_in - used.total_used as on_hand,
    ins.start_date
  from ins, used;
