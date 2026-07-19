// Ngưỡng cảnh báo tồn kho thấp — báo đỏ khi tồn kho <= ngưỡng.
// Đây là mức nhắc nhở HIỂN THỊ (khi nào cần nhập thêm), không phải số liệu P&L,
// nên để hằng số ở frontend là hợp lý. Sửa số ở đây là đổi cho mọi nơi hiển thị.

/** Tôm: còn <= 400 con thì cảnh báo đỏ. */
export const SHRIMP_LOW_STOCK = 400;

/** Vật tư: túi/tem còn <= 2000 cái thì cảnh báo đỏ. */
export const MATERIAL_LOW_STOCK: Record<string, number> = { tui: 2000, tem: 2000 };

export const isShrimpLow = (onHand: number) => onHand <= SHRIMP_LOW_STOCK;

export const isMaterialLow = (material: string, onHand: number) =>
  material in MATERIAL_LOW_STOCK && onHand <= MATERIAL_LOW_STOCK[material];
