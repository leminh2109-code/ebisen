-- Thêm quyền update + delete cho anon trên tất cả bảng trip

-- trip_participants: update đã có, thêm delete
create policy "trip_participants anon delete" on public.trip_participants
  for delete using (true);

-- trip_expenses: thêm update + delete
create policy "trip_expenses anon update" on public.trip_expenses
  for update using (true) with check (true);

create policy "trip_expenses anon delete" on public.trip_expenses
  for delete using (true);

-- trip_photos: thêm delete
create policy "trip_photos anon delete" on public.trip_photos
  for delete using (true);
