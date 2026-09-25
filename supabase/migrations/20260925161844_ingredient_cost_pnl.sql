-- Chi phí bột + gia vị vào P&L.
--
-- Trước đây: tiền mua bột ghi vào expenses (category Bột mì/Bột năng/Muối/Đường).
-- Từ T7/2026: chuyển sang theo dõi qua ingredient_purchases (kg + total_cost).
-- → Để tránh double-count: exclude các category bột khỏi expenses_by_month từ T7.
-- → Tạo ingredient_cost_by_month: số bánh × định mức × đơn giá bình quân.
--
-- T6: "Bột + gia vị" vẫn nằm trong expenses (không có ingredient_purchases T6) → giữ.
-- T7+: bột tính từ ingredient_cost_by_month, expenses bột bị exclude.
--
-- Fix thêm: ingredient_inventory dùng cakes_per_unit cho Hộp 3 bánh.

-- ============================================================================
-- 0. Drop views theo thứ tự phụ thuộc
-- ============================================================================
drop view if exists public.pnl_by_month;

-- ============================================================================
-- 1. Fix ingredient_inventory — dùng cakes_per_unit (Hộp 3 bánh = 3 cái bột)
-- ============================================================================
create or replace view public.ingredient_inventory
with (security_invoker = on) as
  with pur as (
    select
      ingredient,
      sum(kg)                       as total_kg,
      sum(coalesce(total_cost, 0))  as total_cost,
      min(purchase_date)            as start_date
    from public.ingredient_purchases
    group by ingredient
  )
  select
    i.key                                   as ingredient,
    i.label,
    i.grams_per_cake,
    coalesce(p.total_kg, 0)                 as total_kg,
    coalesce(p.total_cost, 0)               as total_cost,
    p.start_date,
    coalesce(c.cakes, 0)                    as cakes_used,
    round(coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0, 3)          as kg_used,
    round(coalesce(p.total_kg, 0)
          - coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0, 3)        as kg_on_hand,
    case when coalesce(p.total_kg, 0) > 0
      then round(coalesce(p.total_cost, 0) / p.total_kg) end            as cost_per_kg,
    case when coalesce(p.total_kg, 0) > 0
      then round((coalesce(p.total_kg, 0)
                  - coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0)
                 * coalesce(p.total_cost, 0) / p.total_kg) end          as inventory_value,
    case when i.grams_per_cake > 0
      then floor((coalesce(p.total_kg, 0)
                  - coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0)
                 * 1000.0 / i.grams_per_cake) end                       as cakes_left
  from public.ingredients i
  left join pur p on p.ingredient = i.key
  left join lateral (
    select
      coalesce((
        select sum(s.quantity * coalesce(m.cakes_per_unit, 1))
        from public.sales s
        join public.menu m on m.id = s.menu_item_id
        where s.sale_date >= p.start_date
      ), 0)
      + coalesce((
        select sum(g.quantity * coalesce(m.cakes_per_unit, 1))
        from public.shrimp_gifts g
        join public.menu m on m.id = g.menu_item_id
        where g.gift_date >= p.start_date
      ), 0) as cakes
  ) c on p.start_date is not null
  order by i.sort_order;

comment on view public.ingredient_inventory is
  'Tồn kho bột/gia vị = kg nhập − (bánh bán+tặng × định mức). Hộp 3 bánh tính đúng 3 cái. Giá trị tồn chỉ tham khảo.';

-- ============================================================================
-- 2. Tạo ingredient_cost_by_month
--    Chi phí = số bánh tháng đó × tổng(grams_per_cake/1000 × đơn giá bình quân)
--    Chỉ tính từ tháng có ingredient_purchases đầu tiên (T7/2026).
-- ============================================================================
create view public.ingredient_cost_by_month
with (security_invoker = on) as
  with
  -- Đơn giá bình quân mỗi nguyên liệu (toàn bộ lịch sử, đơn vị đ/kg)
  avg_prices as (
    select
      ingredient,
      sum(total_cost) / nullif(sum(kg), 0) as price_per_kg
    from public.ingredient_purchases
    where total_cost is not null and total_cost > 0
    group by ingredient
  ),
  -- Chi phí bột per bánh = sum(gram/1000 × giá/kg) qua 4 nguyên liệu
  cost_per_cake as (
    select sum(i.grams_per_cake / 1000.0 * coalesce(ap.price_per_kg, 0)) as cost
    from public.ingredients i
    left join avg_prices ap on ap.ingredient = i.key
  ),
  -- Tháng sớm nhất có nhập nguyên liệu
  first_month as (
    select date_trunc('month', min(purchase_date))::date as month
    from public.ingredient_purchases
  ),
  -- Số bánh thực (bán + tặng, tính cakes_per_unit) mỗi tháng từ first_month
  monthly_cakes as (
    select month, sum(cakes) as cakes
    from (
      select
        date_trunc('month', s.sale_date)::date          as month,
        sum(s.quantity * coalesce(m.cakes_per_unit, 1)) as cakes
      from public.sales s
      join public.menu m on m.id = s.menu_item_id
      where s.sale_date >= (select month from first_month)
      group by 1
      union all
      select
        date_trunc('month', g.gift_date)::date          as month,
        sum(g.quantity * coalesce(m.cakes_per_unit, 1)) as cakes
      from public.shrimp_gifts g
      join public.menu m on m.id = g.menu_item_id
      where g.gift_date >= (select month from first_month)
      group by 1
    ) src
    group by month
  )
  select
    mc.month,
    round(mc.cakes * cp.cost)::bigint as ingredient_cost
  from monthly_cakes mc
  cross join cost_per_cake cp
  order by mc.month;

comment on view public.ingredient_cost_by_month is
  'Chi phí bột+gia vị tháng = số bánh × định mức × đơn giá bình quân. Từ T7/2026. expenses_by_month đã exclude bột T7+.';

-- ============================================================================
-- 3. Rebuild expenses_by_month — exclude bột từ T7, thưởng NV từ T9
-- ============================================================================
create or replace view public.expenses_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    count(*)                                as expense_count,
    sum(amount)                             as expenses
  from public.expenses
  where not (
    -- Thưởng NV: tính tự động từ T9 qua bonus_cost_by_month
    (coalesce(category, '') = 'Thưởng nhân viên' and expense_date >= '2026-09-01')
    or
    -- Bột + gia vị: tính từ ingredient_cost_by_month từ T7
    (coalesce(category, '') in ('Bột mì', 'Bột năng', 'Muối', 'Đường', 'Bột + gia vị')
     and expense_date >= '2026-07-01')
  )
  group by date_trunc('month', expense_date)
  order by month;

comment on view public.expenses_by_month is
  'CP tiền mặt tháng. Loại trừ: Bột+gia vị từ T7 (→ ingredient_cost_by_month), Thưởng NV từ T9 (→ bonus_cost_by_month).';

-- ============================================================================
-- 4. Rebuild pnl_by_month — thêm ingredient_cost
-- ============================================================================
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,           0)                     as revenue,
  coalesce(x.expenses,          0)                     as cash_expenses,
  coalesce(mc.material_cost,    0)                     as material_cost,
  coalesce(bc.box_cost,         0)                     as box_cost,
  coalesce(sc.shrimp_cost,      0)                     as shrimp_cost,
  coalesce(ic.ingredient_cost,  0)                     as ingredient_cost,
  coalesce(bon.bonus_cost,      0)                     as bonus_cost,
  round(coalesce(r.revenue,     0) * 0.30)             as station_share,
  coalesce(x.expenses,          0)
    + coalesce(mc.material_cost,    0)
    + coalesce(bc.box_cost,         0)
    + coalesce(sc.shrimp_cost,      0)
    + coalesce(ic.ingredient_cost,  0)
    + coalesce(bon.bonus_cost,      0)
    + round(coalesce(r.revenue,     0) * 0.30)         as expenses,
  coalesce(r.revenue,           0)
    - coalesce(x.expenses,          0)
    - coalesce(mc.material_cost,    0)
    - coalesce(bc.box_cost,         0)
    - coalesce(sc.shrimp_cost,      0)
    - coalesce(ic.ingredient_cost,  0)
    - coalesce(bon.bonus_cost,      0)
    - round(coalesce(r.revenue,     0) * 0.30)         as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
  union select month from public.ingredient_cost_by_month
  union select month from public.bonus_cost_by_month
) m
left join public.revenue_by_month          r   on r.month   = m.month
left join public.expenses_by_month         x   on x.month   = m.month
left join public.material_cost_by_month    mc  on mc.month  = m.month
left join public.box_cost_by_month         bc  on bc.month  = m.month
left join public.shrimp_cost_by_month      sc  on sc.month  = m.month
left join public.ingredient_cost_by_month  ic  on ic.month  = m.month
left join public.bonus_cost_by_month       bon on bon.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = DT − CP tiền mặt − túi/tem − hộp − tôm − bột/gia vị (T7+) − thưởng NV (T9+) − trạm 30%.';
