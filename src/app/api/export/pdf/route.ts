/**
 * ─── Atlas Platform — PDF Export API ───
 * Generates PDF-ready HTML for invoices and reports.
 * Client can use window.print() or a headless browser to convert.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateInvoiceHTML, type PdfInvoiceData } from "@/lib/pdf";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoiceId = request.nextUrl.searchParams.get("invoiceId");
    if (!invoiceId) {
      return NextResponse.json(
        { error: "invoiceId is required" },
        { status: 400 }
      );
    }

    // Fetch invoice data
    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .single();

    if (error || !invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("users")
      .select("company_name, email")
      .eq("id", invoice.user_id)
      .single();

    const pdfData: PdfInvoiceData = {
      invoiceNumber: invoice.invoice_number,
      issueDate: new Date(invoice.created_at).toLocaleDateString("tr-TR"),
      dueDate: invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString("tr-TR")
        : "—",
      companyName: profile?.company_name || "—",
      companyEmail: profile?.email || "—",
      items: [
        {
          description: invoice.plan_tier || "Platform Hizmet Bedeli",
          quantity: 1,
          unitPrice: Number(invoice.amount),
        },
      ],
      subtotal: Number(invoice.amount),
      tax: 0,
      total: Number(invoice.amount),
      currency: invoice.currency || "USD",
      notes: invoice.notes || undefined,
    };

    const html = generateInvoiceHTML(pdfData);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoice_number}.html"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
