// Kiểu dữ liệu database, khớp supabase/migrations/0002_redesign.sql.
// Regenerate khi schema đổi: supabase gen types typescript --local > src/lib/supabase/types.ts

export type UserRole = 'owner' | 'staff';

/** Kết quả public_form_bootstrap: menu + nhân viên cho form công khai. */
export type PublicFormBootstrap =
  | { valid: false }
  | {
      valid: true;
      menu: { id: string; name: string; price: number }[];
      employees: { id: string; name: string }[];
    };

/** Kết quả public_customer_bootstrap: menu (loại bánh) cho form khách công khai. */
export type PublicCustomerBootstrap =
  | { valid: false }
  | { valid: true; menu: { id: string; name: string; price: number }[] };

/** Một dòng bán hàng cho link XEM công khai (chỉ các cột bảng chi tiết hiển thị). */
export type PublicSaleRow = {
  id: string;
  sale_date: string;
  sold_at: string;
  cake_type: string | null;
  quantity: number;
  unit_price: number;
  amount: number;
  source: string | null;
};
/** Kết quả public_sales_view: toàn bộ bán hàng chi tiết (nếu token hợp lệ). */
export type PublicSalesView =
  | { valid: false }
  | { valid: true; sales: PublicSaleRow[] };

// Mỗi bảng cần Relationships để thỏa GenericTable của supabase-js.
type Rel = [];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; role: UserRole; created_at: string };
        Insert: { id: string; full_name?: string | null; role?: UserRole };
        Update: { full_name?: string | null; role?: UserRole };
        Relationships: Rel;
      };
      menu: {
        Row: {
          id: string;
          name: string;
          price: number;
          active: boolean;
          sort_order: number;
          shrimp_per_unit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          price?: number;
          active?: boolean;
          sort_order?: number;
          shrimp_per_unit?: number;
        };
        Update: {
          name?: string;
          price?: number;
          active?: boolean;
          sort_order?: number;
          shrimp_per_unit?: number;
        };
        Relationships: Rel;
      };
      customers: {
        Row: {
          id: string;
          phone: string;
          name: string | null;
          address: string | null;
          note: string | null;
          order_count_adj: number;
          created_at: string;
          created_by: string | null;
          updated_at: string;
        };
        Insert: {
          phone: string;
          name?: string | null;
          address?: string | null;
          note?: string | null;
          order_count_adj?: number;
          created_by?: string | null;
        };
        Update: {
          phone?: string;
          name?: string | null;
          address?: string | null;
          note?: string | null;
          order_count_adj?: number;
        };
        Relationships: Rel;
      };
      customer_orders: {
        Row: {
          id: string;
          customer_id: string;
          order_date: string;
          menu_item_id: string | null;
          cake_type: string | null;
          quantity: number;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          customer_id: string;
          order_date: string;
          quantity: number;
          menu_item_id?: string | null;
          cake_type?: string | null;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          order_date?: string;
          quantity?: number;
          menu_item_id?: string | null;
          cake_type?: string | null;
          note?: string | null;
        };
        Relationships: Rel;
      };
      shrimp_gifts: {
        Row: {
          id: string;
          gift_date: string;
          menu_item_id: string | null;
          cake_type: string | null;
          quantity: number;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          gift_date: string;
          quantity: number;
          menu_item_id?: string | null;
          cake_type?: string | null;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          gift_date?: string;
          quantity?: number;
          menu_item_id?: string | null;
          cake_type?: string | null;
          note?: string | null;
        };
        Relationships: Rel;
      };
      material_purchases: {
        Row: {
          id: string;
          material: string;
          purchase_date: string;
          quantity: number;
          total_cost: number;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          material: string;
          purchase_date: string;
          quantity: number;
          total_cost: number;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          material?: string;
          purchase_date?: string;
          quantity?: number;
          total_cost?: number;
          note?: string | null;
        };
        Relationships: Rel;
      };
      shrimp_purchases: {
        Row: {
          id: string;
          purchase_date: string;
          kg: number | null;
          shrimp_count: number;
          total_cost: number | null;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          purchase_date: string;
          shrimp_count: number;
          kg?: number | null;
          total_cost?: number | null;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          purchase_date?: string;
          shrimp_count?: number;
          kg?: number | null;
          note?: string | null;
        };
        Relationships: Rel;
      };
      employees: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: { name: string; phone?: string | null; active?: boolean; sort_order?: number };
        Update: { name?: string; phone?: string | null; active?: boolean; sort_order?: number };
        Relationships: Rel;
      };
      sales: {
        Row: {
          id: string;
          sold_at: string;
          sale_date: string;
          menu_item_id: string | null;
          cake_type: string | null;
          quantity: number;
          unit_price: number;
          amount: number;
          source: string | null;
          customer_type: string | null;
          staff: string | null;
          staff_id: string | null;
          note: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          sold_at?: string;
          sale_date: string;
          menu_item_id?: string | null;
          cake_type?: string | null;
          quantity?: number;
          unit_price?: number;
          amount: number;
          source?: string | null;
          customer_type?: string | null;
          staff?: string | null;
          staff_id?: string | null;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          sale_date?: string;
          menu_item_id?: string | null;
          cake_type?: string | null;
          quantity?: number;
          unit_price?: number;
          amount?: number;
          source?: string | null;
          customer_type?: string | null;
          staff?: string | null;
          staff_id?: string | null;
          note?: string | null;
          updated_by?: string | null;
        };
        Relationships: Rel;
      };
      daily_revenue: {
        Row: {
          revenue_date: string;
          revenue: number;
          cakes: number | null;
          shrimp_used: number | null;
          weather: string | null;
          weather_cond: string | null;
          temp_max: number | null;
          feels_max: number | null;
          sunshine_hours: number | null;
          rain_mm: number | null;
          station_traffic: number | null;
          note: string | null;
          source: string;
          updated_at: string;
        };
        Insert: {
          revenue_date: string;
          revenue?: number;
          cakes?: number | null;
          shrimp_used?: number | null;
          weather?: string | null;
          station_traffic?: number | null;
          note?: string | null;
          source?: string;
        };
        Update: {
          revenue?: number;
          cakes?: number | null;
          shrimp_used?: number | null;
          weather?: string | null;
          station_traffic?: number | null;
          note?: string | null;
          source?: string;
        };
        Relationships: Rel;
      };
      public_form_tokens: {
        Row: { id: string; token: string; active: boolean; created_at: string };
        Insert: { token: string; active?: boolean };
        Update: { active?: boolean };
        Relationships: Rel;
      };
      public_view_tokens: {
        Row: { id: string; token: string; active: boolean; created_at: string };
        Insert: { token: string; active?: boolean };
        Update: { active?: boolean };
        Relationships: Rel;
      };
      public_customer_tokens: {
        Row: { id: string; token: string; active: boolean; created_at: string };
        Insert: { token: string; active?: boolean };
        Update: { active?: boolean };
        Relationships: Rel;
      };
      expenses: {
        Row: {
          id: string;
          expense_date: string;
          amount: number;
          category: string | null;
          expense_type: string | null;
          cost_center: string | null;
          description: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          expense_date: string;
          amount: number;
          category?: string | null;
          expense_type?: string | null;
          cost_center?: string | null;
          description?: string | null;
          created_by?: string | null;
        };
        Update: {
          expense_date?: string;
          amount?: number;
          category?: string | null;
          expense_type?: string | null;
          cost_center?: string | null;
          description?: string | null;
          updated_by?: string | null;
        };
        Relationships: Rel;
      };
    };
    Views: {
      revenue_by_day: {
        Row: {
          day: string;
          revenue: number;
          cakes: number | null;
          shrimp_used: number | null;
          station_traffic: number | null;
          weather: string | null;
        };
        Relationships: Rel;
      };
      revenue_by_month: {
        Row: { month: string; days: number; revenue: number; cakes: number };
        Relationships: Rel;
      };
      sales_by_month: {
        Row: { month: string; sale_count: number; quantity: number; amount: number };
        Relationships: Rel;
      };
      expenses_by_month: {
        Row: { month: string; expense_count: number; expenses: number };
        Relationships: Rel;
      };
      expenses_by_month_category: {
        Row: { month: string; category: string; expense_count: number; expenses: number };
        Relationships: Rel;
      };
      expenses_by_month_type: {
        Row: { month: string; expense_type: string; expense_count: number; expenses: number };
        Relationships: Rel;
      };
      expenses_by_month_cost_center: {
        Row: { month: string; cost_center: string; expense_count: number; expenses: number };
        Relationships: Rel;
      };
      pnl_by_month: {
        Row: {
          month: string;
          revenue: number;
          cash_expenses: number;
          material_cost: number;
          station_share: number;
          expenses: number;
          profit: number;
        };
        Relationships: Rel;
      };
      banh_out_by_month: {
        Row: { month: string; banh_out: number };
        Relationships: Rel;
      };
      material_summary: {
        Row: {
          material: string;
          total_in: number;
          total_cost_in: number;
          unit_cost: number;
          start_date: string | null;
        };
        Relationships: Rel;
      };
      material_inventory: {
        Row: {
          material: string;
          total_in: number;
          total_cost_in: number;
          unit_cost: number;
          start_date: string | null;
          used: number;
          on_hand: number;
          inventory_value: number;
        };
        Relationships: Rel;
      };
      material_cost_by_month: {
        Row: { month: string; tui_cost: number; tem_cost: number; material_cost: number };
        Relationships: Rel;
      };
      sales_payment_by_month: {
        Row: {
          month: string;
          cash: number;
          transfer: number;
          other: number;
          total: number;
        };
        Relationships: Rel;
      };
      sales_qty_by_month: {
        Row: {
          month: string;
          qty_1tom: number;
          qty_2tom: number;
          qty_other: number;
          qty_total: number;
        };
        Relationships: Rel;
      };
      revenue_by_weather: {
        Row: {
          weather_cond: string;
          days: number;
          revenue: number;
          avg_revenue: number;
          cakes: number;
          avg_cakes: number;
          avg_temp: number | null;
          avg_rain: number | null;
          avg_feels: number | null;
        };
        Relationships: Rel;
      };
      customer_stats: {
        Row: {
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
        Relationships: Rel;
      };
      shrimp_purchased_by_month: {
        Row: { month: string; purchase_count: number; kg: number; shrimp_in: number };
        Relationships: Rel;
      };
      shrimp_used_by_month: {
        Row: { month: string; shrimp_used: number };
        Relationships: Rel;
      };
      shrimp_gift_by_month: {
        Row: { month: string; gift_qty: number; gift_shrimp: number };
        Relationships: Rel;
      };
      shrimp_inventory: {
        Row: {
          total_in: number;
          total_kg: number;
          total_used: number;
          on_hand: number;
          start_date: string | null;
          total_cost_in: number;
          unit_cost: number;
          inventory_value: number;
        };
        Relationships: Rel;
      };
    };
    Functions: {
      is_owner: { Args: Record<string, never>; Returns: boolean };
      public_form_bootstrap: {
        Args: { p_token: string };
        Returns: PublicFormBootstrap;
      };
      public_submit_sale: {
        Args: {
          p_token: string;
          p_sale_date: string;
          p_menu_item_id: string;
          p_quantity: number;
          p_unit_price: number | null;
          p_source: string | null;
          p_staff_id: string | null;
          p_note: string | null;
        };
        Returns: string;
      };
      regenerate_public_form_token: {
        Args: Record<string, never>;
        Returns: string;
      };
      set_public_form_slug: {
        Args: { p_slug: string };
        Returns: string;
      };
      public_sales_view: {
        Args: { p_token: string };
        Returns: PublicSalesView;
      };
      regenerate_public_view_token: {
        Args: Record<string, never>;
        Returns: string;
      };
      set_public_view_slug: {
        Args: { p_slug: string };
        Returns: string;
      };
      public_customer_bootstrap: {
        Args: { p_token: string };
        Returns: PublicCustomerBootstrap;
      };
      public_submit_customer: {
        Args: {
          p_token: string;
          p_phone: string;
          p_name: string | null;
          p_address: string | null;
          p_menu_item_id: string | null;
          p_quantity: number | null;
          p_order_date: string | null;
          p_note: string | null;
        };
        Returns: string;
      };
      regenerate_public_customer_token: {
        Args: Record<string, never>;
        Returns: string;
      };
      set_public_customer_slug: {
        Args: { p_slug: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
