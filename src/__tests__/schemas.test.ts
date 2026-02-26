import { describe, it, expect } from "vitest";
import {
  contactFormSchema,
  createInvitationSchema,
  createProductSchema,
  createOrderSchema,
  stockAdjustmentSchema,
} from "@/features/schemas";

describe("Zod Schemas — Validation", () => {
  describe("contactFormSchema", () => {
    it("geçerli veriyi kabul eder", () => {
      const result = contactFormSchema.safeParse({
        name: "Ahmet Yılmaz",
        email: "ahmet@test.com",
        message: "ABD pazarına giriş yapmak istiyorum",
      });
      expect(result.success).toBe(true);
    });

    it("kısa ismi reddeder", () => {
      const result = contactFormSchema.safeParse({
        name: "A",
        email: "ahmet@test.com",
        message: "ABD pazarına giriş yapmak istiyorum",
      });
      expect(result.success).toBe(false);
    });

    it("geçersiz e-postayı reddeder", () => {
      const result = contactFormSchema.safeParse({
        name: "Ahmet",
        email: "invalid",
        message: "ABD pazarına giriş",
      });
      expect(result.success).toBe(false);
    });

    it("kısa mesajı reddeder", () => {
      const result = contactFormSchema.safeParse({
        name: "Ahmet",
        email: "ahmet@test.com",
        message: "Kısa",
      });
      expect(result.success).toBe(false);
    });

    it("opsiyonel alanları kabul eder", () => {
      const result = contactFormSchema.safeParse({
        name: "Ahmet",
        email: "ahmet@test.com",
        phone: "+905551234567",
        company_name: "Test A.Ş.",
        message: "Detaylı bir açıklama metni girelim",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createInvitationSchema", () => {
    it("geçerli davet verisini kabul eder", () => {
      const result = createInvitationSchema.safeParse({
        email: "client@test.com",
        plan_tier: "growth",
      });
      expect(result.success).toBe(true);
    });

    it("geçersiz plan_tier reddeder", () => {
      const result = createInvitationSchema.safeParse({
        email: "client@test.com",
        plan_tier: "invalid_plan",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createProductSchema", () => {
    it("geçerli ürünü kabul eder", () => {
      const result = createProductSchema.safeParse({
        owner_id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Test Ürün",
        sku: "TST-001",
        base_price: 29.99,
      });
      expect(result.success).toBe(true);
    });

    it("negatif fiyatı reddeder", () => {
      const result = createProductSchema.safeParse({
        owner_id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Test",
        sku: "TST",
        base_price: -5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("createOrderSchema", () => {
    it("geçerli siparişi kabul eder", () => {
      const result = createOrderSchema.safeParse({
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        platform: "amazon",
        destination: "123 Main St, Virginia, USA",
        total_amount: 150.0,
      });
      expect(result.success).toBe(true);
    });

    it("kısa adresi reddeder", () => {
      const result = createOrderSchema.safeParse({
        user_id: "550e8400-e29b-41d4-a716-446655440000",
        destination: "AB",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("stockAdjustmentSchema", () => {
    it("geçerli stok hareketini kabul eder", () => {
      const result = stockAdjustmentSchema.safeParse({
        product_id: "550e8400-e29b-41d4-a716-446655440000",
        movement_type: "inbound_receipt",
        location: "US",
        quantity_delta: 50,
      });
      expect(result.success).toBe(true);
    });

    it("sıfır miktarı reddeder", () => {
      const result = stockAdjustmentSchema.safeParse({
        product_id: "550e8400-e29b-41d4-a716-446655440000",
        movement_type: "adjustment",
        location: "TR",
        quantity_delta: 0,
      });
      expect(result.success).toBe(false);
    });
  });
});
