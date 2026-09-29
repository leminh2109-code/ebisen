-- Bánh tặng có gắn khách → tính vào total_qty của khách đó trong customer_stats.
-- Thêm cột gift_qty (riêng) để UI hiển thị "X mua + Y tặng".
-- Phải DROP trước vì đổi tên cột (total_qty → purchase_qty + gift_qty + total_qty).

drop view if exists public.customer_stats;

create view public.customer_stats
with (security_invoker = on) as
  select
    c.id,
    c.phone,
    c.name,
    c.address,
    c.note,
    c.created_at,
    -- Số lượt mua (customer_orders)
    count(o.id)                                                                as order_count,
    -- Bánh mua (customer_orders, tính cakes_per_unit)
    coalesce(sum(
      o.quantity * case when coalesce(m_o.is_box, false)
                        then coalesce(m_o.cakes_per_unit, m_o.shrimp_per_unit, 1)
                        else 1 end
    ), 0)                                                                      as purchase_qty,
    -- Bánh tặng gắn khách này (shrimp_gifts, tính cakes_per_unit)
    coalesce((
      select sum(g.quantity * coalesce(m_g.cakes_per_unit, 1))
      from public.shrimp_gifts g
      join public.menu m_g on m_g.id = g.menu_item_id
      where g.customer_id = c.id
    ), 0)                                                                      as gift_qty,
    -- Tổng bánh = mua + tặng
    coalesce(sum(
      o.quantity * case when coalesce(m_o.is_box, false)
                        then coalesce(m_o.cakes_per_unit, m_o.shrimp_per_unit, 1)
                        else 1 end
    ), 0)
    + coalesce((
      select sum(g.quantity * coalesce(m_g.cakes_per_unit, 1))
      from public.shrimp_gifts g
      join public.menu m_g on m_g.id = g.menu_item_id
      where g.customer_id = c.id
    ), 0)                                                                      as total_qty,
    min(o.order_date)                                                          as first_order,
    max(o.order_date)                                                          as last_order,
    mode() within group (order by o.cake_type)                                 as top_cake
  from public.customers c
  left join public.customer_orders o on o.customer_id = c.id
  left join public.menu m_o on m_o.id = o.menu_item_id
  group by c.id, c.phone, c.name, c.address, c.note, c.created_at
  order by (
    coalesce(max(o.order_date), '1970-01-01'::date)
  ) desc nulls last;

comment on view public.customer_stats is
  'Mỗi khách + thống kê. total_qty = purchase_qty (customer_orders) + gift_qty (shrimp_gifts có customer_id).';
