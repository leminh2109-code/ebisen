// Kiểu dữ liệu database, khớp supabase/migrations/0002_redesign.sql.
// Regenerate khi schema đổi: supabase gen types typescript --local > src/lib/supabase/types.ts

export type UserRole = 'owner' | 'staff';

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
      sales: {
        Row: {
          id: string;
          sold_at: string;
          sale_date: string;
          cake_type: string | null;
          quantity: number;
          unit_price: number;
          amount: number;
          source: string | null;
          customer_type: string | null;
          staff: string | null;
          note: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          sold_at?: string;
          sale_date: string;
          cake_type?: string | null;
          quantity?: number;
          unit_price?: number;
          amount: number;
          source?: string | null;
          customer_type?: string | null;
          staff?: string | null;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          sale_date?: string;
          cake_type?: string | null;
          quantity?: number;
          unit_price?: number;
          amount?: number;
          source?: string | null;
          customer_type?: string | null;
          staff?: string | null;
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
        Row: { month: string; category: string; expenses: number };
        Relationships: Rel;
      };
      pnl_by_month: {
        Row: { month: string; revenue: number; expenses: number; profit: number };
        Relationships: Rel;
      };
    };
    Functions: {
      is_owner: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
