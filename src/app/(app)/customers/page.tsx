import Link from 'next/link';
import { getCustomers, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { CustomerTable } from './customer-table';

export const dynamic = 'force-dynamic';

const n = (v: number) => Number(v).toLocaleString('vi-VN');

export default async function CustomersPage() {
  const [customers, role] = await Promise.all([getCustomers(), getCurrentRole()]);
  const isOwner = role === 'owner';

  const totalOrders = customers.reduce((s, c) => s + Number(c.order_count), 0);
  const totalQty = customers.reduce((s, c) => s + Number(c.total_qty), 0);

  return (
    <div>
      <PageHeader
        title="Khách hàng"
        subtitle="Danh bạ khách + lịch sử mua để chăm sóc"
        action={
          <Link
            href="/entry/customer"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập khách hàng
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <NumberCard label="Tổng số khách" value={`${n(customers.length)}`} />
        <NumberCard label="Tổng lượt mua" value={`${n(totalOrders)}`} />
        <NumberCard label="Tổng bánh đã ghi" value={`${n(totalQty)} bánh`} />
      </div>

      <Card title="Danh sách khách">
        {customers.length === 0 ? (
          <EmptyState message="Chưa có khách nào. Bấm “+ Nhập khách hàng” để thêm." />
        ) : (
          <CustomerTable customers={customers} isOwner={isOwner} />
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        Bấm SĐT để xem chi tiết & lịch sử mua của khách. VIP = 5 khách mua nhiều
        nhất (theo tổng bánh). Dữ liệu này chỉ để chăm sóc/phân tích, KHÔNG tính
        vào doanh thu hay tồn kho.
      </p>
    </div>
  );
}

function NumberCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular">{value}</p>
    </div>
  );
}
