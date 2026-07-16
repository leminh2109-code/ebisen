import Link from 'next/link';
import { getSales, type SaleRow } from '@/lib/queries';
import { formatCurrency, today } from '@/lib/format';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import {
  SalesDetailTable,
  type DayGroup,
  type MonthGroup,
} from './sales-detail-table';

export const dynamic = 'force-dynamic';

/** Nhóm sales (đã sắp xếp sale_date/sold_at giảm dần) theo tháng, rồi theo ngày. */
function groupByMonthDay(sales: SaleRow[]): MonthGroup[] {
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

export default async function SalesDetailPage() {
  const sales = await getSales(300);
  const total = sales.reduce((s, i) => s + Number(i.amount), 0);
  const qty = sales.reduce((s, i) => s + Number(i.quantity), 0);
  const months = groupByMonthDay(sales);

  return (
    <div>
      <PageHeader
        title="Bán hàng chi tiết"
        subtitle={`${sales.length} lần bán · ${qty} bánh · ${formatCurrency(total)}`}
        action={
          <Link
            href="/entry/sale"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập bán hàng
          </Link>
        }
      />

      {sales.length === 0 ? (
        <Card>
          <EmptyState message="Chưa có lần bán nào." />
        </Card>
      ) : (
        <SalesDetailTable months={months} todayKey={today()} />
      )}
    </div>
  );
}
