import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="EBISEN"
            className="mx-auto h-16 w-16 rounded-xl object-contain"
          />
          <h1 className="mt-4 text-2xl font-semibold">EBISEN</h1>
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
