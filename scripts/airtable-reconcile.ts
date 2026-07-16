/**
 * Đối chiếu tổng doanh thu & chi phí giữa Airtable và Supabase.
 * Chạy: npm run airtable:reconcile
 *
 * Đây là bước KIỂM CHỨNG rủi ro số 1 (dịch sai logic tính toán). Không được hủy
 * Airtable cho tới khi script này báo lệch = 0.
 *
 * Dùng cùng MAPPING và biến môi trường như airtable-migrate.ts.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const INVOICE_TABLE = 'Hóa đơn';
const INVOICE_AMOUNT_FIELD = 'Số tiền';
const EXPENSE_TABLE = 'Chi phí';
const EXPENSE_AMOUNT_FIELD = 'Số tiền';

const {
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/[.\s,₫đ]/gi, ''));
  return Number.isFinite(n) ? n : 0;
}

async function airtableSum(table: string, field: string): Promise<number> {
  let total = 0;
  let offset: string | undefined;
  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`,
    );
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Airtable ${table}: ${res.status}`);
    const data = (await res.json()) as {
      records: { fields: Record<string, unknown> }[];
      offset?: string;
    };
    for (const r of data.records) total += num(r.fields[field]);
    offset = data.offset;
  } while (offset);
  return total;
}

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

async function main() {
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID || !NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Thiếu biến môi trường (xem .env.example).');
    process.exit(1);
  }

  const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const [atRevenue, atExpense] = await Promise.all([
    airtableSum(INVOICE_TABLE, INVOICE_AMOUNT_FIELD),
    airtableSum(EXPENSE_TABLE, EXPENSE_AMOUNT_FIELD),
  ]);

  const { data: rev } = await supabase.from('revenue_by_month').select('revenue');
  const { data: exp } = await supabase.from('expenses_by_month').select('expenses');
  const sbRevenue = (rev ?? []).reduce((s, r) => s + Number(r.revenue), 0);
  const sbExpense = (exp ?? []).reduce((s, r) => s + Number(r.expenses), 0);

  const rows = [
    ['Doanh thu', atRevenue, sbRevenue],
    ['Chi phí', atExpense, sbExpense],
  ] as const;

  console.log('\n              Airtable            Supabase            Lệch');
  console.log('─'.repeat(64));
  let allMatch = true;
  for (const [label, at, sb] of rows) {
    const diff = sb - at;
    if (diff !== 0) allMatch = false;
    const flag = diff === 0 ? '✓' : '✗ LỆCH';
    console.log(
      `${label.padEnd(10)} ${fmt(at).padStart(16)} ${fmt(sb).padStart(18)} ${fmt(diff).padStart(14)}  ${flag}`,
    );
  }
  console.log('─'.repeat(64));
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
