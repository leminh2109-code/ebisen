import { getPublicSalesView, type SaleRow } from '@/lib/queries';
import { formatCurrency, today } from '@/lib/format';
import { SalesDetailTable } from '@/app/(app)/revenue/detail/sales-detail-table';
import { groupByMonthDay } from '@/app/(app)/revenue/detail/group';

export const dynamic = 'force-dynamic';

export default async function PublicSalesViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicSalesView(token);

  if (!data.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-negative/10 text-negative text-xl">
            ✕
          </div>
          <h1 className="text-lg font-semibold">Link không hợp lệ</h1>
          <p className="mt-2 text-sm text-muted">
            Link xem bán hàng đã hết hiệu lực hoặc sai. Vui lòng liên hệ chủ tiệm
            để lấy link mới.
          </p>
        </div>
      </div>
    );
  }

  // RPC trả cột gọn — bù staff/note (bảng chi tiết không hiển thị) cho khớp kiểu.
  const sales: SaleRow[] = data.sales.map((s) => ({
    ...s,
    staff: null,
    note: null,
  }));
  const total = sales.reduce((s, i) => s + Number(i.amount), 0);
  const qty = sales.reduce((s, i) => s + Number(i.quantity), 0);
  const months = groupByMonthDay(sales);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-5 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg font-bold">
            e
          </span>
          <div>
            <h1 className="font-semibold leading-tight">Bán hàng chi tiết</h1>
            <p className="text-xs text-muted tabular">
              {sales.length} lần bán · {qty} bánh · {formatCurrency(total)}
            </p>
          </div>
        </header>

        {sales.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
            Chưa có lần bán nào.
          </div>
        ) : (
          <SalesDetailTable months={months} todayKey={today()} />
        )}

        <p className="mt-4 text-center text-xs text-muted">
          Bảng chỉ để xem và đối chiếu — không sửa được.
        </p>
      </div>
    </div>
  );
}
