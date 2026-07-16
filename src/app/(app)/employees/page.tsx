import { redirect } from 'next/navigation';
import { getEmployees, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { AddEmployee, EmployeeRow } from './employee-manager';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const role = await getCurrentRole();
  if (role !== 'owner') redirect('/dashboard');

  const employees = await getEmployees();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nhân viên"
        subtitle="Danh sách nhân viên để chọn khi nhập bán hàng."
      />

      <Card title="Thêm nhân viên" className="mb-6">
        <div className="p-4">
          <AddEmployee />
        </div>
      </Card>

      <Card title="Danh sách nhân viên">
        {employees.length === 0 ? (
          <EmptyState message="Chưa có nhân viên nào." />
        ) : (
          <div>
            {employees.map((item) => (
              <EmployeeRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        Mỗi lần bán lưu lại tên nhân viên tại thời điểm đó (snapshot). Tắt &quot;Đang
        làm&quot; để ẩn nhân viên khỏi form nhập mà vẫn giữ nguyên số liệu lịch sử.
      </p>
    </div>
  );
}
