import Link from 'next/link';
import { getIngredientInventory, getIngredientPurchases, getCurrentRole } from '@/lib/queries';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { deleteIngredientPurchase } from '../entry/actions';
import { INGREDIENT_LOW_STOCK, isIngredientLow } from '@/lib/inventory-thresholds';

export const dynamic = 'force-dynamic';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');
/** kg gọn: 0,9 kg → "0,9 kg"; 68,485 → "68,49 kg". */
const kg = (v: number | null) =>
  `${Number(v ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg`;

export default async function IngredientsPage() {
  const [inv, purchases, role] = await Promise.all([
    getIngredientInventory(),
    getIngredientPurchases(),
    getCurrentRole(),
  ]);
  const isOwner = role === 'owner';
  const labelOf = new Map(inv.map((i) => [i.ingredient, i.label]));

  return (
    <div>
      <PageHeader
        title="Tồn kho bột & gia vị"
        subtitle="Trừ dần theo số bánh làm ra (bán + tặng) từ ngày nhập đầu tiên"
        action={
          <Link
            href="/entry/ingredient"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            + Nhập bột / gia vị
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {inv.map((i) => {
          const onHand = Number(i.kg_on_hand);
          const negative = onHand < 0;
          const low = isIngredientLow(i.ingredient, onHand);
          const short = negative || low;
          return (
            <div key={i.ingredient} className="rounded-xl border border-border bg-surface p-4">
              <p className="text-sm text-muted">{i.label}</p>
              <p
                className={`mt-1 text-2xl font-semibold tabular ${
                  short ? 'text-negative' : 'text-positive'
                }`}
              >
                {kg(i.kg_on_hand)}
              </p>
              {negative ? (
                <p className="mt-1 text-xs font-medium text-negative">
                  ⚠ Âm — thiếu tồn đầu kỳ hoặc chưa ghi lần nhập
                </p>
              ) : low ? (
                <p className="mt-1 text-xs font-medium text-negative">
                  ⚠ Dưới {INGREDIENT_LOW_STOCK[i.ingredient]} kg — cần nhập thêm
                  <span className="font-normal"> · đủ ~{n(i.cakes_left)} bánh nữa</span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted tabular">
                  Đủ làm ~{n(i.cakes_left)} bánh nữa
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted tabular">
                <span>Nhập: {kg(i.total_kg)}</span>
                <span>Đã dùng: {kg(i.kg_used)}</span>
              </div>
              <p className="mt-2 text-xs text-muted tabular">
                {i.start_date ? `Từ ${formatDate(i.start_date)} · ${n(i.cakes_used)} bánh` : 'Chưa nhập lần nào'}
                {i.cost_per_kg ? ` · ${formatCurrency(i.cost_per_kg)}/kg` : ''}
              </p>
            </div>
          );
        })}
      </div>

      <Card title="Lịch sử nhập bột / gia vị" className="mt-6">
        {purchases.length === 0 ? (
          <EmptyState message="Chưa có lần nhập nào. Bấm “+ Nhập bột / gia vị” để thêm." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Nguyên liệu</th>
                  <th className="px-4 py-2 font-medium text-right">Số kg</th>
                  <th className="px-4 py-2 font-medium text-right">Tổng tiền</th>
                  <th className="px-4 py-2 font-medium">Ghi chú</th>
                  {isOwner && <th className="px-4 py-2 font-medium text-right">Xóa</th>}
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 tabular">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-2">{labelOf.get(p.ingredient) ?? p.ingredient}</td>
                    <td className="px-4 py-2 text-right tabular font-medium">{kg(p.kg)}</td>
                    <td className="px-4 py-2 text-right tabular text-muted">
                      {p.total_cost === null ? '—' : formatCurrency(p.total_cost)}
                    </td>
                    <td className="px-4 py-2 text-muted">{p.note ?? ''}</td>
                    {isOwner && (
                      <td className="px-4 py-2 text-right">
                        <form action={deleteIngredientPurchase}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            className="rounded-md border border-negative/40 px-2.5 py-1 text-xs font-medium text-negative hover:bg-negative/10"
                          >
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
        Tồn kho trừ dần theo định mức mỗi bánh (cấu hình riêng trong hệ thống). Số
        bánh tính cả BÁN và TẶNG, từ ngày nhập đầu tiên của từng nguyên liệu. Tiền
        mua đã ghi ở mục Chi phí — giá trị tồn ở đây chỉ để tham khảo, KHÔNG cộng
        thêm vào P&amp;L. Mọi con số tính trong Postgres.
      </p>
    </div>
  );
}
