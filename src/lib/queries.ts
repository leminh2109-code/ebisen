// Data-access layer: mọi truy vấn báo cáo đọc từ Postgres views.
// Toàn bộ số liệu tính ở DB (xem supabase/migrations/0002_redesign.sql), không tính ở đây.
// Nguồn doanh thu chính thức = daily_revenue.
import { createClient } from '@/lib/supabase/server';

export type MonthlyRevenue = { month: string; days: number; revenue: number; cakes: number };
export type DailyRevenue = {
  day: string;
  revenue: number;
  cakes: number | null;
  shrimp_used: number | null;
  station_traffic: number | null;
  weather: string | null;
};
export type MonthlyExpense = { month: string; expense_count: number; expenses: number };
export type MonthlyPnl = { month: string; revenue: number; expenses: number; profit: number };
export type CategoryExpense = { month: string; category: string; expenses: number };
export type SaleRow = {
  id: string;
  sale_date: string;
  cake_type: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  source: string | null;
  staff: string | null;
  note: string | null;
};

export async function getRevenueByMonth(): Promise<MonthlyRevenue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('revenue_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRevenueByDay(month?: string): Promise<DailyRevenue[]> {
  const supabase = await createClient();
  let q = supabase.from('revenue_by_day').select('*').order('day', { ascending: true });
  if (month) {
    const startDate = new Date(month);
    const end = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);
    q = q.gte('day', month).lt('day', end);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getExpensesByMonth(): Promise<MonthlyExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getExpensesByCategory(month: string): Promise<CategoryExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('expenses_by_month_category')
    .select('*')
    .eq('month', month)
    .order('expenses', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPnlByMonth(): Promise<MonthlyPnl[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pnl_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSales(limit = 200): Promise<SaleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sales')
    .select('id, sale_date, cake_type, quantity, unit_price, amount, source, staff, note')
    .order('sale_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** Tổng quan tháng hiện tại cho Dashboard. */
export async function getDashboardSummary() {
  const [revByMonth, expByMonth, pnl] = await Promise.all([
    getRevenueByMonth(),
    getExpensesByMonth(),
    getPnlByMonth(),
  ]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const thisMonthRevenue = revByMonth.find((r) => r.month === currentMonth)?.revenue ?? 0;
  const thisMonthExpenses = expByMonth.find((e) => e.month === currentMonth)?.expenses ?? 0;
  const thisMonthProfit = pnl.find((p) => p.month === currentMonth)?.profit ?? 0;
  const thisMonthCakes = revByMonth.find((r) => r.month === currentMonth)?.cakes ?? 0;

  const ytdRevenue = revByMonth
    .filter((r) => r.month.startsWith(String(now.getFullYear())))
    .reduce((s, r) => s + Number(r.revenue), 0);
  const ytdProfit = pnl
    .filter((p) => p.month.startsWith(String(now.getFullYear())))
    .reduce((s, p) => s + Number(p.profit), 0);

  return {
    currentMonth,
    thisMonthRevenue,
    thisMonthExpenses,
    thisMonthProfit,
    thisMonthCakes,
    ytdRevenue,
    ytdProfit,
    pnlTrend: pnl.slice(0, 6).reverse(),
  };
}

/** Danh mục chi phí đã dùng (cho gợi ý trong form nhập). */
export async function getExpenseCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('category')
    .not('category', 'is', null)
    .limit(1000);
  const set = new Set<string>();
  for (const r of data ?? []) if (r.category) set.add(r.category);
  return [...set].sort();
}

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
};

/** Thực đơn — mọi món (cho trang quản lý). */
export async function getMenu(): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu')
    .select('id, name, price, active, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Món đang bán (cho dropdown form nhập bán hàng). */
export async function getActiveMenu(): Promise<MenuItem[]> {
  const items = await getMenu();
  return items.filter((m) => m.active);
}

/** Trung tâm chi phí đã dùng (gợi ý trong form). */
export async function getCostCenters(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('cost_center')
    .not('cost_center', 'is', null)
    .limit(1000);
  const set = new Set<string>();
  for (const r of data ?? []) if (r.cost_center) set.add(r.cost_center);
  return [...set].sort();
}

/** Loại bánh đã dùng (cho gợi ý trong form nhập bán hàng). */
export async function getCakeTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('sales')
    .select('cake_type')
    .not('cake_type', 'is', null)
    .limit(1000);
  const set = new Set<string>();
  for (const r of data ?? []) if (r.cake_type) set.add(r.cake_type);
  return [...set].sort();
}

/** Role của user hiện tại — dùng để gate trang P&L. */
export async function getCurrentRole(): Promise<'owner' | 'staff' | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return data?.role ?? null;
}
