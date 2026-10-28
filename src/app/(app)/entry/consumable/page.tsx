import { PageHeader } from '@/components/ui';
import ConsumableForm from './consumable-form';

export default function ConsumableEntryPage() {
  return (
    <div>
      <PageHeader
        title="Nhập dầu ăn / túi bóng kính"
        subtitle="Ghi lần nhập dầu ăn (lít) hoặc túi bóng kính (kg)"
      />
      <ConsumableForm />
    </div>
  );
}
