-- Thêm cột no_bag vào sales: true = khách không lấy túi bạc.
-- Mặc định false (mọi đơn cũ coi là có dùng túi).
alter table public.sales
  add column if not exists no_bag boolean not null default false;

-- ============================================================================
-- Cập nhật views để túi (tui) chỉ tính đơn có dùng túi (no_bag = false).
-- Tem vẫn tính tất cả đơn (mọi bánh đều có tem).
-- Giữ cột banh_out (= tem_out) để không phá backward compat.
-- ============================================================================

drop view if exists public.pnl_by_month          cascade;
drop view if exists public.material_cost_by_month cascade;
drop view if exists public.material_inventory     cascade;
drop view if exists public.banh_out_by_month      cascade;

-- banh_out_by_month: tách tui_out / tem_out
create view public.banh_out_by_month
with (security_invoker = on) as
  with s_tui as (
    -- Túi: chỉ đơn không tích "không dùng túi"
    select date_trunc('month', sale_date)::date as month, sum(quantity) as q
    from public.sales where no_bag = false group by 1
  ),
  s_tem as (
    -- Tem: tất cả đơn
    select date_trunc('month', sale_date)::date as month, sum(quantity) as q
    from public.sales group by 1
  ),
  g as (
    -- Bánh tặng: dùng cả túi lẫn tem
    select date_trunc('month', gift_date)::date as month, sum(quantity) as q
    from public.shrimp_gifts group by 1
  ),
  months as (
    select month from s_tem
    union select month from g
  )
  select
    m.month,
    coalesce(s_tui.q, 0) + coalesce(g.q, 0)  as tui_out,
    coalesce(s_tem.q, 0) + coalesce(g.q, 0)  as tem_out,
    coalesce(s_tem.q, 0) + coalesce(g.q, 0)  as banh_out  -- alias backward compat
  from months m
  left join s_tui on s_tui.month = m.month
  left join s_tem on s_tem.month = m.month
  left join g     on g.month     = m.month
  order by m.month;

-- material_inventory: dùng tui_out cho túi, tem_out cho tem
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

-- material_cost_by_month: túi dùng tui_out, tem dùng tem_out
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

-- pnl_by_month: giữ nguyên logic, chỉ dùng lại material_cost_by_month đã cập nhật
create view public.pnl_by_month
with (security_invoker = on) as
  with months as (
    select month from public.revenue_by_month
    union select month from public.expenses_by_month
    union select month from public.material_cost_by_month
  )
  select
    m.month,
    coalesce(r.revenue, 0)                                                          as revenue,
    coalesce(x.expenses, 0)                                                         as cash_expenses,
    coalesce(mc.material_cost, 0)                                                   as material_cost,
    coalesce(x.expenses, 0) + coalesce(mc.material_cost, 0)                         as expenses,
    coalesce(r.revenue, 0) - coalesce(x.expenses, 0) - coalesce(mc.material_cost, 0) as profit
  from months m
  left join public.revenue_by_month       r  on r.month  = m.month
  left join public.expenses_by_month      x  on x.month  = m.month
  left join public.material_cost_by_month mc on mc.month = m.month
  order by m.month;
