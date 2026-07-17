-- ebisen — Link XEM bán hàng chi tiết CÔNG KHAI (không cần đăng nhập).
--
-- Mục tiêu: owner gửi 1 link bí mật cho nhân viên XEM bảng "Bán hàng chi tiết"
-- để đối chiếu, không cần đăng nhập, KHÔNG sửa được gì (chỉ đọc).
--
-- Bảo mật (giống link nhập 0005):
--   - Gated bằng TOKEN bí mật trong URL, lưu ở DB. Bảng RIÊNG với link nhập →
--     thu hồi link xem không ảnh hưởng link nhập và ngược lại.
--   - KHÔNG mở RLS select cho anon. Mọi truy cập công khai đi qua HÀM security
--     definer tự kiểm token → RLS nguyên vẹn, KHÔNG cần service_role.
--   - Hàm chỉ trả các cột bảng chi tiết cần (giờ, loại bánh, SL, đơn giá, nguồn,
--     thành tiền) — KHÔNG lộ nhân viên, ghi chú, hay bảng khác.
--   - Owner tạo lại token / đổi slug để thu hồi link đã lỡ gửi.
--
-- (Chạy trong SQL Editor sau 0007_expense_groups.sql.)

-- ============================================================================
-- 1. Bảng token cho link xem công khai
-- ============================================================================
create table public.public_view_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.public_view_tokens is 'Token bí mật cho link XEM bán hàng chi tiết công khai. Chỉ 1 token active.';

alter table public.public_view_tokens enable row level security;

-- Chỉ owner được ĐỌC token (để hiển thị link). Ghi chỉ qua hàm security definer.
create policy "view tokens: owner đọc" on public.public_view_tokens
  for select using (public.is_owner());

-- Seed token đầu tiên.
insert into public.public_view_tokens (token, active)
values (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), true);

-- ============================================================================
-- 2. Đọc bán hàng chi tiết (chỉ đọc) nếu token hợp lệ
-- ============================================================================
create or replace function public.public_sales_view(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists(
    select 1 from public.public_view_tokens where token = p_token and active
  ) into v_ok;

  if not v_ok then
    return json_build_object('valid', false);
  end if;

  return json_build_object(
    'valid', true,
    'sales', coalesce((
      select json_agg(json_build_object(
        'id', id,
        'sale_date', sale_date,
        'sold_at', sold_at,
        'cake_type', cake_type,
        'quantity', quantity,
        'unit_price', unit_price,
        'amount', amount,
        'source', source
      ) order by sale_date desc, sold_at desc)
      from public.sales
    ), '[]'::json)
  );
end;
$$;

-- ============================================================================
-- 3. Regenerate: owner tạo token mới, vô hiệu token cũ (thu hồi link)
-- ============================================================================
create or replace function public.regenerate_public_view_token()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if not public.is_owner() then
    raise exception 'not_owner';
  end if;

  update public.public_view_tokens set active = false where active;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.public_view_tokens (token, active) values (v_token, true);

  return v_token;
end;
$$;

-- ============================================================================
-- 4. Slug tùy chỉnh (đường dẫn ngắn dễ nhớ). Owner-only.
-- ============================================================================
create or replace function public.set_public_view_slug(p_slug text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if not public.is_owner() then
    raise exception 'not_owner';
  end if;

  v_slug := lower(trim(p_slug));
  if v_slug !~ '^[a-z0-9-]{3,40}$' then
    raise exception 'invalid_slug';
  end if;

  update public.public_view_tokens set active = false where active;
  delete from public.public_view_tokens where token = v_slug;
  insert into public.public_view_tokens (token, active) values (v_slug, true);

  return v_slug;
end;
$$;

-- ============================================================================
-- 5. Grants — anon đọc được view; regenerate + slug chỉ cho authenticated
-- ============================================================================
grant execute on function public.public_sales_view(text) to anon, authenticated;
grant execute on function public.regenerate_public_view_token() to authenticated;
grant execute on function public.set_public_view_slug(text) to authenticated;
