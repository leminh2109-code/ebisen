'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type EntryState = { ok: boolean; error: string | null };

/** Chuẩn hóa tiền/số: bỏ dấu chấm/phẩy ngăn cách. "1.500.000" hoặc "1500000". */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.\s,₫đ]/gi, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function createSale(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const sale_date = String(formData.get('sale_date') ?? '').trim();
  const cake_type = String(formData.get('cake_type') ?? '').trim() || null;
  const quantity = parseNumber(String(formData.get('quantity') ?? ''));
  const unit_price = parseNumber(String(formData.get('unit_price') ?? ''));
  const source = String(formData.get('source') ?? '').trim() || null;
  const staff = String(formData.get('staff') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!sale_date) return { ok: false, error: 'Thiếu ngày bán.' };
  if (quantity === null || quantity <= 0) return { ok: false, error: 'Số lượng không hợp lệ.' };
  if (unit_price === null) return { ok: false, error: 'Đơn giá không hợp lệ.' };

  const amount = quantity * unit_price;

  const { error } = await supabase.from('sales').insert({
    sale_date,
    sold_at: new Date(sale_date).toISOString(),
    cake_type,
    quantity,
    unit_price,
    amount,
    source,
    staff,
    note,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  // Trigger tự cập nhật doanh thu ngày → revalidate các trang liên quan.
  revalidatePath('/revenue/detail');
  revalidatePath('/revenue/monthly');
  revalidatePath('/dashboard');
  revalidatePath('/pnl');
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
  const amount = parseNumber(String(formData.get('amount') ?? ''));
  const category = String(formData.get('category') ?? '').trim() || null;
  const expense_type = String(formData.get('expense_type') ?? '').trim() || null;
  const cost_center = String(formData.get('cost_center') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;

  if (!expense_date) return { ok: false, error: 'Thiếu ngày chi.' };
  if (amount === null) return { ok: false, error: 'Số tiền không hợp lệ.' };

  const { error } = await supabase.from('expenses').insert({
    expense_date,
    amount,
    category,
    expense_type,
    cost_center,
    description,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/pnl');
  return { ok: true, error: null };
}
