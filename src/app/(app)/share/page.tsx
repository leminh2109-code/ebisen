import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  getCurrentRole,
  getPublicFormToken,
  getPublicViewToken,
} from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import { SharePanel } from './share-panel';
import {
  regenerateLink,
  setSlug,
  regenerateViewLink,
  setViewSlug,
} from './actions';

export const dynamic = 'force-dynamic';

export default async function SharePage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const [formToken, viewToken, h] = await Promise.all([
    getPublicFormToken(),
    getPublicViewToken(),
    headers(),
  ]);
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const baseUrl = host ? `${proto}://${host}` : '';

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Link nhập liệu"
        subtitle="Link công khai để nhân viên nhập bán hàng hoặc xem báo cáo trên điện thoại — không cần đăng nhập."
      />

      <Card title="Link nhập bán hàng" className="mb-6">
        <div className="p-4">
          <SharePanel
            initialToken={formToken}
            baseUrl={baseUrl}
            basePath="/nhap"
            regenerateAction={regenerateLink}
            setSlugAction={setSlug}
            texts={{
              linkLabel: 'Link nhập bán hàng',
              help: 'Gửi link này cho nhân viên. Ai có link đều nhập được bán hàng (không cần đăng nhập), nhưng không xem được báo cáo hay P&L.',
              slugPlaceholder: 'ebisen',
            }}
          />
        </div>
      </Card>

      <Card title="Link xem bán hàng chi tiết">
        <div className="p-4">
          <SharePanel
            initialToken={viewToken}
            baseUrl={baseUrl}
            basePath="/xem"
            regenerateAction={regenerateViewLink}
            setSlugAction={setViewSlug}
            texts={{
              linkLabel: 'Link xem bán hàng chi tiết',
              help: 'Gửi link này để nhân viên XEM và đối chiếu bảng bán hàng chi tiết (không cần đăng nhập). Chỉ đọc — không sửa được, không xem chi phí hay P&L.',
              slugPlaceholder: 'ebisen-xem',
            }}
          />
        </div>
      </Card>

      <p className="mt-4 text-xs text-muted">
        Cả hai link đều gated bằng chuỗi bí mật trong đường dẫn. Lỡ gửi nhầm hoặc
        nhân viên nghỉ, bấm &quot;tạo link ngẫu nhiên&quot; để vô hiệu link cũ và
        gửi link mới.
      </p>
    </div>
  );
}
