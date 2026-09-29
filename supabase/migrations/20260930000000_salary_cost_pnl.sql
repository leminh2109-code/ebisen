-- Lương nhân viên tách ra cột riêng trong P&L, không gộp vào cash_expenses.
-- Áp dụng từ T9/2026 (khi bắt đầu nhập lương vào hệ thống).
-- Pattern giống bonus_cost: expenses_by_month loại trừ category,
-- tạo salary_cost_by_month view, cộng vào pnl_by_month.

-- 1. Drop views theo thứ tự phụ thuộc
drop view if exists public.pnl_by_month;
drop view if exists public.expenses_by_month;

-- 2. Rebuild expenses_by_month — loại thêm 'Lương nhân viên' từ T9 trở đi
create view public.expenses_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    count(*)                                as expense_count,
    sum(amount)                             as expenses
  from public.expenses
  where not (
    coalesce(category, '') in ('Thưởng nhân viên', 'Lương nhân viên')
    and expense_date >= '2026-09-01'
  )
  group by date_trunc('month', expense_date)
  order by month;

comment on view public.expenses_by_month is
  'CP tiền mặt tháng. Từ T9/2026: loại Thưởng NV (tính tự động) và Lương NV (cột riêng).';

-- 3. Tạo salary_cost_by_month
create view public.salary_cost_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    sum(amount)                             as salary_cost
  from public.expenses
  where coalesce(category, '') = 'Lương nhân viên'
  group by date_trunc('month', expense_date)
  order by month;

comment on view public.salary_cost_by_month is
  'Lương nhân viên theo tháng (nhập tay cuối tháng).';

-- 4. Rebuild pnl_by_month — thêm salary_cost
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
  'P&L tháng. profit = DT − CP tiền mặt − CP NVL − CP hộp − CP tôm − CP bột − thưởng NV − lương NV − chia trạm 30%.';
