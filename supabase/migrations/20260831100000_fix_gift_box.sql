-- Fix bánh tặng hộp:
-- 1. shrimp_gift_by_month: gift_qty = số bánh thực tế (hộp × shrimp_per_unit)
-- 2. hop_out_by_month: cộng hộp tặng vào số hộp dùng → trừ vào tồn kho hộp

-- ============================================================================
-- 1. shrimp_gift_by_month: gift_qty = bánh thực tế
-- ============================================================================
create or replace view public.shrimp_gift_by_month
with (security_invoker = on) as
  select
    date_trunc('month', g.gift_date)::date as month,
    coalesce(sum(
      g.quantity * case when coalesce(m.is_box, false)
                        then coalesce(m.shrimp_per_unit, 1)
                        else 1 end
    ), 0) as gift_qty,
    coalesce(sum(g.quantity * m.shrimp_per_unit), 0) as gift_shrimp
  from public.shrimp_gifts g
  join public.menu m on m.id = g.menu_item_id
  where m.shrimp_per_unit > 0
  group by date_trunc('month', g.gift_date)
  order by month;

comment on view public.shrimp_gift_by_month is
  'Bánh tặng theo tháng. gift_qty = số bánh thực tế (hộp × shrimp_per_unit). gift_shrimp = tôm tiêu tốn.';

-- ============================================================================
-- 2. hop_out_by_month: cộng thêm hộp tặng
-- box_inventory + box_cost_by_month sẽ tự cập nhật (phụ thuộc view này)
-- ============================================================================
create or replace view public.hop_out_by_month
with (security_invoker = on) as
  select
    month,
    sum(hop_out)::bigint as hop_out
  from (
    -- hộp bán
    select
      date_trunc('month', s.sale_date)::date as month,
      s.quantity::bigint                     as hop_out
    from public.sales s
    join public.menu m on m.id = s.menu_item_id and m.is_box = true

    union all

    -- hộp tặng
    select
      date_trunc('month', g.gift_date)::date as month,
      g.quantity::bigint                     as hop_out
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id and m.is_box = true
  ) src
  group by month
  order by month;

comment on view public.hop_out_by_month is
  'Số hộp ra (bán + tặng) mỗi tháng — dùng để tính tồn kho hộp và chi phí hộp.';
