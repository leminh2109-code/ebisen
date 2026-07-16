import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentRole, getPublicFormToken } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import { SharePanel } from './share-panel';

export const dynamic = 'force-dynamic';

export default async function SharePage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const [token, h] = await Promise.all([getPublicFormToken(), headers()]);
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const baseUrl = host ? `${proto}://${host}` : '';

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Link nhập liệu"
        subtitle="Link công khai để nhân viên nhập bán hàng trên điện thoại — không cần đăng nhập."
      />

      <Card title="Link hiện tại">
        <div className="p-4">
          <SharePanel initialToken={token} baseUrl={baseUrl} />
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted">
        Link chỉ cho phép NHẬP bán hàng, không xem được doanh thu, chi phí hay P&amp;L.
        Nếu lỡ gửi nhầm hoặc nhân viên nghỉ, bấm &quot;Tạo lại link&quot; để vô hiệu
        link cũ và gửi link mới.
      </p>
    </div>
  );
}
