'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayVN } from '@/lib/format';
import { parseNumber, parseSaleLines } from './sale-lines';

export type EntryState = { ok: boolean; error: string | null };

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
  const lines = parseSaleLines(formData);
  const source = String(formData.get('source') ?? '').trim() || null;
  const staff_id = String(formData.get('staff_id') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (lines.length === 0) return { ok: false, error: 'Nhập số lượng ít nhất 1 loại bánh.' };

  // Snapshot tên món + giá từ thực đơn tại thời điểm bán. Nếu nhân viên sửa đơn
  // giá (giảm giá), dùng giá đã sửa; nếu không, lấy giá menu hiện tại.
  const { data: items } = await supabase
    .from('menu')
    .select('id, name, price')
    .in('id', lines.map((l) => l.menu_item_id));
  const byId = new Map((items ?? []).map((it) => [it.id, it]));
  for (const l of lines) if (!byId.has(l.menu_item_id)) return { ok: false, error: 'Món không tồn tại.' };

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

  // Mỗi loại bánh → 1 dòng sales riêng (bảng chi tiết vẫn tách 1 tôm / 2 tôm).
  const rows = lines.map((l) => {
    const item = byId.get(l.menu_item_id)!;
    const unit_price = l.unit_price ?? Number(item.price);
    return {
      sale_date,
      // sold_at để trống → mặc định now() (đúng thời điểm gửi form).
      menu_item_id: l.menu_item_id,
      cake_type: item.name, // snapshot tên món
      quantity: l.quantity,
      unit_price,
      amount: l.quantity * unit_price,
      source,
      staff, // snapshot tên NV
      staff_id,
      note,
      created_by: user.id,
    };
  });

  const { error } = await supabase.from('sales').insert(rows);

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
  const shrimp_count = parseNumber(String(formData.get('shrimp_count') ?? ''));
  const kg = parseNumber(String(formData.get('kg') ?? '')); // tùy chọn
  const total_cost = parseNumber(String(formData.get('total_cost') ?? '')); // tùy chọn
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!purchase_date) return { ok: false, error: 'Thiếu ngày nhập.' };
  if (shrimp_count === null || shrimp_count <= 0)
    return { ok: false, error: 'Số con tôm không hợp lệ.' };

  const { error } = await supabase.from('shrimp_purchases').insert({
    purchase_date,
    shrimp_count,
    kg: kg === null || kg <= 0 ? null : kg,
    total_cost: total_cost === null || total_cost < 0 ? null : total_cost,
    note,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  return { ok: true, error: null };
}

/** Xóa một lần nhập tôm (RLS chỉ cho owner xóa). */
export async function deleteShrimpPurchase(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  await supabase.from('shrimp_purchases').delete().eq('id', id);
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
}

export async function createShrimpGift(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const gift_date = String(formData.get('gift_date') ?? '').trim();
  const menu_item_id = String(formData.get('menu_item_id') ?? '').trim() || null;
  const quantity = parseNumber(String(formData.get('quantity') ?? ''));
  const note = String(formData.get('note') ?? '').trim() || null;
  const customerSel = String(formData.get('customer_id') ?? '').trim();

  if (!gift_date) return { ok: false, error: 'Thiếu ngày tặng.' };
  if (!menu_item_id) return { ok: false, error: 'Chọn loại bánh.' };
  if (quantity === null || quantity <= 0) return { ok: false, error: 'Số lượng không hợp lệ.' };

  // Khách nhận (tùy chọn): chọn khách cũ, thêm khách mới (gộp theo SĐT), hoặc bỏ trống.
  let customer_id: string | null = null;
  if (customerSel === '__new__') {
    const phone = String(formData.get('new_phone') ?? '').replace(/[^\d+]/g, '');
    const cname = String(formData.get('new_name') ?? '').trim() || null;
    const address = String(formData.get('new_address') ?? '').trim() || null;
    if (phone.replace(/\D/g, '').length < 8)
      return { ok: false, error: 'Số điện thoại khách mới không hợp lệ.' };
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (existing) {
      // SĐT đã có → dùng khách cũ, cập nhật tên/địa chỉ nếu vừa nhập (không ghi đè rỗng).
      customer_id = existing.id;
      const upd: { name?: string; address?: string } = {};
      if (cname) upd.name = cname;
      if (address) upd.address = address;
      if (Object.keys(upd).length) await supabase.from('customers').update(upd).eq('id', customer_id);
    } else {
      const { data: created, error: cErr } = await supabase
        .from('customers')
        .insert({ phone, name: cname, address, created_by: user.id })
        .select('id')
        .single();
      if (cErr || !created) return { ok: false, error: cErr?.message ?? 'Không tạo được khách.' };
      customer_id = created.id;
    }
  } else if (customerSel) {
    customer_id = customerSel;
  }

  // Snapshot tên loại bánh (giữ nguyên nếu sau này đổi/xóa món).
  const { data: item } = await supabase.from('menu').select('name').eq('id', menu_item_id).single();
  if (!item) return { ok: false, error: 'Loại bánh không tồn tại.' };

  const { error } = await supabase.from('shrimp_gifts').insert({
    gift_date,
    menu_item_id,
    cake_type: item.name,
    quantity,
    note,
    customer_id,
    created_by: user.id,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/inventory');
  revalidatePath('/dashboard');
  revalidatePath('/customers');
  return { ok: true, error: null };
}

/** Xóa một lần nhập bánh tặng (RLS chỉ cho owner xóa). */
export async function deleteShrimpGift(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  await supabase.from('shrimp_gifts').delete().eq('id', id);
  revalidatePath('/inventory');
  revalidatePath('/dashboard');
}

export async function createMaterialPurchase(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const material = String(formData.get('material') ?? '').trim();
  const purchase_date = String(formData.get('purchase_date') ?? '').trim();
  const quantity = parseNumber(String(formData.get('quantity') ?? ''));
  const total_cost = parseNumber(String(formData.get('total_cost') ?? ''));
  const note = String(formData.get('note') ?? '').trim() || null;

  if (material !== 'tui' && material !== 'tem')
    return { ok: false, error: 'Chọn loại vật tư (túi/tem).' };
  if (!purchase_date) return { ok: false, error: 'Thiếu ngày nhập.' };
  if (quantity === null || quantity <= 0) return { ok: false, error: 'Số lượng không hợp lệ.' };
  if (total_cost === null) return { ok: false, error: 'Tổng chi phí không hợp lệ.' };

  const { error } = await supabase.from('material_purchases').insert({
    material,
    purchase_date,
    quantity,
    total_cost,
    note,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/materials');
  revalidatePath('/dashboard');
  revalidatePath('/pnl');
  return { ok: true, error: null };
}

/** Xóa một lần nhập vật tư (RLS chỉ cho owner xóa). */
export async function deleteMaterialPurchase(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  await supabase.from('material_purchases').delete().eq('id', id);
  revalidatePath('/materials');
  revalidatePath('/dashboard');
  revalidatePath('/pnl');
}
