-- Fix: category IS NULL khiến NULL = 'Thưởng nhân viên' → NULL → row bị loại nhầm.
-- Dùng coalesce(category, '') để NULL category luôn được giữ lại.

create or replace view public.expenses_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    count(*)                                as expense_count,
    sum(amount)                             as expenses
  from public.expenses
  where not (
    coalesce(category, '') = 'Thưởng nhân viên'
    and expense_date >= '2026-09-01'
  )
  group by date_trunc('month', expense_date)
  order by month;

comment on view public.expenses_by_month is
  'Chi phí tiền mặt tháng. Từ T9/2026: loại trừ Thưởng NV (tính tự động qua bonus_cost_by_month). coalesce xử lý category NULL.';
