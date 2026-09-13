'use client';

import { useActionState } from 'react';
import type { SupermarketState } from './actions';

const initial: SupermarketState = { ok: false, error: null };

const inputCls =
  'w-16 rounded border border-border bg-background px-2 py-1 text-right text-sm tabular outline-none focus:border-accent';

export function UpdateSoldForm({
  id,
  currentSold,
  action,
}: {
  id: string;
  currentSold: number | null;
  action: (state: SupermarketState, formData: FormData) => Promise<SupermarketState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="flex items-center justify-end gap-1">
      <input type="hidden" name="id" value={id} />
      <input
        name="quantity_sold"
        type="number"
        min="0"
        defaultValue={currentSold ?? ''}
        placeholder="—"
        className={inputCls}
      />
      <button
        type="submit"
        disabled={pending}
        className={`rounded px-2 py-1 text-xs font-medium transition ${
          state.ok
            ? 'bg-positive/10 text-positive'
            : 'bg-accent text-accent-fg hover:opacity-90'
        } disabled:opacity-50`}
      >
        {pending ? '…' : state.ok ? '✓ Đã lưu' : 'Lưu'}
      </button>
      {state.error && <span className="text-xs text-negative">{state.error}</span>}
    </form>
  );
}
