import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFormByCode } from "@/lib/forms";

/**
 * POST /api/forms/submit — Form gönderim API'si
 * Body: { form_code: string, data: Record<string, unknown> }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 });
    }

    const body = await req.json();
    const { form_code, data } = body as {
      form_code?: string;
      data?: Record<string, unknown>;
    };

    if (!form_code || !data) {
      return NextResponse.json(
        { error: "form_code ve data alanları zorunludur" },
        { status: 400 }
      );
    }

    // Validate form exists
    const formDef = getFormByCode(form_code);
    if (!formDef) {
      return NextResponse.json(
        { error: `${form_code} kodlu form bulunamadı` },
        { status: 404 }
      );
    }

    if (!formDef.active) {
      return NextResponse.json(
        { error: "Bu form şu anda aktif değil" },
        { status: 400 }
      );
    }

    // Insert submission
    const { data: submission, error } = await supabase
      .from("form_submissions")
      .insert({
        form_code: formDef.code,
        user_id: user.id,
        data: data as import("@/types/database").Json,
        status: "submitted",
      })
      .select("id, form_code, status, created_at")
      .single();

    if (error) {
      console.error("[forms/submit] DB error:", error);
      return NextResponse.json(
        { error: "Form gönderilemedi: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `${formDef.code} — ${formDef.title} başarıyla gönderildi`,
        submission,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[forms/submit] Unexpected error:", err);
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/forms/submit — Kullanıcının gönderimlerini listele
 * Query: ?form_code=ATL-101 (opsiyonel filtre)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Yetkilendirme gerekli" }, { status: 401 });
    }

    const formCode = req.nextUrl.searchParams.get("form_code");

    let query = supabase
      .from("form_submissions")
      .select("id, form_code, status, admin_notes, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (formCode) {
      query = query.eq("form_code", formCode);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissions: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
