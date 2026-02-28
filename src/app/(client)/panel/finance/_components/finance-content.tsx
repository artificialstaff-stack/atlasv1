"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

interface FinancialRecord {
  id: string;
  record_type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  currency: string;
  transaction_date: string;
  is_verified: boolean;
  receipt_url: string | null;
  invoice_ref: string | null;
  notes: string | null;
  created_at: string;
}

const INCOME_CATEGORIES: Record<string, string> = {
  marketplace_sales: "Pazaryeri Satışları",
  direct_sales: "Direkt Satışlar",
  refund_received: "İade Alındı",
  other_income: "Diğer Gelir",
};

const EXPENSE_CATEGORIES: Record<string, string> = {
  warehouse_rent: "Depo Kirası",
  warehouse_labor: "Depo İşçiliği",
  shipping_domestic: "ABD İç Kargo",
  shipping_international: "Uluslararası Kargo",
  customs_duty: "Gümrük Vergisi",
  customs_clearance: "Gümrükleme",
  packaging: "Paketleme",
  product_cost: "Ürün Maliyeti",
  marketplace_fees: "Pazaryeri Komisyonu",
  advertising: "Reklam",
  social_media_management: "Sosyal Medya",
  llc_formation: "LLC Kuruluş",
  llc_annual_fee: "LLC Yıllık Ücreti",
  registered_agent: "Registered Agent",
  bookkeeping: "Muhasebe",
  tax_filing: "Vergi Beyanı",
  insurance: "Sigorta",
  software_tools: "Yazılım/Araçlar",
  bank_fees: "Banka Komisyonları",
  return_processing: "İade İşleme",
  other_expense: "Diğer Gider",
};

const ALL_CATEGORIES: Record<string, string> = { ...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES };

function fmtMoney(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

export function FinanceContent({ records }: { records: FinancialRecord[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (ALL_CATEGORIES[r.category] || r.category).toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || r.record_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalIncome = records
    .filter((r) => r.record_type === "income")
    .reduce((s, r) => s + r.amount, 0);
  const totalExpense = records
    .filter((r) => r.record_type === "expense")
    .reduce((s, r) => s + r.amount, 0);
  const netProfit = totalIncome - totalExpense;

  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finans</h1>
          <p className="text-muted-foreground">Gelir ve gider takibiniz</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Henüz finansal kayıt yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gelir ve gider kayıtlarınız eklendiğinde burada görünecektir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finans</h1>
        <p className="text-muted-foreground">Gelir ve gider takibiniz</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Toplam Gelir</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1">{fmtMoney(totalIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Toplam Gider</span>
            </div>
            <div className="text-2xl font-bold text-red-500 mt-1">{fmtMoney(totalExpense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Net Kâr</span>
            </div>
            <div
              className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}
            >
              {fmtMoney(netProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{records.length}</div>
            <p className="text-xs text-muted-foreground">Toplam İşlem</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Açıklama veya kategori ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="income">Gelir</SelectItem>
                <SelectItem value="expense">Gider</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>İşlemler</CardTitle>
          <CardDescription>{filtered.length} kayıt</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(r.transaction_date).toLocaleDateString("tr-TR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.record_type === "income" ? "default" : "destructive"}>
                      {r.record_type === "income" ? "Gelir" : "Gider"}
                    </Badge>
                  </TableCell>
                  <TableCell>{ALL_CATEGORIES[r.category] || r.category}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{r.description}</TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    <span className={r.record_type === "income" ? "text-green-600" : "text-red-500"}>
                      {r.record_type === "income" ? "+" : "−"}
                      {fmtMoney(r.amount, r.currency)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Kayıt bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
