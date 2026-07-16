'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createInvoice, type EntryState } from '../actions';
import { today } from '@/lib/format';

const initial: EntryState = { ok: false, error: null };

export default function InvoiceForm() {
  const [state, action, pending] = useActionState(createInvoice, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      // Nhập thành công: xóa form, giữ nguyên trang để nhập tiếp nhanh.
      formRef.current?.reset();
      firstFieldRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Số hóa đơn" required>
        <input
          ref={firstFieldRef}
          name="invoice_number"
          required
          autoComplete="off"
          className={inputCls}
          placeholder="VD: HD-2026-001"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Ngày hóa đơn" required>
          <input
            name="issue_date"
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
            placeholder="1.500.000"
          />
        </Field>
      </div>

      <Field label="Khách hàng">
        <input
          name="customer_name"
          autoComplete="off"
          className={inputCls}
          placeholder="Để trống nếu không cần"
        />
      </Field>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && (
        <p className="text-sm text-positive">
          ✓ Đã lưu hóa đơn. Nhập tiếp bên dưới.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu hóa đơn'}
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
