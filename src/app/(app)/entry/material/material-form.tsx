'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createMaterialPurchase, type EntryState } from '../actions';
import { today } from '@/lib/format';
import { formatMoneyInput } from '@/lib/number-input';

const initial: EntryState = { ok: false, error: null };

export default function MaterialForm() {
  const [state, action, pending] = useActionState(createMaterialPurchase, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      qtyRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Loại vật tư" required>
          <select name="material" required defaultValue="tui" className={inputCls}>
            <option value="tui">Túi</option>
            <option value="tem">Tem</option>
          </select>
        </Field>
        <Field label="Ngày nhập" required>
          <input name="purchase_date" type="date" required defaultValue={today()} className={inputCls} />
        </Field>
      </div>

      <Field label="Số lượng (túi / tem)" required>
        <input
          ref={qtyRef}
          name="quantity"
          inputMode="numeric"
          required
          onInput={(e) => formatMoneyInput(e.currentTarget)}
          className={`${inputCls} tabular`}
          placeholder="VD: 10.825 túi (433kg × 25) hoặc 10.000 tem"
        />
      </Field>

      <Field label="Tổng chi phí (₫)" required>
        <input
          name="total_cost"
          inputMode="numeric"
          required
          onInput={(e) => formatMoneyInput(e.currentTarget)}
          className={`${inputCls} tabular`}
          placeholder="VD: 35.000.000"
        />
      </Field>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} placeholder="VD: nhà cung cấp, 433kg…" />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu lần nhập vật tư'}
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
