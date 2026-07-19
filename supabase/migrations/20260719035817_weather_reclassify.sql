-- ebisen — Phân loại thời tiết lại theo GIỜ NẮNG + LƯỢNG MƯA (thay vì weathercode),
-- và thêm NHIỆT ĐỘ CẢM NHẬN (feels-like).
--
-- Lý do: weathercode theo ngày = "thời tiết xấu nhất trong ngày" → 1 cơn mưa rào
-- ngắn làm cả ngày nắng 12h bị gắn "Mưa/Giông". Nhiệt độ không khí (35-37°) cũng
-- thấp hơn nhiệt độ cảm nhận thực tế (42-44°) do độ ẩm cao.
--   - feels_max       : nhiệt độ cảm nhận cao nhất (°C) — sát cảm giác thực tế.
--   - sunshine_hours  : số giờ nắng trong ngày (để phân loại).
--   - weather_cond    : phân loại lại (Nắng nếu nắng ≥9h & mưa <3mm/ít; …).

alter table public.daily_revenue add column if not exists feels_max      numeric(5, 1);
alter table public.daily_revenue add column if not exists sunshine_hours numeric(5, 1);

-- View phân tích: thêm nhiệt độ CẢM NHẬN trung bình.
create or replace view public.revenue_by_weather
with (security_invoker = on) as
  select
    weather_cond,
    count(*)                        as days,
    sum(revenue)                    as revenue,
    round(avg(revenue))             as avg_revenue,
    coalesce(sum(cakes), 0)         as cakes,
    round(avg(cakes))               as avg_cakes,
    round(avg(temp_max), 1)         as avg_temp,
    round(avg(rain_mm), 1)          as avg_rain,
    round(avg(feels_max), 1)        as avg_feels
  from public.daily_revenue
  where weather_cond is not null
  group by weather_cond
  order by round(avg(revenue)) desc;

-- RPC điền thời tiết: ghi thêm feels_max + sunshine_hours.
create or replace function public.cron_fill_weather(p_secret text, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  r        jsonb;
  cnt      int := 0;
begin
  select value into v_secret from public.app_config where key = 'weather_cron_secret';
  if v_secret is null or p_secret is null or p_secret <> v_secret then
    raise exception 'invalid_secret';
  end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    update public.daily_revenue set
      weather        = r->>'weather',
      weather_cond   = r->>'weather_cond',
      temp_max       = nullif(r->>'temp_max', '')::numeric,
      feels_max      = nullif(r->>'feels_max', '')::numeric,
      sunshine_hours = nullif(r->>'sunshine_hours', '')::numeric,
      rain_mm        = nullif(r->>'rain_mm', '')::numeric
    where revenue_date = (r->>'date')::date;
    if found then cnt := cnt + 1; end if;
  end loop;

  return cnt;
end;
$$;

grant execute on function public.cron_fill_weather(text, jsonb) to anon, authenticated;
