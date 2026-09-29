-- Fix: salary_cost_by_month chỉ tính từ T9/2026 trở đi.
-- T6–T8 lương đã nằm trong expenses_by_month (chi phí tiền mặt), không tách riêng.

drop view if exists public.pnl_by_month;
drop view if exists public.salary_cost_by_month;

create view public.salary_cost_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    sum(amount)                             as salary_cost
  from public.expenses
  where coalesce(category, '') = 'Lương nhân viên'
    and expense_date >= '2026-09-01'
  group by date_trunc('month', expense_date)
  order by month;

comment on view public.salary_cost_by_month is
  'Lương nhân viên theo tháng, chỉ từ T9/2026 trở đi (trước T9 lương nằm trong chi phí tiền mặt).';

-- Rebuild pnl_by_month (giống hệt migration trước, chỉ để rebuild sau drop)
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,        0)                     as revenue,
  coalesce(x.expenses,       0)                     as cash_expenses,
  coalesce(mc.material_cost, 0)                     as material_cost,
  coalesce(bc.box_cost,      0)                     as box_cost,
  coalesce(sc.shrimp_cost,   0)                     as shrimp_cost,
  coalesce(ic.ingredient_cost, 0)                   as ingredient_cost,
  coalesce(bon.bonus_cost,   0)                     as bonus_cost,
  coalesce(sal.salary_cost,  0)                     as salary_cost,
  round(coalesce(r.revenue,  0) * 0.30)             as station_share,
  coalesce(x.expenses,       0)
    + coalesce(mc.material_cost,  0)
    + coalesce(bc.box_cost,       0)
    + coalesce(sc.shrimp_cost,    0)
    + coalesce(ic.ingredient_cost,0)
    + coalesce(bon.bonus_cost,    0)
    + coalesce(sal.salary_cost,   0)
    + round(coalesce(r.revenue,   0) * 0.30)        as expenses,
  coalesce(r.revenue,        0)
    - coalesce(x.expenses,       0)
    - coalesce(mc.material_cost,  0)
    - coalesce(bc.box_cost,       0)
    - coalesce(sc.shrimp_cost,    0)
    - coalesce(ic.ingredient_cost,0)
    - coalesce(bon.bonus_cost,    0)
    - coalesce(sal.salary_cost,   0)
    - round(coalesce(r.revenue,   0) * 0.30)        as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
  union select month from public.bonus_cost_by_month
  union select month from public.salary_cost_by_month
) m
left join public.revenue_by_month         r   on r.month   = m.month
left join public.expenses_by_month        x   on x.month   = m.month
left join public.material_cost_by_month   mc  on mc.month  = m.month
left join public.box_cost_by_month        bc  on bc.month  = m.month
left join public.shrimp_cost_by_month     sc  on sc.month  = m.month
left join public.ingredient_cost_by_month ic  on ic.month  = m.month
left join public.bonus_cost_by_month      bon on bon.month = m.month
left join public.salary_cost_by_month     sal on sal.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = DT − CP tiền mặt − CP NVL − CP hộp − CP tôm − CP bột − thưởng NV − lương NV (từ T9) − chia trạm 30%.';
