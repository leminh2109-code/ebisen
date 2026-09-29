-- Xóa toàn bộ 'Thưởng nhân viên' T6-T8 (cả cũ lẫn bản insert lần trước),
-- rồi insert lại đúng 1 bộ chính xác.

delete from public.expenses
where coalesce(category, '') = 'Thưởng nhân viên'
  and expense_date < '2026-09-01';

-- T6: tổng 11.080k (Tùng 5.830k + Nam 5.250k gộp 1 dòng)
-- T7: tổng 15.000k (mỗi người 7.500k)
-- T8: tổng 10.000k (mỗi người 5.000k)
insert into public.expenses (expense_date, amount, category, description, expense_type)
values
  ('2026-06-30', 11080000, 'Thưởng nhân viên', 'Thưởng T6 (Tùng 5.830k + Nam 5.250k)', 'Biến đổi'),
  ('2026-07-31', 15000000, 'Thưởng nhân viên', 'Thưởng T7 (mỗi người 7.500k)',           'Biến đổi'),
  ('2026-08-31', 10000000, 'Thưởng nhân viên', 'Thưởng T8 (mỗi người 5.000k)',           'Biến đổi');
