-- Chuẩn hóa cột % chênh lệch thành DoD / WoW / MoM — mỗi kỳ so với ĐÚNG MỘT kỳ
-- liền trước (thay vì so với trung bình nhiều kỳ, dễ gây hiểu nhầm):
--   - DoD (ngày)  : hôm nay so với CÙNG THỨ tuần trước (lùi 7 ngày).
--   - WoW (tuần)  : tuần này so với tuần liền trước.  (đã đúng, giữ nguyên)
--   - MoM (tháng) : tháng này so với tháng liền trước. (mới)

-- ============================================================================
-- 1. Ngày: diff_pct = so với CÙNG THỨ tuần trước (revenue_1w)
-- ============================================================================
create or replace view public.revenue_by_day_compare
with (security_invoker = on) as
  with base as (
    select
      d.revenue_date          as day,
      d.revenue               as revenue,
      coalesce(d.cakes, 0)    as cakes,
      w1.revenue              as revenue_1w,
      w2.revenue              as revenue_2w,
      w3.revenue              as revenue_3w
    from public.daily_revenue d
    left join public.daily_revenue w1 on w1.revenue_date = d.revenue_date - 7
    left join public.daily_revenue w2 on w2.revenue_date = d.revenue_date - 14
    left join public.daily_revenue w3 on w3.revenue_date = d.revenue_date - 21
  ),
  avged as (
    select
      base.*,
      round(
        (coalesce(revenue_1w, 0) + coalesce(revenue_2w, 0) + coalesce(revenue_3w, 0))::numeric
        / nullif(
            (revenue_1w is not null)::int
          + (revenue_2w is not null)::int
          + (revenue_3w is not null)::int, 0)
      ) as avg_prev
    from base
  )
  select
    day,
    extract(isodow from day)::int as weekday,
    revenue,
    cakes,
    revenue_1w,
    revenue_2w,
    revenue_3w,
    avg_prev,
    -- DoD: so với cùng thứ TUẦN TRƯỚC (không phải trung bình 3 tuần nữa).
    case when revenue_1w > 0
      then round((revenue - revenue_1w) / revenue_1w * 100, 1)
    end as diff_pct
  from avged
  order by day desc;
comment on view public.revenue_by_day_compare is
  'Doanh thu mỗi ngày + cùng thứ 1/2/3 tuần trước. diff_pct = DoD (so cùng thứ tuần trước).';

-- ============================================================================
-- 2. Tháng: thêm doanh thu tháng trước + MoM
--    (create or replace chỉ được THÊM cột ở CUỐI — giữ nguyên 4 cột đầu)
-- ============================================================================
create or replace view public.revenue_by_month
with (security_invoker = on) as
  with m as (
    select
      date_trunc('month', revenue_date)::date as month,
      count(*)                                as days,
      sum(revenue)                            as revenue,
      coalesce(sum(cakes), 0)                 as cakes
    from public.daily_revenue
    group by date_trunc('month', revenue_date)
  ),
  lagged as (
    select
      m.*,
      lag(revenue) over (order by month) as revenue_prev
    from m
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
  'Doanh thu mỗi tháng + tháng liền trước và MoM (% so tháng trước).';
