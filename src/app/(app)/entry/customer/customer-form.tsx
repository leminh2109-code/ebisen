'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createCustomerOrder, type CustomerState } from '../../customers/actions';
import { today } from '@/lib/format';
import type { MenuItem } from '@/lib/queries';

const initial: CustomerState = { ok: false, error: null };

type CustomerAction = (state: CustomerState, formData: FormData) => Promise<CustomerState>;

export default function CustomerForm({
  menu,
  action: actionProp = createCustomerOrder,
  token,
}: {
  menu: MenuItem[];
  /** Server action (state, formData). Mặc định createCustomerOrder (bản đăng nhập). */
  action?: CustomerAction;
  /** Token của link công khai — chèn vào formData để server xác thực. */
  token?: string;
}) {
  const [state, action, pending] = useActionState(actionProp, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      phoneRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {token && <input type="hidden" name="token" value={token} />}
      <Field label="Số điện thoại" required>
        <input
          ref={phoneRef}
          name="phone"
          inputMode="tel"
          required
          className={inputCls}
          placeholder="VD: 0909 123 456"
        />
        <p className="mt-1 text-xs text-muted">
          Nhập SĐT đã có sẵn sẽ tự gộp vào khách cũ (thêm lần mua mới).
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tên khách">
          <input name="name" className={inputCls} placeholder="VD: Chị Lan" />
        </Field>
        <Field label="Ngày mua" required>
          <input name="order_date" type="date" required defaultValue={today()} className={inputCls} />
        </Field>
      </div>

      <Field label="Địa chỉ">
        <input name="address" className={inputCls} placeholder="VD: 12 Nguyễn Trãi, Q.1" />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Loại bánh" required>
          <select name="menu_item_id" required defaultValue="" className={inputCls}>
            <option value="" disabled>
              — Chọn loại bánh —
            </option>
            {menu.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Số lượng bánh" required>
          <input
            name="quantity"
            inputMode="numeric"
            required
            className={`${inputCls} tabular`}
            placeholder="VD: 5"
          />
        </Field>
      </div>

      <Field label="Ghi chú">
        <textarea name="note" rows={2} className={inputCls} placeholder="VD: thích ăn giòn, giao tận nhà…" />
      </Field>

      {state.error && <p className="text-sm text-negative">{state.error}</p>}
      {state.ok && <p className="text-sm text-positive">✓ Đã lưu khách + lần mua. Nhập tiếp bên dưới.</p>}

      <button
        type="submit"
        disabled={pending || menu.length === 0}
        className="w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Đang lưu…' : 'Lưu khách hàng'}
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
