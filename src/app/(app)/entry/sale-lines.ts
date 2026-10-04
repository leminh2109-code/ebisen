// Helper thuần (KHÔNG 'use server') — file server action chỉ được export hàm async,
// nên type + hàm parse dòng bánh tách ra đây để cả createSale & submitPublicSale dùng.

/** Chuẩn hóa tiền/số: bỏ dấu chấm/phẩy ngăn cách. "1.500.000" hoặc "1500000". */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[.\s,₫đ]/gi, '').trim();
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Một dòng bánh trong đơn. box_1tom/box_2tom là số bánh mỗi loại TRONG MỖI HỘP (chỉ cho is_box). */
export type SaleLine = {
  menu_item_id: string;
  quantity: number;
  unit_price: number | null;
  box_1tom: number | null;
  box_2tom: number | null;
};

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
    const b1 = parseNumber(String(formData.get(`box_1tom_${menu_item_id}`) ?? ''));
    const b2 = parseNumber(String(formData.get(`box_2tom_${menu_item_id}`) ?? ''));
    lines.push({
      menu_item_id,
      quantity,
      unit_price,
      box_1tom: b1 !== null && b1 >= 0 ? b1 : null,
      box_2tom: b2 !== null && b2 >= 0 ? b2 : null,
    });
  }
  return lines;
}
