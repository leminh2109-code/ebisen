import { getActiveMenu, getActiveEmployees } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import SaleForm from './sale-form';

export const dynamic = 'force-dynamic';

export default async function SaleEntryPage() {
  const [menu, employees] = await Promise.all([
    getActiveMenu(),
    getActiveEmployees(),
  ]);
  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập bán hàng" subtitle="Ghi lại một lần bán" />
      <Card className="p-6">
        <SaleForm menu={menu} employees={employees} />
      </Card>
    </div>
  );
}
