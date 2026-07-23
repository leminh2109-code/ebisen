'use client';

import { useActionState, useRef, useEffect } from 'react';
import { uploadDocument, type ActionState } from './actions';

const CATEGORIES = [
  'Pháp lý',
  'An toàn thực phẩm',
  'Hợp đồng',
  'Thuế & Kế toán',
  'Khác',
];

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent';

const init: ActionState = { ok: false, error: null };

export function UploadForm() {
  const [state, action, pending] = useActionState(uploadDocument, init);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Tên tài liệu <span className="text-negative">*</span>
          </label>
          <input
            name="name"
            type="text"
            placeholder="Giấy chứng nhận ĐKKD"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Danh mục <span className="text-negative">*</span>
          </label>
          <select name="category" required className={inputCls}>
            <option value="">— Chọn danh mục —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          File <span className="text-negative">*</span>
          <span className="ml-1 font-normal text-muted text-xs">(PDF, JPG, PNG, HEIC · tối đa 50MB)</span>
        </label>
        <input
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
          required
          className="w-full rounded-lg border border-border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-accent hover:file:bg-accent/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Ghi chú</label>
        <input
          name="notes"
          type="text"
          placeholder="VD: Cấp ngày 01/01/2026, hết hạn 31/12/2028"
          className={inputCls}
        />
      </div>

      {state.error && (
        <p className="text-sm text-negative">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-accent">Đã tải lên thành công.</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Đang tải lên…' : 'Tải lên'}
        </button>
      </div>
    </form>
  );
}
