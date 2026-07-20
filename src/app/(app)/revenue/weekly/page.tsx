import { getRevenueByWeek } from '@/lib/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { BarChart } from '@/components/BarChart';
import { PrevCell, DiffCell } from '../compare-cells';

export const dynamic = 'force-dynamic';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');
/** "20/07 – 26/07" (bỏ năm cho gọn). */
const range = (a: string, b: string) => `${formatDate(a).slice(0, 5)} – ${formatDate(b).slice(0, 5)}`;

export default async function RevenueWeeklyPage() {
  const rows = await getRevenueByWeek(52);

  const chart = rows
    .slice(0, 12)
    .reverse()
    .map((r) => ({ label: formatDate(r.week_start).slice(0, 5), value: Number(r.revenue) }));

  return (
    <div>
      <PageHeader
        title="Doanh thu theo tuần"
        subtitle="Tuần tính từ Thứ 2 đến Chủ nhật, kèm so sánh các tuần trước"
      />

      {rows.length > 0 && (
        <Card title="12 tuần gần nhất" className="mb-6">
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
                  <th className="px-4 py-2 font-medium">Tuần</th>
                  <th className="px-4 py-2 font-medium text-right">Số ngày</th>
                  <th className="px-4 py-2 font-medium text-right">Số bánh</th>
                  <th className="px-4 py-2 font-medium text-right">Doanh thu</th>
                  <th className="px-4 py-2 font-medium text-right">Tuần trước</th>
                  <th className="px-4 py-2 font-medium text-right">2 tuần trước</th>
                  <th className="px-4 py-2 font-medium text-right">3 tuần trước</th>
                  <th className="px-4 py-2 font-medium text-right">WoW</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const partial = Number(r.days) < 7;
                  return (
                    <tr
                      key={r.week_start}
                      className="border-b border-border last:border-0 hover:bg-background"
                    >
                      <td className="px-4 py-2.5 tabular whitespace-nowrap">
                        {range(r.week_start, r.week_end)}
                        {partial && (
                          <span className="ml-2 text-xs font-normal text-muted">chưa đủ tuần</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular">{n(r.days)}</td>
                      <td className="px-4 py-2.5 text-right tabular">{n(r.cakes)}</td>
                      <td className="px-4 py-2.5 text-right tabular font-medium whitespace-nowrap">
                        {formatCurrency(r.revenue)}
                      </td>
                      <PrevCell value={r.revenue_prev1} />
                      <PrevCell value={r.revenue_prev2} />
                      <PrevCell value={r.revenue_prev3} />
                      {/* Tuần chưa đủ 7 ngày thì % chênh chưa có ý nghĩa. */}
                      {partial ? (
                        <td className="px-4 py-2.5 text-right text-xs text-muted">—</td>
                      ) : (
                        <DiffCell pct={r.diff_pct} />
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        Tuần bắt đầu Thứ 2. <strong>WoW</strong> = % tuần này so với tuần liền trước
        — tuần đang chạy (chưa đủ 7 ngày) để trống vì so sánh chưa có ý nghĩa. Nguồn:
        doanh thu ngày chính thức; mọi con số tính trong Postgres.
      </p>
    </div>
  );
}
