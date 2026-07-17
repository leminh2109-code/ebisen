// Nhóm sales theo tháng → ngày. Module server-safe (KHÔNG 'use client') để cả
// server component (trang chi tiết nội bộ + link xem công khai) lẫn client
// component (SalesDetailTable) dùng chung.
import type { SaleRow } from '@/lib/queries';

export type DayGroup = {
  key: string;
  qty: number;
  total: number;
  rows: SaleRow[];
};

export type MonthGroup = {
  key: string;
  qty: number;
  total: number;
  days: DayGroup[];
};

/** Nhóm sales (đã sắp xếp sale_date/sold_at giảm dần) theo tháng, rồi theo ngày. */
export function groupByMonthDay(sales: SaleRow[]): MonthGroup[] {
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
      day = { key: dayKey, qty: 0, total: 0, rows: [] };
      month.days.push(day);
    }

    day.rows.push(s);
    day.qty += quantity;
    day.total += amount;
    month.qty += quantity;
    month.total += amount;
  }

  return months;
}
