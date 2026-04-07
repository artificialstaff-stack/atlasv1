/**
 * ─── Atlas Platform — Data Import API ───
 * POST /api/import/products
 * Catalog intake facade: customer uploads product data, Atlas processes it.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCSV, validateProductImport } from "@/lib/data-io";
import { createFormSubmissionWithWorkflow } from "@/lib/workflows/service";
import type { Json } from "@/types/database";

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

    const submission = await createFormSubmissionWithWorkflow({
      userId: user.id,
      formCode: "ATL-201",
      data: {
        source: "api_import_products",
        totalRows: result.totalRows,
        importedRows: result.valid.length,
        validProducts: result.valid,
        validationErrors: result.errors,
      } as Json,
    });

    return NextResponse.json({
      message: `${result.valid.length} urun catalog intake olarak Atlas ekibine iletildi`,
      imported: result.valid.length,
      errors: result.errors,
      totalRows: result.totalRows,
      submissionId: submission.id,
      formCode: submission.form_code,
    });
  } catch (err) {
    console.error("[Import Error]", err);
    return NextResponse.json({ error: "İçe aktarma başarısız" }, { status: 500 });
  }
}
