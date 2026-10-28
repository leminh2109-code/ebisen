-- Thêm "túi trắng" (đựng hộp mang về) vào consumable_purchases.
alter table public.consumable_purchases
  drop constraint consumable_purchases_item_check,
  add constraint consumable_purchases_item_check
    check (item in ('dau_an', 'tui_bong_kinh', 'tui_trang'));
