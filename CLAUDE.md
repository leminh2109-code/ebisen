# ebisen

Web app kiểm soát hoạt động kinh doanh cho một **tiệm bán bánh tôm** (loại "1 tôm"/
"2 tôm", bán ở trạm). Công cụ **nội bộ** — không phải sản phẩm đi bán. Đã migrate
dữ liệu từ Airtable sang Supabase.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres +
Auth + RLS) · deploy Vercel.

## Nguyên tắc kiến trúc CỐT LÕI

**Mọi logic tính toán (doanh thu, chi phí, P&L) sống trong Postgres views, KHÔNG ở
frontend.** Lý do tồn tại của dự án: chủ DN query thẳng Postgres bằng Claude Code và
phải thấy đúng con số dashboard hiển thị. Nếu tính ở React, agent không thấy được →
sụp đổ lý do migrate.

→ Thêm số liệu/báo cáo mới: tạo view trong `supabase/migrations/`, đọc ở
`src/lib/queries.ts`. Đừng tính trong component.

## Mô hình dữ liệu

- **`sales`** — từng lần bán (loại bánh, SL, đơn giá, nguồn TM/CK, nhân viên).
- **`daily_revenue`** — doanh thu ngày, **NGUỒN CHÍNH THỨC cho P&L**. Cột `source`:
  - `airtable` = lịch sử nạp từ Airtable, **được trigger bảo vệ** (không ghi đè).
  - `auto` = trigger `sync_daily_revenue` tự tính = tổng sales ngày đó (ngày mới).
  - `manual` = owner sửa tay.
- **`expenses`** — chi phí + `category` + `expense_type` (cố định/biến đổi) + `cost_center`.
- **`menu`** (Thực đơn) — giá HIỆN TẠI mỗi món. `sales.menu_item_id` link tới đây.
- **`employees`** (Nhân viên) — danh sách NV. `sales.staff_id` link tới đây; `sales.staff`
  giữ SNAPSHOT tên NV lúc bán (đổi/xóa NV không ảnh hưởng sales cũ).
- **`public_form_tokens`** — token bí mật cho LINK NHẬP CÔNG KHAI (`/nhap/[token]`).
  Chỉ 1 token `active`. Owner tạo lại ở `/share` (thu hồi link cũ).
- **`profiles`** — user + `role` (owner/staff). User ĐẦU TIÊN đăng ký tự thành owner.

Views: `revenue_by_day`, `revenue_by_month`, `sales_by_month`, `expenses_by_month`,
`expenses_by_month_category`, `pnl_by_month`. Doanh thu tính từ `daily_revenue`
(KHÔNG từ tổng sales — sales lịch sử tháng 6 ghi thiếu, chỉ 28tr/77tr thật).

## Quy tắc BẮT BUỘC nhớ

1. **Snapshot pricing:** `sales.unit_price` + `sales.cake_type` là giá/tên CỐ ĐỊNH lúc
   bán. Đổi giá trong `menu` KHÔNG ảnh hưởng sales cũ. **Đừng bao giờ tính lại doanh thu
   sales từ `menu.price` hiện tại.**
2. **daily_revenue nguồn chính thức:** P&L = tổng `daily_revenue` − tổng `expenses`.
   Ngày `source='airtable'` là lịch sử đã chốt, đừng đụng.
3. **Trigger `sync_daily_revenue`:** khi `sales` thay đổi, tự cập nhật doanh thu ngày đó
   = tổng sales — nhưng CHỈ với ngày `source != 'airtable'/'manual'`. Bất kỳ `UPDATE`
   hàng loạt trên `sales` (vd backfill) sẽ kích hoạt trigger cho các ngày `auto`.

## Phân quyền

- P&L (`/pnl`), Thực đơn (`/menu`), Nhân viên (`/employees`), Link nhập liệu (`/share`)
  — **chỉ owner** (gate cứng ở server component + RLS). Staff nhập sales/chi phí, xem
  báo cáo cơ bản.
- RLS bật trên mọi bảng. Ghi qua migration script dùng `service_role` (bypass RLS).
- **Link nhập công khai** (`/nhap/[token]`, không đăng nhập): gated bằng token bí mật.
  Anon KHÔNG có RLS insert — mọi thao tác đi qua hàm `security definer`
  (`public_form_bootstrap`, `public_submit_sale`) tự kiểm token. KHÔNG dùng
  service_role ở server. `/nhap` được whitelist trong `PUBLIC_PATHS` (middleware).

## Migrate Airtable (đã xong, giữ để tham khảo/chạy lại)

Đọc creds từ `.env.local`. Thứ tự:
```
npm run airtable:discover    # xem schema base thật
npm run airtable:migrate     # nạp: daily_revenue TRƯỚC (bảo vệ), rồi sales, rồi expenses
npm run airtable:reconcile   # đối chiếu — fidelity lịch sử phải khớp 100%
```
`reconcile` tách phần lịch sử (`source=airtable`, phải khớp Airtable) khỏi ngày mới
`auto` (dữ liệu mới hợp lệ, báo riêng — không false-alarm). **Chưa hủy Airtable** cho
tới khi đủ 1 tháng khớp liên tục.

## Đổi schema

Không dùng Supabase CLI (tài khoản gh/supabase trên máy khác tài khoản chứa project của
bạn bạn). **Áp migration bằng cách dán SQL vào Supabase SQL Editor.** File ở
`supabase/migrations/000X_*.sql`. DML (seed/backfill) có thể chạy qua service_role script.

## Lệnh

```
npm run dev         # dev (cổng 3000)
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (chú ý rule react-hooks/set-state-in-effect)
```

## Deploy

- Frontend: Vercel (env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- DB: Supabase managed. `SUPABASE_SERVICE_ROLE_KEY` CHỈ dùng local cho script, KHÔNG
  đưa lên Vercel client.
- GitHub repo: `leminh2109-code/ebisen` (của bạn bạn — chủ DN thật).

## Gotchas

- ESLint chặn `setState` trong `useEffect` — dùng ref/DOM cho reset form (xem
  `sale-form.tsx`).
- Có 199 sales đầu tháng 6 trống loại bánh + giá 0 (bản ghi Airtable chưa hoàn chỉnh);
  không ảnh hưởng doanh thu vì doanh thu lấy từ `daily_revenue`.
- Ngày của sales lấy từ createdTime Airtable → bản ghi backfill có thể dồn ngày nhập;
  KHÔNG ảnh hưởng P&L (dùng `daily_revenue` có ngày riêng chính xác).

## Skill routing

Khi request khớp một skill, gọi qua Skill tool. Bug → /investigate. QA → /qa.
Review diff → /review. Ship/deploy → /ship hoặc /land-and-deploy. Ý tưởng → /office-hours.
