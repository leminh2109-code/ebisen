'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createBoxPurchase, type EntryState } from '../actions';
import { today } from '@/lib/format';
import { formatMoneyInput } from '@/lib/number-input';

const initial: EntryState = { ok: false, error: null };

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-negative"> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function BoxForm() {
  const [state, action, pending] = useActionState(createBoxPurchase, initial);
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
      <Field label="Ngày nhập" required>
        <input name="purchase_date" type="date" required defaultValue={today()} className={inputCls} />
      </Field>

      <Field label="Số hộp" required>
        <input
          ref={qtyRef}
          name="quantity"
          inputMode="numeric"
          required
          className={`${inputCls} tabular`}
          placeholder="VD: 500"
        />
      </Field>

      <Field label="Tổng chi phí (₫)" required>
        <input
          name="total_cost"
          inputMode="numeric"
          required
          onInput={(e) => formatMoneyInput(e.currentTarget)}
          className={`${inputCls} tabular`}
          placeholder="VD: 8.640.000"
        />
      </Field>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} placeholder="VD: lô 2, nhà cung cấp mới…" />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu lần nhập hộp'}
      </button>
    </form>
  );
}
