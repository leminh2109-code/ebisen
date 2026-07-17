'use client';

import { useState } from 'react';
import { formatCurrency, formatDate, formatMonth } from '@/lib/format';
import { Card, EmptyState } from '@/components/ui';
import type { ExpenseRow } from '@/lib/queries';

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

export function ExpensesDetailTable({ months }: { months: MonthGroup[] }) {
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
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border text-left text-muted">
                      <th className="px-4 py-2 font-medium">Ngày</th>
                      <th className="px-4 py-2 font-medium">Danh mục</th>
                      <th className="px-4 py-2 font-medium">Loại</th>
                      <th className="px-4 py-2 font-medium">TT chi phí</th>
                      <th className="px-4 py-2 font-medium">Mô tả</th>
                      <th className="px-4 py-2 font-medium text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.rows.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border last:border-0 hover:bg-background align-top"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted tabular">
                          {formatDate(r.expense_date)}
                        </td>
                        <td className="px-4 py-2.5">{r.category?.trim() || '—'}</td>
                        <td className="px-4 py-2.5">
                          <TypeBadge value={r.expense_type} />
                        </td>
                        <td className="px-4 py-2.5">
                          {r.cost_center?.trim() || <span className="text-muted">—</span>}
                        </td>
                        <td className="px-4 py-2.5 whitespace-pre-line text-foreground/70">
                          {r.description?.trim() || ''}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular font-medium whitespace-nowrap">
                          {formatCurrency(r.amount)}
                        </td>
                      </tr>
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
