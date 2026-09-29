-- Chuyển lương T6/T7/T8 sang cột riêng (salary_cost), bỏ khỏi chi phí tiền mặt.
-- - salary_cost_by_month: không giới hạn tháng (lấy tất cả, kể cả T6-T8)
-- - expenses_by_month: loại 'Lương nhân viên' ở MỌI tháng (không chỉ T9+)
-- - expenses_by_month_category: tương tự
-- - pnl_by_month: rebuild

drop view if exists public.pnl_by_month;
drop view if exists public.expenses_by_month;
drop view if exists public.expenses_by_month_category cascade;
drop view if exists public.salary_cost_by_month;

-- 1. salary_cost: tất cả tháng
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
  'Lương nhân viên theo tháng — tất cả tháng, tách riêng khỏi chi phí tiền mặt.';

-- 2. expenses_by_month: loại cả Lương NV và Thưởng NV (Thưởng NV chỉ auto từ T9 nên thực chất chỉ có T9+)
create view public.expenses_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    count(*)                                as expense_count,
    sum(amount)                             as expenses
  from public.expenses
  where coalesce(category, '') not in ('Lương nhân viên', 'Thưởng nhân viên')
  group by date_trunc('month', expense_date)
  order by month;

comment on view public.expenses_by_month is
  'CP tiền mặt tháng. Loại Lương NV (cột riêng) và Thưởng NV (tính tự động).';

-- 3. expenses_by_month_category: loại tương tự
create view public.expenses_by_month_category
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date              as month,
    coalesce(nullif(trim(category), ''), '(chưa phân loại)') as category,
    count(*)                                             as expense_count,
    sum(amount)                                          as expenses
  from public.expenses
  where coalesce(category, '') not in ('Lương nhân viên', 'Thưởng nhân viên')
  group by date_trunc('month', expense_date),
           coalesce(nullif(trim(category), ''), '(chưa phân loại)')
  order by month, expenses desc;

comment on view public.expenses_by_month_category is
  'CP tiền mặt theo danh mục tháng. Loại Lương NV và Thưởng NV.';

-- 4. Rebuild pnl_by_month
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
