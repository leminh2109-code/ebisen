/**
 * Đối chiếu tổng doanh thu & chi phí giữa Airtable và Supabase.
 * Chạy: npm run airtable:reconcile
 *
 * Doanh thu Supabase lấy từ daily_revenue (nguồn chính thức), so với tổng
 * "Doanh thu ngày" của Airtable. Không được hủy Airtable tới khi lệch = 0.
 */
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
import { createClient } from '@supabase/supabase-js';

const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Thiếu biến môi trường (xem .env.example).');
  process.exit(1);
}

const num = (v: unknown): number => {
  if (v == null || v === '' || typeof v === 'object') return 0;
  const n = Number(String(v).replace(/[.\s,₫đ]/gi, ''));
  return Number.isFinite(n) ? n : 0;
};

async function airtableSum(table: string, field: string): Promise<number> {
  let total = 0;
  let offset: string | undefined;
  do {
    const u = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`);
    u.searchParams.set('pageSize', '100');
    if (offset) u.searchParams.set('offset', offset);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    if (!r.ok) throw new Error(`${table}: ${r.status}`);
    const d = (await r.json()) as { records: { fields: Record<string, unknown> }[]; offset?: string };
    for (const rec of d.records) total += num(rec.fields[field]);
    offset = d.offset;
  } while (offset);
  return total;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

async function main() {
  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const [atRevenue, atExpense] = await Promise.all([
    airtableSum('Doanh thu tháng', 'Doanh thu ngày'),
    airtableSum('Chi phí tháng', 'Số tiền (Amount)'),
  ]);

  const { data: rev } = await supabase.from('revenue_by_month').select('revenue');
  const { data: exp } = await supabase.from('expenses_by_month').select('expenses');
  const sbRevenue = (rev ?? []).reduce((s, r) => s + Number(r.revenue), 0);
  const sbExpense = (exp ?? []).reduce((s, r) => s + Number(r.expenses), 0);

  const rows = [
    ['Doanh thu', atRevenue, sbRevenue],
    ['Chi phí', atExpense, sbExpense],
  ] as const;

  console.log('\n              Airtable            Supabase              Lệch');
  console.log('─'.repeat(66));
  let allMatch = true;
  for (const [label, at, sb] of rows) {
    const diff = sb - at;
    if (Math.abs(diff) >= 1) allMatch = false;
    const flag = Math.abs(diff) < 1 ? '✓' : '✗ LỆCH';
    console.log(`${label.padEnd(10)} ${fmt(at).padStart(16)} ${fmt(sb).padStart(18)} ${fmt(diff).padStart(12)}  ${flag}`);
  }
  console.log('─'.repeat(66));
  console.log(
    allMatch
      ? '\n✓ Khớp hoàn toàn. An toàn để hủy Airtable khi đủ 1 tháng khớp liên tục.\n'
      : '\n✗ CÓ LỆCH. KHÔNG hủy Airtable. Kiểm tra mapping và logic tính toán.\n',
  );
  process.exit(allMatch ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
