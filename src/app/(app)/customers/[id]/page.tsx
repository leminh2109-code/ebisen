import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomer, getCustomerOrders, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { deleteCustomerOrder } from '../actions';

export const dynamic = 'force-dynamic';

const n = (v: number) => Number(v).toLocaleString('vi-VN');

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, orders, role] = await Promise.all([
    getCustomer(id),
    getCustomerOrders(id),
    getCurrentRole(),
  ]);
  if (!customer) notFound();
  const isOwner = role === 'owner';

  return (
    <div>
      <PageHeader
        title={customer.name || customer.phone}
        subtitle={customer.name ? customer.phone : undefined}
        action={
          <Link href="/customers" className="text-sm text-accent hover:underline">
            ← Danh sách khách
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <NumberCard label="Số lượt mua" value={n(customer.order_count)} />
        <NumberCard label="Tổng bánh" value={`${n(customer.total_qty)} bánh`} />
        <NumberCard label="Hay mua" value={customer.top_cake ?? '—'} />
        <NumberCard
          label="Mua gần nhất"
          value={customer.last_order ? formatDate(customer.last_order) : '—'}
        />
      </div>

      <Card title="Thông tin liên hệ" className="mb-6">
        <dl className="divide-y divide-border text-sm">
          <Row label="Số điện thoại" value={customer.phone} />
          <Row label="Tên" value={customer.name ?? '—'} />
          <Row label="Địa chỉ" value={customer.address ?? '—'} />
          <Row label="Ghi chú" value={customer.note ?? '—'} />
          <Row
            label="Mua lần đầu"
            value={customer.first_order ? formatDate(customer.first_order) : '—'}
          />
        </dl>
      </Card>

      <Card title="Lịch sử mua">
        {orders.length === 0 ? (
          <EmptyState message="Chưa có lần mua nào." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Loại bánh</th>
                  <th className="px-4 py-2 font-medium text-right">Số lượng</th>
                  <th className="px-4 py-2 font-medium">Ghi chú</th>
                  {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 tabular">{formatDate(o.order_date)}</td>
                    <td className="px-4 py-2">{o.cake_type ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular font-medium">{n(o.quantity)}</td>
                    <td className="px-4 py-2 text-muted">{o.note ?? ''}</td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        <form action={deleteCustomerOrder}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="customer_id" value={customer.id} />
                          <button type="submit" className="text-negative hover:underline text-xs">
                            Xóa
                          </button>
                        </form>
                      </td>
                    )}
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

function NumberCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 px-4 py-2.5">
      <dt className="w-32 shrink-0 text-muted">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}
