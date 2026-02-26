import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Supabase Auth Webhook Handler
 * POST /api/webhooks/auth
 *
 * Bu endpoint, Supabase Auth webhook'larını dinler.
 * Yeni kullanıcı kayıt olduğunda otomatik olarak:
 * 1. users tablosuna profil kaydı oluşturur
 * 2. user_roles tablosuna varsayılan "customer" rolü atar
 *
 * Supabase Dashboard → Authentication → Webhooks kısmından
 * bu URL'i "After Sign Up" hook olarak ayarlanmalıdır.
 */
export async function POST(req: NextRequest) {
  try {
    // Webhook gizli anahtarı doğrula (opsiyonel güvenlik)
    const authHeader = req.headers.get("authorization");
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const { type, record } = payload;

    // Sadece yeni kayıtları işle
    if (type !== "INSERT") {
      return NextResponse.json({ message: "Ignored" }, { status: 200 });
    }

    const supabase = createAdminClient();

    const userId = record.id;
    const email = record.email;
    const rawMeta = record.raw_user_meta_data ?? {};

    // 1. Users tablosuna kayıt
    const { error: userError } = await supabase.from("users").upsert(
      {
        id: userId,
        email,
        first_name: rawMeta.first_name ?? "",
        last_name: rawMeta.last_name ?? "",
        company_name: rawMeta.company_name ?? "",
        phone: rawMeta.phone ?? null,
        tax_id: rawMeta.tax_id ?? null,
        onboarding_status: "lead",
      },
      { onConflict: "id" }
    );

    if (userError) {
      console.error("User creation error:", userError);
      return NextResponse.json(
        { error: "User creation failed" },
        { status: 500 }
      );
    }

    // 2. Varsayılan rol ata (customer)
    const { error: roleError } = await supabase.from("user_roles").upsert(
      {
        user_id: userId,
        role: "customer",
        is_active: true,
      },
      { onConflict: "user_id" }
    );

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    return NextResponse.json(
      { message: "User provisioned", userId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
