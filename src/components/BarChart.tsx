// Biểu đồ cột SVG thuần — không phụ thuộc thư viện ngoài.
import { formatCurrencyCompact } from '@/lib/format';

export type Bar = { label: string; value: number };

export function BarChart({ data, height = 200 }: { data: Bar[]; height?: number }) {
  if (data.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted">
        Chưa có dữ liệu.
      </div>
    );
  }

  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const hasNegative = data.some((d) => d.value < 0);

  return (
    <div className="p-4">
      <div
        className="flex items-end gap-2"
        style={{ height }}
        role="img"
        aria-label="Biểu đồ cột"
      >
        {data.map((d, i) => {
          const pct = (Math.abs(d.value) / max) * 100;
          const positive = d.value >= 0;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end h-full">
              <span className="mb-1 text-[10px] tabular text-muted">
                {formatCurrencyCompact(d.value)}
              </span>
              <div
                className={`w-full rounded-t ${
                  hasNegative && !positive ? 'bg-negative/70' : 'bg-accent/80'
                }`}
                style={{ height: `${Math.max(pct, 1)}%` }}
                title={`${d.label}: ${formatCurrencyCompact(d.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-muted truncate">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
