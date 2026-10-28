'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createConsumablePurchase, type EntryState } from '../actions';
import { today } from '@/lib/format';
import { formatMoneyInput } from '@/lib/number-input';

const initial: EntryState = { ok: false, error: null };

const ITEMS = [
  { value: 'dau_an',        label: 'Dầu ăn',        unit: 'lít', placeholder: 'VD: 5' },
  { value: 'tui_bong_kinh', label: 'Túi bóng kính', unit: 'kg',  placeholder: 'VD: 2.5' },
  { value: 'tui_trang',     label: 'Túi trắng',     unit: 'cái', placeholder: 'VD: 200' },
] as const;

export default function ConsumableForm() {
  const [state, action, pending] = useActionState(createConsumablePurchase, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const [item, setItem] = useState<'dau_an' | 'tui_bong_kinh' | 'tui_trang'>('dau_an');

  const meta = ITEMS.find((i) => i.value === item) ?? ITEMS[0];

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setItem('dau_an');
      qtyRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Loại vật tư" required>
          <select
            name="item"
            required
            value={item}
            onChange={(e) => setItem(e.target.value as typeof item)}
            className={inputCls}
          >
            {ITEMS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label} ({i.unit})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ngày nhập" required>
          <input name="purchase_date" type="date" required defaultValue={today()} className={inputCls} />
        </Field>
      </div>

      <Field label={`Số lượng (${meta.unit})`} required>
        <input
          ref={qtyRef}
          name="quantity"
          inputMode="decimal"
          required
          placeholder={meta.placeholder}
          className={`${inputCls} tabular`}
        />
      </Field>

      <Field label="Tổng chi phí (₫)">
        <input
          name="total_cost"
          inputMode="numeric"
          defaultValue="0"
          onInput={(e) => formatMoneyInput(e.currentTarget)}
          className={`${inputCls} tabular`}
          placeholder="VD: 120.000"
        />
      </Field>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} placeholder="VD: nhà cung cấp, loại…" />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu lần nhập'}
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
