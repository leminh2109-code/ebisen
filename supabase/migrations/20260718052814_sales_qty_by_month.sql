-- Số lượng bánh bán theo tháng, tách theo loại (1 tôm / 2 tôm) — từ bảng sales.
--
-- LƯU Ý: đây là số từ bảng sales (từng lần bán). Tháng lịch sử (nạp từ Airtable)
-- có 199 bản ghi trống loại bánh → gộp vào qty_other, nên 1 tôm + 2 tôm có thể
-- KHÔNG bằng "Số bánh" chính thức (daily_revenue). Dùng để xem cơ cấu loại bánh.
create view public.sales_qty_by_month
with (security_invoker = on) as
  select
    date_trunc('month', sale_date)::date                       as month,
    coalesce(sum(quantity) filter (where cake_type = '1 tôm'), 0) as qty_1tom,
    coalesce(sum(quantity) filter (where cake_type = '2 tôm'), 0) as qty_2tom,
    coalesce(sum(quantity) filter (
      where cake_type is null or cake_type not in ('1 tôm', '2 tôm')
    ), 0)                                                        as qty_other,
    coalesce(sum(quantity), 0)                                  as qty_total
  from public.sales
  group by date_trunc('month', sale_date)
  order by month;

comment on view public.sales_qty_by_month is
  'Số lượng bánh bán theo tháng tách 1 tôm / 2 tôm / khác (từ sales). Tháng lịch sử có bản ghi trống loại bánh gộp vào qty_other.';
