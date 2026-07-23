import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold">Tài liệu — đang xây dựng</h1>
      <p className="mt-2 text-sm text-muted">Route hoạt động.</p>
    </div>
  );
}
