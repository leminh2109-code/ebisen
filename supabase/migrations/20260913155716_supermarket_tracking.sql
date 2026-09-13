-- Theo dõi xuất hàng cho siêu thị: mỗi lần giao hàng + số đã bán (cập nhật cuối tháng).

create table public.supermarket_batches (
  id            uuid primary key default gen_random_uuid(),
  batch_date    date not null,
  quantity_in   integer not null check (quantity_in > 0),  -- hộp giao cho siêu thị
  quantity_sold integer check (quantity_sold >= 0),         -- hộp đã bán (cập nhật sau)
  note          text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id)
);

create index supermarket_batches_date_idx on public.supermarket_batches (batch_date);

comment on table public.supermarket_batches is
  'Xuất hàng cho siêu thị: số hộp giao, số hộp bán (cập nhật cuối tháng), tồn = giao − bán.';

-- RLS
alter table public.supermarket_batches enable row level security;

create policy "authenticated read supermarket_batches"
  on public.supermarket_batches for select
  to authenticated using (true);

create policy "authenticated insert supermarket_batches"
  on public.supermarket_batches for insert
  to authenticated with check (auth.uid() = created_by);

create policy "owner update supermarket_batches"
  on public.supermarket_batches for update
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

create policy "owner delete supermarket_batches"
  on public.supermarket_batches for delete
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'owner')
  );

-- View tổng tháng
create view public.supermarket_by_month
with (security_invoker = on) as
  select
    date_trunc('month', batch_date)::date           as month,
    count(*)                                         as batch_count,
    sum(quantity_in)                                 as total_in,
    coalesce(sum(quantity_sold), 0)                  as total_sold,
    sum(quantity_in) - coalesce(sum(quantity_sold), 0) as total_remaining
  from public.supermarket_batches
  group by date_trunc('month', batch_date)
  order by month desc;

comment on view public.supermarket_by_month is
  'Tổng hộp giao / bán / tồn mỗi tháng tại siêu thị.';
