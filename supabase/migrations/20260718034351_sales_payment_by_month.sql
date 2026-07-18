-- Doanh thu bán hàng theo tháng, tách theo HÌNH THỨC THANH TOÁN (sales.source).
--   TM = tiền mặt, CK = chuyển khoản. Nguồn khác/để trống gộp vào `other`.
--
-- LƯU Ý: đây là số từ bảng `sales` (mức từng lần bán), KHÔNG phải daily_revenue.
-- Với tháng mới (daily_revenue source='auto') tổng sales = doanh thu nên khớp
-- dashboard; với tháng lịch sử (source='airtable') sales ghi thiếu nên KHÔNG khớp
-- doanh thu chính thức — chỉ dùng để xem TỶ LỆ tiền mặt / chuyển khoản.
create view public.sales_payment_by_month
with (security_invoker = on) as
  select
    date_trunc('month', sale_date)::date                                    as month,
    coalesce(sum(amount) filter (where source = 'TM'), 0)                    as cash,
    coalesce(sum(amount) filter (where source = 'CK'), 0)                    as transfer,
    coalesce(sum(amount) filter (where source is null
                                    or source not in ('TM', 'CK')), 0)       as other,
    coalesce(sum(amount), 0)                                                 as total
  from public.sales
  group by date_trunc('month', sale_date)
  order by month;

comment on view public.sales_payment_by_month is
  'Doanh thu sales theo tháng tách TM/CK/khác. Từ bảng sales (không phải daily_revenue); tháng lịch sử có thể lệch doanh thu chính thức — dùng xem tỷ lệ thanh toán.';
