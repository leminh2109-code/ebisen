import { PageHeader, Card } from '@/components/ui';
import ShrimpForm from './shrimp-form';

export const dynamic = 'force-dynamic';

export default function ShrimpEntryPage() {
  return (
    <div className="max-w-lg">
      <PageHeader title="Nhập tôm" subtitle="Ghi lại một lần nhập tôm vào kho" />
      <Card className="p-6">
        <ShrimpForm />
      </Card>
      <p className="mt-4 text-xs text-muted">
        Số con tôm nhập = số kg × size (con/kg). Tồn kho = tổng nhập − tổng tôm đã
        dùng (tính từ số lượng bánh bán × số con mỗi bánh).
      </p>
    </div>
  );
}
