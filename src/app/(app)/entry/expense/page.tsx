import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card } from '@/components/ui';
import ExpenseForm from './expense-form';

export const dynamic = 'force-dynamic';

export default async function ExpenseEntryPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name')
    .order('name');

  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập chi phí" subtitle="Ghi lại một khoản chi" />
      <Card className="p-6">
        <ExpenseForm categories={categories ?? []} />
      </Card>
    </div>
  );
}
