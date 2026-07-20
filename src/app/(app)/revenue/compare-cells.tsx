// Ô dùng chung cho 2 bảng so sánh doanh thu (ngày & tuần).
import { formatCurrency } from '@/lib/format';

/** Ô doanh thu kỳ trước (mờ), '—' nếu kỳ đó chưa có dữ liệu. */
export function PrevCell({ value }: { value: number | null }) {
  return (
    <td className="px-4 py-2.5 text-right tabular text-muted whitespace-nowrap">
      {value === null ? '—' : formatCurrency(value)}
    </td>
  );
}

/** % chênh lệch: tăng = xanh dương, giảm = đỏ. */
export function DiffCell({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <td className="px-4 py-2.5 text-right tabular text-muted">—</td>;
  }
  const up = pct >= 0;
  return (
    <td
      className={`px-4 py-2.5 text-right tabular font-medium whitespace-nowrap ${
        up ? 'text-blue-600' : 'text-negative'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </td>
  );
}
