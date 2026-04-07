import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "./query-keys";

const supabase = createClient();

async function fetchActiveCustomerIds() {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "customer")
    .eq("is_active", true);

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.user_id))];
}

// =============================================================================
// Leads / Contact Submissions
// =============================================================================

export function useLeads() {
  return useQuery({
    queryKey: queryKeys.leads,
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
    queryKey: queryKeys.customers(statusFilter),
    queryFn: async () => {
      const customerIds = await fetchActiveCustomerIds();
      if (customerIds.length === 0) return [];

      let query = supabase
        .from("users")
        .select("*")
        .in("id", customerIds)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("onboarding_status", statusFilter);
      }

      const [{ data: users, error }, { data: subscriptions, error: subscriptionError }] =
        await Promise.all([
          query,
          supabase
            .from("user_subscriptions")
            .select("*")
            .in("user_id", customerIds),
        ]);

      if (error) throw error;
      if (subscriptionError) throw subscriptionError;

      const subscriptionsByUser = (subscriptions ?? []).reduce<Record<string, unknown[]>>(
        (acc, subscription) => {
          const bucket = acc[subscription.user_id] ?? [];
          bucket.push(subscription);
          acc[subscription.user_id] = bucket;
          return acc;
        },
        {}
      );

      return (users ?? []).map((user) => ({
        ...user,
        user_subscriptions: subscriptionsByUser[user.id] ?? [],
      }));
    },
  });
}

/** Lightweight customer list for dropdowns (id, name, company) */
export function useCustomerList() {
  return useQuery({
    queryKey: queryKeys.customerList,
    queryFn: async () => {
      const customerIds = await fetchActiveCustomerIds();
      if (customerIds.length === 0) return [];

      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, company_name")
        .in("id", customerIds)
        .order("company_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 min — rarely changes
  });
}

export function useCustomerDetail(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customer(customerId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*, user_subscriptions(*)")
        .eq("id", customerId)
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: !!customerId,
  });
}

// =============================================================================
// Products
// =============================================================================

export function useProducts(ownerId?: string) {
  return useQuery({
    queryKey: queryKeys.products(ownerId),
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
    queryKey: queryKeys.inventoryMovements(limit),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("*, products!inventory_movements_product_id_fkey(name, sku)")
        .order("recorded_at", { ascending: false })
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
    queryKey: queryKeys.orders(statusFilter),
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
    queryKey: queryKeys.customerOrders(userId),
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
    queryKey: queryKeys.processTasks(userId),
    queryFn: async () => {
      let query = supabase
        .from("process_tasks")
        .select("*")
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
    queryKey: queryKeys.tickets(statusFilter),
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
    queryKey: queryKeys.myTickets,
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
    queryKey: queryKeys.adminKpis,
    queryFn: async () => {
      const [
        { count: customerCount },
        { count: activeOrderCount },
        { count: leadCount },
        { data: lowStockProducts },
      ] = await Promise.all([
        supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role", "customer")
          .eq("is_active", true),
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
