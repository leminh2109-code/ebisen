import Link from 'next/link';
import { getMaterialSummary, getMaterialPurchases, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate, formatMonth } from '@/lib/format';
import { deleteMaterialPurchase } from '../entry/actions';
import { MATERIAL_LOW_STOCK, isMaterialLow } from '@/lib/inventory-thresholds';

export const dynamic = 'force-dynamic';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');
const LABEL: Record<string, string> = { tui: 'Túi', tem: 'Tem' };

export default async function MaterialsPage() {
  const [summary, purchases, role] = await Promise.all([
    getMaterialSummary(),
    getMaterialPurchases(),
    getCurrentRole(),
  ]);
  const isOwner = role === 'owner';
  const { tui, tem, thisMonthCost, costByMonth } = summary;

  return (
    <div>
      <PageHeader
        title="Tồn kho vật tư (túi / tem)"
        subtitle="Chi phí phân bổ dần theo số bánh dùng; phần còn lại là tồn kho"
        action={
          <Link
            href="/entry/material"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập túi / tem
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[tui, tem].map((m, i) => {
          const key = i === 0 ? 'tui' : 'tem';
          if (!m) {
            return (
              <div key={key} className="rounded-xl border border-dashed border-border bg-surface p-4">
                <p className="text-sm text-muted">{LABEL[key]}</p>
                <p className="mt-1 text-sm text-muted">Chưa có dữ liệu.</p>
              </div>
            );
          }
          const low = isMaterialLow(m.material, Number(m.on_hand));
          const unit = m.material === 'tui' ? 'túi' : 'tem';
          return (
            <div key={key} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted">{LABEL[m.material]} — còn lại</p>
                <p className="text-xs text-muted">đơn giá {formatCurrency(m.unit_cost)}/{unit}</p>
              </div>
              <p className={`mt-1 text-2xl font-semibold tabular ${low ? 'text-negative' : 'text-positive'}`}>
                {n(m.on_hand)} {unit}
              </p>
              {low && (
                <p className="mt-1 text-xs font-medium text-negative">
                  ⚠ Dưới {n(MATERIAL_LOW_STOCK[m.material])} {unit} — cần nhập thêm
                </p>
              )}
              <p className="mt-1 text-xs text-muted tabular">
                Giá trị tồn: {formatCurrency(m.inventory_value)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted tabular">
                <span>Tổng nhập: {n(m.total_in)}</span>
                <span>Đã dùng: {n(m.used)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Chi phí túi + tem tháng này (lũy tiến vào P&L)</p>
        <p className="mt-1 text-2xl font-semibold tabular">{formatCurrency(thisMonthCost)}</p>
      </div>

      <Card title="Chi phí vật tư theo tháng" className="mt-6">
        {costByMonth.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Tháng</th>
                  <th className="px-4 py-2 font-medium text-right">Chi phí túi</th>
                  <th className="px-4 py-2 font-medium text-right">Chi phí tem</th>
                  <th className="px-4 py-2 font-medium text-right">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {costByMonth.map((c) => (
                  <tr key={c.month} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{formatMonth(c.month)}</td>
                    <td className="px-4 py-2 text-right tabular">{formatCurrency(c.tui_cost)}</td>
                    <td className="px-4 py-2 text-right tabular">{formatCurrency(c.tem_cost)}</td>
                    <td className="px-4 py-2 text-right tabular font-medium">{formatCurrency(c.material_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Lịch sử nhập vật tư" className="mt-6">
        {purchases.length === 0 ? (
          <EmptyState message="Chưa có lần nhập nào. Bấm “+ Nhập túi / tem” để thêm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Loại</th>
                  <th className="px-4 py-2 font-medium text-right">Số lượng</th>
                  <th className="px-4 py-2 font-medium text-right">Tổng chi phí</th>
                  <th className="px-4 py-2 font-medium">Ghi chú</th>
                  {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 tabular">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-2">{LABEL[p.material] ?? p.material}</td>
                    <td className="px-4 py-2 text-right tabular">{n(p.quantity)}</td>
                    <td className="px-4 py-2 text-right tabular">{formatCurrency(p.total_cost)}</td>
                    <td className="px-4 py-2 text-muted">{p.note ?? ''}</td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        <form action={deleteMaterialPurchase}>
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
        Mỗi bánh (bán + tặng) dùng 1 túi + 1 tem. Chi phí mỗi tháng = số bánh × đơn
        giá (túi+tem), cộng vào P&L. Phần chưa dùng giữ nguyên là giá trị tồn kho.
        Tính từ tháng nhập vật tư đầu tiên. Mọi con số tính trong Postgres.
      </p>
    </div>
  );
}
