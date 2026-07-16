'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createEmployee, updateEmployee, type EmployeeState } from './actions';
import type { Employee } from '@/lib/queries';

const initial: EmployeeState = { ok: false, error: null };

export function AddEmployee() {
  const [state, action, pending] = useActionState(createEmployee, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[140px]">
        <label className="block text-sm font-medium mb-1">Tên nhân viên</label>
        <input name="name" required className={inputCls} placeholder="VD: Chị Lan" />
      </div>
      <div className="w-44">
        <label className="block text-sm font-medium mb-1">SĐT</label>
        <input
          name="phone"
          inputMode="tel"
          className={`${inputCls} tabular`}
          placeholder="Không bắt buộc"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang thêm…' : 'Thêm NV'}
      </button>
      {state.error && <p className="w-full text-sm text-negative">{state.error}</p>}
    </form>
  );
}

export function EmployeeRow({ item }: { item: Employee }) {
  const [state, action, pending] = useActionState(updateEmployee, initial);

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-0"
    >
      <input type="hidden" name="id" value={item.id} />
      <input
        name="name"
        defaultValue={item.name}
        required
        className={`${inputCls} min-w-[120px] flex-1`}
      />
      <input
        name="phone"
        inputMode="tel"
        defaultValue={item.phone ?? ''}
        placeholder="SĐT"
        className={`${inputCls} w-36 tabular`}
      />
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" name="active" defaultChecked={item.active} />
        Đang làm
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
