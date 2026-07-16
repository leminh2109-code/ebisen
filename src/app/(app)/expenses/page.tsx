import Link from 'next/link';
import { getExpensesByMonth, getExpensesByCategory } from '@/lib/queries';
import { formatCurrency, formatMonth } from '@/lib/format';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { BarChart } from '@/components/BarChart';

export const dynamic = 'force-dynamic';

export default async function ExpensesPage() {
  const rows = await getExpensesByMonth();
  const latestMonth = rows[0]?.month;
  const byCategory = latestMonth ? await getExpensesByCategory(latestMonth) : [];

  const chart = rows
    .slice(0, 12)
    .reverse()
    .map((r) => ({
      label: formatMonth(r.month).replace('Tháng ', 'T'),
      value: Number(r.expenses),
    }));

  const total = rows.reduce((s, r) => s + Number(r.expenses), 0);

  return (
    <div>
      <PageHeader
        title="Chi phí theo tháng"
        subtitle={`Tổng cộng: ${formatCurrency(total)}`}
        action={
          <Link
            href="/entry/expense"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập chi phí
          </Link>
        }
      />

      <Card title="12 tháng gần nhất" className="mb-6">
        <BarChart data={chart} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Chi phí theo tháng">
          {rows.length === 0 ? (
            <EmptyState message="Chưa có khoản chi nào." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Tháng</th>
                  <th className="px-4 py-2 font-medium text-right">Số khoản</th>
                  <th className="px-4 py-2 font-medium text-right">Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{formatMonth(r.month)}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {r.expense_count}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium">
                      {formatCurrency(r.expenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card
          title={
            latestMonth
              ? `Phân loại — ${formatMonth(latestMonth)}`
              : 'Phân loại chi phí'
          }
        >
          {byCategory.length === 0 ? (
            <EmptyState message="Chưa có dữ liệu." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Danh mục</th>
                  <th className="px-4 py-2 font-medium text-right">Chi phí</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.category} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{c.category}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium">
                      {formatCurrency(c.expenses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
