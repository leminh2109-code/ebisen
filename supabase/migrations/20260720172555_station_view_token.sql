-- ebisen — Link XEM doanh thu + bán hàng chi tiết dành cho TRẠM (không đăng nhập).
--
-- Trạm (trạm dừng nghỉ) cần xem doanh thu tháng và chi tiết từng lần bán để
-- đối chiếu phần chia sẻ 30%. KHÔNG xem được chi phí, P&L, hay thông tin nội bộ.
--
-- Bảo mật: giống hệt pattern public_view_tokens (0008).
--   - Token bí mật trong URL. Anon KHÔNG có RLS. Mọi truy cập qua hàm security definer.
--   - Owner tạo lại / đổi slug để thu hồi link đã lỡ gửi.

-- ============================================================================
-- 1. Bảng token
-- ============================================================================
create table public.public_station_tokens (
  id         uuid primary key default gen_random_uuid(),
  token      text not null unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.public_station_tokens
  is 'Token bí mật cho link xem doanh thu tháng + bán hàng chi tiết dành cho trạm.';

alter table public.public_station_tokens enable row level security;

create policy "station tokens: owner đọc" on public.public_station_tokens
  for select using (public.is_owner());

-- Seed token đầu tiên
insert into public.public_station_tokens (token, active)
values (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''), true);

-- ============================================================================
-- 2. Đọc dữ liệu nếu token hợp lệ
-- ============================================================================
create or replace function public.station_view(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists(
    select 1 from public.public_station_tokens where token = p_token and active
  ) into v_ok;

  if not v_ok then
    return json_build_object('valid', false);
  end if;

  return json_build_object(
    'valid', true,
    'revenue_by_month', coalesce((
      select json_agg(json_build_object(
        'month',   month,
        'days',    days,
        'cakes',   cakes,
        'revenue', revenue
      ) order by month desc)
      from public.revenue_by_month
    ), '[]'::json),
    'sales', coalesce((
      select json_agg(json_build_object(
        'id',         id,
        'sale_date',  sale_date,
        'sold_at',    sold_at,
        'cake_type',  cake_type,
        'quantity',   quantity,
        'unit_price', unit_price,
        'amount',     amount,
        'source',     source
      ) order by sale_date desc, sold_at desc)
      from public.sales
    ), '[]'::json)
  );
end;
$$;

-- ============================================================================
-- 3. Regenerate token (thu hồi link cũ)
-- ============================================================================
create or replace function public.regenerate_public_station_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.is_owner() then raise exception 'not_owner'; end if;

  update public.public_station_tokens set active = false where active;
  v_token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  insert into public.public_station_tokens (token, active) values (v_token, true);

  return v_token;
end;
$$;

-- ============================================================================
-- 4. Slug tùy chỉnh
-- ============================================================================
create or replace function public.set_public_station_slug(p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if not public.is_owner() then raise exception 'not_owner'; end if;

  v_slug := lower(trim(p_slug));
  if v_slug !~ '^[a-z0-9-]{3,40}$' then raise exception 'invalid_slug'; end if;

  update public.public_station_tokens set active = false where active;
  delete from public.public_station_tokens where token = v_slug;
  insert into public.public_station_tokens (token, active) values (v_slug, true);

  return v_slug;
end;
$$;

-- ============================================================================
-- 5. Grants
-- ============================================================================
grant execute on function public.station_view(text) to anon, authenticated;
grant execute on function public.regenerate_public_station_token() to authenticated;
grant execute on function public.set_public_station_slug(text) to authenticated;
