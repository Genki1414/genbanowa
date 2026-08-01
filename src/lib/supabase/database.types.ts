/**
 * 手書きの型定義。実際のSupabaseプロジェクトができたら
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 * で置き換えること（ORMは使わない方針のため、型生成だけSupabase CLIに任せる）。
 * ここでは P1（取引）と認証まわりで使うテーブルだけ、supabase/migrations/ の定義から手で起こした。
 *
 * @supabase/postgrest-js の GenericSchema は Tables / Views / Functions の3キーと、
 * 各テーブルの Relationships 配列を要求する。どれか欠けると `.from().select()` の戻り値が
 * すべて never になる（型エラーではなくサイレントに壊れるので注意）。
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type CompanyRow = {
  id: string;
  name: string;
  type: "corp" | "sole";
  plan: "free" | "std" | "pro" | "prem";
  stance: "uke" | "moto" | "both";
  unlocked_features: string[];
  trust_score: number;
  trust_level: string;
  invite_points: number;
  invoice_approval_limit: number;
  created_at: string;
};

type UserRow = {
  id: string;
  company_id: string;
  name: string;
  role: "owner" | "admin" | "accounting" | "field" | "viewer";
  tel: string | null;
  created_at: string;
};

type TransactionRow = {
  id: string;
  conversation_id: string | null;
  job_id: string | null;
  moto_company: string;
  uke_company: string;
  title: string;
  closing_day: string | null;
  payment_terms: string | null;
  status: "active" | "completion_requested" | "completed" | "cancelled";
  snapshot: Json;
  created_at: string;
  completed_at: string | null;
};

type OrderRow = {
  id: string;
  transaction_id: string;
  seq: number;
  keishiki: "ukeoi" | "ninku";
  amount: number;
  tanka: number;
  koki_from: string;
  koki_to: string;
  site_address: string | null;
  payment_terms: string;
  note: string | null;
  pdf_path: string | null;
  issued_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
  reject_note: string | null;
};

type OrderRequestRow = {
  id: string;
  transaction_id: string;
  description: string;
  est_amount: number;
  koki_from: string | null;
  koki_to: string | null;
  status: "requested" | "issued" | "declined";
  issued_order: string | null;
  created_at: string;
};

type DailyReportRow = {
  id: string;
  transaction_id: string;
  work_date: string;
  headcount: number;
  content: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type InvoiceRow = {
  id: string;
  transaction_id: string;
  order_id: string;
  amount: number;
  tax: number;
  basis: "full" | "manual" | "ninku_month";
  target_month: string | null;
  ninku_total: number | null;
  due_date: string;
  status: "submitted" | "approved" | "paid" | "received" | "rejected";
  approved_at: string | null;
  paid_at: string | null;
  received_at: string | null;
  received_on: string | null;
  pdf_path: string | null;
  created_at: string;
};

type ConversationRow = {
  id: string;
  kind: "job" | "direct";
  job_id: string | null;
  company_a: string;
  company_b: string;
  last_at: string;
  created_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      companies: Table<CompanyRow, Partial<CompanyRow> & { name: string; type: "corp" | "sole" }>;
      users: Table<UserRow, Partial<UserRow> & { id: string; company_id: string; name: string }>;
      transactions: Table<
        TransactionRow,
        Partial<TransactionRow> & { moto_company: string; uke_company: string; title: string }
      >;
      orders: Table<
        OrderRow,
        Partial<OrderRow> & {
          transaction_id: string;
          seq: number;
          keishiki: "ukeoi" | "ninku";
          koki_from: string;
          koki_to: string;
          payment_terms: string;
        }
      >;
      order_requests: Table<
        OrderRequestRow,
        Partial<OrderRequestRow> & { transaction_id: string; description: string }
      >;
      daily_reports: Table<
        DailyReportRow,
        Partial<DailyReportRow> & { transaction_id: string; work_date: string; content: string }
      >;
      invoices: Table<
        InvoiceRow,
        Partial<InvoiceRow> & {
          transaction_id: string;
          order_id: string;
          amount: number;
          tax: number;
          basis: "full" | "manual" | "ninku_month";
          due_date: string;
        }
      >;
      conversations: Table<
        ConversationRow,
        Partial<ConversationRow> & { kind: "job" | "direct"; company_a: string; company_b: string }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      my_company: { Args: Record<string, never>; Returns: string };
      my_role: { Args: Record<string, never>; Returns: string };
      bootstrap_company: {
        Args: { p_name: string; p_type: string; p_user_name: string };
        Returns: string;
      };
      unlock_feature: { Args: { p_company: string; p_key: string }; Returns: undefined };
    };
  };
};
