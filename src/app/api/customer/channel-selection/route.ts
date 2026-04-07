import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerRequest } from "@/lib/customer-workspace";
import {
  createInvoice,
  getStoreMarketplaceOfferByKey,
  isMarketplaceChannelKey,
  type MarketplaceChannelKey,
  type PlanTier,
} from "@/lib/payments";

const CHANNEL_CONFIG: Record<
  MarketplaceChannelKey,
  {
    planTier: Extract<PlanTier, "growth">;
    requestMessage: string;
  }
> = {
  amazon: {
    planTier: "growth",
    requestMessage:
      "Müşteri Amazon kanalını seçti. Seller setup, verification, payout ve ilk katalog akışını başlatın.",
  },
  shopify: {
    planTier: "growth",
    requestMessage:
      "Müşteri Shopify kanalını seçti. Storefront, payments, shipping ve domain akışını başlatın.",
  },
  walmart: {
    planTier: "growth",
    requestMessage:
      "Müşteri Walmart kanalını seçti. Approval-heavy onboarding, payout ve catalog readiness akışını başlatın.",
  },
  ebay: {
    planTier: "growth",
    requestMessage:
      "Müşteri eBay kanalını seçti. Store policy, promoted listings, pricing ve support akışını başlatın.",
  },
  etsy: {
    planTier: "growth",
    requestMessage:
      "Müşteri Etsy kanalını seçti. Shop policy, SEO/tag setup ve ilk listing akışını başlatın.",
  },
};

function parseChannel(value: unknown): MarketplaceChannelKey | null {
  return isMarketplaceChannelKey(value) ? value : null;
}

function inferChannelFromInvoice(invoice: { notes?: string | null; plan_tier?: string | null } | null) {
  const haystack = `${invoice?.notes ?? ""} ${invoice?.plan_tier ?? ""}`.toLowerCase();
  for (const channel of ["amazon", "shopify", "walmart", "ebay", "etsy"] as const) {
    if (haystack.includes(channel)) {
      return channel;
    }
  }

  return null;
}

function addDays(days: number) {
  const target = new Date();
  target.setDate(target.getDate() + days);
  return target.toISOString();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        channel?: string;
      }
    | null;

  const channel = parseChannel(body?.channel);
  if (!channel) {
    return NextResponse.json({ error: "Geçerli bir pazaryeri seçimi zorunludur." }, { status: 400 });
  }

  const channelConfig = CHANNEL_CONFIG[channel];
  const channelOffer = getStoreMarketplaceOfferByKey(channel);
  if (!channelOffer) {
    return NextResponse.json({ error: "Seçilen kanal katalogda bulunamadı." }, { status: 400 });
  }
  const db = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: ReturnType<typeof createAdminClient>["from"];
  };

  const [
    { data: company },
    { data: starterInvoice },
    { data: existingMarketplace },
    { data: managementInvoices },
    { data: existingMarketplaceAccounts },
  ] =
    await Promise.all([
      db.from("customer_companies").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_tier", "starter")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("marketplace_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("platform", channel)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .eq("plan_tier", channelConfig.planTier)
        .in("status", ["pending", "paid", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(20),
      db.from("marketplace_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

  if (!company?.id || !company.ein_number) {
    return NextResponse.json(
      { error: "Kanal seçimi için önce LLC ve EIN omurgası tamamlanmalıdır." },
      { status: 409 },
    );
  }

  if (starterInvoice?.status !== "confirmed") {
    return NextResponse.json(
      { error: "Kanal seçimi aktif olmadan önce LLC + EIN başlangıç paketi onaylanmalıdır." },
      { status: 409 },
    );
  }

  const existingManagementInvoice =
    (managementInvoices ?? []).find((invoice) => inferChannelFromInvoice(invoice) === channel) ?? null;
  const otherManagementInvoice = (managementInvoices ?? []).find((invoice) => {
    const inferredChannel = inferChannelFromInvoice(invoice);
    return inferredChannel && inferredChannel !== channel;
  });
  const otherMarketplaceAccount = (existingMarketplaceAccounts ?? []).find((account) => {
    const platform = String(account.platform ?? "").toLowerCase();
    return platform && platform !== channel;
  });

  if (otherManagementInvoice || otherMarketplaceAccount) {
    return NextResponse.json(
      { error: "V1 akışında aynı anda yalnızca tek bir birincil kanal seçebilirsiniz." },
      { status: 409 },
    );
  }

  await createCustomerRequest({
    userId: user.id,
    subject: `${channelOffer.title} kanal seçimi`,
    message: channelConfig.requestMessage,
    workstreamKey: "marketplaces",
  });

  await db.from("workflow_events").insert({
    user_id: user.id,
    event_type: "marketplace_selection_requested",
    title: `${channelOffer.title} kanal seçimi`,
    description: channelConfig.requestMessage,
    payload: {
      channel,
      title: channelOffer.title,
      setupFee: channelOffer.setupFee,
      monthlyPrice: channelOffer.monthlyPrice,
    },
    actor_type: "customer",
  });

  let invoice = existingManagementInvoice ?? null;
  if (!invoice) {
    invoice = await createInvoice({
      userId: user.id,
      planTier: channelConfig.planTier,
      amount: channelOffer.monthlyPrice ?? 0,
      dueDate: addDays(7),
      notes: `${channelOffer.title} secimi · setup $${channelOffer.setupFee.toFixed(2)} · monthly $${(channelOffer.monthlyPrice ?? 0).toFixed(2)}`,
    });
  }

  return NextResponse.json(
    {
      success: true,
      selection: {
        channel,
        title: channelOffer.title,
        setupFee: channelOffer.setupFee,
        monthlyPrice: channelOffer.monthlyPrice,
        planTier: channelConfig.planTier,
        invoiceStatus: invoice?.status ?? null,
        marketplaceStatus: existingMarketplace?.status ?? null,
      },
    },
    { status: 201 },
  );
}
