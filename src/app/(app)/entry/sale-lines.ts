// Helper thuần (KHÔNG 'use server') — file server action chỉ được export hàm async,
// nên type + hàm parse dòng bánh tách ra đây để cả createSale & submitPublicSale dùng.

/** Chuẩn hóa tiền/số: bỏ dấu chấm/phẩy ngăn cách. "1.500.000" hoặc "1500000". */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.\s,₫đ]/gi, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Một dòng bánh trong đơn: {menu_item_id, quantity, unit_price?}. */
export type SaleLine = { menu_item_id: string; quantity: number; unit_price: number | null };

/**
 * Đọc các dòng bánh từ form (nhiều loại/đơn). Mỗi món có ô `qty_<id>` + `price_<id>`;
 * chỉ lấy món có SL > 0. Trả về [] nếu không có món nào.
 */
export function parseSaleLines(formData: FormData): SaleLine[] {
  const lines: SaleLine[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('qty_')) continue;
    const quantity = parseNumber(String(value));
    if (quantity === null || quantity <= 0) continue;
    const menu_item_id = key.slice(4).trim();
    if (!menu_item_id) continue;
    const unit_price = parseNumber(String(formData.get(`price_${menu_item_id}`) ?? ''));
    lines.push({ menu_item_id, quantity, unit_price });
  }
  return lines;
}
