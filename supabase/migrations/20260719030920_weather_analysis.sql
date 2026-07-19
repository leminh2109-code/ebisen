-- ebisen — Thời tiết theo ngày (Trạm V52, cao tốc HN-HP) + phân tích doanh thu.
--
-- Dữ liệu thời tiết lấy từ Open-Meteo (miễn phí) cho khu vực Km52 Gia Lộc, Hải Dương.
-- Lưu vào daily_revenue để xem thời tiết ảnh hưởng doanh số/doanh thu.
--   - weather      (đã có): chuỗi hiển thị, vd "☀️ Nắng · 33°".
--   - weather_cond : nhóm điều kiện để phân tích (Nắng/Mưa/Giông…).
--   - temp_max     : nhiệt độ cao nhất (°C).
--   - rain_mm      : lượng mưa (mm).

alter table public.daily_revenue add column if not exists weather_cond text;
alter table public.daily_revenue add column if not exists temp_max numeric(5, 1);
alter table public.daily_revenue add column if not exists rain_mm  numeric(6, 1);

comment on column public.daily_revenue.weather_cond is 'Nhóm điều kiện thời tiết (Nắng/Ít mây/Nhiều mây/Sương mù/Mưa/Giông) để phân tích.';

-- Doanh thu theo điều kiện thời tiết (TB mỗi ngày) — xem thời tiết ảnh hưởng doanh số.
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
    round(avg(rain_mm), 1)          as avg_rain
  from public.daily_revenue
  where weather_cond is not null
  group by weather_cond
  order by round(avg(revenue)) desc;

comment on view public.revenue_by_weather is 'Doanh thu/bánh trung bình mỗi ngày theo điều kiện thời tiết.';
