/**
 * ─── Atlas Platform — SLA Monitoring Service ───
 * Track order fulfillment against SLA targets.
 */

export interface SLAConfig {
  /** Maximum processing hours from order creation to 'preparing' */
  processingHours: number;
  /** Maximum shipping hours from 'preparing' to 'shipped' */
  shippingHours: number;
  /** Maximum delivery hours from 'shipped' to 'delivered' */
  deliveryHours: number;
  /** Maximum total hours from creation to delivery */
  totalHours: number;
}

export interface SLAStatus {
  orderId: string;
  metric: string;
  targetHours: number;
  elapsedHours: number;
  isBreached: boolean;
  remainingHours: number;
}

/** Default SLA targets for Turkey → USA B2B exports */
export const DEFAULT_SLA: SLAConfig = {
  processingHours: 48, // 2 business days
  shippingHours: 24, // 1 day to hand to carrier
  deliveryHours: 336, // 14 days (international)
  totalHours: 408, // ~17 days total
};

/** Calculate hours elapsed between two dates */
function hoursBetween(start: string | Date, end?: string | Date): number {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, (e - s) / (1000 * 60 * 60));
}

/** Check SLA status for a single order */
export function checkOrderSLA(
  order: {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
  },
  config: SLAConfig = DEFAULT_SLA
): SLAStatus[] {
  const results: SLAStatus[] = [];
  const now = new Date();

  // Total elapsed
  const totalElapsed = hoursBetween(order.created_at, now);

  // Check based on current status
  if (order.status === "pending" || order.status === "confirmed") {
    const elapsed = hoursBetween(order.created_at);
    results.push({
      orderId: order.id,
      metric: "processing",
      targetHours: config.processingHours,
      elapsedHours: Math.round(elapsed * 10) / 10,
      isBreached: elapsed > config.processingHours,
      remainingHours: Math.max(0, Math.round((config.processingHours - elapsed) * 10) / 10),
    });
  }

  if (order.status === "preparing") {
    const elapsed = hoursBetween(order.updated_at);
    results.push({
      orderId: order.id,
      metric: "shipping_handoff",
      targetHours: config.shippingHours,
      elapsedHours: Math.round(elapsed * 10) / 10,
      isBreached: elapsed > config.shippingHours,
      remainingHours: Math.max(0, Math.round((config.shippingHours - elapsed) * 10) / 10),
    });
  }

  if (order.status === "shipped" || order.status === "in_transit") {
    const elapsed = hoursBetween(order.updated_at);
    results.push({
      orderId: order.id,
      metric: "delivery",
      targetHours: config.deliveryHours,
      elapsedHours: Math.round(elapsed * 10) / 10,
      isBreached: elapsed > config.deliveryHours,
      remainingHours: Math.max(0, Math.round((config.deliveryHours - elapsed) * 10) / 10),
    });
  }

  // Overall SLA (for non-delivered orders)
  if (order.status !== "delivered" && order.status !== "cancelled") {
    results.push({
      orderId: order.id,
      metric: "total",
      targetHours: config.totalHours,
      elapsedHours: Math.round(totalElapsed * 10) / 10,
      isBreached: totalElapsed > config.totalHours,
      remainingHours: Math.max(0, Math.round((config.totalHours - totalElapsed) * 10) / 10),
    });
  }

  return results;
}

/** Calculate SLA compliance percentage for a set of orders */
export function calculateSLACompliance(
  orders: { id: string; status: string; created_at: string; updated_at: string }[],
  config: SLAConfig = DEFAULT_SLA
): { total: number; compliant: number; breached: number; complianceRate: number } {
  let breachedCount = 0;

  for (const order of orders) {
    const statuses = checkOrderSLA(order, config);
    if (statuses.some((s) => s.isBreached)) {
      breachedCount++;
    }
  }

  const compliant = orders.length - breachedCount;
  return {
    total: orders.length,
    compliant,
    breached: breachedCount,
    complianceRate: orders.length > 0 ? Math.round((compliant / orders.length) * 100) : 100,
  };
}
