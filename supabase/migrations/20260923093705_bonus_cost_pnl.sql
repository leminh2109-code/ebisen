-- Thưởng nhân viên = 10,000đ × (số bánh bán + số bánh tặng).
-- Áp dụng từ T9/2026 trở đi — các tháng trước đã nhập tay trong expenses.
--
-- Để tránh double-count: expenses_by_month loại trừ category 'Thưởng nhân viên'
-- cho expense_date >= 2026-09-01. Các tháng cũ không bị ảnh hưởng.

-- 1. Drop views theo thứ tự phụ thuộc
drop view if exists public.pnl_by_month;
drop view if exists public.expenses_by_month;

-- 2. Rebuild expenses_by_month — loại 'Thưởng nhân viên' từ T9 trở đi
create view public.expenses_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    count(*)                                as expense_count,
    sum(amount)                             as expenses
  from public.expenses
  where not (
    coalesce(category, '') = 'Thưởng nhân viên'
    and expense_date >= '2026-09-01'
  )
  group by date_trunc('month', expense_date)
  order by month;

comment on view public.expenses_by_month is
  'Chi phí tiền mặt tháng. Từ T9/2026: loại trừ Thưởng NV (tính tự động qua bonus_cost_by_month).';

-- 3. Tạo bonus_cost_by_month — tính từ T9/2026
create view public.bonus_cost_by_month
with (security_invoker = on) as
  select
    month,
    sum(cakes)::bigint * 10000 as bonus_cost
  from (
    -- bánh bán
    select
      date_trunc('month', s.sale_date)::date        as month,
      sum(s.quantity * coalesce(m.cakes_per_unit, 1)) as cakes
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where s.sale_date >= '2026-09-01'
    group by date_trunc('month', s.sale_date)

    union all

    -- bánh tặng
    select
      date_trunc('month', g.gift_date)::date        as month,
      sum(g.quantity * coalesce(m.cakes_per_unit, 1)) as cakes
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where g.gift_date >= '2026-09-01'
    group by date_trunc('month', g.gift_date)
  ) src
  group by month
  order by month;

comment on view public.bonus_cost_by_month is
  'Thưởng NV = tổng bánh (bán + tặng) × 10.000đ. Chỉ tính từ T9/2026. Dùng coalesce(cakes_per_unit,1) để hộp 3 bánh đếm đúng 3 cái.';

-- 4. Rebuild pnl_by_month — thêm bonus_cost
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,        0)                     as revenue,
  coalesce(x.expenses,       0)                     as cash_expenses,
  coalesce(mc.material_cost, 0)                     as material_cost,
  coalesce(bc.box_cost,      0)                     as box_cost,
  coalesce(sc.shrimp_cost,   0)                     as shrimp_cost,
  coalesce(bon.bonus_cost,   0)                     as bonus_cost,
  round(coalesce(r.revenue,  0) * 0.30)             as station_share,
  coalesce(x.expenses,       0)
    + coalesce(mc.material_cost, 0)
    + coalesce(bc.box_cost,      0)
    + coalesce(sc.shrimp_cost,   0)
    + coalesce(bon.bonus_cost,   0)
    + round(coalesce(r.revenue,  0) * 0.30)         as expenses,
  coalesce(r.revenue,        0)
    - coalesce(x.expenses,       0)
    - coalesce(mc.material_cost, 0)
    - coalesce(bc.box_cost,      0)
    - coalesce(sc.shrimp_cost,   0)
    - coalesce(bon.bonus_cost,   0)
    - round(coalesce(r.revenue,  0) * 0.30)         as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
  union select month from public.bonus_cost_by_month
) m
left join public.revenue_by_month       r   on r.month   = m.month
left join public.expenses_by_month      x   on x.month   = m.month
left join public.material_cost_by_month mc  on mc.month  = m.month
left join public.box_cost_by_month      bc  on bc.month  = m.month
left join public.shrimp_cost_by_month   sc  on sc.month  = m.month
left join public.bonus_cost_by_month    bon on bon.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = DT − CP tiền mặt − CP NVL − CP hộp − CP tôm − thưởng NV (T9+) − chia trạm 30%.';
