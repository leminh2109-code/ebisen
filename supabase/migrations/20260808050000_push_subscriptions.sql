create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

create policy "owner_manage" on push_subscriptions
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
