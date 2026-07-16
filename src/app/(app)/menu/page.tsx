import { redirect } from 'next/navigation';
import { getMenu, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { AddMenuItem, MenuRow } from './menu-manager';

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const menu = await getMenu();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Thực đơn"
        subtitle="Giá món hiện tại. Đổi giá ở đây KHÔNG ảnh hưởng doanh thu đã ghi trước đó."
      />

      <Card title="Thêm món mới" className="mb-6">
        <div className="p-4">
          <AddMenuItem />
        </div>
      </Card>

      <Card title="Danh sách món">
        {menu.length === 0 ? (
          <EmptyState message="Chưa có món nào." />
        ) : (
          <div>
            {menu.map((item) => (
              <MenuRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        Mỗi lần bán lưu lại giá tại thời điểm đó (snapshot). Khi bạn tăng/giảm giá
        một món, chỉ các lần bán MỚI dùng giá mới; số liệu lịch sử giữ nguyên.
      </p>
    </div>
  );
}
