/**
 * ─── Atlas Platform — Data Import API ───
 * POST /api/import/products  (CSV body)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCSV, validateProductImport } from "@/lib/data-io";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    let rows: Record<string, string>[] = [];

    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      const text = await req.text();
      rows = parseCSV(text);
    } else if (contentType.includes("application/json")) {
      rows = await req.json();
    } else {
      return NextResponse.json(
        { error: "Content-Type text/csv veya application/json olmalı" },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: "İçe aktarılacak veri bulunamadı" }, { status: 400 });
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: "Tek seferde en fazla 1000 satır" }, { status: 400 });
    }

    const result = validateProductImport(rows);

    if (result.valid.length > 0) {
      const insertData = result.valid.map((p) => ({
        owner_id: user.id,
        name: p.name,
        sku: p.sku,
        base_price: p.price,
        hs_code: p.hs_code ?? null,
        is_active: true,
      }));

      const { error } = await supabase.from("products").insert(insertData);
      if (error) throw error;
    }

    return NextResponse.json({
      message: `${result.valid.length} ürün başarıyla içe aktarıldı`,
      imported: result.valid.length,
      errors: result.errors,
      totalRows: result.totalRows,
    });
  } catch (err) {
    console.error("[Import Error]", err);
    return NextResponse.json({ error: "İçe aktarma başarısız" }, { status: 500 });
  }
}
