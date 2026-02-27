import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/payments/checkout — Stripe Checkout Session oluştur
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { priceId, mode = "subscription" } = body as {
      priceId: string;
      mode?: "subscription" | "payment";
    };

    if (!priceId) {
      return NextResponse.json(
        { error: "priceId is required" },
        { status: 400 }
      );
    }

    const result = await createCheckoutSession({
      userId: user.id,
      email: user.email!,
      priceId,
      mode,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
