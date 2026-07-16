'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createSale, type EntryState } from '../actions';
import { today, formatCurrency } from '@/lib/format';
import type { MenuItem } from '@/lib/queries';

const initial: EntryState = { ok: false, error: null };
const parse = (s: string) => Number(s.replace(/[.\s,]/g, '')) || 0;

export default function SaleForm({ menu }: { menu: MenuItem[] }) {
  const [state, action, pending] = useActionState(createSale, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const menuRef = useRef<HTMLSelectElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);

  const recompute = () => {
    if (totalRef.current) {
      const amount = parse(qtyRef.current?.value ?? '') * parse(priceRef.current?.value ?? '');
      totalRef.current.textContent = formatCurrency(amount);
    }
  };

  // Chọn món -> tự điền giá từ thực đơn (nhân viên vẫn sửa được để giảm giá).
  const onMenuChange = () => {
    const id = menuRef.current?.value;
    const item = menu.find((m) => m.id === id);
    if (item && priceRef.current) priceRef.current.value = String(item.price);
    recompute();
  };

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      if (totalRef.current) totalRef.current.textContent = formatCurrency(0);
      menuRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Ngày bán" required>
        <input name="sale_date" type="date" required defaultValue={today()} className={inputCls} />
      </Field>

      <Field label="Món" required>
        <select
          ref={menuRef}
          name="menu_item_id"
          required
          defaultValue=""
          onChange={onMenuChange}
          className={inputCls}
        >
          <option value="" disabled>
            — Chọn món —
          </option>
          {menu.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({formatCurrency(m.price)})
            </option>
          ))}
        </select>
        {menu.length === 0 && (
          <p className="mt-1 text-xs text-negative">
            Chưa có món nào. Chủ DN vào trang Thực đơn để thêm.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Số lượng" required>
          <input
            ref={qtyRef}
            name="quantity"
            inputMode="numeric"
            required
            onInput={recompute}
            className={`${inputCls} tabular`}
            placeholder="2"
          />
        </Field>
        <Field label="Đơn giá (₫)">
          <input
            ref={priceRef}
            name="unit_price"
            inputMode="numeric"
            onInput={recompute}
            className={`${inputCls} tabular`}
            placeholder="Tự điền theo món"
          />
        </Field>
      </div>

      <div className="rounded-lg bg-background px-3 py-2 text-sm flex justify-between">
        <span className="text-muted">Thành tiền</span>
        <span ref={totalRef} className="font-semibold tabular">
          {formatCurrency(0)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nguồn">
          <input name="source" autoComplete="off" className={inputCls} placeholder="TM / CK" />
        </Field>
        <Field label="Nhân viên">
          <input name="staff" autoComplete="off" className={inputCls} />
        </Field>
      </div>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending || menu.length === 0}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu bán hàng'}
      </button>
    </form>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';

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
      <label className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-negative"> *</span>}
      </label>
      {children}
    </div>
  );
}
