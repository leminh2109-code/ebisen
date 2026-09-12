-- Từ T8/2026, chi phí tôm tính theo tồn kho (shrimp_cost_by_month).
-- Các bản ghi expenses do createShrimpPurchase tạo ra bị trùng lặp P&L.
-- Fix: xóa expenses đó và null expense_id trong shrimp_purchases.

delete from public.expenses
where id in (
  select expense_id
  from public.shrimp_purchases
  where expense_id is not null
    and purchase_date >= '2026-08-01'
);

update public.shrimp_purchases
set expense_id = null
where purchase_date >= '2026-08-01'
  and expense_id is not null;
