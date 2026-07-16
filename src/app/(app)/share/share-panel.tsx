'use client';

import { useState, useTransition } from 'react';
import { regenerateLink, type RegenState } from './actions';

export function SharePanel({
  initialToken,
  baseUrl,
}: {
  initialToken: string | null;
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RegenState>({ token: null, error: null });
  const [copied, setCopied] = useState(false);

  // Token hiển thị = token mới (sau khi tạo lại) hoặc token ban đầu.
  const token = result.token ?? initialToken;
  const url = token ? `${baseUrl}/nhap/${token}` : '';

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const regenerate = () => {
    if (
      token &&
      !window.confirm(
        'Tạo link mới sẽ vô hiệu link cũ. Nhân viên đang dùng link cũ sẽ phải nhận link mới. Tiếp tục?',
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await regenerateLink();
      setResult(r);
      setCopied(false);
    });
  };

  return (
    <div className="space-y-4">
      {token ? (
        <div>
          <label className="block text-sm font-medium mb-1">
            Link nhập bán hàng
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm hover:bg-background"
            >
              {copied ? '✓ Đã chép' : 'Sao chép'}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Gửi link này cho nhân viên. Ai có link đều nhập được bán hàng (không
            cần đăng nhập), nhưng không xem được báo cáo hay P&amp;L.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Chưa có link nào đang hoạt động. Bấm nút bên dưới để tạo.
        </p>
      )}

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="rounded-lg border border-negative/40 px-4 py-2 text-sm font-medium text-negative hover:bg-negative/5 disabled:opacity-50"
        >
          {pending
            ? 'Đang tạo…'
            : token
              ? 'Tạo lại link (thu hồi link cũ)'
              : 'Tạo link'}
        </button>
        {result.error && (
          <p className="mt-2 text-sm text-negative">{result.error}</p>
        )}
      </div>
    </div>
  );
}
