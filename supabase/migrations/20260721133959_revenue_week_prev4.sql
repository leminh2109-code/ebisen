-- Thêm cột revenue_prev4 (doanh thu cùng kỳ 4 tuần trước) vào revenue_by_week.
-- Phải drop trước vì Postgres không cho thêm cột vào giữa bằng CREATE OR REPLACE VIEW.
drop view if exists public.revenue_by_week;
create view public.revenue_by_week
with (security_invoker = on) as
  with wk as (
    select
      date_trunc('week', revenue_date)::date as week_start,
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
      lag(revenue, 3) over (order by week_start) as revenue_prev3,
      lag(revenue, 4) over (order by week_start) as revenue_prev4
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
    revenue_prev4,
    case when revenue_prev1 > 0
      then round((revenue - revenue_prev1) / revenue_prev1 * 100, 1)
    end as diff_pct
  from lagged
  order by week_start desc;

comment on view public.revenue_by_week is
  'Doanh thu mỗi tuần (T2–CN) + doanh thu 1/2/3/4 tuần trước và % chênh so tuần liền trước.';
