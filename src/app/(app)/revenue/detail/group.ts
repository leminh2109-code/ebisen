// Nhóm sales theo tháng → ngày. Module server-safe (KHÔNG 'use client') để cả
// server component (trang chi tiết nội bộ + link xem công khai) lẫn client
// component (SalesDetailTable) dùng chung.
import type { SaleRow } from '@/lib/queries';

export type DayGroup = {
  key: string;
  qty: number;
  qty1: number;
  qty2: number;
  total: number;
  tm: number;
  ck: number;
  weather: string | null;
  rows: SaleRow[];
};

export type MonthGroup = {
  key: string;
  qty: number;
  total: number;
  days: DayGroup[];
};

/**
 * Nhóm sales (đã sắp xếp sale_date/sold_at giảm dần) theo tháng, rồi theo ngày.
 * `weatherByDay` (tùy chọn): map "YYYY-MM-DD" → chuỗi thời tiết để gắn vào mỗi ngày.
 */
export function groupByMonthDay(
  sales: SaleRow[],
  weatherByDay?: Record<string, string>,
): MonthGroup[] {
  const months: MonthGroup[] = [];
  let month: MonthGroup | undefined;
  let day: DayGroup | undefined;

  for (const s of sales) {
    const monthKey = s.sale_date.slice(0, 7); // "YYYY-MM"
    const dayKey = s.sale_date; // "YYYY-MM-DD"
    const amount = Number(s.amount);
    const quantity = Number(s.quantity);

    if (!month || month.key !== monthKey) {
      month = { key: monthKey, qty: 0, total: 0, days: [] };
      months.push(month);
      day = undefined;
    }
    if (!day || day.key !== dayKey) {
      day = { key: dayKey, qty: 0, qty1: 0, qty2: 0, total: 0, tm: 0, ck: 0, weather: weatherByDay?.[dayKey] ?? null, rows: [] };
      month.days.push(day);
    }

    day.rows.push(s);
    day.qty += quantity;
    if (s.cake_type?.includes('1 tôm')) day.qty1 += quantity;
    else if (s.cake_type?.includes('2 tôm')) day.qty2 += quantity;
    day.total += amount;
    if (s.source === 'TM') day.tm += amount;
    else if (s.source === 'CK') day.ck += amount;
    month.qty += quantity;
    month.total += amount;
  }

  return months;
}
