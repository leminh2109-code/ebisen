-- Tách box_cost ra khỏi material_cost trong pnl_by_month.
-- Trước: material_cost = túi/tem + hộp (gộp).
-- Sau: material_cost = túi/tem only; box_cost = cột riêng.

drop view if exists public.pnl_by_month;

create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,       0)                      as revenue,
  coalesce(x.expenses,      0)                      as cash_expenses,
  coalesce(mc.material_cost,0)                      as material_cost,
  coalesce(bc.box_cost,     0)                      as box_cost,
  round(coalesce(r.revenue, 0) * 0.30)              as station_share,
  coalesce(x.expenses,      0)
    + coalesce(mc.material_cost, 0)
    + coalesce(bc.box_cost,      0)
    + round(coalesce(r.revenue,  0) * 0.30)         as expenses,
  coalesce(r.revenue,       0)
    - coalesce(x.expenses,       0)
    - coalesce(mc.material_cost, 0)
    - coalesce(bc.box_cost,      0)
    - round(coalesce(r.revenue,  0) * 0.30)         as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
) m
left join public.revenue_by_month       r  on r.month  = m.month
left join public.expenses_by_month      x  on x.month  = m.month
left join public.material_cost_by_month mc on mc.month = m.month
left join public.box_cost_by_month      bc on bc.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = doanh thu − chi phí tiền mặt − CP túi/tem − CP hộp combo − chia sẻ trạm (30%). expenses = tổng 4 khoản chi.';
