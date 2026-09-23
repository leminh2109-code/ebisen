import { redirect } from 'next/navigation';
import { getPnlByMonth, getCurrentRole } from '@/lib/queries';
import { formatM, formatMonth } from '@/lib/format';
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
  const hasMaterial = rows.some((r) => Number(r.material_cost) > 0);
  const hasBox = rows.some((r) => Number(r.box_cost) > 0);
  const hasShrimp = rows.some((r) => Number(r.shrimp_cost) > 0);
  const hasBonus = rows.some((r) => Number(r.bonus_cost) > 0);

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
        <BarChart data={chart} positiveClass="bg-blue-600/80" />
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu doanh thu hoặc chi phí." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-3 py-2 font-medium">Tháng</th>
                  <th className="px-3 py-2 font-medium text-right">DT</th>
                  <th className="px-3 py-2 font-medium text-right">CP tiền mặt</th>
                  {hasMaterial && (
                    <th className="px-3 py-2 font-medium text-right">Túi/tem</th>
                  )}
                  {hasBox && (
                    <th className="px-3 py-2 font-medium text-right">Hộp</th>
                  )}
                  {hasShrimp && (
                    <th className="px-3 py-2 font-medium text-right">Tôm</th>
                  )}
                  {hasBonus && (
                    <th className="px-3 py-2 font-medium text-right">Thưởng NV</th>
                  )}
                  <th className="px-3 py-2 font-medium text-right">Trạm 30%</th>
                  <th className="px-3 py-2 font-medium text-right">L/L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const profit = Number(r.profit);
                  return (
                    <tr key={r.month} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">{formatMonth(r.month)}</td>
                      <td className="px-3 py-2 text-right tabular">
                        {formatM(r.revenue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular">
                        {formatM(r.cash_expenses)}
                      </td>
                      {hasMaterial && (
                        <td className="px-3 py-2 text-right tabular text-muted">
                          {formatM(r.material_cost)}
                        </td>
                      )}
                      {hasBox && (
                        <td className="px-3 py-2 text-right tabular text-muted">
                          {Number(r.box_cost) > 0 ? formatM(r.box_cost) : '—'}
                        </td>
                      )}
                      {hasShrimp && (
                        <td className="px-3 py-2 text-right tabular text-muted">
                          {Number(r.shrimp_cost) > 0 ? formatM(r.shrimp_cost) : '—'}
                        </td>
                      )}
                      {hasBonus && (
                        <td className="px-3 py-2 text-right tabular text-muted">
                          {Number(r.bonus_cost) > 0 ? formatM(r.bonus_cost) : '—'}
                        </td>
                      )}
                      <td className="px-3 py-2 text-right tabular text-muted">
                        {formatM(r.station_share)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular font-medium ${
                          profit >= 0 ? 'text-blue-600' : 'text-negative'
                        }`}
                      >
                        {formatM(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        &quot;Chi phí&quot; là chi phí tiền mặt (bảng Chi phí).
        {hasMaterial && ' "CP túi/tem" là vật tư đóng gói (túi bạc + tem) phân bổ theo số bánh dùng (xem Tồn kho vật tư).'}{' '}
        {hasBox && '"CP hộp" là chi phí hộp combo phân bổ theo số hộp đã bán (xem Tồn kho hộp).'}{' '}
        {hasShrimp && '"CP tôm" là chi phí tôm phân bổ theo số tôm đã dùng × đơn giá bình quân (xem Tồn kho tôm).'}{' '}
        &quot;Chia sẻ trạm 30%&quot; = 30% tổng doanh thu trả cho trạm dừng nghỉ (cố
        định theo doanh thu).{hasBonus && ' "Thưởng NV" = tổng bánh (bán + tặng) × 10.000đ, tính tự động từ T9/2026.'}{' '}
        Lãi/Lỗ = Doanh thu − Chi phí{hasMaterial ? ' − CP túi/tem' : ''}{hasBox ? ' − CP hộp' : ''}{hasShrimp ? ' − CP tôm' : ''}{hasBonus ? ' − Thưởng NV' : ''} − Chia sẻ trạm.
      </p>
    </div>
  );
}
