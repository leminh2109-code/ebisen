-- Đưa chi phí dầu ăn + túi bóng kính (consumable_purchases) vào P&L
-- dưới dòng riêng "consumable_cost" (chi phí khác).

-- 1. View chi phí tiêu hao theo tháng
create view public.consumable_cost_by_month
with (security_invoker = on) as
  select
    date_trunc('month', purchase_date)::date as month,
    sum(total_cost)                          as consumable_cost
  from public.consumable_purchases
  group by date_trunc('month', purchase_date)
  order by month;

comment on view public.consumable_cost_by_month is
  'Chi phí dầu ăn + túi bóng kính theo tháng (từ consumable_purchases).';

-- 2. Rebuild pnl_by_month — thêm consumable_cost
drop view if exists public.pnl_by_month;

create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,          0)                     as revenue,
  coalesce(x.expenses,         0)                     as cash_expenses,
  coalesce(mc.material_cost,   0)                     as material_cost,
  coalesce(bc.box_cost,        0)                     as box_cost,
  coalesce(sc.shrimp_cost,     0)                     as shrimp_cost,
  coalesce(ic.ingredient_cost, 0)                     as ingredient_cost,
  coalesce(cc.consumable_cost, 0)                     as consumable_cost,
  coalesce(bon.bonus_cost,     0)                     as bonus_cost,
  coalesce(sal.salary_cost,    0)                     as salary_cost,
  round(coalesce(r.revenue,    0) * 0.30)             as station_share,
  coalesce(x.expenses,         0)
    + coalesce(mc.material_cost,   0)
    + coalesce(bc.box_cost,        0)
    + coalesce(sc.shrimp_cost,     0)
    + coalesce(ic.ingredient_cost, 0)
    + coalesce(cc.consumable_cost, 0)
    + coalesce(bon.bonus_cost,     0)
    + coalesce(sal.salary_cost,    0)
    + round(coalesce(r.revenue,    0) * 0.30)         as expenses,
  coalesce(r.revenue,          0)
    - coalesce(x.expenses,         0)
    - coalesce(mc.material_cost,   0)
    - coalesce(bc.box_cost,        0)
    - coalesce(sc.shrimp_cost,     0)
    - coalesce(ic.ingredient_cost, 0)
    - coalesce(cc.consumable_cost, 0)
    - coalesce(bon.bonus_cost,     0)
    - coalesce(sal.salary_cost,    0)
    - round(coalesce(r.revenue,    0) * 0.30)         as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
  union select month from public.ingredient_cost_by_month
  union select month from public.consumable_cost_by_month
  union select month from public.bonus_cost_by_month
  union select month from public.salary_cost_by_month
) m
left join public.revenue_by_month          r   on r.month   = m.month
left join public.expenses_by_month         x   on x.month   = m.month
left join public.material_cost_by_month    mc  on mc.month  = m.month
left join public.box_cost_by_month         bc  on bc.month  = m.month
left join public.shrimp_cost_by_month      sc  on sc.month  = m.month
left join public.ingredient_cost_by_month  ic  on ic.month  = m.month
left join public.consumable_cost_by_month  cc  on cc.month  = m.month
left join public.bonus_cost_by_month       bon on bon.month = m.month
left join public.salary_cost_by_month      sal on sal.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = DT − CP tiền mặt − túi/tem − hộp − tôm − bột − dầu/túi bóng − thưởng − lương − trạm 30%.';
