-- ============================================================================
-- 0007 — Nhóm chi phí để phân tích (danh mục / loại cố định-biến đổi / TT chi phí)
-- ============================================================================
-- Mọi tính toán ở view (không ở frontend). Chủ DN query thẳng các view này để
-- đối chiếu con số trang "Chi phí theo tháng".
--
-- Dữ liệu nhập tay có khoảng trắng thừa ('Tôm ', 'Cố định ') → dùng
-- trim + nullif để gộp về đúng nhóm; giá trị rỗng/null gom vào '(chưa phân loại)'.
-- Áp bằng cách dán vào Supabase SQL Editor (không dùng Supabase CLI — xem CLAUDE.md).

-- Danh mục (thay bản cũ: thêm trim + số khoản) -------------------------------
drop view if exists public.expenses_by_month_category cascade;
create view public.expenses_by_month_category
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date              as month,
    coalesce(nullif(trim(category), ''), '(chưa phân loại)') as category,
    count(*)                                             as expense_count,
    sum(amount)                                          as expenses
  from public.expenses
  group by date_trunc('month', expense_date),
           coalesce(nullif(trim(category), ''), '(chưa phân loại)')
  order by month, expenses desc;

-- Loại chi phí: Cố định / Biến đổi ------------------------------------------
drop view if exists public.expenses_by_month_type cascade;
create view public.expenses_by_month_type
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date                   as month,
    coalesce(nullif(trim(expense_type), ''), '(chưa phân loại)') as expense_type,
    count(*)                                                  as expense_count,
    sum(amount)                                               as expenses
  from public.expenses
  group by date_trunc('month', expense_date),
           coalesce(nullif(trim(expense_type), ''), '(chưa phân loại)')
  order by month, expenses desc;

-- Trung tâm chi phí ---------------------------------------------------------
drop view if exists public.expenses_by_month_cost_center cascade;
create view public.expenses_by_month_cost_center
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date                   as month,
    coalesce(nullif(trim(cost_center), ''), '(chưa phân loại)') as cost_center,
    count(*)                                                  as expense_count,
    sum(amount)                                               as expenses
  from public.expenses
  group by date_trunc('month', expense_date),
           coalesce(nullif(trim(cost_center), ''), '(chưa phân loại)')
  order by month, expenses desc;
