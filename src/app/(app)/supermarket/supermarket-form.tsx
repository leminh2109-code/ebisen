'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { SupermarketState } from './actions';

const initial: SupermarketState = { ok: false, error: null };

export default function SupermarketForm({
  action,
  todayDate,
}: {
  action: (state: SupermarketState, formData: FormData) => Promise<SupermarketState>;
  todayDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ngày giao" required>
          <input name="batch_date" type="date" required defaultValue={todayDate} className={inputCls} />
        </Field>
        <Field label="Số hộp giao" required>
          <input name="quantity_in" type="number" min="1" required placeholder="VD: 15" className={`${inputCls} tabular`} />
        </Field>
      </div>
      <Field label="Số tôm/hộp" required>
        <input name="shrimp_per_box" type="number" min="0" required defaultValue={3} className={`${inputCls} tabular`} />
      </Field>
      <Field label="Ghi chú">
        <input name="note" className={inputCls} placeholder="VD: đợt 1 tháng 9" />
      </Field>
      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã ghi lần giao hàng.</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu giao hàng'}
      </button>
    </form>
  );
}

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
