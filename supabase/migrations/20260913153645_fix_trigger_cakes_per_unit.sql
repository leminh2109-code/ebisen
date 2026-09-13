-- Fix trigger: dùng cakes_per_unit thay shrimp_per_unit khi đếm số bánh.
-- "Hộp 3 bánh 2 tôm": shrimp_per_unit=6 nhưng cakes_per_unit=3 → trước đây đếm 6 thay vì 3.

create or replace function public.sync_daily_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := coalesce(new.sale_date, old.sale_date);
  existing_source text;
  agg_revenue numeric;
  agg_cakes   numeric;
begin
  select source into existing_source from public.daily_revenue where revenue_date = d;

  if existing_source in ('airtable', 'manual') then
    return null;
  end if;

  select
    coalesce(sum(s.amount), 0),
    coalesce(sum(
      case when m.is_box
           then s.quantity * coalesce(m.cakes_per_unit, m.shrimp_per_unit, 1)
           else s.quantity
      end
    ), 0)
  into agg_revenue, agg_cakes
  from public.sales s
  left join public.menu m on m.id = s.menu_item_id
  where s.sale_date = d;

  if agg_revenue = 0 then
    delete from public.daily_revenue where revenue_date = d and source = 'auto';
  else
    insert into public.daily_revenue (revenue_date, revenue, cakes, source, updated_at)
    values (d, agg_revenue, agg_cakes::int, 'auto', now())
    on conflict (revenue_date) do update
      set revenue    = excluded.revenue,
          cakes      = excluded.cakes,
          source     = 'auto',
          updated_at = now();
  end if;
  return null;
end;
$$;

-- Backfill: tính lại cakes cho tất cả ngày source='auto'.
update public.daily_revenue dr
set cakes = (
  select coalesce(sum(
    case when m.is_box
         then s.quantity * coalesce(m.cakes_per_unit, m.shrimp_per_unit, 1)
         else s.quantity
    end
  ), 0)
  from public.sales s
  left join public.menu m on m.id = s.menu_item_id
  where s.sale_date = dr.revenue_date
),
updated_at = now()
where dr.source = 'auto';
