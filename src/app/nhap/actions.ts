'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayVN } from '@/lib/format';
import type { EntryState } from '@/app/(app)/entry/actions';
import { parseSaleLines } from '@/app/(app)/entry/sale-lines';

/**
 * Ghi 1 đơn bán (có thể nhiều loại bánh) từ LINK CÔNG KHAI. Không cần đăng nhập —
 * xác thực bằng token qua RPC security definer public_submit_sale (RLS vẫn nguyên,
 * không dùng service_role). Mỗi loại bánh → 1 dòng sales riêng.
 */
export async function submitPublicSale(
  _prev: EntryState,
  formData: FormData,
): Promise<EntryState> {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) return { ok: false, error: 'Link không hợp lệ.' };

  // Ngày bán = ngày hôm nay (giờ VN). Form không còn ô chọn ngày.
  const sale_date = todayVN();
  const lines = parseSaleLines(formData);
  const source = String(formData.get('source') ?? '').trim() || null;
  const staff_id = String(formData.get('staff_id') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (lines.length === 0)
    return { ok: false, error: 'Nhập số lượng ít nhất 1 loại bánh.' };

  const supabase = await createClient();
  for (const line of lines) {
    const { error } = await supabase.rpc('public_submit_sale', {
      p_token: token,
      p_sale_date: sale_date,
      p_menu_item_id: line.menu_item_id,
      p_quantity: line.quantity,
      p_unit_price: line.unit_price,
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
  }

  // Trang báo cáo (sau đăng nhập) dùng dữ liệu này — làm mới cache.
  revalidatePath('/dashboard');
  revalidatePath('/revenue/detail');
  return { ok: true, error: null };
}
