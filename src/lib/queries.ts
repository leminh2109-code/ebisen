// Data-access layer: mọi truy vấn báo cáo đọc từ Postgres views.
// Toàn bộ số liệu tính ở DB (xem supabase/migrations/0002_redesign.sql), không tính ở đây.
// Nguồn doanh thu chính thức = daily_revenue.
import { createClient } from '@/lib/supabase/server';
import type {
  PublicFormBootstrap,
  PublicSalesView,
  PublicCustomerBootstrap,
} from '@/lib/supabase/types';

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
/** Doanh thu sales tách theo hình thức thanh toán (TM/CK) trong 1 tháng. */
export type MonthlyPaymentSplit = {
  month: string;
  cash: number;
  transfer: number;
  other: number;
  total: number;
};
export type MonthlyPnl = {
  month: string;
  revenue: number;
  cash_expenses: number;
  material_cost: number;
  station_share: number; // chia sẻ 30% doanh thu với trạm
  expenses: number; // = cash_expenses + material_cost + station_share
  profit: number;
};
/** Một nhóm chi phí (theo danh mục / loại / trung tâm chi phí) trong 1 tháng. */
export type ExpenseGroupRow = {
  month: string;
  key: string;
  expense_count: number;
  expenses: number;
};
/** Chiều phân nhóm chi phí để phân tích. */
export type ExpenseDimension = 'category' | 'expense_type' | 'cost_center';
/** Một khoản chi lẻ (cho trang Chi phí chi tiết). */
export type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number;
  category: string | null;
  expense_type: string | null;
  cost_center: string | null;
  description: string | null;
};
export type SaleRow = {
  id: string;
  sale_date: string;
  sold_at: string;
  cake_type: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  source: string | null;
  staff: string | null;
  note: string | null;
};

/** Số lượng bánh bán theo tháng, tách 1 tôm / 2 tôm / khác (từ sales). */
export type MonthlySalesQty = {
  month: string;
  qty_1tom: number;
  qty_2tom: number;
  qty_other: number;
  qty_total: number;
};

export async function getSalesQtyByMonth(): Promise<MonthlySalesQty[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sales_qty_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

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

// Mỗi chiều đọc từ một view riêng; cột nhóm alias về `key` để dùng chung UI.
// Tính toán (sum/count/trim) nằm ở view — xem 0007_expense_groups.sql.
const EXPENSE_GROUP_VIEW = {
  category: { view: 'expenses_by_month_category', col: 'category' },
  expense_type: { view: 'expenses_by_month_type', col: 'expense_type' },
  cost_center: { view: 'expenses_by_month_cost_center', col: 'cost_center' },
} as const satisfies Record<ExpenseDimension, { view: string; col: string }>;

/** Chi phí nhóm theo `dimension`, mọi tháng (mới → cũ, trong tháng: lớn → nhỏ). */
export async function getExpensesGrouped(
  dimension: ExpenseDimension,
): Promise<ExpenseGroupRow[]> {
  const { view, col } = EXPENSE_GROUP_VIEW[dimension];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(view)
    .select(`month, key:${col}, expense_count, expenses`)
    .order('month', { ascending: false })
    .order('expenses', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ExpenseGroupRow[];
}

/** Toàn bộ khoản chi lẻ (mới → cũ) cho trang Chi phí chi tiết. */
export async function getExpensesDetail(): Promise<ExpenseRow[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: ExpenseRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, expense_date, amount, category, expense_type, cost_center, description')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as ExpenseRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export async function getPaymentSplitByMonth(): Promise<MonthlyPaymentSplit[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sales_payment_by_month')
    .select('*')
    .order('month', { ascending: false });
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

/**
 * Lấy TOÀN BỘ sales (mới → cũ). Phân trang theo range để vượt cap mặc định
 * 1000 dòng của PostgREST — nếu chỉ bỏ `.limit()` thì Supabase vẫn chặn thầm
 * lặng ở 1000 dòng và các ngày cũ nhất lại bị mất khỏi trang chi tiết.
 */
export async function getSales(): Promise<SaleRow[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: SaleRow[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('sales')
      .select('id, sale_date, sold_at, cake_type, quantity, unit_price, amount, source, staff, note')
      .order('sale_date', { ascending: false })
      .order('sold_at', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }

  return all;
}

/** Tồn kho tôm hiện tại (số con + kg đã nhập, đã dùng, còn lại). */
export type ShrimpInventory = {
  total_in: number;
  total_kg: number;
  total_used: number;
  on_hand: number;
  start_date: string | null;
  total_cost_in: number;
  unit_cost: number;
  inventory_value: number;
};
export type MonthlyShrimpPurchased = {
  month: string;
  purchase_count: number;
  kg: number;
  shrimp_in: number;
};
export type MonthlyShrimpUsed = { month: string; shrimp_used: number };
export type MonthlyShrimpGift = { month: string; gift_qty: number; gift_shrimp: number };
/** Một lần nhập bánh tặng (cho bảng lịch sử). */
export type ShrimpGiftRow = {
  id: string;
  gift_date: string;
  cake_type: string | null;
  quantity: number;
  note: string | null;
};
/** Một lần nhập tôm (cho bảng lịch sử). */
export type ShrimpPurchaseRow = {
  id: string;
  purchase_date: string;
  kg: number | null;
  shrimp_count: number;
  total_cost: number | null;
  note: string | null;
};

export async function getShrimpInventory(): Promise<ShrimpInventory> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('shrimp_inventory').select('*').single();
  if (error) throw error;
  return data;
}

export async function getShrimpPurchasedByMonth(): Promise<MonthlyShrimpPurchased[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shrimp_purchased_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getShrimpUsedByMonth(): Promise<MonthlyShrimpUsed[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shrimp_used_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getShrimpGiftByMonth(): Promise<MonthlyShrimpGift[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shrimp_gift_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Lịch sử bánh tặng (mới → cũ). */
export async function getShrimpGifts(): Promise<ShrimpGiftRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shrimp_gifts')
    .select('id, gift_date, cake_type, quantity, note')
    .order('gift_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Lịch sử nhập tôm (mới → cũ). */
export async function getShrimpPurchases(): Promise<ShrimpPurchaseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shrimp_purchases')
    .select('id, purchase_date, kg, shrimp_count, total_cost, note')
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Vật tư (túi, tem) ───────────────────────────────────────────────────────
/** Tồn kho một vật tư (túi/tem). */
export type MaterialInventory = {
  material: string;
  total_in: number;
  total_cost_in: number;
  unit_cost: number;
  start_date: string | null;
  used: number;
  on_hand: number;
  inventory_value: number;
};
export type MonthlyMaterialCost = {
  month: string;
  tui_cost: number;
  tem_cost: number;
  material_cost: number;
};
/** Một lần nhập vật tư (cho bảng lịch sử). */
export type MaterialPurchaseRow = {
  id: string;
  material: string;
  purchase_date: string;
  quantity: number;
  total_cost: number;
  note: string | null;
};

export async function getMaterialInventory(): Promise<MaterialInventory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('material_inventory').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function getMaterialCostByMonth(): Promise<MonthlyMaterialCost[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_cost_by_month')
    .select('*')
    .order('month', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Lịch sử nhập vật tư (mới → cũ). */
export async function getMaterialPurchases(): Promise<MaterialPurchaseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('material_purchases')
    .select('id, material, purchase_date, quantity, total_cost, note')
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Tổng quan vật tư cho trang Tồn kho vật tư. */
export async function getMaterialSummary() {
  const [inventory, costByMonth] = await Promise.all([
    getMaterialInventory(),
    getMaterialCostByMonth(),
  ]);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const thisMonthCost = costByMonth.find((c) => c.month === currentMonth)?.material_cost ?? 0;
  const tui = inventory.find((i) => i.material === 'tui') ?? null;
  const tem = inventory.find((i) => i.material === 'tem') ?? null;
  return { tui, tem, thisMonthCost, costByMonth };
}

/** Tổng quan tồn kho tôm cho trang Tồn kho + thẻ dashboard. */
export async function getShrimpSummary() {
  const [inventory, purchasedByMonth, usedByMonth, giftByMonth] = await Promise.all([
    getShrimpInventory(),
    getShrimpPurchasedByMonth(),
    getShrimpUsedByMonth(),
    getShrimpGiftByMonth(),
  ]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const thisMonthIn = purchasedByMonth.find((p) => p.month === currentMonth)?.shrimp_in ?? 0;
  const thisMonthSold = usedByMonth.find((u) => u.month === currentMonth)?.shrimp_used ?? 0;
  const thisMonthGift = giftByMonth.find((g) => g.month === currentMonth)?.gift_shrimp ?? 0;
  // Tôm dùng = bán + tặng (khớp cách tính tồn kho).
  const thisMonthUsed = Number(thisMonthSold) + Number(thisMonthGift);

  return { inventory, thisMonthIn, thisMonthSold, thisMonthGift, thisMonthUsed, currentMonth };
}

/** Tổng quan tháng hiện tại cho Dashboard. */
export async function getDashboardSummary() {
  const [revByMonth, pnl, paymentSplit] = await Promise.all([
    getRevenueByMonth(),
    getPnlByMonth(),
    getPaymentSplitByMonth(),
  ]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const thisMonthPnl = pnl.find((p) => p.month === currentMonth);
  const thisMonthRevenue = revByMonth.find((r) => r.month === currentMonth)?.revenue ?? 0;
  // Chi phí tháng = tiền mặt + vật tư lũy tiến (khớp với Lãi/Lỗ).
  const thisMonthExpenses = thisMonthPnl?.expenses ?? 0;
  const thisMonthCashExpenses = thisMonthPnl?.cash_expenses ?? 0;
  const thisMonthMaterialCost = thisMonthPnl?.material_cost ?? 0;
  const thisMonthStationShare = thisMonthPnl?.station_share ?? 0;
  const thisMonthProfit = thisMonthPnl?.profit ?? 0;
  const thisMonthCakes = revByMonth.find((r) => r.month === currentMonth)?.cakes ?? 0;
  const split = paymentSplit.find((p) => p.month === currentMonth);
  const thisMonthCash = split?.cash ?? 0;
  const thisMonthTransfer = split?.transfer ?? 0;

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
    thisMonthCashExpenses,
    thisMonthMaterialCost,
    thisMonthStationShare,
    thisMonthProfit,
    thisMonthCakes,
    thisMonthCash,
    thisMonthTransfer,
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
  shrimp_per_unit: number;
};

/** Thực đơn — mọi món (cho trang quản lý). */
export async function getMenu(): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('menu')
    .select('id, name, price, active, sort_order, shrimp_per_unit')
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

export type Employee = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
  sort_order: number;
};

/** Nhân viên — tất cả (cho trang quản lý). */
export async function getEmployees(): Promise<Employee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employees')
    .select('id, name, phone, active, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Nhân viên đang làm (cho dropdown form nhập bán hàng). */
export async function getActiveEmployees(): Promise<Employee[]> {
  const items = await getEmployees();
  return items.filter((e) => e.active);
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

/** Dữ liệu form công khai (menu + NV) theo token. Gọi RPC security definer. */
export async function getPublicFormData(token: string): Promise<PublicFormBootstrap> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('public_form_bootstrap', { p_token: token });
  if (error) throw error;
  return data as PublicFormBootstrap;
}

/** Token link nhập công khai đang active (owner đọc để hiển thị/copy). */
export async function getPublicFormToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('public_form_tokens')
    .select('token')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.token ?? null;
}

/** Bán hàng chi tiết (chỉ đọc) theo token link xem công khai. RPC security definer. */
export async function getPublicSalesView(token: string): Promise<PublicSalesView> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('public_sales_view', { p_token: token });
  if (error) throw error;
  return data as PublicSalesView;
}

/** Token link XEM công khai đang active (owner đọc để hiển thị/copy). */
export async function getPublicViewToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('public_view_tokens')
    .select('token')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.token ?? null;
}

// ─── Khách hàng (CRM) ────────────────────────────────────────────────────────
/** Một khách + thống kê (từ view customer_stats). */
export type CustomerStats = {
  id: string;
  phone: string;
  name: string | null;
  address: string | null;
  note: string | null;
  created_at: string;
  order_count: number;
  total_qty: number;
  first_order: string | null;
  last_order: string | null;
  top_cake: string | null;
};
/** Một lần mua của khách. */
export type CustomerOrderRow = {
  id: string;
  order_date: string;
  cake_type: string | null;
  quantity: number;
  note: string | null;
};

/** Danh sách khách + thống kê (mua gần nhất trước). */
export async function getCustomers(): Promise<CustomerStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('customer_stats').select('*');
  if (error) throw error;
  return data ?? [];
}

/** Một khách theo id (kèm thống kê). */
export async function getCustomer(id: string): Promise<CustomerStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('customer_stats').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Lịch sử mua của một khách (mới → cũ). */
export async function getCustomerOrders(customerId: string): Promise<CustomerOrderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customer_orders')
    .select('id, order_date, cake_type, quantity, note')
    .eq('customer_id', customerId)
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Dữ liệu form khách công khai (menu) theo token. Gọi RPC security definer. */
export async function getPublicCustomerFormData(token: string): Promise<PublicCustomerBootstrap> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('public_customer_bootstrap', { p_token: token });
  if (error) throw error;
  return data as PublicCustomerBootstrap;
}

/** Token link nhập khách công khai đang active (owner đọc để hiển thị/copy). */
export async function getPublicCustomerToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('public_customer_tokens')
    .select('token')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.token ?? null;
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
