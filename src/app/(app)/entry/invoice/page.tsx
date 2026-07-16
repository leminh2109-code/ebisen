import { PageHeader, Card } from '@/components/ui';
import InvoiceForm from './invoice-form';

export const dynamic = 'force-dynamic';

export default function InvoiceEntryPage() {
  return (
    <div className="max-w-lg">
      <PageHeader
        title="Nhập hóa đơn"
        subtitle="Ghi lại một hóa đơn bán ra"
      />
      <Card className="p-6">
        <InvoiceForm />
      </Card>
    </div>
  );
}
