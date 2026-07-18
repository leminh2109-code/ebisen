'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createShrimpGift, type EntryState } from '../actions';
import { today } from '@/lib/format';
import type { MenuItem } from '@/lib/queries';

const initial: EntryState = { ok: false, error: null };

export default function GiftForm({ menu }: { menu: MenuItem[] }) {
  const [state, action, pending] = useActionState(createShrimpGift, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Ưu tiên chọn sẵn bánh 1 tôm (loại hay tặng nhất).
  const defaultItem = menu.find((m) => m.name.includes('1 tôm')) ?? menu[0];

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      qtyRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <Field label="Ngày tặng" required>
        <input name="gift_date" type="date" required defaultValue={today()} className={inputCls} />
      </Field>

      <Field label="Loại bánh" required>
        <select name="menu_item_id" required defaultValue={defaultItem?.id ?? ''} className={inputCls}>
          <option value="" disabled>
            — Chọn loại bánh —
          </option>
          {menu.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.shrimp_per_unit} con tôm/bánh)
            </option>
          ))}
        </select>
        {menu.length === 0 && (
          <p className="mt-1 text-xs text-negative">
            Chưa có món nào. Chủ DN vào trang Thực đơn để thêm.
          </p>
        )}
      </Field>

      <Field label="Số lượng bánh tặng" required>
        <input
          ref={qtyRef}
          name="quantity"
          inputMode="numeric"
          required
          className={`${inputCls} tabular`}
          placeholder="VD: 10"
        />
      </Field>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} placeholder="VD: tặng khách quen, đối tác…" />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending || menu.length === 0}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu bánh tặng'}
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
