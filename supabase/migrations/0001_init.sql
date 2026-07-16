-- ebisen — schema khởi tạo
-- Nguyên tắc thiết kế: MỌI logic tính toán (doanh thu, chi phí, P&L) sống trong
-- Postgres views, KHÔNG ở tầng frontend. Lý do: Claude Code query thẳng Postgres
-- phải thấy đúng con số mà dashboard hiển thị. Nếu logic nằm trong React, agent
-- không thấy được và toàn bộ lý do migrate sang Supabase sụp đổ.
--
-- Schema này là MẶC ĐỊNH hợp lý cho theo dõi hóa đơn + chi phí. Nó sẽ được điều
-- chỉnh cho khớp base Airtable thật sau khi chạy script dò schema (scripts/airtable-discover.ts).

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- ROLES & PROFILES
-- Mỗi user đăng nhập có 1 profile với role: 'owner' (chủ DN) hoặc 'staff' (nhân viên).
-- ============================================================================
create type public.user_role as enum ('owner', 'staff');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'staff',
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Hồ sơ người dùng, gắn với auth.users. role quyết định quyền xem P&L.';

-- Hàm tiện ích: user hiện tại có phải owner không. SECURITY DEFINER để đọc được
-- profiles bất kể RLS, tránh đệ quy chính sách.
create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- Tự tạo profile khi có user mới trong auth.users.
-- User ĐẦU TIÊN đăng ký trở thành owner; những người sau là staff.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.profiles;
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when is_first then 'owner'::public.user_role else 'staff'::public.user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- DANH MỤC (categories, customers)
-- ============================================================================
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  note        text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id)
);

create table public.expense_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- HÓA ĐƠN (doanh thu)
-- ============================================================================
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null,
  customer_id     uuid references public.customers (id) on delete set null,
  issue_date      date not null,
  amount          numeric(14, 2) not null check (amount >= 0),
  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id)
);

create unique index invoices_invoice_number_key on public.invoices (invoice_number);
create index invoices_issue_date_idx on public.invoices (issue_date);
create index invoices_customer_idx on public.invoices (customer_id);

comment on table public.invoices is 'Hóa đơn bán ra. amount là tổng tiền một hóa đơn (đơn tiền tệ: VND).';

-- ============================================================================
-- CHI PHÍ
-- ============================================================================
create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  expense_date    date not null,
  category_id     uuid references public.expense_categories (id) on delete set null,
  vendor          text,
  amount          numeric(14, 2) not null check (amount >= 0),
  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id)
);

create index expenses_expense_date_idx on public.expenses (expense_date);
create index expenses_category_idx on public.expenses (category_id);

comment on table public.expenses is 'Chi phí (VND). category_id phân loại chi phí.';

-- ============================================================================
-- TRIGGER: tự cập nhật updated_at
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_invoices before update on public.invoices
  for each row execute function public.touch_updated_at();
create trigger touch_expenses before update on public.expenses
  for each row execute function public.touch_updated_at();
create trigger touch_customers before update on public.customers
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- VIEWS BÁO CÁO — toàn bộ logic tính toán nằm ở đây.
-- security_invoker = on: view chạy với quyền của người gọi, nên RLS của bảng gốc
-- vẫn áp dụng (không bypass bảo mật).
-- ============================================================================

-- Doanh thu theo ngày
create view public.revenue_by_day
with (security_invoker = on) as
  select
    issue_date              as day,
    count(*)                as invoice_count,
    sum(amount)             as revenue
  from public.invoices
  group by issue_date
  order by issue_date;

-- Doanh thu theo tháng
create view public.revenue_by_month
with (security_invoker = on) as
  select
    date_trunc('month', issue_date)::date as month,
    count(*)                              as invoice_count,
    sum(amount)                           as revenue
  from public.invoices
  group by date_trunc('month', issue_date)
  order by month;

-- Chi phí theo tháng
create view public.expenses_by_month
with (security_invoker = on) as
  select
    date_trunc('month', expense_date)::date as month,
    count(*)                                as expense_count,
    sum(amount)                             as expenses
  from public.expenses
  group by date_trunc('month', expense_date)
  order by month;

-- Chi phí theo tháng + danh mục
create view public.expenses_by_month_category
with (security_invoker = on) as
  select
    date_trunc('month', e.expense_date)::date as month,
    c.id                                       as category_id,
    coalesce(c.name, '(chưa phân loại)')       as category_name,
    sum(e.amount)                              as expenses
  from public.expenses e
  left join public.expense_categories c on c.id = e.category_id
  group by date_trunc('month', e.expense_date), c.id, c.name
  order by month;

-- P&L theo tháng: doanh thu - chi phí. Đây là con số lãi/lỗ.
create view public.pnl_by_month
with (security_invoker = on) as
  with months as (
    select month from public.revenue_by_month
    union
    select month from public.expenses_by_month
  )
  select
    m.month,
    coalesce(r.revenue, 0)                        as revenue,
    coalesce(x.expenses, 0)                        as expenses,
    coalesce(r.revenue, 0) - coalesce(x.expenses, 0) as profit
  from months m
  left join public.revenue_by_month  r on r.month = m.month
  left join public.expenses_by_month x on x.month = m.month
  order by m.month;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Mô hình quyền (mặc định, sẽ chốt lại ở permission pass):
--   - profiles: đọc profile của mình; owner đọc tất cả.
--   - customers / invoices / expenses / categories: mọi user đã đăng nhập
--     (owner + staff) đều đọc và ghi được. Đây là DN của một chủ, staff nhập liệu.
--   - Quyền xem P&L được chặn ở TẦNG PAGE (server component), không ở tầng bảng,
--     vì staff vốn thấy được doanh thu và chi phí (họ nhập chúng) nên P&L là suy ra
--     được. Nếu cần chặn ở tầng dữ liệu, hoàn thiện trong permission pass.
-- ============================================================================
alter table public.profiles           enable row level security;
alter table public.customers          enable row level security;
alter table public.expense_categories enable row level security;
alter table public.invoices           enable row level security;
alter table public.expenses           enable row level security;

-- profiles
create policy "profiles: đọc profile của mình"
  on public.profiles for select
  using (id = auth.uid() or public.is_owner());

create policy "profiles: owner cập nhật role"
  on public.profiles for update
  using (public.is_owner())
  with check (public.is_owner());

-- customers: authenticated đọc/ghi
create policy "customers: authenticated đọc" on public.customers
  for select using (auth.uid() is not null);
create policy "customers: authenticated ghi" on public.customers
  for insert with check (auth.uid() is not null);
create policy "customers: authenticated sửa" on public.customers
  for update using (auth.uid() is not null);

-- expense_categories: authenticated đọc; owner quản lý danh mục
create policy "categories: authenticated đọc" on public.expense_categories
  for select using (auth.uid() is not null);
create policy "categories: owner ghi" on public.expense_categories
  for insert with check (public.is_owner());
create policy "categories: owner sửa" on public.expense_categories
  for update using (public.is_owner());
create policy "categories: owner xóa" on public.expense_categories
  for delete using (public.is_owner());

-- invoices: authenticated đọc/ghi/sửa; chỉ owner xóa
create policy "invoices: authenticated đọc" on public.invoices
  for select using (auth.uid() is not null);
create policy "invoices: authenticated ghi" on public.invoices
  for insert with check (auth.uid() is not null);
create policy "invoices: authenticated sửa" on public.invoices
  for update using (auth.uid() is not null);
create policy "invoices: owner xóa" on public.invoices
  for delete using (public.is_owner());

-- expenses: authenticated đọc/ghi/sửa; chỉ owner xóa
create policy "expenses: authenticated đọc" on public.expenses
  for select using (auth.uid() is not null);
create policy "expenses: authenticated ghi" on public.expenses
  for insert with check (auth.uid() is not null);
create policy "expenses: authenticated sửa" on public.expenses
  for update using (auth.uid() is not null);
create policy "expenses: owner xóa" on public.expenses
  for delete using (public.is_owner());

-- ============================================================================
-- SEED: danh mục chi phí mặc định (chỉnh theo thực tế khi migrate)
-- ============================================================================
insert into public.expense_categories (name) values
  ('Nhập hàng'),
  ('Lương'),
  ('Mặt bằng'),
  ('Marketing'),
  ('Vận chuyển'),
  ('Khác')
on conflict (name) do nothing;
