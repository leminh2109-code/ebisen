-- Tính tôm siêu thị vào tồn kho tôm.
-- Mỗi lần giao hộp cho siêu thị tiêu tôm = quantity_in × shrimp_per_box.
-- shrimp_per_box mặc định 3 (hiện tại chỉ bán hộp 3 tôm ở siêu thị).

-- 1. Thêm cột shrimp_per_box
alter table public.supermarket_batches
  add column shrimp_per_box integer not null default 3 check (shrimp_per_box >= 0);

comment on column public.supermarket_batches.shrimp_per_box is
  'Số con tôm trong mỗi hộp giao siêu thị. Dùng để trừ tồn kho tôm.';

-- 2. Rebuild các view theo đúng thứ tự phụ thuộc
drop view if exists public.pnl_by_month;
drop view if exists public.shrimp_cost_by_month;
drop view if exists public.shrimp_used_by_month;

-- shrimp_used_by_month: tôm bán + tôm tặng + tôm siêu thị
create view public.shrimp_used_by_month
with (security_invoker = on) as
  select
    month,
    coalesce(sum(shrimp_used), 0) as shrimp_used
  from (
    -- tôm bán
    select
      date_trunc('month', s.sale_date)::date           as month,
      sum(s.quantity * m.shrimp_per_unit)              as shrimp_used
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where m.shrimp_per_unit > 0
    group by date_trunc('month', s.sale_date)

    union all

    -- tôm tặng
    select
      date_trunc('month', g.gift_date)::date           as month,
      sum(g.quantity * m.shrimp_per_unit)              as shrimp_used
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where m.shrimp_per_unit > 0
    group by date_trunc('month', g.gift_date)

    union all

    -- tôm siêu thị (giao hộp)
    select
      date_trunc('month', batch_date)::date            as month,
      sum(quantity_in * shrimp_per_box)                as shrimp_used
    from public.supermarket_batches
    where shrimp_per_box > 0
    group by date_trunc('month', batch_date)
  ) src
  group by month
  order by month;

comment on view public.shrimp_used_by_month is
  'Tôm đã dùng mỗi tháng = bán + tặng + giao siêu thị. Dùng bởi shrimp_cost_by_month → pnl_by_month.';

-- shrimp_inventory: cập nhật tổng tôm đã dùng (thêm siêu thị)
create or replace view public.shrimp_inventory
with (security_invoker = on) as
  with ins as (
    select
      coalesce(sum(shrimp_count), 0)::bigint as total_in,
      coalesce(sum(kg), 0)                   as total_kg,
      coalesce(sum(total_cost), 0)           as total_cost_in,
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
  ),
  used_supermarket as (
    select coalesce(sum(quantity_in * shrimp_per_box), 0)::bigint as v
    from public.supermarket_batches
    where shrimp_per_box > 0
      and batch_date >= (select start_date from ins)
  )
  select
    ins.total_in,
    ins.total_kg,
    (select v from used_sales) + (select v from used_gifts) + (select v from used_supermarket) as total_used,
    ins.total_in - ((select v from used_sales) + (select v from used_gifts) + (select v from used_supermarket)) as on_hand,
    ins.start_date,
    ins.total_cost_in,
    case when ins.total_in > 0 then ins.total_cost_in / ins.total_in else 0 end as unit_cost,
    (ins.total_in - ((select v from used_sales) + (select v from used_gifts) + (select v from used_supermarket)))
      * (case when ins.total_in > 0 then ins.total_cost_in / ins.total_in else 0 end) as inventory_value
  from ins;

-- shrimp_cost_by_month (rebuild — phụ thuộc shrimp_used_by_month + shrimp_inventory)
create view public.shrimp_cost_by_month
with (security_invoker = on) as
  select
    su.month,
    round(su.shrimp_used * coalesce(si.unit_cost, 0)) as shrimp_cost
  from public.shrimp_used_by_month su
  cross join lateral (
    select case when total_in > 0 then total_cost_in / total_in else 0 end as unit_cost
    from public.shrimp_inventory
    limit 1
  ) si
  where su.month >= '2026-08-01';

comment on view public.shrimp_cost_by_month is
  'Chi phí tôm phân bổ theo tháng = tôm đã dùng (bán + tặng + siêu thị) × đơn giá bình quân. Chỉ áp dụng từ T8/2026.';

-- pnl_by_month (rebuild — giữ nguyên logic)
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,        0)                     as revenue,
  coalesce(x.expenses,       0)                     as cash_expenses,
  coalesce(mc.material_cost, 0)                     as material_cost,
  coalesce(bc.box_cost,      0)                     as box_cost,
  coalesce(sc.shrimp_cost,   0)                     as shrimp_cost,
  round(coalesce(r.revenue,  0) * 0.30)             as station_share,
  coalesce(x.expenses,       0)
    + coalesce(mc.material_cost, 0)
    + coalesce(bc.box_cost,      0)
    + coalesce(sc.shrimp_cost,   0)
    + round(coalesce(r.revenue,  0) * 0.30)         as expenses,
  coalesce(r.revenue,        0)
    - coalesce(x.expenses,       0)
    - coalesce(mc.material_cost, 0)
    - coalesce(bc.box_cost,      0)
    - coalesce(sc.shrimp_cost,   0)
    - round(coalesce(r.revenue,  0) * 0.30)         as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
) m
left join public.revenue_by_month       r  on r.month  = m.month
left join public.expenses_by_month      x  on x.month  = m.month
left join public.material_cost_by_month mc on mc.month = m.month
left join public.box_cost_by_month      bc on bc.month = m.month
left join public.shrimp_cost_by_month   sc on sc.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = doanh thu − CP tiền mặt − CP túi/tem − CP hộp − CP tôm (bán+tặng+siêu thị) − chia sẻ trạm (30%).';
