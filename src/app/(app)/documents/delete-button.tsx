'use client';

import { useTransition } from 'react';
import { deleteDocument } from './actions';

export function DeleteDocumentButton({ id, storagePath, name }: {
  id: string;
  storagePath: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Xóa tài liệu "${name}"?`)) return;
    const fd = new FormData();
    fd.set('id', id);
    fd.set('storage_path', storagePath);
    startTransition(() => deleteDocument(fd));
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
