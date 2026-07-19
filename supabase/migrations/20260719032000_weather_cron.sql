-- ebisen — Tự động điền thời tiết (Vercel Cron gọi API route → RPC này).
--
-- Bảo mật: KHÔNG dùng service_role trên Vercel. Route gọi RPC bằng anon key, RPC
-- security-definer tự kiểm SECRET (lưu trong app_config) rồi cập nhật daily_revenue.

-- 1. Bảng config (owner đọc; secret ghi qua service_role script)
create table if not exists public.app_config (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);
alter table public.app_config enable row level security;
create policy "app_config: owner đọc" on public.app_config
  for select using (public.is_owner());

-- Seed secret ngẫu nhiên cho cron (đọc lại bằng service_role để đặt vào Vercel env).
insert into public.app_config (key, value)
values ('weather_cron_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- 2. RPC điền thời tiết cho nhiều ngày (guarded bằng secret)
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
      weather      = r->>'weather',
      weather_cond = r->>'weather_cond',
      temp_max     = nullif(r->>'temp_max', '')::numeric,
      rain_mm      = nullif(r->>'rain_mm', '')::numeric
    where revenue_date = (r->>'date')::date;
    if found then cnt := cnt + 1; end if;
  end loop;

  return cnt;
end;
$$;

grant execute on function public.cron_fill_weather(text, jsonb) to anon, authenticated;
