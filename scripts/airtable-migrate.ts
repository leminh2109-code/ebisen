/**
 * Migrate dữ liệu Airtable -> Supabase.
 * Chạy: npm run airtable:migrate
 *
 * Cần trong .env.local:
 *   AIRTABLE_TOKEN=pat...
 *   AIRTABLE_BASE_ID=app...
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=...   (service_role — BỎ QUA RLS để nạp dữ liệu)
 *
 * ⚠️  MAPPING bên dưới là GIẢ ĐỊNH. Chạy `npm run airtable:discover` trước,
 *     rồi chỉnh tên bảng + tên trường cho khớp base thật của bạn.
 *
 * Script idempotent theo mức hợp lý: dùng invoice_number làm khóa chống trùng
 * cho hóa đơn. Chạy lại sẽ bỏ qua hóa đơn đã có.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING — CHỈNH CHO KHỚP BASE AIRTABLE THẬT (sau khi chạy airtable:discover)
// ─────────────────────────────────────────────────────────────────────────────
const MAP = {
  invoices: {
    table: 'Hóa đơn', // tên bảng Airtable
    fields: {
      invoice_number: 'Số hóa đơn',
      issue_date: 'Ngày',
      amount: 'Số tiền',
      customer_name: 'Khách hàng',
      note: 'Ghi chú',
    },
  },
  expenses: {
    table: 'Chi phí',
    fields: {
      expense_date: 'Ngày',
      amount: 'Số tiền',
      category_name: 'Danh mục',
      vendor: 'Nhà cung cấp',
      note: 'Ghi chú',
    },
  },
} as const;
// ─────────────────────────────────────────────────────────────────────────────

const {
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} = process.env;

function requireEnv() {
  const missing = [
    ['AIRTABLE_TOKEN', AIRTABLE_TOKEN],
    ['AIRTABLE_BASE_ID', AIRTABLE_BASE_ID],
    ['NEXT_PUBLIC_SUPABASE_URL', NEXT_PUBLIC_SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
  ].filter(([, v]) => !v);
  if (missing.length) {
    console.error('Thiếu biến môi trường:', missing.map(([k]) => k).join(', '));
    process.exit(1);
  }
}

type AirtableRecord = { id: string; fields: Record<string, unknown> };

async function fetchAll(table: string): Promise<AirtableRecord[]> {
  const out: AirtableRecord[] = [];
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
    if (!res.ok) {
      throw new Error(`Airtable ${table} lỗi ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    out.push(...data.records);
    offset = data.offset;
  } while (offset);
  return out;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.map(String).join(', ');
  return String(v);
}
function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[.\s,₫đ]/gi, ''));
  return Number.isFinite(n) ? n : null;
}

async function main() {
  requireEnv();
  const supabase = createClient(
    NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Cache khách hàng & danh mục theo tên -> id.
  const customerCache = new Map<string, string>();
  const categoryCache = new Map<string, string>();

  async function customerId(name: string | null): Promise<string | null> {
    if (!name) return null;
    if (customerCache.has(name)) return customerCache.get(name)!;
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    let id = existing?.id;
    if (!id) {
      const { data, error } = await supabase
        .from('customers')
        .insert({ name })
        .select('id')
        .single();
      if (error) throw error;
      id = data.id;
    }
    customerCache.set(name, id);
    return id;
  }

  async function categoryId(name: string | null): Promise<string | null> {
    if (!name) return null;
    if (categoryCache.has(name)) return categoryCache.get(name)!;
    const { data: existing } = await supabase
      .from('expense_categories')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    let id = existing?.id;
    if (!id) {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ name })
        .select('id')
        .single();
      if (error) throw error;
      id = data.id;
    }
    categoryCache.set(name, id);
    return id;
  }

  // ── Hóa đơn ──
  console.log(`Đọc bảng "${MAP.invoices.table}"…`);
  const invoiceRecords = await fetchAll(MAP.invoices.table);
  const f = MAP.invoices.fields;
  let invOk = 0,
    invSkip = 0;
  for (const rec of invoiceRecords) {
    const invoice_number = str(rec.fields[f.invoice_number]);
    const amount = num(rec.fields[f.amount]);
    const issue_date = str(rec.fields[f.issue_date]);
    if (!invoice_number || amount == null || !issue_date) {
      invSkip++;
      continue;
    }
    const { error } = await supabase.from('invoices').upsert(
      {
        invoice_number,
        issue_date,
        amount,
        customer_id: await customerId(str(rec.fields[f.customer_name])),
        note: str(rec.fields[f.note]),
      },
      { onConflict: 'invoice_number', ignoreDuplicates: true },
    );
    if (error) {
      console.warn(`  bỏ qua ${invoice_number}: ${error.message}`);
      invSkip++;
    } else invOk++;
  }
  console.log(`  hóa đơn: ${invOk} nạp, ${invSkip} bỏ qua`);

  // ── Chi phí ──
  console.log(`Đọc bảng "${MAP.expenses.table}"…`);
  const expenseRecords = await fetchAll(MAP.expenses.table);
  const g = MAP.expenses.fields;
  let expOk = 0,
    expSkip = 0;
  for (const rec of expenseRecords) {
    const amount = num(rec.fields[g.amount]);
    const expense_date = str(rec.fields[g.expense_date]);
    if (amount == null || !expense_date) {
      expSkip++;
      continue;
    }
    const { error } = await supabase.from('expenses').insert({
      expense_date,
      amount,
      category_id: await categoryId(str(rec.fields[g.category_name])),
      vendor: str(rec.fields[g.vendor]),
      note: str(rec.fields[g.note]),
    });
    if (error) {
      console.warn(`  bỏ qua chi phí: ${error.message}`);
      expSkip++;
    } else expOk++;
  }
  console.log(`  chi phí: ${expOk} nạp, ${expSkip} bỏ qua`);

  console.log('\nXong. Đối chiếu số Supabase với Airtable trước khi hủy Airtable.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
