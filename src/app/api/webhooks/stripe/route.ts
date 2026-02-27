import { NextRequest, NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * POST /api/webhooks/stripe — Stripe webhook handler
 *
 * Stripe events: checkout.session.completed, invoice.paid,
 * customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  try {
     
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as unknown as {
      type: string;
      data: { object: Record<string, unknown> };
    };

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Record<string, unknown>;
        const userId = (session.metadata as Record<string, string>)?.userId;
        console.log("[stripe-webhook] Checkout completed:", { userId, sessionId: session.id });

        // Supabase'e subscription kaydet
        if (userId && session.subscription) {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          await (supabase as any).from("user_subscriptions").upsert({
            user_id: userId,
            plan_tier: "professional",
            payment_status: "paid",
            amount: ((session.amount_total as number) ?? 0) / 100,
            started_at: new Date().toISOString(),
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notes: `Stripe subscription: ${session.subscription}`,
          });
        }
        break;
      }

      case "invoice.paid": {
        console.log("[stripe-webhook] Invoice paid:", (event.data.object as Record<string, unknown>).id);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Record<string, unknown>;
        console.log("[stripe-webhook] Subscription updated:", subscription.id, subscription.status);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Record<string, unknown>;
        console.log("[stripe-webhook] Subscription canceled:", subscription.id);
        break;
      }

      default:
        console.log("[stripe-webhook] Unhandled event:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[stripe-webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
