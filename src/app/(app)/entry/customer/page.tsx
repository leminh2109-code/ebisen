import Link from 'next/link';
import { getActiveMenu } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import CustomerForm from './customer-form';

export const dynamic = 'force-dynamic';

export default async function CustomerEntryPage() {
  const menu = await getActiveMenu();

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Nhập khách hàng"
        subtitle="Lưu SĐT, địa chỉ + lần mua để chăm sóc sau này"
        action={
          <Link href="/customers" className="text-sm text-accent hover:underline">
            Xem danh sách →
          </Link>
        }
      />
      <Card className="p-6">
        <CustomerForm menu={menu} />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Dữ liệu khách hàng chỉ dùng để phân tích & chăm sóc — KHÔNG tính vào doanh
        thu hay tồn kho.
      </p>
    </div>
  );
}
