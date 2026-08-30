import { PageHeader, Card } from '@/components/ui';
import BoxForm from './box-form';

export const dynamic = 'force-dynamic';

export default function BoxEntryPage() {
  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập hộp" subtitle="Ghi lại một lô hộp combo nhập vào kho" />
      <Card className="p-6">
        <BoxForm />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Chi phí hộp phân bổ tự động theo số hộp bán ra mỗi tháng (đơn giá bình quân gia quyền).
        Phần chưa dùng được tính là tồn kho.
      </p>
    </div>
  );
}
