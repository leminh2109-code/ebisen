import Link from 'next/link';
import { getBoxInventory, getBoxPurchases, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { deleteBoxPurchase } from '../entry/actions';

export const dynamic = 'force-dynamic';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');

export default async function BoxesPage() {
  const [inv, purchases, role] = await Promise.all([
    getBoxInventory(),
    getBoxPurchases(),
    getCurrentRole(),
  ]);
  const isOwner = role === 'owner';

  const usedThisMonth = (() => {
    const now = new Date();
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return 0; // placeholder — tính từ hop_out_by_month nếu cần
  })();

  return (
    <div>
      <PageHeader
        title="Tồn kho hộp combo"
        subtitle="Chi phí phân bổ theo số hộp bán ra; phần còn lại là tồn kho"
        action={
          <Link
            href="/entry/box"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập hộp
          </Link>
        }
      />

      {/* Thẻ tồn kho */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Còn lại</p>
          <p className={`mt-1 text-3xl font-semibold tabular ${
            inv && inv.on_hand < 100 ? 'text-negative' : 'text-positive'
          }`}>
            {n(inv?.on_hand ?? 0)} hộp
          </p>
          {inv && inv.on_hand < 100 && (
            <p className="mt-1 text-xs font-medium text-negative">⚠ Dưới 100 hộp — cần nhập thêm</p>
          )}
          <p className="mt-1 text-xs text-muted tabular">
            Giá trị tồn: {formatCurrency((inv?.on_hand ?? 0) * (inv?.unit_cost ?? 0))}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Đã bán</p>
          <p className="mt-1 text-3xl font-semibold tabular">{n(inv?.used ?? 0)} hộp</p>
          <p className="mt-1 text-xs text-muted tabular">
            Tổng nhập: {n(inv?.total_in ?? 0)} hộp
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Đơn giá bình quân</p>
          <p className="mt-1 text-3xl font-semibold tabular">
            {formatCurrency(inv?.unit_cost ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted tabular">
            Tổng đã nhập: {formatCurrency(inv?.total_cost_in ?? 0)}
          </p>
        </div>
      </div>

      {/* Lịch sử nhập */}
      <Card title="Lịch sử nhập hộp" className="mt-6">
        {purchases.length === 0 ? (
          <EmptyState message='Chưa có lần nhập nào. Bấm "+ Nhập hộp" để thêm.' />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium text-right">Số hộp</th>
                  <th className="px-4 py-2 font-medium text-right">Tổng chi phí</th>
                  <th className="px-4 py-2 font-medium text-right">Đơn giá</th>
                  <th className="px-4 py-2 font-medium">Ghi chú</th>
                  {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 tabular">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-2 text-right tabular">{n(p.quantity)}</td>
                    <td className="px-4 py-2 text-right tabular">{formatCurrency(p.total_cost)}</td>
                    <td className="px-4 py-2 text-right tabular text-muted">
                      {formatCurrency(p.total_cost / p.quantity)}/hộp
                    </td>
                    <td className="px-4 py-2 text-muted">{p.note ?? ''}</td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        <form action={deleteBoxPurchase}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="text-negative hover:underline text-xs">
                            Xóa
                          </button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-4 text-xs text-muted">
        Mỗi "Hộp 3 bánh" bán ra trừ 1 hộp. Chi phí tháng = số hộp bán × đơn giá bình quân,
        tự động cộng vào P&L. Phần chưa bán giữ nguyên là giá trị tồn kho.
      </p>
    </div>
  );
}
