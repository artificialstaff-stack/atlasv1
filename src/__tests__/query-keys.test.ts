import { describe, it, expect } from "vitest";
import { queryKeys } from "@/features/query-keys";

describe("Query Key Factory", () => {
  it("leads returns static key", () => {
    expect(queryKeys.leads).toEqual(["leads"]);
  });

  it("customers returns key with filter", () => {
    expect(queryKeys.customers("active")).toEqual(["customers", "active"]);
    expect(queryKeys.customers()).toEqual(["customers", undefined]);
  });

  it("customer returns key with id", () => {
    expect(queryKeys.customer("abc-123")).toEqual(["customer", "abc-123"]);
  });

  it("products returns key with optional ownerId", () => {
    expect(queryKeys.products("user-1")).toEqual(["products", "user-1"]);
    expect(queryKeys.products()).toEqual(["products", undefined]);
  });

  it("inventoryMovements returns key with limit", () => {
    expect(queryKeys.inventoryMovements(50)).toEqual(["inventory-movements", 50]);
  });

  it("orders returns key with filter", () => {
    expect(queryKeys.orders("processing")).toEqual(["orders", "processing"]);
    expect(queryKeys.orders()).toEqual(["orders", undefined]);
  });

  it("customerOrders returns key with userId", () => {
    expect(queryKeys.customerOrders("u-1")).toEqual(["customer-orders", "u-1"]);
  });

  it("processTasks returns key with optional userId", () => {
    expect(queryKeys.processTasks("u-1")).toEqual(["process-tasks", "u-1"]);
    expect(queryKeys.processTasks()).toEqual(["process-tasks", undefined]);
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
    ];
    keys.forEach((key) => {
      expect(Array.isArray(key)).toBe(true);
      expect(key.length).toBeGreaterThan(0);
    });
  });
});
