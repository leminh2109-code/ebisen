'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createMenuItem, updateMenuItem, type MenuState } from './actions';
import { formatCurrency } from '@/lib/format';
import type { MenuItem } from '@/lib/queries';

const initial: MenuState = { ok: false, error: null };

export function AddMenuItem() {
  const [state, action, pending] = useActionState(createMenuItem, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-sm font-medium mb-1">Tên món</label>
        <input name="name" required className={inputCls} placeholder="VD: 3 tôm" />
      </div>
      <div className="w-40">
        <label className="block text-sm font-medium mb-1">Giá (₫)</label>
        <input name="price" inputMode="numeric" required className={`${inputCls} tabular`} placeholder="110.000" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang thêm…' : 'Thêm món'}
      </button>
      {state.error && <p className="w-full text-sm text-negative">{state.error}</p>}
    </form>
  );
}

export function MenuRow({ item }: { item: MenuItem }) {
  const [state, action, pending] = useActionState(updateMenuItem, initial);

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0"
    >
      <input type="hidden" name="id" value={item.id} />
      <span className="font-medium min-w-[100px]">{item.name}</span>
      <input
        name="price"
        inputMode="numeric"
        defaultValue={String(item.price)}
        className={`${inputCls} w-32 tabular`}
      />
      <span className="text-xs text-muted">{formatCurrency(item.price)}</span>
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" name="active" defaultChecked={item.active} />
        Còn bán
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu'}
      </button>
      {state.ok && <span className="text-sm text-positive">✓</span>}
      {state.error && <span className="text-sm text-negative">{state.error}</span>}
    </form>
  );
}

const inputCls =
  'rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';
