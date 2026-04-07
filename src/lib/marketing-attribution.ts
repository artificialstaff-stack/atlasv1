export const MARKETING_ATTRIBUTION_STORAGE_KEY = "atlas-marketing-attribution";

const TRACKING_QUERY_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "ttclid",
  "li_fat_id",
  "msclkid",
] as const;

type TrackingQueryKey = (typeof TRACKING_QUERY_KEYS)[number];

export interface MarketingAttribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  click_id: string | null;
  click_id_type: string | null;
  landing_page: string | null;
  referrer_url: string | null;
  captured_at: string | null;
}

function getClickId(params: URLSearchParams) {
  const clickIds = [
    { key: "gclid", type: "google_ads" },
    { key: "fbclid", type: "meta_ads" },
    { key: "ttclid", type: "tiktok_ads" },
    { key: "li_fat_id", type: "linkedin_ads" },
    { key: "msclkid", type: "microsoft_ads" },
  ] as const;

  for (const item of clickIds) {
    const value = params.get(item.key);
    if (value) {
      return { click_id: value, click_id_type: item.type };
    }
  }

  return { click_id: null, click_id_type: null };
}

export function hasTrackingParams(params: URLSearchParams) {
  return TRACKING_QUERY_KEYS.some((key) => Boolean(params.get(key)));
}

export function extractAttribution(
  params: URLSearchParams,
  pathname: string,
  referrer?: string | null,
): MarketingAttribution {
  const { click_id, click_id_type } = getClickId(params);

  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    click_id,
    click_id_type,
    landing_page: pathname,
    referrer_url: referrer || null,
    captured_at: new Date().toISOString(),
  };
}

export function mergeAttribution(
  existing: MarketingAttribution | null,
  incoming: MarketingAttribution,
): MarketingAttribution {
  if (!existing) {
    return incoming;
  }

  return {
    utm_source: existing.utm_source || incoming.utm_source,
    utm_medium: existing.utm_medium || incoming.utm_medium,
    utm_campaign: existing.utm_campaign || incoming.utm_campaign,
    utm_content: existing.utm_content || incoming.utm_content,
    utm_term: existing.utm_term || incoming.utm_term,
    click_id: existing.click_id || incoming.click_id,
    click_id_type: existing.click_id_type || incoming.click_id_type,
    landing_page: existing.landing_page || incoming.landing_page,
    referrer_url: existing.referrer_url || incoming.referrer_url,
    captured_at: existing.captured_at || incoming.captured_at,
  };
}

export function readStoredAttribution(
  storage: Pick<Storage, "getItem"> | null,
): MarketingAttribution | null {
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(MARKETING_ATTRIBUTION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MarketingAttribution>;

    return {
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      utm_content: parsed.utm_content ?? null,
      utm_term: parsed.utm_term ?? null,
      click_id: parsed.click_id ?? null,
      click_id_type: parsed.click_id_type ?? null,
      landing_page: parsed.landing_page ?? null,
      referrer_url: parsed.referrer_url ?? null,
      captured_at: parsed.captured_at ?? null,
    };
  } catch {
    return null;
  }
}

export function writeStoredAttribution(
  storage: Pick<Storage, "setItem"> | null,
  attribution: MarketingAttribution,
) {
  if (!storage) {
    return;
  }

  storage.setItem(
    MARKETING_ATTRIBUTION_STORAGE_KEY,
    JSON.stringify(attribution),
  );
}

export function getTrackingValue(
  params: URLSearchParams,
  key: TrackingQueryKey,
) {
  return params.get(key);
}
