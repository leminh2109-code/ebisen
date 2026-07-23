'use client';

import { useTransition } from 'react';

export type DeleteAction = (formData: FormData) => Promise<void>;

export function DeleteDocumentButton({ id, storagePath, name, action }: {
  id: string;
  storagePath: string;
  name: string;
  action: DeleteAction;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Xóa tài liệu "${name}"?`)) return;
    const fd = new FormData();
    fd.set('id', id);
    fd.set('storage_path', storagePath);
    startTransition(async () => { await action(fd); });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-md border border-negative/40 px-2.5 py-1 text-xs font-medium text-negative hover:bg-negative/10 disabled:opacity-50"
    >
      {pending ? '…' : 'Xóa'}
    </button>
  );
}
