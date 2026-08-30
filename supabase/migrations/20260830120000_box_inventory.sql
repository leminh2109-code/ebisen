-- ============================================================================
-- TỒN KHO HỘP COMBO: thêm "Hộp 3 bánh" vào menu + bảng theo dõi nhập hộp.
-- Chi phí hộp phân bổ theo số hộp bán ra (giống mô hình túi/tem).
-- ============================================================================

-- 1. Thêm is_box vào menu (đánh dấu món hàng dùng hộp thay túi)
alter table public.menu
  add column if not exists is_box boolean not null default false;

-- 2. Thêm "Hộp 3 bánh" vào menu
insert into public.menu (name, price, active, sort_order, shrimp_per_unit, is_box)
values ('Hộp 3 bánh', 210000, true, 3, 3, true)
on conflict do nothing;

-- 3. Bảng box_purchases: mỗi lần nhập hộp
create table if not exists public.box_purchases (
  id            uuid primary key default gen_random_uuid(),
  purchase_date date not null,
  quantity      integer not null check (quantity > 0),
  total_cost    numeric(14, 2) not null check (total_cost >= 0),
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);
create index if not exists box_purchases_date_idx on public.box_purchases (purchase_date);
comment on table public.box_purchases is
  'Nhập hộp combo. Chi phí phân bổ theo số hộp bán ra mỗi tháng; phần chưa dùng là tồn kho.';

-- 4. RLS
alter table public.box_purchases enable row level security;

do $$ begin
  create policy "box_purchases: authenticated đọc" on public.box_purchases
    for select using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "box_purchases: authenticated ghi" on public.box_purchases
    for insert with check (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "box_purchases: authenticated sửa" on public.box_purchases
    for update using (auth.uid() is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "box_purchases: owner xóa" on public.box_purchases
    for delete using (public.is_owner());
exception when duplicate_object then null; end $$;

-- 5. Seed: lô 500 hộp đầu tiên (30/08/2026, 8,640,000đ = 17,280đ/hộp)
insert into public.box_purchases (purchase_date, quantity, total_cost, note)
values ('2026-08-30', 500, 8640000, 'Lô đầu — 500 hộp, 17.280đ/hộp');

-- ============================================================================
-- Views: box_summary → hop_out_by_month → box_inventory, box_cost_by_month
-- Sau đó rebuild pnl_by_month để gộp box_cost vào material_cost.
-- ============================================================================

-- 6. box_summary: đơn giá bình quân tổng hộp đã nhập
create or replace view public.box_summary
with (security_invoker = on) as
  select
    sum(quantity)::bigint                                      as total_in,
    sum(total_cost)                                            as total_cost_in,
    case when sum(quantity) > 0
      then sum(total_cost) / sum(quantity) else 0 end          as unit_cost,
    min(purchase_date)                                         as start_date
  from public.box_purchases;

-- 7. hop_out_by_month: số hộp bán ra mỗi tháng (từ menu is_box = true)
create or replace view public.hop_out_by_month
with (security_invoker = on) as
  select
    date_trunc('month', s.sale_date)::date as month,
    sum(s.quantity)::bigint                as hop_out
  from public.sales s
  join public.menu m on m.id = s.menu_item_id and m.is_box = true
  group by 1
  order by 1;

-- 8. box_inventory: tồn kho hộp
create or replace view public.box_inventory
with (security_invoker = on) as
  select
    bs.total_in,
    bs.total_cost_in,
    bs.unit_cost,
    bs.start_date,
    coalesce((
      select sum(hop_out) from public.hop_out_by_month
      where month >= date_trunc('month', bs.start_date)::date
    ), 0)::bigint                                             as used,
    (bs.total_in - coalesce((
      select sum(hop_out) from public.hop_out_by_month
      where month >= date_trunc('month', bs.start_date)::date
    ), 0))::bigint                                            as on_hand
  from public.box_summary bs;

-- 9. box_cost_by_month: chi phí hộp phân bổ từng tháng
create or replace view public.box_cost_by_month
with (security_invoker = on) as
  select
    ho.month,
    ho.hop_out,
    round(ho.hop_out * bs.unit_cost)   as box_cost
  from public.hop_out_by_month ho
  cross join public.box_summary bs
  order by ho.month;

-- ============================================================================
-- Rebuild pnl_by_month để gộp box_cost vào (cascade qua fix_pnl_station_share)
-- ============================================================================
drop view if exists public.pnl_by_month;

create view public.pnl_by_month
with (security_invoker = on) as
  with months as (
    select month from public.revenue_by_month
    union select month from public.expenses_by_month
    union select month from public.material_cost_by_month
    union select month from public.box_cost_by_month
  )
  select
    m.month,
    coalesce(r.revenue, 0)                                                                        as revenue,
    coalesce(x.expenses, 0)                                                                       as cash_expenses,
    coalesce(mc.material_cost, 0) + coalesce(bc.box_cost, 0)                                      as material_cost,
    round(coalesce(r.revenue, 0) * 0.30)                                                          as station_share,
    coalesce(x.expenses, 0)
      + coalesce(mc.material_cost, 0)
      + coalesce(bc.box_cost, 0)
      + round(coalesce(r.revenue, 0) * 0.30)                                                      as expenses,
    coalesce(r.revenue, 0)
      - coalesce(x.expenses, 0)
      - coalesce(mc.material_cost, 0)
      - coalesce(bc.box_cost, 0)
      - round(coalesce(r.revenue, 0) * 0.30)                                                      as profit
  from months m
  left join public.revenue_by_month       r  on r.month  = m.month
  left join public.expenses_by_month      x  on x.month  = m.month
  left join public.material_cost_by_month mc on mc.month = m.month
  left join public.box_cost_by_month      bc on bc.month = m.month
  order by m.month;

comment on view public.pnl_by_month is
  'P&L tháng. profit = doanh thu − chi phí tiền mặt − CP túi/tem − CP hộp combo − chia sẻ trạm (30%). expenses = tổng 4 khoản chi.';
