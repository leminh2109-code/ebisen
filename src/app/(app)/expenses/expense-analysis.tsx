'use client';

import { useMemo, useState } from 'react';
import { formatCurrency, formatMonth } from '@/lib/format';
import { Card, EmptyState } from '@/components/ui';
import { PieChart } from '@/components/PieChart';
import type { ExpenseDimension, ExpenseGroupRow } from '@/lib/queries';

const DIMENSIONS: { key: ExpenseDimension; label: string }[] = [
  { key: 'category', label: 'Danh mục' },
  { key: 'expense_type', label: 'Loại' },
];

export function ExpenseAnalysis({
  groups,
  months,
}: {
  groups: Partial<Record<ExpenseDimension, ExpenseGroupRow[]>>;
  months: string[];
}) {
  const [dimension, setDimension] = useState<ExpenseDimension>('category');
  const [month, setMonth] = useState<string>(months[0] ?? '');

  const rows = useMemo(
    () => (groups[dimension] ?? []).filter((g) => g.month === month),
    [groups, dimension, month],
  );
  const total = rows.reduce((s, r) => s + Number(r.expenses), 0);

  const pieData = useMemo(
    () =>
      (groups.category ?? [])
        .filter((g) => g.month === month)
        .map((g) => ({ label: g.key, value: Number(g.expenses) })),
    [groups, month],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Biểu đồ tròn — cập nhật theo tháng đang chọn */}
      {month && (
        <Card title={`Cơ cấu chi phí ${formatMonth(month)}`}>
          <PieChart data={pieData} />
        </Card>
      )}

      {/* Bảng phân tích — có selector tháng + chiều */}
      <Card title="Phân tích chi phí">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {DIMENSIONS.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDimension(d.key)}
                className={`rounded-md px-3 py-1 text-sm transition ${
                  dimension === d.key
                    ? 'bg-accent text-accent-fg font-medium'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <EmptyState message="Chưa có dữ liệu tháng này." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-2 font-medium">Nhóm</th>
                <th className="px-4 py-2 font-medium text-right">Số khoản</th>
                <th className="px-4 py-2 font-medium text-right">Chi phí</th>
                <th className="px-4 py-2 font-medium text-right">% tổng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const pct = total > 0 ? (Number(r.expenses) / total) * 100 : 0;
                return (
                  <tr key={r.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{r.key}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted">
                      {r.expense_count}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium">
                      {formatCurrency(r.expenses)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-10 tabular text-muted">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium">
                <td className="px-4 py-2.5">Tổng</td>
                <td className="px-4 py-2.5 text-right tabular text-muted">
                  {rows.reduce((s, r) => s + Number(r.expense_count), 0)}
                </td>
                <td className="px-4 py-2.5 text-right tabular">
                  {formatCurrency(total)}
                </td>
                <td className="px-4 py-2.5" />
              </tr>
            </tfoot>
          </table>
        )}
      </Card>
    </div>
  );
}
