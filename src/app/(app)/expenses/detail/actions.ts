'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ExpenseMutState = { ok: boolean; error: string | null };

/** Chuẩn hóa tiền: bỏ dấu chấm/phẩy ngăn cách. "1.500.000" hoặc "1500000". */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.\s,₫đ]/gi, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null };
  return { supabase, user };
}

function revalidateExpenses() {
  revalidatePath('/expenses/detail');
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/pnl');
}

/** Sửa một khoản chi. Ai đăng nhập cũng sửa được (khớp RLS "expenses: sửa"). */
export async function updateExpense(
  _prev: ExpenseMutState,
  formData: FormData,
): Promise<ExpenseMutState> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const id = String(formData.get('id') ?? '').trim();
  const expense_date = String(formData.get('expense_date') ?? '').trim();
  const amount = parseNumber(String(formData.get('amount') ?? ''));
  const category = String(formData.get('category') ?? '').trim() || null;
  const expense_type = String(formData.get('expense_type') ?? '').trim() || null;
  const cost_center = String(formData.get('cost_center') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;

  if (!id) return { ok: false, error: 'Thiếu id khoản chi.' };
  if (!expense_date) return { ok: false, error: 'Thiếu ngày chi.' };
  if (amount === null) return { ok: false, error: 'Số tiền không hợp lệ.' };

  const { error } = await supabase
    .from('expenses')
    .update({ expense_date, amount, category, expense_type, cost_center, description })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidateExpenses();
  return { ok: true, error: null };
}

/** Xóa một khoản chi. Chỉ owner (RLS "expenses: owner xóa"). */
export async function deleteExpense(
  _prev: ExpenseMutState,
  formData: FormData,
): Promise<ExpenseMutState> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Thiếu id khoản chi.' };

  const { data: deleted, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, error: error.message };
  // RLS chặn xóa với staff → delete chạy "thành công" nhưng 0 dòng.
  if (!deleted || deleted.length === 0)
    return { ok: false, error: 'Chỉ chủ DN được xóa khoản chi.' };

  revalidateExpenses();
  return { ok: true, error: null };
}
