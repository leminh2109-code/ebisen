-- Nối lần nhập TÔM với khoản CHI PHÍ sinh ra nó, để nhập 1 lần ở form Chi phí là
-- vừa ghi tiền (vào P&L) vừa cộng vào tồn kho tôm.
--
-- on delete cascade: xóa khoản chi thì dòng nhập tôm tương ứng cũng biến mất →
-- tồn kho không bị lệch. Dòng nhập tôm tạo tay (không qua chi phí) có expense_id
-- null nên không bị ảnh hưởng.
--
-- LƯU Ý P&L: tiền mua tôm CHỈ nằm ở expenses. total_cost bên shrimp_purchases chỉ
-- để định giá tồn kho tham khảo — KHÔNG cộng vào P&L (giữ nguyên như trước).

alter table public.shrimp_purchases
  add column if not exists expense_id uuid references public.expenses (id) on delete cascade;
create index if not exists shrimp_purchases_expense_idx
  on public.shrimp_purchases (expense_id);
comment on column public.shrimp_purchases.expense_id is
  'Khoản chi đã sinh ra lần nhập tôm này (nếu nhập qua form Chi phí). Xóa chi phí → xóa theo.';
