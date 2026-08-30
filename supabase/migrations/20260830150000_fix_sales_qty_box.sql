-- Cập nhật sales_qty_by_month: hộp 3 bánh đếm đúng số bánh thực (× shrimp_per_unit).
-- Hộp 3 bánh = is_box=true, shrimp_per_unit=3 → mỗi hộp bán ra = 3 bánh 1 tôm.
-- Các loại không phải hộp (1 tôm, 2 tôm): vẫn đếm raw quantity như cũ.

drop view if exists public.sales_qty_by_month;

create view public.sales_qty_by_month
with (security_invoker = on) as
  select
    date_trunc('month', s.sale_date)::date as month,
    -- Bánh 1 tôm = 1t thường + hộp × shrimp_per_unit
    coalesce(
      sum(s.quantity) filter (where s.cake_type = '1 tôm' and coalesce(m.is_box, false) = false)
      + sum(s.quantity * coalesce(m.shrimp_per_unit, 1)) filter (where coalesce(m.is_box, false) = true),
      0
    ) as qty_1tom,
    coalesce(sum(s.quantity) filter (where s.cake_type = '2 tôm'), 0) as qty_2tom,
    -- qty_other: bản ghi lịch sử trống loại (Airtable legacy)
    coalesce(sum(s.quantity) filter (
      where (s.cake_type is null or s.cake_type not in ('1 tôm', '2 tôm'))
        and coalesce(m.is_box, false) = false
    ), 0) as qty_other,
    -- Tổng bánh: các loại thường × 1, hộp × shrimp_per_unit
    coalesce(sum(
      case when coalesce(m.is_box, false) then s.quantity * coalesce(m.shrimp_per_unit, 1)
           else s.quantity end
    ), 0) as qty_total
  from public.sales s
  left join public.menu m on m.id = s.menu_item_id
  group by date_trunc('month', s.sale_date)
  order by month;

comment on view public.sales_qty_by_month is
  'Số lượng bánh bán theo tháng. Hộp 3 bánh tính đúng số bánh thực (× shrimp_per_unit). Tháng lịch sử có bản ghi trống loại bánh gộp vào qty_other.';
