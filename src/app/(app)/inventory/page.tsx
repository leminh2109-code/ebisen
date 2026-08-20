import Link from 'next/link';
import {
  getShrimpSummary,
  getShrimpPurchases,
  getShrimpGifts,
  getShrimpGiftByMonth,
  getShrimpPurchasedByMonth,
  getCurrentRole,
} from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/format';
import { deleteShrimpGift } from '../entry/actions';
import { SHRIMP_LOW_STOCK, isShrimpLow } from '@/lib/inventory-thresholds';
import ShrimpPurchaseTable from './ShrimpPurchaseTable';

export const dynamic = 'force-dynamic';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');

function fmtMonth(m: string) {
  const d = new Date(m);
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export default async function InventoryPage() {
  const [summary, purchases, gifts, giftByMonth, purchasedByMonth, role] = await Promise.all([
    getShrimpSummary(),
    getShrimpPurchases(),
    getShrimpGifts(),
    getShrimpGiftByMonth(),
    getShrimpPurchasedByMonth(),
    getCurrentRole(),
  ]);
  const { inventory, thisMonthIn, thisMonthUsed, thisMonthSold, thisMonthGift, currentMonth } = summary;
  const thisMonthGiftQty = giftByMonth.find((g) => g.month === currentMonth)?.gift_qty ?? 0;
  const isOwner = role === 'owner';
  const low = isShrimpLow(inventory.on_hand);

  return (
    <div>
      <PageHeader
        title="Tồn kho tôm"
        subtitle="Theo dõi số con tôm nhập vào và đã dùng (bán + tặng)"
        action={
          <div className="flex gap-2">
            <Link
              href="/entry/gift"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent"
            >
              + Bánh tặng
            </Link>
            <Link
              href="/entry/shrimp"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              + Nhập tôm
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NumberCard
          label="Tồn kho hiện tại"
          value={`${n(inventory.on_hand)} con`}
          tone={low ? 'negative' : 'positive'}
          alert={low ? `⚠ Dưới ${n(SHRIMP_LOW_STOCK)} con — cần nhập thêm tôm` : undefined}
        />
        <NumberCard label="Đã nhập tháng này" value={`${n(thisMonthIn)} con`} />
        <NumberCard
          label="Đã dùng tháng này"
          value={`${n(thisMonthUsed)} con`}
          sub={`bán ${n(thisMonthSold)} · tặng ${n(thisMonthGift)}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <NumberCard
          label="Bánh tặng tháng này"
          value={`${n(thisMonthGiftQty)} bánh`}
          sub={`tiêu tốn ${n(thisMonthGift)} con tôm`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <NumberCard
          label="Giá trị tồn kho tôm"
          value={formatCurrency(inventory.inventory_value)}
          sub={`đơn giá ${formatCurrency(inventory.unit_cost)}/con${
            Number(inventory.total_kg) > 0
              ? ` · ${formatCurrency(Number(inventory.total_cost_in) / Number(inventory.total_kg))}/kg`
              : ''
          }`}
        />
        <NumberCard label="Tổng đã nhập" value={`${n(inventory.total_in)} con`} sub={formatCurrency(inventory.total_cost_in)} />
        <NumberCard
          label="Bắt đầu theo dõi"
          value={inventory.start_date ? formatDate(inventory.start_date) : '—'}
          sub={`Tổng đã dùng: ${n(inventory.total_used)} con`}
        />
      </div>

      <Card title="Lịch sử nhập tôm" className="mt-6">
        {purchases.length === 0 ? (
          <EmptyState message={'Chưa có lần nhập tôm nào. Bấm "+ Nhập tôm" để thêm.'} />
        ) : (
          <ShrimpPurchaseTable purchases={purchases} isOwner={isOwner} />
        )}
      </Card>

      <Card title="Tôm nhập theo tháng" className="mt-6">
        {purchasedByMonth.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu nhập tôm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Tháng</th>
                  <th className="px-4 py-2 font-medium text-right">Số lần nhập</th>
                  <th className="px-4 py-2 font-medium text-right">Số con</th>
                  <th className="px-4 py-2 font-medium text-right">Số kg</th>
                </tr>
              </thead>
              <tbody>
                {[...purchasedByMonth].reverse().map((p) => (
                  <tr key={p.month} className={`border-b border-border last:border-0 ${p.month === currentMonth ? 'bg-accent/5 font-semibold' : ''}`}>
                    <td className="px-4 py-2 tabular">
                      {fmtMonth(p.month)}
                      {p.month === currentMonth && <span className="ml-2 text-xs font-normal text-accent">(tháng này)</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular text-muted">{n(p.purchase_count)} lần</td>
                    <td className="px-4 py-2 text-right tabular font-medium">{n(p.shrimp_in)} con</td>
                    <td className="px-4 py-2 text-right tabular text-muted">{n(p.kg)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Bánh tặng theo tháng" className="mt-6">
        {giftByMonth.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu bánh tặng." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Tháng</th>
                  <th className="px-4 py-2 font-medium text-right">Số bánh</th>
                  <th className="px-4 py-2 font-medium text-right">Tôm tiêu tốn</th>
                </tr>
              </thead>
              <tbody>
                {[...giftByMonth].reverse().map((g) => (
                  <tr key={g.month} className={`border-b border-border last:border-0 ${g.month === currentMonth ? 'bg-accent/5 font-semibold' : ''}`}>
                    <td className="px-4 py-2 tabular">
                      {fmtMonth(g.month)}
                      {g.month === currentMonth && <span className="ml-2 text-xs font-normal text-accent">(tháng này)</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabular">{n(g.gift_qty)} bánh</td>
                    <td className="px-4 py-2 text-right tabular text-muted">{n(g.gift_shrimp)} con</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Lịch sử bánh tặng" className="mt-6">
        {gifts.length === 0 ? (
          <EmptyState message={'Chưa có bánh tặng nào. Bấm "+ Bánh tặng" để thêm.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Loại bánh</th>
                  <th className="px-4 py-2 font-medium text-right">Số bánh</th>
                  <th className="px-4 py-2 font-medium">Khách nhận</th>
                  <th className="px-4 py-2 font-medium">Ghi chú</th>
                  {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody>
                {gifts.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 tabular">{formatDate(g.gift_date)}</td>
                    <td className="px-4 py-2">{g.cake_type ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular font-medium">{n(g.quantity)}</td>
                    <td className="px-4 py-2">
                      {g.customer_id ? (
                        <Link href={`/customers/${g.customer_id}`} className="text-accent hover:underline">
                          {g.customer_name ?? g.customer_phone}
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted">{g.note ?? ''}</td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        <form action={deleteShrimpGift}>
                          <input type="hidden" name="id" value={g.id} />
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
        Tồn kho = tổng con tôm đã nhập − tổng con tôm đã dùng. Tôm đã dùng gồm cả
        bánh BÁN và bánh TẶNG (số lượng × số con mỗi bánh, cấu hình ở trang Thực đơn),
        tính từ ngày nhập đầu tiên. Giá trị tồn = tồn × đơn giá (bình quân), chỉ để
        tham khảo — KHÔNG cộng vào P&L (tiền mua tôm đã ghi ở mục Chi phí). Mọi con
        số tính trong Postgres.
      </p>
    </div>
  );
}

function NumberCard({
  label,
  value,
  sub,
  alert,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  /** Dòng cảnh báo đỏ (vd tồn kho thấp). */
  alert?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const color =
    tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular ${color}`}>{value}</p>
      {alert && <p className="mt-1 text-xs font-medium text-negative">{alert}</p>}
      {sub && <p className="mt-1 text-xs text-muted tabular">{sub}</p>}
    </div>
  );
}
