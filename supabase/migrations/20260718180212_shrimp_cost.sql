-- ebisen — Thêm GIÁ THÀNH TÔM vào tồn kho tôm (chỉ HIỂN THỊ giá trị tồn).
--
-- LƯU Ý: tiền mua tôm đã ghi ở bảng Chi phí (danh mục "Tôm") → đã vào P&L.
-- Phần này KHÔNG cộng lại vào P&L (tránh tính trùng), chỉ để xem đơn giá +
-- giá trị tồn kho tôm.

-- 1. Thêm cột total_cost (tùy chọn) cho mỗi lần nhập tôm
alter table public.shrimp_purchases
  add column total_cost numeric(14, 2) check (total_cost >= 0);
comment on column public.shrimp_purchases.total_cost is
  'Tổng chi phí lần nhập tôm (tùy chọn) — để tính đơn giá + giá trị tồn kho. Không cộng vào P&L.';

-- 2. Seed giá cho các lần nhập hiện có: 400.000đ/kg
update public.shrimp_purchases
  set total_cost = kg * 400000
  where kg is not null and total_cost is null;

-- 3. Cập nhật view tồn kho: thêm đơn giá + giá trị tồn (giữ nguyên logic dùng = bán + tặng)
create or replace view public.shrimp_inventory
with (security_invoker = on) as
  with ins as (
    select
      coalesce(sum(shrimp_count), 0)::bigint as total_in,
      coalesce(sum(kg), 0)                   as total_kg,
      coalesce(sum(total_cost), 0)           as total_cost_in,
      min(purchase_date)                     as start_date
    from public.shrimp_purchases
  ),
  used_sales as (
    select coalesce(sum(s.quantity * m.shrimp_per_unit), 0)::bigint as v
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where m.shrimp_per_unit > 0
      and s.sale_date >= (select start_date from ins)
  ),
  used_gifts as (
    select coalesce(sum(g.quantity * m.shrimp_per_unit), 0)::bigint as v
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where m.shrimp_per_unit > 0
      and g.gift_date >= (select start_date from ins)
  )
  select
    ins.total_in,
    ins.total_kg,
    (select v from used_sales) + (select v from used_gifts)                      as total_used,
    ins.total_in - ((select v from used_sales) + (select v from used_gifts))     as on_hand,
    ins.start_date,
    ins.total_cost_in,
    case when ins.total_in > 0 then ins.total_cost_in / ins.total_in else 0 end  as unit_cost,
    (ins.total_in - ((select v from used_sales) + (select v from used_gifts)))
      * (case when ins.total_in > 0 then ins.total_cost_in / ins.total_in else 0 end) as inventory_value
  from ins;
