-- ebisen — TỒN KHO VẬT TƯ (túi, tem) + CHI PHÍ LŨY TIẾN vào P&L.
--
-- Mô hình:
--   - material_purchases: mỗi lần nhập túi/tem (số lượng + tổng chi phí).
--   - Mỗi bánh xuất ra (BÁN + TẶNG) dùng 1 túi + 1 tem → "đã dùng" = số bánh.
--   - Chi phí LŨY TIẾN: mỗi tháng chỉ tính (số bánh × đơn giá túi+tem) vào chi phí
--     (P&L). Phần chưa dùng = TỒN KHO (giá trị chưa hạch toán).
--   - Đơn giá = tổng chi phí / tổng số lượng (bình quân gia quyền).
--
-- Toàn bộ số liệu tính ở view (nguyên tắc kiến trúc: không tính ở React).

-- ============================================================================
-- 1. Bảng material_purchases
-- ============================================================================
create table public.material_purchases (
  id            uuid primary key default gen_random_uuid(),
  material      text not null check (material in ('tui', 'tem')),  -- túi | tem
  purchase_date date not null,
  quantity      integer not null check (quantity > 0),             -- số túi / số tem
  total_cost    numeric(14, 2) not null check (total_cost >= 0),   -- tổng tiền lần nhập
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id)
);
create index material_purchases_date_idx on public.material_purchases (purchase_date);
comment on table public.material_purchases is
  'Nhập vật tư đóng gói (túi/tem). Chi phí phân bổ dần theo số bánh xuất ra; phần chưa dùng là tồn kho.';

-- ============================================================================
-- 2. RLS — như expenses: authenticated đọc/ghi/sửa, owner xóa
-- ============================================================================
alter table public.material_purchases enable row level security;

create policy "material_purchases: authenticated đọc" on public.material_purchases
  for select using (auth.uid() is not null);
create policy "material_purchases: authenticated ghi" on public.material_purchases
  for insert with check (auth.uid() is not null);
create policy "material_purchases: authenticated sửa" on public.material_purchases
  for update using (auth.uid() is not null);
create policy "material_purchases: owner xóa" on public.material_purchases
  for delete using (public.is_owner());

-- ============================================================================
-- 3. Seed dữ liệu hiện tại (owner đang có sẵn)
--    Túi: 433kg × 25 túi/kg = 10.825 túi, 35.000.000đ
--    Tem: 10.000 tem, 5.350.000đ
-- ============================================================================
insert into public.material_purchases (material, purchase_date, quantity, total_cost, note) values
  ('tui', '2026-07-01', 10825, 35000000, '433kg × 25 túi/kg'),
  ('tem', '2026-07-01', 10000, 5350000, '10.000 tem');

-- ============================================================================
-- 4. Số bánh XUẤT RA theo tháng (bán + tặng) — mỗi bánh dùng 1 túi + 1 tem
-- ============================================================================
create view public.banh_out_by_month
with (security_invoker = on) as
  with s as (
    select date_trunc('month', sale_date)::date as month, sum(quantity) as q
    from public.sales group by 1
  ),
  g as (
    select date_trunc('month', gift_date)::date as month, sum(quantity) as q
    from public.shrimp_gifts group by 1
  ),
  months as (select month from s union select month from g)
  select
    m.month,
    coalesce(s.q, 0) + coalesce(g.q, 0) as banh_out
  from months m
  left join s on s.month = m.month
  left join g on g.month = m.month
  order by m.month;

-- ============================================================================
-- 5. Tổng hợp mỗi vật tư: đơn giá bình quân, tổng nhập, ngày bắt đầu
-- ============================================================================
create view public.material_summary
with (security_invoker = on) as
  select
    material,
    sum(quantity)::bigint                                 as total_in,
    sum(total_cost)                                       as total_cost_in,
    case when sum(quantity) > 0 then sum(total_cost) / sum(quantity) else 0 end as unit_cost,
    min(purchase_date)                                    as start_date
  from public.material_purchases
  group by material;

-- ============================================================================
-- 6. Tồn kho vật tư: đã dùng (số bánh từ tháng bắt đầu), còn lại, giá trị tồn
-- ============================================================================
create view public.material_inventory
with (security_invoker = on) as
  select
    ms.material,
    ms.total_in,
    ms.total_cost_in,
    ms.unit_cost,
    ms.start_date,
    coalesce((
      select sum(bo.banh_out) from public.banh_out_by_month bo
      where bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as used,
    ms.total_in - coalesce((
      select sum(bo.banh_out) from public.banh_out_by_month bo
      where bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as on_hand,
    (ms.total_in - coalesce((
      select sum(bo.banh_out) from public.banh_out_by_month bo
      where bo.month >= date_trunc('month', ms.start_date)::date
    ), 0)) * ms.unit_cost as inventory_value
  from public.material_summary ms;

-- ============================================================================
-- 7. Chi phí vật tư LŨY TIẾN theo tháng (số bánh × đơn giá, chỉ từ tháng có vật tư)
-- ============================================================================
create view public.material_cost_by_month
with (security_invoker = on) as
  select
    bo.month,
    coalesce(sum(bo.banh_out * ms.unit_cost) filter (
      where ms.material = 'tui' and bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as tui_cost,
    coalesce(sum(bo.banh_out * ms.unit_cost) filter (
      where ms.material = 'tem' and bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as tem_cost,
    coalesce(sum(bo.banh_out * ms.unit_cost) filter (
      where bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as material_cost
  from public.banh_out_by_month bo
  cross join public.material_summary ms
  group by bo.month
  order by bo.month;

-- ============================================================================
-- 8. P&L có thêm chi phí vật tư lũy tiến
--    profit = doanh thu − chi phí tiền mặt − chi phí vật tư
-- ============================================================================
drop view if exists public.pnl_by_month;
create view public.pnl_by_month
with (security_invoker = on) as
  with months as (
    select month from public.revenue_by_month
    union select month from public.expenses_by_month
    union select month from public.material_cost_by_month
  )
  select
    m.month,
    coalesce(r.revenue, 0)                                                    as revenue,
    coalesce(x.expenses, 0)                                                   as cash_expenses,
    coalesce(mc.material_cost, 0)                                             as material_cost,
    coalesce(x.expenses, 0) + coalesce(mc.material_cost, 0)                   as expenses,
    coalesce(r.revenue, 0) - coalesce(x.expenses, 0) - coalesce(mc.material_cost, 0) as profit
  from months m
  left join public.revenue_by_month     r  on r.month  = m.month
  left join public.expenses_by_month    x  on x.month  = m.month
  left join public.material_cost_by_month mc on mc.month = m.month
  order by m.month;
