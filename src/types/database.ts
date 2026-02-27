// =============================================================================
// ATLAS PLATFORM — Supabase Database Types
// Supabase CLI otomatik üretebilir: npx supabase gen types typescript
// Bu dosya şimdilik manuel tanımlanmıştır
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── New table row types (v0.4.0) — forward declarations ───
export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: "info" | "success" | "warning" | "error" | "system";
  channel: "in_app" | "email" | "push" | "sms";
  is_read: boolean;
  action_url: string | null;
  metadata: Json;
  created_at: string;
  read_at: string | null;
}

export interface AgentConversationRow {
  id: string;
  user_id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  metadata: Json;
  token_count: number;
  created_at: string;
}

export interface BillingRecordRow {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_tier: string;
  status: "active" | "past_due" | "canceled" | "trialing";
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface AiReportRow {
  id: string;
  user_id: string;
  report_type: "sales" | "inventory" | "compliance" | "performance" | "custom";
  title: string;
  content: string;
  summary: string | null;
  data: Json;
  status: "draft" | "generating" | "completed" | "failed";
  generated_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          company_name: string;
          tax_id: string | null;
          phone: string | null;
          onboarding_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          company_name: string;
          tax_id?: string | null;
          phone?: string | null;
          onboarding_status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          company_name?: string;
          tax_id?: string | null;
          phone?: string | null;
          onboarding_status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_tier: string;
          payment_status: string;
          amount: number;
          started_at: string;
          valid_until: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_tier: string;
          payment_status?: string;
          amount: number;
          started_at?: string;
          valid_until: string;
          notes?: string | null;
        };
        Update: {
          user_id?: string;
          plan_tier?: string;
          payment_status?: string;
          amount?: number;
          valid_until?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          company_name: string | null;
          message: string;
          status: string;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          company_name?: string | null;
          message: string;
          status?: string;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          email?: string;
          phone?: string | null;
          company_name?: string | null;
          message?: string;
          status?: string;
          admin_notes?: string | null;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          token: string;
          plan_tier: string;
          status: string;
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          plan_tier: string;
          status?: string;
          expires_at: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          email?: string;
          token?: string;
          plan_tier?: string;
          status?: string;
          expires_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          sku: string;
          hs_code: string | null;
          description: string | null;
          base_price: number;
          stock_turkey: number;
          stock_us: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          sku: string;
          hs_code?: string | null;
          description?: string | null;
          base_price: number;
          stock_turkey?: number;
          stock_us?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          name?: string;
          sku?: string;
          hs_code?: string | null;
          description?: string | null;
          base_price?: number;
          stock_turkey?: number;
          stock_us?: number;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          id: string;
          product_id: string;
          quantity_delta: number;
          movement_type: string;
          location: string;
          reference_id: string | null;
          note: string | null;
          recorded_by: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity_delta: number;
          movement_type: string;
          location: string;
          reference_id?: string | null;
          note?: string | null;
          recorded_by: string;
          recorded_at?: string;
        };
        Update: never; // Append-only — güncelleme yasak
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          platform: string | null;
          platform_order_id: string | null;
          destination: string;
          status: string;
          tracking_ref: string | null;
          carrier: string | null;
          total_amount: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          shipped_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform?: string | null;
          platform_order_id?: string | null;
          destination: string;
          status?: string;
          tracking_ref?: string | null;
          carrier?: string | null;
          total_amount?: number | null;
          notes?: string | null;
          created_at?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          user_id?: string;
          platform?: string | null;
          platform_order_id?: string | null;
          destination?: string;
          status?: string;
          tracking_ref?: string | null;
          carrier?: string | null;
          total_amount?: number | null;
          notes?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      process_tasks: {
        Row: {
          id: string;
          user_id: string;
          task_name: string;
          task_category: string | null;
          task_status: string;
          sort_order: number;
          notes: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_name: string;
          task_category?: string | null;
          task_status?: string;
          sort_order?: number;
          notes?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          task_name?: string;
          task_category?: string | null;
          task_status?: string;
          sort_order?: number;
          notes?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "process_tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          description: string;
          status: string;
          priority: string;
          admin_response: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          description: string;
          status?: string;
          priority?: string;
          admin_response?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          subject?: string;
          description?: string;
          status?: string;
          priority?: string;
          admin_response?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          channel: string;
          is_read: boolean;
          action_url: string | null;
          metadata: Json;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type?: string;
          channel?: string;
          is_read?: boolean;
          action_url?: string | null;
          metadata?: Json;
          created_at?: string;
          read_at?: string | null;
        };
        Update: {
          user_id?: string;
          title?: string;
          body?: string;
          type?: string;
          channel?: string;
          is_read?: boolean;
          action_url?: string | null;
          metadata?: Json;
          read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_conversations: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          role: string;
          content: string;
          token_count: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          role: string;
          content: string;
          token_count?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          session_id?: string;
          role?: string;
          content?: string;
          token_count?: number;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "agent_conversations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      billing_records: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan_tier: string;
          amount: number;
          currency: string;
          status: string;
          invoice_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_tier: string;
          amount: number;
          currency?: string;
          status?: string;
          invoice_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_tier?: string;
          amount?: number;
          currency?: string;
          status?: string;
          invoice_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "billing_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_reports: {
        Row: {
          id: string;
          user_id: string;
          report_type: string;
          title: string;
          content: string;
          summary: string | null;
          data: Json;
          status: string;
          generated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: string;
          title: string;
          content: string;
          summary?: string | null;
          data?: Json;
          status?: string;
          generated_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          report_type?: string;
          title?: string;
          content?: string;
          summary?: string | null;
          data?: Json;
          status?: string;
          generated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_product_stock: {
        Row: {
          product_id: string;
          owner_id: string;
          name: string;
          sku: string;
          calculated_stock_tr: number;
          calculated_stock_us: number;
          cached_stock_tr: number;
          cached_stock_us: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      custom_access_token_hook: {
        Args: { event: Json };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}

// Kısayol tipleri
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
