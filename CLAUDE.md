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

## Đổi schema (dùng Supabase CLI)

Dùng **Supabase CLI** (đã là devDependency, gọi qua `npx supabase` / các script `db:*`).
Không dán tay vào SQL Editor nữa.

**Thiết lập một lần** (mỗi máy mới):
```
npx supabase login                          # mở trình duyệt lấy access token
npx supabase link --project-ref <ref>       # <ref> = phần đầu NEXT_PUBLIC_SUPABASE_URL
npx supabase migration list                 # xem migration nào remote đã có
```
⚠️ **Cạm bẫy lịch sử:** migration `0001`–`0008` được áp bằng cách DÁN TAY vào SQL Editor,
nên bảng lịch sử của CLI KHÔNG biết chúng đã chạy. Nếu `migration list` báo remote còn
trống các version đó, **đánh dấu đã-áp (KHÔNG chạy lại)** trước khi push:
```
npx supabase migration repair --status applied 0001 0002 0003 0004 0005 0006 0007 0008
```
Sau bước này `migration list` phải hiện đủ cả LOCAL và REMOTE cho 0001–0008.

**Vòng đời thường ngày:**
```
npx supabase migration new <ten_mo_ta>   # tạo file <timestamp>_<ten>.sql trong supabase/migrations
# ... viết SQL (view/bảng/RLS) vào file mới ...
npm run db:push                          # = supabase db push, áp migration MỚI lên remote
```
Migration mới có tên timestamp 14 chữ số (tự sinh) → sắp sau 0001–0008, đúng thứ tự.
Thêm số liệu/báo cáo: tạo view trong migration mới, đọc ở `src/lib/queries.ts` (đừng tính ở React).
DML (seed/backfill) vẫn có thể chạy qua service_role script như trước.

## Lệnh

```
npm run dev -- -p 3100   # dev (CỔNG 3100 — TUYỆT ĐỐI KHÔNG dùng 3000)
npm run build            # production build
npm run typecheck        # tsc --noEmit
npm run lint             # eslint (chú ý rule react-hooks/set-state-in-effect)
npm run db:push          # supabase db push — áp migration mới lên remote
npm run db:reset         # reset DB LOCAL (cần Docker) — KHÔNG đụng remote
```

**Cổng dev = 3100, KHÔNG BAO GIỜ dùng 3000.** Cổng 3000 dành cho việc khác trên máy
chủ DN. `.claude/launch.json` đã chốt `-p 3100` (`autoPort: false`) — khi khởi động
server qua công cụ preview cũng phải ra 3100.

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
