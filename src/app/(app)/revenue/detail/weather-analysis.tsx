import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import type { WeatherRevenue } from '@/lib/queries';

const EMOJI: Record<string, string> = {
  Nắng: '☀️',
  'Ít mây': '⛅',
  'Nhiều mây': '☁️',
  'Sương mù': '🌫️',
  Mưa: '🌧️',
  Giông: '⛈️',
};

const n = (v: number | null) => Number(v ?? 0).toLocaleString('vi-VN');

export function WeatherAnalysis({ stats }: { stats: WeatherRevenue[] }) {
  return (
    <Card title="Doanh thu theo thời tiết (Trạm V52 · Gia Lộc, Hải Dương)" className="mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-2 font-medium">Thời tiết</th>
              <th className="px-4 py-2 font-medium text-right">Số ngày</th>
              <th className="px-4 py-2 font-medium text-right">Doanh thu TB/ngày</th>
              <th className="px-4 py-2 font-medium text-right">Bánh TB/ngày</th>
              <th className="px-4 py-2 font-medium text-right">Cảm nhận TB</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((w) => (
              <tr key={w.weather_cond} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">
                  <span className="mr-1.5">{EMOJI[w.weather_cond] ?? '🌡️'}</span>
                  {w.weather_cond}
                </td>
                <td className="px-4 py-2.5 text-right tabular">{n(w.days)}</td>
                <td className="px-4 py-2.5 text-right tabular font-medium">
                  {formatCurrency(w.avg_revenue)}
                </td>
                <td className="px-4 py-2.5 text-right tabular">{n(w.avg_cakes)} bánh</td>
                <td className="px-4 py-2.5 text-right tabular text-muted">
                  {w.avg_feels === null ? '—' : `${w.avg_feels}°`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-3 text-xs text-muted">
        Trung bình mỗi ngày theo điều kiện thời tiết. &quot;Cảm nhận&quot; = nhiệt độ
        cảm nhận (tính cả độ ẩm, sát cảm giác thực tế). Phân loại theo số giờ nắng +
        lượng mưa trong ngày (không theo mã thời tiết). Nguồn: Open-Meteo, khu vực Trạm
        V52 (Km52 cao tốc Hà Nội – Hải Phòng).
      </p>
    </Card>
  );
}
