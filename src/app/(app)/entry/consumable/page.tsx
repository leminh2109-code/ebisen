import { PageHeader } from '@/components/ui';
import ConsumableForm from './consumable-form';

export default function ConsumableEntryPage() {
  return (
    <div>
      <PageHeader
        title="Nhập dầu ăn / túi bóng kính / túi trắng"
        subtitle="Ghi lần nhập dầu ăn (lít), túi bóng kính (kg) hoặc túi trắng (kg)"
      />
      <ConsumableForm />
    </div>
  );
}
