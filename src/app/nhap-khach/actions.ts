'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CustomerState } from '@/app/(app)/customers/actions';

const parseQty = (raw: string): number | null => {
  const n = Number(raw.replace(/[.\s,]/g, '').trim());
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Ghi khách + lần mua từ LINK CÔNG KHAI. Không cần đăng nhập — xác thực bằng token
 * qua RPC security definer public_submit_customer (RLS nguyên vẹn, không service_role).
 */
export async function submitPublicCustomer(
  _prev: CustomerState,
  formData: FormData,
): Promise<CustomerState> {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) return { ok: false, error: 'Link không hợp lệ.' };

  const phone = String(formData.get('phone') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim() || null;
  const address = String(formData.get('address') ?? '').trim() || null;
  const order_date = String(formData.get('order_date') ?? '').trim() || null;
  const menu_item_id = String(formData.get('menu_item_id') ?? '').trim() || null;
  const quantity = parseQty(String(formData.get('quantity') ?? ''));
  const note = String(formData.get('note') ?? '').trim() || null;

  if (phone.replace(/\D/g, '').length < 8)
    return { ok: false, error: 'Số điện thoại không hợp lệ.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('public_submit_customer', {
    p_token: token,
    p_phone: phone,
    p_name: name,
    p_address: address,
    p_menu_item_id: menu_item_id,
    p_quantity: quantity,
    p_order_date: order_date,
    p_note: note,
  });

  if (error) {
    if (error.message.includes('invalid_token'))
      return { ok: false, error: 'Link đã hết hiệu lực. Liên hệ chủ tiệm.' };
    if (error.message.includes('invalid_phone'))
      return { ok: false, error: 'Số điện thoại không hợp lệ.' };
    return { ok: false, error: 'Không lưu được. Vui lòng thử lại.' };
  }

  revalidatePath('/customers');
  return { ok: true, error: null };
}
