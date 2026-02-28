// ─── Atlas AI — Commerce & Logistics Tools (34 tools) ────────────────────────
import { tool } from "./define-tool";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Db = SupabaseClient<Database>;

export function createCommerceTools(supabase: Db) {
  return {
    // ══════════════════════════════════════════════════════════════ ORDERS (9)
    list_orders: tool({
      description: "List all orders with optional status and platform filter.",
      parameters: z.object({ status: z.string().optional(), platform: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, platform, limit = 20 }) => {
        let q = supabase.from("orders").select("id,user_id,platform,platform_order_id,status,total_amount,carrier,tracking_ref,created_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        if (platform) q = q.eq("platform", platform);
        const { data, error } = await q;
        return error ? { error: error.message } : { orders: data, count: data?.length };
      },
    }),

    get_order_by_id: tool({
      description: "Get complete details of a specific order including its items.",
      parameters: z.object({ order_id: z.string() }),
      execute: async ({ order_id }) => {
        const [ord, items] = await Promise.all([
          supabase.from("orders").select("*").eq("id", order_id).single(),
          supabase.from("order_items").select("*").eq("order_id", order_id),
        ]);
        return ord.error ? { error: ord.error.message } : { order: ord.data, items: items.data };
      },
    }),

    search_orders: tool({
      description: "Search orders by tracking reference or platform order ID.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("orders").select("id,platform,platform_order_id,status,total_amount,tracking_ref,carrier,created_at").or(`tracking_ref.ilike.%${query}%,platform_order_id.ilike.%${query}%`).limit(20);
        return error ? { error: error.message } : { orders: data, count: data?.length };
      },
    }),

    get_orders_by_status: tool({
      description: "Get orders filtered by a specific status.",
      parameters: z.object({ status: z.string(), limit: z.number().optional() }),
      execute: async ({ status, limit = 20 }) => {
        const { data, error } = await supabase.from("orders").select("id,user_id,platform,status,total_amount,created_at").eq("status", status).order("created_at", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { orders: data, count: data?.length };
      },
    }),

    get_orders_by_platform: tool({
      description: "Get order counts and revenue grouped by platform (Amazon, eBay, etc).",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("orders").select("platform,total_amount,status");
        if (error) return { error: error.message };
        const m: Record<string, { count: number; revenue: number }> = {};
        data?.forEach(r => {
          if (!m[r.platform ?? "unknown"]) m[r.platform ?? "unknown"] = { count: 0, revenue: 0 };
          m[r.platform ?? "unknown"].count++;
          m[r.platform ?? "unknown"].revenue += Number(r.total_amount) || 0;
        });
        return { by_platform: m, total: data?.length };
      },
    }),

    update_order_status: tool({
      description: "Update an order's status and optionally add tracking info.",
      parameters: z.object({ order_id: z.string(), status: z.string(), tracking_ref: z.string().optional(), carrier: z.string().optional() }),
      execute: async ({ order_id, status, tracking_ref, carrier }) => {
        const upd: Record<string, unknown> = { status };
        if (tracking_ref) upd.tracking_ref = tracking_ref;
        if (carrier) upd.carrier = carrier;
        if (status === "shipped") upd.shipped_at = new Date().toISOString();
        if (status === "delivered") upd.delivered_at = new Date().toISOString();
        const { data, error } = await supabase.from("orders").update(upd).eq("id", order_id).select("id,status,tracking_ref").single();
        return error ? { error: error.message } : { success: true, order: data };
      },
    }),

    get_recent_orders: tool({
      description: "Get the most recent orders.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 15 }) => {
        const { data, error } = await supabase.from("orders").select("id,user_id,platform,status,total_amount,created_at").order("created_at", { ascending: false }).limit(limit);
        return error ? { error: error.message } : { orders: data, count: data?.length };
      },
    }),

    get_order_revenue: tool({
      description: "Calculate total revenue from orders, optionally within a date range.",
      parameters: z.object({ date_from: z.string().optional(), date_to: z.string().optional() }),
      execute: async ({ date_from, date_to }) => {
        let q = supabase.from("orders").select("total_amount,status,platform,created_at");
        if (date_from) q = q.gte("created_at", date_from);
        if (date_to) q = q.lte("created_at", date_to);
        const { data, error } = await q;
        if (error) return { error: error.message };
        let total = 0;
        const byPlatform: Record<string, number> = {};
        data?.forEach(r => {
          const amt = Number(r.total_amount) || 0;
          total += amt;
          byPlatform[r.platform ?? "unknown"] = (byPlatform[r.platform ?? "unknown"] || 0) + amt;
        });
        return { total_revenue: total, by_platform: byPlatform, order_count: data?.length };
      },
    }),

    count_orders_by_status: tool({
      description: "Count orders grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("orders").select("status");
        if (error) return { error: error.message };
        const m: Record<string, number> = {};
        data?.forEach(r => { m[r.status ?? "unknown"] = (m[r.status ?? "unknown"] || 0) + 1; });
        return { counts: m, total: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════════ ORDER ITEMS (2)
    get_order_items: tool({
      description: "Get line items for a specific order.",
      parameters: z.object({ order_id: z.string() }),
      execute: async ({ order_id }) => {
        const { data, error } = await supabase.from("order_items").select("*").eq("order_id", order_id);
        return error ? { error: error.message } : { items: data, count: data?.length };
      },
    }),

    get_top_selling_products: tool({
      description: "Get the best-selling products by total quantity across all orders.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 10 }) => {
        const { data, error } = await supabase.from("order_items").select("product_id,quantity,unit_price");
        if (error) return { error: error.message };
        const m: Record<string, { qty: number; rev: number }> = {};
        data?.forEach(r => {
          if (!m[r.product_id ?? "unknown"]) m[r.product_id ?? "unknown"] = { qty: 0, rev: 0 };
          m[r.product_id ?? "unknown"].qty += r.quantity;
          m[r.product_id ?? "unknown"].rev += r.quantity * Number(r.unit_price);
        });
        const sorted = Object.entries(m).sort((a, b) => b[1].qty - a[1].qty).slice(0, limit);
        return { top_products: sorted.map(([id, v]) => ({ product_id: id, total_sold: v.qty, total_revenue: v.rev })) };
      },
    }),

    // ══════════════════════════════════════════════════════════════ PRODUCTS (7)
    list_products: tool({
      description: "List all products with optional active filter.",
      parameters: z.object({ active_only: z.boolean().optional(), limit: z.number().optional() }),
      execute: async ({ active_only, limit = 20 }) => {
        let q = supabase.from("products").select("id,owner_id,name,sku,base_price,stock_turkey,stock_us,is_active,created_at").order("created_at", { ascending: false }).limit(limit);
        if (active_only) q = q.eq("is_active", true);
        const { data, error } = await q;
        return error ? { error: error.message } : { products: data, count: data?.length };
      },
    }),

    get_product_by_id: tool({
      description: "Get full details of a specific product.",
      parameters: z.object({ product_id: z.string() }),
      execute: async ({ product_id }) => {
        const { data, error } = await supabase.from("products").select("*").eq("id", product_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_products: tool({
      description: "Search products by name or SKU.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("products").select("id,name,sku,base_price,stock_turkey,stock_us,is_active").or(`name.ilike.%${query}%,sku.ilike.%${query}%`).limit(20);
        return error ? { error: error.message } : { products: data, count: data?.length };
      },
    }),

    get_products_by_owner: tool({
      description: "Get all products belonging to a specific user/owner.",
      parameters: z.object({ user_id: z.string() }),
      execute: async ({ user_id }) => {
        const { data, error } = await supabase.from("products").select("id,name,sku,base_price,stock_turkey,stock_us,is_active").eq("owner_id", user_id);
        return error ? { error: error.message } : { products: data, count: data?.length };
      },
    }),

    update_product: tool({
      description: "Update a product's details (price, stock, active status).",
      parameters: z.object({
        product_id: z.string(),
        base_price: z.number().optional(),
        stock_turkey: z.number().optional(),
        stock_us: z.number().optional(),
        is_active: z.boolean().optional(),
      }),
      execute: async ({ product_id, ...updates }) => {
        const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        const { data, error } = await supabase.from("products").update(clean).eq("id", product_id).select("id,name,sku,base_price,stock_turkey,stock_us,is_active").single();
        return error ? { error: error.message } : { success: true, product: data };
      },
    }),

    get_low_stock_products: tool({
      description: "Get products with stock below a threshold (default 10 units).",
      parameters: z.object({ threshold: z.number().optional() }),
      execute: async ({ threshold = 10 }) => {
        const { data, error } = await supabase.from("products").select("id,name,sku,stock_turkey,stock_us,owner_id").eq("is_active", true).or(`stock_turkey.lte.${threshold},stock_us.lte.${threshold}`).limit(50);
        return error ? { error: error.message } : { low_stock: data, count: data?.length };
      },
    }),

    get_product_stock_levels: tool({
      description: "Get calculated stock levels from the stock view for all products.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async ({ limit = 30 }) => {
        const { data, error } = await supabase.from("products").select("id,name,sku,stock_turkey,stock_us").eq("is_active", true).limit(limit);
        return error ? { error: error.message } : { stock: data, count: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════════ INVENTORY (3)
    list_inventory_movements: tool({
      description: "List recent inventory movements (stock in/out).",
      parameters: z.object({ product_id: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ product_id, limit = 20 }) => {
        let q = supabase.from("inventory_movements").select("*").order("recorded_at", { ascending: false }).limit(limit);
        if (product_id) q = q.eq("product_id", product_id);
        const { data, error } = await q;
        return error ? { error: error.message } : { movements: data, count: data?.length };
      },
    }),

    get_movements_for_product: tool({
      description: "Get all inventory movements for a specific product.",
      parameters: z.object({ product_id: z.string() }),
      execute: async ({ product_id }) => {
        const { data, error } = await supabase.from("inventory_movements").select("*").eq("product_id", product_id).order("recorded_at", { ascending: false });
        return error ? { error: error.message } : { movements: data, count: data?.length };
      },
    }),

    get_inventory_value: tool({
      description: "Estimate total inventory value (sum of base_price × stock for all active products).",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("products").select("name,base_price,stock_turkey,stock_us").eq("is_active", true);
        if (error) return { error: error.message };
        let trVal = 0, usVal = 0;
        data?.forEach(r => {
          const p = Number(r.base_price) || 0;
          trVal += p * (r.stock_turkey ?? 0);
          usVal += p * (r.stock_us ?? 0);
        });
        return { turkey_value: trVal, us_value: usVal, total_value: trVal + usVal, product_count: data?.length };
      },
    }),

    // ══════════════════════════════════════════════════════════════ WAREHOUSE (7)
    list_warehouse_items: tool({
      description: "List all warehouse items.",
      parameters: z.object({ location: z.string().optional(), status: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ location, status, limit = 20 }) => {
        let q = supabase.from("warehouse_items").select("id,user_id,product_id,warehouse_location,quantity,unit_type,status,sku,barcode,storage_cost_monthly").order("created_at", { ascending: false }).limit(limit);
        if (location) q = q.eq("warehouse_location", location);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        return error ? { error: error.message } : { items: data, count: data?.length };
      },
    }),

    get_warehouse_item: tool({
      description: "Get full details of a specific warehouse item.",
      parameters: z.object({ item_id: z.string() }),
      execute: async ({ item_id }) => {
        const { data, error } = await supabase.from("warehouse_items").select("*").eq("id", item_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_warehouse_by_sku: tool({
      description: "Search warehouse items by SKU or barcode.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => {
        const { data, error } = await supabase.from("warehouse_items").select("id,sku,barcode,warehouse_location,quantity,status").or(`sku.ilike.%${query}%,barcode.ilike.%${query}%`).limit(20);
        return error ? { error: error.message } : { items: data, count: data?.length };
      },
    }),

    get_warehouse_by_location: tool({
      description: "Get warehouse items grouped by location.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("warehouse_items").select("warehouse_location,quantity,storage_cost_monthly");
        if (error) return { error: error.message };
        const m: Record<string, { items: number; total_qty: number; cost: number }> = {};
        data?.forEach(r => {
          const loc = r.warehouse_location;
          if (!m[loc]) m[loc] = { items: 0, total_qty: 0, cost: 0 };
          m[loc].items++;
          m[loc].total_qty += r.quantity;
          m[loc].cost += Number(r.storage_cost_monthly) || 0;
        });
        return { by_location: m };
      },
    }),

    get_warehouse_by_status: tool({
      description: "Count warehouse items by status (in_stock, reserved, shipping, etc).",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("warehouse_items").select("status,quantity");
        if (error) return { error: error.message };
        const m: Record<string, { count: number; total_qty: number }> = {};
        data?.forEach(r => {
          if (!m[r.status ?? "unknown"]) m[r.status ?? "unknown"] = { count: 0, total_qty: 0 };
          m[r.status ?? "unknown"].count++;
          m[r.status ?? "unknown"].total_qty += r.quantity;
        });
        return { by_status: m, total: data?.length };
      },
    }),

    get_damaged_warehouse_items: tool({
      description: "Get all warehouse items marked as damaged or disposed.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("warehouse_items").select("id,sku,warehouse_location,quantity,status,notes").in("status", ["damaged", "disposed"]);
        return error ? { error: error.message } : { items: data, count: data?.length };
      },
    }),

    get_warehouse_storage_costs: tool({
      description: "Calculate total monthly storage cost across all warehouse locations.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("warehouse_items").select("warehouse_location,storage_cost_monthly").eq("status", "in_stock");
        if (error) return { error: error.message };
        let total = 0;
        const byLoc: Record<string, number> = {};
        data?.forEach(r => {
          const c = Number(r.storage_cost_monthly) || 0;
          total += c;
          byLoc[r.warehouse_location ?? "unknown"] = (byLoc[r.warehouse_location ?? "unknown"] || 0) + c;
        });
        return { total_monthly_cost: total, by_location: byLoc };
      },
    }),

    // ══════════════════════════════════════════════════════════════ SHIPMENTS (6)
    list_shipments: tool({
      description: "List all shipments with optional status and type filters.",
      parameters: z.object({ status: z.string().optional(), shipment_type: z.string().optional(), limit: z.number().optional() }),
      execute: async ({ status, shipment_type, limit = 20 }) => {
        let q = supabase.from("shipments").select("id,user_id,order_id,shipment_type,carrier,tracking_number,status,shipping_cost,shipped_at,estimated_delivery,delivered_at").order("created_at", { ascending: false }).limit(limit);
        if (status) q = q.eq("status", status);
        if (shipment_type) q = q.eq("shipment_type", shipment_type);
        const { data, error } = await q;
        return error ? { error: error.message } : { shipments: data, count: data?.length };
      },
    }),

    get_shipment_by_id: tool({
      description: "Get full details of a specific shipment.",
      parameters: z.object({ shipment_id: z.string() }),
      execute: async ({ shipment_id }) => {
        const { data, error } = await supabase.from("shipments").select("*").eq("id", shipment_id).single();
        return error ? { error: error.message } : data;
      },
    }),

    search_shipments_by_tracking: tool({
      description: "Search shipments by tracking number.",
      parameters: z.object({ tracking: z.string() }),
      execute: async ({ tracking }) => {
        const { data, error } = await supabase.from("shipments").select("id,tracking_number,carrier,status,shipment_type,shipped_at,delivered_at").ilike("tracking_number", `%${tracking}%`).limit(20);
        return error ? { error: error.message } : { shipments: data, count: data?.length };
      },
    }),

    get_shipments_by_status: tool({
      description: "Count shipments grouped by status.",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("shipments").select("status,shipping_cost");
        if (error) return { error: error.message };
        const m: Record<string, { count: number; cost: number }> = {};
        data?.forEach(r => {
          if (!m[r.status ?? "unknown"]) m[r.status ?? "unknown"] = { count: 0, cost: 0 };
          m[r.status ?? "unknown"].count++;
          m[r.status ?? "unknown"].cost += Number(r.shipping_cost) || 0;
        });
        return { by_status: m, total: data?.length };
      },
    }),

    get_shipments_by_type: tool({
      description: "Count shipments grouped by type (turkey_to_us, us_domestic, etc).",
      parameters: z.object({}),
      execute: async () => {
        const { data, error } = await supabase.from("shipments").select("shipment_type,shipping_cost");
        if (error) return { error: error.message };
        const m: Record<string, { count: number; cost: number }> = {};
        data?.forEach(r => {
          if (!m[r.shipment_type ?? "unknown"]) m[r.shipment_type ?? "unknown"] = { count: 0, cost: 0 };
          m[r.shipment_type ?? "unknown"].count++;
          m[r.shipment_type ?? "unknown"].cost += Number(r.shipping_cost) || 0;
        });
        return { by_type: m, total: data?.length };
      },
    }),

    get_delayed_shipments: tool({
      description: "Get shipments that are past their estimated delivery date and not yet delivered.",
      parameters: z.object({}),
      execute: async () => {
        const now = new Date().toISOString();
        const { data, error } = await supabase.from("shipments").select("id,tracking_number,carrier,status,shipment_type,estimated_delivery,shipped_at").in("status", ["pending", "picked_up", "in_transit", "customs_clearance", "out_for_delivery"]).lte("estimated_delivery", now).order("estimated_delivery");
        return error ? { error: error.message } : { delayed: data, count: data?.length };
      },
    }),
  };
}
