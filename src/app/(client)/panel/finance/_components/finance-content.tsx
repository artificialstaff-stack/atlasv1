"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, DollarSign, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AtlasEmptySurface,
  AtlasHeroBoard,
  AtlasSectionPanel,
  AtlasStackGrid,
  AtlasTableShell,
} from "@/components/portal/atlas-widget-kit";
import { useClientGuidance } from "../../_components/client-guidance-provider";

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

  const filtered = useMemo(
    () =>
      records.filter((record) => {
        const matchesSearch =
          record.description.toLowerCase().includes(search.toLowerCase()) ||
          (ALL_CATEGORIES[record.category] || record.category).toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || record.record_type === typeFilter;
        return matchesSearch && matchesType;
      }),
    [records, search, typeFilter],
  );

  const totalIncome = records.filter((record) => record.record_type === "income").reduce((sum, record) => sum + record.amount, 0);
  const totalExpense = records.filter((record) => record.record_type === "expense").reduce((sum, record) => sum + record.amount, 0);
  const netProfit = totalIncome - totalExpense;
  const verifiedCount = records.filter((record) => record.is_verified).length;

  useClientGuidance({
    focusLabel: records.length > 0 ? "Finansal özet ve işlem tablosu" : "Henüz finansal kayıt yok",
    summary:
      records.length > 0
        ? "Gelir, gider ve net kâr görünümü burada sade bir operator-style workbench olarak tutulur."
        : "Atlas finance lane'i işlendiğinde gelir ve gider kayıtları bu modülde görünür.",
    metrics: [
      { label: "Kayıt", value: `${records.length}` },
      { label: "Doğrulandı", value: `${verifiedCount}` },
      { label: "Net", value: fmtMoney(netProfit) },
    ],
  });

  return (
    <div className="space-y-6">
      <AtlasHeroBoard
        eyebrow="Finance Workbench"
        title="Finans"
        description="Gelir, gider, fatura referansı ve doğrulanmış kayıtlar aynı finans workbench içinde sade şekilde tutulur."
        tone="cobalt"
        surface="secondary"
        metrics={[
          { label: "Gelir", value: fmtMoney(totalIncome), tone: "success" },
          { label: "Gider", value: fmtMoney(totalExpense), tone: "danger" },
          { label: "Net kâr", value: fmtMoney(netProfit), tone: netProfit >= 0 ? "success" : "danger" },
          { label: "Kayıt", value: `${records.length}`, tone: "primary" },
        ]}
        primaryAction={{ label: "Faturalar", href: "/panel/billing" }}
        secondaryAction={{ label: "Destek merkezi", href: "/panel/support", variant: "outline" }}
      >
        <div className="rounded-[1.2rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-slate-300/85">
          Finans ekranı artık boş tablo görünümü değil; önce P&L sinyalini, sonra filtrelenebilir işlem workbench’ini gösterir.
        </div>
      </AtlasHeroBoard>

      {records.length === 0 ? (
        <AtlasEmptySurface
          title="Henüz finansal kayıt yok"
          description="Gelir ve gider kayıtları finance lane'i açıldığında burada listelenir. Bu modül açıldıktan sonra bile veri yoksa yine aynı empty state görünür."
          tone="cobalt"
          primaryAction={{ label: "Faturaları aç", href: "/panel/billing" }}
          secondaryAction={{ label: "Destek ile ilerle", href: "/panel/support", variant: "outline" }}
        />
      ) : (
        <>
          <AtlasSectionPanel
            eyebrow="P&L Snapshot"
            title="Finansal görünüm"
            description="Tüm kayıtlar arasından toplam gelir, toplam gider, net ve doğrulanmış kayıt sayısını tek bakışta görün."
            badge={`${records.length} işlem`}
          >
            <AtlasStackGrid columns="four">
              <div className="rounded-[1.2rem] border border-emerald-400/15 bg-emerald-500/[0.06] p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <ArrowUpRight className="h-4 w-4 text-emerald-300" />
                  Toplam gelir
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">{fmtMoney(totalIncome)}</p>
              </div>
              <div className="rounded-[1.2rem] border border-rose-400/15 bg-rose-500/[0.06] p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <ArrowDownRight className="h-4 w-4 text-rose-300" />
                  Toplam gider
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">{fmtMoney(totalExpense)}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  {netProfit >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-300" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-300" />
                  )}
                  Net kâr
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">{fmtMoney(netProfit)}</p>
              </div>
              <div className="rounded-[1.2rem] border border-white/8 bg-black/20 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <DollarSign className="h-4 w-4 text-sky-300" />
                  Doğrulanan kayıt
                </div>
                <p className="mt-3 text-2xl font-semibold text-white">{verifiedCount}</p>
              </div>
            </AtlasStackGrid>
          </AtlasSectionPanel>

          <AtlasTableShell
            eyebrow="Transaction Workbench"
            title="İşlem tablosu"
            description="Açıklama, kategori ve kayıt türüne göre filtrelenmiş tüm hareketler tek tabloda görünür."
            badge={`${filtered.length} sonuç`}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Açıklama veya kategori ara..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="border-white/10 bg-white/[0.03] pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full border-white/10 bg-white/[0.03] sm:w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-[1.2rem] border border-white/8 bg-black/20">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/8">
                    <TableHead>Tarih</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Doğrulama</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((record) => (
                    <TableRow key={record.id} className="border-white/8">
                      <TableCell className="whitespace-nowrap">
                        {new Date(record.transaction_date).toLocaleDateString("tr-TR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.record_type === "income" ? "default" : "destructive"}>
                          {record.record_type === "income" ? "Gelir" : "Gider"}
                        </Badge>
                      </TableCell>
                      <TableCell>{ALL_CATEGORIES[record.category] || record.category}</TableCell>
                      <TableCell className="max-w-[340px] truncate">{record.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-white/10 bg-white/[0.03]">
                          {record.is_verified ? "Doğrulandı" : "Bekliyor"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        <span className={record.record_type === "income" ? "text-emerald-300" : "text-rose-300"}>
                          {record.record_type === "income" ? "+" : "−"}
                          {fmtMoney(record.amount, record.currency)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 ? (
                    <TableRow className="border-white/8">
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Filtrelere uyan kayıt bulunamadı.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </AtlasTableShell>
        </>
      )}
    </div>
  );
}
