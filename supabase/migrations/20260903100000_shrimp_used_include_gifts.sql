-- shrimp_used_by_month: cộng tôm tặng vào tôm đã dùng.
-- Trước đây chỉ tính tôm bán (sales) → chi phí tôm bánh tặng bị thiếu trong P&L.
-- Fix: shrimp_used = tôm bán + tôm tặng.
-- shrimp_cost_by_month và pnl_by_month đọc view này → tự cập nhật.
--
-- Phải drop các view phụ thuộc (shrimp_cost_by_month, pnl_by_month) trước khi
-- thay thế shrimp_used_by_month để tránh lỗi kiểu cột.

drop view if exists public.pnl_by_month;
drop view if exists public.shrimp_cost_by_month;
drop view if exists public.shrimp_used_by_month;

create view public.shrimp_used_by_month
with (security_invoker = on) as
  select
    month,
    coalesce(sum(shrimp_used), 0) as shrimp_used
  from (
    -- tôm bán
    select
      date_trunc('month', s.sale_date)::date              as month,
      coalesce(sum(s.quantity * m.shrimp_per_unit), 0)    as shrimp_used
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where m.shrimp_per_unit > 0
    group by date_trunc('month', s.sale_date)

    union all

    -- tôm tặng
    select
      date_trunc('month', g.gift_date)::date              as month,
      coalesce(sum(g.quantity * m.shrimp_per_unit), 0)    as shrimp_used
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where m.shrimp_per_unit > 0
    group by date_trunc('month', g.gift_date)
  ) src
  group by month
  order by month;

comment on view public.shrimp_used_by_month is
  'Tôm đã dùng mỗi tháng = bán + tặng. Dùng bởi shrimp_cost_by_month → pnl_by_month.';

-- Rebuild shrimp_cost_by_month (chỉ từ T8/2026)
create view public.shrimp_cost_by_month
with (security_invoker = on) as
  select
    su.month,
    round(su.shrimp_used * coalesce(si.unit_cost, 0)) as shrimp_cost
  from public.shrimp_used_by_month su
  cross join lateral (
    select case when total_in > 0 then total_cost_in / total_in else 0 end as unit_cost
    from public.shrimp_inventory
    limit 1
  ) si
  where su.month >= '2026-08-01';

comment on view public.shrimp_cost_by_month is
  'Chi phí tôm phân bổ theo tháng = số tôm đã dùng (bán + tặng) × đơn giá bình quân. Chỉ áp dụng từ T8/2026.';

-- Rebuild pnl_by_month
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,        0)                     as revenue,
  coalesce(x.expenses,       0)                     as cash_expenses,
  coalesce(mc.material_cost, 0)                     as material_cost,
  coalesce(bc.box_cost,      0)                     as box_cost,
  coalesce(sc.shrimp_cost,   0)                     as shrimp_cost,
  round(coalesce(r.revenue,  0) * 0.30)             as station_share,
  coalesce(x.expenses,       0)
    + coalesce(mc.material_cost, 0)
    + coalesce(bc.box_cost,      0)
    + coalesce(sc.shrimp_cost,   0)
    + round(coalesce(r.revenue,  0) * 0.30)         as expenses,
  coalesce(r.revenue,        0)
    - coalesce(x.expenses,       0)
    - coalesce(mc.material_cost, 0)
    - coalesce(bc.box_cost,      0)
    - coalesce(sc.shrimp_cost,   0)
    - round(coalesce(r.revenue,  0) * 0.30)         as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
) m
left join public.revenue_by_month       r  on r.month  = m.month
left join public.expenses_by_month      x  on x.month  = m.month
left join public.material_cost_by_month mc on mc.month = m.month
left join public.box_cost_by_month      bc on bc.month = m.month
left join public.shrimp_cost_by_month   sc on sc.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = doanh thu − chi phí tiền mặt − CP túi/tem − CP hộp − CP tôm (bán+tặng) − chia sẻ trạm (30%).';
