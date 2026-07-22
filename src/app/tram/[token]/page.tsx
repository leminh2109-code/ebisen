import { getStationView, type StationRevenueRow } from '@/lib/queries';
import { formatCurrency, formatMonth, today } from '@/lib/format';
import { groupByMonthDay } from '@/app/(app)/revenue/detail/group';
import { SalesDetailTable } from '@/app/(app)/revenue/detail/sales-detail-table';
import type { SaleRow } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const n = (v: number) => Number(v).toLocaleString('vi-VN');

export default async function StationViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getStationView(token);

  if (!data.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-negative/10 text-negative text-xl">
            ✕
          </div>
          <h1 className="text-lg font-semibold">Link không hợp lệ</h1>
          <p className="mt-2 text-sm text-muted">
            Link đã hết hiệu lực hoặc sai. Vui lòng liên hệ chủ quầy để lấy link mới.
          </p>
        </div>
      </div>
    );
  }

  const revenue: StationRevenueRow[] = data.revenue_by_month ?? [];
  const totalRevenue = revenue.reduce((s, r) => s + Number(r.revenue), 0);

  const sales: SaleRow[] = (data.sales ?? []).map((s) => ({
    ...s,
    sold_at: s.sold_at ?? '',
    menu_item_id: null,
    staff: null,
    note: null,
  }));
  const months = groupByMonthDay(sales);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <header className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg font-bold text-sm">
            e
          </span>
          <div>
            <h1 className="font-semibold leading-tight">Báo cáo doanh thu — EBISEN</h1>
            <p className="text-xs text-muted">Dành cho trạm · chỉ đọc</p>
          </div>
        </header>

        {/* Doanh thu theo tháng */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Doanh thu theo tháng</h2>
            <p className="text-xs text-muted mt-0.5">
              Tổng: {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Tháng</th>
                  <th className="px-4 py-2 font-medium text-right">Số ngày</th>
                  <th className="px-4 py-2 font-medium text-right">Số bánh</th>
                  <th className="px-4 py-2 font-medium text-right">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {revenue.map((r) => (
                  <tr key={r.month} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{formatMonth(r.month)}</td>
                    <td className="px-4 py-2.5 text-right tabular">{r.days}</td>
                    <td className="px-4 py-2.5 text-right tabular">{n(Number(r.cakes))}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium">
                      {formatCurrency(r.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold bg-background">
                  <td className="px-4 py-2.5" colSpan={3}>Tổng cộng</td>
                  <td className="px-4 py-2.5 text-right tabular">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Bán hàng chi tiết */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-sm">Bán hàng chi tiết</h2>
            <p className="text-xs text-muted mt-0.5">
              {sales.length} lần bán · {sales.reduce((s, i) => s + Number(i.quantity), 0)} bánh
            </p>
          </div>
          <SalesDetailTable months={months} todayKey={today()} editable={false} isOwner={false} />
        </div>

      </div>
    </div>
  );
}
