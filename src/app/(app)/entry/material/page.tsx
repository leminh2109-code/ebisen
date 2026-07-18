import Link from 'next/link';
import { PageHeader, Card } from '@/components/ui';
import MaterialForm from './material-form';

export const dynamic = 'force-dynamic';

export default function MaterialEntryPage() {
  return (
    <div className="max-w-lg">
      <PageHeader
        title="Nhập túi / tem"
        subtitle="Ghi lần nhập vật tư đóng gói (số lượng + tổng chi phí)"
        action={
          <Link href="/materials" className="text-sm text-accent hover:underline">
            Xem tồn kho →
          </Link>
        }
      />
      <Card className="p-6">
        <MaterialForm />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Đơn giá = tổng chi phí ÷ số lượng. Mỗi bánh (bán + tặng) dùng 1 túi + 1 tem.
        Chi phí phân bổ dần vào từng tháng theo số bánh dùng; phần chưa dùng là tồn kho.
      </p>
    </div>
  );
}
