// Component UI dùng chung: thẻ số liệu, khối trang, trạng thái rỗng, bảng.
import { formatCurrency } from '@/lib/format';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  amount,
  tone = 'neutral',
  hint,
}: {
  label: string;
  amount: number;
  tone?: 'neutral' | 'positive' | 'negative' | 'auto';
  hint?: string;
}) {
  // 'auto' dành cho Lãi/Lỗ: lãi (>=0) xanh dương, lỗ đỏ.
  const color =
    tone === 'auto'
      ? amount >= 0
        ? 'text-blue-600'
        : 'text-negative'
      : tone === 'positive'
        ? 'text-positive'
        : tone === 'negative'
          ? 'text-negative'
          : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular ${color}`}>
        {formatCurrency(amount)}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface ${className}`}>
      {title && (
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-medium">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-muted">{message}</div>
  );
}
