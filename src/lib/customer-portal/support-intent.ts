import {
  getStoreOfferByQuery,
  type StoreOffer,
  type StoreOfferCategory,
} from "@/lib/payments";
import type { PortalSupportUnlockContext } from "./types";

type SearchValue = string | string[] | undefined;
type SearchParamsInput = Record<string, SearchValue> | URLSearchParams | null | undefined;

const MODULE_LABELS: Record<string, string> = {
  companies: "Şirket / LLC",
  store: "Mağaza",
  marketplaces: "Pazaryeri",
  products: "Ürünler",
  orders: "Siparişler",
  warehouse: "Depo",
  social: "Sosyal Medya",
  advertising: "Reklamlar",
  finance: "Finans",
  reports: "Raporlar",
};

function getFirstValue(input: SearchParamsInput, key: string) {
  if (!input) return null;
  if (input instanceof URLSearchParams) {
    return input.get(key);
  }

  const raw = input[key];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatOfferPrice(offer: StoreOffer | null) {
  if (!offer) return null;
  if (typeof offer.oneTimePrice === "number") {
    return `${formatMoney(offer.oneTimePrice)} one-time`;
  }
  if (typeof offer.setupFee === "number" && typeof offer.monthlyPrice === "number") {
    return `${formatMoney(offer.setupFee)} setup + ${formatMoney(offer.monthlyPrice)}/ay`;
  }
  if (typeof offer.monthlyPrice === "number") {
    return `${formatMoney(offer.monthlyPrice)}/ay`;
  }
  if (typeof offer.setupFee === "number") {
    return `${formatMoney(offer.setupFee)} setup`;
  }
  return null;
}

function humanizeModule(key: string | null) {
  if (!key) return "Atlas modülü";
  return MODULE_LABELS[key] ?? key.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSearch(params: {
  intent: string | null;
  fromKey: string | null;
  offerType: StoreOfferCategory | null;
  offerKey: string | null;
}) {
  const search = new URLSearchParams();
  if (params.intent) search.set("intent", params.intent);
  if (params.fromKey) search.set("from", params.fromKey);
  if (params.offerType) search.set("offerType", params.offerType);
  if (params.offerKey) search.set("offerKey", params.offerKey);
  return search.toString();
}

export function buildPortalSupportUnlockContext(searchParams: SearchParamsInput): PortalSupportUnlockContext | null {
  const intent = getFirstValue(searchParams, "intent");
  const fromKey = getFirstValue(searchParams, "from");
  const rawOfferType = getFirstValue(searchParams, "offerType");
  const offerKey = getFirstValue(searchParams, "offerKey");
  const offerType = rawOfferType === "marketplace" || rawOfferType === "addon" || rawOfferType === "bundle"
    ? rawOfferType
    : null;

  if (!intent && !fromKey && !offerType && !offerKey) {
    return null;
  }

  const offer = getStoreOfferByQuery(offerType, offerKey);
  const fromLabel = humanizeModule(fromKey);
  const offerTitle = offer?.title ?? "Destek talebi";
  const offerSummary = offer?.summary ?? `${fromLabel} için açılan destek ve aktivasyon bağlamı.`;
  const query = buildSearch({
    intent,
    fromKey,
    offerType,
    offerKey,
  });

  return {
    intent,
    fromKey,
    fromLabel,
    offerType,
    offerKey,
    offerTitle,
    offerSummary,
    priceLabel: formatOfferPrice(offer),
    supportHubHref: query ? `/panel/support?${query}` : "/panel/support",
    supportFormHref: query ? `/panel/support/forms/ATL-701?${query}` : "/panel/support/forms/ATL-701",
    billingHref: offer ? (query ? `/panel/billing?${query}` : "/panel/billing") : null,
    threadSubjectPrefix: `${fromLabel} · ${offerTitle}`,
    threadMessagePrefix: [
      "Atlas unlock context",
      `Kaynak modül: ${fromLabel}`,
      offerType && offerKey ? `Teklif: ${offerType}/${offerKey}` : null,
      `Başlık: ${offerTitle}`,
    ].filter(Boolean).join("\n"),
  };
}
