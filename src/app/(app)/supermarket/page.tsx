import { getSupermarketBatches, getSupermarketByMonth, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card } from '@/components/ui';
import { formatDate, today } from '@/lib/format';
import { createBatch, updateSold, deleteBatch } from './actions';
import SupermarketForm from './supermarket-form';

export const dynamic = 'force-dynamic';

const n = (v: number) => Number(v).toLocaleString('vi-VN');

export default async function SupermarketPage() {
  const [batches, monthly, role] = await Promise.all([
    getSupermarketBatches(),
    getSupermarketByMonth(),
    getCurrentRole(),
  ]);
  const isOwner = role === 'owner';

  // Nhóm batches theo tháng
  const batchesByMonth = new Map<string, typeof batches>();
  for (const b of batches) {
    const month = b.batch_date.slice(0, 7);
    if (!batchesByMonth.has(month)) batchesByMonth.set(month, []);
    batchesByMonth.get(month)!.push(b);
  }

  return (
    <div>
      <PageHeader
        title="Siêu thị"
        subtitle="Theo dõi hộp xuất cho siêu thị — giao / bán / tồn"
      />

      {/* Tổng quan tháng */}
      {monthly.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {monthly.slice(0, 1).map((m) => {
            const label = new Date(m.month + 'T00:00:00').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
            return (
              <>
                <div key="in" className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm text-muted">Đã giao ({label})</p>
                  <p className="mt-1 text-2xl font-semibold tabular">{n(m.total_in)} hộp</p>
                </div>
                <div key="sold" className="rounded-xl border border-border bg-surface p-4">
                  <p className="text-sm text-muted">Đã bán ({label})</p>
                  <p className="mt-1 text-2xl font-semibold tabular">{n(m.total_sold)} hộp</p>
                </div>
                <div key="rem" className={`rounded-xl border p-4 ${m.total_remaining > 0 ? 'border-amber-200 bg-amber-50' : 'border-border bg-surface'}`}>
                  <p className="text-sm text-muted">Còn tồn ({label})</p>
                  <p className={`mt-1 text-2xl font-semibold tabular ${m.total_remaining > 0 ? 'text-amber-700' : ''}`}>{n(m.total_remaining)} hộp</p>
                </div>
              </>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form nhập */}
        <div>
          <Card title="Giao hàng mới">
            <SupermarketForm action={createBatch} todayDate={today()} />
          </Card>
        </div>

        {/* Lịch sử + cập nhật đã bán */}
        <div className="lg:col-span-2 space-y-4">
          {monthly.map((m) => {
            const monthKey = m.month.slice(0, 7);
            const mBatches = batchesByMonth.get(monthKey) ?? [];
            const label = new Date(m.month + 'T00:00:00').toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
            return (
              <Card
                key={m.month}
                title={`${label} — giao ${n(m.total_in)} · bán ${n(m.total_sold)} · tồn ${n(m.total_remaining)} hộp`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="px-4 py-2 font-medium">Ngày giao</th>
                        <th className="px-4 py-2 font-medium text-right">Giao (hộp)</th>
                        <th className="px-4 py-2 font-medium text-right">Đã bán</th>
                        <th className="px-4 py-2 font-medium">Ghi chú</th>
                        {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {mBatches.map((b) => (
                        <tr key={b.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 tabular">{formatDate(b.batch_date)}</td>
                          <td className="px-4 py-2 text-right tabular font-medium">{n(b.quantity_in)}</td>
                          <td className="px-4 py-2 text-right">
                            <form action={updateSold} className="flex items-center justify-end gap-1">
                              <input type="hidden" name="id" value={b.id} />
                              <input
                                name="quantity_sold"
                                type="number"
                                min="0"
                                defaultValue={b.quantity_sold ?? ''}
                                placeholder="—"
                                className="w-16 rounded border border-border bg-background px-2 py-1 text-right text-sm tabular outline-none focus:border-accent"
                              />
                              <button type="submit" className="rounded bg-accent px-2 py-1 text-xs text-accent-fg hover:opacity-90">
                                Lưu
                              </button>
                            </form>
                          </td>
                          <td className="px-4 py-2 text-muted text-xs">{b.note ?? ''}</td>
                          {isOwner && (
                            <td className="px-4 py-2 text-right">
                              <form action={deleteBatch}>
                                <input type="hidden" name="id" value={b.id} />
                                <button type="submit" className="text-negative hover:underline text-xs">Xóa</button>
                              </form>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
          {monthly.length === 0 && (
            <Card title="Lịch sử">
              <p className="px-4 py-6 text-sm text-muted text-center">Chưa có lần giao hàng nào.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
