'use client';

import { Fragment, useActionState, useEffect, useState } from 'react';
import { formatCurrency, formatDate, formatMonth, formatTime } from '@/lib/format';
import { Card } from '@/components/ui';
import { updateSale, deleteSale, type EntryState } from '../../entry/actions';
import type { MenuItem, SaleRow } from '@/lib/queries';
import type { MonthGroup } from './group';

export type { DayGroup, MonthGroup } from './group';

export function SalesDetailTable({
  months,
  todayKey,
  editable = false,
  isOwner = false,
  menu = [],
}: {
  months: MonthGroup[];
  todayKey: string;
  /** Bật cột Sửa/Xóa (chỉ ở trang nội bộ; link xem công khai để tắt). */
  editable?: boolean;
  isOwner?: boolean;
  menu?: MenuItem[];
}) {
  // Mặc định chỉ mở ngày hôm nay; các ngày quá khứ thu gọn.
  const [openDays, setOpenDays] = useState<Set<string>>(
    () => new Set([todayKey]),
  );
  const [editing, setEditing] = useState<SaleRow | null>(null);

  const toggle = (key: string) =>
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const colCount = editable ? 7 : 6;

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
                  {editable && <th className="px-4 py-2 font-medium text-right">Sửa{isOwner ? ' / Xóa' : ''}</th>}
                </tr>
              </thead>
              <tbody>
                {m.days.map((d) => {
                  const isOpen = openDays.has(d.key);
                  return (
                    <Fragment key={d.key}>
                      <tr className="border-b border-border bg-background">
                        <td colSpan={colCount} className="p-0">
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
                              {d.weather && (
                                <span className="font-normal text-muted">· {d.weather}</span>
                              )}
                              {!isOpen && (
                                <span className="font-normal text-muted">
                                  ({d.rows.length} lần bán)
                                </span>
                              )}
                            </span>
                            <span className="tabular font-normal">
                              {d.qty} bánh · {formatCurrency(d.total)}
                              {(d.tm > 0 || d.ck > 0) && (
                                <span className="ml-1.5 text-[11px] font-normal text-muted">
                                  ({[
                                    d.tm > 0 && `TM ${Math.round(d.tm / 1000).toLocaleString('vi-VN')}k`,
                                    d.ck > 0 && `CK ${Math.round(d.ck / 1000).toLocaleString('vi-VN')}k`,
                                  ].filter(Boolean).join(' · ')})
                                </span>
                              )}
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
                            {editable && (
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditing(s)}
                                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent"
                                  >
                                    Sửa
                                  </button>
                                  {isOwner && (
                                    <form action={deleteSale}>
                                      <input type="hidden" name="id" value={s.id} />
                                      <button
                                        type="submit"
                                        className="rounded-md border border-negative/40 px-2.5 py-1 text-xs font-medium text-negative hover:bg-negative/10"
                                      >
                                        Xóa
                                      </button>
                                    </form>
                                  )}
                                </div>
                              </td>
                            )}
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

      {editing && (
        <EditSaleModal sale={editing} menu={menu} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';

function EditSaleModal({
  sale,
  menu,
  onClose,
}: {
  sale: SaleRow;
  menu: MenuItem[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<EntryState, FormData>(updateSale, {
    ok: false,
    error: null,
  });

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Nếu nguồn hiện tại không phải TM/CK (dữ liệu cũ), vẫn giữ làm lựa chọn.
  const sources = ['TM', 'CK'];
  const curSource = sale.source ?? '';
  const extraSource = curSource && !sources.includes(curSource) ? curSource : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Sửa lần bán</h3>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={sale.id} />
          <Field label="Loại bánh" required>
            <select
              name="menu_item_id"
              defaultValue={sale.menu_item_id ?? ''}
              required
              className={inputCls}
            >
              <option value="" disabled>
                — Chọn loại bánh —
              </option>
              {menu.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số lượng" required>
              <input
                name="quantity"
                inputMode="numeric"
                defaultValue={String(sale.quantity)}
                required
                className={`${inputCls} tabular`}
              />
            </Field>
            <Field label="Đơn giá (₫)" required>
              <input
                name="unit_price"
                inputMode="numeric"
                defaultValue={String(sale.unit_price)}
                required
                className={`${inputCls} tabular`}
              />
            </Field>
          </div>
          <Field label="Nguồn">
            <select name="source" defaultValue={curSource} className={inputCls}>
              <option value="">— Không rõ —</option>
              <option value="TM">TM (tiền mặt)</option>
              <option value="CK">CK (chuyển khoản)</option>
              {extraSource && <option value={extraSource}>{extraSource}</option>}
            </select>
          </Field>
          <Field label="Ghi chú">
            <textarea name="note" rows={2} defaultValue={sale.note ?? ''} className={inputCls} />
          </Field>

          {state.error && <p className="text-sm text-negative">{state.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
            >
              {pending ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label}
        {required && <span className="text-negative"> *</span>}
      </label>
      {children}
    </div>
  );
}
