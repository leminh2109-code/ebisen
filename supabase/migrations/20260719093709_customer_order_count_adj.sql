-- Cho phép owner chỉnh "Lượt mua" của khách khi lịch sử ghi thiếu số lần mua
-- (vd: 4 lần mua quá khứ nhưng lỡ nhập gộp thành 1 đơn). Dùng cột ĐIỀU CHỈNH
-- (delta) chứ không ghi đè: Lượt mua hiển thị = số đơn thực tế + điều chỉnh, nên
-- các đơn nhập mới sau này vẫn tự cộng đúng. KHÔNG đụng Tổng bánh (vẫn từ đơn).

alter table public.customers
  add column if not exists order_count_adj integer not null default 0;
comment on column public.customers.order_count_adj is
  'Điều chỉnh tay số lượt mua (cộng vào order_count ở view customer_stats). Bù cho lịch sử ghi thiếu số lần mua. Không ảnh hưởng tổng bánh.';

-- Cập nhật view: order_count = số đơn thực + điều chỉnh.
create or replace view public.customer_stats
with (security_invoker = on) as
  select
    c.id,
    c.phone,
    c.name,
    c.address,
    c.note,
    c.created_at,
    count(o.id) + c.order_count_adj                      as order_count,
    coalesce(sum(o.quantity), 0)                         as total_qty,
    min(o.order_date)                                    as first_order,
    max(o.order_date)                                    as last_order,
    mode() within group (order by o.cake_type)          as top_cake
  from public.customers c
  left join public.customer_orders o on o.customer_id = c.id
  group by c.id, c.phone, c.name, c.address, c.note, c.created_at, c.order_count_adj
  order by max(o.order_date) desc nulls last;
comment on view public.customer_stats is 'Mỗi khách + thống kê: số lượt (gồm điều chỉnh tay), tổng bánh, mua đầu/cuối, loại bánh hay mua.';
