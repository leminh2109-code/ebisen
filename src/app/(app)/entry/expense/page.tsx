import { getExpenseCategories, getCostCenters } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import ExpenseForm from './expense-form';

export const dynamic = 'force-dynamic';

export default async function ExpenseEntryPage() {
  const [categories, costCenters] = await Promise.all([
    getExpenseCategories(),
    getCostCenters(),
  ]);

  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập chi phí" subtitle="Ghi lại một khoản chi" />
      <Card className="p-6">
        <ExpenseForm categories={categories} costCenters={costCenters} />
      </Card>
    </div>
  );
}
