-- Theo dõi tồn kho dầu ăn (lít) và túi bóng kính (kg).
-- Không tự tính usage theo bánh; chủ DN nhập từng lần mua và xem tổng cộng dồn.

-- 1. Bảng lịch sử nhập
create table public.consumable_purchases (
  id            uuid primary key default gen_random_uuid(),
  purchase_date date not null,
  item          text not null check (item in ('dau_an', 'tui_bong_kinh')),
  quantity      numeric(10, 3) not null check (quantity > 0),
  total_cost    numeric not null default 0 check (total_cost >= 0),
  note          text,
  created_by    uuid references auth.users,
  created_at    timestamptz default now()
);

comment on table public.consumable_purchases is
  'Lịch sử nhập dầu ăn (lít) và túi bóng kính (kg).';

-- 2. RLS: chỉ owner thao tác
alter table public.consumable_purchases enable row level security;

create policy "owner full access on consumable_purchases"
  on public.consumable_purchases
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- 3. View tổng tồn kho theo mặt hàng
create view public.consumable_inventory
with (security_invoker = on) as
  select
    item,
    sum(quantity)                                                         as total_in,
    sum(total_cost)                                                       as total_cost,
    case when sum(quantity) > 0
      then round(sum(total_cost) / sum(quantity))
    end                                                                   as cost_per_unit,
    min(purchase_date)                                                    as first_purchase,
    max(purchase_date)                                                    as last_purchase,
    count(*)                                                              as purchase_count
  from public.consumable_purchases
  group by item;

comment on view public.consumable_inventory is
  'Tổng dầu ăn + túi bóng kính đã nhập. "total_in" = tổng lượng mua (lít/kg).';
