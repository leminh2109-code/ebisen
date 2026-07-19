-- Gắn khách nhận vào bánh tặng (tùy chọn). Chỉ để tra cứu/chăm sóc — KHÔNG tính
-- vào lượt mua/doanh thu (bánh tặng không phải đơn mua của khách).

alter table public.shrimp_gifts
  add column if not exists customer_id uuid references public.customers (id) on delete set null;
create index if not exists shrimp_gifts_customer_idx on public.shrimp_gifts (customer_id);
comment on column public.shrimp_gifts.customer_id is
  'Khách nhận bánh tặng (tùy chọn). Không tính vào lượt mua/doanh thu.';
