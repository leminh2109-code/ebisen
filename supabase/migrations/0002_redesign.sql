-- ebisen — thiết kế lại schema cho khớp base Airtable thật (tiệm bán bánh tôm).
--
-- Thay model invoices/customers (đoán sai) bằng model thật:
--   sales         ← "Ghi nhận bán hàng" (từng lần bán: loại bánh, SL, đơn giá)
--   daily_revenue ← "Doanh thu tháng"   (doanh thu ngày + số bánh/tôm/thời tiết)
--   expenses      ← "Chi phí tháng"     (chi phí + danh mục + trung tâm chi phí)
--
-- NGUỒN DOANH THU CHÍNH THỨC = daily_revenue.
--   - Lịch sử: nạp từ Airtable "Doanh thu ngày" (source='airtable', được bảo vệ).
--   - Tương lai: nhân viên nhập sales → trigger tự tính doanh thu ngày = tổng sales
--     hôm đó (source='auto'). Ngày lịch sử KHÔNG bị ghi đè.
--
-- Giữ nguyên: profiles, is_owner(), handle_new_user(), touch_updated_at(), enum user_role.
-- (Chạy file này trong SQL Editor sau khi đã chạy 0001_init.sql.)

-- ============================================================================
-- 1. Gỡ model cũ (giữ profiles + các function)
-- ============================================================================
drop view if exists public.pnl_by_month cascade;
drop view if exists public.expenses_by_month_category cascade;
drop view if exists public.expenses_by_month cascade;
drop view if exists public.revenue_by_month cascade;
drop view if exists public.revenue_by_day cascade;

drop table if exists public.invoices cascade;
drop table if exists public.expenses cascade;
drop table if exists public.customers cascade;
drop table if exists public.expense_categories cascade;

-- ============================================================================
-- 2. SALES — từng lần bán (line item)
-- ============================================================================
create table public.sales (
  id             uuid primary key default gen_random_uuid(),
  sold_at        timestamptz not null default now(),
  sale_date      date not null,
  cake_type      text,
  quantity       numeric(10, 2) not null default 1 check (quantity >= 0),
  unit_price     numeric(14, 2) not null default 0 check (unit_price >= 0),
  amount         numeric(14, 2) not null check (amount >= 0),
  source         text,             -- Nguồn bán: TM, ...
  customer_type  text,             -- Loại khách hàng
  staff          text,             -- Nhân viên bán
  note           text,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id)
);
create index sales_sale_date_idx on public.sales (sale_date);
comment on table public.sales is 'Từng lần bán. amount = quantity × unit_price (VND). Nguồn granular cho doanh thu.';

-- ============================================================================
-- 3. DAILY_REVENUE — doanh thu ngày (NGUỒN CHÍNH THỨC cho P&L)
-- ============================================================================
create table public.daily_revenue (
  revenue_date     date primary key,
  revenue          numeric(14, 2) not null default 0 check (revenue >= 0),
  cakes            integer,          -- Số bánh
  shrimp_used      integer,          -- Số tôm sử dụng
  weather          text,             -- Thời tiết
  station_traffic  integer,          -- Lưu lượng trạm
  note             text,
  source           text not null default 'auto',  -- 'airtable' (lịch sử, bảo vệ) | 'auto' (tính từ sales) | 'manual'
  updated_at       timestamptz not null default now()
);
comment on table public.daily_revenue is 'Doanh thu ngày, nguồn chính thức cho P&L. source=airtable được bảo vệ khỏi trigger.';
comment on column public.daily_revenue.source is 'airtable=nạp từ lịch sử (bảo vệ); auto=trigger tính từ sales; manual=owner sửa tay';

-- ============================================================================
-- 4. EXPENSES — chi phí
-- ============================================================================
create table public.expenses (
  id             uuid primary key default gen_random_uuid(),
  expense_date   date not null,
  amount         numeric(14, 2) not null check (amount >= 0),
  category       text,             -- Danh mục chi phí
  expense_type   text,             -- Loại chi phí: Cố định / Biến đổi
  cost_center    text,             -- Trung tâm chi phí
  description    text,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id)
);
create index expenses_expense_date_idx on public.expenses (expense_date);
comment on table public.expenses is 'Chi phí (VND) + danh mục, loại (cố định/biến đổi), trung tâm chi phí.';

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================
create trigger touch_sales before update on public.sales
  for each row execute function public.touch_updated_at();
create trigger touch_expenses before update on public.expenses
  for each row execute function public.touch_updated_at();

-- Tự đồng bộ doanh thu ngày = tổng sales hôm đó — CHỈ với ngày không phải lịch sử.
create or replace function public.sync_daily_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := coalesce(new.sale_date, old.sale_date);
  existing_source text;
  agg_revenue numeric;
  agg_cakes numeric;
begin
  select source into existing_source from public.daily_revenue where revenue_date = d;

  -- Ngày lịch sử (nạp từ Airtable) hoặc owner sửa tay: KHÔNG đụng vào.
  if existing_source in ('airtable', 'manual') then
    return null;
  end if;

  select coalesce(sum(amount), 0), coalesce(sum(quantity), 0)
    into agg_revenue, agg_cakes
    from public.sales where sale_date = d;

  if agg_revenue = 0 then
    -- Không còn sales ngày đó (và không phải ngày lịch sử) → xóa dòng auto.
    delete from public.daily_revenue where revenue_date = d and source = 'auto';
  else
    insert into public.daily_revenue (revenue_date, revenue, cakes, source, updated_at)
    values (d, agg_revenue, agg_cakes::int, 'auto', now())
    on conflict (revenue_date) do update
      set revenue = excluded.revenue,
          cakes = excluded.cakes,
          source = 'auto',
          updated_at = now();
  end if;
  return null;
end;
$$;

create trigger sync_daily_revenue_ins_upd
  after insert or update on public.sales
  for each row execute function public.sync_daily_revenue();
create trigger sync_daily_revenue_del
  after delete on public.sales
  for each row execute function public.sync_daily_revenue();

-- ============================================================================
-- 6. VIEWS BÁO CÁO (security_invoker = on)
-- ============================================================================

-- Doanh thu theo ngày (từ daily_revenue = nguồn chính thức)
create view public.revenue_by_day
with (security_invoker = on) as
  select revenue_date as day, revenue, cakes, shrimp_used, station_traffic, weather
  from public.daily_revenue
  order by revenue_date;

-- Doanh thu theo tháng
create view public.revenue_by_month
with (security_invoker = on) as
  select
    date_trunc('month', revenue_date)::date as month,
    count(*)                                 as days,
    sum(revenue)                             as revenue,
    coalesce(sum(cakes), 0)                  as cakes
  from public.daily_revenue
  group by date_trunc('month', revenue_date)
  order by month;

-- Bán hàng theo tháng (từ sales — để so sánh / phân tích)
create view public.sales_by_month
with (security_invoker = on) as
  select
    date_trunc('month', sale_date)::date as month,
    count(*)                              as sale_count,
    sum(quantity)                         as quantity,
    sum(amount)                           as amount
  from public.sales
  group by date_trunc('month', sale_date)
  order by month;

-- Chi phí theo tháng
create view public.expenses_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    count(*)                                as expense_count,
    sum(amount)                             as expenses
  from public.expenses
  group by date_trunc('month', expense_date)
  order by month;

-- Chi phí theo tháng + danh mục
create view public.expenses_by_month_category
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    coalesce(category, '(chưa phân loại)')  as category,
    sum(amount)                             as expenses
  from public.expenses
  group by date_trunc('month', expense_date), category
  order by month;

-- P&L theo tháng: doanh thu (daily_revenue) - chi phí
create view public.pnl_by_month
with (security_invoker = on) as
  with months as (
    select month from public.revenue_by_month
    union
    select month from public.expenses_by_month
  )
  select
    m.month,
    coalesce(r.revenue, 0)                            as revenue,
    coalesce(x.expenses, 0)                           as expenses,
    coalesce(r.revenue, 0) - coalesce(x.expenses, 0)  as profit
  from months m
  left join public.revenue_by_month  r on r.month = m.month
  left join public.expenses_by_month x on x.month = m.month
  order by m.month;

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================
alter table public.sales         enable row level security;
alter table public.daily_revenue enable row level security;
alter table public.expenses      enable row level security;

-- sales: authenticated đọc/ghi/sửa; owner xóa
create policy "sales: authenticated đọc" on public.sales
  for select using (auth.uid() is not null);
create policy "sales: authenticated ghi" on public.sales
  for insert with check (auth.uid() is not null);
create policy "sales: authenticated sửa" on public.sales
  for update using (auth.uid() is not null);
create policy "sales: owner xóa" on public.sales
  for delete using (public.is_owner());

-- daily_revenue: authenticated đọc; owner sửa tay (trigger tự ghi qua SECURITY DEFINER)
create policy "daily: authenticated đọc" on public.daily_revenue
  for select using (auth.uid() is not null);
create policy "daily: owner ghi" on public.daily_revenue
  for insert with check (public.is_owner());
create policy "daily: owner sửa" on public.daily_revenue
  for update using (public.is_owner());
create policy "daily: owner xóa" on public.daily_revenue
  for delete using (public.is_owner());

-- expenses: authenticated đọc/ghi/sửa; owner xóa
create policy "expenses: authenticated đọc" on public.expenses
  for select using (auth.uid() is not null);
create policy "expenses: authenticated ghi" on public.expenses
  for insert with check (auth.uid() is not null);
create policy "expenses: authenticated sửa" on public.expenses
  for update using (auth.uid() is not null);
create policy "expenses: owner xóa" on public.expenses
  for delete using (public.is_owner());
