// Kiểu dữ liệu cho database. Viết tay để có type-safety ngay, khớp với
// supabase/migrations/0001_init.sql. Khi schema thay đổi (sau migrate Airtable),
// có thể regenerate bằng: supabase gen types typescript --local > src/lib/supabase/types.ts

export type UserRole = 'owner' | 'staff';

// Mỗi bảng cần khóa Relationships để thỏa GenericTable của supabase-js;
// thiếu nó, .from() suy ra kiểu `never`. Để [] cho đơn giản (join vẫn hoạt động
// ở runtime; type join dùng dạng lỏng và được chuẩn hóa trong queries.ts).
type Rel = [];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: UserRole;
        };
        Update: {
          full_name?: string | null;
          role?: UserRole;
        };
        Relationships: Rel;
      };
      customers: {
        Row: {
          id: string;
          name: string;
          note: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          name: string;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          note?: string | null;
          updated_by?: string | null;
        };
        Relationships: Rel;
      };
      expense_categories: {
        Row: { id: string; name: string; created_at: string };
        Insert: { name: string };
        Update: { name?: string };
        Relationships: Rel;
      };
      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          customer_id: string | null;
          issue_date: string;
          amount: number;
          note: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          invoice_number: string;
          customer_id?: string | null;
          issue_date: string;
          amount: number;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          invoice_number?: string;
          customer_id?: string | null;
          issue_date?: string;
          amount?: number;
          note?: string | null;
          updated_by?: string | null;
        };
        Relationships: Rel;
      };
      expenses: {
        Row: {
          id: string;
          expense_date: string;
          category_id: string | null;
          vendor: string | null;
          amount: number;
          note: string | null;
          created_at: string;
          created_by: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          expense_date: string;
          category_id?: string | null;
          vendor?: string | null;
          amount: number;
          note?: string | null;
          created_by?: string | null;
        };
        Update: {
          expense_date?: string;
          category_id?: string | null;
          vendor?: string | null;
          amount?: number;
          note?: string | null;
          updated_by?: string | null;
        };
        Relationships: Rel;
      };
    };
    Views: {
      revenue_by_day: {
        Row: { day: string; invoice_count: number; revenue: number };
        Relationships: Rel;
      };
      revenue_by_month: {
        Row: { month: string; invoice_count: number; revenue: number };
        Relationships: Rel;
      };
      expenses_by_month: {
        Row: { month: string; expense_count: number; expenses: number };
        Relationships: Rel;
      };
      expenses_by_month_category: {
        Row: {
          month: string;
          category_id: string | null;
          category_name: string;
          expenses: number;
        };
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
