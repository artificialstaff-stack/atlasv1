/**
 * Query Key Factory — Centralized cache key management
 *
 * All TanStack Query keys are defined here for
 * consistent invalidation across mutations and realtime hooks.
 */
export const queryKeys = {
  leads: ["leads"] as const,
  customers: (filter?: string) => ["customers", filter] as const,
  customerList: ["customer-list"] as const,
  customer: (id: string) => ["customer", id] as const,
  products: (ownerId?: string) => ["products", ownerId] as const,
  inventoryMovements: (limit?: number) => ["inventory-movements", limit] as const,
  orders: (filter?: string) => ["orders", filter] as const,
  customerOrders: (userId: string) => ["customer-orders", userId] as const,
  processTasks: (userId?: string) => ["process-tasks", userId] as const,
  tickets: (filter?: string) => ["tickets", filter] as const,
  myTickets: ["my-tickets"] as const,
  adminKpis: ["admin-kpis"] as const,
} as const;
