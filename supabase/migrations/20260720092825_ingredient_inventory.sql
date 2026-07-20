-- Tồn kho BỘT & GIA VỊ (bột mì, bột năng, muối, đường) — theo dõi từ tháng 7/2026.
--
-- Cách làm giống tồn kho TÔM: bảng này chỉ theo dõi SỐ LƯỢNG (kg). TIỀN vẫn nằm ở
-- bảng expenses (danh mục "Bột + gia vị") — KHÔNG cộng vào P&L lần nữa để tránh
-- tính trùng. total_cost ở đây chỉ để định giá tồn kho tham khảo.
--
-- Định mức mỗi bánh (công thức): bột mì 57,5g · bột năng 27,5g · muối 3,5g · đường 10g.
-- Bánh tính cả BÁN và TẶNG (đều tốn bột), từ ngày nhập đầu tiên của từng nguyên liệu.

-- ============================================================================
-- 1. Định mức công thức (mỗi bánh tốn bao nhiêu gram)
-- ============================================================================
create table if not exists public.ingredients (
  key            text primary key,                    -- bot_mi, bot_nang, muoi, duong
  label          text not null,
  grams_per_cake numeric(8, 2) not null check (grams_per_cake >= 0),
  sort_order     int not null default 0
);
comment on table public.ingredients is
  'Định mức nguyên liệu mỗi bánh (gram). Sửa ở đây là đổi cách tính tồn kho.';

insert into public.ingredients (key, label, grams_per_cake, sort_order) values
  ('bot_mi',   'Bột mì',   57.5, 1),
  ('bot_nang', 'Bột năng', 27.5, 2),
  ('muoi',     'Muối',      3.5, 3),
  ('duong',    'Đường',    10.0, 4)
on conflict (key) do update
  set label = excluded.label,
      grams_per_cake = excluded.grams_per_cake,
      sort_order = excluded.sort_order;

-- ============================================================================
-- 2. Lịch sử nhập nguyên liệu (kg)
-- ============================================================================
create table if not exists public.ingredient_purchases (
  id            uuid primary key default gen_random_uuid(),
  ingredient    text not null references public.ingredients (key),
  purchase_date date not null,
  kg            numeric(10, 3) not null check (kg > 0),
  total_cost    numeric(14, 2),                       -- tham khảo; tiền đã ở expenses
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id)
);
create index if not exists ingredient_purchases_date_idx
  on public.ingredient_purchases (purchase_date);
create index if not exists ingredient_purchases_ing_idx
  on public.ingredient_purchases (ingredient);
comment on table public.ingredient_purchases is
  'Mỗi lần nhập bột/gia vị (kg). Tiền chỉ để định giá tồn — KHÔNG cộng vào P&L.';

-- ============================================================================
-- 3. RLS — như các bảng khác: authenticated đọc/ghi/sửa, owner xóa
-- ============================================================================
alter table public.ingredients          enable row level security;
alter table public.ingredient_purchases enable row level security;

drop policy if exists "ingredients: authenticated đọc" on public.ingredients;
create policy "ingredients: authenticated đọc" on public.ingredients
  for select using (auth.uid() is not null);
drop policy if exists "ingredients: owner sửa" on public.ingredients;
create policy "ingredients: owner sửa" on public.ingredients
  for update using (public.is_owner());

drop policy if exists "ingredient_purchases: authenticated đọc" on public.ingredient_purchases;
create policy "ingredient_purchases: authenticated đọc" on public.ingredient_purchases
  for select using (auth.uid() is not null);
drop policy if exists "ingredient_purchases: authenticated ghi" on public.ingredient_purchases;
create policy "ingredient_purchases: authenticated ghi" on public.ingredient_purchases
  for insert with check (auth.uid() is not null);
drop policy if exists "ingredient_purchases: authenticated sửa" on public.ingredient_purchases;
create policy "ingredient_purchases: authenticated sửa" on public.ingredient_purchases
  for update using (auth.uid() is not null);
drop policy if exists "ingredient_purchases: owner xóa" on public.ingredient_purchases;
create policy "ingredient_purchases: owner xóa" on public.ingredient_purchases
  for delete using (public.is_owner());

-- ============================================================================
-- 4. View tồn kho: nhập − (số bánh × định mức)
-- ============================================================================
create or replace view public.ingredient_inventory
with (security_invoker = on) as
  with pur as (
    select
      ingredient,
      sum(kg)                       as total_kg,
      sum(coalesce(total_cost, 0))  as total_cost,
      min(purchase_date)            as start_date
    from public.ingredient_purchases
    group by ingredient
  )
  select
    i.key                                   as ingredient,
    i.label,
    i.grams_per_cake,
    coalesce(p.total_kg, 0)                 as total_kg,
    coalesce(p.total_cost, 0)               as total_cost,
    p.start_date,
    coalesce(c.cakes, 0)                    as cakes_used,
    -- kg đã dùng = số bánh × gram/bánh ÷ 1000
    round(coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0, 3)          as kg_used,
    round(coalesce(p.total_kg, 0)
          - coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0, 3)        as kg_on_hand,
    -- đơn giá bình quân mỗi kg (nếu có ghi tiền)
    case when coalesce(p.total_kg, 0) > 0
      then round(coalesce(p.total_cost, 0) / p.total_kg) end            as cost_per_kg,
    -- giá trị tồn (tham khảo)
    case when coalesce(p.total_kg, 0) > 0
      then round((coalesce(p.total_kg, 0)
                  - coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0)
                 * coalesce(p.total_cost, 0) / p.total_kg) end          as inventory_value,
    -- còn đủ làm bao nhiêu bánh nữa
    case when i.grams_per_cake > 0
      then floor((coalesce(p.total_kg, 0)
                  - coalesce(c.cakes, 0) * i.grams_per_cake / 1000.0)
                 * 1000.0 / i.grams_per_cake) end                       as cakes_left
  from public.ingredients i
  left join pur p on p.ingredient = i.key
  -- Bánh tính từ ngày nhập đầu tiên của CHÍNH nguyên liệu đó (bán + tặng).
  left join lateral (
    select
      coalesce((select sum(s.quantity) from public.sales s
                 where s.sale_date >= p.start_date), 0)
    + coalesce((select sum(g.quantity) from public.shrimp_gifts g
                 where g.gift_date >= p.start_date), 0) as cakes
  ) c on p.start_date is not null
  order by i.sort_order;
comment on view public.ingredient_inventory is
  'Tồn kho bột/gia vị = kg nhập − (bánh bán+tặng × định mức). Giá trị tồn chỉ tham khảo, không vào P&L.';
