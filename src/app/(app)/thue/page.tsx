import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/queries';
import { PageHeader } from '@/components/ui';
import ThuePanel from './ThuePanel';

export const dynamic = 'force-dynamic';

export default async function ThuePage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  return (
    <div>
      <PageHeader
        title="Khai thuế"
        subtitle="Hộ kinh doanh · Phương pháp khoán · Ngành sản xuất"
      />
      <ThuePanel />
    </div>
  );
}
