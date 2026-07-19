'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type CustomerState = { ok: boolean; error: string | null };

const parseQty = (raw: string): number | null => {
  const n = Number(raw.replace(/[.\s,]/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};
/** Chuẩn hóa SĐT: giữ chữ số và dấu + đầu (bỏ khoảng trắng, gạch, chấm…). */
const normalizePhone = (raw: string): string => raw.replace(/[^\d+]/g, '');

/**
 * Ghi một lần mua của khách. Gộp theo SĐT: SĐT đã có → dùng khách cũ (cập nhật
 * tên/địa chỉ nếu nhập mới); chưa có → tạo khách mới. Không đụng doanh thu/tồn kho.
 */
export async function createCustomerOrder(
  _prev: CustomerState,
  formData: FormData,
): Promise<CustomerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const customerSel = String(formData.get('customer_id') ?? '').trim();
  const order_date = String(formData.get('order_date') ?? '').trim();
  const menu_item_id = String(formData.get('menu_item_id') ?? '').trim() || null;
  const quantity = parseQty(String(formData.get('quantity') ?? ''));
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!order_date) return { ok: false, error: 'Thiếu ngày mua.' };
  if (!menu_item_id) return { ok: false, error: 'Chọn loại bánh.' };
  if (quantity === null) return { ok: false, error: 'Số lượng không hợp lệ.' };

  let customerId: string;
  if (customerSel) {
    // Chọn khách cũ từ danh sách → dùng thẳng, không cần nhập lại SĐT.
    const { data: c } = await supabase.from('customers').select('id').eq('id', customerSel).maybeSingle();
    if (!c) return { ok: false, error: 'Khách không tồn tại.' };
    customerId = c.id;
  } else {
    // Khách mới / nhập tay: gộp theo SĐT.
    const phone = normalizePhone(String(formData.get('phone') ?? ''));
    const name = String(formData.get('name') ?? '').trim() || null;
    const address = String(formData.get('address') ?? '').trim() || null;
    if (phone.replace(/\D/g, '').length < 8)
      return { ok: false, error: 'Số điện thoại không hợp lệ.' };

    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      customerId = existing.id;
      // Chỉ cập nhật tên/địa chỉ khi có nhập (không ghi đè bằng rỗng).
      const upd: { name?: string; address?: string } = {};
      if (name) upd.name = name;
      if (address) upd.address = address;
      if (Object.keys(upd).length) await supabase.from('customers').update(upd).eq('id', customerId);
    } else {
      const { data: created, error: cErr } = await supabase
        .from('customers')
        .insert({ phone, name, address, created_by: user.id })
        .select('id')
        .single();
      if (cErr || !created) return { ok: false, error: cErr?.message ?? 'Không tạo được khách.' };
      customerId = created.id;
    }
  }

  // Snapshot tên loại bánh.
  const { data: item } = await supabase.from('menu').select('name').eq('id', menu_item_id).single();

  const { error } = await supabase.from('customer_orders').insert({
    customer_id: customerId,
    order_date,
    menu_item_id,
    cake_type: item?.name ?? null,
    quantity,
    note,
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/customers');
  revalidatePath(`/customers/${customerId}`);
  return { ok: true, error: null };
}

/** Sửa thông tin liên hệ của khách (SĐT, tên, địa chỉ, ghi chú). */
export async function updateCustomer(
  _prev: CustomerState,
  formData: FormData,
): Promise<CustomerState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Phiên đăng nhập hết hạn.' };

  const id = String(formData.get('id') ?? '').trim();
  const phone = normalizePhone(String(formData.get('phone') ?? ''));
  const name = String(formData.get('name') ?? '').trim() || null;
  const address = String(formData.get('address') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;
  // "Số lần mua" mong muốn (owner nhập). Lưu dưới dạng ĐIỀU CHỈNH = mong muốn −
  // số đơn thực tế, để đơn nhập mới sau này vẫn tự cộng đúng.
  const wantOrderCountRaw = String(formData.get('order_count') ?? '').trim();

  if (!id) return { ok: false, error: 'Thiếu khách cần sửa.' };
  if (phone.replace(/\D/g, '').length < 8)
    return { ok: false, error: 'Số điện thoại không hợp lệ.' };

  const update: {
    phone: string;
    name: string | null;
    address: string | null;
    note: string | null;
    order_count_adj?: number;
  } = { phone, name, address, note };

  if (wantOrderCountRaw !== '') {
    const want = Number(wantOrderCountRaw.replace(/[.\s,]/g, ''));
    if (!Number.isInteger(want) || want < 0)
      return { ok: false, error: 'Số lần mua không hợp lệ.' };
    const { count: realCount } = await supabase
      .from('customer_orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', id);
    update.order_count_adj = want - (realCount ?? 0);
  }

  const { error } = await supabase.from('customers').update(update).eq('id', id);
  if (error) {
    if (error.code === '23505' || /duplicate|unique/i.test(error.message))
      return { ok: false, error: 'Số điện thoại này đã có khách khác dùng.' };
    return { ok: false, error: error.message };
  }

  revalidatePath('/customers');
  revalidatePath(`/customers/${id}`);
  return { ok: true, error: null };
}

/** Xóa một lần mua của khách (RLS chỉ owner xóa). */
export async function deleteCustomerOrder(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  const customerId = String(formData.get('customer_id') ?? '').trim();
  if (!id) return;
  await supabase.from('customer_orders').delete().eq('id', id);
  revalidatePath('/customers');
  if (customerId) revalidatePath(`/customers/${customerId}`);
}

/** Xóa hẳn một khách + toàn bộ lịch sử mua (cascade). RLS chỉ owner xóa. */
export async function deleteCustomer(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  await supabase.from('customers').delete().eq('id', id);
  revalidatePath('/customers');
}
