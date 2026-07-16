'use client';

import { Fragment, useState } from 'react';
import { formatCurrency, formatDate, formatMonth, formatTime } from '@/lib/format';
import { Card } from '@/components/ui';
import type { SaleRow } from '@/lib/queries';

export type DayGroup = {
  key: string;
  qty: number;
  total: number;
  rows: SaleRow[];
};

export type MonthGroup = {
  key: string;
  qty: number;
  total: number;
  days: DayGroup[];
};

export function SalesDetailTable({
  months,
  todayKey,
}: {
  months: MonthGroup[];
  todayKey: string;
}) {
  // Mặc định chỉ mở ngày hôm nay; các ngày quá khứ thu gọn.
  const [openDays, setOpenDays] = useState<Set<string>>(
    () => new Set([todayKey]),
  );

  const toggle = (key: string) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-6">
      {months.map((m) => (
        <Card key={m.key}>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold">
              {formatMonth(`${m.key}-01`)}
            </h2>
            <span className="text-sm text-muted tabular">
              {m.qty} bánh · {formatCurrency(m.total)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Giờ</th>
                  <th className="px-4 py-2 font-medium">Loại bánh</th>
                  <th className="px-4 py-2 font-medium text-right">SL</th>
                  <th className="px-4 py-2 font-medium text-right">Đơn giá</th>
                  <th className="px-4 py-2 font-medium">Nguồn</th>
                  <th className="px-4 py-2 font-medium text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {m.days.map((d) => {
                  const isOpen = openDays.has(d.key);
                  return (
                    <Fragment key={d.key}>
                      <tr className="border-b border-border bg-background">
                        <td colSpan={6} className="p-0">
                          <button
                            type="button"
                            onClick={() => toggle(d.key)}
                            aria-expanded={isOpen}
                            className="flex w-full items-baseline justify-between gap-4 px-4 py-1.5 text-left text-xs font-medium text-muted hover:text-foreground"
                          >
                            <span className="flex items-baseline gap-2">
                              <span
                                aria-hidden
                                className={`text-[10px] leading-none transition-transform ${
                                  isOpen ? 'rotate-90' : ''
                                }`}
                              >
                                ▶
                              </span>
                              <span>{formatDate(d.key)}</span>
                              {!isOpen && (
                                <span className="font-normal text-muted">
                                  ({d.rows.length} lần bán)
                                </span>
                              )}
                            </span>
                            <span className="tabular font-normal">
                              {d.qty} bánh · {formatCurrency(d.total)}
                            </span>
                          </button>
                        </td>
                      </tr>
                      {isOpen &&
                        d.rows.map((s) => (
                          <tr
                            key={s.id}
                            className="border-b border-border last:border-0 hover:bg-background"
                          >
                            <td className="px-4 py-2.5 whitespace-nowrap text-muted tabular">
                              {formatTime(s.sold_at)}
                            </td>
                            <td className="px-4 py-2.5">{s.cake_type ?? '—'}</td>
                            <td className="px-4 py-2.5 text-right tabular">
                              {s.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular">
                              {formatCurrency(s.unit_price)}
                            </td>
                            <td className="px-4 py-2.5">
                              {s.source ? (
                                <span
                                  className={`font-medium ${
                                    s.source === 'TM'
                                      ? 'text-negative'
                                      : s.source === 'CK'
                                        ? 'text-blue-600'
                                        : 'text-muted'
                                  }`}
                                >
                                  {s.source}
                                </span>
                              ) : (
                                ''
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular font-medium whitespace-nowrap">
                              {formatCurrency(s.amount)}
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
