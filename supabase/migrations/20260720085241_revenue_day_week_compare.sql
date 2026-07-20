-- Doanh thu NGÀY và TUẦN kèm cột so sánh. Mọi phép tính (so sánh, trung bình,
-- % chênh) nằm TRONG VIEW — frontend chỉ hiển thị.
--   - revenue_by_day_compare : mỗi ngày + doanh thu CÙNG THỨ của 1/2/3 tuần trước
--                              (vd CN so với 3 Chủ nhật liền trước).
--   - revenue_by_week        : mỗi tuần (T2–CN) + doanh thu 1/2/3 tuần trước.
-- Nguồn: daily_revenue (nguồn doanh thu chính thức).

-- ============================================================================
-- 1. Doanh thu theo NGÀY + so sánh cùng thứ các tuần trước
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
    -- cùng thứ tuần trước = lùi đúng 7/14/21 ngày
    left join public.daily_revenue w1 on w1.revenue_date = d.revenue_date - 7
    left join public.daily_revenue w2 on w2.revenue_date = d.revenue_date - 14
    left join public.daily_revenue w3 on w3.revenue_date = d.revenue_date - 21
  ),
  avged as (
    select
      base.*,
      -- TB các tuần trước: chỉ chia cho số tuần THỰC SỰ có dữ liệu.
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
    extract(isodow from day)::int as weekday,   -- 1=Thứ 2 … 7=Chủ nhật
    revenue,
    cakes,
    revenue_1w,
    revenue_2w,
    revenue_3w,
    avg_prev,
    case when avg_prev > 0
      then round((revenue - avg_prev) / avg_prev * 100, 1)
    end as diff_pct
  from avged
  order by day desc;
comment on view public.revenue_by_day_compare is
  'Doanh thu mỗi ngày + doanh thu CÙNG THỨ của 1/2/3 tuần trước, TB và % chênh.';

-- ============================================================================
-- 2. Doanh thu theo TUẦN (T2–CN) + so sánh các tuần trước
-- ============================================================================
create or replace view public.revenue_by_week
with (security_invoker = on) as
  with wk as (
    select
      date_trunc('week', revenue_date)::date as week_start,  -- Postgres: tuần bắt đầu Thứ 2
      sum(revenue)                           as revenue,
      coalesce(sum(cakes), 0)                as cakes,
      count(*)                               as days
    from public.daily_revenue
    group by date_trunc('week', revenue_date)
  ),
  lagged as (
    select
      week_start,
      (week_start + 6)::date as week_end,
      days,
      cakes,
      revenue,
      lag(revenue, 1) over (order by week_start) as revenue_prev1,
      lag(revenue, 2) over (order by week_start) as revenue_prev2,
      lag(revenue, 3) over (order by week_start) as revenue_prev3
    from wk
  )
  select
    week_start,
    week_end,
    days,
    cakes,
    revenue,
    revenue_prev1,
    revenue_prev2,
    revenue_prev3,
    case when revenue_prev1 > 0
      then round((revenue - revenue_prev1) / revenue_prev1 * 100, 1)
    end as diff_pct
  from lagged
  order by week_start desc;
comment on view public.revenue_by_week is
  'Doanh thu mỗi tuần (T2–CN) + doanh thu 1/2/3 tuần trước và % chênh so tuần liền trước.';
