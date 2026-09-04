-- Thêm cột cakes_per_unit để tách "số bánh/hộp" khỏi "số tôm/hộp" (shrimp_per_unit).
-- Lý do: "Hộp 3 bánh 2 tôm" có 3 bánh nhưng 6 tôm — shrimp_per_unit không thể làm cả hai.
-- Sau migration:
--   shrimp_per_unit = tổng tôm tiêu thụ mỗi đơn vị bán (inventory tracking)
--   cakes_per_unit  = tổng bánh mỗi đơn vị bán (bánh counting, display)

-- ============================================================================
-- 1. Thêm cột cakes_per_unit
-- ============================================================================
alter table public.menu
  add column if not exists cakes_per_unit integer;

comment on column public.menu.cakes_per_unit is
  'Số bánh trong 1 đơn vị bán. NULL = 1 (bánh lẻ). Hộp 3 bánh = 3. Dùng để đếm bánh, khác shrimp_per_unit (đếm tôm).';

-- ============================================================================
-- 2. Backfill: hộp hiện có (Hộp 3 bánh) → cakes_per_unit = 3
-- ============================================================================
update public.menu
  set cakes_per_unit = 3
  where is_box = true;

-- ============================================================================
-- 3. Thêm món mới: Hộp 3 bánh 2 tôm
--    1 hộp = 3 bánh × 2 tôm = 6 tôm tiêu thụ
-- ============================================================================
insert into public.menu (name, price, active, sort_order, shrimp_per_unit, is_box, cakes_per_unit)
values ('Hộp 3 bánh 2 tôm', 300000, true, 4, 6, true, 3)
on conflict (name) do nothing;

-- ============================================================================
-- 4. Cập nhật customer_stats: dùng cakes_per_unit cho đếm bánh
-- ============================================================================
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
    count(o.id)                                                               as order_count,
    coalesce(sum(
      o.quantity * case when coalesce(m.is_box, false)
                        then coalesce(m.cakes_per_unit, m.shrimp_per_unit, 1)
                        else 1 end
    ), 0)                                                                     as total_qty,
    min(o.order_date)                                                         as first_order,
    max(o.order_date)                                                         as last_order,
    mode() within group (order by o.cake_type)                                as top_cake
  from public.customers c
  left join public.customer_orders o on o.customer_id = c.id
  left join public.menu m on m.id = o.menu_item_id
  group by c.id, c.phone, c.name, c.address, c.note, c.created_at
  order by max(o.order_date) desc nulls last;

comment on view public.customer_stats is
  'Mỗi khách + thống kê: total_qty = số bánh thực tế (hộp × cakes_per_unit, bánh lẻ × 1).';

-- ============================================================================
-- 5. Cập nhật shrimp_gift_by_month: gift_qty dùng cakes_per_unit (bánh)
--    gift_shrimp vẫn dùng shrimp_per_unit (tôm) — không đổi
-- ============================================================================
create or replace view public.shrimp_gift_by_month
with (security_invoker = on) as
  select
    date_trunc('month', g.gift_date)::date as month,
    coalesce(sum(
      g.quantity * case when coalesce(m.is_box, false)
                        then coalesce(m.cakes_per_unit, m.shrimp_per_unit, 1)
                        else 1 end
    ), 0) as gift_qty,
    coalesce(sum(g.quantity * m.shrimp_per_unit), 0) as gift_shrimp
  from public.shrimp_gifts g
  join public.menu m on m.id = g.menu_item_id
  where m.shrimp_per_unit > 0
  group by date_trunc('month', g.gift_date)
  order by month;

comment on view public.shrimp_gift_by_month is
  'Bánh tặng theo tháng. gift_qty = số bánh thực tế (hộp × cakes_per_unit). gift_shrimp = tôm tiêu tốn (× shrimp_per_unit).';

-- ============================================================================
-- 6. Cập nhật sales_qty_by_month: cakes_per_unit cho bánh, tách 1-tôm/2-tôm hộp
--    Hộp 1-tôm: shrimp_per_unit = cakes_per_unit (VD 3=3)
--    Hộp 2-tôm: shrimp_per_unit = 2 × cakes_per_unit (VD 6=2×3)
-- ============================================================================
drop view if exists public.sales_qty_by_month;

create view public.sales_qty_by_month
with (security_invoker = on) as
  select
    date_trunc('month', s.sale_date)::date as month,
    coalesce(
      -- Bánh 1 tôm lẻ
      sum(s.quantity) filter (
        where s.cake_type = '1 tôm' and coalesce(m.is_box, false) = false
      )
      -- Hộp 1 tôm (shrimp_per_unit = cakes_per_unit)
      + sum(s.quantity * coalesce(m.cakes_per_unit, m.shrimp_per_unit, 1)) filter (
          where coalesce(m.is_box, false) = true
            and m.shrimp_per_unit = coalesce(m.cakes_per_unit, m.shrimp_per_unit)
        ),
      0
    ) as qty_1tom,
    coalesce(
      -- Bánh 2 tôm lẻ
      sum(s.quantity) filter (
        where s.cake_type = '2 tôm' and coalesce(m.is_box, false) = false
      )
      -- Hộp 2 tôm (shrimp_per_unit = 2 × cakes_per_unit)
      + sum(s.quantity * coalesce(m.cakes_per_unit, 1)) filter (
          where coalesce(m.is_box, false) = true
            and m.shrimp_per_unit = 2 * coalesce(m.cakes_per_unit, 1)
        ),
      0
    ) as qty_2tom,
    coalesce(sum(s.quantity) filter (
      where (s.cake_type is null or s.cake_type not in ('1 tôm', '2 tôm'))
        and coalesce(m.is_box, false) = false
    ), 0) as qty_other,
    coalesce(sum(
      case when coalesce(m.is_box, false)
           then s.quantity * coalesce(m.cakes_per_unit, m.shrimp_per_unit, 1)
           else s.quantity end
    ), 0) as qty_total
  from public.sales s
  left join public.menu m on m.id = s.menu_item_id
  group by date_trunc('month', s.sale_date)
  order by month;

comment on view public.sales_qty_by_month is
  'Số lượng bánh bán theo tháng. Hộp dùng cakes_per_unit để đếm bánh đúng. 1-tôm/2-tôm hộp tách đúng loại.';
