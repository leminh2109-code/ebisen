-- ebisen — Link nhập THÔNG TIN KHÁCH HÀNG công khai (không cần đăng nhập).
--
-- Giống link nhập bán hàng (0005): token bí mật + hàm security definer, KHÔNG mở
-- RLS insert cho anon, KHÔNG dùng service_role. Bảng token RIÊNG → thu hồi link
-- khách không ảnh hưởng link bán hàng/xem.

-- ============================================================================
-- 1. Bảng token
-- ============================================================================
create table public.public_customer_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table public.public_customer_tokens is 'Token bí mật cho link nhập khách hàng công khai. Chỉ 1 token active.';

alter table public.public_customer_tokens enable row level security;

create policy "customer tokens: owner đọc" on public.public_customer_tokens
  for select using (public.is_owner());

insert into public.public_customer_tokens (token, active)
values (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), true);

-- ============================================================================
-- 2. Bootstrap: trả về menu (loại bánh) nếu token hợp lệ
-- ============================================================================
create or replace function public.public_customer_bootstrap(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  select exists(
    select 1 from public.public_customer_tokens where token = p_token and active
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
    ), '[]'::json)
  );
end;
$$;

-- ============================================================================
-- 3. Submit: gộp khách theo SĐT + ghi lần mua (nếu có chọn bánh), nếu token hợp lệ
-- ============================================================================
create or replace function public.public_submit_customer(
  p_token        text,
  p_phone        text,
  p_name         text,
  p_address      text,
  p_menu_item_id uuid,
  p_quantity     integer,
  p_order_date   date,
  p_note         text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok       boolean;
  v_phone    text;
  v_name     text;
  v_cust_id  uuid;
begin
  select exists(
    select 1 from public.public_customer_tokens where token = p_token and active
  ) into v_ok;
  if not v_ok then
    raise exception 'invalid_token';
  end if;

  -- Chuẩn hóa SĐT: giữ chữ số và dấu + đầu.
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 then
    raise exception 'invalid_phone';
  end if;

  -- Gộp khách theo SĐT (cập nhật tên/địa chỉ nếu có nhập).
  select id into v_cust_id from public.customers where phone = v_phone;
  if v_cust_id is null then
    insert into public.customers (phone, name, address)
    values (v_phone, nullif(trim(p_name), ''), nullif(trim(p_address), ''))
    returning id into v_cust_id;
  else
    update public.customers set
      name    = coalesce(nullif(trim(p_name), ''), name),
      address = coalesce(nullif(trim(p_address), ''), address)
    where id = v_cust_id;
  end if;

  -- Ghi lần mua nếu có chọn loại bánh + số lượng hợp lệ.
  if p_menu_item_id is not null and p_quantity is not null and p_quantity > 0 then
    select name into v_name from public.menu where id = p_menu_item_id;
    insert into public.customer_orders (customer_id, order_date, menu_item_id, cake_type, quantity, note)
    values (v_cust_id, coalesce(p_order_date, current_date), p_menu_item_id, v_name, p_quantity, nullif(trim(p_note), ''));
  end if;

  return v_cust_id;
end;
$$;

-- ============================================================================
-- 4. Regenerate + slug (owner-only, thu hồi link cũ)
-- ============================================================================
create or replace function public.regenerate_public_customer_token()
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

  update public.public_customer_tokens set active = false where active;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.public_customer_tokens (token, active) values (v_token, true);

  return v_token;
end;
$$;

create or replace function public.set_public_customer_slug(p_slug text)
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

  update public.public_customer_tokens set active = false where active;
  delete from public.public_customer_tokens where token = v_slug;
  insert into public.public_customer_tokens (token, active) values (v_slug, true);

  return v_slug;
end;
$$;

-- ============================================================================
-- 5. Grants — anon gọi bootstrap + submit; regenerate + slug chỉ authenticated
-- ============================================================================
grant execute on function public.public_customer_bootstrap(text) to anon, authenticated;
grant execute on function public.public_submit_customer(text, text, text, text, uuid, integer, date, text) to anon, authenticated;
grant execute on function public.regenerate_public_customer_token() to authenticated;
grant execute on function public.set_public_customer_slug(text) to authenticated;
