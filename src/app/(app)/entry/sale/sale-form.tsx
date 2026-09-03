'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createSale, type EntryState } from '../actions';
import { formatCurrency } from '@/lib/format';
import { groupDigits, formatMoneyInput } from '@/lib/number-input';
import type { MenuItem, Employee, CustomerOption } from '@/lib/queries';

const initial: EntryState = { ok: false, error: null };
const parse = (s: string) => Number(s.replace(/[.\s,]/g, '')) || 0;

const LOYAL_PRICE_2TOM = 90_000;

type SaleAction = (state: EntryState, formData: FormData) => Promise<EntryState>;

export default function SaleForm({
  menu,
  employees,
  customers = [],
  action = createSale,
  token,
}: {
  menu: MenuItem[];
  employees: Employee[];
  customers?: CustomerOption[];
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

  // Khách cũ: chọn từ danh sách để hiện tổng bánh đã mua.
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Khách quen: giữ giá 2-tôm = 90k dù menu đã đổi lên 100k.
  const loyalRef = useRef(false);
  const [loyalUI, setLoyalUI] = useState(false);

  // Không dùng túi bạc.
  const noBagRef = useRef(false);
  const [noBagUI, setNoBagUI] = useState(false);
  const noBagInputRef = useRef<HTMLInputElement>(null);

  const toggleNoBag = () => {
    const next = !noBagRef.current;
    noBagRef.current = next;
    setNoBagUI(next);
    if (noBagInputRef.current) noBagInputRef.current.value = next ? 'true' : 'false';
  };
  const twoTomItem = menu.find((m) => m.name === '2 tôm');
  const showLoyal = twoTomItem && twoTomItem.price > LOYAL_PRICE_2TOM;

  // Áp giá khách quen cho ô đơn giá 2-tôm (DOM, không setState).
  const applyLoyalDOM = (checked: boolean) => {
    if (!twoTomItem) return;
    const input = formRef.current?.elements.namedItem(`price_${twoTomItem.id}`) as HTMLInputElement | null;
    if (!input) return;
    input.value = groupDigits(String(checked ? LOYAL_PRICE_2TOM : twoTomItem.price));
  };

  const toggleLoyal = (checked: boolean) => {
    loyalRef.current = checked;
    setLoyalUI(checked);
    applyLoyalDOM(checked);
    recompute();
  };

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
      // Nếu đang bật khách quen, re-apply giá 90k sau khi reset (reset trả về defaultValue 100k).
      if (loyalRef.current) applyLoyalDOM(true);
      // Reset túi bạc mỗi đơn (mỗi khách khác nhau).
      noBagRef.current = false;
      setNoBagUI(false);
      if (noBagInputRef.current) noBagInputRef.current.value = 'false';
      setSelectedCustomer(null);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {token && <input type="hidden" name="token" value={token} />}
      <input ref={noBagInputRef} type="hidden" name="no_bag" defaultValue="false" />

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
              className={`grid grid-cols-[1fr_5rem_7.5rem] items-center gap-2 border-t border-border px-3 py-2 ${
                m.is_box ? 'bg-amber-50/50' : ''
              }`}
            >
              <span className="text-sm font-medium">
                {m.name}
                {m.is_box && <span className="ml-1.5 text-[10px] font-normal text-amber-600 bg-amber-100 rounded px-1">hộp</span>}
              </span>
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

        {showLoyal && (
          <button
            type="button"
            onClick={() => toggleLoyal(!loyalRef.current)}
            className={`mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
              loyalUI
                ? 'border-amber-400 bg-amber-50 font-medium text-amber-700'
                : 'border-border text-muted hover:border-accent'
            }`}
          >
            <span className="text-base leading-none">{loyalUI ? '★' : '☆'}</span>
            <span>
              {loyalUI
                ? 'Đang giảm 2 tôm → 90.000 đ (khách quen)'
                : 'Khách quen? Bấm để giảm 2 tôm → 90.000 đ'}
            </span>
            {loyalUI && (
              <span className="ml-auto text-xs font-normal text-amber-600">
                Bấm để tắt
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={toggleNoBag}
          className={`mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
            noBagUI
              ? 'border-sky-400 bg-sky-50 font-medium text-sky-700'
              : 'border-border text-muted hover:border-accent'
          }`}
        >
          <span className="text-base leading-none">{noBagUI ? '🚫' : '🛍️'}</span>
          <span>
            {noBagUI
              ? 'Không dùng túi bạc — đã tích'
              : 'Khách không dùng túi bạc? Bấm để tích'}
          </span>
          {noBagUI && (
            <span className="ml-auto text-xs font-normal text-sky-600">
              Bấm để bỏ
            </span>
          )}
        </button>
      </div>

      <div className="rounded-lg bg-background px-3 py-2 text-sm flex justify-between">
        <span className="text-muted">Thành tiền</span>
        <span ref={totalRef} className="font-semibold tabular">
          {formatCurrency(0)}
        </span>
      </div>

      {customers.length > 0 && (
        <Field label="Khách hàng">
          <select
            name="customer_id"
            defaultValue=""
            onChange={(e) => {
              const c = customers.find((c) => c.id === e.target.value) ?? null;
              setSelectedCustomer(c);
            }}
            className={inputCls}
          >
            <option value="">— Khách vãng lai —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.phone}{c.name ? ` · ${c.phone}` : ''}
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <p className="mt-1 text-xs font-medium text-accent">
              ★ {selectedCustomer.name ?? selectedCustomer.phone} — đã mua {selectedCustomer.total_qty} bánh
            </p>
          )}
        </Field>
      )}

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
