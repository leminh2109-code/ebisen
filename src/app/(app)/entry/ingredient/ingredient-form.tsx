'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createIngredientPurchase, type EntryState } from '../actions';
import { today } from '@/lib/format';
import { formatMoneyInput } from '@/lib/number-input';
import type { Ingredient } from '@/lib/queries';

const initial: EntryState = { ok: false, error: null };

export default function IngredientForm({ ingredients }: { ingredients: Ingredient[] }) {
  const [state, action, pending] = useActionState(createIngredientPurchase, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const costRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      qtyRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Loại nguyên liệu" required>
        <select name="ingredient" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            — Chọn nguyên liệu —
          </option>
          {ingredients.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label} ({i.grams_per_cake}g/bánh)
            </option>
          ))}
        </select>
      </Field>

      <Field label="Ngày nhập" required>
        <input
          name="purchase_date"
          type="date"
          required
          defaultValue={today()}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-[1fr_7rem] gap-4">
        <Field label="Số lượng" required>
          <input
            ref={qtyRef}
            name="quantity"
            inputMode="decimal"
            required
            className={`${inputCls} tabular`}
            placeholder="VD: 100"
          />
        </Field>
        <Field label="Đơn vị">
          <select name="unit" defaultValue="kg" className={inputCls}>
            <option value="kg">kg</option>
            <option value="g">gram</option>
          </select>
        </Field>
      </div>

      <Field label="Tổng tiền (₫)">
        <input
          ref={costRef}
          name="total_cost"
          inputMode="numeric"
          onInput={() => costRef.current && formatMoneyInput(costRef.current)}
          className={`${inputCls} tabular`}
          placeholder="Tùy chọn — chỉ để định giá tồn"
        />
        <p className="mt-1 text-xs text-muted">
          Tiền đã ghi ở mục Chi phí rồi, điền đây KHÔNG tính thêm vào P&amp;L.
        </p>
      </Field>

      <Field label="Ghi chú">
        <textarea
          name="note"
          rows={2}
          className={inputCls}
          placeholder="VD: tồn đầu kỳ, nhà cung cấp…"
        />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending || ingredients.length === 0}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu nhập nguyên liệu'}
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
