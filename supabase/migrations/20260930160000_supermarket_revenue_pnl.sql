-- Doanh thu siêu thị vào P&L.
-- 1. Thêm price_per_box (VND/hộp) vào supermarket_batches — mặc định 210.000.
-- 2. Rebuild revenue_by_month = DT quầy (daily_revenue) + DT siêu thị (sold × price_per_box).
-- 3. pnl_by_month và station_share tự động cập nhật vì dùng revenue_by_month.

-- ── 1. Cột giá hộp ─────────────────────────────────────────────────────────
alter table public.supermarket_batches
  add column if not exists price_per_box integer not null default 210000;

comment on column public.supermarket_batches.price_per_box is
  'Giá bán lẻ mỗi hộp tại siêu thị (VND). Mặc định 210.000 = giá Hộp 3 bánh.';

-- ── 2. Rebuild revenue_by_month ─────────────────────────────────────────────
create or replace view public.revenue_by_month
with (security_invoker = on) as
  with counter as (
    select
      date_trunc('month', revenue_date)::date as month,
      count(*)                                as days,
      sum(revenue)                            as counter_revenue,
      coalesce(sum(cakes), 0)                 as cakes
    from public.daily_revenue
    group by date_trunc('month', revenue_date)
  ),
  supermarket as (
    select
      date_trunc('month', batch_date)::date                     as month,
      coalesce(sum(quantity_sold * price_per_box), 0)::numeric  as supermarket_revenue
    from public.supermarket_batches
    where coalesce(quantity_sold, 0) > 0
    group by date_trunc('month', batch_date)
  ),
  combined as (
    select
      coalesce(c.month, s.month)                                      as month,
      coalesce(c.days, 0)                                             as days,
      coalesce(c.counter_revenue, 0) + coalesce(s.supermarket_revenue, 0) as revenue,
      coalesce(c.cakes, 0)                                            as cakes
    from counter c
    full outer join supermarket s on s.month = c.month
  ),
  lagged as (
    select
      combined.*,
      lag(revenue) over (order by month) as revenue_prev
    from combined
  )
  select
    month,
    days,
    revenue,
    cakes,
    revenue_prev,
    case when revenue_prev > 0
      then round((revenue - revenue_prev) / revenue_prev * 100, 1)
    end as diff_pct
  from lagged
  order by month;

comment on view public.revenue_by_month is
  'DT tháng = quầy (daily_revenue) + siêu thị (quantity_sold × price_per_box). Kèm MoM %.';
