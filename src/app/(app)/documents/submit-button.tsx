'use client';
import { useFormStatus } from 'react-dom';

export function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Đang tải lên…' : 'Tải lên'}
    </button>
  );
}
