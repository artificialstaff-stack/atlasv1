/**
 * ─── Atlas Platform — PDF Export Service ───
 * Server-side PDF generation for invoices and reports.
 * Uses React Server Components + html template approach.
 * Can be replaced with @react-pdf/renderer for complex layouts.
 */

// ─── Types ──────────────────────────────────────────────
export interface PdfInvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  companyName: string;
  companyEmail: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  notes?: string;
}

export interface PdfReportData {
  title: string;
  generatedAt: string;
  sections: { heading: string; content: string }[];
  summary?: string;
}

// ─── Invoice HTML Template ──────────────────────────────
export function generateInvoiceHTML(data: PdfInvoiceData): string {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.description}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.unitPrice, data.currency)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.quantity * item.unitPrice, data.currency)}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Fatura ${data.invoiceNumber}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a">
  <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:40px">
    <div>
      <h1 style="margin:0;font-size:28px;color:#6366f1">ATLAS</h1>
      <p style="margin:4px 0 0;color:#666;font-size:12px">Platform</p>
    </div>
    <div style="text-align:right">
      <h2 style="margin:0;font-size:20px">FATURA</h2>
      <p style="margin:4px 0 0;color:#666;font-size:14px">${data.invoiceNumber}</p>
    </div>
  </div>
  
  <div style="display:flex;justify-content:space-between;margin-bottom:30px">
    <div>
      <p style="margin:0;font-weight:600;font-size:14px">Fatura Edilen:</p>
      <p style="margin:4px 0 0;color:#444">${data.companyName}</p>
      <p style="margin:2px 0 0;color:#666;font-size:13px">${data.companyEmail}</p>
    </div>
    <div style="text-align:right">
      <p style="margin:0"><strong>Düzenleme:</strong> ${data.issueDate}</p>
      <p style="margin:4px 0 0"><strong>Vade:</strong> ${data.dueDate}</p>
    </div>
  </div>
  
  <table style="width:100%;border-collapse:collapse;margin-bottom:30px">
    <thead>
      <tr style="background:#f8f8f8">
        <th style="padding:10px;text-align:left;border-bottom:2px solid #ddd">Açıklama</th>
        <th style="padding:10px;text-align:center;border-bottom:2px solid #ddd">Miktar</th>
        <th style="padding:10px;text-align:right;border-bottom:2px solid #ddd">Birim Fiyat</th>
        <th style="padding:10px;text-align:right;border-bottom:2px solid #ddd">Tutar</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  
  <div style="display:flex;justify-content:flex-end">
    <table style="width:250px">
      <tr><td style="padding:4px 8px">Ara Toplam:</td><td style="padding:4px 8px;text-align:right">${formatCurrency(data.subtotal, data.currency)}</td></tr>
      <tr><td style="padding:4px 8px">KDV:</td><td style="padding:4px 8px;text-align:right">${formatCurrency(data.tax, data.currency)}</td></tr>
      <tr style="font-weight:bold;font-size:16px;border-top:2px solid #333">
        <td style="padding:8px">Toplam:</td>
        <td style="padding:8px;text-align:right;color:#6366f1">${formatCurrency(data.total, data.currency)}</td>
      </tr>
    </table>
  </div>
  
  ${data.notes ? `<div style="margin-top:30px;padding:16px;background:#f9fafb;border-radius:8px"><p style="margin:0;font-size:13px;color:#666"><strong>Notlar:</strong> ${data.notes}</p></div>` : ""}
  
  <div style="margin-top:60px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:11px">
    <p>ATLAS Platform — ABD pazarına giriş için uçtan uca e-ticaret altyapısı</p>
  </div>
</body>
</html>`;
}

// ─── Report HTML Template ───────────────────────────────
export function generateReportHTML(data: PdfReportData): string {
  const sections = data.sections
    .map(
      (s) => `
    <div style="margin-bottom:24px">
      <h3 style="margin:0 0 8px;color:#333">${s.heading}</h3>
      <p style="margin:0;color:#555;line-height:1.6">${s.content}</p>
    </div>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${data.title}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a1a">
  <h1 style="margin:0 0 8px;font-size:24px;color:#6366f1">${data.title}</h1>
  <p style="margin:0 0 30px;color:#999;font-size:13px">Oluşturulma: ${data.generatedAt}</p>
  ${data.summary ? `<div style="padding:16px;background:#f0f0ff;border-radius:8px;margin-bottom:30px"><p style="margin:0;font-size:14px"><strong>Özet:</strong> ${data.summary}</p></div>` : ""}
  ${sections}
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;text-align:center;color:#999;font-size:11px">
    <p>ATLAS Platform — Otomatik oluşturulmuş rapor</p>
  </div>
</body>
</html>`;
}

// ─── Helpers ────────────────────────────────────────────
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(amount);
}
