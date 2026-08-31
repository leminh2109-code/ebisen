-- Sửa customer_stats: total_qty tính theo số bánh thực tế.
-- Hộp 3 bánh (is_box=true): quantity × shrimp_per_unit (mỗi hộp = 3 bánh).
-- Các loại khác: quantity × 1.

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
    count(o.id)                                                         as order_count,
    coalesce(sum(
      o.quantity * case when coalesce(m.is_box, false)
                        then coalesce(m.shrimp_per_unit, 1)
                        else 1 end
    ), 0)                                                               as total_qty,
    min(o.order_date)                                                   as first_order,
    max(o.order_date)                                                   as last_order,
    mode() within group (order by o.cake_type)                          as top_cake
  from public.customers c
  left join public.customer_orders o on o.customer_id = c.id
  left join public.menu m on m.id = o.menu_item_id
  group by c.id, c.phone, c.name, c.address, c.note, c.created_at
  order by max(o.order_date) desc nulls last;

comment on view public.customer_stats is
  'Mỗi khách + thống kê: số lượt, tổng bánh (hộp tính × shrimp_per_unit), mua đầu/cuối, loại bánh hay mua.';
