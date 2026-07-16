import Link from 'next/link';
import { getDashboardSummary, getCurrentRole } from '@/lib/queries';
import { formatMonth } from '@/lib/format';
import { PageHeader, StatCard, Card } from '@/components/ui';
import { BarChart } from '@/components/BarChart';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [summary, role] = await Promise.all([
    getDashboardSummary(),
    getCurrentRole(),
  ]);
  const isOwner = role === 'owner';

  const trend = summary.pnlTrend.map((p) => ({
    label: formatMonth(p.month).replace('Tháng ', 'T'),
    value: Number(p.profit),
  }));

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        subtitle={formatMonth(summary.currentMonth)}
        action={
          <Link
            href="/entry/sale"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập bán hàng
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Doanh thu tháng này" amount={summary.thisMonthRevenue} />
        <StatCard label="Chi phí tháng này" amount={summary.thisMonthExpenses} />
        {isOwner ? (
          <StatCard
            label="Lãi/Lỗ tháng này"
            amount={summary.thisMonthProfit}
            tone="auto"
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface p-4 flex items-center justify-center text-sm text-muted">
            Lãi/Lỗ chỉ chủ DN xem
          </div>
        )}
      </div>

      {isOwner && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <StatCard label="Doanh thu năm nay (YTD)" amount={summary.ytdRevenue} />
          <StatCard label="Lãi/Lỗ năm nay (YTD)" amount={summary.ytdProfit} tone="auto" />
        </div>
      )}

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Số bánh bán tháng này</p>
        <p className="mt-1 text-2xl font-semibold tabular">
          {Number(summary.thisMonthCakes).toLocaleString('vi-VN')} bánh
        </p>
      </div>

      {isOwner && (
        <Card title="Lãi/Lỗ 6 tháng gần nhất" className="mt-6">
          <BarChart data={trend} />
        </Card>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/revenue/detail"
          className="rounded-xl border border-border bg-surface p-4 hover:border-accent transition"
        >
          <p className="font-medium">Xem bán hàng chi tiết →</p>
          <p className="text-sm text-muted mt-1">Từng lần bán, mới nhất trước</p>
        </Link>
        <Link
          href="/entry/expense"
          className="rounded-xl border border-border bg-surface p-4 hover:border-accent transition"
        >
          <p className="font-medium">Nhập chi phí →</p>
          <p className="text-sm text-muted mt-1">Ghi lại một khoản chi mới</p>
        </Link>
      </div>

      <p className="mt-8 text-xs text-muted">
        Mẹo: mọi con số ở đây tính trong Postgres, không tính ở giao diện. Bạn có
        thể hỏi Claude Code bất kỳ câu hỏi nào về dữ liệu và nhận đúng con số
        dashboard hiển thị — ví dụ &quot;loại bánh nào bán chạy nhất{' '}
        {formatMonth(summary.currentMonth)}?&quot;.
      </p>
    </div>
  );
}
