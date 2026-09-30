-- Hộp combo (is_box=true) không dùng túi bạc — loại khỏi tui_out.
-- Tem vẫn tính 1 tem/hộp (giữ nguyên tem_out).
-- Bánh tặng hộp cũng không dùng túi.

drop view if exists public.pnl_by_month          cascade;
drop view if exists public.material_cost_by_month cascade;
drop view if exists public.material_inventory     cascade;
drop view if exists public.banh_out_by_month      cascade;

-- banh_out_by_month: tui_out loại is_box=true
create view public.banh_out_by_month
with (security_invoker = on) as
  with s_tui as (
    -- Túi: đơn không tích no_bag VÀ không phải hộp combo
    select date_trunc('month', s.sale_date)::date as month, sum(s.quantity) as q
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where s.no_bag = false
      and coalesce(m.is_box, false) = false
    group by 1
  ),
  s_tem as (
    -- Tem: chỉ đơn không phải hộp (hộp không dùng tem)
    select date_trunc('month', s.sale_date)::date as month, sum(s.quantity) as q
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where coalesce(m.is_box, false) = false
    group by 1
  ),
  g_tui as (
    -- Bánh tặng túi: chỉ tặng không phải hộp
    select date_trunc('month', g.gift_date)::date as month, sum(g.quantity) as q
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where coalesce(m.is_box, false) = false
    group by 1
  ),
  g_tem as (
    -- Bánh tặng tem: chỉ tặng không phải hộp
    select date_trunc('month', g.gift_date)::date as month, sum(g.quantity) as q
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where coalesce(m.is_box, false) = false
    group by 1
  ),
  months as (
    select month from s_tem
    union select month from g_tem
  )
  select
    m.month,
    coalesce(s_tui.q, 0) + coalesce(g_tui.q, 0)  as tui_out,
    coalesce(s_tem.q, 0) + coalesce(g_tem.q, 0)  as tem_out,
    coalesce(s_tem.q, 0) + coalesce(g_tem.q, 0)  as banh_out
  from months m
  left join s_tui on s_tui.month = m.month
  left join s_tem on s_tem.month = m.month
  left join g_tui on g_tui.month = m.month
  left join g_tem on g_tem.month = m.month
  order by m.month;

comment on view public.banh_out_by_month is
  'tui_out + tem_out: chỉ bánh đơn (loại hộp is_box=true). Hộp không dùng túi lẫn tem.';

-- material_inventory: giữ nguyên logic, dùng banh_out_by_month đã sửa
create view public.material_inventory
with (security_invoker = on) as
  select
    ms.material,
    ms.total_in,
    ms.total_cost_in,
    ms.unit_cost,
    ms.start_date,
    coalesce((
      select sum(case when ms.material = 'tui' then bo.tui_out else bo.tem_out end)
      from public.banh_out_by_month bo
      where bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as used,
    ms.total_in - coalesce((
      select sum(case when ms.material = 'tui' then bo.tui_out else bo.tem_out end)
      from public.banh_out_by_month bo
      where bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as on_hand,
    (ms.total_in - coalesce((
      select sum(case when ms.material = 'tui' then bo.tui_out else bo.tem_out end)
      from public.banh_out_by_month bo
      where bo.month >= date_trunc('month', ms.start_date)::date
    ), 0)) * ms.unit_cost as inventory_value
  from public.material_summary ms;

-- material_cost_by_month: giữ nguyên, dùng banh_out_by_month đã sửa
create view public.material_cost_by_month
with (security_invoker = on) as
  select
    bo.month,
    coalesce(sum(bo.tui_out * ms.unit_cost) filter (
      where ms.material = 'tui' and bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as tui_cost,
    coalesce(sum(bo.tem_out * ms.unit_cost) filter (
      where ms.material = 'tem' and bo.month >= date_trunc('month', ms.start_date)::date
    ), 0) as tem_cost,
    coalesce(
      sum(bo.tui_out * ms.unit_cost) filter (
        where ms.material = 'tui' and bo.month >= date_trunc('month', ms.start_date)::date
      ) +
      sum(bo.tem_out * ms.unit_cost) filter (
        where ms.material = 'tem' and bo.month >= date_trunc('month', ms.start_date)::date
      ),
    0) as material_cost
  from public.banh_out_by_month bo
  cross join public.material_summary ms
  group by bo.month
  order by bo.month;

-- pnl_by_month: rebuild với đầy đủ cột (giống migration mới nhất)
create view public.pnl_by_month
with (security_invoker = on) as
select
  m.month,
  coalesce(r.revenue,          0) as revenue,
  coalesce(x.expenses,         0) as cash_expenses,
  coalesce(mc.material_cost,   0) as material_cost,
  coalesce(bc.box_cost,        0) as box_cost,
  coalesce(sc.shrimp_cost,     0) as shrimp_cost,
  coalesce(ic.ingredient_cost, 0) as ingredient_cost,
  coalesce(bon.bonus_cost,     0) as bonus_cost,
  coalesce(sal.salary_cost,    0) as salary_cost,
  round(coalesce(r.revenue,    0) * 0.30) as station_share,
  coalesce(x.expenses,         0)
    + coalesce(mc.material_cost,  0)
    + coalesce(bc.box_cost,       0)
    + coalesce(sc.shrimp_cost,    0)
    + coalesce(ic.ingredient_cost,0)
    + coalesce(bon.bonus_cost,    0)
    + coalesce(sal.salary_cost,   0)
    + round(coalesce(r.revenue,   0) * 0.30) as expenses,
  coalesce(r.revenue,          0)
    - coalesce(x.expenses,         0)
    - coalesce(mc.material_cost,   0)
    - coalesce(bc.box_cost,        0)
    - coalesce(sc.shrimp_cost,     0)
    - coalesce(ic.ingredient_cost, 0)
    - coalesce(bon.bonus_cost,     0)
    - coalesce(sal.salary_cost,    0)
    - round(coalesce(r.revenue,    0) * 0.30) as profit
from (
  select month from public.revenue_by_month
  union select month from public.expenses_by_month
  union select month from public.material_cost_by_month
  union select month from public.box_cost_by_month
  union select month from public.shrimp_cost_by_month
  union select month from public.bonus_cost_by_month
  union select month from public.salary_cost_by_month
) m
left join public.revenue_by_month         r   on r.month   = m.month
left join public.expenses_by_month        x   on x.month   = m.month
left join public.material_cost_by_month   mc  on mc.month  = m.month
left join public.box_cost_by_month        bc  on bc.month  = m.month
left join public.shrimp_cost_by_month     sc  on sc.month  = m.month
left join public.ingredient_cost_by_month ic  on ic.month  = m.month
left join public.bonus_cost_by_month      bon on bon.month = m.month
left join public.salary_cost_by_month     sal on sal.month = m.month
order by m.month desc;

comment on view public.pnl_by_month is
  'P&L tháng. profit = DT − CP tiền mặt − CP NVL − CP hộp − CP tôm − CP bột − thưởng NV − lương NV − chia trạm 30%.';
