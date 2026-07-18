'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayVN } from '@/lib/format';

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

  // Ngày bán = ngày hôm nay (giờ VN). Form không còn ô chọn ngày.
  const sale_date = todayVN();
  const menu_item_id = String(formData.get('menu_item_id') ?? '').trim() || null;
  const quantity = parseNumber(String(formData.get('quantity') ?? ''));
  let unit_price = parseNumber(String(formData.get('unit_price') ?? ''));
  const source = String(formData.get('source') ?? '').trim() || null;
  const staff_id = String(formData.get('staff_id') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!menu_item_id) return { ok: false, error: 'Chọn món trong thực đơn.' };
  if (quantity === null || quantity <= 0) return { ok: false, error: 'Số lượng không hợp lệ.' };

  // Snapshot tên món + giá từ thực đơn tại thời điểm bán. Nếu nhân viên sửa đơn
  // giá (giảm giá), dùng giá đã sửa; nếu không, lấy giá menu hiện tại.
  const { data: item } = await supabase
    .from('menu')
    .select('name, price')
    .eq('id', menu_item_id)
    .single();
  if (!item) return { ok: false, error: 'Món không tồn tại.' };
  if (unit_price === null) unit_price = Number(item.price);

  const amount = quantity * unit_price;

  // Snapshot tên nhân viên từ bảng employees (giữ nguyên nếu sau này sửa/xóa NV).
  let staff: string | null = null;
  if (staff_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('name')
      .eq('id', staff_id)
      .single();
    if (!emp) return { ok: false, error: 'Nhân viên không tồn tại.' };
    staff = emp.name;
  }

  const { error } = await supabase.from('sales').insert({
    sale_date,
    // sold_at để trống → mặc định now() (đúng thời điểm gửi form).
    menu_item_id,
    cake_type: item.name, // snapshot tên món
    quantity,
    unit_price,
    amount,
    source,
    staff, // snapshot tên NV
    staff_id,
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

export async function createShrimpPurchase(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const purchase_date = String(formData.get('purchase_date') ?? '').trim();
  const kg = parseNumber(String(formData.get('kg') ?? ''));
  const size_per_kg = parseNumber(String(formData.get('size_per_kg') ?? ''));
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!purchase_date) return { ok: false, error: 'Thiếu ngày nhập.' };
  if (kg === null || kg <= 0) return { ok: false, error: 'Số kg không hợp lệ.' };
  if (size_per_kg === null || size_per_kg <= 0)
    return { ok: false, error: 'Size (con/kg) không hợp lệ.' };

  // shrimp_count là cột generated (kg × size) — không insert tay.
  const { error } = await supabase.from('shrimp_purchases').insert({
    purchase_date,
    kg,
    size_per_kg,
    note,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { ok: true, error: null };
}
