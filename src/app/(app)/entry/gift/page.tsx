import { getActiveMenu, getCustomerOptions } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import GiftForm from './gift-form';

export const dynamic = 'force-dynamic';

export default async function GiftEntryPage() {
  const [menu, customers] = await Promise.all([getActiveMenu(), getCustomerOptions()]);

  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập bánh tặng" subtitle="Ghi lại số bánh mang đi biếu tặng (không bán)" />
      <Card className="p-6">
        <GiftForm menu={menu} customers={customers} />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Bánh tặng cũng tốn tôm (số con mỗi bánh theo Thực đơn) và được trừ vào tồn
        kho — nên tồn kho khớp với số tôm thực tế. Không tính vào doanh thu.
      </p>
    </div>
  );
}
