import Link from 'next/link';
import { getExpensesDetail, type ExpenseRow } from '@/lib/queries';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/ui';
import { ExpensesDetailTable, type MonthGroup } from './expenses-detail-table';

export const dynamic = 'force-dynamic';

/** Nhóm expenses (đã sắp expense_date giảm dần) theo tháng. */
function groupByMonth(rows: ExpenseRow[]): MonthGroup[] {
  const months: MonthGroup[] = [];
  let cur: MonthGroup | undefined;
  for (const r of rows) {
    const key = r.expense_date.slice(0, 7); // "YYYY-MM"
    if (!cur || cur.key !== key) {
      cur = { key, count: 0, total: 0, rows: [] };
      months.push(cur);
    }
    cur.rows.push(r);
    cur.count += 1;
    cur.total += Number(r.amount);
  }
  return months;
}

export default async function ExpensesDetailPage() {
  const rows = await getExpensesDetail();
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const months = groupByMonth(rows);

  return (
    <div>
      <PageHeader
        title="Chi phí chi tiết"
        subtitle={`${rows.length} khoản · ${formatCurrency(total)}`}
        action={
          <Link
            href="/entry/expense"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập chi phí
          </Link>
        }
      />

      <ExpensesDetailTable months={months} />
    </div>
  );
}
