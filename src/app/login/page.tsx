import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-fg text-xl font-bold">
            e
          </div>
          <h1 className="mt-4 text-2xl font-semibold">ebisen</h1>
          <p className="mt-1 text-sm text-muted">Quản lý hoạt động kinh doanh</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
