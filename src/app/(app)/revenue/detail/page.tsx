import Link from 'next/link';
import { getSales, getCurrentRole, getWeatherByDay, getRevenueByWeather } from '@/lib/queries';
import { formatCurrency, today } from '@/lib/format';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { SalesDetailTable } from './sales-detail-table';
import { WeatherAnalysis } from './weather-analysis';
import { groupByMonthDay } from './group';

export const dynamic = 'force-dynamic';

export default async function SalesDetailPage() {
  const [sales, role, weatherByDay, weatherStats] = await Promise.all([
    getSales(),
    getCurrentRole(),
    getWeatherByDay(),
    getRevenueByWeather(),
  ]);
  const total = sales.reduce((s, i) => s + Number(i.amount), 0);
  const qty = sales.reduce((s, i) => s + Number(i.quantity), 0);
  const months = groupByMonthDay(sales, weatherByDay);

  return (
    <div>
      <PageHeader
        title="Bán hàng chi tiết"
        subtitle={`${sales.length} lần bán · ${qty} bánh · ${formatCurrency(total)}`}
        action={
          <div className="flex items-center gap-2">
            {role === 'owner' && (
              <Link
                href="/share"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background"
              >
                Chia sẻ link
              </Link>
            )}
            <Link
              href="/entry/sale"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              + Nhập bán hàng
            </Link>
          </div>
        }
      />

      {weatherStats.length > 0 && <WeatherAnalysis stats={weatherStats} />}

      {sales.length === 0 ? (
        <Card>
          <EmptyState message="Chưa có lần bán nào." />
        </Card>
      ) : (
        <SalesDetailTable months={months} todayKey={today()} />
      )}
    </div>
  );
}
