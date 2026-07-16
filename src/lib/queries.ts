// Data-access layer: mọi truy vấn báo cáo đọc từ Postgres views.
// Toàn bộ số liệu tính ở DB (xem supabase/migrations/0001_init.sql), không tính ở đây.
import { createClient } from '@/lib/supabase/server';

export type MonthlyRevenue = { month: string; invoice_count: number; revenue: number };
export type DailyRevenue = { day: string; invoice_count: number; revenue: number };
export type MonthlyExpense = { month: string; expense_count: number; expenses: number };
export type MonthlyPnl = { month: string; revenue: number; expenses: number; profit: number };
export type CategoryExpense = {
  month: string;
  category_id: string | null;
  category_name: string;
  expenses: number;
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  issue_date: string;
  amount: number;
  note: string | null;
  customer: { name: string } | null;
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
    // month dạng "YYYY-MM-01": lọc trong tháng đó.
    const start = month;
    const startDate = new Date(month);
    const end = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1)
      .toISOString()
      .slice(0, 10);
    q = q.gte('day', start).lt('day', end);
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

export async function getInvoices(limit = 100): Promise<InvoiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, amount, note, customer:customers(name)')
    .order('issue_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // customer là mảng khi join — chuẩn hóa về object hoặc null.
  return (data ?? []).map((r) => ({
    ...r,
    customer: Array.isArray(r.customer) ? (r.customer[0] ?? null) : r.customer,
  })) as InvoiceRow[];
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
    ytdRevenue,
    ytdProfit,
    pnlTrend: pnl.slice(0, 6).reverse(),
  };
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
