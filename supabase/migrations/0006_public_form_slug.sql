-- ebisen — cho phép owner ĐẶT SLUG tùy chỉnh cho link nhập công khai.
--
-- Trước đây token là chuỗi 64 hex → link rất dài. Owner muốn đường dẫn ngắn/dễ nhớ
-- (vd /nhap/ebisen). token trong public_form_tokens giờ có thể là slug do owner đặt.
--
-- LƯU Ý BẢO MẬT: slug dễ đoán hơn token ngẫu nhiên — ai biết cũng có thể mò link.
-- Owner tự chấp nhận đánh đổi này. Vẫn thu hồi được bằng cách đổi slug / tạo ngẫu nhiên.
--
-- (Chạy trong SQL Editor sau 0005_public_form.sql.)

create or replace function public.set_public_form_slug(p_slug text)
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

  -- Chỉ chữ thường, số, gạch ngang; 3–40 ký tự (để URL sạch).
  if v_slug !~ '^[a-z0-9-]{3,40}$' then
    raise exception 'invalid_slug';
  end if;

  -- Vô hiệu link đang active, dọn mọi dòng trùng slug (kể cả lịch sử), rồi tạo mới.
  update public.public_form_tokens set active = false where active;
  delete from public.public_form_tokens where token = v_slug;
  insert into public.public_form_tokens (token, active) values (v_slug, true);

  return v_slug;
end;
$$;

grant execute on function public.set_public_form_slug(text) to authenticated;
