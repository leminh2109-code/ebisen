-- Chuyển chi phí tôm từ cash-based (expenses) sang inventory-based (như túi/tem/hộp).
-- shrimp_cost_by_month = số tôm dùng trong tháng × đơn giá bình quân toàn kho.
-- Sau khi apply: xóa danh mục "Tôm" / "Tôm thử" khỏi bảng expenses.

-- 1. shrimp_cost_by_month
create or replace view public.shrimp_cost_by_month
with (security_invoker = on) as
  select
    su.month,
    round(su.shrimp_used * coalesce(si.unit_cost, 0)) as shrimp_cost
  from public.shrimp_used_by_month su
  cross join lateral (
    select case when total_in > 0 then total_cost_in / total_in else 0 end as unit_cost
    from public.shrimp_inventory
    limit 1
  ) si;

comment on view public.shrimp_cost_by_month is
  'Chi phí tôm phân bổ theo tháng = số tôm đã dùng × đơn giá bình quân. Không tính 2 lần với bảng expenses — sau khi apply migration này, xóa danh mục Tôm/Tôm thử khỏi expenses.';

-- 2. Rebuild pnl_by_month: thêm shrimp_cost thành cột riêng
drop view if exists public.pnl_by_month;

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
  'P&L tháng. profit = doanh thu − chi phí tiền mặt − CP túi/tem − CP hộp − CP tôm − chia sẻ trạm (30%).';
