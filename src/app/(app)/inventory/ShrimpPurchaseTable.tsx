'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ShrimpPurchaseRow } from '@/lib/queries';
import { updateShrimpPurchase, deleteShrimpPurchase } from '../entry/actions';
import { formatDate, formatCurrency } from '@/lib/format';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');

function toDateInput(dateStr: string) {
  // dateStr có thể là 'YYYY-MM-DD' hoặc ISO
  return dateStr?.slice(0, 10) ?? '';
}

export default function ShrimpPurchaseTable({
  purchases,
  isOwner,
}: {
  purchases: ShrimpPurchaseRow[];
  isOwner: boolean;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSave(formData: FormData) {
    setSaving(true);
    await updateShrimpPurchase(formData);
    setEditId(null);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(formData: FormData) {
    await deleteShrimpPurchase(formData);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted">
            <th className="px-4 py-2 font-medium">Ngày</th>
            <th className="px-4 py-2 font-medium text-right">Số con</th>
            <th className="px-4 py-2 font-medium text-right">Số kg</th>
            <th className="px-4 py-2 font-medium text-right">Số tiền</th>
            <th className="px-4 py-2 font-medium">Ghi chú</th>
            {isOwner && <th className="px-4 py-2 font-medium text-right">Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {purchases.map((p) =>
            editId === p.id ? (
              <tr key={p.id} className="border-b border-border bg-surface/50">
                <td colSpan={6} className="px-4 py-3">
                  <form action={handleSave} className="flex flex-wrap gap-2 items-end">
                    <input type="hidden" name="id" value={p.id} />

                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Ngày
                      <input
                        type="date"
                        name="purchase_date"
                        defaultValue={toDateInput(p.purchase_date)}
                        required
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent w-36"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Số con
                      <input
                        type="number"
                        name="shrimp_count"
                        defaultValue={p.shrimp_count}
                        required
                        min={1}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent w-24"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Số kg
                      <input
                        type="number"
                        name="kg"
                        defaultValue={p.kg ?? ''}
                        step="0.1"
                        min={0}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent w-20"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Số tiền (đ)
                      <input
                        type="number"
                        name="total_cost"
                        defaultValue={p.total_cost ?? ''}
                        step={1000}
                        min={0}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent w-32"
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-muted flex-1 min-w-40">
                      Ghi chú
                      <input
                        type="text"
                        name="note"
                        defaultValue={p.note ?? ''}
                        className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent w-full"
                      />
                    </label>

                    <div className="flex gap-2 pb-0.5">
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-background transition"
                      >
                        Huỷ
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg hover:opacity-90 transition disabled:opacity-50"
                      >
                        {saving ? 'Đang lưu…' : 'Lưu'}
                      </button>
                    </div>
                  </form>
                </td>
              </tr>
            ) : (
              <tr key={p.id} className="border-b border-border last:border-0 group">
                <td className="px-4 py-2 tabular">{formatDate(p.purchase_date)}</td>
                <td className="px-4 py-2 text-right tabular font-medium">{n(p.shrimp_count)}</td>
                <td className="px-4 py-2 text-right tabular text-muted">
                  {p.kg === null ? '—' : n(p.kg)}
                </td>
                <td className="px-4 py-2 text-right tabular text-muted">
                  {p.total_cost === null ? '—' : formatCurrency(p.total_cost)}
                </td>
                <td className="px-4 py-2 text-muted">{p.note ?? ''}</td>
                {isOwner && (
                  <td className="px-4 py-2 text-right">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => setEditId(p.id)}
                        className="text-accent hover:underline text-xs"
                      >
                        Sửa
                      </button>
                      <form action={handleDelete}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-negative hover:underline text-xs">
                          Xóa
                        </button>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
