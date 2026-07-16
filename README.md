# ebisen

Web app kiểm soát hoạt động kinh doanh: doanh thu, chi phí, lãi/lỗ. Dữ liệu trên
Supabase (Postgres), deploy trên Vercel. Thiết kế để **Claude Code query thẳng
Postgres** — mọi logic tính toán nằm trong DB, không ở giao diện.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + RLS)

## Trang

| Trang | Đường dẫn | Ai xem |
|-------|-----------|--------|
| Dashboard (tổng quan tháng) | `/dashboard` | tất cả |
| Doanh thu theo tháng | `/revenue/monthly` | tất cả |
| Doanh thu chi tiết (từng hóa đơn) | `/revenue/detail` | tất cả |
| Chi phí theo tháng | `/expenses` | tất cả |
| P&L (lãi/lỗ) | `/pnl` | **chỉ owner** |
| Nhập hóa đơn | `/entry/invoice` | tất cả |
| Nhập chi phí | `/entry/expense` | tất cả |

## Cài đặt lần đầu

### 1. Tạo project Supabase

Tạo project mới tại [supabase.com](https://supabase.com). Lấy từ **Project Settings → API**:
- Project URL
- `anon` public key
- `service_role` key (chỉ dùng cho script migration)

### 2. Cấu hình môi trường

```bash
cp .env.example .env.local
# Điền các giá trị Supabase (và Airtable nếu migrate)
```

### 3. Áp schema lên Supabase

```bash
# Liên kết project (một lần)
supabase link --project-ref <project-ref>

# Đẩy schema (bảng, views, RLS, roles)
npm run db:push
```

Schema nằm ở [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

### 4. Chạy

```bash
npm install
npm run dev      # http://localhost:3000
```

**User đầu tiên đăng ký tự động thành `owner`** (chủ DN, xem được P&L). Những
người sau là `staff` (nhân viên nhập liệu, không thấy P&L). Tạo user trong
Supabase Dashboard → Authentication, hoặc bật đăng ký.

## Migrate dữ liệu từ Airtable

Quy trình 3 bước. **Không hủy Airtable cho tới khi bước 3 báo lệch = 0.**

```bash
# 1. Dò schema base Airtable (xem có bảng gì, trường gì)
npm run airtable:discover

# 2. Chỉnh MAPPING trong scripts/airtable-migrate.ts cho khớp base thật, rồi nạp
npm run airtable:migrate

# 3. Đối chiếu tổng doanh thu & chi phí giữa Airtable và Supabase
npm run airtable:reconcile
```

`airtable:reconcile` trả exit code 0 khi khớp hoàn toàn. Đây là bước kiểm chứng
rủi ro số 1 (dịch sai logic tính toán từ Airtable formula sang SQL).

## Deploy Vercel

```bash
vercel link
# Thêm env vars trên Vercel Dashboard (Settings → Environment Variables):
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

Không cần `SUPABASE_SERVICE_ROLE_KEY` trên Vercel — nó chỉ dùng cho script migration chạy local.

## Hỏi dữ liệu bằng Claude Code

Vì mọi con số tính trong Postgres views (`revenue_by_month`, `pnl_by_month`, …),
bạn có thể hỏi Claude Code bất kỳ câu hỏi kinh doanh nào mà không cần dựng report
mới — ví dụ *"khách hàng nào doanh thu cao nhất quý này?"* — và nhận đúng con số
mà dashboard hiển thị.

## Lệnh thường dùng

```bash
npm run dev         # dev server
npm run build       # production build
npm run typecheck   # kiểm tra type
npm run lint        # eslint
npm run db:push     # đẩy migration lên Supabase
npm run db:reset    # reset DB local (cần Docker)
```
