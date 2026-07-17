'use client';

import { useState, useTransition } from 'react';
import type { RegenState } from './actions';

export type ShareTexts = {
  /** Nhãn ô link, vd "Link nhập bán hàng". */
  linkLabel: string;
  /** Chú thích dưới ô link. */
  help: string;
  /** Placeholder ô slug, vd "ebisen". */
  slugPlaceholder: string;
};

export function SharePanel({
  initialToken,
  baseUrl,
  basePath,
  regenerateAction,
  setSlugAction,
  texts,
}: {
  initialToken: string | null;
  baseUrl: string;
  basePath: string; // '/nhap' | '/xem'
  regenerateAction: () => Promise<RegenState>;
  setSlugAction: (slug: string) => Promise<RegenState>;
  texts: ShareTexts;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RegenState>({ token: null, error: null });
  const [copied, setCopied] = useState(false);
  const [slug, setSlugInput] = useState('');

  // Token hiển thị = token mới (sau khi tạo lại) hoặc token ban đầu.
  const token = result.token ?? initialToken;
  const url = token ? `${baseUrl}${basePath}/${token}` : '';

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const saveSlug = () => {
    const s = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(s)) {
      setResult({
        token: null,
        error: 'Chỉ dùng chữ thường, số, gạch ngang (3–40 ký tự).',
      });
      return;
    }
    if (
      token &&
      !window.confirm(
        `Đổi link thành ...${basePath}/${s} sẽ vô hiệu link cũ. Ai đang dùng link cũ sẽ phải nhận link mới. Tiếp tục?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await setSlugAction(s);
      setResult(r);
      if (r.token) {
        setSlugInput('');
        setCopied(false);
      }
    });
  };

  const regenerate = () => {
    if (
      token &&
      !window.confirm(
        'Tạo link ngẫu nhiên sẽ vô hiệu link cũ. Ai đang dùng link cũ sẽ phải nhận link mới. Tiếp tục?',
      )
    ) {
      return;
    }
    startTransition(async () => {
      const r = await regenerateAction();
      setResult(r);
      setCopied(false);
    });
  };

  return (
    <div className="space-y-4">
      {token ? (
        <div>
          <label className="block text-sm font-medium mb-1">
            {texts.linkLabel}
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
          <p className="mt-2 text-xs text-muted">{texts.help}</p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Chưa có link nào đang hoạt động. Bấm nút bên dưới để tạo.
        </p>
      )}

      <div className="border-t border-border pt-4">
        <label className="block text-sm font-medium mb-1">
          Đổi đường dẫn (ngắn, dễ nhớ)
        </label>
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex flex-1 min-w-[220px] items-center rounded-lg border border-border bg-white pl-3 text-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
            <span className="text-muted whitespace-nowrap">...{basePath}/</span>
            <input
              value={slug}
              onChange={(e) => setSlugInput(e.target.value)}
              placeholder={texts.slugPlaceholder}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent px-1 py-2 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={saveSlug}
            disabled={pending || slug.trim().length === 0}
            className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Đang lưu…' : 'Lưu đường dẫn'}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Chỉ chữ thường, số và gạch ngang (3–40 ký tự). Lưu ý: đường dẫn ngắn dễ
          đoán hơn — người ngoài biết có thể mò ra link.
        </p>

        {result.error && (
          <p className="mt-2 text-sm text-negative">{result.error}</p>
        )}

        <button
          type="button"
          onClick={regenerate}
          disabled={pending}
          className="mt-3 text-xs text-muted underline hover:text-foreground disabled:opacity-50"
        >
          hoặc tạo link ngẫu nhiên (thu hồi link cũ)
        </button>
      </div>
    </div>
  );
}
