import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/require-admin";
import {
  getPortalSupportOverview,
  type PortalAssistantResponse,
  type PortalAssistantSuggestion,
} from "@/lib/customer-portal";
import { searchFAQ } from "@/lib/knowledge-base";

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function buildSuggestion(
  id: string,
  kind: PortalAssistantSuggestion["kind"],
  label: string,
  description: string,
  href: string,
  emphasis: PortalAssistantSuggestion["emphasis"],
  formCode?: string | null,
  reason?: string | null,
): PortalAssistantSuggestion {
  return {
    id,
    kind,
    label,
    description,
    href,
    emphasis,
    formCode,
    reason: reason ?? null,
  };
}

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  due_date: string;
  amount: number;
  created_at: string;
};

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const body = (await request.json().catch(() => null)) as { query?: string } | null;
  const rawQuery = body?.query?.trim() ?? "";
  const query = normalize(rawQuery);
  const overview = await getPortalSupportOverview(auth.id);

  const [ordersRes, invoicesRes, subscriptionsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, created_at, tracking_ref, carrier")
      .eq("user_id", auth.id)
      .order("created_at", { ascending: false })
      .limit(5),
    (supabase as unknown as {
      from: (
        table: "invoices",
      ) => {
        select: (
          columns: string,
        ) => {
          eq: (
            field: string,
            value: string,
          ) => {
            order: (
              field: string,
              args: { ascending: boolean },
            ) => {
              limit: (count: number) => Promise<{ data: InvoiceRow[] | null }>;
            };
          };
        };
      };
    })
      .from("invoices")
      .select("id, invoice_number, status, due_date, amount, created_at")
      .eq("user_id", auth.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("user_subscriptions")
      .select("plan_tier, payment_status, valid_until, amount")
      .eq("user_id", auth.id)
      .order("started_at", { ascending: false })
      .limit(1),
  ]);

  const orders = ordersRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const subscriptions = subscriptionsRes.data ?? [];
  const suggestions: PortalAssistantSuggestion[] = [];

  if (overview.assignedRequests[0]) {
    suggestions.push({
      ...overview.assignedRequests[0].primaryAction,
      reason: "Atlas ekibinin sizden bekledigi en kritik adim bu.",
    });
  }

  suggestions.push(
    buildSuggestion(
      "assistant:services",
      "open_process",
      "Gorevlerimi Ac",
      "Onboarding ve hizmet akisindaki guncel kilometre taslarini inceleyin.",
      "/panel/services",
      "secondary",
      null,
      "Surecte nerede oldugunuzu gormek icin en hizli yer."
    ),
    buildSuggestion(
      "assistant:support",
      "open_support",
      "Destek Merkezine Git",
      "Atanan istekler, gonderimler ve genel destek formu ayni yerde.",
      "/panel/support",
      "secondary",
      null,
      "Form veya belge istekleri icin ana merkez."
    ),
  );

  const buildResponse = (payload: Omit<PortalAssistantResponse, "suggestions">): PortalAssistantResponse => ({
    ...payload,
    suggestions,
  });

  if (!query) {
    const nextRequest = overview.assignedRequests.find((item) => item.status !== "completed");
    return NextResponse.json(
      nextRequest
        ? buildResponse({
            answer: `${nextRequest.formCode} formu su an sizden beklenen en onemli adim. ${nextRequest.summary}`,
            confidence: "high",
            suggestedAction: {
              ...nextRequest.primaryAction,
              reason: "Bekleyen form isteginiz dogrudan surec ilerlemesini etkiliyor.",
            },
            suggestedFormCode: nextRequest.formCode,
            deepLink: nextRequest.primaryAction.href,
            fallbackReason: null,
          })
        : buildResponse({
            answer:
              "Su an sizden bekleyen ozel bir form gorunmuyor. Gorevlerim ekranindan Atlas ekibinin yuruttugu isleri takip edebilir veya genel destek formunu acabilirsiniz.",
            confidence: "medium",
            suggestedAction: buildSuggestion(
              "assistant:general-support",
              "form_request",
              "Genel Destek Formunu Ac",
              "Ozel bir soru veya talep iletmek icin genel destek formunu kullanin.",
              "/panel/support/forms/ATL-701",
              "primary",
              "ATL-701",
              "Acik bir gorev yoksa en guvenli yonlendirme genel destek formudur."
            ),
            suggestedFormCode: "ATL-701",
            deepLink: "/panel/support/forms/ATL-701",
            fallbackReason: null,
          })
    );
  }

  if (includesAny(query, ["ne yapmam", "hangi form", "eksik", "form", "belge", "gondermem gerekiyor"])) {
    const nextRequest = overview.assignedRequests.find((item) => item.status !== "completed");
    return NextResponse.json(
      nextRequest
        ? buildResponse({
            answer: `${nextRequest.formCode} formu uzerinden bilgi gondermeniz gerekiyor. ${nextRequest.description}`,
            confidence: "high",
            suggestedAction: {
              ...nextRequest.primaryAction,
              reason: "Bu istek Atlas ekibinin sizden dogrudan bekledigi aksiyon.",
            },
            suggestedFormCode: nextRequest.formCode,
            deepLink: nextRequest.primaryAction.href,
            fallbackReason: null,
          })
        : buildResponse({
            answer:
              "Su an acik bir form istegi gorunmuyor. Destek merkezinde gecmis gonderimlerinizi kontrol edebilir veya genel destek formu ile yeni bir konu baslatabilirsiniz.",
            confidence: "medium",
            suggestedAction: buildSuggestion(
              "assistant:open-support",
              "open_support",
              "Destek Merkezine Git",
              "Acik istekleri ve gecmis gonderimleri tek yerden gorun.",
              "/panel/support",
              "primary",
              null,
              "Acik atama yoksa destek merkezi en iyi baslangic noktasi."
            ),
            suggestedFormCode: null,
            deepLink: "/panel/support",
            fallbackReason: "Acik form istegi bulunamadi.",
          })
    );
  }

  if (includesAny(query, ["sifre", "hesap", "ayar", "profil", "eposta", "telefon"])) {
    return NextResponse.json(
      buildResponse({
        answer:
          "Profil bilgilerinizi ve sifre ayarlarinizi Ayarlar ekranindan yonetebilirsiniz. Sifre degistirme, iletisim bilgileri ve hesap gorunurlugu burada yer alir.",
        confidence: "high",
        suggestedAction: buildSuggestion(
          "assistant:settings",
          "open_settings",
          "Ayarlari Ac",
          "Sifre ve profil bilgilerini yonetmek icin ayarlar ekranina gidin.",
          "/panel/settings",
          "primary",
          null,
          "Hesap ve sifre sorulari icin dogru yuzey ayarlardir."
        ),
        suggestedFormCode: null,
        deepLink: "/panel/settings",
        fallbackReason: null,
      })
    );
  }

  if (includesAny(query, ["siparis", "kargo", "tracking", "takip", "teslimat"])) {
    const activeOrders = orders.filter((order) => !["delivered", "cancelled", "returned"].includes(order.status));
    const latestOrder = orders[0];

    return NextResponse.json(
      buildResponse({
        answer: latestOrder
          ? `Son siparis durumunuz "${latestOrder.status}" olarak gorunuyor. Toplam ${activeOrders.length} aktif siparisiniz var; detay ve takip bilgilerini siparisler ekraninda gorebilirsiniz.`
          : "Su an hesabinizda kayitli bir siparis gorunmuyor. Yeni siparisler olustugunda detaylar siparisler ekraninda listelenir.",
        confidence: latestOrder ? "high" : "medium",
        suggestedAction: buildSuggestion(
          "assistant:orders",
          "open_orders",
          "Siparislerimi Ac",
          "Aktif siparislerinizi, kargo durumlarini ve takip referanslarini gorun.",
          "/panel/orders",
          "primary",
          null,
          "Siparis durumu icin kanonik ekran siparisler sayfasi."
        ),
        suggestedFormCode: null,
        deepLink: "/panel/orders",
        fallbackReason: latestOrder ? null : "Siparis verisi bulunamadi.",
      })
    );
  }

  if (includesAny(query, ["fatura", "odeme", "billing", "abonelik", "plan"])) {
    const pendingInvoices = invoices.filter((invoice) => invoice.status === "pending");
    const latestSubscription = subscriptions[0];
    const invoiceSummary =
      pendingInvoices.length > 0
        ? `${pendingInvoices.length} adet odeme bekleyen faturaniz var.`
        : "Su an odeme bekleyen fatura gorunmuyor.";
    const subscriptionSummary = latestSubscription
      ? ` Aktif planiniz ${latestSubscription.plan_tier} ve son kayitli tutar ${latestSubscription.amount} olarak gorunuyor.`
      : "";

    return NextResponse.json(
      buildResponse({
        answer: `${invoiceSummary}${subscriptionSummary} Fatura gecmisi, odeme adimlari ve banka bilgileri icin faturalandirma ekranini acabilirsiniz.`,
        confidence: "high",
        suggestedAction: buildSuggestion(
          "assistant:billing",
          "open_billing",
          "Faturalandirmayi Ac",
          "Faturalarinizi, odeme durumunu ve abonelik detaylarini goruntuleyin.",
          "/panel/billing",
          "primary",
          null,
          "Fatura ve odeme sorularinin tek kaynagi faturalandirma ekrani."
        ),
        suggestedFormCode: null,
        deepLink: "/panel/billing",
        fallbackReason: null,
      })
    );
  }

  if (includesAny(query, ["surec", "onboarding", "adim", "milestone", "durum"])) {
    const nextRequest = overview.assignedRequests.find((item) => item.status !== "completed");
    return NextResponse.json(
      buildResponse({
        answer: nextRequest
          ? `Onboarding icinde su an en kritik musteri aksiyonu ${nextRequest.formCode} formu. Bunun disindaki adimlari Atlas ekibi sizin adiniza yonetiyor; detaylari Gorevlerim ve Surec Takibi ekranlarinda gorebilirsiniz.`
          : "Su an sizden bekleyen ozel bir musteri aksiyonu gorunmuyor. Atlas ekibi arka plandaki adimlari yurutuuyor; son durumu gorevlerim ve surec takibi ekranlarinda inceleyebilirsiniz.",
        confidence: "high",
        suggestedAction: nextRequest
          ? {
              ...nextRequest.primaryAction,
              reason: "Onboarding surecini en hizli ilerletecek aksiyon bu form.",
            }
          : buildSuggestion(
              "assistant:process",
              "open_process",
              "Surec Takibini Ac",
              "Milestone akisni ve son Atlas guncellemelerini gorun.",
              "/panel/process",
              "primary",
              null,
              "Acik musteri aksiyonu yoksa surec gorunumu daha anlamlidir."
            ),
        suggestedFormCode: nextRequest?.formCode ?? null,
        deepLink: nextRequest?.primaryAction.href ?? "/panel/process",
        fallbackReason: null,
      })
    );
  }

  const faq = searchFAQ(rawQuery, "tr")[0];
  if (faq) {
    return NextResponse.json(
      buildResponse({
        answer: faq.answer_tr,
        confidence: "medium",
        suggestedAction: buildSuggestion(
          "assistant:support-fallback",
          "open_support",
          "Destek Merkezine Git",
          "Bu yanit yetmezse destek merkezinden ilgili form veya gonderimi acin.",
          "/panel/support",
          "secondary",
          null,
          "FAQ yaniti genel bilgi saglar; kisisel surec icin destek merkezine donmek gerekir."
        ),
        suggestedFormCode: null,
        deepLink: "/panel/support",
        fallbackReason: "Yanit statik bilgi tabanindan uretildi.",
      })
    );
  }

  return NextResponse.json(
    buildResponse({
      answer:
        "Bu soruya guvenli ve kisilestirilmis bir yanit cikaramadim. Destek merkezini acip aktif isteklerinizi kontrol etmeniz veya genel destek formu ile Atlas ekibine yazmaniz en dogru yol olur.",
      confidence: "low",
      suggestedAction: buildSuggestion(
        "assistant:general-support-fallback",
        "form_request",
        "Genel Destek Formunu Ac",
        "Atlas ekibine ozel durumunuzu yazin; ekip dogru yonlendirmeyi yapacaktir.",
        "/panel/support/forms/ATL-701",
        "primary",
        "ATL-701",
        "Deterministik yanit uretilemediginde guvenli fallback genel destek formudur."
      ),
      suggestedFormCode: "ATL-701",
      deepLink: "/panel/support/forms/ATL-701",
      fallbackReason: "Soru mevcut kural seti ve bilgi tabaniyla eslesmedi.",
    })
  );
}
