-- shrimp_cost_by_month chỉ áp dụng từ tháng 8/2026 trở đi.
-- Tháng 6 và 7 đã chốt: chi phí tôm vẫn nằm trong bảng expenses (cash-based).

create or replace view public.shrimp_cost_by_month
with (security_invoker = on) as
  select
    su.month,
    round(su.shrimp_used * coalesce(si.unit_cost, 0)) as shrimp_cost
  from public.shrimp_used_by_month su
  cross join lateral (
    select case when total_in > 0 then total_cost_in / total_in else 0 end as unit_cost
    from public.shrimp_inventory
    limit 1
  ) si
  where su.month >= '2026-08-01';

comment on view public.shrimp_cost_by_month is
  'Chi phí tôm phân bổ theo tháng = số tôm đã dùng × đơn giá bình quân. Chỉ áp dụng từ T8/2026 (T6+T7 đã chốt qua expenses).';
