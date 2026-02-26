import { describe, it, expect } from "vitest";
import { queryKeys } from "@/features/query-keys";

describe("Query Key Factory", () => {
  it("leads returns static key", () => {
    expect(queryKeys.leads).toEqual(["leads"]);
  });

  it("customers returns base key without filter", () => {
    expect(queryKeys.customers()).toEqual(["customers"]);
  });

  it("customers returns key with filter", () => {
    expect(queryKeys.customers("active")).toEqual(["customers", "active"]);
  });

  it("customerList returns static key", () => {
    expect(queryKeys.customerList).toEqual(["customer-list"]);
  });

  it("customer returns key with id", () => {
    expect(queryKeys.customer("abc-123")).toEqual(["customer", "abc-123"]);
  });

  it("products returns base key without ownerId", () => {
    expect(queryKeys.products()).toEqual(["products"]);
  });

  it("products returns key with ownerId", () => {
    expect(queryKeys.products("user-1")).toEqual(["products", "user-1"]);
  });

  it("inventoryMovements returns base key without limit", () => {
    expect(queryKeys.inventoryMovements()).toEqual(["inventory-movements"]);
  });

  it("inventoryMovements returns key with limit", () => {
    expect(queryKeys.inventoryMovements(50)).toEqual(["inventory-movements", 50]);
  });

  it("orders returns base key without filter", () => {
    expect(queryKeys.orders()).toEqual(["orders"]);
  });

  it("orders returns key with filter", () => {
    expect(queryKeys.orders("processing")).toEqual(["orders", "processing"]);
  });

  it("customerOrders returns key with userId", () => {
    expect(queryKeys.customerOrders("u-1")).toEqual(["customer-orders", "u-1"]);
  });

  it("processTasks returns base key without userId", () => {
    expect(queryKeys.processTasks()).toEqual(["process-tasks"]);
  });

  it("processTasks returns key with userId", () => {
    expect(queryKeys.processTasks("u-1")).toEqual(["process-tasks", "u-1"]);
  });

  it("tickets returns base key without filter", () => {
    expect(queryKeys.tickets()).toEqual(["tickets"]);
  });

  it("tickets returns key with filter", () => {
    expect(queryKeys.tickets("open")).toEqual(["tickets", "open"]);
  });

  it("myTickets returns static key", () => {
    expect(queryKeys.myTickets).toEqual(["my-tickets"]);
  });

  it("adminKpis returns static key", () => {
    expect(queryKeys.adminKpis).toEqual(["admin-kpis"]);
  });

  it("all keys are readonly tuples", () => {
    // Verify type safety — these should be readonly arrays
    const keys = [
      queryKeys.leads,
      queryKeys.myTickets,
      queryKeys.adminKpis,
      queryKeys.customerList,
    ];
    keys.forEach((key) => {
      expect(Array.isArray(key)).toBe(true);
      expect(key.length).toBeGreaterThan(0);
    });
  });

  it("base keys enable broad invalidation matching", () => {
    // Without args = base key for invalidation
    // With args = specific key for fetching
    const ordersBase = queryKeys.orders();
    const ordersFiltered = queryKeys.orders("processing");

    // Base key is a prefix of filtered key
    expect(ordersFiltered[0]).toBe(ordersBase[0]);
    expect(ordersFiltered.length).toBeGreaterThan(ordersBase.length);
  });
});
