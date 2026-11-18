-- Lương hàng tháng tự động từ bảng config — không cần nhập expenses mỗi tháng.
-- salary_cost_by_month sinh ra 1 dòng/tháng từ effective_from đến tháng hiện tại.
-- Nếu lương thay đổi: insert thêm 1 dòng mới vào salary_config với effective_from mới.

-- 1. Bảng cấu hình lương cố định
create table public.salary_config (
  id             serial primary key,
  effective_from date              not null,
  monthly_amount numeric(12,0)     not null,
  note           text,
  created_at     timestamptz       default now()
);

comment on table public.salary_config is
  'Lương cố định hàng tháng. Nhiều dòng = lịch sử thay đổi lương; dòng có effective_from lớn nhất áp dụng cho tháng hiện tại.';

insert into public.salary_config (effective_from, monthly_amount, note)
values ('2026-06-01', 26000000, 'Lương Nam + Tùng');

-- RLS: chỉ owner đọc/ghi
alter table public.salary_config enable row level security;

create policy "owner can read salary_config"
  on public.salary_config for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

create policy "owner can write salary_config"
  on public.salary_config for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- 2. Rebuild salary_cost_by_month: tự sinh từ config (không cần expenses nữa)
drop view if exists public.pnl_by_month;
drop view if exists public.salary_cost_by_month;

create view public.salary_cost_by_month
with (security_invoker = on) as
select
  gs.month,
  cfg.monthly_amount as salary_cost
from (
  select date_trunc('month', gs)::date as month
  from generate_series(
    (select min(effective_from) from public.salary_config),
    date_trunc('month', current_date)::date,
    '1 month'::interval
  ) gs
) gs
cross join lateral (
  select monthly_amount
  from public.salary_config
  where effective_from <= gs.month
  order by effective_from desc
  limit 1
) cfg
order by month;

comment on view public.salary_cost_by_month is
  'Lương tháng = monthly_amount từ salary_config (dòng effective_from gần nhất). Tự sinh đến tháng hiện tại — không cần nhập expenses.';

-- 3. Rebuild pnl_by_month (giữ nguyên, chỉ rebuild lại vì drop ở trên)
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,          0)                     as revenue,
  coalesce(x.expenses,         0)                     as cash_expenses,
  coalesce(mc.material_cost,   0)                     as material_cost,
  coalesce(bc.box_cost,        0)                     as box_cost,
  coalesce(sc.shrimp_cost,     0)                     as shrimp_cost,
  coalesce(ic.ingredient_cost, 0)                     as ingredient_cost,
  coalesce(cc.consumable_cost, 0)                     as consumable_cost,
  coalesce(bon.bonus_cost,     0)                     as bonus_cost,
  coalesce(sal.salary_cost,    0)                     as salary_cost,
  round(coalesce(r.revenue,    0) * 0.30)             as station_share,
  coalesce(x.expenses,         0)
    + coalesce(mc.material_cost,   0)
    + coalesce(bc.box_cost,        0)
    + coalesce(sc.shrimp_cost,     0)
    + coalesce(ic.ingredient_cost, 0)
    + coalesce(cc.consumable_cost, 0)
    + coalesce(bon.bonus_cost,     0)
    + coalesce(sal.salary_cost,    0)
    + round(coalesce(r.revenue,    0) * 0.30)         as expenses,
  coalesce(r.revenue,          0)
    - coalesce(x.expenses,         0)
    - coalesce(mc.material_cost,   0)
    - coalesce(bc.box_cost,        0)
    - coalesce(sc.shrimp_cost,     0)
    - coalesce(ic.ingredient_cost, 0)
    - coalesce(cc.consumable_cost, 0)
    - coalesce(bon.bonus_cost,     0)
    - coalesce(sal.salary_cost,    0)
    - round(coalesce(r.revenue,    0) * 0.30)         as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
  union select month from public.ingredient_cost_by_month
  union select month from public.consumable_cost_by_month
  union select month from public.bonus_cost_by_month
  union select month from public.salary_cost_by_month
) m
left join public.revenue_by_month          r   on r.month   = m.month
left join public.expenses_by_month         x   on x.month   = m.month
left join public.material_cost_by_month    mc  on mc.month  = m.month
left join public.box_cost_by_month         bc  on bc.month  = m.month
left join public.shrimp_cost_by_month      sc  on sc.month  = m.month
left join public.ingredient_cost_by_month  ic  on ic.month  = m.month
left join public.consumable_cost_by_month  cc  on cc.month  = m.month
left join public.bonus_cost_by_month       bon on bon.month = m.month
left join public.salary_cost_by_month      sal on sal.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = DT − CP tiền mặt − túi/tem − hộp − tôm − bột − dầu/túi bóng − thưởng − lương − trạm 30%.';
