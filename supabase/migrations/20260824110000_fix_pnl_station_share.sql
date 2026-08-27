-- Khôi phục station_share (30% doanh thu cho trạm) vào pnl_by_month.
-- Bị mất khi rebuild view trong migration 20260820053751_no_bag_sales.sql.

drop view if exists public.pnl_by_month;
create view public.pnl_by_month
with (security_invoker = on) as
  with months as (
    select month from public.revenue_by_month
    union select month from public.expenses_by_month
    union select month from public.material_cost_by_month
  )
  select
    m.month,
    coalesce(r.revenue, 0)                                                              as revenue,
    coalesce(x.expenses, 0)                                                             as cash_expenses,
    coalesce(mc.material_cost, 0)                                                       as material_cost,
    round(coalesce(r.revenue, 0) * 0.30)                                                as station_share,
    coalesce(x.expenses, 0)
      + coalesce(mc.material_cost, 0)
      + round(coalesce(r.revenue, 0) * 0.30)                                            as expenses,
    coalesce(r.revenue, 0)
      - coalesce(x.expenses, 0)
      - coalesce(mc.material_cost, 0)
      - round(coalesce(r.revenue, 0) * 0.30)                                            as profit
  from months m
  left join public.revenue_by_month       r  on r.month  = m.month
  left join public.expenses_by_month      x  on x.month  = m.month
  left join public.material_cost_by_month mc on mc.month = m.month
  order by m.month;

comment on view public.pnl_by_month is
  'P&L tháng. profit = doanh thu − chi phí tiền mặt − CP túi/tem − chia sẻ trạm (30% doanh thu). expenses = tổng 3 khoản chi.';
