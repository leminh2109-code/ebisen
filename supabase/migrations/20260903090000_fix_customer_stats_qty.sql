-- Fix customer_stats: quantity trong customer_orders là số BÁNH (không phải hộp).
-- Migration 20260831080000 nhân thêm shrimp_per_unit là sai — vì form nhập dùng
-- label "Số lượng bánh", user đã nhập bánh rồi. Revert về SUM(quantity) thuần.

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
    count(o.id)                                          as order_count,
    coalesce(sum(o.quantity), 0)                         as total_qty,
    min(o.order_date)                                    as first_order,
    max(o.order_date)                                    as last_order,
    mode() within group (order by o.cake_type)           as top_cake
  from public.customers c
  left join public.customer_orders o on o.customer_id = c.id
  group by c.id, c.phone, c.name, c.address, c.note, c.created_at
  order by max(o.order_date) desc nulls last;

comment on view public.customer_stats is
  'Mỗi khách + thống kê: số lượt, tổng bánh (quantity = số bánh, nhập trực tiếp), mua đầu/cuối, loại bánh hay mua.';
