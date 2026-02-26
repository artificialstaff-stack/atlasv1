import { z } from "zod";

// =============================================================================
// Contact / Lead Schemas
// =============================================================================

export const contactFormSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta giriniz"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export const updateLeadStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "converted", "rejected"]),
  admin_notes: z.string().optional(),
});

export type UpdateLeadStatusData = z.infer<typeof updateLeadStatusSchema>;

// =============================================================================
// Invitation Schemas
// =============================================================================

export const createInvitationSchema = z.object({
  email: z.string().email("Geçerli bir e-posta giriniz"),
  plan_tier: z.enum(["starter", "growth", "professional", "global_scale"]),
});

export type CreateInvitationData = z.infer<typeof createInvitationSchema>;

// =============================================================================
// Customer / User Schemas
// =============================================================================

export const updateCustomerSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  company_name: z.string().min(1).optional(),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
  onboarding_status: z
    .enum(["lead", "verifying", "onboarding", "active", "suspended"])
    .optional(),
});

export type UpdateCustomerData = z.infer<typeof updateCustomerSchema>;

// =============================================================================
// Product Schemas
// =============================================================================

export const createProductSchema = z.object({
  owner_id: z.string().uuid(),
  name: z.string().min(2, "Ürün adı zorunludur"),
  sku: z.string().min(1, "SKU zorunludur"),
  hs_code: z.string().optional(),
  description: z.string().optional(),
  base_price: z.number().min(0, "Fiyat negatif olamaz"),
});

export type CreateProductData = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).optional(),
  sku: z.string().min(1).optional(),
  hs_code: z.string().optional(),
  description: z.string().optional(),
  base_price: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateProductData = z.infer<typeof updateProductSchema>;

// =============================================================================
// Inventory Schemas
// =============================================================================

export const stockAdjustmentSchema = z.object({
  product_id: z.string().uuid("Ürün seçiniz"),
  movement_type: z.enum([
    "inbound_receipt",
    "order_fulfillment",
    "transfer_in",
    "transfer_out",
    "shrinkage",
    "adjustment",
    "return",
  ]),
  location: z.enum(["TR", "US"]),
  quantity_delta: z.number().refine((v) => v !== 0, "Miktar 0 olamaz"),
  reference_note: z.string().optional(),
});

export type StockAdjustmentData = z.infer<typeof stockAdjustmentSchema>;

// =============================================================================
// Order Schemas
// =============================================================================

export const createOrderSchema = z.object({
  user_id: z.string().uuid("Müşteri seçiniz"),
  platform: z
    .enum(["amazon", "shopify", "walmart", "etsy", "direct", "other"])
    .optional(),
  platform_order_id: z.string().optional(),
  destination: z.string().min(5, "Teslimat adresi zorunludur"),
  total_amount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export type CreateOrderData = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "received",
    "processing",
    "packing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ]),
  tracking_ref: z.string().optional(),
  carrier: z.string().optional(),
});

export type UpdateOrderStatusData = z.infer<typeof updateOrderStatusSchema>;

// =============================================================================
// Process Task Schemas
// =============================================================================

export const createTaskSchema = z.object({
  user_id: z.string().uuid("Müşteri seçiniz"),
  task_name: z.string().min(2, "Görev adı en az 2 karakter olmalıdır"),
  task_category: z
    .enum(["legal", "tax", "customs", "logistics", "marketplace", "other"])
    .optional(),
  notes: z.string().optional(),
  sort_order: z.number().default(0),
});

export type CreateTaskData = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  id: z.string().uuid(),
  task_status: z.enum(["pending", "in_progress", "completed", "blocked"]),
});

export type UpdateTaskStatusData = z.infer<typeof updateTaskStatusSchema>;

// =============================================================================
// Support Ticket Schemas
// =============================================================================

export const createTicketSchema = z.object({
  subject: z.string().min(3, "Konu en az 3 karakter olmalıdır"),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalıdır"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

export type CreateTicketData = z.infer<typeof createTicketSchema>;

export const respondTicketSchema = z.object({
  id: z.string().uuid(),
  admin_response: z.string().min(1, "Yanıt boş olamaz"),
  status: z
    .enum(["open", "investigating", "waiting_customer", "resolved", "closed"])
    .optional(),
});

export type RespondTicketData = z.infer<typeof respondTicketSchema>;
