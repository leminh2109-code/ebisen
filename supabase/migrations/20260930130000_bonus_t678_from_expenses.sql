-- Thưởng NV T6/T7/T8: nhập tay từ expenses (bonus_cost_by_month hybrid).
-- T9+: vẫn tính auto từ số bánh. T6-T8: đọc từ expenses category='Thưởng nhân viên'.
-- expenses_by_month đã loại 'Thưởng nhân viên' toàn bộ (migration 20260930120000).

-- 1. Insert thưởng T6/T7/T8 vào expenses
insert into public.expenses (expense_date, amount, category, description, expense_type)
values
  ('2026-06-30', 5830000, 'Thưởng nhân viên', 'Thưởng T6 - Tùng',   'Biến đổi'),
  ('2026-06-30', 5250000, 'Thưởng nhân viên', 'Thưởng T6 - Nam',    'Biến đổi'),
  ('2026-07-31',15000000, 'Thưởng nhân viên', 'Thưởng T7',          'Biến đổi'),
  ('2026-08-31',10000000, 'Thưởng nhân viên', 'Thưởng T8',          'Biến đổi');

-- 2. Rebuild bonus_cost_by_month: T9+ auto từ cakes, T6-T8 từ expenses
drop view if exists public.pnl_by_month;
drop view if exists public.bonus_cost_by_month;

create view public.bonus_cost_by_month
with (security_invoker = on) as
  -- T9+: tính tự động từ số bánh bán + tặng × 10.000đ
  select month, sum(cakes)::bigint * 10000 as bonus_cost
  from (
    select date_trunc('month', s.sale_date)::date as month,
           sum(s.quantity * coalesce(m.cakes_per_unit, 1)) as cakes
    from public.sales s join public.menu m on m.id = s.menu_item_id
    where s.sale_date >= '2026-09-01'
    group by 1
    union all
    select date_trunc('month', g.gift_date)::date as month,
           sum(g.quantity * coalesce(m.cakes_per_unit, 1)) as cakes
    from public.shrimp_gifts g join public.menu m on m.id = g.menu_item_id
    where g.gift_date >= '2026-09-01'
    group by 1
  ) src
  group by month

  union all

  -- T6-T8: nhập tay từ expenses category='Thưởng nhân viên'
  select date_trunc('month', expense_date)::date as month,
         sum(amount) as bonus_cost
  from public.expenses
  where coalesce(category, '') = 'Thưởng nhân viên'
    and expense_date < '2026-09-01'
  group by 1

  order by month;

comment on view public.bonus_cost_by_month is
  'Thưởng NV: T9+ auto từ cakes×10k; T6-T8 đọc từ expenses (nhập tay).';

-- 3. Rebuild pnl_by_month
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,          0) as revenue,
  coalesce(x.expenses,         0) as cash_expenses,
  coalesce(mc.material_cost,   0) as material_cost,
  coalesce(bc.box_cost,        0) as box_cost,
  coalesce(sc.shrimp_cost,     0) as shrimp_cost,
  coalesce(ic.ingredient_cost, 0) as ingredient_cost,
  coalesce(bon.bonus_cost,     0) as bonus_cost,
  coalesce(sal.salary_cost,    0) as salary_cost,
  round(coalesce(r.revenue,    0) * 0.30) as station_share,
  coalesce(x.expenses,         0)
    + coalesce(mc.material_cost,  0)
    + coalesce(bc.box_cost,       0)
    + coalesce(sc.shrimp_cost,    0)
    + coalesce(ic.ingredient_cost,0)
    + coalesce(bon.bonus_cost,    0)
    + coalesce(sal.salary_cost,   0)
    + round(coalesce(r.revenue,   0) * 0.30) as expenses,
  coalesce(r.revenue,          0)
    - coalesce(x.expenses,         0)
    - coalesce(mc.material_cost,   0)
    - coalesce(bc.box_cost,        0)
    - coalesce(sc.shrimp_cost,     0)
    - coalesce(ic.ingredient_cost, 0)
    - coalesce(bon.bonus_cost,     0)
    - coalesce(sal.salary_cost,    0)
    - round(coalesce(r.revenue,    0) * 0.30) as profit
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
  'P&L tháng. profit = DT − CP tiền mặt − CP NVL − CP hộp − CP tôm − CP bột − thưởng NV − lương NV − chia trạm 30%.';
