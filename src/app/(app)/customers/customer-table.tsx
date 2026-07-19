'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/format';
import type { CustomerStats } from '@/lib/queries';
import { deleteCustomer, updateCustomer } from './actions';

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');

/** Số khách được đánh dấu VIP (mua nhiều nhất). */
const VIP_COUNT = 5;
/** Điều kiện tối thiểu để thành VIP: tổng bánh phải đạt từ mức này trở lên. */
const VIP_MIN_QTY = 50;

type SortKey = 'qty' | 'date';
type Dir = 'asc' | 'desc';

/** Xếp hạng "mua nhiều": tổng bánh giảm dần, hòa nhau thì theo lượt mua. */
function rankValue(c: CustomerStats): number {
  return Number(c.total_qty) * 1000 + Number(c.order_count);
}

/** Mốc thời gian mua gần nhất (ms); null = 0 (đẩy xuống cuối khi mới→cũ). */
function dateValue(c: CustomerStats): number {
  return c.last_order ? new Date(c.last_order).getTime() : 0;
}

export function CustomerTable({
  customers,
  isOwner,
}: {
  customers: CustomerStats[];
  isOwner: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('qty');
  const [dir, setDir] = useState<Dir>('desc');
  const [editing, setEditing] = useState<CustomerStats | null>(null);

  // Tập VIP = 5 khách mua nhiều nhất (chỉ tính khách đã có lượt mua), cố định
  // bất kể đang sắp xếp kiểu nào.
  const vipIds = useMemo(() => {
    const ranked = [...customers]
      .filter((c) => Number(c.total_qty) >= VIP_MIN_QTY)
      .sort((a, b) => rankValue(b) - rankValue(a))
      .slice(0, VIP_COUNT);
    return new Set(ranked.map((c) => c.id));
  }, [customers]);

  const sorted = useMemo(() => {
    const val = sortKey === 'qty' ? rankValue : dateValue;
    const arr = [...customers].sort((a, b) => val(a) - val(b));
    if (dir === 'desc') arr.reverse();
    return arr;
  }, [customers, sortKey, dir]);

  // Bấm nút đang chọn → đảo chiều; bấm nút khác → chuyển tiêu chí (mặc định giảm dần).
  const pick = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setDir('desc');
    }
  };

  const arrow = (key: SortKey) => (key === sortKey ? (dir === 'desc' ? ' ↓' : ' ↑') : '');

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Sắp xếp:</span>
        <SortButton active={sortKey === 'qty'} onClick={() => pick('qty')}>
          Mua nhiều nhất{arrow('qty')}
        </SortButton>
        <SortButton active={sortKey === 'date'} onClick={() => pick('date')}>
          Theo ngày mua{arrow('date')}
        </SortButton>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 ring-1 ring-amber-400" />
          Top {VIP_COUNT} VIP
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2 font-medium">Tên</th>
              <th className="px-4 py-2 font-medium">Địa chỉ</th>
              <th className="px-4 py-2 font-medium">SĐT</th>
              <th className="px-4 py-2 font-medium text-right">Lượt mua</th>
              <th className="px-4 py-2 font-medium text-right">Tổng bánh</th>
              <th className="px-4 py-2 font-medium">Hay mua</th>
              <th className="px-4 py-2 font-medium">Mua gần nhất</th>
              <th className="px-4 py-2 font-medium text-right">Sửa{isOwner ? ' / Xóa' : ''}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const vip = vipIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`border-b border-border last:border-0 ${
                    vip ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-background'
                  }`}
                >
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {vip && (
                        <span className="rounded-sm bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                          ★ VIP
                        </span>
                      )}
                      <Link
                        href={`/customers/${c.id}`}
                        className="text-accent hover:underline font-medium"
                      >
                        {c.name ?? '—'}
                      </Link>
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted max-w-[220px] truncate">{c.address ?? '—'}</td>
                  <td className="px-4 py-2 tabular text-muted">{c.phone}</td>
                  <td className="px-4 py-2 text-right tabular">{n(c.order_count)}</td>
                  <td className="px-4 py-2 text-right tabular">{n(c.total_qty)}</td>
                  <td className="px-4 py-2">{c.top_cake ?? '—'}</td>
                  <td className="px-4 py-2 tabular">{c.last_order ? formatDate(c.last_order) : '—'}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent"
                      >
                        Sửa
                      </button>
                      {isOwner && (
                        <form action={deleteCustomer}>
                          <input type="hidden" name="id" value={c.id} />
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <EditCustomerModal customer={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';

function EditCustomerModal({
  customer,
  onClose,
}: {
  customer: CustomerStats;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateCustomer, {
    ok: false,
    error: null,
  });

  // Lưu xong → đóng modal (dữ liệu tự làm mới nhờ revalidatePath ở server action).
  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  // Esc để đóng.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Sửa thông tin khách</h3>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={customer.id} />
          <Field label="Số điện thoại" required>
            <input name="phone" defaultValue={customer.phone} required className={inputCls} />
          </Field>
          <Field label="Tên">
            <input name="name" defaultValue={customer.name ?? ''} className={inputCls} />
          </Field>
          <Field label="Địa chỉ">
            <input name="address" defaultValue={customer.address ?? ''} className={inputCls} />
          </Field>
          <Field label="Số lần mua">
            <input
              name="order_count"
              inputMode="numeric"
              defaultValue={String(customer.order_count)}
              className={`${inputCls} tabular`}
            />
            <p className="mt-1 text-xs text-muted">
              Chỉnh khi lịch sử ghi thiếu số lần mua. Không đổi Tổng bánh; đơn nhập
              mới sau này vẫn tự cộng.
            </p>
          </Field>
          <Field label="Ghi chú">
            <textarea name="note" defaultValue={customer.note ?? ''} rows={2} className={inputCls} />
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

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-border text-foreground hover:border-accent'
      }`}
    >
      {children}
    </button>
  );
}
