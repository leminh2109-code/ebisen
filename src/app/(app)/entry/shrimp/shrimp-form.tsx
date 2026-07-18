'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createShrimpPurchase, type EntryState } from '../actions';
import { today } from '@/lib/format';

const initial: EntryState = { ok: false, error: null };
const parse = (s: string) => Number(s.replace(/[.\s,]/g, '')) || 0;

export default function ShrimpForm({ defaultSize = 35 }: { defaultSize?: number }) {
  const [state, action, pending] = useActionState(createShrimpPurchase, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const kgRef = useRef<HTMLInputElement>(null);
  const sizeRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  const recompute = () => {
    if (countRef.current) {
      const count = Math.round(parse(kgRef.current?.value ?? '') * parse(sizeRef.current?.value ?? ''));
      countRef.current.textContent = count.toLocaleString('vi-VN');
    }
  };

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      recompute();
      kgRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Ngày nhập" required>
        <input name="purchase_date" type="date" required defaultValue={today()} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Số kg" required>
          <input
            ref={kgRef}
            name="kg"
            inputMode="numeric"
            required
            onInput={recompute}
            className={`${inputCls} tabular`}
            placeholder="VD: 20"
          />
        </Field>
        <Field label="Size (con/kg)" required>
          <input
            ref={sizeRef}
            name="size_per_kg"
            inputMode="numeric"
            required
            defaultValue={String(defaultSize)}
            onInput={recompute}
            className={`${inputCls} tabular`}
            placeholder="VD: 35"
          />
        </Field>
      </div>

      <div className="rounded-lg bg-background px-3 py-2 text-sm flex justify-between">
        <span className="text-muted">Số con tôm nhập</span>
        <span className="font-semibold tabular">
          <span ref={countRef}>0</span> con
        </span>
      </div>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} placeholder="VD: nhà cung cấp, giá…" />
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
