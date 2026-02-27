/**
 * ─── Atlas Platform — Data Import/Export Service ───
 * CSV/JSON export for products, orders, invoices.
 * CSV import for bulk product uploads.
 */

// ─── CSV Export ─────────────────────────────────────────
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns?: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return "";

  const cols = columns ?? Object.keys(data[0]).map((k) => ({ key: k as keyof T, label: String(k) }));

  const header = cols.map((c) => escapeCsvField(c.label)).join(",");
  const rows = data.map((row) =>
    cols.map((c) => escapeCsvField(String(row[c.key] ?? ""))).join(",")
  );

  return [header, ...rows].join("\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── CSV Parse ──────────────────────────────────────────
export function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ─── JSON Export ────────────────────────────────────────
export function toJSON<T>(data: T[], pretty = true): string {
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

// ─── Export Presets ─────────────────────────────────────
export const EXPORT_COLUMNS = {
  products: [
    { key: "name" as const, label: "Ürün Adı" },
    { key: "sku" as const, label: "SKU" },
    { key: "hs_code" as const, label: "HS Kodu" },
    { key: "base_price" as const, label: "Fiyat" },
    { key: "stock_turkey" as const, label: "Stok TR" },
    { key: "stock_us" as const, label: "Stok US" },
    { key: "is_active" as const, label: "Aktif" },
  ],
  orders: [
    { key: "platform_order_id" as const, label: "Sipariş No" },
    { key: "status" as const, label: "Durum" },
    { key: "destination" as const, label: "Hedef Ülke" },
    { key: "tracking_ref" as const, label: "Takip No" },
    { key: "created_at" as const, label: "Tarih" },
  ],
  invoices: [
    { key: "invoice_number" as const, label: "Fatura No" },
    { key: "amount" as const, label: "Tutar" },
    { key: "currency" as const, label: "Para Birimi" },
    { key: "status" as const, label: "Durum" },
    { key: "due_date" as const, label: "Vade Tarihi" },
    { key: "created_at" as const, label: "Oluşturulma" },
  ],
};

// ─── Import Validation ──────────────────────────────────
export interface ImportResult<T> {
  valid: T[];
  errors: { row: number; field: string; message: string }[];
  totalRows: number;
}

export function validateProductImport(
  rows: Record<string, string>[]
): ImportResult<{ name: string; sku: string; price: number; hs_code?: string }> {
  const valid: { name: string; sku: string; price: number; hs_code?: string }[] = [];
  const errors: { row: number; field: string; message: string }[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // +2 for header row + 0-index

    if (!row.name && !row["Ürün Adı"]) {
      errors.push({ row: rowNum, field: "name", message: "Ürün adı zorunlu" });
      return;
    }
    if (!row.sku && !row.SKU) {
      errors.push({ row: rowNum, field: "sku", message: "SKU zorunlu" });
      return;
    }

    const priceStr = row.price || row["Fiyat"] || "0";
    const price = parseFloat(priceStr);
    if (isNaN(price) || price < 0) {
      errors.push({ row: rowNum, field: "price", message: "Geçersiz fiyat" });
      return;
    }

    valid.push({
      name: (row.name || row["Ürün Adı"])!,
      sku: (row.sku || row.SKU)!,
      price,
      hs_code: row.hs_code || row["HS Kodu"] || undefined,
    });
  });

  return { valid, errors, totalRows: rows.length };
}
