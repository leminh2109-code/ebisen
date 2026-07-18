'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createShrimpPurchase, type EntryState } from '../actions';
import { today } from '@/lib/format';
import { formatMoneyInput } from '@/lib/number-input';

const initial: EntryState = { ok: false, error: null };

export default function ShrimpForm() {
  const [state, action, pending] = useActionState(createShrimpPurchase, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const countRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      countRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Ngày nhập" required>
        <input name="purchase_date" type="date" required defaultValue={today()} className={inputCls} />
      </Field>

      <Field label="Số con tôm" required>
        <input
          ref={countRef}
          name="shrimp_count"
          inputMode="numeric"
          required
          className={`${inputCls} tabular`}
          placeholder="VD: 1750"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Số kg (tùy chọn)">
          <input
            name="kg"
            inputMode="numeric"
            className={`${inputCls} tabular`}
            placeholder="VD: 50"
          />
        </Field>
        <Field label="Tổng chi phí (₫, tùy chọn)">
          <input
            name="total_cost"
            inputMode="numeric"
            onInput={(e) => formatMoneyInput(e.currentTarget)}
            className={`${inputCls} tabular`}
            placeholder="VD: 20.000.000"
          />
        </Field>
      </div>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} placeholder="VD: 5 thùng, nhà cung cấp…" />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu lần nhập tôm'}
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
