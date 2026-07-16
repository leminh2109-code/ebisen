import { getActiveMenu } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import SaleForm from './sale-form';

export const dynamic = 'force-dynamic';

export default async function SaleEntryPage() {
  const menu = await getActiveMenu();
  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập bán hàng" subtitle="Ghi lại một lần bán" />
      <Card className="p-6">
        <SaleForm menu={menu} />
      </Card>
    </div>
  );
}
