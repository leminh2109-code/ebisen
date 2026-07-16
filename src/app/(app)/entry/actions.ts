'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type EntryState = { ok: boolean; error: string | null };

/** Chuẩn hóa tiền: bỏ dấu chấm/phẩy ngăn cách, chấp nhận "1.500.000" hoặc "1500000". */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[.\s,₫đ]/gi, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createInvoice(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const invoice_number = String(formData.get('invoice_number') ?? '').trim();
  const issue_date = String(formData.get('issue_date') ?? '').trim();
  const amount = parseAmount(String(formData.get('amount') ?? ''));
  const customerName = String(formData.get('customer_name') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!invoice_number) return { ok: false, error: 'Thiếu số hóa đơn.' };
  if (!issue_date) return { ok: false, error: 'Thiếu ngày hóa đơn.' };
  if (amount === null) return { ok: false, error: 'Số tiền không hợp lệ.' };

  // Tìm hoặc tạo khách hàng theo tên (nếu có nhập).
  let customer_id: string | null = null;
  if (customerName) {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('name', customerName)
      .maybeSingle();
    if (existing) {
      customer_id = existing.id;
    } else {
      const { data: created, error: custErr } = await supabase
        .from('customers')
        .insert({ name: customerName, created_by: user.id })
        .select('id')
        .single();
      if (custErr) return { ok: false, error: `Lỗi tạo khách hàng: ${custErr.message}` };
      customer_id = created.id;
    }
  }

  const { error } = await supabase.from('invoices').insert({
    invoice_number,
    issue_date,
    amount,
    customer_id,
    note,
    created_by: user.id,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: `Số hóa đơn "${invoice_number}" đã tồn tại.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/revenue/detail');
  revalidatePath('/revenue/monthly');
  revalidatePath('/dashboard');
  return { ok: true, error: null };
}

export async function createExpense(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const expense_date = String(formData.get('expense_date') ?? '').trim();
  const amount = parseAmount(String(formData.get('amount') ?? ''));
  const category_id = String(formData.get('category_id') ?? '').trim() || null;
  const vendor = String(formData.get('vendor') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!expense_date) return { ok: false, error: 'Thiếu ngày chi.' };
  if (amount === null) return { ok: false, error: 'Số tiền không hợp lệ.' };

  const { error } = await supabase.from('expenses').insert({
    expense_date,
    amount,
    category_id,
    vendor,
    note,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return { ok: true, error: null };
}
