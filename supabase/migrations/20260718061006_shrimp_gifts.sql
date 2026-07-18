-- Bánh CHO TẶNG (biếu tặng) — cũng tốn tôm nhưng không phải bán.
-- Tồn kho tôm = tổng nhập − (tôm dùng để BÁN + tôm dùng để TẶNG).
--
-- Số con tôm mỗi bánh tặng lấy từ menu.shrimp_per_unit (như sales): bánh 1 tôm = 1 con.

-- ============================================================================
-- 1. Bảng shrimp_gifts
-- ============================================================================
create table public.shrimp_gifts (
  id            uuid primary key default gen_random_uuid(),
  gift_date     date not null,
  menu_item_id  uuid references public.menu (id) on delete set null,
  cake_type     text,                       -- snapshot tên loại bánh lúc tặng
  quantity      integer not null check (quantity > 0),
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id)
);
create index shrimp_gifts_date_idx on public.shrimp_gifts (gift_date);
comment on table public.shrimp_gifts is
  'Bánh cho tặng (không bán). Tốn tôm = quantity × menu.shrimp_per_unit, trừ vào tồn kho.';

-- ============================================================================
-- 2. RLS — như expenses: authenticated đọc/ghi/sửa, owner xóa
-- ============================================================================
alter table public.shrimp_gifts enable row level security;

create policy "shrimp_gifts: authenticated đọc" on public.shrimp_gifts
  for select using (auth.uid() is not null);
create policy "shrimp_gifts: authenticated ghi" on public.shrimp_gifts
  for insert with check (auth.uid() is not null);
create policy "shrimp_gifts: authenticated sửa" on public.shrimp_gifts
  for update using (auth.uid() is not null);
create policy "shrimp_gifts: owner xóa" on public.shrimp_gifts
  for delete using (public.is_owner());

-- ============================================================================
-- 3. View: bánh tặng theo tháng (số bánh + số con tôm)
-- ============================================================================
create view public.shrimp_gift_by_month
with (security_invoker = on) as
  select
    date_trunc('month', g.gift_date)::date            as month,
    coalesce(sum(g.quantity), 0)                       as gift_qty,
    coalesce(sum(g.quantity * m.shrimp_per_unit), 0)   as gift_shrimp
  from public.shrimp_gifts g
  join public.menu m on m.id = g.menu_item_id
  where m.shrimp_per_unit > 0
  group by date_trunc('month', g.gift_date)
  order by month;

-- ============================================================================
-- 4. Cập nhật tồn kho: tôm dùng = BÁN + TẶNG
-- ============================================================================
create or replace view public.shrimp_inventory
with (security_invoker = on) as
  with ins as (
    select
      coalesce(sum(shrimp_count), 0)::bigint as total_in,
      coalesce(sum(kg), 0)                   as total_kg,
      min(purchase_date)                     as start_date
    from public.shrimp_purchases
  ),
  used_sales as (
    select coalesce(sum(s.quantity * m.shrimp_per_unit), 0)::bigint as v
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where m.shrimp_per_unit > 0
      and s.sale_date >= (select start_date from ins)
  ),
  used_gifts as (
    select coalesce(sum(g.quantity * m.shrimp_per_unit), 0)::bigint as v
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where m.shrimp_per_unit > 0
      and g.gift_date >= (select start_date from ins)
  )
  select
    ins.total_in,
    ins.total_kg,
    (select v from used_sales) + (select v from used_gifts) as total_used,
    ins.total_in - ((select v from used_sales) + (select v from used_gifts)) as on_hand,
    ins.start_date
  from ins;
