'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createExpense, type EntryState } from '../actions';
import { today } from '@/lib/format';

const initial: EntryState = { ok: false, error: null };

export default function ExpenseForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createExpense, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      firstFieldRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ngày chi" required>
          <input
            ref={firstFieldRef}
            name="expense_date"
            type="date"
            required
            defaultValue={today()}
            className={inputCls}
          />
        </Field>
        <Field label="Số tiền (₫)" required>
          <input
            name="amount"
            inputMode="numeric"
            required
            className={`${inputCls} tabular`}
            placeholder="500.000"
          />
        </Field>
      </div>

      <Field label="Danh mục">
        <select name="category_id" className={inputCls} defaultValue="">
          <option value="">— Chọn danh mục —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Nhà cung cấp / Người nhận">
        <input name="vendor" autoComplete="off" className={inputCls} />
      </Field>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-positive">
          ✓ Đã lưu khoản chi. Nhập tiếp bên dưới.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu chi phí'}
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
