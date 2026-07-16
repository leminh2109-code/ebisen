import { redirect } from 'next/navigation';
import { getPnlByMonth, getCurrentRole } from '@/lib/queries';
import { formatCurrency, formatMonth } from '@/lib/format';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui';
import { BarChart } from '@/components/BarChart';

export const dynamic = 'force-dynamic';

export default async function PnlPage() {
  // Gate cứng ở server: staff không vào được trang này.
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const rows = await getPnlByMonth();

  const chart = rows
    .slice(0, 12)
    .reverse()
    .map((p) => ({
      label: formatMonth(p.month).replace('Tháng ', 'T'),
      value: Number(p.profit),
    }));

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const totalExpenses = rows.reduce((s, r) => s + Number(r.expenses), 0);
  const totalProfit = totalRevenue - totalExpenses;

  return (
    <div>
      <PageHeader
        title="Lãi / Lỗ (P&L)"
        subtitle="Doanh thu trừ chi phí theo từng tháng"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tổng doanh thu" amount={totalRevenue} />
        <StatCard label="Tổng chi phí" amount={totalExpenses} />
        <StatCard label="Lãi/Lỗ ròng" amount={totalProfit} tone="auto" />
      </div>

      <Card title="Lãi/Lỗ 12 tháng gần nhất" className="mb-6">
        <BarChart data={chart} />
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu doanh thu hoặc chi phí." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Tháng</th>
                  <th className="px-4 py-2 font-medium text-right">Doanh thu</th>
                  <th className="px-4 py-2 font-medium text-right">Chi phí</th>
                  <th className="px-4 py-2 font-medium text-right">Lãi/Lỗ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const profit = Number(r.profit);
                  return (
                    <tr key={r.month} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">{formatMonth(r.month)}</td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {formatCurrency(r.revenue)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular">
                        {formatCurrency(r.expenses)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular font-medium ${
                          profit >= 0 ? 'text-positive' : 'text-negative'
                        }`}
                      >
                        {formatCurrency(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
