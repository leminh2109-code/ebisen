import { getCakeTypes } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import SaleForm from './sale-form';

export const dynamic = 'force-dynamic';

export default async function SaleEntryPage() {
  const cakeTypes = await getCakeTypes();
  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập bán hàng" subtitle="Ghi lại một lần bán" />
      <Card className="p-6">
        <SaleForm cakeTypes={cakeTypes} />
      </Card>
    </div>
  );
}
