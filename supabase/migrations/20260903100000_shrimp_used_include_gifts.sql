-- shrimp_used_by_month: cộng tôm tặng vào tôm đã dùng.
-- Trước đây chỉ tính tôm bán (sales) → chi phí tôm bánh tặng bị thiếu trong P&L.
-- Fix: shrimp_used = tôm bán + tôm tặng.
-- shrimp_cost_by_month và pnl_by_month đọc view này → tự cập nhật.

create or replace view public.shrimp_used_by_month
with (security_invoker = on) as
  select
    month,
    sum(shrimp_used)::bigint as shrimp_used
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
