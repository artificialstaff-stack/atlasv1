/**
 * Query Key Factory — Centralized cache key management
 *
 * All TanStack Query keys are defined here for
 * consistent invalidation across mutations and realtime hooks.
 *
 * Convention: static keys for lists, functions for parameterized queries.
 * Call with no args to get the base key for invalidation.
 */
export const queryKeys = {
  leads: ["leads"] as const,
  customers: (filter?: string) => {
    if (filter) return ["customers", filter] as const;
    return ["customers"] as const;
  },
  customerList: ["customer-list"] as const,
  customer: (id: string) => ["customer", id] as const,
  products: (ownerId?: string) => {
    if (ownerId) return ["products", ownerId] as const;
    return ["products"] as const;
  },
  inventoryMovements: (limit?: number) => {
    if (limit) return ["inventory-movements", limit] as const;
    return ["inventory-movements"] as const;
  },
  orders: (filter?: string) => {
    if (filter) return ["orders", filter] as const;
    return ["orders"] as const;
  },
  customerOrders: (userId: string) => ["customer-orders", userId] as const,
  processTasks: (userId?: string) => {
    if (userId) return ["process-tasks", userId] as const;
    return ["process-tasks"] as const;
  },
  tickets: (filter?: string) => {
    if (filter) return ["tickets", filter] as const;
    return ["tickets"] as const;
  },
  myTickets: ["my-tickets"] as const,
  adminKpis: ["admin-kpis"] as const,
} as const;
