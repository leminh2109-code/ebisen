import { getRevenueByMonth, getSalesQtyByMonth, getPaymentSplitByMonth } from '@/lib/queries';
import { formatCurrency, formatMonth } from '@/lib/format';
import { PageHeader, Card, EmptyState, StatCard } from '@/components/ui';
import { BarChart } from '@/components/BarChart';

export const dynamic = 'force-dynamic';

const n = (v: number) => Number(v).toLocaleString('vi-VN');

export default async function RevenueMonthlyPage() {
  const [rows, qtyRows, paymentSplit] = await Promise.all([
    getRevenueByMonth(),
    getSalesQtyByMonth(),
    getPaymentSplitByMonth(),
  ]);
  const qtyByMonth = new Map(qtyRows.map((q) => [q.month, q]));

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const split = paymentSplit.find((p) => p.month === currentMonth);
  const thisMonth = rows.find((r) => r.month === currentMonth);

  const chart = rows
    .slice(0, 12)
    .reverse()
    .map((r) => ({
      label: formatMonth(r.month).replace('Tháng ', 'T'),
      value: Number(r.revenue),
    }));

  const total = rows.reduce((s, r) => s + Number(r.revenue), 0);

  return (
    <div>
      <PageHeader
        title="Doanh thu theo tháng"
        subtitle={`Tổng cộng: ${formatCurrency(total)}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <StatCard label="Doanh thu tháng này" amount={Number(thisMonth?.revenue ?? 0)} />
        <StatCard label="Tiền mặt tháng này (TM)" amount={split?.cash ?? 0} />
        <StatCard label="Chuyển khoản tháng này (CK)" amount={split?.transfer ?? 0} />
      </div>
      <p className="mb-6 text-xs text-muted">
        TM/CK tính từ từng lần bán trong tháng. Tháng lịch sử (nạp từ Airtable) có
        thể lệch so với doanh thu chính thức — dùng để xem tỷ lệ thanh toán.
      </p>

      <Card title="12 tháng gần nhất" className="mb-6">
        <BarChart data={chart} />
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="Chưa có doanh thu nào." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Tháng</th>
                  <th className="px-4 py-2 font-medium text-right">Số ngày</th>
                  <th className="px-4 py-2 font-medium text-right">Số bánh</th>
                  <th className="px-4 py-2 font-medium text-right">SL 1 tôm</th>
                  <th className="px-4 py-2 font-medium text-right">SL 2 tôm</th>
                  <th className="px-4 py-2 font-medium text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const q = qtyByMonth.get(r.month);
                  return (
                    <tr key={r.month} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5">{formatMonth(r.month)}</td>
                      <td className="px-4 py-2.5 text-right tabular">{r.days}</td>
                      <td className="px-4 py-2.5 text-right tabular">{n(Number(r.cakes))}</td>
                      <td className="px-4 py-2.5 text-right tabular">{q ? n(q.qty_1tom) : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular">{q ? n(q.qty_2tom) : '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular font-medium">
                        {formatCurrency(r.revenue)}
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
        SL 1 tôm / 2 tôm lấy từ từng lần bán. Tháng lịch sử (nạp từ Airtable) có một
        số bản ghi trống loại bánh nên tổng SL 1 tôm + 2 tôm có thể nhỏ hơn “Số bánh”.
      </p>
    </div>
  );
}
