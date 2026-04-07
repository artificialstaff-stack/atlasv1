import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/portal/financial-summary
 * Müşteri paneli finansal özet — Observer model:
 * Toplam satış geliri, Atlas komisyonu, net bakiye, çekim durumu
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Finansal kayıtları çek
  const { data: records } = await supabase
    .from("financial_records")
    .select("record_type, amount, category, transaction_date, currency")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  // Gelir/Gider hesapla
  const totalIncome =
    records
      ?.filter((r) => r.record_type === "income")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;

  const totalExpense =
    records
      ?.filter((r) => r.record_type === "expense")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;

  // Atlas komisyonu (gider kategorilerinden)
  const atlasCommission =
    records
      ?.filter(
        (r) =>
          r.record_type === "expense" &&
          ["marketplace_fees", "service_fee", "atlas_commission"].includes(r.category)
      )
      .reduce((sum, r) => sum + (r.amount ?? 0), 0) ?? 0;

  // Net bakiye (gelir - gider, Atlas'ın tuttuğu para müşteri hesabı)
  const netBalance = totalIncome - totalExpense;

  // Aylık trend (son 6 ay)
  const now = new Date();
  const monthlyTrends: Array<{ month: string; income: number; expense: number; net: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthLabel = d.toLocaleDateString("tr-TR", { month: "short" });

    const monthRecords = records?.filter((r) => {
      const rd = new Date(r.transaction_date);
      return rd >= d && rd <= monthEnd;
    }) ?? [];

    const income = monthRecords
      .filter((r) => r.record_type === "income")
      .reduce((s, r) => s + (r.amount ?? 0), 0);
    const expense = monthRecords
      .filter((r) => r.record_type === "expense")
      .reduce((s, r) => s + (r.amount ?? 0), 0);

    monthlyTrends.push({ month: monthLabel, income, expense, net: income - expense });
  }

  // Son işlemler (son 5)
  const recentTransactions =
    records?.slice(0, 5).map((r) => ({
      type: r.record_type,
      category: r.category,
      amount: r.amount,
      currency: r.currency ?? "USD",
      date: r.transaction_date,
    })) ?? [];

  return NextResponse.json({
    totalIncome,
    totalExpense,
    atlasCommission,
    netBalance,
    currency: "USD",
    monthlyTrends,
    recentTransactions,
    summary: {
      grossSalesLabel: "Brüt Satış Geliri",
      commissionLabel: "Atlas Komisyonu",
      netBalanceLabel: "Çekilebilir Bakiye",
      currency: "USD",
    },
  });
}
