'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayVN } from '@/lib/format';
import type { EntryState } from '@/app/(app)/entry/actions';

/** Chuẩn hóa tiền/số: bỏ dấu chấm/phẩy ngăn cách. */
function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.\s,₫đ]/gi, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Ghi 1 lần bán từ LINK CÔNG KHAI. Không cần đăng nhập — xác thực bằng token qua
 * RPC security definer public_submit_sale (RLS vẫn nguyên, không dùng service_role).
 */
export async function submitPublicSale(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) return { ok: false, error: 'Link không hợp lệ.' };

  // Ngày bán = ngày hôm nay (giờ VN). Form không còn ô chọn ngày.
  const sale_date = todayVN();
  const menu_item_id = String(formData.get('menu_item_id') ?? '').trim() || null;
  const quantity = parseNumber(String(formData.get('quantity') ?? ''));
  const unit_price = parseNumber(String(formData.get('unit_price') ?? ''));
  const source = String(formData.get('source') ?? '').trim() || null;
  const staff_id = String(formData.get('staff_id') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!menu_item_id) return { ok: false, error: 'Chọn món trong danh sách.' };
  if (quantity === null || quantity <= 0)
    return { ok: false, error: 'Số lượng không hợp lệ.' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('public_submit_sale', {
    p_token: token,
    p_sale_date: sale_date,
    p_menu_item_id: menu_item_id,
    p_quantity: quantity,
    p_unit_price: unit_price,
    p_source: source,
    p_staff_id: staff_id,
    p_note: note,
  });

  if (error) {
    if (error.message.includes('invalid_token'))
      return { ok: false, error: 'Link đã hết hiệu lực. Liên hệ chủ tiệm.' };
    if (error.message.includes('invalid_menu_item'))
      return { ok: false, error: 'Món không tồn tại.' };
    if (error.message.includes('invalid_staff'))
      return { ok: false, error: 'Nhân viên không tồn tại.' };
    return { ok: false, error: 'Không lưu được. Vui lòng thử lại.' };
  }

  // Trang báo cáo (sau đăng nhập) dùng dữ liệu này — làm mới cache.
  revalidatePath('/dashboard');
  revalidatePath('/revenue/detail');
  return { ok: true, error: null };
}
