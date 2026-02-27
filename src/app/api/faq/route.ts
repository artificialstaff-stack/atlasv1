/**
 * ─── Atlas Platform — FAQ API ───
 * GET /api/faq?q=search&category=general&locale=tr
 */

import { NextRequest, NextResponse } from "next/server";
import { searchFAQ, getFAQByCategory, FAQ_CATEGORIES } from "@/lib/knowledge-base";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const category = url.searchParams.get("category") || "";
  const locale = (url.searchParams.get("locale") as "tr" | "en") || "tr";

  let items;

  if (q) {
    items = searchFAQ(q, locale);
  } else if (category) {
    items = getFAQByCategory(category);
  } else {
    items = searchFAQ("", locale);
  }

  // Map to locale-specific output
  const localized = items.map((item) => ({
    id: item.id,
    category: item.category,
    question: locale === "tr" ? item.question_tr : item.question_en,
    answer: locale === "tr" ? item.answer_tr : item.answer_en,
  }));

  return NextResponse.json({
    items: localized,
    categories: FAQ_CATEGORIES.map((c) => ({
      id: c.id,
      label: locale === "tr" ? c.label_tr : c.label_en,
    })),
    total: localized.length,
  });
}
