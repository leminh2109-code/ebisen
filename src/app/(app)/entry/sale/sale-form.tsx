'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createSale, type EntryState } from '../actions';
import { today, formatCurrency } from '@/lib/format';
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
  const menuRef = useRef<HTMLSelectElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);
  const sourceRef = useRef<HTMLSelectElement>(null);

  // Tô màu ô Nguồn theo giá trị: TM = đỏ, CK = xanh dương (tương phản).
  const paintSource = () => {
    const el = sourceRef.current;
    if (!el) return;
    el.classList.remove('text-negative', 'text-blue-600', 'font-medium');
    if (el.value === 'TM') el.classList.add('text-negative', 'font-medium');
    else if (el.value === 'CK') el.classList.add('text-blue-600', 'font-medium');
  };

  const recompute = () => {
    if (totalRef.current) {
      const amount = parse(qtyRef.current?.value ?? '') * parse(priceRef.current?.value ?? '');
      totalRef.current.textContent = formatCurrency(amount);
    }
  };

  // Chọn món -> tự điền giá từ thực đơn (nhân viên vẫn sửa được để giảm giá).
  const onMenuChange = () => {
    const id = menuRef.current?.value;
    const item = menu.find((m) => m.id === id);
    if (item && priceRef.current) priceRef.current.value = groupDigits(String(item.price));
    recompute();
  };

  const onPriceInput = () => {
    if (priceRef.current) formatMoneyInput(priceRef.current);
    recompute();
  };

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      if (totalRef.current) totalRef.current.textContent = formatCurrency(0);
      paintSource();
      menuRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {token && <input type="hidden" name="token" value={token} />}
      <Field label="Ngày bán" required>
        <input name="sale_date" type="date" required defaultValue={today()} className={inputCls} />
      </Field>

      <Field label="Món" required>
        <select
          ref={menuRef}
          name="menu_item_id"
          required
          defaultValue=""
          onChange={onMenuChange}
          className={inputCls}
        >
          <option value="" disabled>
            — Chọn món —
          </option>
          {menu.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({formatCurrency(m.price)})
            </option>
          ))}
        </select>
        {menu.length === 0 && (
          <p className="mt-1 text-xs text-negative">
            Chưa có món nào. Chủ DN vào trang Thực đơn để thêm.
          </p>
        )}
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
        <Field label="Đơn giá (₫)">
          <input
            ref={priceRef}
            name="unit_price"
            inputMode="numeric"
            onInput={onPriceInput}
            className={`${inputCls} tabular`}
            placeholder="Tự điền theo món"
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
