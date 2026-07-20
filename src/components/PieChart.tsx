// Biểu đồ tròn (donut) SVG thuần — không phụ thuộc thư viện ngoài, như BarChart.
// Vẽ bằng stroke-dasharray trên <circle> thay vì path arc: xử lý đúng cả trường
// hợp 1 nhóm chiếm 100% (arc cùng điểm đầu/cuối sẽ không vẽ ra gì).
import { formatCurrency } from '@/lib/format';

export type Slice = { label: string; value: number };

/** Bảng màu tương phản, đọc rõ trên nền sáng. */
const COLORS = [
  '#0f766e', // teal
  '#2563eb', // blue
  '#f59e0b', // amber
  '#dc2626', // red
  '#7c3aed', // violet
  '#059669', // emerald
  '#db2777', // pink
  '#0891b2', // cyan
  '#65a30d', // lime
  '#ea580c', // orange
  '#64748b', // slate (dành cho "Khác")
];

/** Gộp các nhóm nhỏ thành "Khác" để biểu đồ không bị vụn. */
const MAX_SLICES = 8;

export function PieChart({ data }: { data: Slice[] }) {
  const cleaned = data.filter((d) => Number(d.value) > 0);
  const total = cleaned.reduce((s, d) => s + Number(d.value), 0);

  if (total <= 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-muted">Chưa có dữ liệu.</div>
    );
  }

  const sorted = [...cleaned].sort((a, b) => Number(b.value) - Number(a.value));
  const shown: Slice[] =
    sorted.length > MAX_SLICES
      ? [
          ...sorted.slice(0, MAX_SLICES),
          {
            label: 'Khác',
            value: sorted.slice(MAX_SLICES).reduce((s, d) => s + Number(d.value), 0),
          },
        ]
      : sorted;

  const R = 60;
  const C = 2 * Math.PI * R;
  // Offset tích lũy tính thuần, không gán lại biến ngoài (rule react-hooks/immutability).
  const slices = shown.map((d, i) => {
    const frac = Number(d.value) / total;
    const before = shown.slice(0, i).reduce((s, x) => s + Number(x.value), 0);
    return {
      ...d,
      frac,
      len: frac * C,
      offset: (before / total) * C,
      color: d.label === 'Khác' ? COLORS[COLORS.length - 1] : COLORS[i % (COLORS.length - 1)],
    };
  });

  return (
    <div className="flex flex-col items-center gap-5 p-4 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 160 160"
        className="h-40 w-40 shrink-0"
        role="img"
        aria-label="Biểu đồ tròn cơ cấu chi phí"
      >
        <g transform="rotate(-90 80 80)">
          {slices.map((s) => (
            <circle
              key={s.label}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="30"
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.offset}
            >
              <title>{`${s.label}: ${formatCurrency(s.value)} (${(s.frac * 100).toFixed(1)}%)`}</title>
            </circle>
          ))}
        </g>
        {/* Tổng ở giữa donut */}
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-muted"
          style={{ fontSize: 9 }}
        >
          Tổng
        </text>
        <text
          x="80"
          y="90"
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          {compact(total)}
        </text>
      </svg>

      <ul className="w-full space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="shrink-0 tabular text-muted">{formatCurrency(s.value)}</span>
            <span className="w-11 shrink-0 text-right tabular font-medium">
              {(s.frac * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "35.964.000" → "36,0tr" cho vừa giữa vòng tròn. */
function compact(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace('.', ',')}tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}
