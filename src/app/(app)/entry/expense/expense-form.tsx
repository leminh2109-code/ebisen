'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createExpense, type EntryState } from '../actions';
import { today } from '@/lib/format';
import { formatMoneyInput } from '@/lib/number-input';

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
  const catRef = useRef<HTMLInputElement>(null);
  const shrimpBoxRef = useRef<HTMLDivElement>(null);
  const kgRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLInputElement>(null);

  // Danh mục "Tôm" → hiện ô số kg / số con để cộng thẳng vào tồn kho.
  // Dùng DOM (không setState trong effect) theo rule react-hooks/set-state-in-effect.
  const syncShrimpBox = () => {
    const isShrimp = catRef.current?.value.trim().toLowerCase() === 'tôm';
    if (shrimpBoxRef.current) shrimpBoxRef.current.hidden = !isShrimp;
  };

  // Gợi ý số con từ số kg (dữ liệu thực tế: 35 con/kg) — vẫn sửa được.
  const suggestCount = () => {
    const kg = Number((kgRef.current?.value ?? '').replace(',', '.'));
    if (countRef.current && Number.isFinite(kg) && kg > 0 && !countRef.current.dataset.touched) {
      countRef.current.value = String(Math.round(kg * 35));
    }
  };

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      if (shrimpBoxRef.current) shrimpBoxRef.current.hidden = true;
      if (countRef.current) delete countRef.current.dataset.touched;
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
            onInput={(e) => formatMoneyInput(e.currentTarget)}
            className={`${inputCls} tabular`}
            placeholder="500.000"
          />
        </Field>
      </div>

      <Field label="Danh mục">
        <input
          ref={catRef}
          name="category"
          list="expense-categories"
          autoComplete="off"
          onInput={syncShrimpBox}
          onChange={syncShrimpBox}
          className={inputCls}
          placeholder="VD: Vận chuyển"
        />
        <datalist id="expense-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <div
        ref={shrimpBoxRef}
        hidden
        className="space-y-4 rounded-lg border border-dashed border-border bg-background p-3"
      >
        <p className="text-xs font-medium text-muted">
          Cộng vào tồn kho tôm (bỏ trống nếu không phải nhập hàng, vd tôm ăn thử)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Số kg">
            <input
              ref={kgRef}
              name="shrimp_kg"
              inputMode="decimal"
              onInput={suggestCount}
              className={`${inputCls} tabular`}
              placeholder="VD: 20"
            />
          </Field>
          <Field label="Số con">
            <input
              ref={countRef}
              name="shrimp_count"
              inputMode="numeric"
              onInput={(e) => {
                e.currentTarget.dataset.touched = '1';
              }}
              className={`${inputCls} tabular`}
              placeholder="Tự tính 35 con/kg"
            />
          </Field>
        </div>
      </div>

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
