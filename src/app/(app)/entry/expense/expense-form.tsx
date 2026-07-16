'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createExpense, type EntryState } from '../actions';
import { today } from '@/lib/format';

const initial: EntryState = { ok: false, error: null };

export default function ExpenseForm({
  categories,
  costCenters,
}: {
  categories: string[];
  costCenters: string[];
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
        <input
          name="category"
          list="expense-categories"
          autoComplete="off"
          className={inputCls}
          placeholder="VD: Vận chuyển"
        />
        <datalist id="expense-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Loại chi phí">
          <select name="expense_type" className={inputCls} defaultValue="">
            <option value="">— Chọn —</option>
            <option value="Cố định">Cố định</option>
            <option value="Biến đổi">Biến đổi</option>
          </select>
        </Field>
        <Field label="Trung tâm chi phí">
          <input
            name="cost_center"
            list="cost-centers"
            autoComplete="off"
            className={inputCls}
            placeholder="VD: Bao bì"
          />
          <datalist id="cost-centers">
            {costCenters.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="Mô tả">
        <textarea name="description" rows={2} className={inputCls} />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>
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
