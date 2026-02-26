import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// =============================================================================
// Leads / Contact Submissions
// =============================================================================

export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// =============================================================================
// Customers
// =============================================================================

export function useCustomers(statusFilter?: string) {
  return useQuery({
    queryKey: ["customers", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("users")
        .select("*, user_subscriptions(*)")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("onboarding_status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/** Lightweight customer list for dropdowns (id, name, company) */
export function useCustomerList() {
  return useQuery({
    queryKey: ["customer-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, company_name")
        .order("company_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 min — rarely changes
  });
}

export function useCustomerDetail(customerId: string) {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*, user_subscriptions(*)")
        .eq("id", customerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

// =============================================================================
// Products
// =============================================================================

export function useProducts(ownerId?: string) {
  return useQuery({
    queryKey: ["products", ownerId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (ownerId) {
        query = query.eq("owner_id", ownerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// =============================================================================
// Inventory Movements
// =============================================================================

export function useInventoryMovements(limit = 100) {
  return useQuery({
    queryKey: ["inventory-movements", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, products(name, sku)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

// =============================================================================
// Orders
// =============================================================================

export function useOrders(statusFilter?: string) {
  return useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, users(first_name, last_name, company_name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCustomerOrders(userId: string) {
  return useQuery({
    queryKey: ["customer-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// =============================================================================
// Process Tasks
// =============================================================================

export function useProcessTasks(userId?: string) {
  return useQuery({
    queryKey: ["process-tasks", userId],
    queryFn: async () => {
      let query = supabase
        .from("process_tasks")
        .select("*, users(first_name, last_name, company_name)")
        .order("sort_order", { ascending: true });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// =============================================================================
// Support Tickets
// =============================================================================

export function useTickets(statusFilter?: string) {
  return useQuery({
    queryKey: ["tickets", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*, users(first_name, last_name, company_name)")
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useMyTickets() {
  return useQuery({
    queryKey: ["my-tickets"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum açmanız gerekiyor");

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// =============================================================================
// Dashboard KPIs (Admin)
// =============================================================================

export function useAdminKPIs() {
  return useQuery({
    queryKey: ["admin-kpis"],
    queryFn: async () => {
      const [
        { count: customerCount },
        { count: activeOrderCount },
        { count: leadCount },
        { data: lowStockProducts },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["received", "processing", "packing"]),
        supabase
          .from("contact_submissions")
          .select("*", { count: "exact", head: true })
          .in("status", ["new", "contacted"]),
        supabase
          .from("products")
          .select("id")
          .lt("stock_us", 10)
          .eq("is_active", true),
      ]);

      return {
        customerCount: customerCount ?? 0,
        activeOrderCount: activeOrderCount ?? 0,
        leadCount: leadCount ?? 0,
        lowStockCount: lowStockProducts?.length ?? 0,
      };
    },
  });
}
