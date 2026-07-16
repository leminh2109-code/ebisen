import Link from 'next/link';
import { getSales } from '@/lib/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function SalesDetailPage() {
  const sales = await getSales(300);
  const total = sales.reduce((s, i) => s + Number(i.amount), 0);
  const qty = sales.reduce((s, i) => s + Number(i.quantity), 0);

  return (
    <div>
      <PageHeader
        title="Bán hàng chi tiết"
        subtitle={`${sales.length} lần bán · ${qty} bánh · ${formatCurrency(total)}`}
        action={
          <Link
            href="/entry/sale"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập bán hàng
          </Link>
        }
      />

      <Card>
        {sales.length === 0 ? (
          <EmptyState message="Chưa có lần bán nào." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Loại bánh</th>
                  <th className="px-4 py-2 font-medium text-right">SL</th>
                  <th className="px-4 py-2 font-medium text-right">Đơn giá</th>
                  <th className="px-4 py-2 font-medium">Nguồn</th>
                  <th className="px-4 py-2 font-medium text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-background"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDate(s.sale_date)}
                    </td>
                    <td className="px-4 py-2.5">{s.cake_type ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular">{s.quantity}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {formatCurrency(s.unit_price)}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{s.source ?? ''}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium whitespace-nowrap">
                      {formatCurrency(s.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
