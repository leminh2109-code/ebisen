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
        Nhập thẳng số con tôm mỗi lần nhập kho (ô kg chỉ để tham khảo). Tồn kho =
        tổng con nhập − tổng con đã dùng (số lượng bánh bán × số con mỗi bánh).
      </p>
    </div>
  );
}
