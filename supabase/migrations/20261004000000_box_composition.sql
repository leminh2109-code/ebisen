-- Theo dõi thành phần bánh trong hộp: bao nhiêu bánh 1 tôm / 2 tôm mỗi hộp.
-- Từ đó tính chính xác số tôm trừ kho thay vì mặc định 3 con/hộp.

-- 1. Thêm cột vào bảng sales
alter table public.sales
  add column if not exists box_1tom integer check (box_1tom >= 0),
  add column if not exists box_2tom integer check (box_2tom >= 0);

comment on column public.sales.box_1tom is
  'Số bánh 1 tôm trong MỖI HỘP (is_box=true). box_1tom + box_2tom = 3.';
comment on column public.sales.box_2tom is
  'Số bánh 2 tôm trong MỖI HỘP (is_box=true). box_1tom + box_2tom = 3.';

-- 2. Rebuild views theo thứ tự phụ thuộc
drop view if exists public.pnl_by_month;
drop view if exists public.shrimp_cost_by_month;
drop view if exists public.shrimp_used_by_month;

-- shrimp_used_by_month: dùng thành phần hộp khi có, fallback shrimp_per_unit
create view public.shrimp_used_by_month
with (security_invoker = on) as
  select
    month,
    coalesce(sum(shrimp_used), 0) as shrimp_used
  from (
    -- tôm bán
    select
      date_trunc('month', s.sale_date)::date as month,
      sum(
        case
          when m.is_box and s.box_1tom is not null
            then s.quantity * (s.box_1tom * 1 + s.box_2tom * 2)
          else s.quantity * m.shrimp_per_unit
        end
      ) as shrimp_used
    from public.sales s
    join public.menu m on m.id = s.menu_item_id
    where m.shrimp_per_unit > 0
    group by date_trunc('month', s.sale_date)

    union all

    -- tôm tặng
    select
      date_trunc('month', g.gift_date)::date as month,
      sum(g.quantity * m.shrimp_per_unit)    as shrimp_used
    from public.shrimp_gifts g
    join public.menu m on m.id = g.menu_item_id
    where m.shrimp_per_unit > 0
    group by date_trunc('month', g.gift_date)

    union all

    -- tôm siêu thị (giao hộp)
    select
      date_trunc('month', batch_date)::date   as month,
      sum(quantity_in * shrimp_per_box)       as shrimp_used
    from public.supermarket_batches
    where shrimp_per_box > 0
    group by date_trunc('month', batch_date)
  ) src
  group by month
  order by month;

comment on view public.shrimp_used_by_month is
  'Tôm đã dùng mỗi tháng = bán (dùng thành phần hộp khi có) + tặng + giao siêu thị.';

-- shrimp_inventory: dùng thành phần hộp trong used_sales
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
    select coalesce(sum(
      case
        when m.is_box and s.box_1tom is not null
          then s.quantity * (s.box_1tom * 1 + s.box_2tom * 2)
        else s.quantity * m.shrimp_per_unit
      end
    ), 0)::bigint as v
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

-- shrimp_cost_by_month (rebuild)
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
  'Chi phí tôm phân bổ theo tháng. Từ T8/2026; dùng thành phần hộp khi có.';

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
  'P&L tháng. profit = doanh thu − CP tiền mặt − CP túi/tem − CP hộp − CP tôm (thành phần hộp khi có) − chia sẻ trạm (30%).';

-- 3. Cập nhật public_form_bootstrap: trả về is_box trong menu
create or replace function public.public_form_bootstrap(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists(
    select 1 from public.public_form_tokens where token = p_token and active
  ) into v_ok;

  if not v_ok then
    return json_build_object('valid', false);
  end if;

  return json_build_object(
    'valid', true,
    'menu', coalesce((
      select json_agg(
        json_build_object('id', id, 'name', name, 'price', price, 'is_box', is_box)
        order by sort_order, name
      )
      from public.menu where active
    ), '[]'::json),
    'employees', coalesce((
      select json_agg(json_build_object('id', id, 'name', name)
                      order by sort_order, name)
      from public.employees where active
    ), '[]'::json)
  );
end;
$$;

-- 4. Cập nhật public_submit_sale: nhận thêm p_box_1tom / p_box_2tom
drop function if exists public.public_submit_sale(text, date, uuid, numeric, numeric, text, uuid, text);

create or replace function public.public_submit_sale(
  p_token        text,
  p_sale_date    date,
  p_menu_item_id uuid,
  p_quantity     numeric,
  p_unit_price   numeric,
  p_source       text,
  p_staff_id     uuid,
  p_note         text,
  p_box_1tom     integer default null,
  p_box_2tom     integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok     boolean;
  v_name   text;
  v_price  numeric;
  v_staff  text;
  v_amount numeric;
  v_id     uuid;
begin
  select exists(
    select 1 from public.public_form_tokens where token = p_token and active
  ) into v_ok;
  if not v_ok then
    raise exception 'invalid_token';
  end if;

  select name, price into v_name, v_price from public.menu where id = p_menu_item_id;
  if v_name is null then
    raise exception 'invalid_menu_item';
  end if;
  if p_unit_price is null then
    p_unit_price := v_price;
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid_quantity';
  end if;

  if p_staff_id is not null then
    select name into v_staff from public.employees where id = p_staff_id;
    if v_staff is null then
      raise exception 'invalid_staff';
    end if;
  end if;

  v_amount := p_quantity * p_unit_price;

  insert into public.sales (
    sale_date, sold_at, menu_item_id, cake_type,
    quantity, unit_price, amount, source, staff, staff_id, note,
    box_1tom, box_2tom
  )
  values (
    p_sale_date, now(), p_menu_item_id, v_name,
    p_quantity, p_unit_price, v_amount, p_source, v_staff, p_staff_id, p_note,
    p_box_1tom, p_box_2tom
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.public_submit_sale(text, date, uuid, numeric, numeric, text, uuid, text, integer, integer) to anon, authenticated;
