// Định dạng hiển thị: tiền tệ VND và ngày tháng.

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const vndCompact = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** 1500000 -> "1.500.000 ₫" */
export function formatCurrency(amount: number | null | undefined): string {
  return vnd.format(amount ?? 0);
}

/** 1500000 -> "1,5 Tr" (dạng gọn cho biểu đồ / thẻ) */
export function formatCurrencyCompact(amount: number | null | undefined): string {
  return `${vndCompact.format(amount ?? 0)} ₫`;
}

/** "2026-07-16" -> "16/07/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** timestamptz -> "14:32" (giờ:phút, local) */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "2026-07-01" (month bucket) -> "Tháng 7/2026" */
export function formatMonth(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Ngày hôm nay dạng "YYYY-MM-DD" (local, cho input[type=date]) */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Ngày hôm nay theo giờ Việt Nam, dạng "YYYY-MM-DD". Dùng ở server action (server
 * chạy giờ UTC) để sale_date luôn đúng ngày lịch VN, không lệch lúc gần nửa đêm.
 */
export function todayVN(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
