import { getPublicFormData, type MenuItem, type Employee } from '@/lib/queries';
import SaleForm from '@/app/(app)/entry/sale/sale-form';
import { submitPublicSale } from '../actions';

export const dynamic = 'force-dynamic';

export default async function PublicSalePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getPublicFormData(token);

  if (!data.valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-negative/10 text-negative text-xl">
            ✕
          </div>
          <h1 className="text-lg font-semibold">Link không hợp lệ</h1>
          <p className="mt-2 text-sm text-muted">
            Link nhập bán hàng đã hết hiệu lực hoặc sai. Vui lòng liên hệ chủ tiệm
            để lấy link mới.
          </p>
        </div>
      </div>
    );
  }

  // Bootstrap trả về dạng gọn — bù các field còn lại để khớp kiểu form.
  const menu: MenuItem[] = data.menu.map((m) => ({
    ...m,
    active: true,
    sort_order: 0,
  }));
  const employees: Employee[] = data.employees.map((e) => ({
    ...e,
    phone: null,
    active: true,
    sort_order: 0,
  }));

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg">
        <header className="mb-5 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-fg font-bold">
            e
          </span>
          <div>
            <h1 className="font-semibold leading-tight">Nhập bán hàng</h1>
            <p className="text-xs text-muted">Ghi lại một lần bán</p>
          </div>
        </header>

        <div className="rounded-xl border border-border bg-surface p-5">
          <SaleForm
            menu={menu}
            employees={employees}
            action={submitPublicSale}
            token={token}
          />
        </div>

        <p className="mt-4 text-center text-xs text-muted">
          Sau khi lưu, form tự làm mới để nhập tiếp lần bán tiếp theo.
        </p>
      </div>
    </div>
  );
}
