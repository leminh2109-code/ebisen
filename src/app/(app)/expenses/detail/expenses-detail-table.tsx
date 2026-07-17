'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, formatMonth } from '@/lib/format';
import { formatMoneyInput, groupDigits } from '@/lib/number-input';
import { Card, EmptyState } from '@/components/ui';
import type { ExpenseRow } from '@/lib/queries';
import { updateExpense, deleteExpense } from './actions';

export type MonthGroup = {
  key: string;
  count: number;
  total: number;
  rows: ExpenseRow[];
};

/** Nhãn "Cố định/Biến đổi" với màu phân biệt. */
function TypeBadge({ value }: { value: string | null }) {
  const v = value?.trim();
  if (!v) return <span className="text-muted">—</span>;
  const fixed = v.toLowerCase().startsWith('cố định');
  return <span className={fixed ? 'text-blue-600' : 'text-foreground/70'}>{v}</span>;
}

export function ExpensesDetailTable({
  months,
  categories,
  costCenters,
  canDelete,
}: {
  months: MonthGroup[];
  categories: string[];
  costCenters: string[];
  canDelete: boolean;
}) {
  // Mặc định chỉ mở tháng mới nhất; các tháng cũ thu gọn.
  const [openMonths, setOpenMonths] = useState<Set<string>>(
    () => new Set(months[0] ? [months[0].key] : []),
  );

  const toggle = (key: string) =>
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* Datalist dùng chung cho mọi ô nhập ở chế độ sửa. */}
      <datalist id="expense-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="cost-centers">
        {costCenters.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {months.map((m) => {
        const isOpen = openMonths.has(m.key);
        return (
          <Card key={m.key}>
            <button
              type="button"
              onClick={() => toggle(m.key)}
              aria-expanded={isOpen}
              className="flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left hover:bg-background"
            >
              <span className="flex items-baseline gap-2">
                <span
                  aria-hidden
                  className={`text-[10px] leading-none text-muted transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
                <span className="text-base font-semibold">
                  {formatMonth(`${m.key}-01`)}
                </span>
              </span>
              <span className="text-sm text-muted tabular">
                {m.count} khoản · {formatCurrency(m.total)}
              </span>
            </button>

            {isOpen && (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full text-sm min-w-[820px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="px-4 py-2 font-medium">Ngày</th>
                      <th className="px-4 py-2 font-medium">Danh mục</th>
                      <th className="px-4 py-2 font-medium">Loại</th>
                      <th className="px-4 py-2 font-medium">TT chi phí</th>
                      <th className="px-4 py-2 font-medium">Mô tả</th>
                      <th className="px-4 py-2 font-medium text-right">Số tiền</th>
                      <th className="px-4 py-2 font-medium text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.rows.map((r) => (
                      <ExpenseDetailRow key={r.id} row={r} canDelete={canDelete} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
      {months.length === 0 && (
        <Card>
          <EmptyState message="Chưa có khoản chi nào." />
        </Card>
      )}
    </div>
  );
}

function ExpenseDetailRow({ row, canDelete }: { row: ExpenseRow; canDelete: boolean }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const [editError, setEditError] = useState<string | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Server action gọi trực tiếp trong handler (không dùng useActionState/useEffect
  // để tránh rule react-hooks/set-state-in-effect khi đóng form lúc thành công).
  async function onSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setBusy(true);
    setEditError(null);
    const res = await updateExpense({ ok: false, error: null }, formData);
    setBusy(false);
    if (res.ok) setMode('view');
    else setEditError(res.error);
  }

  async function onConfirmDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setBusy(true);
    setDelError(null);
    const res = await deleteExpense({ ok: false, error: null }, formData);
    // Thành công → hàng biến mất sau revalidate; chỉ cần xử lý lỗi.
    if (!res.ok) {
      setBusy(false);
      setMode('view');
      setDelError(res.error);
    }
  }

  if (mode === 'edit') {
    return (
      <tr className="border-b border-border last:border-0 bg-background">
        <td colSpan={7} className="px-4 py-3">
          <form onSubmit={onSaveEdit} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={row.id} />
            <EditField label="Ngày chi" className="w-40">
              <input
                name="expense_date"
                type="date"
                required
                defaultValue={row.expense_date.slice(0, 10)}
                className={inputCls}
              />
            </EditField>
            <EditField label="Số tiền (₫)" className="w-36">
              <input
                name="amount"
                inputMode="numeric"
                required
                defaultValue={groupDigits(String(row.amount))}
                onInput={(e) => formatMoneyInput(e.currentTarget)}
                className={`${inputCls} tabular`}
              />
            </EditField>
            <EditField label="Danh mục" className="w-44">
              <input
                name="category"
                list="expense-categories"
                autoComplete="off"
                defaultValue={row.category ?? ''}
                className={inputCls}
              />
            </EditField>
            <EditField label="Loại" className="w-32">
              <select
                name="expense_type"
                defaultValue={row.expense_type ?? ''}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="Cố định">Cố định</option>
                <option value="Biến đổi">Biến đổi</option>
              </select>
            </EditField>
            <EditField label="TT chi phí" className="w-40">
              <input
                name="cost_center"
                list="cost-centers"
                autoComplete="off"
                defaultValue={row.cost_center ?? ''}
                className={inputCls}
              />
            </EditField>
            <EditField label="Mô tả" className="flex-1 min-w-[180px]">
              <input
                name="description"
                defaultValue={row.description ?? ''}
                className={inputCls}
              />
            </EditField>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Đang lưu…' : 'Lưu'}
              </button>
              <button
                type="button"
                onClick={() => setMode('view')}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-white"
              >
                Hủy
              </button>
            </div>
            {editError && <p className="w-full text-sm text-negative">{editError}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-background align-top">
      <td className="px-4 py-2.5 whitespace-nowrap text-muted tabular">
        {formatDate(row.expense_date)}
      </td>
      <td className="px-4 py-2.5">{row.category?.trim() || '—'}</td>
      <td className="px-4 py-2.5">
        <TypeBadge value={row.expense_type} />
      </td>
      <td className="px-4 py-2.5">
        {row.cost_center?.trim() || <span className="text-muted">—</span>}
      </td>
      <td className="px-4 py-2.5 whitespace-pre-line text-foreground/70">
        {row.description?.trim() || ''}
      </td>
      <td className="px-4 py-2.5 text-right tabular font-medium whitespace-nowrap">
        {formatCurrency(row.amount)}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        {mode === 'confirm' ? (
          <form onSubmit={onConfirmDelete} className="inline-flex items-center gap-2">
            <input type="hidden" name="id" value={row.id} />
            <span className="text-muted">Xóa?</span>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-negative px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Đang xóa…' : 'Xóa'}
            </button>
            <button
              type="button"
              onClick={() => setMode('view')}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-white"
            >
              Hủy
            </button>
          </form>
        ) : (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-white"
            >
              Sửa
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => setMode('confirm')}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-negative hover:bg-white"
              >
                Xóa
              </button>
            )}
          </span>
        )}
        {delError && <p className="mt-1 text-xs text-negative">{delError}</p>}
      </td>
    </tr>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';

function EditField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium mb-1 text-muted">{label}</label>
      {children}
    </div>
  );
}
