-- ebisen — Link nhập bán hàng CÔNG KHAI (không cần đăng nhập).
--
-- Mục tiêu: owner gửi 1 link bí mật cho nhân viên nhập bán hàng trên điện thoại.
-- Bảo mật:
--   - Truy cập gated bằng TOKEN bí mật (chuỗi ngẫu nhiên trong URL), lưu ở DB.
--   - KHÔNG mở RLS insert cho anon (nếu mở, ai có anon key cũng ghi được).
--   - Mọi thao tác công khai đi qua HÀM security definer, tự kiểm token → RLS vẫn
--     nguyên vẹn, KHÔNG cần service_role trên server.
--   - Owner có thể tạo lại token (vô hiệu token cũ) → thu hồi link đã lỡ gửi.
--
-- (Chạy trong SQL Editor sau 0004_employees.sql.)

-- ============================================================================
-- 1. Bảng token cho link công khai
-- ============================================================================
create table public.public_form_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.public_form_tokens is 'Token bí mật cho link nhập bán hàng công khai. Chỉ 1 token active tại một thời điểm.';

alter table public.public_form_tokens enable row level security;

-- Chỉ owner được ĐỌC token (để hiển thị link). Ghi chỉ qua hàm security definer.
create policy "tokens: owner đọc" on public.public_form_tokens
  for select using (public.is_owner());

-- Seed token đầu tiên.
insert into public.public_form_tokens (token, active)
values (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), true);

-- ============================================================================
-- 2. Bootstrap: trả về menu + nhân viên đang hoạt động cho form (nếu token hợp lệ)
-- ============================================================================
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
      select json_agg(json_build_object('id', id, 'name', name, 'price', price)
                      order by sort_order, name)
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

-- ============================================================================
-- 3. Submit: ghi 1 lần bán (snapshot tên món + giá + tên NV), nếu token hợp lệ
-- ============================================================================
create or replace function public.public_submit_sale(
  p_token        text,
  p_sale_date    date,
  p_menu_item_id uuid,
  p_quantity     numeric,
  p_unit_price   numeric,
  p_source       text,
  p_staff_id     uuid,
  p_note         text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok    boolean;
  v_name  text;
  v_price numeric;
  v_staff text;
  v_amount numeric;
  v_id    uuid;
begin
  select exists(
    select 1 from public.public_form_tokens where token = p_token and active
  ) into v_ok;
  if not v_ok then
    raise exception 'invalid_token';
  end if;

  -- Snapshot tên món + giá từ thực đơn.
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

  -- Snapshot tên nhân viên (nếu có chọn).
  if p_staff_id is not null then
    select name into v_staff from public.employees where id = p_staff_id;
    if v_staff is null then
      raise exception 'invalid_staff';
    end if;
  end if;

  v_amount := p_quantity * p_unit_price;

  insert into public.sales (
    sale_date, sold_at, menu_item_id, cake_type,
    quantity, unit_price, amount, source, staff, staff_id, note
  )
  values (
    p_sale_date, now(), p_menu_item_id, v_name,
    p_quantity, p_unit_price, v_amount, p_source, v_staff, p_staff_id, p_note
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- ============================================================================
-- 4. Regenerate: owner tạo token mới, vô hiệu token cũ (thu hồi link)
-- ============================================================================
create or replace function public.regenerate_public_form_token()
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

  update public.public_form_tokens set active = false where active;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.public_form_tokens (token, active) values (v_token, true);

  return v_token;
end;
$$;

-- ============================================================================
-- 5. Grants — anon gọi được bootstrap + submit; regenerate chỉ cho authenticated
-- ============================================================================
grant execute on function public.public_form_bootstrap(text) to anon, authenticated;
grant execute on function public.public_submit_sale(text, date, uuid, numeric, numeric, text, uuid, text) to anon, authenticated;
grant execute on function public.regenerate_public_form_token() to authenticated;
