export type BillingCadence = "one_time" | "monthly" | "custom";

export type BillingPackage = {
  name: string;
  price: number;
  currency: "USD";
  cadence: BillingCadence;
  summary: string;
  features: string[];
  lineItems?: Array<{
    label: string;
    price: number;
  }>;
  popular?: boolean;
};

export type PlanTier = "starter" | "growth" | "professional" | "global_scale";
export type MarketplaceChannelKey = "amazon" | "shopify" | "walmart" | "ebay" | "etsy";
export type StoreOfferCategory = "marketplace" | "addon" | "bundle";
export type StoreOfferSelectionMode = "selectable" | "support" | "quote";
export type StoreOfferTone = "emerald" | "blue" | "amber" | "rose" | "violet" | "slate";
export type StoreOfferSurfaceStyle =
  | "velocity"
  | "storefront"
  | "verification"
  | "market-flex"
  | "crafted"
  | "foundation"
  | "compliance"
  | "fulfillment"
  | "demand"
  | "growth"
  | "enterprise";
export type StoreOfferMotionPreset =
  | "amazon"
  | "shopify"
  | "walmart"
  | "ebay"
  | "etsy"
  | "addon"
  | "bundle";
export type StoreAddonClusterKey = "foundation" | "compliance" | "fulfillment" | "demand";

export type StoreOfferPriorityBadge = {
  text: string;
  tone: StoreOfferTone;
};

type StoreOfferBase = {
  key: string;
  title: string;
  category: StoreOfferCategory;
  summary: string;
  detailedDescription: string;
  features: string[];
  includedServices: string[];
  badge: string;
  priorityBadge?: StoreOfferPriorityBadge;
  riskNote?: string;
  tip?: string;
  ctaLabel: string;
  selectionMode: StoreOfferSelectionMode;
  setupFee: number;
  monthlyPrice: number | null;
  oneTimePrice: number | null;
  visualTone: StoreOfferTone;
  surfaceStyle: StoreOfferSurfaceStyle;
  motionPreset: StoreOfferMotionPreset;
  archetype: string;
  bestFor: string;
  primaryOutcome: string;
  atlasHandles: string[];
  customerNeeds: string[];
  comparisonPriority: number;
};

export type StoreMarketplaceOffer = StoreOfferBase & {
  category: "marketplace";
  key: MarketplaceChannelKey;
  setupFocus: string;
  requirements: string[];
  recommendedPlanTier: Extract<PlanTier, "growth">;
};

export type StoreAddonOffer = StoreOfferBase & {
  category: "addon";
  cadence: Exclude<BillingCadence, "custom">;
  clusterKey: StoreAddonClusterKey;
};

export type StoreBundleOffer = StoreOfferBase & {
  category: "bundle";
  includedChannels: MarketplaceChannelKey[];
  bundleIncludes: string[];
};

export type StoreOffer = StoreMarketplaceOffer | StoreAddonOffer | StoreBundleOffer;
export type MarketplaceChannelOffering = StoreMarketplaceOffer;

export type StoreOfferQuery = {
  offerType: StoreOfferCategory;
  offerKey: string;
};

export type OperationalFeeNote = {
  key: string;
  label: string;
  value: string;
  summary: string;
};

export const PAYMENT_CATALOG: Record<PlanTier, BillingPackage> = {
  starter: {
    name: "LLC + EIN Baslangic Paketi",
    price: 400,
    currency: "USD",
    cadence: "one_time",
    summary: "Sirket kurulusu ve EIN kaydi icin tek seferlik baslangic paketi.",
    lineItems: [
      { label: "LLC Kurulumu", price: 350 },
      { label: "EIN Kaydi", price: 50 },
    ],
    features: [
      "LLC kurulus dosyalama",
      "EIN basvuru ve takip",
      "Temel evrak kontrol listesi",
      "Panel ici onboarding erisimi",
      "E-posta destegi",
      "Atlas operasyon gorunurlugu",
    ],
  },
  growth: {
    name: "Marketplace Kurulum + Aylik Yonetim",
    price: 750,
    currency: "USD",
    cadence: "monthly",
    popular: true,
    summary: "Secilen marketplace icin tek kanalli kurulum, operasyon ve aylik takip paketi.",
    features: [
      "Amazon / Shopify / Walmart / eBay / Etsy yonetimi",
      "Marketplace launch checklist",
      "Haftalik operasyon takibi",
      "Fulfillment ve depo koordinasyonu",
      "Aylik raporlama",
      "Oncelikli destek",
    ],
  },
  professional: {
    name: "Cok Kanalli Kurulum + Aylik Yonetim",
    price: 1850,
    currency: "USD",
    cadence: "monthly",
    summary: "Birden fazla marketplace ve magaza icin gelismis yonetim paketi.",
    features: [
      "Amazon + Walmart bundle kapsami",
      "Capraz kanal launch plani",
      "Gunluk operasyon gorunurlugu",
      "Reklam ve katalog koordinasyonu",
      "Priority support",
      "Unified analytics",
    ],
  },
  global_scale: {
    name: "Kurumsal / Custom",
    price: 2950,
    currency: "USD",
    cadence: "custom",
    summary: "Tum platformlar ve ileri operasyon kapsami icin teklif bazli kurumsal paket.",
    features: [
      "Tum 5 platform yonetimi",
      "Ghost mode ve dedicated owner",
      "Custom integration kapsami",
      "7/24 oncelikli iletisim",
      "Ozel strateji toplantilari",
      "Teklif bazli fiyatlandirma",
    ],
  },
};

export const MARKETPLACE_CHANNEL_CATALOG: StoreMarketplaceOffer[] = [
  {
    key: "amazon",
    title: "Amazon",
    category: "marketplace",
    badge: "Marketplace-first",
    summary: "Seller Central tam yonetim, PPC optimizasyonu ve buybox stratejisiyle en hizli launch rotasi.",
    detailedDescription:
      "Amazon Pro ile Seller Central kurulumu, listing yapisi, PPC kampanyalari ve FBA entegrasyonu tek operasyon akisi olarak yurur.",
    setupFee: 1250,
    monthlyPrice: 750,
    oneTimePrice: null,
    visualTone: "amber",
    surfaceStyle: "velocity",
    motionPreset: "amazon",
    archetype: "Velocity channel",
    bestFor: "Hizli launch, rekabetci kategori ve operasyon disiplini isteyen markalar.",
    primaryOutcome: "Seller Central launch, catalog omurgasi ve account health.",
    atlasHandles: [
      "Seller verification ve account setup",
      "Catalog, FBA ve shipping omurgasi",
      "PPC + buybox optimizasyon cikisi",
    ],
    customerNeeds: [
      "Seller Central dogrulamasi",
      "Vergi ve payout hazirligi",
      "Shipping / return politikalari",
      "Ilk katalog ve fiyat datasi",
    ],
    setupFocus: "Seller verification, tax, shipping, returns ve ilk listing akisi burada kurulur.",
    requirements: [
      "Seller Central dogrulamasi",
      "Vergi ve payout hazirligi",
      "Shipping / return ayarlari",
      "Ilk katalog ve fiyat girisi",
    ],
    features: [
      "Seller Central tam yonetim",
      "PPC reklam optimizasyonu",
      "Buybox fiyat stratejisi",
      "FBA entegrasyonu",
      "Stok ve siparis takibi",
    ],
    includedServices: [
      "Seller Central hesap yonetimi",
      "Urun listeleme ve optimizasyonu",
      "PPC kampanya yonetimi",
      "Buybox stratejisi",
      "FBA entegrasyonu",
      "Siparis yonetimi",
      "Musteri hizmetleri",
      "Performans takibi",
      "Stok yonetimi",
      "Raporlama ve analiz",
    ],
    priorityBadge: { text: "Yuksek rekabetli", tone: "rose" },
    riskNote: "Amazon komisyon ve rekabet acisindan en sert kanallardan biridir; kategoriye gore %8-20 bandi gorebilirsiniz.",
    tip: "Amazon'a girecekseniz payout, returns ve catalog readiness tarafini en bastan temiz kurmak gerekir.",
    ctaLabel: "Amazon ile ilerle",
    selectionMode: "selectable",
    recommendedPlanTier: "growth",
    comparisonPriority: 1,
  },
  {
    key: "shopify",
    title: "Shopify",
    category: "marketplace",
    badge: "Brand storefront",
    summary: "Bagimsiz magazaniz icin storefront, theme, email ve pazarlama otomasyon odakli kanal.",
    detailedDescription:
      "Shopify Brand ile storefront kurgusu, domain, payments, shipping politikasi ve email marketing otomasyonu bir arada kurulur.",
    setupFee: 1000,
    monthlyPrice: 1000,
    oneTimePrice: null,
    visualTone: "emerald",
    surfaceStyle: "storefront",
    motionPreset: "shopify",
    archetype: "Brand-owned store",
    bestFor: "Komisyonu dusurup kendi marka deneyimini kurmak isteyen satıcılar.",
    primaryOutcome: "Storefront, domain, payments ve growth-ready checkout yapisi.",
    atlasHandles: [
      "Storefront ve theme kurulumu",
      "Payments, shipping ve domain baglantisi",
      "Email + traffic growth setup",
    ],
    customerNeeds: [
      "Store name ve storefront yonu",
      "Payments ve currency bilgisi",
      "Shipping / return politikalari",
      "Temel merchandising kararlari",
    ],
    setupFocus: "Storefront, theme, payments, shipping ve domain baglantisi bu kanalin omurgasidir.",
    requirements: [
      "Store name ve storefront setup",
      "Payments ve currency ayari",
      "Shipping / return politikasi",
      "Domain ve merchandising",
    ],
    features: [
      "Storefront ve tema kurulumu",
      "Email marketing automation",
      "Meta / Google campaign setup",
      "Conversion optimizasyonu",
      "Siparis ve envanter koordinasyonu",
    ],
    includedServices: [
      "Shopify magaza yonetimi",
      "Urun ve koleksiyon yonetimi",
      "Google Ads kampanyalari",
      "Facebook / Instagram Ads",
      "Email marketing automation",
      "Siparis ve envanter yonetimi",
      "Musteri hizmetleri",
      "SEO optimizasyonu",
      "Conversion rate optimization",
      "Analytics ve raporlama",
    ],
    priorityBadge: { text: "En dusuk komisyon", tone: "emerald" },
    riskNote: "Shopify organik trafik getirmez; storefront kalitesi ve talep motoru dogrudan sonucu belirler.",
    tip: "Kendi markasini buyutmek isteyen musteriler icin en guclu storefront secenegidir.",
    ctaLabel: "Shopify ile ilerle",
    selectionMode: "selectable",
    recommendedPlanTier: "growth",
    comparisonPriority: 2,
  },
  {
    key: "walmart",
    title: "Walmart",
    category: "marketplace",
    badge: "Approval-heavy",
    summary: "Daha siki onay isteyen ama ABD perakende tarafinda guclu potansiyel tasiyan kanal.",
    detailedDescription:
      "Walmart Pro ile seller onboarding, sponsored search, payout readiness ve fulfillment uygunlugu Atlas tarafinda kurulur.",
    setupFee: 1500,
    monthlyPrice: 850,
    oneTimePrice: null,
    visualTone: "blue",
    surfaceStyle: "verification",
    motionPreset: "walmart",
    archetype: "Compliance-first retail",
    bestFor: "Onay surecine hazir, retail guveniyle buyumek isteyen markalar.",
    primaryOutcome: "Approval, catalog compliance ve fulfillment readiness omurgasi.",
    atlasHandles: [
      "Business verification ve payout setup",
      "Catalog / GTIN ve category readiness",
      "Account health ve sponsored search takibi",
    ],
    customerNeeds: [
      "Business verification evraklari",
      "Payout method ve market details",
      "Catalog / GTIN hazirligi",
      "US warehouse ve return capability",
    ],
    setupFocus: "Business verification, payout, catalog ve fulfillment readiness once tamamlanir.",
    requirements: [
      "Business verification",
      "Payout method ve market details",
      "Catalog / GTIN hazirligi",
      "US warehouse ve return capability",
    ],
    features: [
      "Walmart marketplace yonetimi",
      "Sponsored Search kampanyalari",
      "Account health takibi",
      "Kategori genisleme stratejisi",
      "Fiyat optimizasyonu",
    ],
    includedServices: [
      "Walmart Marketplace yonetimi",
      "Urun listeleme ve optimizasyonu",
      "Sponsored Search kampanyalari",
      "Account health takibi",
      "Siparis yonetimi",
      "Musteri hizmetleri",
      "Fiyat optimizasyonu",
      "Performans raporlari",
      "Stok yonetimi",
      "Kategori genisleme stratejisi",
    ],
    priorityBadge: { text: "Verification-heavy", tone: "amber" },
    riskNote: "Onay ve verification adimlari Amazon veya eBay'e gore daha sabirli ilerleme ister.",
    tip: "Retail tarafinda uzun vadeli daha guvenli bir oyuncu olmak icin Walmart iyi ikinci sira secimidir.",
    ctaLabel: "Walmart ile ilerle",
    selectionMode: "selectable",
    recommendedPlanTier: "growth",
    comparisonPriority: 3,
  },
  {
    key: "ebay",
    title: "eBay",
    category: "marketplace",
    badge: "Open-market flow",
    summary: "Promoted Listings, fiyat stratejisi ve musteri iletisimine dayali esnek pazar yeri akisi.",
    detailedDescription:
      "eBay Plus ile magaza optimizasyonu, promoted listings ve musteri iletisim surecleri daha hizli canliya alinabilir.",
    setupFee: 1000,
    monthlyPrice: 750,
    oneTimePrice: null,
    visualTone: "violet",
    surfaceStyle: "market-flex",
    motionPreset: "ebay",
    archetype: "Flexible marketplace",
    bestFor: "Daha hizli test, fiyat manevrasi ve esnek katalog akisi isteyen satıcılar.",
    primaryOutcome: "Store policy, promoted listings ve rating-driven operasyon.",
    atlasHandles: [
      "Store policy ve listing omurgasi",
      "Promoted listings ve fiyat stratejisi",
      "Support, rating ve returns takibi",
    ],
    customerNeeds: [
      "eBay seller hesabi kurulumu",
      "Promoted listings hazirligi",
      "Kategori ve fiyat stratejisi",
      "Return / support akisi",
    ],
    setupFocus: "Store policy, promoted listings, price strategy ve seller iletisim omurgasi kurulur.",
    requirements: [
      "eBay seller hesabi kurulumu",
      "Promoted listings hazirligi",
      "Kategori ve fiyat stratejisi",
      "Return / support akisi",
    ],
    features: [
      "Magaza tam yonetim",
      "Promoted listings",
      "Musteri iletisimi",
      "Kategori optimizasyonu",
      "Seller rating takibi",
    ],
    includedServices: [
      "eBay magaza yonetimi",
      "Urun listeleme optimizasyonu",
      "Promoted Listings kampanyalari",
      "Siparis yonetimi",
      "Musteri iletisimi ve yorumlar",
      "Fiyat stratejisi",
      "Kategori optimizasyonu",
      "Performans takibi",
      "Stok yonetimi",
      "Seller rating iyilestirme",
    ],
    priorityBadge: { text: "Esnek kanal", tone: "blue" },
    riskNote: "Kategori, fiyat ve musteri iletisim kalitesi zayifsa rating dalgalanmasi daha hizli hissedilir.",
    tip: "Komisyon baskisini yumusatmak ve hizli test yapmak icin iyi bir ikinci kanal olabilir.",
    ctaLabel: "eBay ile ilerle",
    selectionMode: "selectable",
    recommendedPlanTier: "growth",
    comparisonPriority: 4,
  },
  {
    key: "etsy",
    title: "Etsy",
    category: "marketplace",
    badge: "Niche products",
    summary: "Butik, el yapimi ve farkli urunler icin SEO ve Etsy Ads odakli daha nish kanal.",
    detailedDescription:
      "Etsy Elite ile magaza kurulumu, etiket/SEO optimizasyonu ve Etsy Ads surecleri butik urun mantigina gore kurgulanir.",
    setupFee: 1000,
    monthlyPrice: 650,
    oneTimePrice: null,
    visualTone: "amber",
    surfaceStyle: "crafted",
    motionPreset: "etsy",
    archetype: "Niche discovery channel",
    bestFor: "Butik, craft veya farkli urunlerle daha nish traction arayan satıcılar.",
    primaryOutcome: "Shop policy, tag SEO ve ads-ready Etsy shop yapisi.",
    atlasHandles: [
      "Listing SEO ve tag omurgasi",
      "Shop policy ve product storytelling",
      "Ads ve trend takibi",
    ],
    customerNeeds: [
      "Etsy seller hesabi ve policy setup",
      "Tag / SEO optimizasyonu",
      "Urun fotograf ve icerik hazirligi",
      "Ads ve trend analizi",
    ],
    setupFocus: "Tag yapisi, listing SEO'su, shop policy ve ads kurgusu ilk odak noktalaridir.",
    requirements: [
      "Etsy seller hesabi ve policy setup",
      "Tag / SEO optimizasyonu",
      "Urun fotograf ve icerik hazirligi",
      "Ads ve trend analizi",
    ],
    features: [
      "Magaza tam yonetim",
      "Tag ve SEO optimizasyonu",
      "Etsy Ads yonetimi",
      "Trend ve nish analiz",
      "Satici puani optimizasyonu",
    ],
    includedServices: [
      "Etsy magaza yonetimi",
      "Urun listeleme ve SEO",
      "Etsy Ads kampanya yonetimi",
      "Fotograf ve icerik optimizasyonu",
      "Siparis yonetimi",
      "Musteri iletisimi",
      "Fiyatlandirma stratejisi",
      "Trend analizi",
      "Stok takibi",
      "Satici puani optimizasyonu",
    ],
    priorityBadge: { text: "Nis urunler", tone: "amber" },
    riskNote: "Nis kanal oldugu icin fotograf, story ve SEO kalitesi dusuk oldugunda ivme daha yavas gelir.",
    tip: "Butik ve farkli urunlerde daha hizli traction almak icin iyi bir ilk kanal olabilir.",
    ctaLabel: "Etsy ile ilerle",
    selectionMode: "selectable",
    recommendedPlanTier: "growth",
    comparisonPriority: 5,
  },
];

export const STORE_ADDON_CATALOG: StoreAddonOffer[] = [
  {
    key: "llc_ein",
    title: "LLC + EIN Kurulumu",
    category: "addon",
    badge: "Launch foundation",
    summary: "ABD'de sirket kurulumu ve EIN kaydi icin zorunlu operasyon omurgasi.",
    detailedDescription:
      "Florida veya Virginia LLC kurulumu, registered agent ve EIN basvurusunu tek seferlik Atlas launch omurgasi olarak toplar.",
    setupFee: 0,
    monthlyPrice: null,
    oneTimePrice: 400,
    cadence: "one_time",
    clusterKey: "foundation",
    visualTone: "blue",
    surfaceStyle: "foundation",
    motionPreset: "addon",
    archetype: "Launch foundation",
    bestFor: "ABD launch omurgasini temiz ve hizli kurmak isteyen her yeni musteri.",
    primaryOutcome: "Sirket kurulusu, EIN kaydi ve resmi belge paketi.",
    atlasHandles: [
      "LLC dosyalama ve resmi basvuru takibi",
      "EIN kaydi ve IRS takibi",
      "Launch icin temel belge paketleme",
    ],
    customerNeeds: [
      "Sirket bilgileri",
      "Imza ve resmi evraklar",
      "Temel owner bilgileri",
    ],
    features: [
      "Florida / Virginia LLC kurulumu",
      "EIN basvurusu",
      "Registered Agent (1 yil)",
      "Resmi belge paketi",
    ],
    includedServices: [
      "Florida veya Virginia LLC kurulumu",
      "Articles of Organization hazirlama",
      "Registered Agent hizmeti (1 yil)",
      "EIN basvurusu",
      "Operating Agreement taslagi",
      "Sirket muhru",
      "Tum resmi belgeler",
      "Kurulum danismanligi",
      "IRS EIN belgesi teslimi",
    ],
    priorityBadge: { text: "Zorunlu ilk adim", tone: "blue" },
    ctaLabel: "LLC + EIN Baslat",
    selectionMode: "support",
    comparisonPriority: 1,
  },
  {
    key: "tax_management",
    title: "Vergi Yonetimi",
    category: "addon",
    badge: "Compliance",
    summary: "Sales tax hesaplama, filing ve aylik vergi operasyonu destegi.",
    detailedDescription:
      "Sales tax kayitlari, filing takvimi ve aylik beyan sureci Atlas operasyonuyla takip edilir.",
    setupFee: 0,
    monthlyPrice: 299,
    oneTimePrice: null,
    cadence: "monthly",
    clusterKey: "compliance",
    visualTone: "blue",
    surfaceStyle: "compliance",
    motionPreset: "addon",
    archetype: "Compliance layer",
    bestFor: "Sales tax ve filing operasyonunu hata riski olmadan outsource etmek isteyen ekipler.",
    primaryOutcome: "Vergi takvimi, filing ve eyalet kayit kontrolu.",
    atlasHandles: [
      "Sales tax ve filing planlamasi",
      "Eyalet kayitlarinin takibi",
      "Aylik compliance raporlamasi",
    ],
    customerNeeds: [
      "Vergi ve nexus bilgileri",
      "Marketplace / storefront datasi",
      "Filing icin gerekli owner belgeleri",
    ],
    features: [
      "Sales tax hesaplamasi",
      "Filing takibi",
      "Aylik vergi raporu",
      "Eyalet kayit destegi",
    ],
    includedServices: [
      "Sales tax hesaplamasi",
      "Vergi beyannamesi hazirlama",
      "Eyalet vergi kayitlari",
      "Sales tax filing",
      "Vergi danismanligi",
      "Aylik vergi raporlari",
    ],
    ctaLabel: "Vergi Hizmeti Al",
    selectionMode: "support",
    comparisonPriority: 2,
  },
  {
    key: "fba_prep",
    title: "FBA Prep Hizmeti",
    category: "addon",
    badge: "Warehouse add-on",
    summary: "Amazon FBA icin etiketleme, paketleme ve sevk planlama destegi.",
    detailedDescription:
      "Depodan Amazon FBA'ya cikacak urunlerin prep, etiket ve sevk planlama omurgasini kapsar.",
    setupFee: 0,
    monthlyPrice: 199,
    oneTimePrice: null,
    cadence: "monthly",
    clusterKey: "fulfillment",
    visualTone: "amber",
    surfaceStyle: "fulfillment",
    motionPreset: "addon",
    archetype: "Fulfillment accelerator",
    bestFor: "Amazon tarafinda FBA operasyonunu disariya temiz devretmek isteyen saticilar.",
    primaryOutcome: "FBA-ready prep, etiket ve sevk operasyonu.",
    atlasHandles: [
      "Prep ve etiketleme akisi",
      "Sevk plani ve koli hazirligi",
      "Kargo entegrasyonu takibi",
    ],
    customerNeeds: [
      "Urun ve koli olculeri",
      "FBA hedef depo bilgisi",
      "Prep gereksinimleri",
    ],
    features: [
      "FBA etiketleme",
      "Poly bag paketleme",
      "Sevk plani olusturma",
      "Kargo entegrasyonu",
    ],
    includedServices: [
      "FBA etiketleme",
      "Poly bag paketleme",
      "Bubbling ve koruma",
      "FBA karton kutu hazirlama",
      "FBA sevk plani olusturma",
      "UPS/FedEx kargo entegrasyonu",
    ],
    ctaLabel: "FBA Prep Ekle",
    selectionMode: "support",
    comparisonPriority: 3,
  },
  {
    key: "custom_packaging",
    title: "Ozel Paketleme",
    category: "addon",
    badge: "Brand layer",
    summary: "Marka logolu kutu, etiket ve premium ambalaj deneyimi.",
    detailedDescription:
      "Kutulama, etiket, marka insertleri ve premium ambalaj malzemeleriyle siparis deneyimini guclendirir.",
    setupFee: 0,
    monthlyPrice: 149,
    oneTimePrice: null,
    cadence: "monthly",
    clusterKey: "fulfillment",
    visualTone: "amber",
    surfaceStyle: "fulfillment",
    motionPreset: "addon",
    archetype: "Brand packaging layer",
    bestFor: "Siparis kutusunu markali bir deneyime cevirmek isteyen magazalar.",
    primaryOutcome: "Logo baskili packaging ve brand insert omurgasi.",
    atlasHandles: [
      "Packaging secenegi ve malzeme koordinasyonu",
      "Logo / insert tarafinin yonetimi",
      "Siparis deneyimi icin premium paketleme",
    ],
    customerNeeds: [
      "Logo ve brand assetleri",
      "Paketleme tercihleri",
      "Siparis deneyimi hedefleri",
    ],
    features: [
      "Ozel kutu tasarimi",
      "Logo baski",
      "Marka etiketleri",
      "Thank-you kartlari",
    ],
    includedServices: [
      "Ozel kutu tasarimi",
      "Logo baski",
      "Marka etiketleri",
      "Thank-you kartlari",
      "Ozel ambalaj malzemeleri",
      "Premium packaging secenekleri",
    ],
    ctaLabel: "Ozel Paket Ekle",
    selectionMode: "support",
    comparisonPriority: 4,
  },
  {
    key: "express_fulfillment",
    title: "Express Fulfillment",
    category: "addon",
    badge: "Speed layer",
    summary: "24 saat icinde isleme alma ve priority shipping destegi.",
    detailedDescription:
      "Hizli fulfillment, priority picking ve premium kargo secenekleriyle siparis cevabini hizlandirir.",
    setupFee: 0,
    monthlyPrice: 249,
    oneTimePrice: null,
    cadence: "monthly",
    clusterKey: "fulfillment",
    visualTone: "emerald",
    surfaceStyle: "fulfillment",
    motionPreset: "addon",
    archetype: "Speed layer",
    bestFor: "Siparis SLA'sini kisaltmak ve fulfillment tarafinda one cikmak isteyen ekipler.",
    primaryOutcome: "Daha hizli picking, packing ve shipping cikisi.",
    atlasHandles: [
      "Priority fulfillment queue",
      "Express paketleme ve ship out",
      "Takip ve exception handling",
    ],
    customerNeeds: [
      "Siparis hacmi beklentisi",
      "Oncelikli SKU listesi",
      "Hiz hedefleri",
    ],
    features: [
      "24 saat fulfillment",
      "Priority picking",
      "Same-day shipping",
      "Premium takip akisi",
    ],
    includedServices: [
      "24 saat fulfillment garantisi",
      "Priority picking",
      "Express paketleme",
      "Same-day shipping",
      "Premium kargo secenekleri",
      "Ozel takip sistemi",
    ],
    ctaLabel: "Express Ekle",
    selectionMode: "support",
    comparisonPriority: 5,
  },
  {
    key: "social_media",
    title: "Sosyal Medya Yonetimi",
    category: "addon",
    badge: "Demand engine",
    summary: "Instagram, TikTok ve Facebook tarafinda hesap kurulumu, icerik ve growth operasyonu.",
    detailedDescription:
      "Sosyal medya kurulumu, profil tasarimi, aylik icerik ve community management ile marka talebini destekler.",
    setupFee: 500,
    monthlyPrice: 750,
    oneTimePrice: null,
    cadence: "monthly",
    clusterKey: "demand",
    visualTone: "violet",
    surfaceStyle: "demand",
    motionPreset: "addon",
    archetype: "Demand engine",
    bestFor: "Storefront veya marketplace yaninda talep motoru da kurmak isteyen markalar.",
    primaryOutcome: "Sosyal hesap kurulumu, icerik akisi ve growth operasyonu.",
    atlasHandles: [
      "Account branding ve setup",
      "Aylik icerik ve community management",
      "Demand ve trend tarafinin raporlanmasi",
    ],
    customerNeeds: [
      "Marka tonu ve kreatif yon",
      "Icerik hedefleri",
      "Platform tercihi",
    ],
    features: [
      "Hesap kurulumu ve branding",
      "Aylik 15+ icerik",
      "Community management",
      "Aylik performans raporu",
    ],
    includedServices: [
      "Instagram, TikTok, Facebook hesap kurulumu",
      "Marka kimligi ve profil tasarimi",
      "Aylik 15+ icerik (grafik + video)",
      "Icerik takvimi ve strateji plani",
      "Community management",
      "Hashtag ve trend analizi",
      "Aylik performans raporu",
      "Reklam butcesi danismanligi",
      "Rakip analizi",
    ],
    priorityBadge: { text: "Talep motoru", tone: "violet" },
    ctaLabel: "Sosyal Medya Baslat",
    selectionMode: "support",
    comparisonPriority: 6,
  },
];

export const STORE_BUNDLE_CATALOG: StoreBundleOffer[] = [
  {
    key: "growth",
    title: "Growth Bundle",
    category: "bundle",
    badge: "Bundle",
    summary: "Amazon + Walmart operasyonu, AI destekleri ve unified analytics ile hizli buyume paketi.",
    detailedDescription:
      "Growth Bundle, iki marketplace'i ayni operasyon omurgasinda yonetmek isteyen ekipler icin cok kanalli ama halen kontrollu bir set kurar.",
    setupFee: 0,
    monthlyPrice: 1850,
    oneTimePrice: null,
    visualTone: "blue",
    surfaceStyle: "growth",
    motionPreset: "bundle",
    archetype: "Multi-channel accelerator",
    bestFor: "Iki kanali tek owner ve tek reporting ritmiyle buyutmek isteyen ekipler.",
    primaryOutcome: "Amazon + Walmart senkron launch ve analytics omurgasi.",
    atlasHandles: [
      "Iki kanalli operasyon koordinasyonu",
      "Priority support ve AI layer",
      "Unified analytics ve envanter baglantisi",
    ],
    customerNeeds: [
      "Iki kanal icin operasyon hazirligi",
      "Envanter planlamasi",
      "Growth hedefleri",
    ],
    features: [
      "Amazon Pro Yonetim",
      "Walmart Pro Yonetim",
      "Priority support",
      "Unified analytics",
    ],
    includedServices: [
      "Amazon Pro Yonetim (tam hizmet)",
      "Walmart Pro Yonetim (tam hizmet)",
      "Tum AI agent'lar aktif",
      "Priority support",
      "Capraz platform strateji",
      "Unified analytics",
      "Multi-channel envanter",
      "%10 fulfillment indirim",
    ],
    includedChannels: ["amazon", "walmart"],
    bundleIncludes: [
      "Amazon + Walmart",
      "AI agent layer",
      "Priority support",
      "Multi-channel inventory",
    ],
    priorityBadge: { text: "Cok kanalli", tone: "blue" },
    ctaLabel: "Growth Bundle Al",
    selectionMode: "quote",
    comparisonPriority: 1,
  },
  {
    key: "global_scale",
    title: "Global Scale",
    category: "bundle",
    badge: "Enterprise",
    summary: "Tum 5 platform, Ghost Mode ve ozel operasyon sahipligi isteyen markalar icin premium paket.",
    detailedDescription:
      "Global Scale, tum platformlarin aktif olarak Atlas tarafinda yonetildigi, ozel owner ve ozel entegrasyon kapsami olan kurumsal pakettir.",
    setupFee: 0,
    monthlyPrice: 2950,
    oneTimePrice: null,
    visualTone: "amber",
    surfaceStyle: "enterprise",
    motionPreset: "bundle",
    archetype: "Executive command layer",
    bestFor: "Tum kanallari Atlas'a emanet edip ozel owner ile ilerlemek isteyen markalar.",
    primaryOutcome: "Tum platformlar, Ghost Mode ve enterprise operasyon omurgasi.",
    atlasHandles: [
      "Tum platformlarda owner-side operasyon",
      "Dedicated account manager ve 7/24 priority support",
      "Custom integration ve advanced analytics",
    ],
    customerNeeds: [
      "Kurumsal hacim veya cok kanalli hedef",
      "Owner / stakeholder hizalamasi",
      "Ozel operasyon talepleri",
    ],
    features: [
      "Tum 5 platform yonetimi",
      "Ghost Mode",
      "Dedicated account manager",
      "Custom integrations",
    ],
    includedServices: [
      "Tum 5 platform yonetimi",
      "Ghost Mode (tamamen Atlas yonetir)",
      "Dedicated account manager",
      "7/24 priority support",
      "Ozel strateji toplantilari",
      "Advanced analytics",
      "Custom integrations",
      "%20 fulfillment indirim",
      "Ucretsiz LLC kurulumu",
      "Ucretsiz vergi yonetimi",
    ],
    includedChannels: ["amazon", "walmart", "etsy", "ebay", "shopify"],
    bundleIncludes: [
      "Amazon + Walmart + Etsy + eBay + Shopify",
      "Ghost Mode",
      "Dedicated owner",
      "Advanced analytics",
    ],
    priorityBadge: { text: "Kurumsal", tone: "amber" },
    ctaLabel: "Global Scale Al",
    selectionMode: "quote",
    comparisonPriority: 2,
  },
];

export const STORE_OPERATIONAL_NOTES: OperationalFeeNote[] = [
  {
    key: "warehouse",
    label: "Warehouse",
    value: "$35 / pallet",
    summary: "Depolama aylik pallet bazinda fiyatlanir.",
  },
  {
    key: "fulfillment_base",
    label: "Fulfillment",
    value: "$2.50 / order",
    summary: "Her siparis icin temel isleme ucreti.",
  },
  {
    key: "per_item",
    label: "Ek urun",
    value: "+$0.50 / item",
    summary: "Siparis icindeki ilave urunler item bazinda hesaplanir.",
  },
  {
    key: "fba_prep",
    label: "FBA prep",
    value: "$5 / pallet",
    summary: "FBA pallet hazirlik notu olarak ayrica takip edilir.",
  },
];

export function isMarketplaceChannelKey(value: unknown): value is MarketplaceChannelKey {
  return value === "amazon" || value === "shopify" || value === "walmart" || value === "ebay" || value === "etsy";
}

export function getMarketplaceChannelOfferings() {
  return [...MARKETPLACE_CHANNEL_CATALOG].sort((left, right) => left.comparisonPriority - right.comparisonPriority);
}

export function getStoreMarketplaceOfferByKey(key: string | null | undefined) {
  if (!key) return null;
  return MARKETPLACE_CHANNEL_CATALOG.find((offer) => offer.key === key) ?? null;
}

export function getStoreAddonOfferings() {
  return [...STORE_ADDON_CATALOG].sort((left, right) => left.comparisonPriority - right.comparisonPriority);
}

export function getStoreAddonOfferByKey(key: string | null | undefined) {
  if (!key) return null;
  return STORE_ADDON_CATALOG.find((offer) => offer.key === key) ?? null;
}

export function getStoreBundleOfferings() {
  return [...STORE_BUNDLE_CATALOG].sort((left, right) => left.comparisonPriority - right.comparisonPriority);
}

export function getStoreBundleOfferByKey(key: string | null | undefined) {
  if (!key) return null;
  return STORE_BUNDLE_CATALOG.find((offer) => offer.key === key) ?? null;
}

export function getStoreOfferByQuery(offerType: string | null | undefined, offerKey: string | null | undefined) {
  if (!offerType || !offerKey) return null;
  if (offerType === "marketplace") return getStoreMarketplaceOfferByKey(offerKey);
  if (offerType === "addon") return getStoreAddonOfferByKey(offerKey);
  if (offerType === "bundle") return getStoreBundleOfferByKey(offerKey);
  return null;
}

export function getStoreOperationalNotes() {
  return STORE_OPERATIONAL_NOTES;
}

export function getPlanTierDefinition(planTier: string | null | undefined) {
  if (!planTier || !(planTier in PAYMENT_CATALOG)) {
    return PAYMENT_CATALOG.starter;
  }

  return PAYMENT_CATALOG[planTier as PlanTier];
}

export function getPlanTierAmount(planTier: string | null | undefined) {
  return getPlanTierDefinition(planTier).price;
}

export function getBillingCatalogSections() {
  return [
    {
      key: "launch",
      title: "Baslangic Paketi",
      description: "LLC ve EIN kurulumunu tek faturada toplar.",
      packages: [PAYMENT_CATALOG.starter],
    },
    {
      key: "management",
      title: "Marketplace ve Aylik Yonetim",
      description: "Secilen pazaryeri icin yonetim paketi ve buyume katmanlari.",
      packages: [PAYMENT_CATALOG.growth, PAYMENT_CATALOG.professional, PAYMENT_CATALOG.global_scale],
    },
  ] as const;
}
