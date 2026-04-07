import {
  getMarketplaceChannelOfferings,
  getStoreAddonOfferings,
  getStoreBundleOfferings,
  getStoreMarketplaceOfferByKey,
  getStoreOperationalNotes,
  isMarketplaceChannelKey,
  type MarketplaceChannelKey,
  type StoreAddonClusterKey,
  type StoreOfferTone,
} from "@/lib/payments";
import type {
  CustomerWorkspaceViewModel,
  StoreActiveAccountItem,
  StoreAddonCardViewModel,
  StoreAddonClusterViewModel,
  StoreBundleCardViewModel,
  StoreExperienceMarketplaceCard,
  StoreExperienceViewModel,
  StoreTimelineStep,
} from "./types";

type StoreMarketplaceAccountRecord = {
  id: string;
  platform: string;
  store_name: string;
  status: string;
  store_url: string | null;
  seller_id: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  amazon: "Amazon",
  shopify: "Shopify",
  walmart: "Walmart",
  ebay: "eBay",
  etsy: "Etsy",
  tiktok_shop: "TikTok Shop",
};

const STATUS_LABELS: Record<string, string> = {
  pending_setup: "Kurulum bekleniyor",
  under_review: "Inceleniyor",
  active: "Aktif",
  suspended: "Askida",
  vacation_mode: "Tatil modu",
  closed: "Kapali",
};

const ADDON_CLUSTER_META: Record<
  StoreAddonClusterKey,
  { title: string; summary: string; tone: StoreOfferTone }
> = {
  foundation: {
    title: "Foundation",
    summary: "ABD launch omurgasini kuran yasal ve baslangic servisleri.",
    tone: "blue",
  },
  compliance: {
    title: "Compliance",
    summary: "Vergi ve filing tarafini temiz tutan operasyon katmani.",
    tone: "blue",
  },
  fulfillment: {
    title: "Fulfillment",
    summary: "Hazirlama, paketleme ve sevkiyat hizini guclendiren servisler.",
    tone: "amber",
  },
  demand: {
    title: "Demand",
    summary: "Storefront veya marketplace icin talep ve growth motoru.",
    tone: "violet",
  },
};

function buildOfferHref(section: "support" | "billing", offerType: "marketplace" | "addon" | "bundle", offerKey: string) {
  return `/panel/${section}?offerType=${offerType}&offerKey=${offerKey}`;
}

function formatMoney(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "Custom";
  return `$${value.toFixed(2)}${suffix}`;
}

function getSelectedChannelKey(
  workspace: CustomerWorkspaceViewModel,
  accounts: StoreMarketplaceAccountRecord[],
): MarketplaceChannelKey | null {
  const selectedAccountPlatform = accounts.find((account) => isMarketplaceChannelKey(account.platform))?.platform;
  if (selectedAccountPlatform && isMarketplaceChannelKey(selectedAccountPlatform)) {
    return selectedAccountPlatform;
  }

  return isMarketplaceChannelKey(workspace.selectedMarketplace?.key) ? workspace.selectedMarketplace.key : null;
}

function buildAddonClusters(
  workspace: CustomerWorkspaceViewModel,
): StoreAddonClusterViewModel[] {
  const addonOffers = getStoreAddonOfferings();
  const grouped = new Map<StoreAddonClusterKey, StoreAddonCardViewModel[]>();

  for (const offer of addonOffers) {
    const isStarterOffer = offer.key === "llc_ein";
    const statusLabel =
      isStarterOffer && workspace.starterPaymentState === "confirmed"
        ? "Tamamlandi"
        : isStarterOffer && workspace.starterPaymentState === "paid"
          ? "Onay bekliyor"
          : isStarterOffer && workspace.starterPaymentState === "pending"
            ? "Odeme bekliyor"
            : null;
    const statusTone =
      isStarterOffer && workspace.starterPaymentState === "confirmed"
        ? "emerald"
        : isStarterOffer && (workspace.starterPaymentState === "paid" || workspace.starterPaymentState === "pending")
          ? "amber"
          : null;

    const bucket = grouped.get(offer.clusterKey) ?? [];
    bucket.push({
      ...offer,
      statusLabel,
      statusTone,
      supportHref: buildOfferHref("support", "addon", offer.key),
    });
    grouped.set(offer.clusterKey, bucket);
  }

  return Object.entries(ADDON_CLUSTER_META).map(([key, meta]) => ({
    key: key as StoreAddonClusterKey,
    title: meta.title,
    summary: meta.summary,
    tone: meta.tone,
    offers: grouped.get(key as StoreAddonClusterKey) ?? [],
  }));
}

function buildTimelineSteps(input: {
  workspace: CustomerWorkspaceViewModel;
  selectedChannelKey: MarketplaceChannelKey | null;
  accounts: StoreMarketplaceAccountRecord[];
}): StoreTimelineStep[] {
  const starterDone = input.workspace.starterPaymentState === "confirmed";
  const channelSelected = Boolean(input.selectedChannelKey);
  const hasActiveAccount = input.accounts.some((account) => String(account.status).toLowerCase() === "active");
  const liveReady = input.workspace.launchPhase === "go_live_ready" || input.workspace.launchPhase === "live";

  return [
    {
      id: "foundation",
      label: "Adim 1",
      title: "LLC kurulumu",
      summary: starterDone ? "Launch foundation onaylandi." : "LLC + EIN omurgasi temizleniyor.",
      status: starterDone ? "completed" : "current",
      tone: "blue",
    },
    {
      id: "readiness",
      label: "Adim 2",
      title: "EIN ve odeme hazirligi",
      summary: starterDone ? "Payout ve billing readiness tamam." : "EIN ve starter onayi bekleniyor.",
      status: starterDone ? "completed" : "upcoming",
      tone: "emerald",
    },
    {
      id: "selection",
      label: "Adim 3",
      title: "Kanal secimi ve magaza setup",
      summary: channelSelected ? "Birincil kanal secildi; setup akisi bu kanal uzerinden ilerliyor." : "Birincil kanal secimi ve setup burada baslar.",
      status: channelSelected ? (hasActiveAccount ? "completed" : "current") : "upcoming",
      tone: "amber",
    },
    {
      id: "go-live",
      label: "Adim 4",
      title: "Go-live ve ilk siparis",
      summary: hasActiveAccount || liveReady ? "Aktif hesaplar ve ilk siparis performansi izlenir." : "Operasyon canliya yaklastikca bu alan aktiflesir.",
      status: hasActiveAccount || liveReady ? "current" : "upcoming",
      tone: "violet",
    },
  ];
}

export function buildStoreExperienceViewModel(input: {
  workspace: CustomerWorkspaceViewModel;
  accounts: StoreMarketplaceAccountRecord[];
}): StoreExperienceViewModel {
  const { workspace, accounts } = input;
  const selectedChannelKey = getSelectedChannelKey(workspace, accounts);
  const selectedMarketplaceOffer = getStoreMarketplaceOfferByKey(selectedChannelKey);
  const selectedAccount = selectedChannelKey
    ? accounts.find((account) => String(account.platform).toLowerCase() === selectedChannelKey) ?? null
    : accounts[0] ?? null;
  const channelSelectionLocked = workspace.starterPaymentState !== "confirmed" && accounts.length === 0;
  const hasPrimarySelection = Boolean(selectedMarketplaceOffer) || accounts.length > 0;
  const llcOffer = getStoreAddonOfferings().find((offer) => offer.key === "llc_ein") ?? null;

  const marketplaceCards: StoreExperienceMarketplaceCard[] = getMarketplaceChannelOfferings().map((offer) => {
    const linkedAccount = accounts.find((account) => String(account.platform).toLowerCase() === offer.key) ?? null;
    const hasActiveAccount = String(linkedAccount?.status ?? "").toLowerCase() === "active";
    const isSelected = selectedChannelKey === offer.key || Boolean(linkedAccount);

    let state: StoreExperienceMarketplaceCard["state"];
    let stateLabel: string;
    let stateSummary: string;

    if (hasActiveAccount) {
      state = "active";
      stateLabel = "Aktif hesap";
      stateSummary = "Marketplace hesabi aktif; billing ve operasyon bu kanal uzerinden ilerliyor.";
    } else if (isSelected) {
      state = "selected";
      stateLabel = linkedAccount ? STATUS_LABELS[linkedAccount.status] ?? linkedAccount.status : "Secildi";
      stateSummary = linkedAccount
        ? "Secili kanal icin hesap acilisi devam ediyor."
        : "Secim kayitli; setup ve billing akisi bu kanal uzerinden ilerliyor.";
    } else if (channelSelectionLocked || hasPrimarySelection) {
      state = "disabled";
      stateLabel = channelSelectionLocked ? "Starter onayi bekleniyor" : "Tek kanal secili";
      stateSummary = channelSelectionLocked
        ? "Starter paketi onaylanmadan marketplace secimi aktiflesmez."
        : "V1 akışında ayni anda yalnizca tek bir birincil kanal secilebilir.";
    } else {
      state = "available";
      stateLabel = "Secime hazir";
      stateSummary = "Bu kanal secildiginde setup ve aylik yonetim faturasi billing tarafina duser.";
    }

    return {
      ...offer,
      state,
      stateLabel,
      stateSummary,
      billingHref: buildOfferHref("billing", "marketplace", offer.key),
      supportHref: buildOfferHref("support", "marketplace", offer.key),
      canSelect: state === "available",
      hasActiveAccount,
    };
  });

  const addonClusters = buildAddonClusters(workspace);
  const bundleCards: StoreBundleCardViewModel[] = getStoreBundleOfferings().map((offer) => ({
    ...offer,
    supportHref: buildOfferHref("support", "bundle", offer.key),
  }));

  const heroTitle = selectedMarketplaceOffer
    ? `${selectedMarketplaceOffer.title} icin commerce control room aktif.`
    : channelSelectionLocked
      ? "Launch foundation tamamlanmadan kanal secimi acilmaz."
      : "Birincil kanalinizi secmeye hazirsiniz.";

  const heroDescription = selectedMarketplaceOffer
    ? `${selectedMarketplaceOffer.title} setup, aylik yonetim ve ilgili servis katmanlari buradan takip edilir. Ayrintili risk ve gereksinimler her kartin icinde acilir.`
    : channelSelectionLocked
      ? "LLC + EIN omurgasi onaylaninca marketplace kartlari secime acilir; simdilik tum kanallari, addon'lari ve bundle katmanlarini onceden karsilastirabilirsiniz."
      : "Tum kanallar gorunur kalir. Setup, aylik yonetim ve ek servis katmanlarini acilir kartlarla karsilastirip tek bir birincil kanal secersiniz.";

  const heroPrimaryAction = selectedMarketplaceOffer
    ? { label: "Secili kanal faturasini ac", href: buildOfferHref("billing", "marketplace", selectedMarketplaceOffer.key) }
    : channelSelectionLocked
      ? { label: "Starter faturasini ac", href: buildOfferHref("billing", "addon", llcOffer?.key ?? "llc_ein") }
      : { label: "Kanal paketlerini incele", href: "/panel/store#marketplace-zone" };

  const activeAccounts: StoreActiveAccountItem[] = accounts.map((account) => ({
    id: account.id,
    platform: account.platform,
    platformLabel: PLATFORM_LABELS[account.platform] ?? account.platform,
    storeName: account.store_name,
    status: account.status,
    statusLabel: STATUS_LABELS[account.status] ?? account.status,
    storeUrl: account.store_url,
    sellerId: account.seller_id,
    isPrimary: String(account.platform).toLowerCase() === selectedChannelKey,
  }));

  return {
    hero: {
      eyebrow: "Commerce Control Room",
      title: heroTitle,
      description: heroDescription,
      statusLabel: selectedMarketplaceOffer ? "Secili kanal aktif" : channelSelectionLocked ? "Foundation kilidi" : "Marketplace secimi acik",
      primaryAction: heroPrimaryAction,
      secondaryAction: { label: "Destek Merkezi", href: "/panel/support" },
      metrics: [
        { label: "Launch", value: workspace.launchPhase, tone: "primary" },
        { label: "Secili kanal", value: selectedMarketplaceOffer?.title ?? "Secilmedi", tone: selectedMarketplaceOffer ? "success" : "warning" },
        {
          label: "Paket ritmi",
          value: selectedMarketplaceOffer
            ? `${formatMoney(selectedMarketplaceOffer.setupFee)} + ${formatMoney(selectedMarketplaceOffer.monthlyPrice, "/ay")}`
            : llcOffer?.oneTimePrice
              ? formatMoney(llcOffer.oneTimePrice)
              : "Hazirlaniyor",
          tone: selectedMarketplaceOffer ? "success" : "default",
        },
        {
          label: "Aktif hesap",
          value: String(activeAccounts.length),
          tone: activeAccounts.length > 0 ? "success" : "default",
        },
      ],
      readinessItems: [
        {
          id: "company",
          label: "Sirket",
          value: workspace.companyName ?? "LLC bekleniyor",
          summary: "LLC kurulumu ve resmi evrak omurgasi temizlenmeden marketplace setup baslamaz.",
          tone: workspace.companyName ? "emerald" : "blue",
        },
        {
          id: "ein",
          label: "EIN",
          value: channelSelectionLocked ? "Bekleniyor" : "Hazir",
          summary: "Payout, verification ve billing readiness EIN tarafina baglidir.",
          tone: channelSelectionLocked ? "amber" : "emerald",
        },
        {
          id: "billing",
          label: "Starter",
          value:
            workspace.starterPaymentState === "confirmed"
              ? "Onaylandi"
              : workspace.starterPaymentState === "paid"
                ? "Onay bekliyor"
                : workspace.starterPaymentState === "pending"
                  ? "Odeme bekliyor"
                  : "Baslatilmadi",
          summary: "LLC + EIN paketi bu sayfadaki tum marketplace CTA'larinin kilidini acan adimdir.",
          tone:
            workspace.starterPaymentState === "confirmed"
              ? "emerald"
              : workspace.starterPaymentState === "none"
                ? "slate"
                : "amber",
        },
        {
          id: "marketplace",
          label: "Marketplace",
          value: selectedMarketplaceOffer?.title ?? "Secim yok",
          summary:
            selectedMarketplaceOffer
              ? "Birincil kanal secili; ilgili setup ve aylik yonetim bu kanal uzerinden ilerler."
              : "V1'de ayni anda tek bir primary channel secilir.",
          tone: selectedMarketplaceOffer ? "violet" : "slate",
        },
      ],
      spotlight:
        selectedMarketplaceOffer || selectedAccount
          ? {
              title: selectedMarketplaceOffer?.title ?? PLATFORM_LABELS[selectedAccount?.platform ?? ""] ?? "Secili kanal",
              summary: selectedAccount
                ? `${selectedAccount.store_name} icin hesap acilisi ${STATUS_LABELS[selectedAccount.status] ?? selectedAccount.status.toLowerCase()} durumunda.`
                : `${selectedMarketplaceOffer?.title ?? "Secili kanal"} icin billing ve admin aktivasyon akisi devam ediyor.`,
              stateLabel: selectedAccount ? STATUS_LABELS[selectedAccount.status] ?? selectedAccount.status : "Secili kanal",
              href: selectedMarketplaceOffer ? buildOfferHref("billing", "marketplace", selectedMarketplaceOffer.key) : null,
            }
          : null,
    },
    selectedChannelKey,
    channelSelectionLocked,
    marketplaceCards,
    addonClusters,
    bundleCards,
    operationalNotes: getStoreOperationalNotes(),
    timelineSteps: buildTimelineSteps({ workspace, selectedChannelKey, accounts }),
    activeAccounts,
    activeAccountsSummary:
      activeAccounts.length > 0
        ? "Acilmis marketplace hesaplari ve seller durumlari burada gorunur."
        : selectedMarketplaceOffer
          ? `${selectedMarketplaceOffer.title} secimi kayitli. Admin ekip aktivasyonu tamamladiginda hesap burada gorunecek.`
          : "Henuz acilmis bir pazaryeri hesabi yok. Starter onayi tamamlandiginda birincil kanal secimi acilir.",
  };
}
