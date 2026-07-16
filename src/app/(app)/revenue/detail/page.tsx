import Link from 'next/link';
import { getInvoices } from '@/lib/queries';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, Card, EmptyState } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function RevenueDetailPage() {
  const invoices = await getInvoices(200);
  const total = invoices.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div>
      <PageHeader
        title="Doanh thu chi tiết"
        subtitle={`${invoices.length} hóa đơn · ${formatCurrency(total)}`}
        action={
          <Link
            href="/entry/invoice"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập hóa đơn
          </Link>
        }
      />

      <Card>
        {invoices.length === 0 ? (
          <EmptyState message="Chưa có hóa đơn nào." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Số HĐ</th>
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Khách hàng</th>
                  <th className="px-4 py-2 font-medium">Ghi chú</th>
                  <th className="px-4 py-2 font-medium text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-background"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="px-4 py-2.5">{inv.customer?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted max-w-[200px] truncate">
                      {inv.note ?? ''}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium whitespace-nowrap">
                      {formatCurrency(inv.amount)}
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
