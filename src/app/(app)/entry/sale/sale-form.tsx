'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createSale, type EntryState } from '../actions';
import { formatCurrency } from '@/lib/format';
import { groupDigits, formatMoneyInput } from '@/lib/number-input';
import type { MenuItem, Employee } from '@/lib/queries';

const initial: EntryState = { ok: false, error: null };
const parse = (s: string) => Number(s.replace(/[.\s,]/g, '')) || 0;

type SaleAction = (state: EntryState, formData: FormData) => Promise<EntryState>;

export default function SaleForm({
  menu,
  employees,
  action = createSale,
  token,
}: {
  menu: MenuItem[];
  employees: Employee[];
  /** Server action nhận (state, formData). Mặc định createSale (bản đăng nhập). */
  action?: SaleAction;
  /** Token của link công khai — chèn vào formData để server xác thực. */
  token?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const sourceRef = useRef<HTMLSelectElement>(null);
  const firstQtyRef = useRef<HTMLInputElement>(null);

  // Tô màu ô Nguồn theo giá trị: TM = đỏ, CK = xanh dương (tương phản).
  const paintSource = () => {
    const el = sourceRef.current;
    if (!el) return;
    el.classList.remove('text-negative', 'text-blue-600', 'font-medium');
    if (el.value === 'TM') el.classList.add('text-negative', 'font-medium');
    else if (el.value === 'CK') el.classList.add('text-blue-600', 'font-medium');
  };

  // Thành tiền = tổng (SL × đơn giá) của mọi món trong form.
  const recompute = () => {
    const form = formRef.current;
    if (!form || !totalRef.current) return;
    let total = 0;
    for (const m of menu) {
      const qty = parse((form.elements.namedItem(`qty_${m.id}`) as HTMLInputElement)?.value ?? '');
      const price = parse((form.elements.namedItem(`price_${m.id}`) as HTMLInputElement)?.value ?? '');
      total += qty * price;
    }
    totalRef.current.textContent = formatCurrency(total);
  };

  const onPriceInput = (e: React.FormEvent<HTMLInputElement>) => {
    formatMoneyInput(e.currentTarget);
    recompute();
  };

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset(); // khôi phục đơn giá mặc định (defaultValue) + xóa SL
      if (totalRef.current) totalRef.current.textContent = formatCurrency(0);
      paintSource();
      firstQtyRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {token && <input type="hidden" name="token" value={token} />}

      <div>
        <label className="block text-sm font-medium mb-1">
          Món &amp; số lượng<span className="text-negative"> *</span>
        </label>
        <p className="mb-2 text-xs text-muted">
          Điền số lượng cho từng loại bánh trong cùng đơn (bỏ trống loại không bán).
        </p>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_7.5rem] gap-2 bg-background px-3 py-2 text-xs font-medium text-muted">
            <span>Loại bánh</span>
            <span className="text-right">SL</span>
            <span className="text-right">Đơn giá (₫)</span>
          </div>
          {menu.map((m, i) => (
            <div
              key={m.id}
              className="grid grid-cols-[1fr_5rem_7.5rem] items-center gap-2 border-t border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{m.name}</span>
              <input
                ref={i === 0 ? firstQtyRef : undefined}
                name={`qty_${m.id}`}
                inputMode="numeric"
                onInput={recompute}
                className={`${inputCls} tabular text-right`}
                placeholder="0"
              />
              <input
                name={`price_${m.id}`}
                inputMode="numeric"
                defaultValue={groupDigits(String(m.price))}
                onInput={onPriceInput}
                className={`${inputCls} tabular text-right`}
              />
            </div>
          ))}
        </div>
        {menu.length === 0 && (
          <p className="mt-1 text-xs text-negative">
            Chưa có món nào. Chủ DN vào trang Thực đơn để thêm.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-background px-3 py-2 text-sm flex justify-between">
        <span className="text-muted">Thành tiền</span>
        <span ref={totalRef} className="font-semibold tabular">
          {formatCurrency(0)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nguồn">
          <select
            ref={sourceRef}
            name="source"
            defaultValue="TM"
            onChange={paintSource}
            className={`${inputCls} text-negative font-medium`}
          >
            <option value="TM" className="text-negative">
              TM (tiền mặt)
            </option>
            <option value="CK" className="text-blue-600">
              CK (chuyển khoản)
            </option>
          </select>
        </Field>
        <Field label="Nhân viên">
          <select name="staff_id" defaultValue="" className={inputCls}>
            <option value="">— Chọn nhân viên —</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          {employees.length === 0 && (
            <p className="mt-1 text-xs text-muted">
              Chưa có nhân viên. Chủ DN vào trang Nhân viên để thêm.
            </p>
          )}
        </Field>
      </div>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending || menu.length === 0}
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
