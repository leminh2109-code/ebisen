import Link from 'next/link';
import {
  getShrimpSummary,
  getShrimpPurchases,
  getShrimpGifts,
  getCurrentRole,
} from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { deleteShrimpPurchase, deleteShrimpGift } from '../entry/actions';

export const dynamic = 'force-dynamic';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');

export default async function InventoryPage() {
  const [summary, purchases, gifts, role] = await Promise.all([
    getShrimpSummary(),
    getShrimpPurchases(),
    getShrimpGifts(),
    getCurrentRole(),
  ]);
  const { inventory, thisMonthIn, thisMonthUsed, thisMonthSold, thisMonthGift } = summary;
  const isOwner = role === 'owner';
  const low = inventory.on_hand <= 0;

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
        />
        <NumberCard label="Đã nhập tháng này" value={`${n(thisMonthIn)} con`} />
        <NumberCard
          label="Đã dùng tháng này"
          value={`${n(thisMonthUsed)} con`}
          sub={`bán ${n(thisMonthSold)} · tặng ${n(thisMonthGift)}`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <NumberCard label="Tổng đã nhập" value={`${n(inventory.total_in)} con`} />
        <NumberCard label="Tổng đã dùng" value={`${n(inventory.total_used)} con`} />
        <NumberCard
          label="Bắt đầu theo dõi"
          value={inventory.start_date ? formatDate(inventory.start_date) : '—'}
        />
      </div>

      <Card title="Lịch sử nhập tôm" className="mt-6">
        {purchases.length === 0 ? (
          <EmptyState message="Chưa có lần nhập tôm nào. Bấm “+ Nhập tôm” để thêm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium text-right">Số con</th>
                  <th className="px-4 py-2 font-medium text-right">Số kg</th>
                  <th className="px-4 py-2 font-medium">Ghi chú</th>
                  {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 tabular">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-2 text-right tabular font-medium">{n(p.shrimp_count)}</td>
                    <td className="px-4 py-2 text-right tabular text-muted">
                      {p.kg === null ? '—' : n(p.kg)}
                    </td>
                    <td className="px-4 py-2 text-muted">{p.note ?? ''}</td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        <form action={deleteShrimpPurchase}>
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

      <Card title="Lịch sử bánh tặng" className="mt-6">
        {gifts.length === 0 ? (
          <EmptyState message="Chưa có bánh tặng nào. Bấm “+ Bánh tặng” để thêm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Loại bánh</th>
                  <th className="px-4 py-2 font-medium text-right">Số bánh</th>
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
        tính từ ngày nhập đầu tiên. Mọi con số tính trong Postgres.
      </p>
    </div>
  );
}

function NumberCard({
  label,
  value,
  sub,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  const color =
    tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted tabular">{sub}</p>}
    </div>
  );
}
