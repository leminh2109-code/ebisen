import { getRevenueByDayCompare } from '@/lib/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { BarChart } from '@/components/BarChart';
import { PrevCell, DiffCell } from '../compare-cells';

export const dynamic = 'force-dynamic';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');
// 1 = Thứ 2 … 7 = Chủ nhật (khớp extract(isodow) trong view).
const WEEKDAY = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default async function RevenueDailyPage() {
  const rows = await getRevenueByDayCompare(90);

  const chart = rows
    .slice(0, 14)
    .reverse()
    .map((r) => ({ label: formatDate(r.day).slice(0, 5), value: Number(r.revenue) }));

  return (
    <div>
      <PageHeader
        title="Doanh thu theo ngày"
        subtitle="So sánh với CÙNG THỨ của 1, 2, 3 tuần trước (vd: Chủ nhật so với 3 Chủ nhật liền trước)"
      />

      {rows.length > 0 && (
        <Card title="14 ngày gần nhất" className="mb-6">
          <BarChart data={chart} />
        </Card>
      )}

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="Chưa có doanh thu nào." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Thứ</th>
                  <th className="px-4 py-2 font-medium text-right">Số bánh</th>
                  <th className="px-4 py-2 font-medium text-right">Doanh thu</th>
                  <th className="px-4 py-2 font-medium text-right">1 tuần trước</th>
                  <th className="px-4 py-2 font-medium text-right">2 tuần trước</th>
                  <th className="px-4 py-2 font-medium text-right">3 tuần trước</th>
                  <th className="px-4 py-2 font-medium text-right">DoD</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.day} className="border-b border-border last:border-0 hover:bg-background">
                    <td className="px-4 py-2.5 tabular whitespace-nowrap">{formatDate(r.day)}</td>
                    <td className="px-4 py-2.5 text-muted">{WEEKDAY[r.weekday] ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular">{n(r.cakes)}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium whitespace-nowrap">
                      {formatCurrency(r.revenue)}
                    </td>
                    <PrevCell value={r.revenue_1w} />
                    <PrevCell value={r.revenue_2w} />
                    <PrevCell value={r.revenue_3w} />
                    <DiffCell pct={r.diff_pct} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        &quot;1/2/3 tuần trước&quot; = doanh thu ĐÚNG THỨ đó của các tuần liền trước
        (lùi 7 / 14 / 21 ngày). <strong>DoD</strong> = % ngày này so với cùng thứ của
        TUẦN TRƯỚC (cột &quot;1 tuần trước&quot;). Nguồn: doanh thu ngày chính thức;
        mọi con số tính trong Postgres.
      </p>
    </div>
  );
}

