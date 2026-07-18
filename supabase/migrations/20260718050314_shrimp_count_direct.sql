-- Nhập tôm theo SỐ CON trực tiếp (owner biết/đếm số con, không cần kg × size).
--   - shrimp_count: từ cột generated → cột nhập tay (giữ giá trị cũ nếu có).
--   - kg: thành TÙY CHỌN (chỉ để tham khảo).
--   - size_per_kg: bỏ (không cần nữa).

alter table public.shrimp_purchases alter column shrimp_count drop expression;
alter table public.shrimp_purchases alter column shrimp_count set not null;
alter table public.shrimp_purchases
  add constraint shrimp_purchases_count_pos check (shrimp_count > 0);

alter table public.shrimp_purchases alter column kg drop not null;
alter table public.shrimp_purchases drop column size_per_kg;

comment on column public.shrimp_purchases.shrimp_count is 'Số con tôm nhập (nhập trực tiếp).';
comment on column public.shrimp_purchases.kg is 'Số kg (tùy chọn, tham khảo).';
