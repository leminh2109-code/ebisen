/**
 * Migrate dữ liệu Airtable -> Supabase (model bánh tôm).
 * Chạy: npm run airtable:migrate
 *
 * Nạp 3 bảng:
 *   "Ghi nhận bán hàng" -> sales
 *   "Doanh thu tháng"   -> daily_revenue (source='airtable', được bảo vệ khỏi trigger)
 *   "Chi phí tháng"     -> expenses
 *
 * QUAN TRỌNG: nạp daily_revenue với source='airtable' để trigger sync_daily_revenue
 * KHÔNG ghi đè số lịch sử bằng tổng sales (vốn ghi thiếu ở tháng 6).
 *
 * Script idempotent: xóa sạch 3 bảng trước khi nạp lại (chạy nhiều lần an toàn).
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { createClient } from '@supabase/supabase-js';

const {
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Thiếu biến môi trường (xem .env.example).');
  process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type Rec = { id: string; fields: Record<string, unknown> };

async function fetchAll(table: string): Promise<Rec[]> {
  const out: Rec[] = [];
  let offset: string | undefined;
  do {
    const u = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`);
    u.searchParams.set('pageSize', '100');
    if (offset) u.searchParams.set('offset', offset);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    if (!r.ok) throw new Error(`${table} lỗi ${r.status}: ${await r.text()}`);
    const d = (await r.json()) as { records: Rec[]; offset?: string };
    out.push(...d.records);
    offset = d.offset;
  } while (offset);
  return out;
}

const str = (v: unknown): string | null => {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(String).join(', ');
  if (typeof v === 'object') return null; // formula lỗi trả object -> bỏ
  return String(v);
};
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  if (typeof v === 'object') return null;
  const n = Number(String(v).replace(/[.\s,₫đ]/gi, ''));
  return Number.isFinite(n) ? n : null;
};
const dateOnly = (v: unknown): string | null => {
  const s = str(v);
  return s ? s.slice(0, 10) : null;
};

async function main() {
  // Idempotent: xóa sạch trước.
  console.log('Xóa dữ liệu cũ (nếu có)…');
  await supabase.from('sales').delete().not('id', 'is', null);
  await supabase.from('daily_revenue').delete().not('revenue_date', 'is', null);
  await supabase.from('expenses').delete().not('id', 'is', null);

  // Chuẩn bị SALES ← "Ghi nhận bán hàng" (nạp SAU daily_revenue)
  const saleRecs = await fetchAll('Ghi nhận bán hàng');
  const salesRows = saleRecs
    .map((r) => {
      const f = r.fields;
      const sale_date = dateOnly(f['Ngày '] ?? f['Ngày bán']);
      const quantity = num(f['Số lượng']) ?? 0;
      const unit_price = num(f['Đơn giá']) ?? 0;
      const amount = num(f['Thành tiền']) ?? quantity * unit_price;
      if (!sale_date || amount == null) return null;
      return {
        sale_date,
        sold_at: str(f['Ngày bán']) ?? new Date(sale_date).toISOString(),
        cake_type: str(f['Loại bánh ']),
        quantity,
        unit_price,
        amount,
        source: str(f['Nguồn']),
        customer_type: str(f['Loại khách hàng']),
        staff: str(f['Nhân viên']),
        note: str(f['Ghi chú']),
      };
    })
    .filter(Boolean);

  // ── DAILY_REVENUE ← "Doanh thu tháng" (source='airtable') — NẠP TRƯỚC ──
  // Nạp trước để các ngày lịch sử được bảo vệ; khi nạp sales sau, trigger sẽ
  // bỏ qua đúng những ngày này (không ghi đè số nhập tay bằng tổng sales).
  console.log('Nạp "Doanh thu tháng" -> daily_revenue…');
  const dailyRecs = await fetchAll('Doanh thu tháng');
  // Gộp theo ngày (phòng khi có nhiều dòng cùng ngày).
  const byDate = new Map<string, { revenue: number; cakes: number; shrimp: number; traffic: number; weather: string | null; note: string | null }>();
  for (const r of dailyRecs) {
    const f = r.fields;
    const d = dateOnly(f['Ngày thu']);
    const rev = num(f['Doanh thu ngày']);
    if (!d || rev == null) continue;
    const cur = byDate.get(d) ?? { revenue: 0, cakes: 0, shrimp: 0, traffic: 0, weather: null, note: null };
    cur.revenue += rev;
    cur.cakes += num(f['Số bánh']) ?? 0;
    cur.shrimp += num(f['Số tôm sử dụng']) ?? 0;
    cur.traffic += num(f['Lưu lượng trạm']) ?? 0;
    cur.weather = str(f['Thời tiết']) ?? cur.weather;
    cur.note = str(f['Ghi chú (Notes)']) ?? cur.note;
    byDate.set(d, cur);
  }
  const dailyRows = [...byDate.entries()].map(([revenue_date, v]) => ({
    revenue_date,
    revenue: v.revenue,
    cakes: v.cakes || null,
    shrimp_used: v.shrimp || null,
    station_traffic: v.traffic || null,
    weather: v.weather,
    note: v.note,
    source: 'airtable',
  }));
  await insertChunks('daily_revenue', dailyRows);
  console.log(`  daily_revenue: ${dailyRows.length} ngày (source=airtable, được bảo vệ)`);

  // ── SALES (nạp sau; trigger bỏ qua các ngày airtable đã có) ──
  console.log('Nạp "Ghi nhận bán hàng" -> sales…');
  await insertChunks('sales', salesRows as object[]);
  console.log(`  sales: ${salesRows.length} dòng`);

  // Dọn các dòng daily_revenue 'auto' mà trigger tạo cho những ngày CÓ sales
  // nhưng KHÔNG có trong bảng doanh thu ngày Airtable. Giữ daily_revenue lịch sử
  // = đúng Airtable để reconcile khớp. (Sales của những ngày đó vẫn còn.)
  const { data: autoRows } = await supabase
    .from('daily_revenue')
    .delete()
    .eq('source', 'auto')
    .select('revenue_date');
  if (autoRows && autoRows.length > 0) {
    console.log(`  (dọn ${autoRows.length} ngày 'auto' ngoài Airtable: ${autoRows.map((r) => r.revenue_date).join(', ')})`);
  }

  // ── EXPENSES ← "Chi phí tháng" ──
  console.log('Nạp "Chi phí tháng" -> expenses…');
  const expRecs = await fetchAll('Chi phí tháng');
  const expRows = expRecs
    .map((r) => {
      const f = r.fields;
      const expense_date = dateOnly(f['Ngày chi (Expense Date)']);
      const amount = num(f['Số tiền (Amount)']);
      if (!expense_date || amount == null) return null;
      return {
        expense_date,
        amount,
        category: str(f['Danh mục chi phí (Expense Category)']),
        expense_type: str(f['Loại chi phí']),
        cost_center: str(f['Trung tâm chi phí ']),
        description: str(f['Mô tả (Description)']),
      };
    })
    .filter(Boolean);
  await insertChunks('expenses', expRows as object[]);
  console.log(`  expenses: ${expRows.length} dòng`);

  console.log('\nXong. Chạy `npm run airtable:reconcile` để đối chiếu số.');
}

async function insertChunks(table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`insert ${table}: ${error.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
