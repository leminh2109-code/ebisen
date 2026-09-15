-- Thêm cột theo dõi thanh toán nhà cung cấp tôm
alter table public.shrimp_purchases
  add column is_paid boolean not null default false;

comment on column public.shrimp_purchases.is_paid is
  'TRUE = đã thanh toán cho nhà cung cấp. Mặc định FALSE (chưa thanh toán).';
