'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createSale, type EntryState } from '../actions';
import { today, formatCurrency } from '@/lib/format';

const initial: EntryState = { ok: false, error: null };
const parse = (s: string) => Number(s.replace(/[.\s,]/g, '')) || 0;

export default function SaleForm({ cakeTypes }: { cakeTypes: string[] }) {
  const [state, action, pending] = useActionState(createSale, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);

  // Cập nhật "Thành tiền" qua DOM (không dùng React state → không setState-in-effect).
  const recompute = () => {
    if (totalRef.current) {
      const amount = parse(qtyRef.current?.value ?? '') * parse(priceRef.current?.value ?? '');
      totalRef.current.textContent = formatCurrency(amount);
    }
  };

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      if (totalRef.current) totalRef.current.textContent = formatCurrency(0);
      firstFieldRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Ngày bán" required>
        <input
          ref={firstFieldRef}
          name="sale_date"
          type="date"
          required
          defaultValue={today()}
          className={inputCls}
        />
      </Field>

      <Field label="Loại bánh">
        <input
          name="cake_type"
          list="cake-types"
          autoComplete="off"
          className={inputCls}
          placeholder="VD: 2 tôm"
        />
        <datalist id="cake-types">
          {cakeTypes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
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
        <Field label="Đơn giá (₫)" required>
          <input
            ref={priceRef}
            name="unit_price"
            inputMode="numeric"
            required
            onInput={recompute}
            className={`${inputCls} tabular`}
            placeholder="90.000"
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
          <input name="source" autoComplete="off" className={inputCls} placeholder="TM" />
        </Field>
        <Field label="Nhân viên">
          <input name="staff" autoComplete="off" className={inputCls} />
        </Field>
      </div>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} />
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
